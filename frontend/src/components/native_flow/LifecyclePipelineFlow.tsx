import React from 'react';
import {
  Shield,
  Terminal,
  Brain,
  GitBranch,
  RotateCcw,
  CheckCircle2,
  Play,
  Sparkles,
  Zap,
  Database,
} from 'lucide-react';
import { FlowNode } from './flowTypes';
import { FlowNodeCard } from './FlowNodeCard';
import { ComponentCategory } from '../../types';

interface LifecyclePipelineFlowProps {
  selectedNodeId?: string;
  onSelectNode: (node: FlowNode) => void;
  onSelectComponent?: (code: ComponentCategory) => void;
  lang?: 'zh' | 'en';
  mode?: 'parallel' | 'sequential';
  activeStepIndex?: number | null;
}

export const LIFECYCLE_NODES: FlowNode[] = [
  // Stage 1
  {
    id: 's1-task-in',
    stage: 1,
    stepIndex: 0,
    branch: 'main',
    titleZh: '任务规格与隔离接入',
    titleEn: 'Task Inflow & Spec Seam',
    subtitleZh: 'Task ID + Domain Tag',
    subtitleEn: 'Task ID + Domain Tag',
    badge: '规格接缝',
    code: 'Spec',
    category: 'entry',
    icon: TargetIcon,
    filePath: 'backend/sec_agent_harness2/core/spec.py',
    formula: '\\text{TaskSpec} = \\langle id, \\text{domain}, \\text{fixtures} \\rangle',
    formulaExplanationZh: '评测任务规格定义为任务 ID、业务领域标签及基准测试用例构成的不可变元组，隔离真实标注。',
    formulaExplanationEn: 'Defines task spec as an immutable tuple of ID, domain label, and fixtures with strict ground-truth isolation.',
    descriptionZh: '接收外部评测任务定义。严格隔离评测标准答案（Ground Truth），初始化独立的沙箱物理执行目录与安全环境变量。',
    descriptionEn: 'Receives task specification, ensuring strict isolation from ground-truth graders and provisioning sandbox.',
    inputsZh: ['任务 ID', '领域标签 (accounting, lab, cve)', '基础测试用例'],
    inputsEn: ['Task ID', 'Domain tag', 'Baseline test fixtures'],
    outputsZh: ['沙箱临时目录', '只读环境变量集合'],
    outputsEn: ['Isolated sandbox path', 'Readonly env vars'],
    componentCodes: ['c9'],
  },
  {
    id: 's1-prior-lib',
    stage: 1,
    stepIndex: 1,
    branch: 'main',
    titleZh: '加载领域经验库先验',
    titleEn: 'Prior Domain Library',
    subtitleZh: 'INDEX.md / EXPERIENCE.md',
    subtitleEn: 'INDEX.md / EXPERIENCE.md',
    badge: '经验先验',
    code: 'Prior',
    category: 'memory',
    icon: Database,
    filePath: 'backend/sec_agent_harness2/core/library.py',
    formula: '\\mathcal{L}_{domain} \\hookrightarrow \\text{ColdStart Context}',
    formulaExplanationZh: '将同领域沉淀的高置信度经验库 𝔏 注入当前任务的冷启动先验，实现跨任务知识正向迁移。',
    formulaExplanationEn: 'Injects high-confidence domain memory into warm-start prompt to enable cross-task knowledge transfer.',
    descriptionZh: '加载同领域之前所有已完成任务累积沉淀的高置信度经验三元组（情景 / 核心原则 / 实证依据），为本次任务提供冷启动先验指导。',
    descriptionEn: 'Retrieves verified cross-task experience triples from domain library to provide warm-start priors for the current task.',
    invariantsZh: ['探针探索期间经验库处于锁定只读状态', '过滤低置信度条目，防止负迁移'],
    invariantsEn: ['Readonly during rollout', 'Filters low-confidence items'],
    actionTab: 'library',
    actionLabelZh: '查看领域经验库',
    actionLabelEn: 'View Domain Library',
    componentCodes: ['c3'],
  },
  {
    id: 's1-base-roll',
    stage: 1,
    stepIndex: 2,
    branch: 'main',
    titleZh: '基线探针试跑 (Base)',
    titleEn: 'Baseline Probe Rollout',
    subtitleZh: '_roll_bases() 初始轨迹采样',
    subtitleEn: '_roll_bases() Baseline Probe',
    badge: '基线探针',
    code: 'Base',
    category: 'probe',
    icon: Play,
    filePath: 'backend/sec_agent_harness2/core/recursion.py',
    formula: 'H_{base} \\xrightarrow{\\text{roll\\_bases}()} \\text{RunView}_{base}',
    formulaExplanationZh: '基线套件 H_base 经由沙箱基线探针试跑，采样出未优化的基线运行视图 RunView_base（含初始轨迹与报错切片）。',
    formulaExplanationEn: 'Rolls out unmodified baseline harness H_base to collect reference run view, errors, and traces.',
    descriptionZh: '将未经改写的原始套件物化到执行器沙箱中执行一次基线试跑，采集原始轨迹、工具调用日志、报错切片与基准产物。',
    descriptionEn: 'Materializes baseline un-optimized harness tree into sandbox and executes base probe to gather reference trajectory.',
    outputsZh: ['基准运行轨迹 trajectory.jsonl', '初始产物交付物切片', '基线耗时与 Token 成本'],
    outputsEn: ['Base trajectory.jsonl', 'Baseline deliverables', 'Base token cost'],
    actionTab: 'workbench',
    actionLabelZh: '前往工作台调度',
    actionLabelEn: 'Workbench Control',
  },

  // Stage 2
  {
    id: 's2-context-build',
    stage: 2,
    stepIndex: 3,
    branch: 'main',
    titleZh: '对比证据包组装',
    titleEn: 'Contrastive Evidence Pack',
    subtitleZh: 'context.build() 差异切片',
    subtitleEn: 'context.build() Evidence Pack',
    badge: '对比证据包',
    code: 'Evid',
    category: 'core',
    icon: Sparkles,
    filePath: 'backend/sec_agent_harness2/core/context.py',
    formula: '\\text{Context} = \\text{Traj}_{base} \\oplus \\text{ToolErrors} \\oplus \\mathcal{L}_{domain}',
    formulaExplanationZh: '对比证据包将基线轨迹、工具异常切片与领域先验进行正交拼接 (⊕)，为后续改写器提供精准诊断依据。',
    formulaExplanationEn: 'Composes baseline trajectory, tool error slices, and domain memory into structured contrastive evidence.',
    descriptionZh: '将基线轨迹、工具报错切片、组件差异及前序领域经验组装成结构化对比证据上下文，为 INV/DOM 改写器提供精准诊断依据。',
    descriptionEn: 'Aggregates baseline trajectory, tool failure slices, component diffs, and domain library into contrastive evidence.',
    invariantsZh: ['严密扫描组件树，防止评分标准或判题结果渗入改写上下文'],
    invariantsEn: ['Strictly assert_tree_has_no_grader_verdicts() to prevent leakage'],
  },
  {
    id: 's2-inv-levers',
    stage: 2,
    stepIndex: 4,
    branch: 'inv',
    titleZh: '通用工程杠杆提议 (INV)',
    titleEn: 'Invariant Levers (INV)',
    subtitleZh: 'c1:提示词 · c2:护栏 · c4:工具契约',
    subtitleEn: 'c1:Prompt · c2:Guardrails · c4:Guidance',
    badge: 'INV 杠杆',
    code: 'INV',
    category: 'propose',
    icon: Shield,
    filePath: 'backend/sec_agent_harness2/core/proposer.py',
    formula: '\\text{INV} \\colon (c1, c2, c4) \\mapsto \\{H_{inv}^1, \\dots, H_{inv}^k\\}',
    formulaExplanationZh: '通用不变式改写器：作用于顶层提示词 (c1)、安全护栏 (c2) 与工具指引 (c4)，提议 k 个跨任务通用的防御与约束套件。',
    formulaExplanationEn: 'Invariant proposer mapping prompt (c1), guardrails (c2), and tool guidance (c4) into k cross-task invariant harnesses.',
    descriptionZh: '针对跨任务的系统共性，优化顶层提示词规范、行为安全护栏与标准工具指引，消除幻觉与执行歧义，施加负面安全约束。',
    descriptionEn: 'Refines high-level system prompts, guardrails, and tool contracts to enforce safety and eliminate ambiguity.',
    actionTab: 'studio',
    actionLabelZh: '在组件工作室调试 c1/c2/c4',
    actionLabelEn: 'View c1/c2/c4 in Studio',
    componentCodes: ['c1', 'c2', 'c4'],
  },
  {
    id: 's2-dom-levers',
    stage: 2,
    stepIndex: 5,
    branch: 'dom',
    titleZh: '业务领域杠杆提议 (DOM)',
    titleEn: 'Domain Levers (DOM)',
    subtitleZh: 'c5:子智能体 · c6:技能 · c7:脚本 · c8:钩子',
    subtitleEn: 'c5:Subagents · c6:Skills · c7:Scripts · c8:Hooks',
    badge: 'DOM 杠杆',
    code: 'DOM',
    category: 'propose',
    icon: Terminal,
    filePath: 'backend/sec_agent_harness2/core/proposer.py',
    formula: '\\text{DOM} \\colon (c5, c6, c7, c8) \\mapsto \\{H_{dom}^1, \\dots, H_{dom}^k\\}',
    formulaExplanationZh: '业务领域改写器：作用于子智能体 (c5)、技能手册 (c6)、辅助脚本 (c7) 与钩子 (c8)，提议 k 个领域专家型增强套件。',
    formulaExplanationEn: 'Domain proposer synthesizing specialized skills (c6), scripts (c7), hooks (c8), and subagents (c5) into k candidate harnesses.',
    descriptionZh: '深入具体业务领域，生成专属技能手册 (SKILL.md)、自动化 Python 辅助脚本、生命周期拦截插件与专家子智能体。',
    descriptionEn: 'Synthesizes specialized skills, helper scripts, plugins, and delegated subagents for domain challenges.',
    actionTab: 'studio',
    actionLabelZh: '在组件工作室调试 c5~c8',
    actionLabelEn: 'View c5~c8 in Studio',
    componentCodes: ['c5', 'c6', 'c7', 'c8'],
  },
  {
    id: 's2-validation-gate',
    stage: 2,
    stepIndex: 6,
    branch: 'main',
    titleZh: 'SurfaceSpec 规范检验网关',
    titleEn: 'SurfaceSpec Validation Gate',
    subtitleZh: '语法校验 + 1次带错重试 (a2)',
    subtitleEn: 'Syntax Gate + 1-Shot Retry (a2)',
    badge: '规范安全门',
    code: 'Gate',
    category: 'core',
    icon: CheckCircle2,
    filePath: 'backend/sec_agent_harness2/core/tree.py',
    formula: '\\text{Validate}(H) \\in \\{\\text{Valid}, \\text{Retry}, \\text{Fallback}\\}',
    formulaExplanationZh: 'SurfaceSpec 规范网关：对候选套件实行语法与配额断言；语法错误给予 1 次带错反思重试，多次失败则自动降级回退基线。',
    formulaExplanationEn: 'SurfaceSpec syntax and budget validator allowing 1-shot reflection retry before safe fallback to baseline.',
    descriptionZh: '强制审查所有改写套件的合法性（文件相对路径合规、系统核心脚本不受篡改、字符预算配额）。语法违规提供 1 次带错修正重试。',
    descriptionEn: 'Validates syntax, path constraints, and quotas. Triggers 1-shot retry on syntax violation before baseline fallback.',
    invariantsZh: ['保护系统保护文件免受恶意覆盖', '字符预算严格硬限制（≤ 4,000 字符）'],
    invariantsEn: ['Protection of system reserved files', 'Hard limits on token character budgets'],
  },
  {
    id: 's2-probe-exec',
    stage: 2,
    stepIndex: 7,
    branch: 'main',
    titleZh: '沙箱并发探针试跑',
    titleEn: 'Probe Rollouts',
    subtitleZh: '_roll_many() 隔离探针执行',
    subtitleEn: '_roll_many() Isolated Probes',
    badge: '并发探针',
    code: 'Probe',
    category: 'probe',
    icon: Zap,
    filePath: 'backend/sec_agent_harness2/core/recursion.py',
    formula: '\\{H_{inv}, H_{dom}\\} \\xrightarrow{\\text{roll\\_many}()} \\{\\text{RunView}_{cand}\\}',
    formulaExplanationZh: '隔离沙箱并发探针：在物理隔离的沙箱中并行试跑所有合法候选，收集包含动作轨迹、工具日志与中间产物的运行视图。',
    formulaExplanationEn: 'Executes all validated candidate harnesses concurrently in isolated sandboxes to gather telemetry and deliverables.',
    descriptionZh: '在彼此物理隔离的临时沙箱中并发试跑所有 INV 与 DOM 候选套件，实时收集各候选的执行轨迹、产出结果与工具响应日志。',
    descriptionEn: 'Runs all candidate harnesses in physical isolated execution sandboxes concurrently to gather behavior traces.',
    actionTab: 'pipeline',
    actionLabelZh: '查看探针执行轨迹',
    actionLabelEn: 'View Trajectories',
  },

  // Stage 3
  {
    id: 's3-compose-choice',
    stage: 3,
    stepIndex: 8,
    branch: 'main',
    titleZh: '组合合成与模式分支',
    titleEn: 'Composition Engine',
    subtitleZh: '并行聚合 (agg) 或 串行精炼 (seq)',
    subtitleEn: 'Parallel (agg) vs Sequential (seq)',
    badge: '合成引擎',
    code: 'Compose',
    category: 'compose',
    icon: GitBranch,
    filePath: 'backend/sec_agent_harness2/core/recursion.py',
    formula: '\\text{agg} \\colon \\{H_{inv}, H_{dom}\\} \\mapsto \\{H_{agg}^1, \\dots, H_{agg}^k\\} \\quad | \\quad \\text{seq} \\colon c_{t-1} \\mapsto c_t',
    formulaExplanationZh: '合成模式分支：并行聚合 (agg) 跨轨道融合 INV 与 DOM 优势构建 k 个综合套件；串行模式 (seq) 在前一轮套件基础上持续深化演进。',
    formulaExplanationEn: 'Composition engine: parallel (agg) aggregates invariant and domain wins, while sequential (seq) iteratively deepens components.',
    descriptionZh: '合成器横向对比各路探针表现，剔除退化缺陷并吸收优势修改。并行模式聚合出 k 路精炼套件；串行模式开展 k 轮深化演进。',
    descriptionEn: 'Synthesizes probe advantages, drops regressions, and produces refined final candidate harnesses.',
    actionTab: 'pipeline',
    actionLabelZh: '查看融合拓扑',
    actionLabelEn: 'Pipeline View',
  },

  // Stage 4
  {
    id: 's4-blind-judge',
    stage: 4,
    stepIndex: 9,
    branch: 'main',
    titleZh: '零标注无监督盲选决策',
    titleEn: 'Zero-GT Blind Selection Gate',
    subtitleZh: 'assign_ids() 确定性哈希打乱',
    subtitleEn: 'assign_ids() Hash Shuffle Judge',
    badge: '无监督盲审',
    code: 'Judge',
    category: 'judge',
    icon: CheckCircle2,
    filePath: 'backend/sec_agent_harness2/core/selection.py',
    formula: '\\text{Candidates} \\xrightarrow{\\text{hash\\_shuffle}} \\{A, B, C\\} \\xrightarrow{\\text{LLM}(\\text{Deliverables})} \\text{chosen\\_label}',
    formulaExplanationZh: '零真值盲审裁决：将所有候选套件通过确定性哈希混淆映射为无标签集合 {A, B, C}，由终审大模型仅基于交付物自洽性裁决胜出者。',
    formulaExplanationEn: 'Zero-GT blind gate: applies deterministic hash shuffling to eliminate bias, selecting winning label purely from final deliverables.',
    descriptionZh: '通过确定性哈希打乱匿名化为 A, B, C... 彻底消除命名与位置偏见。终审模型纯粹基于最终交付物的自洽性与完整性选出胜出套件 (chosen_label)。',
    descriptionEn: 'Eliminates position bias via deterministic hash mapping. Judge LLM decides winning harness purely from deliverables with 0 GT.',
    invariantsZh: ['绝对无监督：严格禁止在裁决时调用基准测试标准答案或判分器'],
    invariantsEn: ['Zero Ground Truth: never leaks unit test assertions into selection prompt'],
  },

  // Stage 5
  {
    id: 's5-reflector',
    stage: 5,
    stepIndex: 10,
    branch: 'main',
    titleZh: '经验反思提炼 (Reflector)',
    titleEn: 'Experience Reflector',
    subtitleZh: '三元组：情景 + 原则 + 证据',
    subtitleEn: 'Cue + Lesson + Evidence',
    badge: '经验递归',
    code: 'Reflect',
    category: 'memory',
    icon: Brain,
    filePath: 'backend/sec_agent_harness2/core/library.py',
    formula: '\\text{Run}_{chosen} \\xrightarrow{\\text{Reflector}} \\langle \\text{Cue}, \\text{Lesson}, \\text{Evidence} \\rangle',
    formulaExplanationZh: '经验反思器：对胜出套件在实际测试中的成功轨迹开展反思，归纳出触发情景 (Cue)、核心教训 (Lesson) 与量化实证 (Evidence) 三元组。',
    formulaExplanationEn: 'Experience reflector: extracts structured triple (Cue, Lesson, Evidence) from winning harness trajectory for persistence.',
    descriptionZh: '从最终采纳的胜出套件与执行轨迹中提炼出结构化经验三元组：触发情景 (Cue) + 核心原则 (Lesson) + 客观实证依据 (Evidence)。',
    descriptionEn: 'Distills winning harness into structured triple: Cue + Lesson + Evidence for future tasks.',
    actionTab: 'library',
    actionLabelZh: '前往经验知识库',
    actionLabelEn: 'Experience Library',
    componentCodes: ['c3'],
  },
  {
    id: 's5-update-lib',
    stage: 5,
    stepIndex: 11,
    branch: 'main',
    titleZh: '沉淀至领域经验库（闭环）',
    titleEn: 'Domain Library Persistence',
    subtitleZh: '写入 INDEX.md 与 EXPERIENCE.md',
    subtitleEn: 'Updates domain INDEX.md',
    badge: '持久化记忆',
    code: 'Persist',
    category: 'memory',
    icon: RotateCcw,
    filePath: 'backend/sec_agent_harness2/core/library.py',
    formula: '\\langle \\text{Cue}, \\text{Lesson}, \\text{Evidence} \\rangle \\hookrightarrow \\mathcal{L}_{domain} \\to \\text{Task}_{next}',
    formulaExplanationZh: '经验闭环沉淀：将三元组原子化写入领域 INDEX.md 知识库，在未来的同领域任务中作为冷启动先验回流，完成双层递归大闭环！',
    formulaExplanationEn: 'Persists distilled knowledge triple into domain INDEX.md, feeding warm-start priors into next task to close the evolution loop.',
    descriptionZh: '将提炼出的经验固化写入该领域的 INDEX.md。在同领域后续任务启动时自动载入，完成从单任务向系统级的双层递归闭环！',
    descriptionEn: 'Commits refined knowledge into domain INDEX.md, automatically injecting priors into future tasks for a closed recursive loop.',
    actionTab: 'library',
    actionLabelZh: '查看领域经验池',
    actionLabelEn: 'View Domain Library',
    componentCodes: ['c3'],
  },
];

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export const LifecyclePipelineFlow: React.FC<LifecyclePipelineFlowProps> = ({
  selectedNodeId,
  onSelectNode,
  onSelectComponent,
  lang = 'zh',
  mode = 'parallel',
  activeStepIndex = null,
}) => {
  const isZh = lang === 'zh';
  const getNode = (id: string) => LIFECYCLE_NODES.find((n) => n.id === id)!;

  const isStepActive = (stepIdx?: number) =>
    activeStepIndex !== null && stepIdx !== undefined && activeStepIndex === stepIdx;

  return (
    <div className="space-y-6 select-none">
      {/* 1. TOP OVERHEAD CLOSED-LOOP CONDUIT (S5 ➔ S1 跨任务递归闭环) */}
      <div className="relative rounded-2xl p-4 bg-gradient-to-r from-sky-500/10 via-purple-600/15 to-indigo-500/10 border border-purple-300/40 dark:border-purple-800/60 shadow-lg backdrop-blur overflow-hidden">
        {/* Animated dynamic reverse beam */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-purple-400 to-indigo-400 opacity-80" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0 animate-spin-slow">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-600 dark:text-purple-300">
                  {isZh ? '套件级跨任务递归闭环回路' : 'Cross-Task Harnessing Closed Loop'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-200 border border-purple-200 dark:border-purple-700">
                  FEEDFORWARD ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {isZh
                  ? 'Stage 5 提炼的高置信度经验三元组将自动持久化回写至 INDEX.md，直接作为 Stage 1 冷启动先验无缝注入同领域下一任务！'
                  : 'High-confidence lessons refined in Stage 5 persist back to domain INDEX.md, feeding cold-start priors into Stage 1 of future tasks!'}
              </p>
            </div>
          </div>

          {/* Graphical Pipeline Loop Tube */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-slate-900/80 border border-purple-200 dark:border-purple-800 text-[11px] font-mono text-purple-700 dark:text-purple-300">
            <span>Stage 5 反思沉淀</span>
            <svg className="w-24 h-4 text-purple-500" viewBox="0 0 100 16">
              <line
                x1="100"
                y1="8"
                x2="0"
                y2="8"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="animate-flow-dash-reverse"
              />
              <polygon points="4,4 0,8 4,12" fill="currentColor" />
            </svg>
            <span className="font-bold text-sky-600 dark:text-sky-400">Stage 1 先验继承</span>
          </div>
        </div>
      </div>

      {/* 2. HORIZONTAL METRO PIPELINE WORKFLOW (STAGE 1 ~ 5) */}
      <div className="overflow-x-auto pb-4 pt-1">
        <div className="min-w-[1280px] grid grid-cols-5 gap-4 items-start">
          {/* ========================================================
              COLUMN 1: STAGE 1 (任务接入与冷启动采样)
              ======================================================== */}
          <div className="relative rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-sky-200 dark:border-sky-900/50 p-4 shadow-sm dark:shadow-xl backdrop-blur flex flex-col gap-3 min-h-[680px]">
            {/* Stage Header */}
            <div className="flex items-center justify-between pb-3 border-b border-sky-100 dark:border-sky-900/40">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-sky-500 text-white font-mono font-bold text-xs flex items-center justify-center shadow-sm">
                  1
                </span>
                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  {isZh ? '任务接入与基线采样' : 'Stage 1 · Baseline'}
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                {isZh ? '冷启动' : 'Cold Start'}
              </span>
            </div>

            {/* Stage Nodes */}
            <div className="space-y-3 flex-1 flex flex-col justify-between">
              <FlowNodeCard
                node={getNode('s1-task-in')}
                isSelected={selectedNodeId === 's1-task-in'}
                isWalkthroughActive={isStepActive(0)}
                onClick={() => onSelectNode(getNode('s1-task-in'))}
                onSelectComponent={onSelectComponent}
                lang={lang}
              />

              {/* Inner connector */}
              <div className="flex justify-center items-center py-0.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-sky-600 dark:text-sky-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping" />
                  <span>{isZh ? '注入历史先验' : 'Inject Prior'}</span>
                </div>
              </div>

              <FlowNodeCard
                node={getNode('s1-prior-lib')}
                isSelected={selectedNodeId === 's1-prior-lib'}
                isWalkthroughActive={isStepActive(1)}
                onClick={() => onSelectNode(getNode('s1-prior-lib'))}
                onSelectComponent={onSelectComponent}
                lang={lang}
              />

              {/* Inner connector */}
              <div className="flex justify-center items-center py-0.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-sky-600 dark:text-sky-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  <span>{isZh ? '物化基线' : 'Materialize'}</span>
                </div>
              </div>

              <FlowNodeCard
                node={getNode('s1-base-roll')}
                isSelected={selectedNodeId === 's1-base-roll'}
                isWalkthroughActive={isStepActive(2)}
                onClick={() => onSelectNode(getNode('s1-base-roll'))}
                onSelectComponent={onSelectComponent}
                lang={lang}
              />
            </div>

            {/* Stage Output Tag */}
            <div className="pt-2 border-t border-sky-100 dark:border-sky-900/40 text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>{isZh ? '产出：基线轨迹' : 'Out: Base Trajectory'}</span>
              <span className="text-sky-600 dark:text-sky-400 font-bold">➔ S2</span>
            </div>
          </div>

          {/* ========================================================
              COLUMN 2: STAGE 2 (任务级递归：提议与双轴探针试跑)
              ======================================================== */}
          <div className="relative rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-blue-200 dark:border-blue-900/50 p-4 shadow-sm dark:shadow-xl backdrop-blur flex flex-col gap-3 min-h-[680px]">
            {/* Stage Header */}
            <div className="flex items-center justify-between pb-3 border-b border-blue-100 dark:border-blue-900/40">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center shadow-sm">
                  2
                </span>
                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  {isZh ? '任务级递归：提议与探针' : 'Stage 2 · Propose–Probe'}
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {isZh ? '双轴杠杆' : 'INV & DOM'}
              </span>
            </div>

            {/* Context Pack */}
            <FlowNodeCard
              node={getNode('s2-context-build')}
              isSelected={selectedNodeId === 's2-context-build'}
              isWalkthroughActive={isStepActive(3)}
              onClick={() => onSelectNode(getNode('s2-context-build'))}
              onSelectComponent={onSelectComponent}
              lang={lang}
              compact
            />

            {/* Fork into Two Lever Tracks */}
            <div className="space-y-2 flex-1 flex flex-col justify-center">
              {/* INV Upper Lever */}
              <div className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-blue-500" />
                    <span>{isZh ? '不变性杠杆 (INV)' : 'Invariant (INV)'}</span>
                  </span>
                  <span className="text-[9px] font-mono bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded">
                    c1, c2, c4
                  </span>
                </div>
                <FlowNodeCard
                  node={getNode('s2-inv-levers')}
                  isSelected={selectedNodeId === 's2-inv-levers'}
                  isWalkthroughActive={isStepActive(4)}
                  onClick={() => onSelectNode(getNode('s2-inv-levers'))}
                  onSelectComponent={onSelectComponent}
                  lang={lang}
                  compact
                />
              </div>

              {/* DOM Lower Lever */}
              <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  <span className="flex items-center gap-1">
                    <Terminal className="w-3.5 h-3.5 text-amber-500" />
                    <span>{isZh ? '领域性杠杆 (DOM)' : 'Domain (DOM)'}</span>
                  </span>
                  <span className="text-[9px] font-mono bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded">
                    c5, c6, c7, c8
                  </span>
                </div>
                <FlowNodeCard
                  node={getNode('s2-dom-levers')}
                  isSelected={selectedNodeId === 's2-dom-levers'}
                  isWalkthroughActive={isStepActive(5)}
                  onClick={() => onSelectNode(getNode('s2-dom-levers'))}
                  onSelectComponent={onSelectComponent}
                  lang={lang}
                  compact
                />
              </div>
            </div>

            {/* Validation Gate & Probes Execution */}
            <div className="space-y-2">
              <FlowNodeCard
                node={getNode('s2-validation-gate')}
                isSelected={selectedNodeId === 's2-validation-gate'}
                isWalkthroughActive={isStepActive(6)}
                onClick={() => onSelectNode(getNode('s2-validation-gate'))}
                onSelectComponent={onSelectComponent}
                lang={lang}
                compact
              />

              <FlowNodeCard
                node={getNode('s2-probe-exec')}
                isSelected={selectedNodeId === 's2-probe-exec'}
                isWalkthroughActive={isStepActive(7)}
                onClick={() => onSelectNode(getNode('s2-probe-exec'))}
                onSelectComponent={onSelectComponent}
                lang={lang}
                compact
              />
            </div>

            {/* Stage Output Tag */}
            <div className="pt-2 border-t border-blue-100 dark:border-blue-900/40 text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>{isZh ? '产出：2k 路探针轨迹' : 'Out: 2k Probe Traces'}</span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">➔ S3</span>
            </div>
          </div>

          {/* ========================================================
              COLUMN 3: STAGE 3 (组合融合与精炼)
              ======================================================== */}
          <div className="relative rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-indigo-200 dark:border-indigo-900/50 p-4 shadow-sm dark:shadow-xl backdrop-blur flex flex-col gap-3 min-h-[680px]">
            {/* Stage Header */}
            <div className="flex items-center justify-between pb-3 border-b border-indigo-100 dark:border-indigo-900/40">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-mono font-bold text-xs flex items-center justify-center shadow-sm">
                  3
                </span>
                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  {isZh ? '组合融合与深化' : 'Stage 3 · Compose'}
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {mode === 'parallel' ? 'agg 并行' : 'seq 串行'}
              </span>
            </div>

            {/* Mode Visual Indicator Card */}
            <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-300 space-y-1.5">
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-indigo-500" />
                  <span>{mode === 'parallel' ? (isZh ? '并行聚合模式' : 'Parallel Mode') : (isZh ? '串行深化模式' : 'Sequential Mode')}</span>
                </span>
                <span className="font-mono text-[10px] bg-indigo-100 dark:bg-indigo-900 px-1.5 py-0.5 rounded">
                  {mode === 'parallel' ? 'k 预算融合' : 'k 轮演进'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {mode === 'parallel'
                  ? (isZh
                      ? '由独立合成器横向对比 INV 与 DOM 探针轨迹，剔除退化缺陷，融合出 k 候选精炼套件。'
                      : 'Synthesizes advantageous changes across parallel INV/DOM traces to output k refined harnesses.')
                  : (isZh
                      ? '在上一轮胜出套件基础上逐轮推进深化，开展自适应多轮迭代演进。'
                      : 'Iteratively applies progressive refinements over successive rounds from prior winners.')}
              </p>
            </div>

            {/* Compose Core Node */}
            <div className="flex-1 flex flex-col justify-center">
              <FlowNodeCard
                node={getNode('s3-compose-choice')}
                isSelected={selectedNodeId === 's3-compose-choice'}
                isWalkthroughActive={isStepActive(8)}
                onClick={() => onSelectNode(getNode('s3-compose-choice'))}
                onSelectComponent={onSelectComponent}
                lang={lang}
              />
            </div>

            {/* Stage Output Tag */}
            <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/40 text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>{isZh ? '产出：候选交付物' : 'Out: Candidates'}</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">➔ S4</span>
            </div>
          </div>

          {/* ========================================================
              COLUMN 4: STAGE 4 (零真值无监督盲审决策)
              ======================================================== */}
          <div className="relative rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-900/50 p-4 shadow-sm dark:shadow-xl backdrop-blur flex flex-col gap-3 min-h-[680px]">
            {/* Stage Header */}
            <div className="flex items-center justify-between pb-3 border-b border-emerald-100 dark:border-emerald-900/40">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center shadow-sm">
                  4
                </span>
                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  {isZh ? '无监督盲审裁决' : 'Stage 4 · Blind Selection'}
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                0 Ground Truth
              </span>
            </div>

            {/* Zero GT Banner */}
            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{isZh ? '严密隔离评测标答' : 'Zero GT Leakage Gate'}</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {isZh
                  ? '确定性哈希打乱为 A, B, C...，裁决模型纯粹依据交付物自洽性盲审选出胜者。'
                  : 'Deterministic hash shuffle eliminates position bias; LLM judges winning deliverables with zero leak.'}
              </p>
            </div>

            {/* Core Judge Node */}
            <div className="flex-1 flex flex-col justify-center">
              <FlowNodeCard
                node={getNode('s4-blind-judge')}
                isSelected={selectedNodeId === 's4-blind-judge'}
                isWalkthroughActive={isStepActive(9)}
                onClick={() => onSelectNode(getNode('s4-blind-judge'))}
                onSelectComponent={onSelectComponent}
                lang={lang}
              />
            </div>

            {/* Stage Output Tag */}
            <div className="pt-2 border-t border-emerald-100 dark:border-emerald-900/40 text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>{isZh ? '胜出采纳套件 (chosen)' : 'Out: chosen_label'}</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">➔ S5</span>
            </div>
          </div>

          {/* ========================================================
              COLUMN 5: STAGE 5 (经验反思与跨任务持续进化)
              ======================================================== */}
          <div className="relative rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-purple-200 dark:border-purple-900/50 p-4 shadow-sm dark:shadow-xl backdrop-blur flex flex-col gap-3 min-h-[680px]">
            {/* Stage Header */}
            <div className="flex items-center justify-between pb-3 border-b border-purple-100 dark:border-purple-900/40">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-purple-600 text-white font-mono font-bold text-xs flex items-center justify-center shadow-sm">
                  5
                </span>
                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  {isZh ? '经验反思与闭环沉淀' : 'Stage 5 · Reflection'}
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                {isZh ? '套件级递归' : 'Harness Recursion'}
              </span>
            </div>

            {/* Stage Nodes */}
            <div className="space-y-3 flex-1 flex flex-col justify-between">
              <FlowNodeCard
                node={getNode('s5-reflector')}
                isSelected={selectedNodeId === 's5-reflector'}
                isWalkthroughActive={isStepActive(10)}
                onClick={() => onSelectNode(getNode('s5-reflector'))}
                onSelectComponent={onSelectComponent}
                lang={lang}
              />

              {/* Loop back indicator */}
              <div className="flex justify-center items-center py-0.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-purple-600 dark:text-purple-400">
                  <RotateCcw className="w-3.5 h-3.5 animate-spin-slow" />
                  <span>{isZh ? '固化至知识库' : 'Persist to Library'}</span>
                </div>
              </div>

              <FlowNodeCard
                node={getNode('s5-update-lib')}
                isSelected={selectedNodeId === 's5-update-lib'}
                isWalkthroughActive={isStepActive(11)}
                onClick={() => onSelectNode(getNode('s5-update-lib'))}
                onSelectComponent={onSelectComponent}
                lang={lang}
              />
            </div>

            {/* Stage Output Tag & Link back */}
            <div className="pt-2 border-t border-purple-100 dark:border-purple-900/40 text-[10px] font-mono text-purple-600 dark:text-purple-400 flex items-center justify-between">
              <span>{isZh ? '反思闭环：写入 INDEX.md' : 'Loop: Updates INDEX.md'}</span>
              <span className="font-bold flex items-center gap-0.5">
                <span>⟲ S1</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
