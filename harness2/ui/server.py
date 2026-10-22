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

"""FastAPI server providing REST APIs, SSE event streams, and static SPA serving."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import scanner
from .runner import ExecutionManager


class ComponentCreateRequest(BaseModel):
    id: str | None = None
    name: str = Field(..., description="Component unique name")
    category: str = Field(..., description="c1..c8")
    label: str = Field(..., description="Human-readable title")
    description: str = Field(default="", description="Detailed summary")
    path: str | None = Field(default=None, description="Relative destination file path")
    content: str = Field(default="", description="Main file body")
    extra_files: dict[str, str] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)


class ComponentApplyRequest(BaseModel):
    run_id: str
    task_id: str
    label: str = Field(default="agg1")
    component: ComponentCreateRequest


class ExecutorConfigRequest(BaseModel):
    executor_id: str
    model: str | None = None
    api_key: str | None = None
    thinking_budget: int | None = None
    cli_path: str | None = None
    endpoint: str | None = None


class DemoLaunchRequest(BaseModel):
    output: str = Field(default="runs/demo", description="Output directory 输出目录")
    k: int = Field(default=2, ge=1, description="Budget scale k 递归预算")
    mode: str = Field(default="both", description="parallel | sequential | both 递归模式")
    executor: str = Field(default="claude", description="claude | oc | cx")
    claude_model: str | None = Field(default=None)
    claude_thinking_budget: int | None = Field(default=None)
    claude_api_key: str | None = Field(default=None)


class SweepLaunchRequest(BaseModel):
    bench: str = Field(default="jb", description="jb | wb | lab 基准")
    substrate: str = Field(default="oc", description="oc | cx | claude 执行基座")
    k: int = Field(default=1, ge=1)
    modes: str = Field(default="both")
    split: str = Field(default="all")
    workers: int = Field(default=1, ge=1)
    max_tasks: int | None = Field(default=None)
    seed: int | None = Field(default=None)
    dry_run: bool = Field(default=False)
    claude_model: str | None = Field(default=None)
    claude_thinking_budget: int | None = Field(default=None)
    claude_api_key: str | None = Field(default=None)


def create_app(workspace_root: Path, runs_root: Path | None = None) -> FastAPI:
    if runs_root is None:
        runs_root = workspace_root / "runs"

    app = FastAPI(
        title="Harness² Web Console 可视化控制台",
        description="Interactive visual control panel and recursive pipeline explorer for Harness² | 交互式可视化控制台与 Propose-Probe-Compose 递归流水线探索器",
        version="0.1.0",
    )

    # CORS support for Vite dev server (e.g. localhost:5173)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    runner = ExecutionManager(workspace_root)

    # -----------------------------
    # Execution & System APIs
    # -----------------------------
    @app.get("/api/status")
    async def get_system_status():
        return {
            "status": runner.get_status(),
            "workspace_root": str(workspace_root),
            "runs_root": str(runs_root),
        }

    @app.get("/api/preflight")
    async def get_preflight():
        return scanner.get_preflight_status(workspace_root)

    @app.get("/api/logs")
    async def get_logs(limit: int = 500):
        return {"logs": runner.get_logs(limit)}

    @app.get("/api/events")
    async def event_stream():
        async def _generator():
            async for item in runner.subscribe():
                event_name = item.get("event", "message")
                data_str = json.dumps(item.get("data", {}))
                yield f"event: {event_name}\ndata: {data_str}\n\n"

        return StreamingResponse(
            _generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    @app.post("/api/execute/demo")
    async def launch_demo(req: DemoLaunchRequest):
        args = [
            "-m",
            "harness2.cli.demo",
            "--output",
            req.output,
            "--k",
            str(req.k),
            "--mode",
            req.mode,
        ]
        extra_env: dict[str, str] = {}
        if req.claude_api_key:
            extra_env["ANTHROPIC_API_KEY"] = req.claude_api_key
        if req.claude_model:
            extra_env["HARNESS2_CLAUDE_MODEL"] = req.claude_model
        if req.claude_thinking_budget is not None:
            extra_env["HARNESS2_CLAUDE_THINKING_BUDGET"] = str(req.claude_thinking_budget)
        if req.executor:
            extra_env["HARNESS2_DEFAULT_EXECUTOR"] = req.executor

        job = await runner.start_job("demo", args, extra_env=extra_env)
        return {"status": "started", "job": job}

    @app.post("/api/execute/sweep")
    async def launch_sweep(req: SweepLaunchRequest):
        substrate_val = req.substrate
        args = [
            "-m",
            "harness2.cli.run_sweep",
            "--bench",
            req.bench,
            "--substrate",
            substrate_val,
            "--k",
            str(req.k),
            "--modes",
            req.modes,
            "--split",
            req.split,
            "--workers",
            str(req.workers),
        ]
        if req.max_tasks is not None:
            args.extend(["--max-tasks", str(req.max_tasks)])
        if req.seed is not None:
            args.extend(["--seed", str(req.seed)])
        if req.dry_run:
            args.append("--dry-run")

        extra_env: dict[str, str] = {}
        if req.claude_api_key:
            extra_env["ANTHROPIC_API_KEY"] = req.claude_api_key
        if req.claude_model:
            extra_env["HARNESS2_CLAUDE_MODEL"] = req.claude_model
        if req.claude_thinking_budget is not None:
            extra_env["HARNESS2_CLAUDE_THINKING_BUDGET"] = str(req.claude_thinking_budget)
        if req.substrate == "claude":
            extra_env["HARNESS2_DEFAULT_EXECUTOR"] = "claude"

        job = await runner.start_job("sweep", args, extra_env=extra_env)
        return {"status": "started", "job": job}

    @app.post("/api/execute/stop")
    async def stop_execution():
        res = await runner.stop_job()
        return res

    # -----------------------------
    # Harness Component Studio APIs (c1..c8)
    # -----------------------------
    @app.get("/api/components")
    async def list_components():
        components = scanner.list_custom_components(workspace_root)
        return {"components": components}

    @app.get("/api/components/templates")
    async def get_component_templates():
        return {"templates": scanner.PRESET_COMPONENT_TEMPLATES}

    @app.post("/api/components")
    async def create_or_update_component(req: ComponentCreateRequest):
        try:
            saved = scanner.save_custom_component(workspace_root, req.model_dump())
            return {"status": "success", "component": saved}
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    @app.delete("/api/components/{comp_id}")
    async def delete_component(comp_id: str):
        ok = scanner.delete_custom_component(workspace_root, comp_id)
        if not ok:
            raise HTTPException(status_code=404, detail=f"Component {comp_id} not found")
        return {"status": "deleted", "id": comp_id}

    @app.post("/api/components/apply")
    async def apply_component(req: ComponentApplyRequest):
        try:
            result = scanner.apply_component_to_run(
                runs_root=runs_root,
                run_id=req.run_id,
                task_id=req.task_id,
                label=req.label,
                comp_data=req.component.model_dump(),
            )
            return result
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Failed to apply component: {exc}")

    # -----------------------------
    # Executor & Engine Management APIs (Claude, OpenCode, Codex, Vertex)
    # -----------------------------
    @app.get("/api/executors")
    async def get_executors():
        return scanner.get_executors_status(workspace_root)

    @app.post("/api/executors/config")
    async def update_executor_config(req: ExecutorConfigRequest):
        if req.api_key:
            if req.executor_id == "claude":
                os.environ["ANTHROPIC_API_KEY"] = req.api_key
            elif req.executor_id == "cx":
                os.environ["HARNESS2_CODEX_API_KEY"] = req.api_key
            elif req.executor_id == "oc":
                os.environ["OPENAI_API_KEY"] = req.api_key
        if req.model:
            if req.executor_id == "claude":
                os.environ["HARNESS2_CLAUDE_MODEL"] = req.model
            elif req.executor_id == "oc":
                os.environ["HARNESS2_SOLVER_MODEL"] = req.model
            elif req.executor_id == "cx":
                os.environ["HARNESS2_CODEX_MODEL"] = req.model
        if req.thinking_budget is not None and req.executor_id == "claude":
            os.environ["HARNESS2_CLAUDE_THINKING_BUDGET"] = str(req.thinking_budget)

        return {"status": "updated", "executors": scanner.get_executors_status(workspace_root)}

    # -----------------------------
    # Runs, Tasks & Artifacts APIs
    # -----------------------------
    @app.get("/api/runs")
    async def list_all_runs():
        runs = scanner.list_runs(runs_root)
        return {"runs": runs}

    @app.get("/api/runs/{run_id}/tasks")
    async def get_run_tasks(run_id: str):
        tasks = scanner.get_tasks_for_run(runs_root, run_id)
        return {"run_id": run_id, "tasks": tasks}

    @app.get("/api/runs/{run_id}/tasks/{task_id}")
    async def get_task_detail(run_id: str, task_id: str):
        detail = scanner.get_task_detail(runs_root, run_id, task_id)
        if detail is None:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found in {run_id}")
        return detail

    @app.get("/api/runs/{run_id}/tasks/{task_id}/harnesses/{label}")
    async def get_task_harness(run_id: str, task_id: str, label: str):
        components = scanner.get_harness_components(runs_root, run_id, task_id, label)
        if not components:
            raise HTTPException(
                status_code=404, detail=f"Harness label {label} not found for {task_id}"
            )
        return components

    @app.get("/api/runs/{run_id}/tasks/{task_id}/diff")
    async def get_diff(
        run_id: str,
        task_id: str,
        base: str = Query("base", description="Base harness label 基准套件标签"),
        compare: str = Query("agg1", description="Compare harness label 对比套件标签"),
    ):
        diff_res = scanner.get_harness_diff(runs_root, run_id, task_id, base, compare)
        return diff_res

    @app.get("/api/runs/{run_id}/library")
    async def get_library(run_id: str):
        entries = scanner.get_library_index(runs_root, run_id)
        return {"run_id": run_id, "entries": entries}

    @app.get("/api/runs/{run_id}/benchmark")
    async def get_benchmark(run_id: str):
        report = scanner.get_benchmark_report(runs_root, run_id)
        return report

    # -----------------------------
    # Static SPA serving
    # -----------------------------
    static_dir = Path(__file__).parent / "static"
    if static_dir.is_dir() and (static_dir / "index.html").is_file():
        app.mount("/assets", StaticFiles(directory=str(static_dir / "assets")), name="assets")

        @app.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            if full_path.startswith("assets/"):
                target = static_dir / full_path
                if target.is_file():
                    return FileResponse(target)
                raise HTTPException(status_code=404, detail="Asset not found")

            target = static_dir / full_path
            if target.is_file() and full_path != "":
                return FileResponse(target)

            return FileResponse(
                static_dir / "index.html",
                headers={
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0",
                },
            )

    return app
