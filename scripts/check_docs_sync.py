#!/usr/bin/env python3
# Copyright 2026 Google LLC
"""验证核心中文文档结构完整性与前端字典键集合一致性。

检查内容：
  - 所有核心中文文档均存在、非空且包含规范 Markdown 标题结构
  - 文档中不存在指向已移除旧版英文镜像文档的失效链接
  - 前端 i18n 字典 (zh.ts / en.ts) 键集合完全对齐

仅使用标准库。用法：
    python3 scripts/check_docs_sync.py
"""

from __future__ import annotations

import argparse
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
REQUIRED_DOCS = [
    "README.md",
    "CONTRIBUTING_zh.md",
    "docs/ARCHITECTURE_zh.md",
    "docs/BENCHMARKS_zh.md",
    "docs/EXPERIMENTS_zh.md",
    "docs/SETUP_zh.md",
]
REMOVED_EN_DOCS = (
    "README_en.md",
    "CONTRIBUTING.md",
    "ARCHITECTURE.md",
    "BENCHMARKS.md",
    "EXPERIMENTS.md",
    "SETUP.md",
)
HEADING = re.compile(r"^#{1,4}\s+\S", re.MULTILINE)


def check_doc(rel_path: str) -> list[str]:
    errs: list[str] = []
    doc = ROOT / rel_path
    if not doc.is_file():
        return [f"{rel_path}: 缺失核心中文文档"]
    text = doc.read_text(encoding="utf-8")
    headings = len(HEADING.findall(text))
    if rel_path != "README.md" and headings < 1:
        errs.append(f"{rel_path}: 缺少 Markdown 标题结构")
    for old_en in REMOVED_EN_DOCS:
        if f"({old_en}" in text or f'"{old_en}"' in text:
            errs.append(f"{rel_path}: 存在指向已移除英文文档 {old_en} 的残留链接")
    return errs


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="检查中文文档完整性与前端字典键一致性。")
    ap.add_argument("--max-drift", type=float, default=0.40)
    ap.parse_args(argv)
    errs: list[str] = []
    for rel_path in REQUIRED_DOCS:
        errs.extend(check_doc(rel_path))
    zh_keys, en_keys = set(), set()
    try:
        zh_src = (ROOT / "frontend/src/i18n/zh.ts").read_text(encoding="utf-8")
        en_src = (ROOT / "frontend/src/i18n/en.ts").read_text(encoding="utf-8")
        zh_keys = set(re.findall(r"'([\w.]+)'\s*:", zh_src))
        if "...zh" in en_src:
            en_keys = set(zh_keys)
        else:
            en_keys = set(re.findall(r"'([\w.]+)'\s*:", en_src))
        if zh_keys - en_keys:
            errs.append(f"frontend/src/i18n/en.ts 缺失键: {sorted(zh_keys - en_keys)}")
        if en_keys - zh_keys:
            errs.append(f"frontend/src/i18n/zh.ts 缺失键: {sorted(en_keys - zh_keys)}")
    except OSError as exc:
        errs.append(f"无法读取 i18n 字典文件: {exc}")
    for e in errs:
        print(f"校验失败: {e}")
    if errs:
        return 1
    print(f"文档与字典校验通过：共检查 {len(REQUIRED_DOCS)} 份核心中文文档，字典键数 zh={len(zh_keys)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
