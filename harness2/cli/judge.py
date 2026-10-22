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

"""Judge the SELECTED run of each finished task in one namespace, and cache the rows.

Only the run the blind terminal selector chose is scored. A judge failure is recorded as
ungraded (score=None), never as a zero. Re-running re-judges every selection, but
adapters serve cached judge details and a failed re-judge never replaces an existing
graded row.

    python3 -m harness2.cli.judge --bench jb --substrate oc --k 2 --modes parallel

With --bases it scores this namespace's reference executions instead, so the initial
harness can be reported beside the adapted one.

Output: <runs_root>/<namespace>/judged.json (judge.write format), consumed by cli.report;
or base_judged.json under --bases, one row per (task, base<i>).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .. import config
from .. import i18n as I18N
from ..core import judge as J
from . import _common as C

_DERIVED = ("frac", "graded")


_PARALLEL = 8


def _load_rows(path: Path) -> list[J.Scored]:
    """Rebuild Scored rows from a judged.json written by core.judge.write."""
    if not path.is_file():
        return []
    try:
        raw = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(I18N.t("judge.err_cache", I18N.get_lang(), p=path, e=exc))
    rows = []
    for row in raw:
        row = {k: v for k, v in row.items() if k not in _DERIVED}
        if "mode" not in row and "arm" in row:
            row["mode"] = row.pop("arm")
        rows.append(J.Scored(**row))
    return rows


def _merge(old: list[J.Scored], new: list[J.Scored]) -> list[J.Scored]:
    """Per (task, mode, k): a changed chosen run replaces; for the same run_id the graded
    row wins, so a failed re-judge never erases an existing score."""
    by_key = {(r.task_id, r.mode, r.k): r for r in old}
    for r in new:
        key = (r.task_id, r.mode, r.k)
        prev = by_key.get(key)
        if (
            prev is not None
            and prev.run_id == r.run_id
            and prev.graded
            and not r.graded
            and not r.error.startswith("selection")
        ):
            continue
        by_key[key] = r
    return [by_key[k] for k in sorted(by_key)]


def _selection_record(sel: dict) -> dict:
    """A selection record keyed by `mode`; older summaries carry `arm` instead."""
    if "mode" not in sel and "arm" in sel:
        sel = dict(sel)
        sel["mode"] = sel.pop("arm")
    return sel


def collect_selections(ns_dir: Path, modes: tuple[str, ...]) -> list[dict]:
    """Every requested mode's selection record from every finished task summary."""
    out: list[dict] = []
    lang = I18N.get_lang()
    for summary_path in sorted(ns_dir.glob("*/summary.json")):
        try:
            summary = json.loads(summary_path.read_text())
        except (OSError, json.JSONDecodeError) as exc:
            print(I18N.t("judge.skip", lang, p=summary_path, e=exc), flush=True)
            continue
        for mode in modes:
            sel = (summary.get("selections") or {}).get(mode)
            if sel:
                out.append(_selection_record(sel))
    return out


def judge_bases(adapter, ns_dir: Path) -> int:
    """Score every reference execution recorded in this namespace's task summaries."""
    rows, legacy = [], 0
    lang = I18N.get_lang()
    for summary_path in sorted(ns_dir.glob("*/summary.json")):
        try:
            summary = json.loads(summary_path.read_text())
        except (OSError, json.JSONDecodeError) as exc:
            print(I18N.t("judge.skip", lang, p=summary_path, e=exc), flush=True)
            continue
        task_id = summary.get("task_id", "")
        for entry in summary.get("base") or []:
            if not isinstance(entry, dict) or not entry.get("run_dir"):
                legacy += 1
                continue
            label, run_dir = entry.get("label", ""), Path(entry["run_dir"])
            try:
                got = adapter.score(run_dir, task_id) if run_dir.is_dir() else None
            except Exception as exc:
                got = None
                print(f"  {task_id[:52]:<52} {label} ERROR {type(exc).__name__}: {exc}", flush=True)
            else:
                shown = "-" if got is None else f"{got.get('n_passed')}/{got.get('n_criteria')}"
                print(f"  {task_id[:52]:<52} {label} {shown}", flush=True)
            rows.append(
                {"task": task_id, "label": label, "run_id": entry.get("run_id", ""), "score": got}
            )
    if legacy:
        print(I18N.t("judge.legacy", lang, n=legacy), flush=True)
    if not rows:
        print(I18N.t("judge.no_ref", lang, d=ns_dir), flush=True)
        return 2
    out = ns_dir / "base_judged.json"
    out.write_text(json.dumps(rows, indent=1, default=str), encoding="utf-8")
    graded = sum(1 for r in rows if r["score"] is not None)
    print(I18N.t("judge.wrote", lang, o=out, n=len(rows), g=graded))
    return 0 if graded == len(rows) else 2


def main(argv: list[str] | None = None) -> int:
    lang = I18N.get_lang()
    p = argparse.ArgumentParser(
        prog="harness2.cli.judge", description=I18N.t("judge.desc", lang), formatter_class=C.HelpFormatter
    )
    C.add_cell_args(p.add_argument_group(I18N.t("sweep.group_cell", lang)))
    C.add_run_identity_args(p.add_argument_group(I18N.t("report.group_identity", lang)))
    p.add_argument(
        "--bases",
        action="store_true",
        help=I18N.t("judge.bases", lang),
    )
    p.add_argument("--lang", default=None, choices=("en", "zh"), help=I18N.t("cell.lang", lang))
    args = p.parse_args(argv)
    args.bench = C.normalize_bench(args.bench)
    args.substrate = C.normalize_substrate(args.substrate)
    lang = I18N.resolve_lang(args)
    modes = C.parse_modes(args.modes)

    config.validate_models(judge=True)
    adapter = C.make_adapter(args.bench, args.subset, args.substrate)
    ns = C.summary_namespace(adapter, args.k, seed=args.seed)
    ns_dir = C.runs_root_for(adapter) / ns
    identity = ns_dir / "config.json"
    if identity.is_file() and json.loads(identity.read_text()).get("judge") != config.JUDGE_MODEL:
        raise SystemExit(I18N.t("judge.err_model_changed", lang))
    if not ns_dir.is_dir():
        raise SystemExit(
            I18N.t("judge.err_nothing", lang, d=ns_dir, ns=ns)
        )
    if args.bases:
        return judge_bases(adapter, ns_dir)

    sels = collect_selections(ns_dir, modes)
    if not sels:
        raise SystemExit(
            I18N.t("judge.err_no_sel", lang, m=[C.mode_label(m) for m in modes], d=ns_dir)
        )

    print(I18N.t("judge.judging", lang, n=len(sels), ns=ns), flush=True)
    rows = J.judge_selections(adapter, sels, parallel=_PARALLEL)

    out_path = ns_dir / "judged.json"
    merged = _merge(_load_rows(out_path), rows)
    J.write(merged, out_path)

    graded = sum(1 for r in merged if r.graded)
    print(
        I18N.t("judge.summary", lang, n=len(merged), g=graded, u=len(merged) - graded)
    )
    print(I18N.t("judge.wrote_path", lang, p=out_path))
    return 0 if rows and all(r.graded for r in rows) else 2


if __name__ == "__main__":
    sys.exit(main())
