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
    assert "--model" in argv
    assert "claude-3-7-sonnet-20250219" in argv
    assert "--effort" in argv
    assert "high" in argv
    assert "--add-dir" in argv
    assert str(ws) in argv


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
