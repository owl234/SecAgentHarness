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

"""Serve the Responses API that Codex requires on top of a Chat Completions endpoint.

Codex 0.144.6 refuses `wire_api = "chat"`, and an OpenAI-compatible endpoint
usually has no `/v1/responses`. This module translates in both directions:

    Codex --(Responses)--> here --(Chat Completions)--> upstream

The translation is deliberately narrow: text, function calls and function
outputs, which is all Codex emits. Anything else is rejected loudly rather than
silently dropped, because a dropped tool call looks like a model failure.
"""

from __future__ import annotations

import json
import time
import uuid
from typing import Any

_ITEM_TYPES = ("message", "function_call", "function_call_output", "reasoning")


class TranslationError(ValueError):
    """A request or upstream reply carried a shape this bridge cannot map."""


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:24]}"


def _text_of(content: Any) -> str:
    """Flatten a Responses content list (or a plain string) into text."""
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        raise TranslationError(f"content must be a string or a list, got {type(content).__name__}")
    parts: list[str] = []
    for block in content:
        if not isinstance(block, dict):
            raise TranslationError(f"content block must be an object, got {type(block).__name__}")
        btype = block.get("type")
        if btype in ("input_text", "output_text", "text"):
            parts.append(block.get("text") or "")
        elif btype in ("input_image", "image_url"):
            # Chat Completions accepts images as image_url parts; keep the shape.
            url = block.get("image_url") or block.get("url")
            if not url:
                raise TranslationError("image block carries no url")
            parts.append({"type": "image_url", "image_url": {"url": url}})  # type: ignore[arg-type]
        elif btype == "refusal":
            parts.append(block.get("refusal") or "")
        else:
            raise TranslationError(f"unsupported content block type {btype!r}")
    if parts and all(isinstance(p, str) for p in parts):
        return "\n".join(parts)  # type: ignore[arg-type]
    return parts  # type: ignore[return-value]


def _chat_tools(tools: Any) -> list[dict]:
    """Responses tool defs -> Chat tool defs.

    Codex sends three shapes: flat `function` tools, a `namespace` wrapper holding
    a group of functions (flattened here, since Chat has no namespace concept), and
    built-in tools such as `web_search` that Chat cannot express. Built-ins are
    dropped rather than fatal: they are optional capabilities, and refusing the
    whole request would make the agent unusable.
    """
    out: list[dict] = []

    def add_function(tool: dict) -> None:
        if "function" in tool:
            out.append({"type": "function", "function": tool["function"]})
            return
        fn = {
            "name": tool.get("name") or "",
            "description": tool.get("description") or "",
            "parameters": tool.get("parameters") or {"type": "object", "properties": {}},
        }
        if not fn["name"]:
            raise TranslationError("a function tool has no name")
        out.append({"type": "function", "function": fn})

    for tool in tools or []:
        if not isinstance(tool, dict):
            continue
        ttype = tool.get("type")
        if ttype == "function":
            add_function(tool)
        elif ttype == "namespace":
            for inner in tool.get("tools") or []:
                if isinstance(inner, dict) and inner.get("type") == "function":
                    add_function(inner)
        # Any other type is a built-in the upstream cannot honour; skip it.
    return out


def to_chat(body: dict) -> dict:
    """Translate a Responses request body into a Chat Completions request body."""
    messages: list[dict] = []
    instructions = body.get("instructions")
    if isinstance(instructions, str) and instructions.strip():
        messages.append({"role": "system", "content": instructions})

    pending_calls: list[dict] = []

    def flush_calls() -> None:
        if pending_calls:
            messages.append({"role": "assistant", "content": None, "tool_calls": list(pending_calls)})
            pending_calls.clear()

    raw_input = body.get("input")
    if isinstance(raw_input, str):
        messages.append({"role": "user", "content": raw_input})
    elif isinstance(raw_input, list):
        for item in raw_input:
            if not isinstance(item, dict):
                raise TranslationError(f"input item must be an object, got {type(item).__name__}")
            itype = item.get("type") or ("message" if "role" in item else None)
            if itype == "message":
                role = item.get("role") or "user"
                if role == "developer":
                    role = "system"
                if role not in ("system", "user", "assistant"):
                    raise TranslationError(f"unsupported message role {role!r}")
                flush_calls()
                messages.append({"role": role, "content": _text_of(item.get("content"))})
            elif itype == "function_call":
                pending_calls.append(
                    {
                        "id": item.get("call_id") or item.get("id") or _new_id("call"),
                        "type": "function",
                        "function": {
                            "name": item.get("name") or "",
                            "arguments": item.get("arguments") or "{}",
                        },
                    }
                )
            elif itype == "function_call_output":
                flush_calls()
                output = item.get("output")
                if not isinstance(output, str):
                    output = json.dumps(output, ensure_ascii=False)
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": item.get("call_id") or item.get("id") or "",
                        "content": output,
                    }
                )
            elif itype == "reasoning":
                continue  # chain-of-thought is not replayable through Chat
            else:
                raise TranslationError(f"unsupported input item type {itype!r}")
    elif raw_input is not None:
        raise TranslationError(f"input must be a string or a list, got {type(raw_input).__name__}")
    flush_calls()

    chat: dict = {"model": body.get("model") or "", "messages": messages}
    tools = _chat_tools(body.get("tools"))
    if tools:
        chat["tools"] = tools
        if body.get("tool_choice") is not None:
            choice = body["tool_choice"]
            # Responses allows {"type":"function","name":...}; Chat wants
            # {"type":"function","function":{"name":...}}.
            if isinstance(choice, dict) and choice.get("type") == "function" and "name" in choice:
                choice = {"type": "function", "function": {"name": choice["name"]}}
            chat["tool_choice"] = choice
        if body.get("parallel_tool_calls") is not None:
            chat["parallel_tool_calls"] = bool(body["parallel_tool_calls"])
    for key in ("temperature", "top_p", "max_output_tokens", "user"):
        if body.get(key) is not None:
            chat["max_tokens" if key == "max_output_tokens" else key] = body[key]
    if body.get("stream"):
        chat["stream"] = True
        chat["stream_options"] = {"include_usage": True}
    return chat


def _usage(usage: Any) -> dict:
    usage = usage if isinstance(usage, dict) else {}
    prompt = int(usage.get("prompt_tokens") or 0)
    completion = int(usage.get("completion_tokens") or 0)
    cached = int((usage.get("prompt_tokens_details") or {}).get("cached_tokens") or 0)
    return {
        "input_tokens": prompt,
        "input_tokens_details": {"cached_tokens": cached},
        "output_tokens": completion,
        "output_tokens_details": {"reasoning_tokens": 0},
        "total_tokens": int(usage.get("total_tokens") or prompt + completion),
    }


def _response_object(model: str, output: list[dict], usage: dict, status: str = "completed") -> dict:
    return {
        "id": _new_id("resp"),
        "object": "response",
        "created_at": int(time.time()),
        "status": status,
        "model": model,
        "output": output,
        "parallel_tool_calls": True,
        "tool_choice": "auto",
        "tools": [],
        "usage": usage,
    }


def from_chat(reply: dict, model: str) -> dict:
    """Translate a non-streaming Chat completion into a Responses object."""
    choices = reply.get("choices") or []
    if not choices:
        raise TranslationError("upstream returned no choices")
    message = choices[0].get("message") or {}
    output: list[dict] = []

    text = message.get("content")
    if isinstance(text, list):
        text = _text_of(text)
    if isinstance(text, str) and text.strip():
        output.append(
            {
                "type": "message",
                "id": _new_id("msg"),
                "status": "completed",
                "role": "assistant",
                "content": [{"type": "output_text", "text": text, "annotations": []}],
            }
        )
    for call in message.get("tool_calls") or []:
        fn = call.get("function") or {}
        output.append(
            {
                "type": "function_call",
                "id": _new_id("fc"),
                "status": "completed",
                "call_id": call.get("id") or _new_id("call"),
                "name": fn.get("name") or "",
                "arguments": fn.get("arguments") or "{}",
            }
        )
    return _response_object(reply.get("model") or model, output, _usage(reply.get("usage")))


def sse(event: str, payload: dict) -> bytes:
    """One Responses-style SSE frame."""
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n".encode()


class StreamTranslator:
    """Turn a Chat Completions SSE stream into Responses SSE events.

    Codex parses every intermediate event into a strictly typed Rust enum and
    aborts the turn when one fails to deserialize (`failed to parse ResponseItem
    from output_item.added`). Emitting only the terminal `response.completed`
    avoids that whole surface: Codex reads the finished items out of it, which is
    all the harness needs. Deltas are accumulated here rather than forwarded.
    """

    def __init__(self, model: str):
        self.model = model
        self.response_id = _new_id("resp")
        self.item_id = _new_id("msg")
        self.output: list[dict] = []
        self._text: list[str] = []
        self._calls: dict[int, dict] = {}
        self._call_order: list[int] = []
        self._usage: dict = _usage({})

    def _envelope(self, status: str = "in_progress") -> dict:
        body = _response_object(self.model, self.output, self._usage, status)
        body["id"] = self.response_id
        return body

    def start(self) -> bytes:
        """No opening event: Codex accepts a stream whose first frame is `completed`."""
        return b""

    def feed(self, chunk: dict) -> list[bytes]:
        """Accumulate one Chat chunk; nothing is emitted until `finish`."""
        if chunk.get("usage"):
            self._usage = _usage(chunk["usage"])
        for choice in chunk.get("choices") or []:
            delta = choice.get("delta") or {}
            content = delta.get("content")
            if isinstance(content, str) and content:
                self._text.append(content)
            for call in delta.get("tool_calls") or []:
                index = int(call.get("index") or 0)
                if index not in self._calls:
                    self._calls[index] = {
                        "type": "function_call",
                        "id": _new_id("fc"),
                        "status": "completed",
                        "call_id": call.get("id") or _new_id("call"),
                        "name": "",
                        "arguments": "",
                    }
                    self._call_order.append(index)
                state = self._calls[index]
                fn = call.get("function") or {}
                if fn.get("name") and not state["name"]:
                    state["name"] = fn["name"]
                args = fn.get("arguments")
                if isinstance(args, str) and args:
                    state["arguments"] += args
        return []

    def finish(self) -> list[bytes]:
        text = "".join(self._text)
        if text.strip():
            self.output.append(
                {
                    "type": "message",
                    "id": self.item_id,
                    "status": "completed",
                    "role": "assistant",
                    "content": [{"type": "output_text", "text": text, "annotations": []}],
                }
            )
        for index in self._call_order:
            state = self._calls[index]
            if not state["arguments"]:
                state["arguments"] = "{}"
            self.output.append(state)
        return [
            sse(
                "response.completed",
                {"type": "response.completed", "response": self._envelope("completed")},
            )
        ]


__all__ = [
    "StreamTranslator",
    "TranslationError",
    "from_chat",
    "sse",
    "to_chat",
]
