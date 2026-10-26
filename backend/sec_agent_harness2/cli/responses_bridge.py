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

"""HTTP front end for harness2.responses_bridge: `/v1/responses` on a Chat endpoint.

Run it in front of any OpenAI-compatible endpoint that has no `/v1/responses`:

    harness2-responses-bridge --upstream https://host/v1 --api-key sk-...

The bridge prints the SEC_AGENT_HARNESS2_CODEX_* settings to put in `.env`, exactly like
`harness2-bridge`, but it does not need Vertex or LiteLLM.
"""

from __future__ import annotations

import argparse
import json
import secrets
import socket
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse

from sec_agent_harness2 import config
from sec_agent_harness2 import i18n as I18N
from sec_agent_harness2.responses_bridge import (
    StreamTranslator,
    TranslationError,
    from_chat,
    to_chat,
)


def _free_port(host: str) -> int:
    with socket.socket() as s:
        s.bind((host, 0))
        return s.getsockname()[1]


def _endpoint(path: Path, host: str, port: int) -> dict:
    """Reuse the saved port and key so the Codex config written by setup stays valid."""
    try:
        saved = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        saved = {}
    endpoint = {
        "port": port or saved.get("port") or _free_port(host),
        "key": saved.get("key") or secrets.token_urlsafe(24),
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(endpoint) + "\n", encoding="utf-8")
    path.chmod(0o600)
    return endpoint


def create_app(
    upstream: str,
    api_key: str,
    *,
    timeout: float = 600.0,
    client: httpx.AsyncClient | None = None,
) -> FastAPI:
    """The bridge app; `upstream` is the Chat Completions base (…/v1)."""
    if client is None:
        client = httpx.AsyncClient(timeout=timeout)
    url = upstream.rstrip("/") + "/chat/completions"

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        yield
        await client.aclose()

    app = FastAPI(title="harness2 responses bridge", lifespan=lifespan)

    @app.get("/healthz")
    async def healthz() -> dict:
        return {"status": "ok", "upstream": url}

    @app.get("/v1/models")
    async def models() -> JSONResponse:
        try:
            r = await client.get(
                upstream.rstrip("/") + "/models",
                headers={"Authorization": f"Bearer {api_key}"},
            )
            return JSONResponse(r.json(), status_code=r.status_code)
        except httpx.HTTPError as exc:
            return JSONResponse({"error": str(exc)}, status_code=502)

    @app.post("/v1/responses")
    async def responses(request: Request):
        try:
            body = await request.json()
        except ValueError:
            return JSONResponse({"error": "request body is not JSON"}, status_code=400)
        try:
            chat = to_chat(body)
        except TranslationError as exc:
            return JSONResponse({"error": f"unsupported request: {exc}"}, status_code=400)

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        if not chat.get("stream"):
            try:
                r = await client.post(url, json=chat, headers=headers)
            except httpx.HTTPError as exc:
                return JSONResponse({"error": f"upstream unreachable: {exc}"}, status_code=502)
            if r.status_code >= 400:
                return JSONResponse(
                    {"error": f"upstream {r.status_code}: {r.text[:500]}"},
                    status_code=r.status_code,
                )
            try:
                return JSONResponse(from_chat(r.json(), chat["model"]))
            except TranslationError as exc:
                return JSONResponse({"error": f"unusable reply: {exc}"}, status_code=502)

        async def stream():
            translator = StreamTranslator(chat["model"])
            yield translator.start()
            try:
                async with client.stream("POST", url, json=chat, headers=headers) as r:
                    if r.status_code >= 400:
                        text = (await r.aread()).decode("utf-8", "replace")[:500]
                        yield b"event: error\ndata: " + json.dumps(
                            {"type": "error", "error": {"message": f"upstream {r.status_code}: {text}"}}
                        ).encode() + b"\n\n"
                        return
                    async for line in r.aiter_lines():
                        line = line.strip()
                        if not line.startswith("data:"):
                            continue
                        payload = line[5:].strip()
                        if payload == "[DONE]":
                            break
                        try:
                            chunk = json.loads(payload)
                        except json.JSONDecodeError:
                            continue
                        for event in translator.feed(chunk):
                            yield event
                for event in translator.finish():
                    yield event
            except httpx.HTTPError as exc:
                yield b"event: error\ndata: " + json.dumps(
                    {"type": "error", "error": {"message": f"upstream error: {exc}"}}
                ).encode() + b"\n\n"

        return StreamingResponse(stream(), media_type="text/event-stream")

    return app


def main(argv=None):
    lang = I18N.get_lang()
    p = argparse.ArgumentParser(description=I18N.t("responses_bridge.desc", lang))
    p.add_argument("--lang", default=None, choices=("en", "zh"), help=I18N.t("cell.lang", lang))
    p.add_argument("--upstream", default=config.API_BASE_URL, help=I18N.t("responses_bridge.upstream", lang))
    p.add_argument("--api-key", default=config.API_KEY, help=I18N.t("responses_bridge.api_key", lang))
    p.add_argument("--host", default="127.0.0.1", help=I18N.t("responses_bridge.host", lang))
    p.add_argument("--port", type=int, default=0, help=I18N.t("responses_bridge.port", lang))
    p.add_argument("--timeout", type=float, default=600.0, help=I18N.t("responses_bridge.timeout", lang))
    args = p.parse_args(argv)
    lang = I18N.resolve_lang(args)

    if not args.upstream:
        p.exit(1, I18N.t("responses_bridge.no_upstream", lang) + "\n")
    if not args.api_key:
        p.exit(1, I18N.t("responses_bridge.no_key", lang) + "\n")

    root = config.DEPENDENCIES / "codex"
    endpoint = _endpoint(root / "responses-bridge.json", args.host, args.port)
    port = endpoint["port"]
    base = f"http://{args.host}:{port}/v1"
    settings = {
        "SEC_AGENT_HARNESS2_CODEX_BASE_URL": base,
        "SEC_AGENT_HARNESS2_CODEX_API_KEY": endpoint["key"],
        "SEC_AGENT_HARNESS2_CODEX_MODEL": config.SOLVER_MODEL_CX,
    }
    if args.host not in ("127.0.0.1", "localhost"):
        settings["SEC_AGENT_HARNESS2_CODEX_CONTAINER_URL"] = f"http://host.docker.internal:{port}/v1"
    print(I18N.t("responses_bridge.hint", lang), flush=True)
    print("\n".join(f"{k}={v}" for k, v in settings.items()), flush=True)

    import uvicorn

    app = create_app(args.upstream, args.api_key, timeout=args.timeout)
    uvicorn.run(app, host=args.host, port=port, log_level="info")


if __name__ == "__main__":
    raise SystemExit(main())
