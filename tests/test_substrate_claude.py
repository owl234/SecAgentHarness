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

"""Unit tests for ClaudeSubstrate (clawgod distribution)."""

import json
import tempfile
from pathlib import Path
import pytest

from harness2.cli._common import make_adapter, normalize_substrate
from harness2.core import tree as HT
from harness2.core.spec import BenchSpec
from harness2.substrate.base import Substrate
from harness2.substrate.claude import (
    CLAUDE_SURFACE,
    ClaudeSubstrate,
    find_claude_binary,
    parse_items,
    render_events,
)


def test_claude_surface_spec():
    assert CLAUDE_SURFACE.name == "claude"
    assert CLAUDE_SURFACE.always_on == ("CLAUDE.md",)
    assert CLAUDE_SURFACE.always_on_max == 24_000
    assert CLAUDE_SURFACE.skill_dir == ".claude/skills"
    assert CLAUDE_SURFACE.hooks_file == ".claude/settings.json"


def test_substrate_protocol_compliance():
    sub = ClaudeSubstrate()
    assert isinstance(sub, Substrate)
    assert sub.name == "claude"
    assert sub.surface() == CLAUDE_SURFACE


def test_find_claude_binary(monkeypatch, tmp_path):
    fake_bin = tmp_path / "clawgod"
    fake_bin.write_text("#!/bin/sh\necho clawgod\n")
    fake_bin.chmod(0o755)

    monkeypatch.setenv("HARNESS2_CLAWGOD_PATH", str(fake_bin))
    found = find_claude_binary()
    assert found == fake_bin

    monkeypatch.delenv("HARNESS2_CLAWGOD_PATH", raising=False)
    from harness2 import config
    assert find_claude_binary() == config.CLAUDE_BIN


def test_materialise(tmp_path):
    sub = ClaudeSubstrate()
    from harness2.core.spec import ChannelSpec
    dummy_ch = ChannelSpec(kind="claude_cli", model="claude-3-7-sonnet-20250219")
    spec = BenchSpec(
        name="test",
        runs_root=tmp_path / "runs",
        install_mode="claude_root",
        prompts=None,
        channels={"proposer": dummy_ch, "selector": dummy_ch},
        domain_word="test",
        leak_globs=(),
        allow_subagents=True,
    )

    tree_dir = tmp_path / "harness"
    tree_dir.mkdir()
    (tree_dir / "CLAUDE.md").write_text("# Claude Harness Rules\n", encoding="utf-8")
    scripts_dir = tree_dir / "scripts"
    scripts_dir.mkdir()
    (scripts_dir / "helper.py").write_text("print('hello')\n", encoding="utf-8")

    install = sub.materialise(tree_dir, spec, {"file:.claude/settings.json": '{"hooks": {}}'})
    try:
        assert install.staging_dir.is_dir()
        assert (install.staging_dir / "CLAUDE.md").read_text(encoding="utf-8") == "# Claude Harness Rules\n"
        assert (install.staging_dir / "scripts" / "helper.py").is_file()
        assert (install.staging_dir / ".claude" / "settings.json").is_file()
        assert install.extras["install_mode"] == "claude_root"
    finally:
        import shutil
        shutil.rmtree(install.staging_dir, ignore_errors=True)


def test_exec_argv():
    sub = ClaudeSubstrate()
    ws = Path("/tmp/mock_ws")
    argv = sub.exec_argv("Do task 1", ws, "claude-3-7-sonnet-20250219", effort="high")
    assert "-p" in argv
    assert "Do task 1" in argv
    assert "--output-format=stream-json" in argv
    assert "--dangerously-skip-permissions" in argv
    assert "--include-hook-events" in argv
    assert "--forward-subagent-text" in argv
    assert "--model" in argv
    assert "claude-3-7-sonnet-20250219" in argv
    assert "--effort" in argv
    assert "high" in argv
    assert "--add-dir" in argv
    assert str(ws) in argv
    # no staged tree -> no --agents flag
    assert "--agents" not in argv


def test_exec_argv_agents_wiring(tmp_path):
    import json as _json

    from harness2.substrate.claude import agents_json

    staged = tmp_path / "staged"
    (staged / "sub_agents" / "researcher").mkdir(parents=True)
    (staged / "sub_agents" / "researcher" / "AGENT.md").write_text(
        "---\ndescription: Deep research agent\n---\nYou research things.\n",
        encoding="utf-8",
    )
    payload = agents_json(staged)
    assert payload
    assert _json.loads(payload)["researcher"]["description"] == "Deep research agent"
    # empty tree -> empty string, no flag emitted
    assert agents_json(tmp_path / "nonexistent") == ""

    sub = ClaudeSubstrate()
    argv = sub.exec_argv("task", Path("/tmp/ws"), "m", harness_dir=staged)
    assert "--agents" in argv

    argv2 = sub.exec_argv("task", Path("/tmp/ws"), "m")
    assert "--agents" not in argv2


def test_render_forwarded_subagent(tmp_path):
    stream_file = tmp_path / "sub.jsonl"
    events = [
        {
            "type": "assistant",
            "parent_tool_use_id": "call_9",
            "message": {
                "role": "assistant",
                "content": [{"type": "text", "text": "subagent reporting"}],
            },
        },
    ]
    with open(stream_file, "w", encoding="utf-8") as f:
        for ev in events:
            f.write(json.dumps(ev) + "\n")
    rendered = render_events(stream_file, obs_trunc=1000, max_chars=10_000)
    assert "[SUBAGENT ASSISTANT] subagent reporting" in rendered


def test_trajectory_rendering(tmp_path):
    stream_file = tmp_path / "claude_stream.jsonl"
    events = [
        {"type": "system", "subtype": "init", "model": "claude-3-7-sonnet"},
        {
            "type": "assistant",
            "message": {
                "role": "assistant",
                "content": [
                    {"type": "thinking", "thinking": "Let's inspect the files first."},
                    {
                        "type": "tool_use",
                        "id": "call_1",
                        "name": "Bash",
                        "input": {"command": "ls -la"},
                    },
                ],
            },
        },
        {
            "type": "user",
            "message": {
                "role": "user",
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": "call_1",
                        "content": "file1.txt\nfile2.txt",
                        "is_error": False,
                    }
                ],
            },
        },
        {
            "type": "assistant",
            "message": {
                "role": "assistant",
                "content": [{"type": "text", "text": "I see file1 and file2."}],
            },
        },
        {
            "type": "result",
            "subtype": "success",
            "result": "Task finished successfully.",
            "usage": {"input_tokens": 500, "output_tokens": 120, "cache_read_input_tokens": 50},
        },
    ]

    with open(stream_file, "w", encoding="utf-8") as f:
        for ev in events:
            f.write(json.dumps(ev) + "\n")

    rendered = render_events(stream_file, obs_trunc=1000, max_chars=10_000)
    assert "[THINKING] Let's inspect the files first." in rendered
    assert "[ACTION] Bash: ls -la" in rendered
    assert "[OBSERVATION] file1.txt\nfile2.txt" in rendered
    assert "[ASSISTANT] I see file1 and file2." in rendered
    assert "[HARNESS] turn completed | tokens in=500 out=120 cache_read=50" in rendered
    assert "[DELIVERABLE] Task finished successfully." in rendered


def test_benchmark_adapters_claude_support():
    assert normalize_substrate("claude") == "claude"
    assert normalize_substrate("cl") == "claude"
    assert normalize_substrate("clawgod") == "claude"

    # JobBench
    jb = make_adapter("jb", None, "claude")
    assert jb.substrate.name == "claude"
    assert jb.spec.install_mode == "claude_root"

    # WorkBuddy
    wb = make_adapter("wb", "office", "claude")
    assert wb.substrate.name == "claude"
    assert wb.spec.install_mode == "claude_root"

    # Lab
    lab = make_adapter("lab", None, "claude")
    assert lab.substrate.name == "claude"
    assert lab.spec.install_mode == "claude_root"


def test_lab_claude_run_dir_preserves_nested_hierarchy(tmp_path):
    import importlib.util
    from harness2 import config

    runner_py = config.THIRD_PARTY / "lab_runner" / "adapt_runs_claude" / "run_claude_lab.py"
    spec = importlib.util.spec_from_file_location("_test_run_claude_lab", runner_py)
    mod = importlib.util.module_from_spec(spec)
    # Stub external.tts_lab before executing module
    import sys
    import types
    fake_ext = types.ModuleType("external")
    fake_tts = types.ModuleType("external.tts_lab")
    fake_tts.config = types.SimpleNamespace()
    sys.modules.setdefault("external", fake_ext)
    sys.modules.setdefault("external.tts_lab", fake_tts)
    spec.loader.exec_module(mod)

    run_id = "lab-claude-agg1/antitrust-competition__task1/b1"
    resolved = mod.run_dir_for(run_id, results_root=tmp_path)
    assert resolved == (tmp_path / run_id).resolve()

    with pytest.raises(SystemExit):
        mod.run_dir_for("../escape", results_root=tmp_path)


def test_workbuddy_claude_job_yaml_mounts_and_env(tmp_path, monkeypatch):
    from harness2.benchmarks.workbuddy import SUBSETS, _job_yaml

    monkeypatch.setenv("ANTHROPIC_BASE_URL", "https://example.anthropic.proxy/v1")
    monkeypatch.setenv("ANTHROPIC_AUTH_TOKEN", "test-token")
    ws = tmp_path / "ws"
    ws.mkdir()
    yml = _job_yaml(
        SUBSETS["code"],
        "claude",
        "wb-code-claude-agg1",
        ["task-1"],
        ws,
        1,
        tmp_path / "jobs",
    )
    assert "target: /opt/claude" in yml
    assert "host.docker.internal" in yml
    assert "WB_HARNESS_WS" in yml
    assert "ANTHROPIC_BASE_URL" in yml


def test_claude_prompt_surface_and_subagent_rules(tmp_path):
    from harness2.core import context, prompts, tree as HT
    from harness2.core.spec import BenchPrompts
    from harness2.substrate.claude import CLAUDE_SURFACE

    bp = BenchPrompts(
        work="Produce a legal analysis memo.",
        deliverable_word="deliverable",
        domain_word="practice area",
    )
    for pack in ("adapt", "tts"):
        bp_pack = BenchPrompts(
            work=bp.work,
            deliverable_word=bp.deliverable_word,
            domain_word=bp.domain_word,
            prompt_pack=pack,
        )
        inv_prompt = prompts.propose(bp_pack, "INV", CLAUDE_SURFACE, k=2, index=1)
        dom_prompt = prompts.propose(bp_pack, "DOM", CLAUDE_SURFACE, k=2, index=1)
        agg_prompt = prompts.aggregate(bp_pack, CLAUDE_SURFACE, k=2, index=1)
        seq_prompt = prompts.compose_round(bp_pack, CLAUDE_SURFACE, t=1, k=2)
        for text in (inv_prompt, dom_prompt, agg_prompt, seq_prompt):
            assert "CLAUDE.md" in text
            assert ".claude/skills/" in text
            assert ".claude/settings.json" in text

    # JobBench and WorkBuddy enable subagents on oc & claude, disable on cx; LAB disables on all.
    assert make_adapter("jb", None, "claude").spec.allow_subagents is True
    assert make_adapter("jb", None, "oc").spec.allow_subagents is True
    assert make_adapter("jb", None, "cx").spec.allow_subagents is False
    assert make_adapter("wb", "office", "claude").spec.allow_subagents is True
    assert make_adapter("wb", "office", "cx").spec.allow_subagents is False
    assert make_adapter("lab", None, "claude").spec.allow_subagents is False

    # When allow_subagents=False, write_tree and _copy_tree omit sub_agents/README.md stub.
    h_no_sub = HT.write_tree(
        CLAUDE_SURFACE,
        {"CLAUDE.md": "# Base"},
        tmp_path / "h_no_sub",
        stubs=True,
        allow_subagents=False,
    )
    assert not (h_no_sub / "sub_agents" / "README.md").exists()
    assert (h_no_sub / "scripts" / "README.md").exists()

    h_with_sub = HT.write_tree(
        CLAUDE_SURFACE,
        {"CLAUDE.md": "# Base"},
        tmp_path / "h_with_sub",
        stubs=True,
        allow_subagents=True,
    )
    assert (h_with_sub / "sub_agents" / "README.md").exists()

    copied = tmp_path / "copied_no_sub"
    context._copy_tree(h_with_sub, copied, allow_subagents=False)
    assert not (copied / "sub_agents" / "README.md").exists()


def test_jobbench_claude_runner_prompt_parity():
    from harness2 import config

    cx_runner = (
        config.THIRD_PARTY / "jb_runner" / "run_benchmark_codex_cli_adapt.sh"
    ).read_text(encoding="utf-8")
    claude_runner = (
        config.THIRD_PARTY / "jb_runner" / "run_benchmark_claude_cli_adapt.sh"
    ).read_text(encoding="utf-8")
    for required_fragment in (
        "=== TASK FOLDER ===",
        "=== INSTRUCTIONS ===",
        "1. Read the TASK_INSTRUCTIONS.txt file in the task folder above",
        "4. Only save the final deliverables to the output directory specified below. Do not save any intermediate or temporary files.",
        "If a file cannot be read directly (e.g., .xlsx, .docx, .db, .pptx), use appropriate tools, MCP servers, or code to extract and process its contents.",
    ):
        assert required_fragment in cx_runner
        assert required_fragment in claude_runner



