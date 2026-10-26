import React, { useEffect, useState } from 'react';
import {
  Play,
  Zap,
  ShieldAlert,
  Flame,
  Bot,
  Terminal,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ExecutorStatusResponse } from '../../types';
import { launchDemo, launchSweep } from '../../api';
import { useLang } from '../../i18n/LangContext';
import { useToast } from '../ui/ToastContext';

interface TaskLauncherCardProps {
  isRunning: boolean;
  executorStatus: ExecutorStatusResponse | null;
  onOpenConsole: () => void;
  onOpenExecutorConfig?: () => void;
}

export const TaskLauncherCard: React.FC<TaskLauncherCardProps> = ({
  isRunning,
  executorStatus,
  onOpenConsole,
  onOpenExecutorConfig,
}) => {
  const { tx } = useLang();
  const { showToast } = useToast();

  const [activeLauncherTab, setActiveLauncherTab] = useState<'demo' | 'sweep'>('demo');
  const [launching, setLaunching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showAdvancedDemo, setShowAdvancedDemo] = useState(false);
  const [showAdvancedSweep, setShowAdvancedSweep] = useState(false);

  // Demo Form State
  const [demoOutput, setDemoOutput] = useState('runs/demo');
  const [demoK, setDemoK] = useState(2);
  const [demoMode, setDemoMode] = useState('both');

  // Sweep Form State
  const [sweepBench, setSweepBench] = useState('jb');
  const [sweepSubset, setSweepSubset] = useState<'office' | 'web' | 'code'>('office');
  const [sweepSubstrate, setSweepSubstrate] = useState('claude');
  const [sweepK, setSweepK] = useState(1);
  const [sweepModes, setSweepModes] = useState('both');
  const [sweepWorkers, setSweepWorkers] = useState(1);
  const [sweepSplit, setSweepSplit] = useState('all');
  const [sweepMaxTasks, setSweepMaxTasks] = useState<number | undefined>(undefined);
  const [sweepDryRun, setSweepDryRun] = useState(false);
  const [sweepModel, setSweepModel] = useState('');
  const [sweepClaudeEffort, setSweepClaudeEffort] = useState<'low' | 'medium' | 'high' | ''>('');

  useEffect(() => {
    if (!executorStatus) return;
    if (executorStatus.active_executor) {
      setSweepSubstrate(executorStatus.active_executor);
    }
    const claudeExec = executorStatus.executors.find((e) => e.id === 'claude');
    if (claudeExec?.effort && ['low', 'medium', 'high'].includes(claudeExec.effort)) {
      setSweepClaudeEffort(claudeExec.effort as 'low' | 'medium' | 'high');
    }
  }, [executorStatus]);

  const handleLaunchDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLaunching(true);
    try {
      await launchDemo({
        output: demoOutput || 'runs/demo',
        k: demoK,
        mode: demoMode,
      });
      showToast(
        tx('本地 Demo 递归流水线已启动', 'Offline Demo evolution pipeline started'),
        'info'
      );
      onOpenConsole();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : tx('启动 Demo 失败', 'Failed to launch Demo');
      setErrorMsg(message);
    } finally {
      setLaunching(false);
    }
  };

  const handleLaunchSweep = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLaunching(true);
    try {
      await launchSweep({
        bench: sweepBench,
        subset: sweepBench === 'wb' ? sweepSubset : undefined,
        substrate: sweepSubstrate,
        k: sweepK,
        modes: sweepModes,
        split: sweepSplit,
        workers: sweepWorkers,
        max_tasks: sweepMaxTasks || null,
        dry_run: sweepDryRun,
        model: sweepModel.trim() || undefined,
        effort: sweepSubstrate === 'claude' && sweepClaudeEffort ? sweepClaudeEffort : undefined,
      });
      showToast(tx('基准评测 Sweep 已启动', 'Benchmark Sweep started'), 'info');
      onOpenConsole();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : tx('启动 Sweep 失败', 'Failed to launch Sweep');
      setErrorMsg(message);
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/40">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-500" />
          <span className="font-bold text-sm text-slate-900 dark:text-white">
            {tx('交互式任务启动台 (Interactive Launcher)', 'Interactive Task Launcher')}
          </span>
        </div>

        {/* Launcher mode tabs */}
        <div className="flex items-center space-x-1 bg-slate-200/60 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveLauncherTab('demo')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeLauncherTab === 'demo'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tx('本地快速 Demo (Quick Demo)', 'Offline Quick Demo')}
          </button>
          <button
            type="button"
            onClick={() => setActiveLauncherTab('sweep')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeLauncherTab === 'sweep'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tx('基准评测 Sweep (大规模演进)', 'Benchmark Sweep')}
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
            <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <span className="font-bold text-blue-700 dark:text-blue-400">
                  {tx(
                    '本地确定性流水线演练 (Offline Deterministic Demo)：',
                    'Offline Deterministic Pipeline Verification: '
                  )}
                </span>
                {tx('使用内置 ', 'Runs built-in ')}
                <code className="font-mono text-[11px] bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded">
                  DemoAdapter + DemoProposer
                </code>
                {tx(
                  ' 在本地 Python 环境中完整运行 Propose-Probe-Compose 递归流水线与跨任务经验库累积，无需任何外部大模型 API 凭据或容器。',
                  ' locally in Python to verify the full Propose–Probe–Compose recursive loop and cross-task experience library without external API keys or Docker.'
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveLauncherTab('sweep')}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0 cursor-pointer"
              >
                {tx(
                  '需调用真实执行器 (Claude/OpenCode/Codex)？切换至 Sweep →',
                  'Need real executors (Claude/OpenCode/Codex)? Switch to Sweep →'
                )}
              </button>
            </div>

            {/* Core Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {tx('优化预算乘数 k', 'Budget Multiplier k')}
                </label>
                <select
                  value={demoK}
                  onChange={(e) => setDemoK(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  <option value={1}>
                    {tx('k = 1 (轻量试跑: 4 次执行 / 任务)', 'k = 1 (Light: 4 rollouts / task)')}
                  </option>
                  <option value={2}>
                    {tx('k = 2 (推荐精炼: 8 次执行 / 任务)', 'k = 2 (Recommended: 8 rollouts / task)')}
                  </option>
                  <option value={3}>
                    {tx('k = 3 (高预算探索: 12 次执行 / 任务)', 'k = 3 (Deep: 12 rollouts / task)')}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {tx('演进模式 (Recursion Mode)', 'Recursion Mode')}
                </label>
                <select
                  value={demoMode}
                  onChange={(e) => setDemoMode(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  <option value="both">
                    {tx('Both (并行 + 串行双分支对比)', 'Both (Parallel + Sequential)')}
                  </option>
                  <option value="parallel">
                    {tx('仅并行 (Parallel aggregation)', 'Parallel Only (AGG)')}
                  </option>
                  <option value="sequential">
                    {tx('仅串行 (Sequential chain)', 'Sequential Only (SEQ)')}
                  </option>
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
                {showAdvancedDemo ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                <span>
                  {showAdvancedDemo
                    ? tx('收起高级参数', 'Hide Advanced Options')
                    : tx('展开高级参数 (输出路径)', 'Show Advanced Options (Output Path)')}
                </span>
              </button>

              {showAdvancedDemo && (
                <div className="mt-3 p-4 rounded-xl bg-slate-50/60 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      {tx('输出目录 (Output Path)', 'Output Directory')}
                    </label>
                    <input
                      type="text"
                      value={demoOutput}
                      onChange={(e) => setDemoOutput(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
                      placeholder="runs/demo"
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
                <span>
                  {launching
                    ? tx('正在启动...', 'Starting...')
                    : tx('启动 Demo 自适应优化', 'Launch Demo Evolution')}
                </span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLaunchSweep} className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {tx(
                '在外部标准基准测试套件（JobBench, WorkBuddy, Harvey LAB）上调度真实执行器（Claude Code / OpenCode / Codex）与 Improver 引擎执行多任务适应。',
                'Dispatch real executors (Claude Code / OpenCode / Codex) and Improver engines across external benchmarks (JobBench, WorkBuddy, Harvey LAB).'
              )}
            </p>

            {/* Substrate Selector */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span>
                    {tx('执行器 Substrate 选择 (--substrate)', 'Executor Substrate (--substrate)')}
                  </span>
                </div>
                {onOpenExecutorConfig && (
                  <button
                    type="button"
                    onClick={onOpenExecutorConfig}
                    className="text-[11px] text-orange-600 dark:text-orange-400 hover:underline font-medium cursor-pointer flex items-center gap-1"
                  >
                    <Settings className="w-3 h-3" />
                    <span>
                      {tx('配置 Unified API / 端点与模型', 'Configure Unified API / Endpoints')}
                    </span>
                  </button>
                )}
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
                    <span>Claude Code (claude)</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">
                    {executorStatus?.executors.find((e) => e.id === 'claude')?.current_model ||
                      'Anthropic / OpenAI-Chat'}
                  </div>
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
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">
                    {executorStatus?.executors.find((e) => e.id === 'oc')?.current_model ||
                      'Bun + OpenCode Substrate'}
                  </div>
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
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">
                    {executorStatus?.executors.find((e) => e.id === 'cx')?.current_model ||
                      'Codex CLI + Responses API'}
                  </div>
                </button>
              </div>
            </div>

            {/* Core Sweep Parameters */}
            <div
              className={`grid grid-cols-1 ${
                sweepBench === 'wb' ? 'sm:grid-cols-4' : 'sm:grid-cols-3'
              } gap-4`}
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {tx('基准套件 (Benchmark)', 'Benchmark Suite')}
                </label>
                <select
                  value={sweepBench}
                  onChange={(e) => setSweepBench(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  <option value="jb">
                    {tx('JobBench (日常办公与专业对账)', 'JobBench (Professional workflows)')}
                  </option>
                  <option value="wb">
                    {tx('WorkBuddy-Bench (Office+Web+Code)', 'WorkBuddy-Bench (Office+Web+Code)')}
                  </option>
                  <option value="lab">
                    {tx('Harvey LAB (法律业务与评分准则)', 'Harvey LAB (Legal benchmarks)')}
                  </option>
                </select>
              </div>

              {sweepBench === 'wb' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {tx('WorkBuddy 子集 (--subset)', 'WorkBuddy Subset (--subset)')}
                  </label>
                  <select
                    value={sweepSubset}
                    onChange={(e) => setSweepSubset(e.target.value as 'office' | 'web' | 'code')}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="office">{tx('office (办公文档与表格)', 'office (Docs & Sheets)')}</option>
                    <option value="web">{tx('web (前端与网页构建)', 'web (Frontend & Web)')}</option>
                    <option value="code">{tx('code (软件工程代码)', 'code (Software Engineering)')}</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {tx('预算乘数 k', 'Budget Multiplier k')}
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
                  {tx('演进模式 (--modes)', 'Recursion Modes (--modes)')}
                </label>
                <select
                  value={sweepModes}
                  onChange={(e) => setSweepModes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  <option value="both">Both (parallel,sequential)</option>
                  <option value="parallel">{tx('仅并行 (parallel / agg)', 'Parallel Only (agg)')}</option>
                  <option value="sequential">{tx('仅串行 (sequential / seq)', 'Sequential Only (seq)')}</option>
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
                {showAdvancedSweep ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                <span>
                  {showAdvancedSweep
                    ? tx('收起高级参数', 'Hide Advanced Options')
                    : tx(
                        '展开高级参数 (并发线程、划分切分、单次模型覆盖与推理强度)',
                        'Show Advanced Options (Workers, Split, Model Override & Effort)'
                      )}
                </span>
              </button>

              {showAdvancedSweep && (
                <div className="mt-3 p-4 rounded-xl bg-slate-50/60 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        {tx('并行并发工作线程 (Workers)', 'Parallel Workers')}
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
                        {tx('数据划分 (Split)', 'Dataset Split')}
                      </label>
                      <select
                        value={sweepSplit}
                        onChange={(e) => setSweepSplit(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                      >
                        <option value="all">{tx('全集 (all)', 'All (all)')}</option>
                        <option value="train">{tx('训练集 (train)', 'Train (train)')}</option>
                        <option value="test">{tx('测试集 (test)', 'Test (test)')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        {tx('最大任务数 (空代表全部)', 'Max Tasks (blank = all)')}
                      </label>
                      <input
                        type="number"
                        min={1}
                        placeholder={tx('例如: 5', 'e.g. 5')}
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
                        {tx(
                          '单次运行模型覆盖 (--model，留空使用执行器默认配置)',
                          'Per-Run Model Override (--model, blank uses default)'
                        )}
                      </label>
                      <input
                        type="text"
                        value={sweepModel}
                        onChange={(e) => setSweepModel(e.target.value)}
                        placeholder={tx(
                          '留空则沿用 Unified API / Substrate 默认模型',
                          'Leave blank to use Unified API / Substrate default model'
                        )}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                    {sweepSubstrate === 'claude' && (
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          {tx(
                            'Claude 推理强度 (SEC_AGENT_HARNESS2_CLAUDE_EFFORT)',
                            'Claude Reasoning Effort (SEC_AGENT_HARNESS2_CLAUDE_EFFORT)'
                          )}
                        </label>
                        <select
                          value={sweepClaudeEffort}
                          onChange={(e) =>
                            setSweepClaudeEffort(
                              e.target.value as 'low' | 'medium' | 'high' | ''
                            )
                          }
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
                        >
                          <option value="">{tx('沿用全局配置', 'Inherit global setting')}</option>
                          <option value="low">{tx('low (快速轻量)', 'low (Fast)')}</option>
                          <option value="medium">{tx('medium (均衡推理)', 'medium (Balanced)')}</option>
                          <option value="high">{tx('high (深度思考)', 'high (Deep thinking)')}</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sweepDryRun}
                  onChange={(e) => setSweepDryRun(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>
                  {tx(
                    '仅演练模式 (--dry-run: 仅验证任务流和命名空间，不触发大模型调用)',
                    'Dry-run mode (--dry-run: verify task resolution & namespaces without LLM calls)'
                  )}
                </span>
              </label>

              <button
                type="submit"
                disabled={launching || isRunning}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-400 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {launching
                    ? tx('正在启动...', 'Starting...')
                    : tx('启动 Sweep 评测', 'Launch Sweep')}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
