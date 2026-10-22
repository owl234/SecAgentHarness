import React, { useEffect, useState } from 'react';
import {
  Play,
  Layers,
  Sparkles,
  Zap,
  CheckCircle2,
  Clock,
  Folder,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Terminal,
  Cpu,
  Flame,
  Bot,
  Settings,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Award,
} from 'lucide-react';
import {
  RunItem,
  SystemStatus,
  PreflightStatus,
  TaskItem,
  TaskDetail,
  DiffResult,
} from '../types';
import {
  launchDemo,
  launchSweep,
  stopExecution,
  fetchPreflight,
  fetchTasks,
  fetchTaskDetail,
  fetchDiff,
} from '../api';
import { ExecutionProgressStepper } from './ExecutionProgressStepper';
import { SmartIntentDiffViewer } from './SmartIntentDiffViewer';

interface WorkbenchViewProps {
  runs: RunItem[];
  systemStatus: SystemStatus | null;
  onSelectRun: (runId: string, targetTab?: 'pipeline' | 'library' | 'benchmark') => void;
  onOpenConsole: () => void;
  onNavigateToStudio?: () => void;
  onOpenExecutorConfig?: () => void;
  onOpenTerminology?: () => void;
}

export const WorkbenchView: React.FC<WorkbenchViewProps> = ({
  runs,
  systemStatus,
  onSelectRun,
  onOpenConsole,
  onNavigateToStudio,
  onOpenExecutorConfig,
  onOpenTerminology,
}) => {
  const [activeLauncherTab, setActiveLauncherTab] = useState<'demo' | 'sweep'>('demo');
  const [launching, setLaunching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showAdvancedDemo, setShowAdvancedDemo] = useState(false);
  const [showAdvancedSweep, setShowAdvancedSweep] = useState(false);

  // Preflight Health Status
  const [preflight, setPreflight] = useState<PreflightStatus | null>(null);

  // Demo Form State
  const [demoOutput, setDemoOutput] = useState('runs/demo');
  const [demoK, setDemoK] = useState(2);
  const [demoMode, setDemoMode] = useState('both');
  const [demoExecutor, setDemoExecutor] = useState<'claude' | 'oc' | 'cx'>('claude');
  const [demoClaudeModel, setDemoClaudeModel] = useState('claude-3-7-sonnet-20250219');
  const [demoClaudeThinking, setDemoClaudeThinking] = useState(4096);

  // Sweep Form State
  const [sweepBench, setSweepBench] = useState('jb');
  const [sweepSubstrate, setSweepSubstrate] = useState('claude');
  const [sweepK, setSweepK] = useState(1);
  const [sweepModes, setSweepModes] = useState('both');
  const [sweepWorkers, setSweepWorkers] = useState(1);
  const [sweepSplit, setSweepSplit] = useState('all');
  const [sweepMaxTasks, setSweepMaxTasks] = useState<number | undefined>(undefined);
  const [sweepDryRun, setSweepDryRun] = useState(false);
  const [sweepClaudeModel, setSweepClaudeModel] = useState('claude-3-7-sonnet-20250219');
  const [sweepClaudeThinking, setSweepClaudeThinking] = useState(4096);

  // Result & Diff Inspector states (synced with selected run)
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [taskDetail, setTaskDetail] = useState<TaskDetail | null>(null);

  // Diff states for result card
  const [diffBase, setDiffBase] = useState('base');
  const [diffCompare, setDiffCompare] = useState('agg1');
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  const isRunning = systemStatus?.status.status === 'running';

  // 1. Fetch preflight on mount
  useEffect(() => {
    fetchPreflight()
      .then((data) => setPreflight(data))
      .catch((err) => console.error('获取预检状态失败 (Failed to fetch preflight):', err));
  }, []);

  // 2. Select initial run when runs load
  useEffect(() => {
    if (runs.length > 0 && !selectedRunId) {
      setSelectedRunId(runs[0].id);
    }
  }, [runs, selectedRunId]);

  // 3. Fetch tasks for selected run
  useEffect(() => {
    if (!selectedRunId) return;
    fetchTasks(selectedRunId)
      .then((tList) => {
        setTasks(tList);
        if (tList.length > 0) {
          setSelectedTaskId(tList[0].task_id);
        } else {
          setSelectedTaskId('');
          setTaskDetail(null);
          setDiffResult(null);
        }
      })
      .catch((err) => console.error('获取任务列表失败 (Failed to load tasks):', err));
  }, [selectedRunId]);

  // 4. Fetch task detail
  useEffect(() => {
    if (!selectedRunId || !selectedTaskId) return;
    fetchTaskDetail(selectedRunId, selectedTaskId)
      .then((detail) => {
        setTaskDetail(detail);
        const available = detail.available_harnesses || [];
        const base = available.includes('base') ? 'base' : available[0] || 'base';
        const comp =
          available.find((h) => h !== base && (h.startsWith('agg') || h.startsWith('c'))) ||
          available[available.length - 1] ||
          'agg1';
        setDiffBase(base);
        setDiffCompare(comp);
      })
      .catch((err) => console.error('获取任务详情失败 (Failed to load task detail):', err));
  }, [selectedRunId, selectedTaskId]);

  // 5. Fetch diff
  useEffect(() => {
    if (!selectedRunId || !selectedTaskId || !diffBase || !diffCompare) return;
    setDiffLoading(true);
    fetchDiff(selectedRunId, selectedTaskId, diffBase, diffCompare)
      .then((res) => setDiffResult(res))
      .catch((err) => console.error('获取 Diff 失败 (Failed to load diff):', err))
      .finally(() => setDiffLoading(false));
  }, [selectedRunId, selectedTaskId, diffBase, diffCompare]);

  // Launch Demo handler
  const handleLaunchDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLaunching(true);
    try {
      await launchDemo({
        output: demoOutput || 'runs/demo',
        k: demoK,
        mode: demoMode,
        executor: demoExecutor,
        claude_model: demoExecutor === 'claude' ? demoClaudeModel : undefined,
        claude_thinking_budget: demoExecutor === 'claude' ? demoClaudeThinking : undefined,
      });
      onOpenConsole();
    } catch (err: any) {
      setErrorMsg(err.message || '启动 Demo 失败');
    } finally {
      setLaunching(false);
    }
  };

  // Launch Sweep handler
  const handleLaunchSweep = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLaunching(true);
    try {
      await launchSweep({
        bench: sweepBench,
        substrate: sweepSubstrate,
        k: sweepK,
        modes: sweepModes,
        split: sweepSplit,
        workers: sweepWorkers,
        max_tasks: sweepMaxTasks || null,
        dry_run: sweepDryRun,
        claude_model: sweepSubstrate === 'claude' ? sweepClaudeModel : undefined,
        claude_thinking_budget: sweepSubstrate === 'claude' ? sweepClaudeThinking : undefined,
      });
      onOpenConsole();
    } catch (err: any) {
      setErrorMsg(err.message || '启动 Sweep 失败');
    } finally {
      setLaunching(false);
    }
  };

  const totalCompleted = runs.reduce((acc, r) => acc + r.completed_count, 0);
  const totalTasks = runs.reduce((acc, r) => acc + r.task_count, 0);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Quick Help */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-sm">
              一体化演进工作台 (Harness² Workbench)
            </span>
            <span className="text-xs text-blue-100 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              统一全景调度 · 零心智切换
            </span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight mt-1.5">
            智能体套件递归自适应进化工作台
          </h2>
          <p className="text-xs text-blue-100 mt-1 max-w-2xl leading-relaxed">
            在不微调大模型权重的前提下，让 AI 自主诊断缺陷、试跑探测效果并提炼出最强运行装备（提示词、工具指引、安全护栏、技能手册与辅助脚本）。支持原生一键使用 Claude Code 深度思考执行器。
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToStudio && (
            <button
              onClick={onNavigateToStudio}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-xl text-xs font-semibold text-white flex items-center gap-2 transition-all cursor-pointer backdrop-blur-sm"
            >
              <Layers className="w-4 h-4 text-cyan-200" />
              <span>Harness 组件工作室</span>
            </button>
          )}

          {onOpenTerminology && (
            <button
              onClick={onOpenTerminology}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-xl text-xs font-semibold text-white flex items-center gap-2 transition-all cursor-pointer backdrop-blur-sm"
            >
              <HelpCircle className="w-4 h-4 text-blue-200" />
              <span>核心概念小百科</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Environment Preflight Health Bar */}
      {preflight && (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  系统前置环境检测与执行器就绪度
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 font-semibold">
                  {preflight.has_credentials ? '大模型凭据已就绪' : '本地离线就绪 (免API)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {preflight.credentials.message} · {preflight.docker.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {onOpenExecutorConfig && (
              <button
                onClick={onOpenExecutorConfig}
                className="px-2.5 py-1 rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[11px] font-medium flex items-center gap-1 hover:bg-orange-500/20 cursor-pointer"
              >
                <Flame className="w-3 h-3" />
                <span>配置 Claude / 密钥</span>
              </button>
            )}
            <span
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium ${
                preflight.benchmarks.demo.available
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              Demo: 开箱可用
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium ${
                preflight.benchmarks.jb.available
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  : 'bg-slate-50 text-slate-400 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              JobBench: {preflight.benchmarks.jb.available ? '已安装' : '未就绪'}
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium ${
                preflight.benchmarks.lab.available
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  : 'bg-slate-50 text-slate-400 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              LAB: {preflight.benchmarks.lab.available ? '已安装' : '未就绪'}
            </span>
          </div>
        </div>
      )}

      {/* 3. Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>已注册演进任务</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {totalTasks}
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            涵盖 {runs.length} 个独立评测与运行集合
          </span>
        </div>

        {/* Stat 2 */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>成功演进达标数</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tracking-tight text-emerald-600 dark:text-emerald-400">
            {totalCompleted}
          </p>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            通过率: {totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0}%
          </span>
        </div>

        {/* Stat 3: Component Studio Quick Card */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
              <span>Harness 组件维度</span>
              <Sliders className="w-4 h-4 text-purple-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              8 维架构
            </p>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              c1~c8: Prompt, Memory, Skills...
            </span>
          </div>
          {onNavigateToStudio && (
            <button
              onClick={onNavigateToStudio}
              className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <span>前往组件工作室定制</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Stat 4: Executor Quick Card */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
              <span>推荐执行器引擎</span>
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
            <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
              <span>Claude Code</span>
            </p>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              原生支持深度思考与多轮自检
            </span>
          </div>
          {onOpenExecutorConfig && (
            <button
              onClick={onOpenExecutorConfig}
              className="mt-2 text-xs text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <span>配置引擎与思考预算</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Active Run Banner & Stepper (if running) */}
      {isRunning && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-500/40 p-4 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600/10 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center animate-spin">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">
                    后台正在运行: {systemStatus?.status.job?.job_id}
                  </span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-semibold">
                    执行中
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                  {systemStatus?.status.job?.command?.join(' ')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenConsole}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>打开控制台</span>
              </button>
              <button
                onClick={() => stopExecution()}
                className="px-3 py-1.5 bg-rose-50 dark:bg-rose-600/20 hover:bg-rose-100 dark:hover:bg-rose-600/40 text-xs font-medium text-rose-600 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-500/40 transition-colors cursor-pointer"
              >
                终止执行
              </button>
            </div>
          </div>

          <ExecutionProgressStepper
            isRunning={isRunning}
            status={systemStatus?.status.status || 'running'}
            currentStage={2}
            currentMessage={systemStatus?.status.job?.command?.join(' ')}
            onOpenConsole={onOpenConsole}
            onExploreResult={() => {
              const el = document.getElementById('result-inspector');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        </div>
      )}

      {/* 5. Interactive Task Launcher (Demo & Sweep) */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" />
            <span className="font-bold text-sm text-slate-900 dark:text-white">
              交互式任务启动台 (Interactive Launcher)
            </span>
          </div>

          {/* Launcher mode tabs */}
          <div className="flex items-center space-x-1 bg-slate-200/60 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveLauncherTab('demo')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeLauncherTab === 'demo'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              本地快速 Demo (Quick Demo)
            </button>
            <button
              type="button"
              onClick={() => setActiveLauncherTab('sweep')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeLauncherTab === 'sweep'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              基准评测 Sweep (大规模演进)
            </button>
          </div>
        </div>

        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeLauncherTab === 'demo' ? (
            <form onSubmit={handleLaunchDemo} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                无需任何外部大模型凭据即可开箱试跑，在真实 Python 环境中完整经历 Propose-Probe-Compose 递归流水线及跨任务经验库累积。支持随时切换 Claude Code 深度思考执行器。
              </p>

              {/* Executor Selector */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    <span>选择执行器引擎 (Executor)</span>
                  </span>
                  {onOpenExecutorConfig && (
                    <button
                      type="button"
                      onClick={onOpenExecutorConfig}
                      className="text-[11px] text-blue-500 hover:underline cursor-pointer"
                    >
                      配置密钥与参数
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDemoExecutor('claude')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      demoExecutor === 'claude'
                        ? 'bg-orange-500/10 border-orange-500 text-orange-950 dark:text-orange-300 ring-1 ring-orange-500'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-orange-500" />
                      <span>Claude Code (Anthropic)</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">支持 Extended Thinking 深度思考</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDemoExecutor('oc')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      demoExecutor === 'oc'
                        ? 'bg-blue-500/10 border-blue-500 text-blue-950 dark:text-blue-300 ring-1 ring-blue-500'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5 text-blue-500" />
                      <span>OpenCode (oc)</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">原生 Substrate 引擎</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDemoExecutor('cx')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      demoExecutor === 'cx'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-950 dark:text-emerald-300 ring-1 ring-emerald-500'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1">
                      <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Codex (cx)</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">轻量容器 Substrate</div>
                  </button>
                </div>
              </div>

              {/* Core Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    优化预算乘数 k
                  </label>
                  <select
                    value={demoK}
                    onChange={(e) => setDemoK(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value={1}>k = 1 (轻量试跑: 4 次执行 / 任务)</option>
                    <option value={2}>k = 2 (推荐精炼: 8 次执行 / 任务)</option>
                    <option value={3}>k = 3 (高预算探索: 12 次执行 / 任务)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    演进模式 (Recursion Mode)
                  </label>
                  <select
                    value={demoMode}
                    onChange={(e) => setDemoMode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="both">Both (并行 + 串行双分支对比)</option>
                    <option value="parallel">仅并行 (Parallel aggregation)</option>
                    <option value="sequential">仅串行 (Sequential chain)</option>
                  </select>
                </div>
              </div>

              {/* Collapsible Advanced Parameters */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvancedDemo(!showAdvancedDemo)}
                  className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showAdvancedDemo ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>{showAdvancedDemo ? '收起高级参数' : '展开高级参数 (输出路径、模型版本与思考预算)'}</span>
                </button>

                {showAdvancedDemo && (
                  <div className="mt-3 p-4 rounded-xl bg-slate-50/60 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        输出目录 (Output Path)
                      </label>
                      <input
                        type="text"
                        value={demoOutput}
                        onChange={(e) => setDemoOutput(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
                        placeholder="runs/demo"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Claude 模型标识
                      </label>
                      <input
                        type="text"
                        value={demoClaudeModel}
                        onChange={(e) => setDemoClaudeModel(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Thinking 思考预算 Token
                      </label>
                      <input
                        type="number"
                        step={1024}
                        min={0}
                        max={32768}
                        value={demoClaudeThinking}
                        onChange={(e) => setDemoClaudeThinking(Number(e.target.value))}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  disabled={launching || isRunning}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-400 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{launching ? '正在启动...' : '启动 Demo 自适应优化'}</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLaunchSweep} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                在外部标准基准测试套件（JobBench, WorkBuddy, Harvey LAB）上执行多任务流水线适应。支持指定 Claude Code 作为求解引擎。
              </p>

              {/* Substrate Selector */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span>执行器 Substrate 选择</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSweepSubstrate('claude')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      sweepSubstrate === 'claude'
                        ? 'bg-orange-500/10 border-orange-500 text-orange-950 dark:text-orange-300 ring-1 ring-orange-500'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-orange-500" />
                      <span>Claude Code Substrate</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Anthropic 官方生态一等公民</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSweepSubstrate('oc')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      sweepSubstrate === 'oc'
                        ? 'bg-blue-500/10 border-blue-500 text-blue-950 dark:text-blue-300 ring-1 ring-blue-500'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5 text-blue-500" />
                      <span>OpenCode (oc)</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">原生多安装模式</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSweepSubstrate('cx')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      sweepSubstrate === 'cx'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-950 dark:text-emerald-300 ring-1 ring-emerald-500'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1">
                      <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Codex (cx)</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">容器化隔离环境</div>
                  </button>
                </div>
              </div>

              {/* Core Sweep Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    基准套件 (Benchmark)
                  </label>
                  <select
                    value={sweepBench}
                    onChange={(e) => setSweepBench(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="jb">JobBench (日常办公与专业对账)</option>
                    <option value="wb">WorkBuddy-Bench (Office+Web+Code)</option>
                    <option value="lab">Harvey LAB (法律业务与评分准则)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    预算乘数 k
                  </label>
                  <select
                    value={sweepK}
                    onChange={(e) => setSweepK(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value={1}>k = 1</option>
                    <option value={2}>k = 2</option>
                    <option value={3}>k = 3</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    演进模式
                  </label>
                  <select
                    value={sweepModes}
                    onChange={(e) => setSweepModes(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="both">Both (并行 + 串行)</option>
                    <option value="parallel">仅并行 (agg)</option>
                    <option value="sequential">仅串行 (seq)</option>
                  </select>
                </div>
              </div>

              {/* Collapsible Advanced Sweep Options */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvancedSweep(!showAdvancedSweep)}
                  className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showAdvancedSweep ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>{showAdvancedSweep ? '收起高级参数' : '展开高级参数 (并发线程、划分切分、最大任务量与演练模式)'}</span>
                </button>

                {showAdvancedSweep && (
                  <div className="mt-3 p-4 rounded-xl bg-slate-50/60 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          并行并发工作线程 (Workers)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={16}
                          value={sweepWorkers}
                          onChange={(e) => setSweepWorkers(Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          数据划分 (Split)
                        </label>
                        <select
                          value={sweepSplit}
                          onChange={(e) => setSweepSplit(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                        >
                          <option value="all">全集 (all)</option>
                          <option value="train">训练集 (train)</option>
                          <option value="test">测试集 (test)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          最大任务数 (空代表全部)
                        </label>
                        <input
                          type="number"
                          min={1}
                          placeholder="例如: 5"
                          value={sweepMaxTasks || ''}
                          onChange={(e) =>
                            setSweepMaxTasks(e.target.value ? Number(e.target.value) : undefined)
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Claude 模型标识
                        </label>
                        <input
                          type="text"
                          value={sweepClaudeModel}
                          onChange={(e) => setSweepClaudeModel(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Thinking 思考预算 Token
                        </label>
                        <input
                          type="number"
                          step={1024}
                          min={0}
                          max={32768}
                          value={sweepClaudeThinking}
                          onChange={(e) => setSweepClaudeThinking(Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sweepDryRun}
                    onChange={(e) => setSweepDryRun(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>仅演练模式 (--dry-run: 仅验证任务流和命名空间，不触发大模型调用)</span>
                </label>

                <button
                  type="submit"
                  disabled={launching || isRunning}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-400 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{launching ? '正在启动...' : '启动 Sweep 评测'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* 6. Historical Runs & Selection Sync Table */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-blue-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              已保存的演进与评测记录 ({runs.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            点击任意卡片高亮联动下方成果与 Diff 审阅器，右侧按钮可直达各分析视图
          </span>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {runs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              暂无历史记录，点击上方“本地快速 Demo”即可一键开始演进！
            </div>
          ) : (
            runs.map((r) => {
              const isSelected = r.id === selectedRunId;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRunId(r.id)}
                  className={`p-4 sm:px-6 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/30 border-l-4 border-l-blue-600 shadow-xs'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {r.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono">
                        {r.type}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          已联动审阅
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span>包含 {r.task_count} 任务</span>
                      <span>·</span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        成功达标: {r.completed_count}
                      </span>
                      {r.failed_count > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-rose-500">失败: {r.failed_count}</span>
                        </>
                      )}
                      {r.updated_at && (
                        <>
                          <span>·</span>
                          <span>更新于: {r.updated_at.slice(0, 19).replace('T', ' ')}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onSelectRun(r.id, 'pipeline')}
                      className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>流水线 DAG</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onSelectRun(r.id, 'library')}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                    >
                      经验库
                    </button>
                    <button
                      onClick={() => onSelectRun(r.id, 'benchmark')}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                    >
                      对比大盘
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 7. Deliverables & Diff Inspector (Directly linked to selected run) */}
      <div id="result-inspector" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-500" />
              <span>任务成果与 Harness 迭代对比审阅</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              选定运行与任务，直观审视经过 AI 自动演进后的套件改动与意图
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Run Selector */}
            <select
              value={selectedRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.id})
                </option>
              ))}
            </select>

            {/* Task Selector */}
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
            >
              {tasks.length === 0 ? (
                <option value="">(无任务)</option>
              ) : (
                tasks.map((t) => (
                  <option key={t.task_id} value={t.task_id}>
                    任务: {t.task_id} ({t.domain})
                  </option>
                ))
              )}
            </select>

            {selectedRunId && (
              <button
                onClick={() => onSelectRun(selectedRunId, 'pipeline')}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg font-medium transition-colors cursor-pointer"
              >
                <span>在流水线中查看完整 DAG</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Deliverable & Intent Diff Viewer */}
        <SmartIntentDiffViewer
          diff={diffResult}
          baseLabel={diffBase}
          compareLabel={diffCompare}
          availableLabels={taskDetail?.available_harnesses || ['base', 'agg1']}
          onChangeComparison={(b, c) => {
            setDiffBase(b);
            setDiffCompare(c);
          }}
          loading={diffLoading}
          onViewPipeline={() => onSelectRun(selectedRunId, 'pipeline')}
        />
      </div>
    </div>
  );
};