# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""ClaudeSubstrate: Claude Code (prioritizing clawgod) as a solver substrate.

Carries the c1..c8 surface (CLAUDE_SURFACE), the one install mode (claude_root: CLAUDE.md,
.claude, scripts and sub_agents staged and copied to the workspace root, where Claude Code finds
them), the clawgod/claude execution contract with stream-json logging, and trajectory rendering.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import tempfile
from pathlib import Path
from typing import Mapping

from .. import config
from ..core import runmark as RM
from ..core import tree as HT
from ..core.tree import SurfaceSpec
from .base import Install, Launcher, RunRequest

CLAUDE_SURFACE = SurfaceSpec(
    name="claude",
    always_on=("CLAUDE.md",),
    always_on_max=24_000,
    always_on_cap_reason="CLAUDE.md is ingested directly into Claude Code context every session",
    skill_dir=".claude/skills",
    skill_name_rule="overrides_dir",
    trigger_hint=(
        'Fix it by adding a trigger line naming `{name}` to CLAUDE.md, e.g. "When '
        "<the situation this skill handles>, read .claude/skills/{name}/SKILL.md "
        'and follow it."'
    ),
    autotrigger_file="CLAUDE.md",
    trigger_line="- When {desc}, read .claude/skills/{name}/SKILL.md and follow it.\n",
    subagent_requires_mode=False,
    plugin_dir=None,
    hooks_file=".claude/settings.json",
    hook_events=frozenset(
        {
            "PreToolUse",
            "PostToolUse",
            "PermissionRequest",
            "SessionStart",
            "Stop",
        }
    ),
    compile_skill_scripts=True,
    reject_empty_always_on=True,
    stubs=(
        (
            "scripts/README.md",
            "<!-- c7: deterministic helpers, run as `python3 scripts/<name>.py`. "
            "Add one by emitting scripts/<name>.py. -->\n",
        ),
        (
            "sub_agents/README.md",
            "<!-- c5: delegated agent roles, spawned in their OWN context. Add one as "
            "sub_agents/<name>/AGENT.md. -->\n",
        ),
        (
            ".claude/settings.json",
            '{\n  "hooks": {\n    "PostToolUse": []\n  }\n}\n',
        ),
        (
            ".claude/skills/README.md",
            "<!-- c6: reusable workflows. Add one as .claude/skills/<name>/SKILL.md with YAML "
            "frontmatter: `description:` is REQUIRED; `name:` is optional and must match the directory. "
            "Only name+description are advertised; the body is read on demand. -->\n",
        ),
    ),
)

CLAUDE_ROOT_ENTRIES = ("CLAUDE.md", ".claude", "scripts", "sub_agents")


def find_claude_binary() -> Path:
    """Find the project-local Claude Code binary (clawgod) or explicit override."""
    # 1. Explicit env override
    custom = os.environ.get("HARNESS2_CLAWGOD_PATH")
    if custom and Path(custom).is_file() and os.access(custom, os.X_OK):
        return Path(custom)

    # 2. Project-level isolated launcher
    project_bin = config.CLAUDE_BIN
    return project_bin


class ClaudeSubstrate:
    """Claude Code (clawgod distribution) behind the Substrate interface."""

    name = "claude"

    def __init__(self, launcher: Launcher | None = None):
        self._launcher = launcher

    def surface(self) -> SurfaceSpec:
        return CLAUDE_SURFACE

    def materialise(self, tree_dir: Path, spec, ctx: Mapping[str, str]) -> Install:
        """Stage the claude_root entries for a copy to the workspace root."""
        if spec.install_mode != "claude_root":
            raise ValueError(
                f"install_mode {spec.install_mode!r} is not valid for ClaudeSubstrate; "
                f"this substrate requires 'claude_root'"
            )
        tree_dir = Path(tree_dir)
        if not HT.is_tree(CLAUDE_SURFACE, tree_dir):
            raise ValueError(f"{tree_dir} is not a valid claude harness tree (no CLAUDE.md)")

        staged = Path(tempfile.mkdtemp(prefix="adapt-cl-root-"))
        try:
            for entry in CLAUDE_ROOT_ENTRIES:
                src = tree_dir / entry
                if not src.exists():
                    continue
                dst = staged / entry
                if src.is_dir():
                    shutil.copytree(src, dst)
                else:
                    shutil.copy2(src, dst)

            # Process context file slots
            for key, body in ctx.items():
                if key.startswith("file:"):
                    rel = HT.normalize_rel(key[len("file:") :])
                    p = staged / rel
                    p.parent.mkdir(parents=True, exist_ok=True)
                    p.write_text(body, encoding="utf-8")
        except BaseException:
            shutil.rmtree(staged, ignore_errors=True)
            raise

        return Install(
            staging_dir=staged,
            fingerprint=RM.fingerprint(tree_dir),
            extras={
                "install_mode": "claude_root",
                **{k: v for k, v in ctx.items() if not k.startswith("file:")},
            },
        )

    def exec_argv(
        self,
        prompt: str,
        workspace: Path,
        model: str,
        *,
        effort: str = "high",
        harness_dir: Path | None = None,
    ) -> list[str]:
        """Construct the reference clawgod/claude execution argv.

        `harness_dir` (the staged claude_root tree) wires c5: each
        `sub_agents/<name>/AGENT.md` becomes one `--agents` JSON entry, since the
        workspace-root `sub_agents/` dir is not auto-discovered by Claude Code.
        Also forwards subagent text into the stream so the trajectory sees it.
        """
        binary = find_claude_binary()
        argv = [
            str(binary),
            "-p",
            prompt,
            "--output-format=stream-json",
            "--verbose",
            "--dangerously-skip-permissions",
            "--include-hook-events",
            "--forward-subagent-text",
            "--add-dir",
            str(workspace),
        ]
        if model:
            argv.extend(["--model", model])
        if effort:
            argv.extend(["--effort", effort])
        agents = agents_json(harness_dir) if harness_dir is not None else ""
        if agents:
            argv.extend(["--agents", agents])
        return argv

    def exec_env(self, base_env: Mapping[str, str], *, workspace: Path | None = None) -> dict[str, str]:
        """Build the execution environment for Claude Code / clawgod."""
        env = dict(base_env)
        # Inherit Anthropic credentials from harness2 config if present; the clawgod
        # wrapper honours ANTHROPIC_BASE_URL / ANTHROPIC_AUTH_TOKEN for non-Anthropic
        # endpoints (cli.cjs), so those pass through when the caller sets them.
        if "ANTHROPIC_API_KEY" not in env and hasattr(config, "ANTHROPIC_API_KEY"):
            val = getattr(config, "ANTHROPIC_API_KEY", "")
            if val:
                env["ANTHROPIC_API_KEY"] = val
        for key in ("ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN"):
            if key not in env and os.environ.get(key):
                env[key] = os.environ[key]
        return env

    def execute(
        self, task_ref: str, install: Install, run_ids: list[str], timeout: int
    ) -> list[Path]:
        if self._launcher is None:
            raise RuntimeError(
                "ClaudeSubstrate was constructed without a launcher body; the benchmark "
                "adapter must supply one"
            )
        return self._launcher(
            RunRequest(task_ref=task_ref, run_ids=tuple(run_ids), timeout=int(timeout)), install
        )

    def read_trajectory(
        self, stream_path: Path, *, obs_trunc: int, max_chars: int, args_trunc: int = 2000
    ) -> str:
        return render_events(
            Path(stream_path), obs_trunc=obs_trunc, max_chars=max_chars, args_trunc=args_trunc
        )

    def preflight(self) -> None:
        """Check the binary availability and basic operational health."""
        binary = find_claude_binary()
        if not binary.is_file() or not os.access(binary, os.X_OK):
            raise RuntimeError(
                f"Claude Code (clawgod) is not installed at {binary}; "
                "run 'harness2 setup <benchmark> --substrate claude' to install the project-level substrate."
            )
        want = getattr(config, "CLAUDE_VERSION", "")
        if want:
            try:
                import subprocess

                r = subprocess.run(
                    [str(binary), "--version"],
                    capture_output=True,
                    text=True,
                    timeout=60,
                )
                if want not in (r.stdout or ""):
                    raise RuntimeError(
                        f"clawgod at {binary} reports {r.stdout.strip()!r}, pinned "
                        f"CLAUDE_VERSION is {want}; rerun "
                        "'harness2 setup <benchmark> --substrate claude' to repin."
                    )
            except OSError as exc:
                raise RuntimeError(f"could not probe clawgod version: {exc}") from exc


_TRUNC_FMT = "…(+{n} chars — render truncation)"


def agents_json(staged: Path | None) -> str:
    """`--agents` JSON for the staged tree's c5 subagents ("" when none).

    Claude Code auto-discovers `.claude/agents/*.md`, not the harness-canonical
    `sub_agents/*/AGENT.md`, so without this translation a proposal that evolves
    c5 would never fire. Frontmatter `description:` becomes the agent description;
    the body becomes the system prompt.
    """
    if staged is None:
        return ""
    agents: dict[str, dict[str, str]] = {}
    try:
        dirs = sorted(p for p in Path(staged).glob("sub_agents/*/AGENT.md") if p.is_file())
    except OSError:
        return ""
    for agent_file in dirs:
        name = agent_file.parent.name
        try:
            body = agent_file.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        desc = ""
        m = re.search(r"^description:\s*(.+)$", body[:600], re.M)
        if m:
            desc = m.group(1).strip()
        prompt_body = re.sub(r"^---\n.*?\n---\n", "", body, count=1, flags=re.S).strip()
        agents[name] = {
            "description": desc or f"Delegated {name} agent",
            "prompt": prompt_body or body.strip(),
        }
    if not agents:
        return ""
    return json.dumps(agents, ensure_ascii=False)


def _clip(s, n: int) -> str:
    s = "" if s is None else str(s)
    s = s.replace("\x00", "")
    if n <= 0 or len(s) <= n:
        return s
    return s[:n] + _TRUNC_FMT.format(n=len(s) - n)


def parse_items(path: Path) -> list[dict]:
    """Read the stream-json JSONL stream produced by clawgod/claude."""
    try:
        raw = Path(path).read_text(encoding="utf-8", errors="replace")
    except OSError as e:
        return [{"type": "_read_error", "message": str(e)}]
    raw = raw.replace("\x00", "")

    events: list[dict] = []
    for ln in raw.splitlines():
        ln = ln.strip()
        if not ln.startswith("{"):
            continue
        try:
            ev = json.loads(ln)
        except json.JSONDecodeError:
            continue
        if isinstance(ev, dict):
            events.append(ev)
    return events


def render_events(path: Path, *, obs_trunc: int, max_chars: int, args_trunc: int = 2000) -> str:
    """Render a Claude stream-json event log into the shared grammar.

    With `--forward-subagent-text`, subagent activity arrives as assistant/user
    messages carrying `parent_tool_use_id`; those render with a SUBAGENT tag so
    the selector can tell delegated work from the main agent's.
    """
    lines: list[str] = []
    events = parse_items(Path(path))

    for ev in events:
        etype = ev.get("type", "")

        if etype == "_read_error":
            return f"(failed to read trajectory: {ev.get('message')})"

        # 1. Assistant messages containing text, thinking, or tool_use blocks
        if etype == "assistant":
            sub = "SUBAGENT " if ev.get("parent_tool_use_id") else ""
            msg = ev.get("message")
            if isinstance(msg, dict):
                content = msg.get("content")
                if isinstance(content, list):
                    for blk in content:
                        if not isinstance(blk, dict):
                            continue
                        btype = blk.get("type")
                        if btype == "text":
                            txt = blk.get("text", "").strip()
                            if txt:
                                lines.append(f"[{sub}ASSISTANT] {_clip(txt, obs_trunc)}")
                        elif btype == "thinking":
                            thk = blk.get("thinking", "").strip()
                            if thk:
                                lines.append(f"[{sub}THINKING] {_clip(thk, obs_trunc)}")
                        elif btype == "tool_use":
                            name = blk.get("name", "tool")
                            inp = blk.get("input", {})
                            arg_str = (
                                inp.get("command")
                                if isinstance(inp, dict) and "command" in inp and len(inp) == 1
                                else json.dumps(inp, default=str, ensure_ascii=False)
                            )
                            lines.append(f"[{sub}ACTION] {name}: {_clip(arg_str, args_trunc)}")
            continue

        # 2. User / tool_result messages
        if etype == "user":
            sub = "SUBAGENT " if ev.get("parent_tool_use_id") else ""
            msg = ev.get("message")
            if isinstance(msg, dict):
                content = msg.get("content")
                if isinstance(content, list):
                    for blk in content:
                        if not isinstance(blk, dict):
                            continue
                        if blk.get("type") == "tool_result":
                            res_out = blk.get("content")
                            # Check tool_use_result fallback
                            if not res_out and isinstance(ev.get("tool_use_result"), dict):
                                tur = ev["tool_use_result"]
                                res_out = tur.get("stdout") or tur.get("stderr") or ""
                            is_err = blk.get("is_error", False)
                            err_tag = " ERROR" if is_err else ""
                            lines.append(f"[OBSERVATION{err_tag}] {_clip(res_out or '', obs_trunc)}")
            continue

        # 3. System notices or errors
        if etype == "error" or ev.get("is_error"):
            err_msg = ev.get("message") or ev.get("error") or json.dumps(ev)
            lines.append(f"[ERROR] {_clip(err_msg, 1000)}")
            continue

        # 4. Result / Completion
        if etype == "result":
            usage = ev.get("usage")
            if isinstance(usage, dict):
                lines.append(
                    "[HARNESS] turn completed | tokens in={i} out={o} cache_read={c}".format(
                        i=usage.get("input_tokens"),
                        o=usage.get("output_tokens"),
                        c=usage.get("cache_read_input_tokens", 0),
                    )
                )
            res = ev.get("result")
            if isinstance(res, str) and res.strip():
                lines.append(f"[DELIVERABLE] {_clip(res, obs_trunc)}")
            continue

    rendered = "\n".join(lines).strip()
    if not rendered:
        return "(no parseable events in trajectory)"
    if len(rendered) > max_chars:
        dropped = len(rendered) - max_chars
        rendered = rendered[:max_chars] + "\n" + _TRUNC_FMT.format(n=dropped)
    return rendered


def final_message(path: Path) -> str:
    """Extract the last deliverable or assistant response text."""
    last = ""
    for ev in parse_items(Path(path)):
        if ev.get("type") == "result":
            r = ev.get("result")
            if isinstance(r, str) and r.strip():
                last = r
        elif ev.get("type") == "assistant":
            msg = ev.get("message")
            if isinstance(msg, dict):
                content = msg.get("content")
                if isinstance(content, list):
                    for blk in content:
                        if isinstance(blk, dict) and blk.get("type") == "text":
                            t = blk.get("text", "")
                            if t.strip():
                                last = t
    return last


__all__ = ["CLAUDE_SURFACE", "ClaudeSubstrate", "find_claude_binary", "render_events", "parse_items", "final_message", "agents_json"]
