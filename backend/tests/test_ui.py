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

"""Unit and API integration tests for Harness² Visual Web Console."""

from __future__ import annotations

import unittest
from pathlib import Path

from starlette.testclient import TestClient

from sec_agent_harness2 import config as C
from sec_agent_harness2.ui import scanner
from sec_agent_harness2.ui.server import create_app


class UITests(unittest.TestCase):
    def setUp(self):
        self.workspace_root = C.ROOT
        self.runs_root = self.workspace_root / "runs"
        self.app = create_app(workspace_root=self.workspace_root, runs_root=self.runs_root)
        self.client = TestClient(self.app)

    def test_list_runs(self):
        runs = scanner.list_runs(self.runs_root)
        self.assertIsInstance(runs, list)
        self.assertTrue(any(r["id"] == "demo" for r in runs))

    def test_get_tasks_for_run(self):
        tasks = scanner.get_tasks_for_run(self.runs_root, "demo")
        self.assertTrue(len(tasks) >= 2)
        task_ids = {t["task_id"] for t in tasks}
        self.assertIn("ledger-1", task_ids)
        self.assertIn("ledger-2", task_ids)

    def test_get_task_detail(self):
        detail = scanner.get_task_detail(self.runs_root, "demo", "ledger-1")
        self.assertIsNotNone(detail)
        self.assertEqual(detail["task_id"], "ledger-1")
        self.assertEqual(detail["domain"], "accounting")
        self.assertIn("pipeline_graph", detail)
        nodes = detail["pipeline_graph"]["nodes"]
        self.assertTrue(len(nodes) >= 4)
        node_ids = {n["id"] for n in nodes}
        self.assertIn("base1", node_ids)
        self.assertIn("agg1", node_ids)

    def test_harness_diff(self):
        diff = scanner.get_harness_diff(self.runs_root, "demo", "ledger-1", "base", "agg1")
        self.assertEqual(diff["task_id"], "ledger-1")
        self.assertEqual(diff["base_label"], "base")
        self.assertEqual(diff["compare_label"], "agg1")
        self.assertEqual(diff["total_files_changed"], 1)
        self.assertEqual(diff["files"][0]["path"], "scripts/summarize.py")
        self.assertIn("+total = sum((amount for amount in amounts), Decimal(0))", diff["files"][0]["diff_text"])

    def test_get_library_index(self):
        entries = scanner.get_library_index(self.runs_root, "demo")
        self.assertIsInstance(entries, list)
        self.assertTrue(len(entries) >= 1)
        self.assertTrue(any("credits" in e["cue"] for e in entries))

    def test_api_status(self):
        res = self.client.get("/api/status")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"]["status"], "idle")
        self.assertIn("workspace_root", data)

    def test_api_runs(self):
        res = self.client.get("/api/runs")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("runs", data)
        self.assertTrue(any(r["id"] == "demo" for r in data["runs"]))

    def test_api_tasks(self):
        res = self.client.get("/api/runs/demo/tasks")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("tasks", data)
        self.assertTrue(len(data["tasks"]) >= 2)

    def test_api_task_detail(self):
        res = self.client.get("/api/runs/demo/tasks/ledger-1")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["task_id"], "ledger-1")
        self.assertIn("pipeline_graph", data)

    def test_api_diff(self):
        res = self.client.get("/api/runs/demo/tasks/ledger-1/diff?base=base&compare=agg1")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["total_files_changed"], 1)
        self.assertIn("intent_summary", data)
        self.assertIn("components_summary", data)
        self.assertEqual(data["components_summary"]["scripts"]["status"], "modified")

    def test_api_preflight(self):
        res = self.client.get("/api/preflight")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("status", data)
        self.assertIn("docker", data)
        self.assertIn("benchmarks", data)
        self.assertTrue(data["benchmarks"]["demo"]["available"])

    def test_api_library(self):
        res = self.client.get("/api/runs/demo/library")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("entries", data)
        self.assertTrue(len(data["entries"]) >= 1)

    def test_static_spa_serving(self):
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("Harness² Console", res.text)

    def test_api_components_and_templates(self):
        res = self.client.get("/api/components/templates")
        self.assertEqual(res.status_code, 200)
        templates = res.json()["templates"]
        self.assertTrue(len(templates) >= 9)
        self.assertTrue(any(t["category"] == "c1" for t in templates))
        self.assertTrue(any(t["category"] == "c6" for t in templates))
        self.assertTrue(any(t["category"] == "c9" and t["path"] == "mcp/servers.json" for t in templates))

        res_comps = self.client.get("/api/components")
        self.assertEqual(res_comps.status_code, 200)
        comps = res_comps.json()["components"]
        self.assertTrue(len(comps) >= 9)

    def test_api_component_crud_and_apply(self):
        # Create
        new_comp = {
            "name": "test_security_filter",
            "category": "c2",
            "label": "测试安全过滤器",
            "description": "单元测试生成的安全过滤器组件",
            "content": "# Test Safety Filter Rule\nDeny all delete actions.",
            "tags": ["c2", "Test"],
        }
        res_create = self.client.post("/api/components", json=new_comp)
        self.assertEqual(res_create.status_code, 200)
        created = res_create.json()["component"]
        comp_id = created["id"]
        self.assertEqual(created["name"], "test_security_filter")
        self.assertEqual(created["path"], "guardrails.md")

        # Setup isolated test directory for apply
        test_harness_dir = self.runs_root / "_test_run/ledger-test/harnesses/base"
        test_harness_dir.mkdir(parents=True, exist_ok=True)
        try:
            apply_payload = {
                "run_id": "_test_run",
                "task_id": "ledger-test",
                "label": "base",
                "component": created,
            }
            res_apply = self.client.post("/api/components/apply", json=apply_payload)
            self.assertEqual(res_apply.status_code, 200)
            self.assertEqual(res_apply.json()["status"], "applied")
            applied_file = test_harness_dir / "guardrails.md"
            self.assertTrue(applied_file.is_file())
            self.assertIn("Test Safety Filter Rule", applied_file.read_text(encoding="utf-8"))
        finally:
            import shutil
            shutil.rmtree(self.runs_root / "_test_run", ignore_errors=True)

        # Delete component
        res_del = self.client.delete(f"/api/components/{comp_id}")
        self.assertEqual(res_del.status_code, 200)
        self.assertEqual(res_del.json()["status"], "deleted")

    def test_api_executors(self):
        import os
        import tempfile

        res = self.client.get("/api/executors")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("executors", data)
        self.assertIn("unified_config", data)
        self.assertIn("bridge", data)
        executors = data["executors"]
        claude_exec = next((e for e in executors if e["id"] == "claude"), None)
        self.assertIsNotNone(claude_exec)
        self.assertIn("claude-sonnet-4-6", claude_exec["supported_models"])
        self.assertTrue(len(claude_exec["capabilities"]) >= 3)

        # Test isolated config persistence in a temporary workspace so real .env is untouched
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_root = Path(tmpdir)
            (tmp_root / ".env.example").write_text(
                "# Example\n# SEC_AGENT_HARNESS2_API_BASE_URL=\n# SEC_AGENT_HARNESS2_CLAUDE_MODEL=\n# SEC_AGENT_HARNESS2_CLAUDE_EFFORT=\n",
                encoding="utf-8",
            )
            tmp_app = create_app(workspace_root=tmp_root, runs_root=self.runs_root)
            tmp_client = TestClient(tmp_app)
            saved_env = dict(os.environ)
            try:
                cfg_payload = {
                    "executor_id": "claude",
                    "model": "claude-sonnet-4-6",
                    "effort": "high",
                    "persist_dotenv": True,
                }
                res_cfg = tmp_client.post("/api/executors/config", json=cfg_payload)
                self.assertEqual(res_cfg.status_code, 200)
                body = res_cfg.json()
                self.assertEqual(body["status"], "updated")
                self.assertIn(".env", body["applied"]["synced_files"])
                env_text = (tmp_root / ".env").read_text(encoding="utf-8")
                self.assertIn("SEC_AGENT_HARNESS2_CLAUDE_MODEL=claude-sonnet-4-6", env_text)
                self.assertIn("SEC_AGENT_HARNESS2_CLAUDE_EFFORT=high", env_text)

                # Test unified config update
                res_uni = tmp_client.post(
                    "/api/executors/config",
                    json={
                        "executor_id": "unified",
                        "base_url": "https://example.invalid/v1",
                        "model": "deepseek-v4.1-flash",
                        "protocol": "openai-chat",
                        "persist_dotenv": True,
                    },
                )
                self.assertEqual(res_uni.status_code, 200)
                self.assertEqual(
                    res_uni.json()["executors"]["unified_config"]["base_url"],
                    "https://example.invalid/v1",
                )
            finally:
                os.environ.clear()
                os.environ.update(saved_env)
                scanner.sync_config_from_env()


if __name__ == "__main__":
    unittest.main()
