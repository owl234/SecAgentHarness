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
  ArrowDown,
  Database,
  Zap,
} from 'lucide-react';
import { FlowNode } from './flowTypes';
import { FlowNodeCard } from './FlowNodeCard';

interface LifecyclePipelineFlowProps {
  selectedNodeId?: string;
  onSelectNode: (node: FlowNode) => void;
  lang?: 'zh' | 'en';
}

export const LIFECYCLE_NODES: FlowNode[] = [
  // Stage 1
  {
    id: 's1-task-in',
    titleZh: '任务定义与规格接入',
    titleEn: 'Task Inflow & Spec',
    subtitleZh: '任务标识 + 领域标签',
    subtitleEn: 'Task ID + Domain',
    badge: '规格接缝',
    category: 'entry',
    icon: TargetIcon,
    filePath: 'backend/sec_agent_harness2/core/spec.py',
    formula: '\\text{TaskSpec} \\in \\text{BenchSpec}',
    descriptionZh: '接收用户指定的任务唯一代号与领域分类。通过严格的接缝规范与评测真实标准绝对物理隔离。',
    descriptionEn: 'Receives task unique identity and domain spec, keeping zero leakage from benchmark grader.',
    inputsZh: ['任务 ID', '领域标签 (如 accounting, lab, cve)', '基础测试输入'],
    inputsEn: ['Task ID', 'Domain tag', 'Baseline test fixtures'],
    outputsZh: ['物化初始目录', '只读环境变量注入'],
    outputsEn: ['Isolated workspace dir', 'Readonly environment variables'],
  },
  {
    id: 's1-prior-lib',
    titleZh: '读取前序领域经验库',
    titleEn: 'Prior Domain Library',
    subtitleZh: 'INDEX.md / EXPERIENCE.md',
    subtitleEn: 'INDEX.md / EXPERIENCE.md',
    badge: '经验先验',
    category: 'memory',
    icon: Database,
    filePath: 'backend/sec_agent_harness2/core/library.py',
    formula: '\\mathcal{L}_{domain} \\hookrightarrow Context',
    descriptionZh: '加载同领域之前所有已完成任务累积沉淀的高置信度经验三元组（触发情景 / 核心原则 / 实证依据），为本次任务提供冷启动先验。',
    descriptionEn: 'Loads persistent high-confidence cross-task experience triples to cold-start current task.',
    invariantsZh: ['只读检索：探针试跑期间经验库处于锁定状态', '置信度去重：防止不良经验误导初始探索'],
    invariantsEn: ['Readonly index during rollouts', 'Confidence deduplication'],
    actionTab: 'library',
    actionLabelZh: '查看经验库',
    actionLabelEn: 'View Library',
  },
  {
    id: 's1-base-roll',
    titleZh: '基线探针试跑',
    titleEn: 'Base Probe Rollout',
    subtitleZh: '_roll_bases() 初始轨迹采样',
    subtitleEn: '_roll_bases() Baseline Probe',
    badge: '基线执行',
    code: 'Base',
    category: 'probe',
    icon: Play,
    filePath: 'backend/sec_agent_harness2/core/recursion.py',
    formula: 'H_{base} \\xrightarrow{_roll\\_bases()} RunView_{base}',
    descriptionZh: '将未经优化的初始组件树物化到执行器沙箱中执行一次基线探针试跑，记录初始执行轨迹、工具调用日志与产出物。',
    descriptionEn: 'Materializes baseline un-optimized harness tree into sandbox and executes base probe to gather reference trajectory.',
    outputsZh: ['基准运行轨迹 trajectory.jsonl', '初始交付物切片', '基线执行成本 ($ USD)'],
    outputsEn: ['Base trajectory.jsonl', 'Baseline deliverables', 'Base token cost'],
    actionTab: 'workbench',
    actionLabelZh: '工作台控制',
    actionLabelEn: 'Workbench',
  },

  // Stage 2
  {
    id: 's2-context-build',
    titleZh: '对比证据包组装',
    titleEn: 'Evidence Packaging',
    subtitleZh: 'context.build() 差异切片',
    subtitleEn: 'context.build() Evidence Pack',
    badge: '对比证据包',
    category: 'core',
    icon: Sparkles,
    filePath: 'backend/sec_agent_harness2/core/context.py',
    formula: '\\text{Context} = \\text{Traj}_{base} \\oplus \\text{Diffs} \\oplus \\mathcal{L}_{domain}',
    descriptionZh: '汇总基线探针的执行轨迹、工具报错切片、组件差异及前序领域经验，组装成结构化对比证据上下文，喂给改写器。',
    descriptionEn: 'Aggregates baseline trajectory, tool failure slices, component diffs, and domain library into contrastive evidence.',
    invariantsZh: ['严密扫描组件树，防止评分标准或判题结果渗入改写上下文'],
    invariantsEn: ['Strictly assert_tree_has_no_grader_verdicts() to prevent leakage'],
  },
  {
    id: 's2-inv-levers',
    titleZh: '通用工程杠杆提议 (INV)',
    titleEn: 'Invariant Levers (INV)',
    subtitleZh: 'c1: 提示词 · c2: 护栏 · c4: 工具指引',
    subtitleEn: 'c1: Prompt · c2: Guardrails · c4: Guidance',
    badge: 'INV 提议器',
    code: 'INV',
    category: 'propose',
    icon: Shield,
    filePath: 'backend/sec_agent_harness2/core/proposer.py',
    formula: 'INV \\colon (c1, c2, c4) \\mapsto H_{inv}^{1..k}',
    descriptionZh: '针对任务共性优化高层指导原则、系统提示词、行为安全护栏与标准工具指引，消除推理歧义并施加负面安全约束。',
    descriptionEn: 'Refines high-level system prompts, guardrails, and tool contracts to enforce safety and eliminate ambiguity.',
    actionTab: 'studio',
    actionLabelZh: '在组件工作室查看',
    actionLabelEn: 'View in Studio',
  },
  {
    id: 's2-dom-levers',
    titleZh: '业务领域杠杆提议 (DOM)',
    titleEn: 'Domain Levers (DOM)',
    subtitleZh: 'c6: 技能 · c7: 脚本 · c8: 钩子 · c5: 子智能体',
    subtitleEn: 'c6: Skills · c7: Scripts · c8: Plugins · c5: Subagents',
    badge: 'DOM 提议器',
    code: 'DOM',
    category: 'propose',
    icon: Terminal,
    filePath: 'backend/sec_agent_harness2/core/proposer.py',
    formula: 'DOM \\colon (c5, c6, c7, c8) \\mapsto H_{dom}^{1..k}',
    descriptionZh: '根据当前领域特有问题（如漏洞复现、账目清洗），编写领域专属技能手册、自动化 Python 辅助脚本与生命周期拦截插件。',
    descriptionEn: 'Synthesizes specialized skills, helper scripts, plugins, and delegated subagents for task challenges.',
    actionTab: 'studio',
    actionLabelZh: '在组件工作室查看',
    actionLabelEn: 'View in Studio',
  },
  {
    id: 's2-validation-gate',
    titleZh: 'SurfaceSpec 规范检验网关',
    titleEn: 'SurfaceSpec Validation Gate',
    subtitleZh: '语法校验 + 1次带错重试 (a2)',
    subtitleEn: 'Syntax Gate + 1-Shot Retry (a2)',
    badge: '安全网关',
    category: 'core',
    icon: CheckCircle2,
    filePath: 'backend/sec_agent_harness2/core/tree.py',
    formula: '\\text{Validate}(H) \\in \\{\\text{Valid}, \\text{Retry}, \\text{Fallback}\\}',
    descriptionZh: '强制审查所有提议改写的合法性（路径合规、保留脚本不受篡改、字符配额）。语法违规时提供 1 次带错反馈重写机会，再失败则安全回退基线。',
    descriptionEn: 'Validates syntax, path constraints, and quotas. Triggers 1-shot retry on syntax violation before baseline fallback.',
    invariantsZh: ['保护关键系统文件不被删除', '字符预算严格硬限制'],
    invariantsEn: ['Protection of reserved system scripts', 'Hard limits on token character budgets'],
  },
  {
    id: 's2-probe-exec',
    titleZh: '并发探针试跑',
    titleEn: 'Probe Rollouts',
    subtitleZh: '_roll_many() 沙箱独立试跑',
    subtitleEn: '_roll_many() Isolated Probes',
    badge: '并发探测',
    category: 'probe',
    icon: Zap,
    filePath: 'backend/sec_agent_harness2/core/recursion.py',
    formula: '\\{H_{inv}, H_{dom}\\} \\xrightarrow{_roll\\_many()} \\{RunView_{cand}\\}',
    descriptionZh: '在互相物理隔离的执行器临时沙箱中并发试跑所有 INV 与 DOM 候选套件，收集各候选真实执行轨迹与输出物。',
    descriptionEn: 'Runs all candidate harnesses in physical isolated execution sandboxes concurrently to gather behavior traces.',
    actionTab: 'pipeline',
    actionLabelZh: '查看探针轨迹',
    actionLabelEn: 'View Trajectories',
  },

  // Stage 3
  {
    id: 's3-compose-choice',
    titleZh: '多路组合与模式分支',
    titleEn: 'Composition Engine',
    subtitleZh: '并行模式 (agg) vs 串行模式 (seq)',
    subtitleEn: 'Parallel (agg) vs Sequential (seq)',
    badge: '合成引擎',
    code: 'Compose',
    category: 'compose',
    icon: GitBranch,
    filePath: 'backend/sec_agent_harness2/core/recursion.py',
    formula: 'agg \\colon \\{H_{inv}, H_{dom}\\} \\mapsto \\{H_{agg}^1, \\dots, H_{agg}^k\\} \\quad | \\quad seq \\colon c_{t-1} \\mapsto c_t',
    descriptionZh: '合成器横向对比各路探针表现，剔除退化缺陷并吸收优势修改。并行模式由独立聚合器融合出 k 路精炼套件；串行模式开展 k 轮深化演进。',
    descriptionEn: 'Synthesizes probe advantages, drops regressions, and produces refined final candidate harnesses.',
    actionTab: 'pipeline',
    actionLabelZh: '查看融合拓扑',
    actionLabelEn: 'Pipeline View',
  },

  // Stage 4
  {
    id: 's4-blind-judge',
    titleZh: '零标注无监督盲选决策',
    titleEn: 'Zero-GT Blind Selection Gate',
    subtitleZh: 'assign_ids() 确定性哈希打乱',
    subtitleEn: 'assign_ids() Hash Shuffle Judge',
    badge: '无监督盲审',
    code: 'Judge',
    category: 'judge',
    icon: CheckCircle2,
    filePath: 'backend/sec_agent_harness2/core/selection.py',
    formula: '\\text{Candidates} \\xrightarrow{hash\\_shuffle} \\{A, B, C\\} \\xrightarrow{LLM(Deliverables)} \\text{chosen\\_label}',
    descriptionZh: '确定性哈希打乱匿名化为 A, B, C... 消除命名与位置偏见。终审模型纯粹基于最终交付物的自洽性与完整性选出胜出套件 (chosen_label)。',
    descriptionEn: 'Eliminates position bias via deterministic hash mapping. Judge LLM decides winning harness purely from deliverables with 0 GT.',
    invariantsZh: ['绝对无监督：严格禁止在裁决时调用基准测试标准答案或单元测试判分器'],
    invariantsEn: ['Zero Ground Truth: never leaks unit test assertions into selection prompt'],
  },

  // Stage 5
  {
    id: 's5-reflector',
    titleZh: '经验反思提炼',
    titleEn: 'Experience Reflector',
    subtitleZh: '<experience> 情景 + 原则 + 依据',
    subtitleEn: '<experience> Cue + Lesson + Evidence',
    badge: '经验递归',
    category: 'memory',
    icon: Brain,
    filePath: 'backend/sec_agent_harness2/core/library.py',
    formula: 'Run_{chosen} \\xrightarrow{Reflector} \\langle Cue, Lesson, Evidence \\rangle',
    descriptionZh: '从采纳的胜出套件与执行轨迹中提炼出结构化经验三元组：触发情景 (cue) + 核心原则 (lesson) + 客观运行论据 (evidence)。',
    descriptionEn: 'Distills winning harness into structured triple: Cue + Lesson + Evidence for future tasks.',
    actionTab: 'library',
    actionLabelZh: '前往经验知识库',
    actionLabelEn: 'Experience Library',
  },
  {
    id: 's5-update-lib',
    titleZh: '沉淀至领域经验库（闭环）',
    titleEn: 'Domain Library Persistence',
    subtitleZh: '写入 INDEX.md 与 EXPERIENCE.md',
    subtitleEn: 'Updates domain INDEX.md',
    badge: '持久化记忆',
    category: 'memory',
    icon: RotateCcw,
    filePath: 'backend/sec_agent_harness2/core/library.py',
    formula: '\\langle Cue, Lesson, Evidence \\rangle \\hookrightarrow \\mathcal{L}_{domain} \\to \\text{Task}_{next}',
    descriptionZh: '将提炼出的经验固化写入该领域的 INDEX.md。在同领域后续任务启动时自动载入，完成从单任务向系统级的双层递归闭环！',
    descriptionEn: 'Commits refined knowledge into domain INDEX.md, automatically injecting priors into future tasks for a closed recursive loop.',
    actionTab: 'library',
    actionLabelZh: '查看领域经验池',
    actionLabelEn: 'View Domain Library',
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
  lang = 'zh',
}) => {
  const isZh = lang === 'zh';

  const getNode = (id: string) => LIFECYCLE_NODES.find((n) => n.id === id)!;

  return (
    <div className="space-y-6">
      {/* SUBGRAPH 1: Task Initialization */}
      <div className="relative rounded-2xl bg-white/80 dark:bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-950/80 border border-slate-200 dark:border-slate-800 p-5 shadow-sm dark:shadow-xl backdrop-blur">
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/20 dark:text-sky-400 dark:border-sky-500/40 font-mono font-bold text-xs flex items-center justify-center">
              1
            </span>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>{isZh ? '阶段 1 · 任务接入与基线采样' : 'Stage 1 · Task Baseline Sampling'}</span>
            </h3>
          </div>
          <span className="text-[11px] font-mono text-sky-700 bg-sky-50 border border-sky-200 dark:text-sky-400 dark:bg-sky-950/50 px-2.5 py-0.5 rounded-full dark:border-sky-800/40">
            {isZh ? '冷启动与经验先验' : 'Cold Start & Prior'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <FlowNodeCard
            node={getNode('s1-task-in')}
            isSelected={selectedNodeId === 's1-task-in'}
            onClick={() => onSelectNode(getNode('s1-task-in'))}
            lang={lang}
          />

          <div className="relative">
            <FlowNodeCard
              node={getNode('s1-prior-lib')}
              isSelected={selectedNodeId === 's1-prior-lib'}
              onClick={() => onSelectNode(getNode('s1-prior-lib'))}
              lang={lang}
            />
          </div>

          <FlowNodeCard
            node={getNode('s1-base-roll')}
            isSelected={selectedNodeId === 's1-base-roll'}
            onClick={() => onSelectNode(getNode('s1-base-roll'))}
            lang={lang}
          />
        </div>
      </div>

      {/* Down Connector */}
      <div className="flex items-center justify-center my-1">
        <div className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500">
          <div className="w-0.5 h-6 bg-gradient-to-b from-sky-500 to-blue-500" />
          <span className="text-[10px] font-mono text-slate-700 dark:text-cyan-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
            {isZh ? '输出基线轨迹与未调优产物' : 'Output Baseline Trajectory'}
          </span>
          <ArrowDown className="w-4 h-4 text-blue-500 dark:text-blue-400 animate-bounce" />
        </div>
      </div>

      {/* SUBGRAPH 2: Propose-Probe Stage */}
      <div className="relative rounded-2xl bg-white/80 dark:bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-950/80 border border-slate-200 dark:border-slate-800 p-5 shadow-sm dark:shadow-xl backdrop-blur">
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/40 font-mono font-bold text-xs flex items-center justify-center">
              2
            </span>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>{isZh ? '阶段 2 · 任务级递归：提议与探测对比改写' : 'Stage 2 · Propose–Probe Levers'}</span>
            </h3>
          </div>
          <span className="text-[11px] font-mono text-blue-700 bg-blue-50 border border-blue-200 dark:text-blue-400 dark:bg-blue-950/50 px-2.5 py-0.5 rounded-full dark:border-blue-800/40">
            {isZh ? 'INV 与 DOM 双轴杠杆' : 'INV & DOM Dual Levers'}
          </span>
        </div>

        <div className="space-y-4">
          {/* Packaging node */}
          <div className="max-w-md mx-auto">
            <FlowNodeCard
              node={getNode('s2-context-build')}
              isSelected={selectedNodeId === 's2-context-build'}
              onClick={() => onSelectNode(getNode('s2-context-build'))}
              lang={lang}
            />
          </div>

          {/* Two Levers Branches */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-950/50 border border-blue-200 dark:border-blue-900/40 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{isZh ? '不变性杠杆分支 (INV)' : 'Invariant Branch (INV)'}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">c1, c2, c4</span>
              </div>
              <FlowNodeCard
                node={getNode('s2-inv-levers')}
                isSelected={selectedNodeId === 's2-inv-levers'}
                onClick={() => onSelectNode(getNode('s2-inv-levers'))}
                lang={lang}
              />
            </div>

            <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-950/50 border border-amber-200 dark:border-amber-900/40 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>{isZh ? '领域性杠杆分支 (DOM)' : 'Domain Branch (DOM)'}</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">c5, c6, c7, c8</span>
              </div>
              <FlowNodeCard
                node={getNode('s2-dom-levers')}
                isSelected={selectedNodeId === 's2-dom-levers'}
                onClick={() => onSelectNode(getNode('s2-dom-levers'))}
                lang={lang}
              />
            </div>
          </div>

          {/* Verification Gate & Rollout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <FlowNodeCard
              node={getNode('s2-validation-gate')}
              isSelected={selectedNodeId === 's2-validation-gate'}
              onClick={() => onSelectNode(getNode('s2-validation-gate'))}
              lang={lang}
            />
            <FlowNodeCard
              node={getNode('s2-probe-exec')}
              isSelected={selectedNodeId === 's2-probe-exec'}
              onClick={() => onSelectNode(getNode('s2-probe-exec'))}
              lang={lang}
            />
          </div>
        </div>
      </div>

      {/* Down Connector */}
      <div className="flex items-center justify-center my-1">
        <div className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500">
          <div className="w-0.5 h-6 bg-gradient-to-b from-blue-500 to-indigo-500" />
          <span className="text-[10px] font-mono text-slate-700 dark:text-indigo-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
            {isZh ? '产出 2k 路候选探针轨迹' : '2k Candidate Probe Traces'}
          </span>
          <ArrowDown className="w-4 h-4 text-indigo-500 dark:text-indigo-400 animate-bounce" />
        </div>
      </div>

      {/* SUBGRAPH 3: Compose Stage */}
      <div className="relative rounded-2xl bg-white/80 dark:bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-950/80 border border-slate-200 dark:border-slate-800 p-5 shadow-sm dark:shadow-xl backdrop-blur">
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/40 font-mono font-bold text-xs flex items-center justify-center">
              3
            </span>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>{isZh ? '阶段 3 · 组合融合与递归深化（并行 agg / 串行 seq）' : 'Stage 3 · Composition Engine'}</span>
            </h3>
          </div>
          <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 dark:text-indigo-400 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-full dark:border-indigo-800/40">
            {isZh ? '并行融合 / 串行精炼' : 'Parallel / Sequential'}
          </span>
        </div>

        <FlowNodeCard
          node={getNode('s3-compose-choice')}
          isSelected={selectedNodeId === 's3-compose-choice'}
          onClick={() => onSelectNode(getNode('s3-compose-choice'))}
          lang={lang}
        />
      </div>

      {/* Down Connector */}
      <div className="flex items-center justify-center my-1">
        <div className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500">
          <div className="w-0.5 h-6 bg-gradient-to-b from-indigo-500 to-emerald-500" />
          <span className="text-[10px] font-mono text-slate-700 dark:text-emerald-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
            {isZh ? '最终候选交付物 (agg1..aggk 或 c1..ck)' : 'Final Candidate Deliverables'}
          </span>
          <ArrowDown className="w-4 h-4 text-emerald-500 dark:text-emerald-400 animate-bounce" />
        </div>
      </div>

      {/* SUBGRAPH 4: Zero Ground-Truth Blind Judge */}
      <div className="relative rounded-2xl bg-white/80 dark:bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-950/80 border border-slate-200 dark:border-slate-800 p-5 shadow-sm dark:shadow-xl backdrop-blur">
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40 font-mono font-bold text-xs flex items-center justify-center">
              4
            </span>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>{isZh ? '阶段 4 · 零标注无监督盲选决策' : 'Stage 4 · Zero-GT Blind Selection'}</span>
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full dark:border-emerald-800/40">
            {isZh ? '零真值泄露' : 'Zero Ground Truth'}
          </span>
        </div>

        <FlowNodeCard
          node={getNode('s4-blind-judge')}
          isSelected={selectedNodeId === 's4-blind-judge'}
          onClick={() => onSelectNode(getNode('s4-blind-judge'))}
          lang={lang}
        />
      </div>

      {/* Down Connector */}
      <div className="flex items-center justify-center my-1">
        <div className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500">
          <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-500 to-purple-500" />
          <span className="text-[10px] font-mono text-slate-700 dark:text-purple-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
            {isZh ? '胜出采纳套件 (chosen_label)' : 'Winning Harness (chosen_label)'}
          </span>
          <ArrowDown className="w-4 h-4 text-purple-500 dark:text-purple-400 animate-bounce" />
        </div>
      </div>

      {/* SUBGRAPH 5: Experience Reflection & Closed Loop */}
      <div className="relative rounded-2xl bg-white/80 dark:bg-gradient-to-br dark:from-slate-900/90 dark:to-purple-950/30 border border-slate-200 dark:border-slate-800 p-5 shadow-sm dark:shadow-xl backdrop-blur">
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/40 font-mono font-bold text-xs flex items-center justify-center">
              5
            </span>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span>{isZh ? '阶段 5 · 套件级递归：经验反思与跨任务持续进化' : 'Stage 5 · Harnessing Recursion'}</span>
            </h3>
          </div>
          <span className="text-[11px] font-mono text-purple-700 bg-purple-50 border border-purple-200 dark:text-purple-400 dark:bg-purple-950/50 px-2.5 py-0.5 rounded-full dark:border-purple-800/40">
            {isZh ? '闭环先验反馈' : 'Closed Loop Feedback'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FlowNodeCard
            node={getNode('s5-reflector')}
            isSelected={selectedNodeId === 's5-reflector'}
            onClick={() => onSelectNode(getNode('s5-reflector'))}
            lang={lang}
          />
          <FlowNodeCard
            node={getNode('s5-update-lib')}
            isSelected={selectedNodeId === 's5-update-lib'}
            onClick={() => onSelectNode(getNode('s5-update-lib'))}
            lang={lang}
          />
        </div>

        {/* Closed Loop Visual Banner */}
        <div className="mt-4 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 flex items-center justify-between text-xs text-purple-800 dark:text-purple-300">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-spin-slow" />
            <span>{isZh ? '闭环反馈：新经验将自动作为先验，注入同领域后续所有任务的阶段 1 冷启动！' : 'Closed Loop: New experience auto-injects into Stage 1 of future tasks in this domain!'}</span>
          </div>
          <span className="font-mono text-[10px] bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700/50">
            {isZh ? '先验反馈已激活' : 'FEEDFORWARD ACTIVE'}
          </span>
        </div>
      </div>
    </div>
  );
};
