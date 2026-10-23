<p align="center">
  <a href="README.md">简体中文</a> | <b>English</b>
</p>

<h3 align="center">
  <img src="assets/Harness2-wordmark.png" alt="SecAgentHarness²" width="360"><br>
  Applying Recursive Agent Harnessing (Harness²) to Cybersecurity
</h3>

<p align="center">
  <a href="https://arxiv.org/pdf/2610.14224"><img src="https://img.shields.io/badge/Paper-arXiv-EA4335?logo=arxiv&logoColor=white" alt="Paper"></a>
  <a href="https://harness2.github.io"><img src="https://img.shields.io/badge/Website-harness2.github.io-4285F4?logo=googlechrome&logoColor=white" alt="Website"></a>
  <a href="docs/ARCHITECTURE.md"><img src="https://img.shields.io/badge/Docs-Architecture-4285F4?logo=diagramsdotnet&logoColor=white" alt="Architecture guide"></a>
  <a href="docs/BENCHMARKS.md"><img src="https://img.shields.io/badge/Docs-Benchmark%20guides-FBBC04" alt="Benchmark guides"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-34A853" alt="License"></a>
</p>

> [!NOTE]
> **Upstream & Core Origin Notice**:
> SecAgentHarness² (SecAgentHarness2) is a specialized cybersecurity extension and benchmark evaluation suite originating from and built upon [Google Research's Harness²](https://github.com/google-research/harness2) ([Paper](https://arxiv.org/abs/2610.14224)). The core recursive agent harnessing engine and contrastive Propose–Probe–Compose pipeline are derived from the upstream project, extending its capabilities toward multi-domain cybersecurity benchmarks, red/blue teaming evaluations, and 8-component agent harnesses.

<p align="center">
  <a href="docs/BENCHMARKS.md#jobbench">
    <img src="assets/harness2-setup.gif" alt="Install, set up, and run JobBench: uv pip install -e '.[render]', harness2-setup jb, then harness2 --bench jb --k 1 --mode parallel. Click for prerequisites and commands." width="640">
  </a>
</p>

A **harness** is the system around a model that enables it to act as an agent:
prompts, tools, memory, skills, orchestration, and more. **Harnessing** is the
process of optimizing that system.

**SecAgentHarness²** (repository: `SecAgentHarness2`) applies recursive agent harnessing ([Google Research's Harness²](https://github.com/google-research/harness2)) to the cybersecurity domain. It provides a plug-and-play framework for evaluating, optimizing, and fortifying security agents across multi-domain cybersecurity benchmarks and 8-component modular architectures in an open world, connecting two levels of recursion while keeping model weights fixed:

* **Task-level recursion** refines the execution harness for the current task
  through a contrastive **Propose–Probe–Compose** step: propose edits, probe
  their effects on the same task, and compose a refined harness from behavioral
  contrasts between executions, without ground-truth feedback.
* **Harnessing-level recursion** updates a persistent *improvement harness*
  with adopted harnesses and evidence-supported lessons from each task to guide
  future refinement.

<p align="center">
  <a href="assets/harness2_pipeline.png">
    <img src="assets/harness2_pipeline.png" alt="Harness² pipeline. Task-level recursion: an agent executor runs the initial harness, a harness editor proposes invariant and domain edits, candidate probes execute them, and a harness composer combines them into the final harness. Harnessing-level recursion: an experience reflector reflects on the step and updates the improvement harness used for the next task." width="100%">
  </a>
</p>

Across three professional benchmarks and four model–harness configurations, a
single Harness² step improves GLM-5 and Gemini 3.5 Flash over their base
harnesses, with gains of up to 11.5 points on WorkBuddy-Bench, 4.5 points on
JobBench, and 11.8 percentage points on LAB's partial pass rate. Increasing the
task-level recursion budget brings further gains.

The release supports **parallel and sequential recursion**, **OpenCode and
Codex executors**, and **JobBench, LAB, and WorkBuddy-Bench**.

## Video overview

https://github.com/user-attachments/assets/76b10548-b14b-4c8f-9aa5-a93662df4d56

## Contents

- [Video overview](#video-overview)
- [Architecture & diagrams](docs/ARCHITECTURE.md)
- [Harness components](#harness-components)
- [Visual Web Console](#visual-web-console)
- [Install](#install)
- [Run a benchmark](#run-a-benchmark)
- [Experiments](#experiments)
- [Web access](#web-access)
- [Results and resume](#results-and-resume)
- [Citation](#citation)
- [Contributing](#contributing)
- [License](#license)
- [Disclaimer](#disclaimer)

<a id="visual-web-console"></a>
## Visual Web Console

Harness² includes an interactive visual web console to inspect the Propose–Probe–Compose recursion pipeline, component-level diffs, agent execution trajectories, and continual learning experience libraries:

```bash
uv pip install -e '.[ui]'
harness2-ui
```

The console opens automatically at `http://127.0.0.1:8520`, featuring:
- **Workbench**: Launch local demos or benchmark sweeps, with live streaming logs via Server-Sent Events (SSE).
- **Recursive Pipeline Explorer**: Interactive DAG of the Propose-Probe-Compose tree (Base -> INV/DOM -> AGG/SEQ), inspecting Proposer intentions, trajectories, deliverables, and harness component diffs.
- **Harness & Library View**: Component browser for all 8 editable components and cross-task continual learning experience timelines.
- **Benchmark Metrics**: Quantitative evaluation report, pass rates, and performance gain over baseline.

## Harness components

Harness² exposes eight editable components around the model: **system prompt,
guardrails, memory, tool guidance, subagents, skills, scripts, and plugins**.
They control context construction, the tool interface, delegation, and behavior
inside the tool loop.

<p align="center">
  <a href="assets/components.png">
    <img src="assets/components.png" alt="Eight harness components grouped by runtime role: system prompt, guardrails, memory, and skills construct context; tool guidance and scripts define the tool interface; subagents orchestrate delegated work; plugins control middleware." width="100%">
  </a>
</p>

## Install

Use **Linux, Python 3.12, and [uv](https://docs.astral.sh/uv/getting-started/installation/)**.
From the repository root:

```bash
uv venv --python 3.12 .venv
source .venv/bin/activate
uv pip install -e '.[render]'
harness2-demo --output runs/demo --k 2
```

The local demo runs both recursion modes with deterministic editors and real
Python executions. It requires no model credentials.

For model-backed benchmarks, install **Node.js 20+, the Google Cloud CLI**, and
the [benchmark dependencies](docs/SETUP.md#requirements). LAB needs Pandoc and
Poppler; WorkBuddy-Bench needs Docker. Then configure your models:

```bash
cp .env.example .env
# Edit .env with your unified API endpoint (HARNESS2_API_*) or Vertex AI project and model IDs.
gcloud auth application-default login
```

See the [setup guide](docs/SETUP.md) for unified API access (one endpoint driving all three substrates), model settings, authentication alternatives, and the [Codex executor](docs/SETUP.md#codex-executor).

## Run a benchmark

The following example installs LAB and runs one task, then evaluates and reports
its result. Model-backed runs incur API costs; start with a small task selection.

```bash
harness2 setup lab
harness2 pipeline --bench lab --preset smoke
```

`pipeline` runs check → run → judge → report with one shared identity, so you
never retype `--bench/--k/--mode/--substrate/--seed`. `--preset smoke` expands
to the documented one-task smoke test (`--only-domains
antitrust-competition --max-tasks 1`). Benchmark and substrate names accept
full spellings too: `--bench jobbench|workbuddy|harvey-labs`,
`--substrate opencode|codex`. The legacy scripts (`harness2-setup`,
`harness2-check`, `harness2-run`, `harness2-judge`, `harness2-report`) keep
working and take the same flags.

#### Execution Lifecycle at a Glance

These commands form the canonical five-stage evaluation lifecycle in Harness²:

| Stage | Command | Calls Model APIs? | Purpose & Output |
|---|---|:---:|---|
| **1. Setup** | `harness2 setup lab` | ❌ No | Clones pinned benchmark upstream, applies judge/runtime patches, and builds an isolated venv in `dependencies/harvey-labs/`. |
| **2. Preflight** | `harness2 check --bench lab` | ❌ No | Validates dependencies, system tools (e.g. Pandoc/Poppler), and `.env` credentials offline; confirms task discovery. |
| **3. Run Sweep** | `harness2 run --bench lab ...` | ✔️ Yes | **Core Execution**: Rolls out task executor sessions, refines harnesses with the improver, and records deliverables to `runs/`. |
| **4. Judge** | `harness2 judge --bench lab ...` | ✔️ Yes | Scores the blindly selected final deliverable against task rubrics using the judge model; caches results to `judged.json`. |
| **5. Report** | `harness2 report --bench lab ...` | ❌ No | Offline aggregation: parses `judged.json` and summaries to display pass rates, scores, and USD costs in a clean table. |

Prefer one command? `harness2 pipeline --bench lab --preset smoke` runs all
five stages with a single shared identity (add `--dry-run` to preview, or
`--skip-judge` to stop after the sweep).

> [!TIP]
> **Smoke Test Flags Explained**:
> - `--preset smoke`: The one-task smoke test in a single flag. Expands to `--only-domains antitrust-competition --max-tasks 1` on LAB (`biostatisticians` on JobBench, `doc-ops` on WorkBuddy with `--subset office`); any explicit flag wins over the preset.
> - `--only-domains antitrust-competition`: Restricts the sweep to a single practice area, skipping others.
> - `--max-tasks 1`: Limits the run to the first task of the domain, verifying the end-to-end pipeline at minimal cost and time.
> - Identity flags (`--bench`, `--k`, `--mode`, `--substrate`, `--seed`) are typed once for `pipeline`, or must remain identical across the `run`, `judge`, and `report` steps to locate the matching run namespace.

Sequential recursion runs the same commands with `--mode sequential`. `--k` is
the task-level recursion budget; see [Experiments](#experiments). Judging and
reporting must use the same benchmark, executor, subset, `--k`, `--mode`, and
seed as the refinement run. Add `--dry-run` to `harness2` to preview task
selection without model calls.

| Benchmark | Tasks | Install | Guide |
|---|---|---|---|
| JobBench | Professional work | `harness2 setup jb` | [JobBench](docs/BENCHMARKS.md#jobbench) |
| LAB | Legal work | `harness2 setup lab` | [LAB](docs/BENCHMARKS.md#lab) |
| WorkBuddy-Bench | Office, web, and code | `harness2 setup wb` | [WorkBuddy](docs/BENCHMARKS.md#workbuddy-bench) |

Choose one benchmark per command. WorkBuddy also takes `--subset office`,
`--subset web`, or `--subset code` on every command after setup. The
[benchmark guides](docs/BENCHMARKS.md) cover each one's data, domains, and
grading.

## Experiments

Scale task-level recursion in two ways: **parallel recursion** explores multiple
candidate harnesses and composes refinements from their execution evidence;
**sequential recursion** carries the refined harness and accumulated evidence
through successive Propose–Probe–Compose steps.

<p align="center">
  <a href="assets/harness2_recursion_modes.png">
    <img src="assets/harness2_recursion_modes.png" alt="Two ways to scale task-level recursion. Parallel: probe k general and k domain-specific candidate harnesses, then produce k compositions from the shared evidence. Sequential: carry the refined harness and accumulated evidence through k Propose–Probe–Compose steps." width="100%">
  </a>
</p>
<p align="center"><em>Parallel recursion explores wider; sequential recursion refines deeper.</em></p>

| Option | Behavior |
|---|---|
| `--k 1` | One Propose–Probe–Compose step |
| `--k K --mode parallel` | Probe `K` general and `K` domain-specific candidates, then produce `K` compositions |
| `--k K --mode sequential` | Refine the harness through `K` successive steps |
| `--substrate cx` | Use Codex instead of the default OpenCode executor |

After each task, harnessing-level recursion retains the adopted harness and
evidence-supported lessons to guide future refinement. See the
[experiment guide](docs/EXPERIMENTS.md) for task selection, concurrency,
reproducibility, and baseline comparisons.

## Web access

Executor network access is unrestricted, and Codex runs with its sandbox
disabled. Public benchmark rubrics may be accessible online. Before evaluation,
configure [network restrictions](docs/EXPERIMENTS.md#web-access) to prevent
access to benchmark answers and grading criteria.

## Results and resume

Results are saved under `runs/`, organized by benchmark and subset where
applicable. They include task summaries, deliverables, adopted harnesses,
reflection notes, and evaluation results.

Repeat the same command to resume. Use a new `HARNESS2_RUNS_DIR` when changing
models or task selection. See [results and resume](docs/EXPERIMENTS.md#results-and-resume)
for details; each command also supports `--help`.

## Acknowledgements

SecAgentHarness² (SecAgentHarness2) is developed based on and derived from [Google Research's Harness²](https://github.com/google-research/harness2) project. We express our deep appreciation to the Google Research author team for open-sourcing the foundational recursive harnessing architecture and methodology. Please see [NOTICE](NOTICE) for license and provenance notices.

## Citation

```bibtex
@article{xu2026harness2,
  title   = {Harness$^2$: Recursive Agent Harnessing for an Open World},
  author  = {Xu, Ruiyao and Chen, Yanfei and CuiZhu, Zhongying and Dalvi Mishra, Bhavana and Ming, Yifei and Yu, Han and Han, Rujun and Lee, Chen-Yu and Pfister, Tomas},
  journal = {arXiv preprint arXiv:2610.14224},
  year    = {2026},
  url     = {https://arxiv.org/abs/2610.14224}
}
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Harness² is licensed under [Apache 2.0](LICENSE). Third-party code under
[`third_party/`](third_party/README.md), benchmarks, and datasets retain their
upstream licenses; see
[third-party notices](dependencies/README.md).

## Disclaimer

This is not an officially supported Google product. This project is not eligible
for the [Google Open Source Software Vulnerability Rewards Program](https://bughunters.google.com/open-source-security).
