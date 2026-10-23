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

"""Unit tests for the shared API endpoint layer (harness2/api.py)."""

import json

import pytest

from harness2 import api

_ALL = (
    "HARNESS2_API_BASE_URL",
    "HARNESS2_API_KEY",
    "HARNESS2_API_MODEL",
    "HARNESS2_API_PROTOCOL",
    "HARNESS2_CODEX_BASE_URL",
    "HARNESS2_CODEX_API_KEY",
    "HARNESS2_CODEX_MODEL",
    "HARNESS2_CLAUDE_BASE_URL",
    "HARNESS2_CLAUDE_API_KEY",
    "HARNESS2_CLAUDE_PROTOCOL",
    "HARNESS2_CLAUDE_MODEL",
    "HARNESS2_OPENCODE_BASE_URL",
    "HARNESS2_OPENCODE_API_KEY",
    "HARNESS2_OPENCODE_PROTOCOL",
    "HARNESS2_SOLVER_MODEL",
    "HARNESS2_CODEX_MODEL",
    "ANTHROPIC_BASE_URL",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_AUTH_TOKEN",
)


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    for name in _ALL:
        monkeypatch.delenv(name, raising=False)


def test_no_endpoint_configured():
    assert api.codex() is None
    assert api.claude() is None
    assert api.opencode() is None


def test_shared_endpoint_reaches_every_substrate(monkeypatch):
    monkeypatch.setenv("HARNESS2_API_BASE_URL", "https://shared.example.com/v1")
    monkeypatch.setenv("HARNESS2_API_KEY", "shared-key")
    monkeypatch.setenv("HARNESS2_API_MODEL", "shared-model")

    for resolve, protocol in (
        (api.codex, "openai-responses"),
        (api.claude, "anthropic"),
        (api.opencode, "openai-chat"),
    ):
        endpoint = resolve()
        assert endpoint.base_url == "https://shared.example.com/v1"
        assert endpoint.api_key == "shared-key"
        assert endpoint.protocol == protocol


def test_codex_only_speaks_responses(monkeypatch):
    monkeypatch.setenv("HARNESS2_API_BASE_URL", "https://shared.example.com/v1")
    monkeypatch.setenv("HARNESS2_API_PROTOCOL", "openai-chat")
    assert api.codex().protocol == "openai-responses"


def test_per_substrate_values_win(monkeypatch):
    """A per-substrate variable beats the shared pair, but HARNESS2_* beats ANTHROPIC_*.

    The ANTHROPIC_* fallback exists for hosts that export it themselves (Claude Code
    does); it must never outrank an endpoint the user configured for Harness2.
    """
    monkeypatch.setenv("HARNESS2_API_BASE_URL", "https://shared.example.com/v1")
    monkeypatch.setenv("HARNESS2_API_KEY", "shared-key")
    monkeypatch.setenv("HARNESS2_CODEX_BASE_URL", "https://codex.example.com/v1")
    monkeypatch.setenv("HARNESS2_CODEX_API_KEY", "codex-key")
    monkeypatch.setenv("HARNESS2_CLAUDE_BASE_URL", "https://claude.example.com")
    monkeypatch.setenv("HARNESS2_CLAUDE_API_KEY", "claude-key")
    monkeypatch.setenv("ANTHROPIC_BASE_URL", "https://host-proxy.example.com")
    monkeypatch.setenv("ANTHROPIC_AUTH_TOKEN", "host-token")

    assert api.codex().base_url == "https://codex.example.com/v1"
    assert api.codex().api_key == "codex-key"
    assert api.claude().base_url == "https://claude.example.com"
    assert api.claude().api_key == "claude-key"


def test_anthropic_env_is_only_a_fallback(monkeypatch):
    """With nothing HARNESS2-specific set, the host's ANTHROPIC_* is honoured."""
    monkeypatch.setenv("ANTHROPIC_BASE_URL", "https://host-proxy.example.com")
    monkeypatch.setenv("ANTHROPIC_AUTH_TOKEN", "host-token")

    assert api.claude().base_url == "https://host-proxy.example.com"
    assert api.claude().api_key == "host-token"


def test_claude_native_uses_api_key(monkeypatch):
    monkeypatch.setenv("HARNESS2_API_BASE_URL", "https://api.anthropic.com")
    monkeypatch.setenv("HARNESS2_API_KEY", "sk-ant-x")
    env = api.claude_env(api.claude(), {})
    assert env["ANTHROPIC_API_KEY"] == "sk-ant-x"
    assert "ANTHROPIC_AUTH_TOKEN" not in env


def test_claude_proxy_uses_auth_token(monkeypatch):
    """A non-Anthropic host must get AUTH_TOKEN; clawgod drops the key otherwise."""
    monkeypatch.setenv("HARNESS2_API_BASE_URL", "https://proxy.example.com")
    monkeypatch.setenv("HARNESS2_API_KEY", "proxy-key")
    env = api.claude_env(api.claude(), {})
    assert env["ANTHROPIC_AUTH_TOKEN"] == "proxy-key"
    assert "ANTHROPIC_API_KEY" not in env


def test_claude_does_not_clobber_existing_values(monkeypatch):
    monkeypatch.setenv("HARNESS2_API_BASE_URL", "https://proxy.example.com")
    monkeypatch.setenv("HARNESS2_API_KEY", "proxy-key")
    env = api.claude_env(api.claude(), {"ANTHROPIC_AUTH_TOKEN": "caller-token"})
    assert env["ANTHROPIC_AUTH_TOKEN"] == "caller-token"


def test_claude_openai_chat_is_refused(monkeypatch):
    """clawgod's chat mode needs a global provider.json, so it cannot be per-run."""
    monkeypatch.setenv("HARNESS2_API_BASE_URL", "https://proxy.example.com")
    monkeypatch.setenv("HARNESS2_API_KEY", "proxy-key")
    monkeypatch.setenv("HARNESS2_CLAUDE_PROTOCOL", "openai-chat")
    with pytest.raises(ValueError, match="provider.json"):
        api.claude_env(api.claude(), {})


def test_unknown_protocol_is_rejected(monkeypatch):
    monkeypatch.setenv("HARNESS2_API_BASE_URL", "https://proxy.example.com")
    monkeypatch.setenv("HARNESS2_OPENCODE_PROTOCOL", "graphql")
    with pytest.raises(ValueError, match="expected one of"):
        api.opencode()


def test_opencode_config_shape(monkeypatch):
    monkeypatch.setenv("HARNESS2_API_BASE_URL", "https://shared.example.com/v1")
    monkeypatch.setenv("HARNESS2_API_KEY", "k")
    monkeypatch.setenv("HARNESS2_API_MODEL", "some-model")

    block = json.loads(api.opencode_config(api.opencode()))
    provider = block["provider"]["harness2"]
    assert provider["npm"] == "@ai-sdk/openai-compatible"
    assert provider["options"]["baseURL"] == "https://shared.example.com/v1"
    assert provider["options"]["apiKey"] == "k"
    assert "some-model" in provider["models"]


def test_opencode_config_anthropic_uses_native_sdk(monkeypatch):
    monkeypatch.setenv("HARNESS2_API_BASE_URL", "https://proxy.example.com")
    monkeypatch.setenv("HARNESS2_API_KEY", "k")
    monkeypatch.setenv("HARNESS2_OPENCODE_PROTOCOL", "anthropic")

    block = json.loads(api.opencode_config(api.opencode()))
    assert block["provider"]["harness2"]["npm"] == "@ai-sdk/anthropic"


def test_describe_never_leaks_the_key(monkeypatch):
    monkeypatch.setenv("HARNESS2_API_BASE_URL", "https://shared.example.com/v1")
    monkeypatch.setenv("HARNESS2_API_KEY", "super-secret-value")
    assert "super-secret-value" not in api.describe(api.opencode())


def test_opencode_env_adds_the_provider_block(monkeypatch):
    """Without this OpenCode fails with `Model not found: harness2/<model>`."""
    monkeypatch.setenv("HARNESS2_API_BASE_URL", "https://shared.example.com/v1")
    monkeypatch.setenv("HARNESS2_API_KEY", "k")
    monkeypatch.setenv("HARNESS2_API_MODEL", "m")

    env = api.opencode_env(api.opencode(), {})
    block = json.loads(env["OPENCODE_CONFIG_CONTENT"])
    assert block["provider"]["harness2"]["options"]["baseURL"] == "https://shared.example.com/v1"


def test_opencode_env_keeps_a_callers_config(monkeypatch):
    monkeypatch.setenv("HARNESS2_API_BASE_URL", "https://shared.example.com/v1")
    monkeypatch.setenv("HARNESS2_API_KEY", "k")
    env = api.opencode_env(api.opencode(), {"OPENCODE_CONFIG_CONTENT": '{"mine":1}'})
    assert env["OPENCODE_CONFIG_CONTENT"] == '{"mine":1}'
