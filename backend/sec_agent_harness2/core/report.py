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

"""Judged selections -> the figure each benchmark reports, plus pick provenance and warnings.

Ungraded rows and tasks that never completed are excluded from the denominator rather than
counted as failures.
"""

from __future__ import annotations

import statistics as st
from dataclasses import dataclass
from typing import Sequence

from .judge import Scored
from .schedule import MODE_NAMES


@dataclass
class Summary:
    mode: str
    k: int
    n: int = 0
    n_ungraded: int = 0
    score: float | None = None
    all_pass: float | None = None
    kept_base: int = 0
    chose_final: int = 0
    chose_candidate: int = 0
    fell_back: int = 0
    usd: float = 0.0
    metrics: tuple[str, ...] = ()

    @property
    def name(self) -> str:
        return f"{MODE_NAMES.get(self.mode, self.mode)} k={self.k}"

    def line(self, bench: str = "") -> str:
        """LAB reports partial credit and all-criteria pass; the others report one score."""
        if not self.n:
            return f"  {self.name}: 暂无已评分任务"
        figures = (
            f"部分得分 {self.score:6.2f}% | 全通率 {self.all_pass:5.1f}%"
            if bench == "lab"
            else f"得分 {self.score:6.2f}%"
        )
        pick = (
            f" | 采纳来源: 终选融合 {self.chose_final} / 中间候选 {self.chose_candidate} / "
            f"初始基准 {self.kept_base}"
        )
        fb = f" | 回退次数 {self.fell_back}" if self.fell_back else ""
        ug = f" | 未评分 {self.n_ungraded}" if self.n_ungraded else ""
        return f"  {self.name}: 任务数={self.n:>3} | {figures}{pick}{fb}{ug}"


def _kind(r: Scored) -> str:
    """Classify the selected output; each sequential checkpoint is a composed final."""
    lbl = str(getattr(r, "label", "") or "")
    if lbl.startswith("base"):
        return "base"
    if r.mode == "agg":
        return "final" if lbl.startswith("agg") else "candidate"
    if r.mode == "seq":
        return "final" if lbl in {f"c{index}" for index in range(1, r.k + 1)} else "candidate"
    return "candidate"


def summarise(
    rows: Sequence[Scored],
    *,
    fell_back: dict[tuple[str, int], int] | None = None,
    usd: dict[tuple[str, int], float] | None = None,
) -> list[Summary]:
    """One Summary per (mode, k). Ungraded rows are counted, then excluded."""
    keys = sorted({(r.mode, r.k) for r in rows})
    out: list[Summary] = []
    for mode, k in keys:
        group = [r for r in rows if r.mode == mode and r.k == k]
        good = [r for r in group if r.graded]
        units = tuple(
            sorted({str(r.raw.get("metric") or "") for r in good if isinstance(r.raw, dict)} - {""})
        )
        s = Summary(
            mode=mode,
            k=k,
            n=len(good),
            n_ungraded=len(group) - len(good),
            kept_base=sum(1 for r in good if r.chosen_is_base),
            chose_final=sum(1 for r in good if _kind(r) == "final"),
            chose_candidate=sum(1 for r in good if _kind(r) == "candidate"),
            fell_back=(fell_back or {}).get((mode, k), 0),
            usd=round((usd or {}).get((mode, k), 0.0), 2),
            metrics=units,
        )
        if good:
            s.score = round(100 * st.mean(r.frac for r in good), 2)
            s.all_pass = round(100 * sum(1 for r in good if r.all_pass) / len(good), 2)
        out.append(s)
    return out


def render(summaries: Sequence[Summary], *, title: str = "", bench: str = "") -> str:
    """The printable summary block."""
    lines = []
    if title:
        lines += [title, "=" * max(40, len(title))]
    for s in sorted(summaries, key=lambda x: (x.k, x.mode)):
        lines.append(s.line(bench))

    at1 = {s.mode: s for s in summaries if s.k == 1 and s.score is not None}
    if len(at1) == 2:
        gap = abs(at1["agg"].score - at1["seq"].score)
        lines += [
            "",
            "  提示  在 k=1 时，并行（parallel）与序列（sequential）模式在流程上完全等价 "
            "（1 次通用工程提议、1 次业务领域提议、1 次融合合成）。",
            f"        两者之间 {gap:.2f} 分的差距属于随机采样【噪音基线】，"
            f"当 k>=2 时的增益必须超过此基线才具统计显著性。",
        ]

    for s in summaries:
        if s.n and s.chose_final <= 0.25 * s.n:
            lines += [
                "",
                f"  警告  {s.name}: 终选融合套件仅在 {s.chose_final}/{s.n} 个任务中被选中。"
                f"当前记录包含了超出 {s.k} 个标准融合终选池之外的产物。",
            ]
    warn = [s for s in summaries if s.n and s.kept_base >= 0.8 * s.n]
    for s in warn:
        lines += [
            "",
            f"  警告  {s.name}: 盲选在 {s.kept_base}/{s.n} 个任务中选择了初始基准产物，"
            f"未采纳融合演进池中的套件。",
        ]
    fb = [s for s in summaries if s.fell_back]
    for s in fb:
        lines += [
            "",
            f"  警告  {s.name}: 有 {s.fell_back} 个演进阶段校验失败并回退到了上一版套件。"
            f"请在解读结果时检查对应阶段的错误详情。",
        ]
    for s in summaries:
        if len(s.metrics) > 1:
            lines += [
                "",
                f"  警告  {s.name}: 已评分记录包含混合计分单位 ({', '.join(s.metrics)})。"
                f"当前分数将加权分与非加权标准数进行了混合平均；请在与公开基线对比前重新评审回退行。",
            ]
    return "\n".join(lines)
