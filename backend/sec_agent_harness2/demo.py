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

"""A deterministic local adapter for exercising the real adaptation workflow."""

from __future__ import annotations

import csv
import subprocess
import sys
from decimal import Decimal
from pathlib import Path

from .core import tree
from .core.proposer import Proposer, Reply
from .core.spec import BenchPrompts, BenchSpec, ChannelSpec
from .substrate.opencode import OpencodeSubstrate

BASE_SCRIPT = """import csv
import sys
from decimal import Decimal

with open(sys.argv[1]) as source:
    amounts = [Decimal(row['amount']) for row in csv.DictReader(source)]
total = sum((amount for amount in amounts if amount > 0), Decimal(0))
print(f'Total: {total:.2f}')
"""


class DemoAdapter:
    def __init__(self, root: Path):
        self.root = root
        self.substrate = OpencodeSubstrate()
        channel = ChannelSpec("opencode", "local/deterministic")
        self.spec = BenchSpec(
            name="demo",
            runs_root=root / "runs",
            install_mode="workspace_config",
            prompts=BenchPrompts(work="核对交易账本中的带符号金额明细"),
            channels={"proposer": channel, "selector": channel},
            leak_globs=("reference_answer.txt",),
        )
        self.execution_count = 0
        base = {name: "" for name in self.substrate.surface().always_on}
        base["systemprompt.md"] = "请调用 python scripts/summarize.py 核对并汇总交易账本金额。\n"
        base["scripts/summarize.py"] = BASE_SCRIPT
        tree.write_tree(self.substrate.surface(), base, self.base_harness(), stubs=False)
        for task_id, amounts in (
            ("ledger-1", "100.25\n-20.10\n5.00\n"),
            ("ledger-2", "35.50\n-10.25\n-5.00\n"),
        ):
            source = self.task_files(task_id)
            source.mkdir(parents=True, exist_ok=True)
            (source / "ledger.csv").write_text("amount\n" + amounts, encoding="utf-8")

    def tasks(self, split: str = "all") -> list[str]:
        return ["ledger-1", "ledger-2"]

    def domain_of(self, task_id: str) -> str:
        return "accounting"

    def task_prompt(self, task_id: str) -> str:
        return "计算 ledger.csv 中所有带正负符号金额的净总和，按 Total: 保留两位小数输出。"

    def task_files(self, task_id: str) -> Path:
        return self.root / "sources" / task_id

    def base_harness(self) -> Path:
        return self.root / "base"

    def validate_tree(self, harness: tree.Tree) -> None:
        if "scripts/summarize.py" not in harness:
            raise ValueError("本地执行器要求必须包含 scripts/summarize.py")

    def execute(
        self, task_id: str, harness_dir: Path | None, run_id: str, *, timeout: int | None = None
    ) -> Path:
        self.execution_count += 1
        run_dir = self.root / "executions" / run_id
        run_dir.mkdir(parents=True, exist_ok=True)
        script = (harness_dir or self.base_harness()) / "scripts/summarize.py"
        result = subprocess.run(
            [sys.executable, str(script), str(self.task_files(task_id) / "ledger.csv")],
            capture_output=True,
            text=True,
            check=True,
            timeout=timeout or 10,
        )
        (run_dir / "answer.txt").write_text(result.stdout, encoding="utf-8")
        (run_dir / "trajectory.md").write_text(
            "[执行动作] 在 ledger.csv 上运行 scripts/summarize.py\n[观测输出]\n" + result.stdout,
            encoding="utf-8",
        )
        return run_dir

    def delivered(self, run_dir: Path) -> bool:
        return (run_dir / "answer.txt").is_file()

    def trajectory(self, run_dir: Path, *, obs_trunc: int) -> str:
        return (run_dir / "trajectory.md").read_text(encoding="utf-8")

    def deliverable_text(self, run_dir: Path) -> str:
        return (run_dir / "answer.txt").read_text(encoding="utf-8")

    def deliverable_files(self, run_dir: Path) -> dict[str, str]:
        return {"answer.txt": self.deliverable_text(run_dir)}


class DemoProposer(Proposer):
    """Scripted edits and selection; no model service or benchmark judge is used."""

    def call(self, mission, context_dir, label, **kwargs) -> Reply:
        context = Path(context_dir)
        workspace = None
        if label.startswith("select."):
            with (context / "source/ledger.csv").open() as source:
                expected = sum(
                    (Decimal(row["amount"]) for row in csv.DictReader(source)), Decimal(0)
                )
            candidates = sorted((context / "candidates").glob("*.md"))
            chosen = next(
                path.stem for path in candidates if f"Total: {expected:.2f}" in path.read_text()
            )
            text = (
                f"<why>候选产物的带符号净总额与原始账本流水完全吻合，已正确计入负向冲抵项。</why>\n```choice\n{chosen}\n```"
            )
        elif label.startswith("experience."):
            changed = (context / "harness/scripts/summarize.py").read_text() != (
                context / "base_harness/scripts/summarize.py"
            ).read_text()
            text = (
                "<edits>\ncomponent: scripts/summarize.py\ncandidates: inv1\n"
                "change: 移除了金额求和时仅保留正数的过滤条件 (if amount > 0)\n"
                "observed: 探测执行结果正确纳入了初始基准运行所遗漏的负向冲销金额\n"
                f"verdict: {'helped' if changed else 'no observed effect'}\n</edits>\n\n"
            ) + (
                "<experience>\ncue: 当交易账本同时包含正向入账与负向冲销（借贷双向流水）时\n"
                "lesson: 在 scripts/summarize.py 汇总金额时必须同时保留正负符号，严禁过滤负数项。\n"
                "evidence: scripts/summarize.py 改动对比显示——移除仅正数过滤后，探测总额准确纳入了初始基准轨迹遗漏的负向流水。\n"
                "confidence: 高（基于明确的算术执行对比证据）\n</experience>"
                if changed
                else "NO_ENTRY"
            )
        else:
            workspace = context / "harness"
            script = workspace / "scripts/summarize.py"
            script.write_text(script.read_text().replace(" if amount > 0", ""), encoding="utf-8")
            text = "<notes>保留带符号金额：初始基准汇总遗漏了原始账本中的负向冲销项。</notes>"
        reply = Reply(label=label, text=text, ok=True, attempts=1, workspace=workspace)
        self._calls.append(reply)
        return reply
