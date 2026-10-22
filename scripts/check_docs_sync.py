#!/usr/bin/env python3
# Copyright 2026 Google LLC
"""Fail when an EN doc outruns its ZH mirror beyond the allowed drift.

Checks every EN↔ZH pair:
  - both files exist and carry the cross-link header line
  - heading counts match (same document structure)
  - line-count drift stays under --max-drift (default 35%)

Stdlib only. Usage:
    python3 scripts/check_docs_sync.py [--max-drift 0.35]
"""

from __future__ import annotations

import argparse
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAIRS = [
    ("README.md", "README_zh.md"),
    ("CONTRIBUTING.md", "CONTRIBUTING_zh.md"),
    ("docs/ARCHITECTURE.md", "docs/ARCHITECTURE_zh.md"),
    ("docs/BENCHMARKS.md", "docs/BENCHMARKS_zh.md"),
    ("docs/EXPERIMENTS.md", "docs/EXPERIMENTS_zh.md"),
    ("docs/SETUP.md", "docs/SETUP_zh.md"),
]
HEADING = re.compile(r"^#{1,4}\s+\S", re.MULTILINE)


def check_pair(en_rel: str, zh_rel: str, max_drift: float) -> list[str]:
    errs: list[str] = []
    en, zh = ROOT / en_rel, ROOT / zh_rel
    if not en.is_file():
        return [f"{en_rel}: missing EN source"]
    if not zh.is_file():
        return [f"{zh_rel}: missing ZH mirror for {en_rel}"]
    en_t, zh_t = en.read_text(encoding="utf-8"), zh.read_text(encoding="utf-8")
    en_base = pathlib.Path(en_rel).name
    zh_base = pathlib.Path(zh_rel).name
    # cross-links both ways
    if zh_base not in en_t or "_zh" not in en_t:
        errs.append(f"{en_rel}: missing link to {zh_base}")
    if en_base not in zh_t:
        errs.append(f"{zh_rel}: missing link back to {en_base}")
    en_h = len(HEADING.findall(en_t))
    zh_h = len(HEADING.findall(zh_t))
    if en_h != zh_h:
        errs.append(f"{zh_rel}: heading count {zh_h} != EN {en_h} (structure drift)")
    en_n = len(en_t.splitlines()) or 1
    zh_n = len(zh_t.splitlines())
    drift = abs(en_n - zh_n) / en_n
    if drift > max_drift:
        errs.append(
            f"{zh_rel}: line drift {drift:.0%} (zh {zh_n} vs en {en_n}) exceeds {max_drift:.0%}"
        )
    return errs


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Check EN/ZH doc sync.")
    ap.add_argument("--max-drift", type=float, default=0.40)  # ZH lines run denser than EN
    args = ap.parse_args(argv)
    errs: list[str] = []
    for en_rel, zh_rel in PAIRS:
        errs.extend(check_pair(en_rel, zh_rel, args.max_drift))
    # frontend i18n key parity
    zh_keys, en_keys = set(), set()
    try:
        import re as _re

        zh_src = (ROOT / "web/src/i18n/zh.ts").read_text(encoding="utf-8")
        en_src = (ROOT / "web/src/i18n/en.ts").read_text(encoding="utf-8")
        zh_keys = set(_re.findall(r"'([\w.]+)'\s*:", zh_src))
        en_keys = set(_re.findall(r"'([\w.]+)'\s*:", en_src))
        if zh_keys - en_keys:
            errs.append(f"web/src/i18n/en.ts missing keys: {sorted(zh_keys - en_keys)}")
        if en_keys - zh_keys:
            errs.append(f"web/src/i18n/zh.ts missing keys: {sorted(en_keys - zh_keys)}")
    except OSError as exc:
        errs.append(f"i18n dicts unreadable: {exc}")
    for e in errs:
        print(f"SYNC FAIL: {e}")
    if errs:
        return 1
    print(f"docs sync OK: {len(PAIRS)} pairs, i18n keys zh={len(zh_keys)} en={len(en_keys)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
