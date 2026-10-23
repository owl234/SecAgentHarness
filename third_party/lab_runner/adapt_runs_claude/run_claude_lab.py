#!/usr/bin/env python3
"""Run one LAB task through Claude Code / clawgod CLI.

Writes config.json, claude_session.jsonl, output/ and metrics.json last as the completion
record, so a dead model chain is never cached as a finished rollout.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import signal
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

RUNNER_DIR = Path(__file__).resolve().parent
REPO = RUNNER_DIR.parents[1]
if str(REPO) not in sys.path:
    sys.path.insert(0, str(REPO))

from external.tts_lab import config as C  # noqa: E402

SCRATCH_BASE = Path(os.environ.get("ADAPT_LABCLAUDE_SCRATCH") or (RUNNER_DIR / "scratch"))
RESULTS_ROOT = Path(os.environ.get("ADAPT_LABCLAUDE_RESULTS", str(RUNNER_DIR / "results")))
CLAUDE_BIN = Path(os.environ.get("ADAPT_LABCLAUDE_BIN", str(Path.home() / ".local" / "bin" / "clawgod")))
DEFAULT_MODEL = os.environ.get("ADAPT_LABCLAUDE_MODEL", "claude-3-7-sonnet-20250219")

READ_DOC = REPO / "opencode" / "scripts" / "read_doc.py"
HARNESS_ENTRIES = ("CLAUDE.md", ".claude", "scripts", "sub_agents")


def agents_arg(ws: Path) -> list[str]:
    """`--agents` JSON argv fragment for the harness's c5 subagents ([] when none).

    Claude Code auto-discovers `.claude/agents/*.md`, not the harness-canonical
    `sub_agents/*/AGENT.md`, so without this translation a proposal that evolves
    c5 would never fire. Also enables `--forward-subagent-text` so subagent
    activity lands in the stream.
    """
    import re

    agents: dict[str, dict[str, str]] = {}
    try:
        files = sorted(ws.glob("sub_agents/*/AGENT.md"))
    except OSError:
        return []
    for af in files:
        if not af.is_file():
            continue
        try:
            body = af.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        m = re.search(r"^description:\s*(.+)$", body[:600], re.M)
        desc = m.group(1).strip() if m else ""
        prompt_body = re.sub(r"^---\n.*?\n---\n", "", body, count=1, flags=re.S).strip()
        agents[af.parent.name] = {
            "description": desc or f"Delegated {af.parent.name} agent",
            "prompt": prompt_body or body.strip(),
        }
    return ["--agents", json.dumps(agents, ensure_ascii=False)] if agents else []


def _require_scratch(p: Path, what: str) -> Path:
    p = p.resolve()
    base = SCRATCH_BASE.resolve()
    if base != p and base not in p.parents:
        raise ValueError(f"{what} {p} escapes scratch base {base}")
    return p


def run_dir_for(run_id: str, results_root: Path | str = RESULTS_ROOT) -> Path:
    """<results_root>/<run_id>, preserving '/' hierarchy with path escapes refused."""
    rid = str(run_id).strip()
    if not rid or rid.startswith("/") or ".." in rid.split("/"):
        raise SystemExit(f"bad --run-id {run_id!r}: must be a relative, escape-free id")
    root = Path(results_root).resolve()
    if str(root).startswith("/tmp/"):
        raise SystemExit(f"refusing results root under /tmp: {root}")
    d = (root / rid).resolve()
    if root not in d.parents:
        raise SystemExit(f"run id escapes the results root: {run_id!r}")
    return d


def scratch_paths(label: str) -> tuple[Path, Path]:
    tmp_root = _require_scratch(SCRATCH_BASE / "lab" / label, "workspace parent")
    return tmp_root, tmp_root / "workspace"


def build_prompt(task_id: str, ws: Path) -> str:
    raw = C.task_prompt(task_id).strip()
    return f"""\
You are an expert legal assistant working on a document analysis task.

TASK INSTRUCTIONS:
{raw}

ENVIRONMENT:
- Task input documents are in: {ws / 'documents'}
- Read docx/xlsx/pptx/pdf files using the provided helper scripts or tool commands.
- Final deliverables MUST be written directly to: {ws / 'output'}
- Follow any guidelines in CLAUDE.md.
"""


def parse_session(session_path: Path) -> dict:
    if not session_path.is_file():
        return {"n_events": 0, "turns": 0, "tool_calls": 0, "final_text": ""}
    lines = session_path.read_text(encoding="utf-8", errors="replace").splitlines()
    tool_calls = 0
    turns = 0
    final_text = ""
    for ln in lines:
        ln = ln.strip()
        if not ln.startswith("{"):
            continue
        try:
            ev = json.loads(ln)
        except json.JSONDecodeError:
            continue
        if not isinstance(ev, dict):
            continue
        etype = ev.get("type")
        if etype == "assistant":
            msg = ev.get("message")
            if isinstance(msg, dict):
                for blk in msg.get("content") or []:
                    if isinstance(blk, dict):
                        if blk.get("type") == "tool_use":
                            tool_calls += 1
                        elif blk.get("type") == "text":
                            final_text = blk.get("text") or ""
        elif etype == "result":
            turns += 1
            if isinstance(ev.get("result"), str):
                final_text = ev.get("result")
    return {
        "n_events": len(lines),
        "turns": max(1, turns),
        "tool_calls": tool_calls,
        "final_text": final_text,
    }


def doc_coverage(summary: dict, docs_dir: Path, session_text: str) -> tuple[int, int]:
    if not docs_dir.is_dir():
        return 0, 0
    rels = [str(p.relative_to(docs_dir)) for p in sorted(docs_dir.rglob("*")) if p.is_file()]
    read = sum(1 for r in rels if r in session_text)
    return read, len(rels)


def main(args) -> int:
    if not args.task or not args.run_id:
        raise SystemExit("--task and --run-id are required")

    label = args.run_id.replace("/", "__")
    run_dir = run_dir_for(args.run_id, args.results_root)
    run_dir.mkdir(parents=True, exist_ok=True)
    tmp_root, ws = scratch_paths(label)

    def _die(signum, _frame):
        raise SystemExit(128 + signum)
    for s in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP):
        signal.signal(s, _die)

    docs_src = C.documents_dir(args.task)
    started = datetime.now(timezone.utc).isoformat()
    t0 = time.time()
    try:
        shutil.rmtree(tmp_root, ignore_errors=True)
        (ws / "output").mkdir(parents=True)
        if docs_src.is_dir():
            shutil.copytree(docs_src, ws / "documents")
            for p in (ws / "documents").rglob("*"):
                if p.is_file():
                    p.chmod(0o444)
        else:
            (ws / "documents").mkdir()

        harness_dir = Path(args.harness_dir) if args.harness_dir else None
        installed = []
        if harness_dir and harness_dir.is_dir():
            for entry in HARNESS_ENTRIES:
                src = harness_dir / entry
                if not src.exists():
                    continue
                dst = ws / entry
                if src.is_dir():
                    shutil.copytree(src, dst)
                else:
                    shutil.copy2(src, dst)
                installed.append(entry)

        (ws / "scripts").mkdir(parents=True, exist_ok=True)
        if not READ_DOC.is_file():
            raise SystemExit(
                f"runtime document reader missing: {READ_DOC} -- without it every "
                f"binary document 'read' silently returns noise"
            )
        shutil.copy2(READ_DOC, ws / "scripts" / "read_doc.py")

        try:
            ver = subprocess.run(
                [str(CLAUDE_BIN), "--version"],
                capture_output=True, text=True, timeout=60,
            )
            binary_version = (ver.stdout or "").strip().splitlines()[0] if ver.stdout else ""
        except (OSError, subprocess.SubprocessError, IndexError):
            binary_version = ""
        config = {
            "model": args.model,
            "reasoning_effort": args.reasoning_effort,
            "binary": str(CLAUDE_BIN),
            "binary_version": binary_version,
            "task": args.task,
            "run_id": args.run_id,
            "timeout": args.timeout,
            "doc_parser": args.doc_parser,
            "harness_dir": str(harness_dir) if harness_dir else None,
            "harness_files": installed,
            "workspace": str(ws),
            "started_at": started,
        }
        (run_dir / "config.json").write_text(json.dumps(config, indent=2), encoding="utf-8")

        env = os.environ.copy()
        env.pop("XDG_DATA_HOME", None)
        env.update({
            "LAB_DOC_PARSER": args.doc_parser,
            "LAB_BENCH_ROOT": str(REPO),
        })

        prompt = build_prompt(args.task, ws)
        cmd = [
            str(CLAUDE_BIN),
            "-p",
            prompt,
            "--output-format=stream-json",
            "--verbose",
            "--dangerously-skip-permissions",
            "--include-hook-events",
            "--model",
            args.model,
            "--effort",
            args.reasoning_effort,
            "--add-dir",
            str(ws),
            *agents_arg(ws),
            "--forward-subagent-text",
        ]
        session_path = run_dir / "claude_session.jsonl"
        wall_limit = int(max(60, args.timeout))
        with open(session_path, "w", encoding="utf-8") as out, \
             open(run_dir / "claude_stderr.log", "w", encoding="utf-8") as err:
            proc = subprocess.Popen(
                cmd,
                cwd=str(ws),
                env=env,
                stdin=subprocess.DEVNULL,
                stdout=out,
                stderr=err,
                start_new_session=True,
            )
            try:
                rc = proc.wait(timeout=wall_limit)
            except subprocess.TimeoutExpired:
                try:
                    os.killpg(proc.pid, signal.SIGKILL)
                except (ProcessLookupError, PermissionError):
                    proc.kill()
                proc.wait()
                rc = 124
        wall = time.time() - t0

        graded = run_dir / "output"
        graded.mkdir(parents=True, exist_ok=True)
        for src in (ws / "output").rglob("*"):
            if src.is_file():
                dest = graded / src.relative_to(ws / "output")
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dest)
        delivered = sorted(str(p.relative_to(graded)) for p in graded.rglob("*") if p.is_file())

        summary = parse_session(session_path)
        if summary["n_events"] == 0:
            print(f"[run_claude_lab] NO parseable events in {session_path}; (rc={rc})", file=sys.stderr)
            return 2
        if rc == 0 and not delivered:
            rc = 1

        session_text = session_path.read_text(encoding="utf-8", errors="replace")
        docs_read, docs_total = doc_coverage(summary, ws / "documents", session_text)
        metrics = {
            "runner": "claude",
            "model": args.model,
            "task": args.task,
            "run_id": args.run_id,
            "turn_count": summary["turns"],
            "tool_calls": summary["tool_calls"],
            "docs_read": docs_read,
            "docs_total": docs_total,
            "delivered_files": delivered,
            "wall_clock_seconds": round(wall, 2),
            "exit_code": rc,
            "ended_at": datetime.now(timezone.utc).isoformat(),
        }
        (run_dir / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
        return rc
    finally:
        shutil.rmtree(tmp_root, ignore_errors=True)


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--task", default="", help="Task ID")
    p.add_argument("--run-id", default="", help="Unique run ID")
    p.add_argument("--results-root", default=str(RESULTS_ROOT))
    p.add_argument("--model", default=DEFAULT_MODEL)
    p.add_argument("--reasoning-effort", default="high")
    p.add_argument("--timeout", type=int, default=1800)
    p.add_argument("--harness-dir", default="")
    p.add_argument(
        "--doc-parser",
        choices=["sandbox", "host"],
        default=os.environ.get("LAB_DOC_PARSER", "sandbox"),
        help="Where scripts/read_doc.py parses binary documents (default: %(default)s)",
    )
    sys.exit(main(p.parse_args()))
