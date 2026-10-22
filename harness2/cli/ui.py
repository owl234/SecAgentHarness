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

"""Launch the Harness² Web Console."""

from __future__ import annotations

import argparse
import socket
from .. import i18n as I18N
import sys
import threading
import time
import webbrowser
from pathlib import Path


def _find_available_port(host: str, starting_port: int, max_attempts: int = 50) -> int:
    port = starting_port
    for _ in range(max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                s.bind((host, port))
                return port
            except OSError:
                port += 1
    return starting_port


def main(argv: list[str] | None = None) -> int:
    lang = I18N.get_lang(argv=list(argv) if argv is not None else None)
    parser = argparse.ArgumentParser(
        prog="harness2-ui",
        description=I18N.t("ui.desc", lang),
    )
    parser.add_argument("--lang", default=None, choices=("en", "zh"), help=I18N.t("cell.lang", lang))
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help=I18N.t("ui.host", lang),
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8520,
        help=I18N.t("ui.port", lang),
    )
    parser.add_argument(
        "--runs-dir",
        type=Path,
        default=Path("runs"),
        help=I18N.t("ui.runs_dir", lang),
    )
    parser.add_argument(
        "--no-open",
        action="store_true",
        help=I18N.t("ui.no_open", lang),
    )
    args = parser.parse_args(argv)
    lang = I18N.resolve_lang(args, argv)

    import importlib.util

    if importlib.util.find_spec("uvicorn") is None or importlib.util.find_spec("fastapi") is None:
        print(I18N.t("ui.no_deps", lang), file=sys.stderr)
        return 1

    import uvicorn

    workspace_root = Path.cwd().resolve()
    runs_root = (workspace_root / args.runs_dir).resolve()

    port = _find_available_port(args.host, args.port)
    url = f"http://{args.host}:{port}"

    from ..ui.server import create_app

    app = create_app(workspace_root=workspace_root, runs_root=runs_root)

    print("=" * 64)
    print(I18N.t("ui.banner", lang))
    print("=" * 64)
    print(I18N.t("ui.web_url", lang, u=url))
    print(I18N.t("ui.workspace", lang, w=workspace_root))
    print(I18N.t("ui.runs_dir_line", lang, r=runs_root))
    print(I18N.t("ui.api", lang, u=url))
    print("=" * 64)
    print(I18N.t("ui.stop", lang) + "\n")

    if not args.no_open:
        def _open():
            time.sleep(1.0)
            webbrowser.open(url)

        threading.Thread(target=_open, daemon=True).start()

    uvicorn.run(app, host=args.host, port=port, log_level="warning")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
