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

"""Run the real recursion and library workflow with local, deterministic editors."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from .. import i18n as I18N
from ..core.schedule import mode_token, run_domain
from ..demo import DemoAdapter, DemoProposer


def main(argv=None) -> int:
    lang = I18N.get_lang()
    parser = argparse.ArgumentParser(description=I18N.t("demo.desc", lang))
    parser.add_argument("--lang", default=None, choices=("en", "zh"), help=I18N.t("cell.lang", lang))
    parser.add_argument("--output", type=Path, default=Path("runs/demo"), help=I18N.t("demo.output", lang))
    parser.add_argument("--k", type=int, default=2, help=I18N.t("demo.k", lang))
    parser.add_argument("--mode", choices=("parallel", "sequential", "both"), default="both", help=I18N.t("demo.mode", lang))
    args = parser.parse_args(argv)
    lang = I18N.resolve_lang(args)
    if args.k < 1:
        parser.error(I18N.t("demo.err_k", lang))
    root = args.output.expanduser().resolve()
    adapter = DemoAdapter(root)
    proposer = DemoProposer(adapter.spec.channels["proposer"])
    modes = ("agg", "seq") if args.mode == "both" else (mode_token(args.mode),)
    result = run_domain(
        "accounting",
        adapter.tasks(),
        args.k,
        adapter=adapter,
        prop=proposer,
        runs_root=adapter.spec.runs_root,
        library_root=root / "library" / f"k{args.k}",
        modes=modes,
    )
    result["execution_count"] = adapter.execution_count
    result["editor_calls"] = len(proposer._calls)
    report = root / "demo.json"
    report.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(I18N.t("demo.done", lang, d=result['done'], f=result['failed'], r=report))
    return int(result["failed"] > 0)


if __name__ == "__main__":
    raise SystemExit(main())
