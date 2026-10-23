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

"""One API endpoint and key, adapted to each substrate's wire protocol.

The three CLIs do not speak the same protocol, so a single
`HARNESS2_API_BASE_URL` / `HARNESS2_API_KEY` pair is translated per substrate:

    cx      openai-responses   Codex refuses anything but `wire_api = "responses"`
    claude  anthropic          native Messages API; `openai-chat` opts into clawgod's proxy
    oc      openai-chat        OpenAI-compatible provider block in opencode.json

Per-substrate variables win over the shared pair, so an existing deployment that
sets `HARNESS2_CODEX_*` or `ANTHROPIC_*` keeps working unchanged.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass

# Importing config runs load_dotenv(); api must not resolve an endpoint before that,
# or .env values are invisible and the host's ANTHROPIC_* leak through instead.
from . import config  # noqa: F401

PROTOCOLS = ("anthropic", "openai-chat", "openai-responses")

# clawgod selects its translation proxy from provider.json, not from the environment.
CLAW_GOD_PROVIDER = "claude"
OPENCODE_PROVIDER = "harness2"


@dataclass(frozen=True)
class Endpoint:
    """A resolved endpoint: where to send requests, with what key, speaking what."""

    base_url: str
    api_key: str
    protocol: str
    model: str = ""

    def __bool__(self) -> bool:
        return bool(self.base_url)

    @property
    def is_anthropic_native(self) -> bool:
        """True when the key goes to Anthropic itself rather than a compatible proxy."""
        return "anthropic.com" in self.base_url


def _first(*names: str) -> str:
    """The first non-empty environment value among `names`."""
    for name in names:
        value = (os.environ.get(name) or "").strip()
        if value:
            return value
    return ""


def _protocol(substrate_var: str, default: str) -> str:
    value = _first(substrate_var, "HARNESS2_API_PROTOCOL") or default
    if value not in PROTOCOLS:
        raise ValueError(
            f"{substrate_var} is {value!r}; expected one of {', '.join(PROTOCOLS)}"
        )
    return value


def _shared() -> tuple[str, str, str]:
    return (
        _first("HARNESS2_API_BASE_URL"),
        _first("HARNESS2_API_KEY"),
        _first("HARNESS2_API_MODEL"),
    )


def codex() -> Endpoint | None:
    """Codex speaks only the Responses API; there is no chat fallback in 0.144.6."""
    shared_url, shared_key, shared_model = _shared()
    url = _first("HARNESS2_CODEX_BASE_URL") or shared_url
    if not url:
        return None
    return Endpoint(
        base_url=url,
        api_key=_first("HARNESS2_CODEX_API_KEY") or shared_key,
        protocol="openai-responses",
        model=_first("HARNESS2_CODEX_MODEL") or shared_model,
    )


def claude() -> Endpoint | None:
    """Claude Code: native Messages by default, OpenAI chat through clawgod's proxy.

    HARNESS2_* wins over ANTHROPIC_*: when Harness2 itself runs under Claude Code,
    the host session exports ANTHROPIC_BASE_URL pointing at its own proxy, and
    inheriting that would silently send rollouts to the wrong endpoint.
    """
    shared_url, shared_key, shared_model = _shared()
    url = _first("HARNESS2_CLAUDE_BASE_URL") or shared_url or _first("ANTHROPIC_BASE_URL")
    if not url:
        return None
    return Endpoint(
        base_url=url,
        api_key=_first("HARNESS2_CLAUDE_API_KEY")
        or shared_key
        or _first("ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_API_KEY"),
        protocol=_protocol("HARNESS2_CLAUDE_PROTOCOL", "anthropic"),
        model=_first("HARNESS2_CLAUDE_MODEL") or shared_model,
    )


def opencode() -> Endpoint | None:
    """OpenCode: any OpenAI-compatible endpoint via a generated provider block."""
    shared_url, shared_key, shared_model = _shared()
    url = _first("HARNESS2_OPENCODE_BASE_URL") or shared_url
    if not url:
        return None
    return Endpoint(
        base_url=url,
        api_key=_first("HARNESS2_OPENCODE_API_KEY") or shared_key,
        protocol=_protocol("HARNESS2_OPENCODE_PROTOCOL", "openai-chat"),
        model=_first("HARNESS2_SOLVER_MODEL") or shared_model,
    )


def claude_env(endpoint: Endpoint, env: dict[str, str]) -> dict[str, str]:
    """Map an endpoint onto the variables clawgod reads, without clobbering the caller.

    Only the native Anthropic protocol is expressible through the environment alone.
    `openai-chat` needs clawgod's provider.json, which is a single global file under
    the install directory, so concurrent rollouts would overwrite each other; callers
    that want it must use `claude_provider_json` and serialise their runs.
    """
    if endpoint.protocol != "anthropic":
        raise ValueError(
            "the claude substrate reaches a non-Anthropic endpoint only through clawgod's "
            "openai-chat proxy, which is configured by a single global provider.json; "
            "set HARNESS2_CLAUDE_PROTOCOL=anthropic or point HARNESS2_API_BASE_URL at an "
            "Anthropic-compatible endpoint"
        )
    env.setdefault("ANTHROPIC_BASE_URL", endpoint.base_url)
    # clawgod sends ANTHROPIC_API_KEY to Anthropic itself and ANTHROPIC_AUTH_TOKEN to a
    # compatible proxy; sending the wrong one drops the Authorization header.
    if endpoint.is_anthropic_native:
        env.setdefault("ANTHROPIC_API_KEY", endpoint.api_key)
    else:
        env.setdefault("ANTHROPIC_AUTH_TOKEN", endpoint.api_key)
    return env


def opencode_env(endpoint: Endpoint, env: dict[str, str]) -> dict[str, str]:
    """Add the provider block OpenCode needs to reach a shared endpoint.

    OpenCode resolves `harness2/<model>` from configuration, not from the environment,
    so without this the CLI fails with `Model not found` before it ever calls out.
    A caller that already set OPENCODE_CONFIG_CONTENT keeps its own.
    """
    env.setdefault("OPENCODE_CONFIG_CONTENT", opencode_config(endpoint))
    return env


def opencode_config(endpoint: Endpoint) -> str:
    """`OPENCODE_CONFIG_CONTENT` JSON: a provider block merged after every file config."""
    if endpoint.protocol == "anthropic":
        npm = "@ai-sdk/anthropic"
    else:
        npm = "@ai-sdk/openai-compatible"
    model = endpoint.model.split("/", 1)[-1] if endpoint.model else ""
    block: dict = {
        "provider": {
            OPENCODE_PROVIDER: {
                "npm": npm,
                "name": "Harness2 API",
                "options": {
                    "baseURL": endpoint.base_url,
                    "apiKey": endpoint.api_key,
                },
                "models": (
                    {
                        model: {
                            "id": model,
                            "name": model,
                            "tool_call": True,
                            "reasoning": True,
                        }
                    }
                    if model
                    else {}
                ),
            }
        }
    }
    return json.dumps(block)


def claude_provider_json(endpoint: Endpoint) -> str:
    """`provider.json` for clawgod's openai-chat mode.

    clawgod only starts its Messages<->Chat translation proxy when `protocol` says
    `openai-chat`, and it reads that from provider.json rather than the environment,
    so this file is the one place the key has to be written to disk.
    """
    return json.dumps(
        {
            "protocol": "openai-chat",
            "apiKey": endpoint.api_key,
            "baseURL": endpoint.base_url,
            "model": endpoint.model,
            "smallModel": "",
            "effort": "",
            "timeoutMs": 3000000,
        },
        indent=2,
    ) + "\n"


def describe(endpoint: Endpoint | None) -> str:
    """One line for `harness2 check`; never includes the key."""
    if endpoint is None:
        return "(no API endpoint configured)"
    model = endpoint.model or "(model from CLI flag)"
    return f"{endpoint.protocol} -> {endpoint.base_url} model={model}"


__all__ = [
    "PROTOCOLS",
    "Endpoint",
    "claude",
    "claude_env",
    "claude_provider_json",
    "codex",
    "describe",
    "opencode",
    "opencode_config",
    "opencode_env",
]
