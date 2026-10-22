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

"""File scanner, parser, and diff extractor for Harness² runs and artifacts."""

from __future__ import annotations

import difflib
import json
import os
import re
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _safe_read_json(path: Path) -> dict[str, Any] | None:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _safe_read_text(path: Path, max_bytes: int = 1_000_000) -> str:
    if not path.is_file():
        return ""
    try:
        data = path.read_bytes()
        if len(data) > max_bytes:
            data = data[:max_bytes] + b"\n\n...[truncated]..."
        return data.decode("utf-8", errors="replace")
    except Exception:
        return ""


def _file_mtime_iso(path: Path) -> str:
    try:
        mtime = path.stat().st_mtime
        return datetime.fromtimestamp(mtime, tz=timezone.utc).isoformat()
    except Exception:
        return ""


def list_runs(runs_root: Path) -> list[dict[str, Any]]:
    """Scan the runs root directory and identify all runs, demos, and sweeps."""
    if not runs_root.is_dir():
        return []

    runs: list[dict[str, Any]] = []

    # 1. Check for demo runs (directories containing demo.json)
    for p in sorted(runs_root.iterdir()):
        if p.is_dir():
            demo_json = p / "demo.json"
            if demo_json.is_file():
                meta = _safe_read_json(demo_json) or {}
                # count tasks
                tasks = meta.get("tasks", [])
                runs.append({
                    "id": p.name,
                    "name": f"Demo: {p.name}",
                    "type": "demo",
                    "path": str(p.relative_to(runs_root)),
                    "task_count": meta.get("n_tasks", len(tasks)),
                    "completed_count": meta.get("done", sum(1 for t in tasks if t.get("status") == "ok")),
                    "failed_count": meta.get("failed", 0),
                    "execution_count": meta.get("execution_count", 0),
                    "editor_calls": meta.get("editor_calls", 0),
                    "updated_at": _file_mtime_iso(demo_json),
                    "domain": meta.get("domain", "accounting"),
                    "modes": ["agg", "seq"],
                })

    # 2. Check for sweeps under _sweeps
    sweeps_dir = runs_root / "_sweeps"
    if sweeps_dir.is_dir():
        for sw in sorted(sweeps_dir.glob("*.json"), reverse=True):
            meta = _safe_read_json(sw) or {}
            domain_reps = meta.get("domains", [])
            done = sum(int(d.get("done", 0)) for d in domain_reps)
            failed = sum(int(d.get("failed", 0)) for d in domain_reps)
            total = sum(len(d.get("tasks", [])) for d in domain_reps)
            runs.append({
                "id": sw.stem,
                "name": f"Sweep: {sw.stem}",
                "type": "sweep",
                "path": str(sw.relative_to(runs_root)),
                "task_count": total or (done + failed),
                "completed_count": done,
                "failed_count": failed,
                "updated_at": _file_mtime_iso(sw),
                "modes": meta.get("modes", ["agg"]),
            })

    # 3. Check for standalone namespaces (e.g. jb-oc-agg1, or demo runs inside demo/runs)
    # Check top-level namespaces
    for p in sorted(runs_root.iterdir()):
        if p.is_dir() and not p.name.startswith(("_", ".")):
            if (p / "demo.json").is_file():
                continue
            # Check if this directory directly contains task summaries
            task_summaries = list(p.glob("*/summary.json"))
            if task_summaries:
                ok_count = 0
                for s in task_summaries:
                    s_data = _safe_read_json(s)
                    if s_data and s_data.get("status") in ("ok", "skipped"):
                        ok_count += 1
                runs.append({
                    "id": p.name,
                    "name": p.name,
                    "type": "namespace",
                    "path": str(p.relative_to(runs_root)),
                    "task_count": len(task_summaries),
                    "completed_count": ok_count,
                    "failed_count": len(task_summaries) - ok_count,
                    "updated_at": _file_mtime_iso(p),
                    "modes": ["agg"],
                })

    return runs


def _resolve_run_dir(runs_root: Path, run_id: str) -> Path:
    target = runs_root / run_id
    if target.is_dir():
        return target
    # check inside demo/runs if user passed demo-oc-agg1
    for demo_p in runs_root.glob("*/runs/" + run_id):
        if demo_p.is_dir():
            return demo_p
    return target


def get_tasks_for_run(runs_root: Path, run_id: str) -> list[dict[str, Any]]:
    """List all tasks and high-level progress within a run or demo."""
    run_dir = _resolve_run_dir(runs_root, run_id)
    if not run_dir.is_dir():
        return []

    # If run_dir is a demo directory containing demo.json and runs/
    task_map: dict[str, dict[str, Any]] = {}

    summary_paths = list(run_dir.rglob("summary.json"))
    for sp in sorted(summary_paths):
        # sp parent is task_dir, parent of task_dir is namespace
        task_dir = sp.parent
        task_id = task_dir.name.replace("__", "/")
        summary = _safe_read_json(sp) or {}

        status = summary.get("status", "unknown")
        domain = summary.get("domain", "")
        k = summary.get("k", 1)
        modes = summary.get("modes", {})
        selections = summary.get("selections", {})
        base_runs = summary.get("base", [])

        # Calculate spend & attempts
        total_usd = 0.0
        total_attempts = 0
        stages_summary = []
        for m_name, m_val in modes.items():
            if isinstance(m_val, dict):
                for stg in m_val.get("stages", []):
                    total_usd += float(stg.get("usd", 0.0))
                    total_attempts += int(stg.get("attempts", 0))
                    stages_summary.append({
                        "label": stg.get("label"),
                        "dim": stg.get("dim"),
                        "mode": m_name,
                        "usd": stg.get("usd", 0.0),
                        "attempts": stg.get("attempts", 0),
                        "notes": stg.get("notes", ""),
                        "fell_back": stg.get("fell_back", False),
                    })

        task_entry = {
            "task_id": task_id,
            "domain": domain,
            "status": status,
            "k": k,
            "run_path": str(task_dir.relative_to(runs_root)),
            "modes": list(modes.keys()),
            "base_count": len(base_runs),
            "stages_count": len(stages_summary),
            "stages": stages_summary,
            "total_usd": total_usd,
            "selections": {
                m: {
                    "chosen_label": s.get("chosen_label"),
                    "chosen_is_base": s.get("chosen_is_base"),
                    "why": s.get("why"),
                    "has_experience": bool(s.get("experience")),
                }
                for m, s in selections.items()
            },
            "updated_at": _file_mtime_iso(sp),
        }
        task_map[task_id] = task_entry

    return list(task_map.values())


def get_task_detail(runs_root: Path, run_id: str, task_id: str) -> dict[str, Any] | None:
    """Retrieve full execution detail, pipeline tree, deliverables, and harness paths for a task."""
    run_dir = _resolve_run_dir(runs_root, run_id)
    if not run_dir.is_dir():
        return None

    # locate the task directory
    safe_task_id = task_id.replace("/", "__")
    matched_dirs = list(run_dir.rglob(safe_task_id))
    matched_dirs = [d for d in matched_dirs if (d / "summary.json").is_file()]
    if not matched_dirs:
        return None

    task_dir = matched_dirs[0]
    summary_path = task_dir / "summary.json"
    summary = _safe_read_json(summary_path) or {}

    # Extract stages, rollouts, harnesses
    harnesses_dir = task_dir / "harnesses"
    available_harnesses = []
    if harnesses_dir.is_dir():
        available_harnesses = sorted([p.name for p in harnesses_dir.iterdir() if p.is_dir()])

    # Look for execution artifacts: answer.txt, trajectory.md
    # Execution directory might be in runs_root / executions / ... or task_dir / ...
    modes_data = summary.get("modes", {})
    selections_data = summary.get("selections", {})

    # Collect all stages info
    stages_info: dict[str, Any] = {}
    for m_name, m_val in modes_data.items():
        if isinstance(m_val, dict):
            for stg in m_val.get("stages", []):
                lbl = stg.get("label")
                if lbl:
                    stages_info[lbl] = dict(stg)
                    stages_info[lbl]["mode"] = m_name

    # Rollouts and Deliverables
    rollout_artifacts: dict[str, dict[str, str]] = {}
    # Search for execution outputs
    for base_obj in summary.get("base", []):
        lbl = base_obj.get("label", "base1")
        r_dir = Path(base_obj.get("run_dir", ""))
        rollout_artifacts[lbl] = _read_run_artifacts(r_dir)

    for m_name, sel in selections_data.items():
        r_dir = Path(sel.get("chosen_run_dir", ""))
        chosen_lbl = sel.get("chosen_label", "")
        if chosen_lbl and r_dir:
            rollout_artifacts[chosen_lbl] = _read_run_artifacts(r_dir)

    # Check for all labels in executions directory if reachable
    # Check parent/executions
    exec_root_candidates = [
        run_dir.parent / "executions" / run_dir.name / safe_task_id,
        run_dir / "executions" / safe_task_id,
        runs_root / "executions" / run_dir.name / safe_task_id,
    ]
    for cand in exec_root_candidates:
        if cand.is_dir():
            for stage_dir in cand.iterdir():
                if stage_dir.is_dir() and stage_dir.name not in rollout_artifacts:
                    rollout_artifacts[stage_dir.name] = _read_run_artifacts(stage_dir)

    # Build Pipeline DAG Structure for visual rendering
    pipeline_graph = _build_pipeline_graph(summary, stages_info, rollout_artifacts)

    # Reflections & Experiences
    reflection_dir = task_dir / "reflection"
    reflection_data = {}
    if reflection_dir.is_dir():
        for item in reflection_dir.iterdir():
            if item.is_file():
                reflection_data[item.name] = _safe_read_text(item, max_bytes=200_000)
            elif item.is_dir() and (item / "adoption.json").is_file():
                adoption = _safe_read_json(item / "adoption.json")
                edits = _safe_read_text(item / "edits.md")
                reflection_data[item.name] = {
                    "adoption": adoption,
                    "edits": edits,
                }

    return {
        "task_id": task_id,
        "domain": summary.get("domain", ""),
        "status": summary.get("status", "unknown"),
        "k": summary.get("k", 1),
        "summary": summary,
        "available_harnesses": available_harnesses,
        "stages": stages_info,
        "rollouts": rollout_artifacts,
        "selections": selections_data,
        "pipeline_graph": pipeline_graph,
        "reflection": reflection_data,
    }


def _read_run_artifacts(r_dir: Path) -> dict[str, str]:
    if not r_dir.is_dir():
        return {}
    out: dict[str, str] = {}
    for f in r_dir.iterdir():
        if f.is_file():
            out[f.name] = _safe_read_text(f, max_bytes=200_000)
    return out


def _build_pipeline_graph(
    summary: dict[str, Any],
    stages_info: dict[str, Any],
    rollout_artifacts: dict[str, dict[str, str]],
) -> dict[str, Any]:
    """Construct nodes and edges for DAG visualization."""
    nodes = []
    edges = []

    # 1. Base Node
    base_labels = [b.get("label", "base1") for b in summary.get("base", [])] or ["base1"]
    for b_lbl in base_labels:
        nodes.append({
            "id": b_lbl,
            "label": f"Base ({b_lbl})",
            "type": "base",
            "status": "completed",
            "dim": "BASE",
            "deliverable": rollout_artifacts.get(b_lbl, {}).get("answer.txt", ""),
            "has_trajectory": bool(rollout_artifacts.get(b_lbl, {}).get("trajectory.md")),
        })

    # 2. Stage Nodes per Mode
    modes = summary.get("modes", {})
    selections = summary.get("selections", {})

    for mode, m_data in modes.items():
        if not isinstance(m_data, dict):
            continue
        stages = m_data.get("stages", [])
        chosen_lbl = selections.get(mode, {}).get("chosen_label")

        prev_node = base_labels[0] if base_labels else None

        if mode == "agg":
            # Parallel mode: inv & dom branch out from base, agg composes them
            branch_nodes = []
            for stg in stages:
                lbl = stg.get("label")
                dim = stg.get("dim")
                if dim in ("INV", "DOM"):
                    nodes.append({
                        "id": lbl,
                        "label": f"{lbl} [{dim}]",
                        "type": "candidate",
                        "dim": dim,
                        "mode": "agg",
                        "status": "failed" if stg.get("fell_back") else "completed",
                        "fell_back": stg.get("fell_back", False),
                        "kept_base": stg.get("kept_base", False),
                        "notes": stg.get("notes", ""),
                        "error": stg.get("error", ""),
                        "usd": stg.get("usd", 0.0),
                        "attempts": stg.get("attempts", 1),
                        "deliverable": rollout_artifacts.get(lbl, {}).get("answer.txt", ""),
                        "is_chosen": (lbl == chosen_lbl),
                    })
                    edges.append({"source": base_labels[0], "target": lbl, "label": f"Propose {dim}"})
                    branch_nodes.append(lbl)

                elif dim in ("AGG", "COMPOSE"):
                    # Compose stage
                    nodes.append({
                        "id": lbl,
                        "label": f"{lbl} [COMPOSE]",
                        "type": "composed",
                        "dim": dim,
                        "mode": "agg",
                        "status": "failed" if stg.get("fell_back") else "completed",
                        "fell_back": stg.get("fell_back", False),
                        "kept_base": stg.get("kept_base", False),
                        "notes": stg.get("notes", ""),
                        "error": stg.get("error", ""),
                        "usd": stg.get("usd", 0.0),
                        "attempts": stg.get("attempts", 1),
                        "deliverable": rollout_artifacts.get(lbl, {}).get("answer.txt", ""),
                        "is_chosen": (lbl == chosen_lbl),
                    })
                    for branch in branch_nodes:
                        edges.append({"source": branch, "target": lbl, "label": "Compose"})

        elif mode == "seq":
            # Sequential mode: c1, c2 sequential steps
            for stg in stages:
                lbl = stg.get("label")
                dim = stg.get("dim")
                nodes.append({
                    "id": lbl,
                    "label": f"{lbl} [{dim}]",
                    "type": "sequential",
                    "dim": dim,
                    "mode": "seq",
                    "status": "failed" if stg.get("fell_back") else "completed",
                    "fell_back": stg.get("fell_back", False),
                    "kept_base": stg.get("kept_base", False),
                    "notes": stg.get("notes", ""),
                    "error": stg.get("error", ""),
                    "usd": stg.get("usd", 0.0),
                    "attempts": stg.get("attempts", 1),
                    "deliverable": rollout_artifacts.get(lbl, {}).get("answer.txt", ""),
                    "is_chosen": (lbl == chosen_lbl),
                })
                if prev_node:
                    edges.append({"source": prev_node, "target": lbl, "label": dim})
                prev_node = lbl

    return {"nodes": nodes, "edges": edges}


def get_harness_components(runs_root: Path, run_id: str, task_id: str, label: str) -> dict[str, Any]:
    """Retrieve all component files for a given harness label (base, inv1, agg1, etc.)."""
    run_dir = _resolve_run_dir(runs_root, run_id)
    safe_task_id = task_id.replace("/", "__")
    matched_dirs = list(run_dir.rglob(safe_task_id))
    matched_dirs = [d for d in matched_dirs if (d / "harnesses" / label).is_dir()]
    if not matched_dirs:
        return {}

    target_harness = matched_dirs[0] / "harnesses" / label

    components: dict[str, Any] = {
        "systemprompt": "",
        "guardrails": "",
        "memory": "",
        "tool_guidance": "",
        "scripts": {},
        "skills": {},
        "subagents": {},
        "plugins": {},
        "raw_files": {},
    }

    # standard always-on
    components["systemprompt"] = _safe_read_text(target_harness / "systemprompt.md")
    components["guardrails"] = _safe_read_text(target_harness / "guardrails.md")
    components["memory"] = _safe_read_text(target_harness / "LongTermMEMORY.md")
    components["tool_guidance"] = _safe_read_text(target_harness / "tool_descriptions" / "tool_guidance.md")

    # scripts
    scripts_dir = target_harness / "scripts"
    if scripts_dir.is_dir():
        for sf in scripts_dir.iterdir():
            if sf.is_file():
                components["scripts"][sf.name] = _safe_read_text(sf)

    # skills
    skills_dir = target_harness / "skills"
    if skills_dir.is_dir():
        for sk in skills_dir.iterdir():
            if sk.is_dir():
                components["skills"][sk.name] = {
                    f.name: _safe_read_text(f) for f in sk.iterdir() if f.is_file()
                }

    # all files flat map
    for f in target_harness.rglob("*"):
        if f.is_file():
            rel_name = str(f.relative_to(target_harness))
            components["raw_files"][rel_name] = _safe_read_text(f)

    return components


def get_harness_diff(
    runs_root: Path, run_id: str, task_id: str, base_label: str = "base", compare_label: str = "agg1"
) -> dict[str, Any]:
    """Compute file-level unified diffs between two harness states with intent summaries."""
    c_base = get_harness_components(runs_root, run_id, task_id, base_label)
    c_comp = get_harness_components(runs_root, run_id, task_id, compare_label)

    base_files = c_base.get("raw_files", {})
    comp_files = c_comp.get("raw_files", {})

    all_keys = sorted(set(base_files.keys()) | set(comp_files.keys()))
    diffs = []

    components_summary = {
        "systemprompt": {"status": "unchanged", "label": "系统提示词", "changes": 0},
        "guardrails": {"status": "unchanged", "label": "安全护栏", "changes": 0},
        "memory": {"status": "unchanged", "label": "长期记忆", "changes": 0},
        "tools": {"status": "unchanged", "label": "工具指引", "changes": 0},
        "scripts": {"status": "unchanged", "label": "辅助脚本", "changes": 0},
        "skills": {"status": "unchanged", "label": "专业技能", "changes": 0},
        "subagents": {"status": "unchanged", "label": "子智能体", "changes": 0},
        "plugins": {"status": "unchanged", "label": "中间件插件", "changes": 0},
    }

    def _map_comp(path_str: str) -> str:
        if path_str == "systemprompt.md":
            return "systemprompt"
        if path_str == "guardrails.md":
            return "guardrails"
        if path_str == "LongTermMEMORY.md":
            return "memory"
        if path_str.startswith("tool_descriptions"):
            return "tools"
        if path_str.startswith("scripts"):
            return "scripts"
        if path_str.startswith("skills"):
            return "skills"
        if path_str.startswith("sub_agents"):
            return "subagents"
        if path_str.startswith("plugin"):
            return "plugins"
        return ""

    for k in all_keys:
        old_txt = base_files.get(k, "")
        new_txt = comp_files.get(k, "")
        if old_txt == new_txt:
            continue

        status = "modified"
        if not old_txt and new_txt:
            status = "added"
        elif old_txt and not new_txt:
            status = "removed"

        old_lines = old_txt.splitlines(keepends=True)
        new_lines = new_txt.splitlines(keepends=True)

        diff_lines = list(
            difflib.unified_diff(
                old_lines,
                new_lines,
                fromfile=f"a/{k}",
                tofile=f"b/{k}",
                n=3,
            )
        )

        additions = sum(1 for line in diff_lines if line.startswith("+") and not line.startswith("+++"))
        deletions = sum(1 for line in diff_lines if line.startswith("-") and not line.startswith("---"))

        comp_key = _map_comp(k)
        if comp_key in components_summary:
            components_summary[comp_key]["status"] = status
            components_summary[comp_key]["changes"] += additions + deletions

        diffs.append({
            "path": k,
            "component": comp_key,
            "status": status,
            "additions": additions,
            "deletions": deletions,
            "diff_text": "".join(diff_lines),
            "old_content": old_txt,
            "new_content": new_txt,
        })

    # Extract intent from summary.json if available
    run_dir = _resolve_run_dir(runs_root, run_id)
    safe_task_id = task_id.replace("/", "__")
    matched_dirs = list(run_dir.rglob(safe_task_id))
    intent_summary: list[str] = []

    if matched_dirs:
        summary_file = matched_dirs[0] / "summary.json"
        summary_data = _safe_read_json(summary_file) or {}

        # 1. Notes from the matching stage
        stage_notes = ""
        for m_val in summary_data.get("modes", {}).values():
            if isinstance(m_val, dict):
                for stg in m_val.get("stages", []):
                    if stg.get("label") == compare_label:
                        stage_notes = stg.get("notes", "").strip()
                        break
            if stage_notes:
                break
        if stage_notes:
            intent_summary.append(f"提议意图：{stage_notes}")

        # 2. Selection rationale if comparing against or within chosen
        for s_val in summary_data.get("selections", {}).values():
            if isinstance(s_val, dict) and s_val.get("chosen_label") == compare_label:
                why = s_val.get("why", "").strip()
                if why:
                    intent_summary.append(f"采纳原因：{why}")
                exp = s_val.get("experience", {})
                if exp.get("lesson"):
                    intent_summary.append(f"经验总结：{exp.get('lesson')}")

    # Fallback / synthetic bullet points if empty
    if not intent_summary:
        if not diffs:
            intent_summary.append("两阶段套件完全一致，未发生组件修改。")
        else:
            for d in diffs:
                c_name = components_summary.get(d.get("component", ""), {}).get("label", d["path"])
                act = "新增" if d["status"] == "added" else ("删除" if d["status"] == "removed" else "优化调整")
                intent_summary.append(f"{act}了{c_name}（{d['path']}），变动 {d['additions'] + d['deletions']} 行代码。")

    return {
        "task_id": task_id,
        "base_label": base_label,
        "compare_label": compare_label,
        "has_changes": len(diffs) > 0,
        "total_files_changed": len(diffs),
        "total_additions": sum(d["additions"] for d in diffs),
        "total_deletions": sum(d["deletions"] for d in diffs),
        "intent_summary": intent_summary,
        "components_summary": components_summary,
        "files": diffs,
    }


def get_preflight_status(workspace_root: Path) -> dict[str, Any]:
    """Inspect environment prerequisites for user guidance and preflight checks."""
    docker_bin = shutil.which("docker")
    docker_available = False
    docker_msg = "未安装 Docker 命令行工具"
    if docker_bin:
        try:
            res = subprocess.run([docker_bin, "info"], capture_output=True, timeout=5)
            if res.returncode == 0:
                docker_available = True
                docker_msg = "Docker 守护进程运行正常（支持 WorkBuddy-Bench）"
            else:
                docker_msg = "Docker 已安装但守护进程未启动（启动 Docker 即可运行 WorkBuddy-Bench）"
        except Exception:
            docker_msg = "Docker 检查超时或失败"

    project = os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("HARNESS2_VERTEX_PROJECT")
    solver_model = os.environ.get("HARNESS2_SOLVER_MODEL")
    judge_model = os.environ.get("HARNESS2_JUDGE_MODEL")
    api_key = os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("OPENAI_API_KEY")

    has_credentials = bool(project or solver_model or api_key)
    if has_credentials:
        cred_msg = f"已就绪 (Project: {project or '已设置'}, Model: {solver_model or '已设置'})"
    else:
        cred_msg = "未配置大模型凭据（免 API 的本地 Demo 模式完全可用，可即时体验）"

    deps = workspace_root / "dependencies"
    jb_ready = (deps / "job-bench-eval" / "dataset" / "main").is_dir()
    lab_ready = (deps / "harvey-labs" / "tasks").is_dir()
    wb_ready = (deps / "workbuddy-bench" / "datasets").is_dir()

    pandoc_ok = bool(shutil.which("pandoc"))
    pdftoppm_ok = bool(shutil.which("pdftoppm"))
    node_ok = bool(shutil.which("node"))

    return {
        "status": "ready" if has_credentials else "demo_ready",
        "has_credentials": has_credentials,
        "credentials": {
            "project": project or "",
            "solver_model": solver_model or "",
            "judge_model": judge_model or "",
            "message": cred_msg,
        },
        "docker": {
            "available": docker_available,
            "message": docker_msg,
        },
        "benchmarks": {
            "demo": {
                "available": True,
                "label": "本地离线 Demo",
                "status": "ready",
                "message": "开箱即用，免 API 凭据，内置确定性任务",
            },
            "jb": {
                "available": jb_ready and has_credentials,
                "label": "JobBench (jb)",
                "status": "ready" if (jb_ready and has_credentials) else ("need_credentials" if jb_ready else "not_installed"),
                "message": "已就绪" if (jb_ready and has_credentials) else ("需配置 .env 模型凭据" if jb_ready else "需运行 harness2-setup jb"),
            },
            "lab": {
                "available": lab_ready and has_credentials and pandoc_ok,
                "label": "LAB (lab)",
                "status": "ready" if (lab_ready and has_credentials and pandoc_ok) else "not_installed",
                "message": "已就绪" if (lab_ready and has_credentials and pandoc_ok) else "需运行 harness2-setup lab (依赖 Pandoc/Poppler)",
            },
            "wb": {
                "available": wb_ready and docker_available and has_credentials,
                "label": "WorkBuddy-Bench (wb)",
                "status": "ready" if (wb_ready and docker_available and has_credentials) else "not_installed",
                "message": "已就绪" if (wb_ready and docker_available and has_credentials) else "需运行 harness2-setup wb 并启动 Docker",
            },
        },
        "tools": {
            "pandoc": pandoc_ok,
            "poppler": pdftoppm_ok,
            "node": node_ok,
        },
    }


def get_library_index(runs_root: Path, run_id: str) -> list[dict[str, Any]]:
    """Extract cumulative continual learning experiences from the library directory."""
    run_dir = _resolve_run_dir(runs_root, run_id)
    lib_roots = list(run_dir.rglob("library"))
    if not lib_roots:
        return []

    entries: list[dict[str, Any]] = []

    for lr in lib_roots:
        # Search for EXPERIENCE.md
        exp_files = list(lr.rglob("EXPERIENCE.md"))
        for ef in sorted(exp_files):
            task_name = ef.parent.name
            domain_name = ef.parent.parent.parent.name if len(ef.parents) >= 3 else "default"
            content = _safe_read_text(ef)

            cue_m = re.search(r"^\s*-\s*\*{0,2}cue\*{0,2}:\s*(.+)$", content, re.MULTILINE | re.IGNORECASE)
            lesson_m = re.search(r"^\s*-\s*\*{0,2}lesson\*{0,2}:\s*(.+)$", content, re.MULTILINE | re.IGNORECASE)
            conf_m = re.search(r"^\s*-\s*\*{0,2}confidence\*{0,2}:\s*(.+)$", content, re.MULTILINE | re.IGNORECASE)

            cue = cue_m.group(1).strip() if cue_m else ""
            lesson = lesson_m.group(1).strip() if lesson_m else ""
            conf = conf_m.group(1).strip() if conf_m else ""

            # Deduplicate by task_id and cue
            if not any(e["task_id"] == task_name and e["cue"] == cue for e in entries):
                entries.append({
                    "task_id": task_name,
                    "domain": domain_name,
                    "path": str(ef.relative_to(runs_root)),
                    "raw_text": content,
                    "cue": cue,
                    "lesson": lesson,
                    "confidence": conf,
                })

    return entries


def get_benchmark_report(runs_root: Path, run_id: str) -> dict[str, Any]:
    """Load judged.json and base_judged.json if present, calculating metrics."""
    run_dir = _resolve_run_dir(runs_root, run_id)
    judged_path = run_dir / "judged.json"
    base_judged_path = run_dir / "base_judged.json"

    judged_rows = _safe_read_json(judged_path) or []
    base_rows = _safe_read_json(base_judged_path) or []

    # Calculate summary metrics
    if not isinstance(judged_rows, list):
        judged_rows = []
    if not isinstance(base_rows, list):
        base_rows = []

    def _calc_stats(rows: list[dict[str, Any]]) -> dict[str, Any]:
        graded = [r for r in rows if r.get("n_criteria", 0) > 0]
        n_graded = len(graded)
        if not n_graded:
            return {"count": len(rows), "graded": 0, "avg_score": 0.0, "all_pass_rate": 0.0}

        avg_score = (
            sum(float(r.get("n_passed", 0)) / float(r.get("n_criteria", 1)) for r in graded)
            / n_graded
            * 100.0
        )
        all_pass_count = sum(1 for r in graded if r.get("all_pass"))
        return {
            "count": len(rows),
            "graded": n_graded,
            "avg_score": round(avg_score, 2),
            "all_pass_rate": round(all_pass_count / n_graded * 100.0, 2),
            "all_pass_count": all_pass_count,
        }

    return {
        "run_id": run_id,
        "has_judged": bool(judged_rows),
        "has_base_judged": bool(base_rows),
        "adapted_stats": _calc_stats(judged_rows),
        "base_stats": _calc_stats(base_rows),
        "judged_rows": judged_rows,
        "base_rows": base_rows,
    }


# =====================================================================
# Preset Component Templates & Custom Component Manager (c1..c8)
# =====================================================================

PRESET_COMPONENT_TEMPLATES: list[dict[str, Any]] = [
    {
        "id": "tpl_c1_autonomous_engineer",
        "category": "c1",
        "type": "c1_prompt",
        "name": "autonomous_engineer_prompt",
        "label": "自主专家工程师系统提示词 (Autonomous Engineer Persona)",
        "path": "systemprompt.md",
        "description": "设定高鲁棒性自主编码与故障排查专家设定，规范第一性原理推演与自检公理。",
        "tags": ["c1", "System Prompt", "工程规范", "第一性原理"],
        "content": (
            "# 专家自主执行智能体 (Autonomous Principal Engineer)\n\n"
            "你是一个具备高级问题解决与递归优化能力的自主智能体。\n"
            "在执行任何代码分析、测试编写或系统修改前，请务必遵守以下操作公理：\n\n"
            "## 1. 核心工作哲学\n"
            "- **第一性原理溯源**：切忌主观臆测与黑盒试错。优先阅读源代码、抽象语法树 (AST) 与底层配置，查明故障本原机制。\n"
            "- **环境不变性保证**：执行修改前先验证当前基准测试；修改后必须执行全量回归验证，确保无意外负向回归。\n"
            "- **原子化增量提交**：每个改动必须保持单一职责，并附带针对性的检验断言。\n\n"
            "## 2. 行为准则\n"
            "- 每次开始任务时，必须先列举候选方案并自评估潜在边界破坏风险。\n"
            "- 输出内容保持工程化高密度，去除无价值的套话与寒暄。\n"
        ),
    },
    {
        "id": "tpl_c2_production_guard",
        "category": "c2",
        "type": "c2_guardrail",
        "name": "production_safety_guard",
        "label": "生产环境安全护栏与危险命令拦截 (Safety Guardrails)",
        "path": "guardrails.md",
        "description": "防御性安全屏障，禁止非授权破坏性文件删除、未受控提权以及敏感凭据泄漏。",
        "tags": ["c2", "Guardrail", "安全防御", "合规审查"],
        "content": (
            "# 操作安全护栏与边界拦截规范 (Safety Guardrails)\n\n"
            "在执行任意系统调用、文件操作及外部网络请求时，强制遵守以下红线：\n\n"
            "## 1. 禁止执行的危险操作\n"
            "- **严禁破坏性删除**：禁止执行 `rm -rf /`、清空根目录或删除未受管控的父级工作区。\n"
            "- **严禁硬编码敏感凭据**：任何私钥、API Key、Session Token 严禁明文写入文件或日志。\n"
            "- **严禁非受限网络外连**：不得向非授信第三方域名发送内部数据包。\n\n"
            "## 2. 文件变更校验\n"
            "- 每次写文件操作必须限制在当前任务约定的 Staging 目录或工作空间内。\n"
            "- 关键配置文件修改必须保留带时间戳的 `.bak` 备份文件。\n"
        ),
    },
    {
        "id": "tpl_c3_incremental_ledger",
        "category": "c3",
        "type": "c3_memory",
        "name": "incremental_task_ledger",
        "label": "跨阶段长效运行记忆账本 (Incremental Memory Ledger)",
        "path": "LongTermMEMORY.md",
        "description": "记录跨轮次提炼的关键坑点、库版本兼容性备忘与高频有效策略，避免重复犯错。",
        "tags": ["c3", "Memory", "经验复用", "增量账本"],
        "content": (
            "# 跨阶段长效运行记忆账本 (Long-Term Memory Ledger)\n\n"
            "## 已验证有效的策略模式\n"
            "1. 涉及金融会计金额计算时，始终采用 `Decimal` 或整型分计量，严禁浮点数直接累加导致舍入偏差。\n"
            "2. 涉及异步并发流处理时，优先使用有界缓冲队列并配备连接重连熔断器。\n\n"
            "## 常见踩坑与回归防范\n"
            "- 部分历史测试依赖静态测试夹具，若增删依赖库需确保与全局锁文件（如 uv.lock / package-lock.json）保持哈希一致。\n"
        ),
    },
    {
        "id": "tpl_c4_structured_json",
        "category": "c4",
        "type": "c4_tool",
        "name": "structured_tool_protocol",
        "label": "结构化工具调用协议与容错指引 (Tool Guidance)",
        "path": "tool_descriptions/tool_guidance.md",
        "description": "规范智能体工具调用的参数类型约束、错误处理逻辑与输出 Contract。",
        "tags": ["c4", "Tool Guidance", "协议规范", "接口契约"],
        "content": (
            "# 工具调用协议与异常重试指引 (Tool Guidance Protocol)\n\n"
            "## 参数调用约定\n"
            "- **严格类型校验**：传递给计算工具的数值参数必须与文档声明的类型一致（禁止传递字符串形式的浮点数）。\n"
            "- **幂等性保障**：外部 API 调用必须传递唯一 `idempotency_key`，避免网络超时重试导致重复提交。\n\n"
            "## 异常响应解析\n"
            "- 当工具返回状态码非 200 时，必须首先打印详细返回报文并检查必填字段缺失，而非盲目重新发送相同载荷。\n"
        ),
    },
    {
        "id": "tpl_c5_arch_reviewer",
        "category": "c5",
        "type": "c5_subagent",
        "name": "arch_reviewer",
        "label": "架构审查与代码重构专员 (Architecture Reviewer Subagent)",
        "path": "sub_agents/arch_reviewer/AGENT.md",
        "description": "专用于在主智能体合成后进行独立 AST 语法扫描与设计模式合规性审查的委托代理。",
        "tags": ["c5", "Subagent", "代码审查", "架构设计"],
        "content": (
            "---\n"
            "name: arch_reviewer\n"
            "description: 专门负责代码结构合理性审查与设计模式合规检测的轻量级审查员子智能体。\n"
            "tools: [read_file, run_command]\n"
            "---\n\n"
            "# 架构审查子智能体 (Architecture Reviewer)\n\n"
            "你的唯一目标是协助主智能体审阅新提交或合成的代码补丁，评估其架构健壮度。\n\n"
            "## 审查维度\n"
            "1. **模块高内聚低耦合**：是否存在不合理的跨层循环引用？\n"
            "2. **错误处理完备性**：是否有裸露的 `except: pass` 或静默忽略异常？\n"
            "3. **接口扩展性**：未来新增执行器或组件时是否容易横向扩展？\n\n"
            "输出结构化审查报告，包含：\n"
            "- [P0/P1 风险项]\n"
            "- [重构建议]\n"
            "- [通过/驳回裁定]\n"
        ),
    },
    {
        "id": "tpl_c6_data_cleaner",
        "category": "c6",
        "type": "c6_skill",
        "name": "data_cleaner",
        "label": "复杂数据清洗与数值对齐技能 (Data Cleaner Skill)",
        "path": "skills/data_cleaner/SKILL.md",
        "description": "提供标准数据清洗流程手册及自动化 Python 清洗脚本，包含字段归一化与校验。",
        "tags": ["c6", "Skill", "数据清洗", "自动化流程"],
        "content": (
            "---\n"
            "name: data_cleaner\n"
            "description: 对含格式噪点的交易流水和结构化账单执行清洗、补齐与校验。\n"
            "---\n\n"
            "# 交易流水数据清洗指南 (Data Cleaner Skill)\n\n"
            "当面对未知来源的 CSV / JSON / Excel 账目数据时，按此技能手册执行标准化：\n\n"
            "## 步骤流程\n"
            "1. 运行 `scripts/clean_data.py --input <path>` 执行首轮格式规范化。\n"
            "2. 检查日期字段是否符合 ISO 8601 格式 (`YYYY-MM-DD`)。\n"
            "3. 对缺失或格式畸变的金额项记录到异常告警队列，并使用默认基线策略补齐。\n"
        ),
        "extra_files": {
            "skills/data_cleaner/scripts/clean_data.py": (
                '"""Automated data cleaner utility."""\n'
                "import csv\n"
                "import sys\n"
                "from decimal import Decimal\n\n"
                "def clean_row(row):\n"
                "    cleaned = dict(row)\n"
                '    if "amount" in cleaned:\n'
                '        raw = cleaned["amount"].replace("$", "").replace(",", "").strip()\n'
                '        cleaned["amount"] = str(Decimal(raw)) if raw else "0.00"\n'
                "    return cleaned\n\n"
                'if __name__ == "__main__":\n'
                '    print("Clean utility ready.")\n'
            )
        },
    },
    {
        "id": "tpl_c7_execution_auditor",
        "category": "c7",
        "type": "c7_hook",
        "name": "execution_auditor",
        "label": "运行时执行审计与耗时监控钩子 (Execution Auditor Hook)",
        "path": "plugins/execution_auditor.ts",
        "description": "在智能体每次工具调用前后拦截执行上下文，记录调用耗时与入参快照。",
        "tags": ["c7", "Hook", "事件拦截", "性能审计"],
        "content": (
            "/**\n"
            " * Execution Auditor Hook\n"
            " * Tracks tool execution timing and audits runtime state changes.\n"
            " */\n"
            "export async function beforeToolCall(toolName: string, args: Record<string, any>) {\n"
            "  console.log(`[AUDIT] Preparing to execute tool: ${toolName}`);\n"
            "  return { startTimestamp: Date.now() };\n"
            "}\n\n"
            "export async function afterToolCall(toolName: string, result: any, context: { startTimestamp: number }) {\n"
            "  const duration = Date.now() - context.startTimestamp;\n"
            "  console.log(`[AUDIT] Finished ${toolName} in ${duration}ms`);\n"
            "}\n"
        ),
    },
    {
        "id": "tpl_c8_validate_schema",
        "category": "c8",
        "type": "c8_script",
        "name": "validate_schema",
        "label": "JSON Schema 快速语法校验脚本 (Validate Schema Script)",
        "path": "scripts/validate_schema.py",
        "description": "独立运行的 Python 校验脚本，验证中间产物与配置文件的完整性。",
        "tags": ["c8", "Script", "Python", "语法校验"],
        "content": (
            '"""Validate JSON payload against schema definitions."""\n'
            "import json\n"
            "import sys\n"
            "from pathlib import Path\n\n"
            "def validate(file_path: str) -> bool:\n"
            "    path = Path(file_path)\n"
            "    if not path.is_file():\n"
            '        print(f"File not found: {file_path}", file=sys.stderr)\n'
            "        return False\n"
            "    try:\n"
            '        data = json.loads(path.read_text(encoding="utf-8"))\n'
            '        print(f"Validation OK: {path.name} loaded with {len(data)} items.")\n'
            "        return True\n"
            "    except Exception as e:\n"
            '        print(f"Validation failed: {e}", file=sys.stderr)\n'
            "        return False\n\n"
            'if __name__ == "__main__":\n'
            "    if len(sys.argv) > 1:\n"
            "        validate(sys.argv[1])\n"
            "    else:\n"
            '        print("Usage: python3 scripts/validate_schema.py <path>")\n'
        ),
    },
]


def get_custom_components_dir(workspace_root: Path) -> Path:
    d = workspace_root / "custom_components"
    d.mkdir(parents=True, exist_ok=True)
    return d


def list_custom_components(workspace_root: Path) -> list[dict[str, Any]]:
    """List all user-created and preset Harness components."""
    comp_dir = get_custom_components_dir(workspace_root)
    index_file = comp_dir / "components.json"
    custom_list: list[dict[str, Any]] = []

    if index_file.is_file():
        custom_list = _safe_read_json(index_file) or []

    # Map presets and custom items
    results: list[dict[str, Any]] = []

    # Add presets with preset marker
    for p in PRESET_COMPONENT_TEMPLATES:
        item = dict(p)
        item["source"] = "preset"
        item["updated_at"] = "2026-10-20T00:00:00Z"
        results.append(item)

    # Add user custom items
    for c in custom_list:
        item = dict(c)
        item["source"] = "custom"
        results.append(item)

    return results


def save_custom_component(workspace_root: Path, comp_data: dict[str, Any]) -> dict[str, Any]:
    """Save or update a custom harness component."""
    comp_dir = get_custom_components_dir(workspace_root)
    index_file = comp_dir / "components.json"
    custom_list: list[dict[str, Any]] = []
    if index_file.is_file():
        custom_list = _safe_read_json(index_file) or []

    comp_id = comp_data.get("id") or f"custom_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
    category = comp_data.get("category", "c6")
    name = re.sub(r"[^a-zA-Z0-9_\-]", "_", comp_data.get("name", "custom_comp")).lower()

    # Determine default path based on category if omitted
    path = comp_data.get("path")
    if not path:
        if category == "c1":
            path = "systemprompt.md"
        elif category == "c2":
            path = "guardrails.md"
        elif category == "c3":
            path = "LongTermMEMORY.md"
        elif category == "c4":
            path = "tool_descriptions/tool_guidance.md"
        elif category == "c5":
            path = f"sub_agents/{name}/AGENT.md"
        elif category == "c6":
            path = f"skills/{name}/SKILL.md"
        elif category == "c7":
            path = f"plugins/{name}.ts"
        elif category == "c8":
            path = f"scripts/{name}.py"
        else:
            path = f"components/{name}.txt"

    now_iso = datetime.now(timezone.utc).isoformat()
    record = {
        "id": comp_id,
        "name": name,
        "category": category,
        "type": comp_data.get("type", f"{category}_custom"),
        "label": comp_data.get("label", name),
        "path": path,
        "description": comp_data.get("description", ""),
        "tags": comp_data.get("tags", [category, "Custom"]),
        "content": comp_data.get("content", ""),
        "extra_files": comp_data.get("extra_files", {}),
        "updated_at": now_iso,
        "source": "custom",
    }

    # Upsert
    existing_idx = next((i for i, c in enumerate(custom_list) if c.get("id") == comp_id), -1)
    if existing_idx >= 0:
        custom_list[existing_idx] = record
    else:
        custom_list.insert(0, record)

    index_file.write_text(json.dumps(custom_list, indent=2, ensure_ascii=False), encoding="utf-8")
    return record


def delete_custom_component(workspace_root: Path, comp_id: str) -> bool:
    """Delete a custom component by ID."""
    comp_dir = get_custom_components_dir(workspace_root)
    index_file = comp_dir / "components.json"
    if not index_file.is_file():
        return False
    custom_list = _safe_read_json(index_file) or []
    initial_len = len(custom_list)
    custom_list = [c for c in custom_list if c.get("id") != comp_id]
    if len(custom_list) < initial_len:
        index_file.write_text(json.dumps(custom_list, indent=2, ensure_ascii=False), encoding="utf-8")
        return True
    return False


def apply_component_to_run(
    runs_root: Path, run_id: str, task_id: str, label: str, comp_data: dict[str, Any]
) -> dict[str, Any]:
    """Inject a component directly into a specific task's harness directory."""
    run_dir = _resolve_run_dir(runs_root, run_id)
    safe_task_id = task_id.replace("/", "__")
    matched_dirs = list(run_dir.rglob(safe_task_id))
    matched_dirs = [d for d in matched_dirs if (d / "harnesses" / label).is_dir()]
    if not matched_dirs:
        raise ValueError(f"Harness destination not found for {task_id} @ {label}")

    target_harness = matched_dirs[0] / "harnesses" / label

    path = comp_data.get("path")
    if not path:
        raise ValueError("Component path is required for injection.")

    out_file = target_harness / path
    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(comp_data.get("content", ""), encoding="utf-8")

    # Extra files if any (e.g. scripts for skill)
    extra_files = comp_data.get("extra_files", {})
    for extra_path, content in extra_files.items():
        ep = target_harness / extra_path
        ep.parent.mkdir(parents=True, exist_ok=True)
        ep.write_text(content, encoding="utf-8")

    return {
        "status": "applied",
        "task_id": task_id,
        "label": label,
        "written_file": str(out_file.relative_to(target_harness)),
        "extra_files_written": list(extra_files.keys()),
    }


def get_executors_status(workspace_root: Path) -> dict[str, Any]:
    """Inspect and return detailed status of all supported executors (Claude, OpenCode, Codex, Vertex)."""
    # 1. Claude CLI / API inspection
    from ..substrate.claude import find_claude_binary
    claude_binary_path = find_claude_binary()
    claude_bin = str(claude_binary_path) if claude_binary_path.is_file() and os.access(claude_binary_path, os.X_OK) else None
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
    claude_model = os.environ.get("HARNESS2_CLAUDE_MODEL", "claude-3-7-sonnet-20250219")
    claude_thinking = int(os.environ.get("HARNESS2_CLAUDE_THINKING_BUDGET", "4096"))

    claude_status = "ready" if (claude_bin or anthropic_key) else "needs_config"
    claude_msg = (
        f"Claude (clawgod) 运行时已就绪 (CLI: {claude_bin or '未安装'}, API Key: {'已配置' if anthropic_key else '未配置'})"
        if (claude_bin or anthropic_key)
        else "未配置 ANTHROPIC_API_KEY 或未检测到 claude/clawgod CLI"
    )

    # 2. OpenCode Substrate inspection
    opencode_dir = workspace_root / "dependencies" / "opencode"
    bun_bin = shutil.which("bun") or str(
        workspace_root / "dependencies" / "tools" / "node_modules" / ".bin" / "bun"
    )
    bun_ok = bool(shutil.which(bun_bin) or Path(bun_bin).is_file())
    oc_status = "ready" if (opencode_dir.is_dir() and bun_ok) else "missing_deps"
    oc_model = os.environ.get("HARNESS2_SOLVER_MODEL", "google-vertex/gemini-2.5-pro")

    # 3. Codex Substrate inspection
    codex_dir = workspace_root / "dependencies" / "codex"
    cx_status = "ready" if codex_dir.is_dir() else "optional"
    cx_model = os.environ.get("HARNESS2_CODEX_MODEL", "gpt-4o")

    # 4. Google Cloud Vertex AI inspection
    vertex_project = os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("HARNESS2_VERTEX_PROJECT", "")
    vertex_region = os.environ.get("GOOGLE_CLOUD_LOCATION", "global")
    vertex_status = "ready" if vertex_project else "needs_project"

    return {
        "active_executor": os.environ.get("HARNESS2_DEFAULT_EXECUTOR", "claude" if anthropic_key or claude_bin else "oc"),
        "executors": [
            {
                "id": "claude",
                "name": "Claude Code / Anthropic",
                "title": "Claude 一等公民执行器 (Claude Solver & Improver)",
                "category": "hybrid",
                "status": claude_status,
                "status_message": claude_msg,
                "cli_available": bool(claude_bin),
                "cli_path": claude_bin or "",
                "api_key_configured": bool(anthropic_key),
                "current_model": claude_model,
                "thinking_budget": claude_thinking,
                "supported_models": [
                    "claude-3-7-sonnet-20250219",
                    "claude-3-5-sonnet-20241022",
                    "claude-3-5-haiku-20241022",
                    "claude-3-opus-20240229",
                    "vertex/claude-3-7-sonnet",
                ],
                "capabilities": [
                    "深度扩展思考 (Extended Thinking Tokens)",
                    "Claude Code CLI 原生批处理执行",
                    "多轮上下文递归演进",
                    "结构化 Harness 补丁生成",
                    "开箱即用支持多基准评测 (JobBench, WorkBuddy, Lab)",
                ],
            },
            {
                "id": "oc",
                "name": "OpenCode (oc)",
                "title": "OpenCode 原生 Substrate 执行器",
                "category": "substrate",
                "status": oc_status,
                "status_message": "依赖 Bun 运行时与 opencode 源码仓库" if oc_status == "ready" else "未完成 dependencies/opencode 初始化",
                "cli_available": bun_ok,
                "cli_path": bun_bin if bun_ok else "",
                "api_key_configured": bool(os.environ.get("OPENAI_API_KEY") or vertex_project),
                "current_model": oc_model,
                "supported_models": [
                    "google-vertex/gemini-2.5-pro",
                    "google-vertex/gemini-2.5-flash",
                    "openai/gpt-4o",
                    "anthropic/claude-3-7-sonnet",
                ],
                "capabilities": [
                    "三层 Staging Install 机制",
                    "轻量级工具链桥接",
                    "多轮次迭代对比",
                ],
            },
            {
                "id": "cx",
                "name": "Codex (cx)",
                "title": "Codex 容器 Substrate 执行器",
                "category": "substrate",
                "status": cx_status,
                "status_message": "Codex 本地分发包已加载" if cx_status == "ready" else "未加载 Codex 分发包（可选）",
                "cli_available": False,
                "cli_path": "",
                "api_key_configured": bool(os.environ.get("HARNESS2_CODEX_API_KEY")),
                "current_model": cx_model,
                "supported_models": [
                    "gpt-4o",
                    "o1",
                    "o3-mini",
                ],
                "capabilities": [
                    "容器内运行沙箱",
                    "Codex CLI 协议适配",
                ],
            },
            {
                "id": "vertex",
                "name": "Google Cloud Vertex AI",
                "title": "Vertex AI 评测与裁判引擎",
                "category": "cloud",
                "status": vertex_status,
                "status_message": f"项目: {vertex_project or '未配置'} ({vertex_region})" if vertex_status == "ready" else "未设置 GOOGLE_CLOUD_PROJECT",
                "cli_available": bool(shutil.which("gcloud")),
                "cli_path": shutil.which("gcloud") or "",
                "api_key_configured": bool(vertex_project),
                "current_model": os.environ.get("HARNESS2_JUDGE_MODEL", "gemini-2.5-pro"),
                "supported_models": [
                    "gemini-2.5-pro",
                    "gemini-2.5-flash",
                    "claude-3-7-sonnet",
                ],
                "capabilities": [
                    "基准测试自动化双盲裁判",
                    "ADC 统一凭证认证",
                ],
            },
        ],
    }

