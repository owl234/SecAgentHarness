import React, { useEffect, useMemo, useState } from 'react';
import {
  Layers,
  Zap,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sliders,
  Terminal,
  Flame,
  HelpCircle,
  BarChart3,
} from 'lucide-react';
import {
  RunItem,
  SystemStatus,
  PreflightStatus,
  ExecutorStatusResponse,
  NavTabType,
} from '../types';
import {
  stopExecution,
  fetchPreflight,
  fetchExecutors,
} from '../api';
import { ExecutionProgressStepper, inferStageFromLogs } from './ExecutionProgressStepper';
import { TaskLauncherCard } from './workbench/TaskLauncherCard';
import { useLang } from '../i18n/LangContext';
import { useToast } from './ui/ToastContext';

interface WorkbenchViewProps {
  runs: RunItem[];
  selectedRunId: string;
  systemStatus: SystemStatus | null;
  logs: string[];
  executorRefreshVersion?: number;
  onSelectRun: (runId: string, targetTab?: NavTabType) => void;
  onNavigateToDashboard?: (runId?: string) => void;
  onOpenConsole: () => void;
  onNavigateToStudio?: () => void;
  onOpenExecutorConfig?: () => void;
  onOpenTerminology?: () => void;
}

export const WorkbenchView: React.FC<WorkbenchViewProps> = ({
  runs,
  selectedRunId,
  systemStatus,
  logs,
  executorRefreshVersion = 0,
  onSelectRun,
  onNavigateToDashboard,
  onOpenConsole,
  onNavigateToStudio,
  onOpenExecutorConfig,
  onOpenTerminology,
}) => {
  const { tx } = useLang();
  const { showToast } = useToast();

  const [preflight, setPreflight] = useState<PreflightStatus | null>(null);
  const [executorStatus, setExecutorStatus] = useState<ExecutorStatusResponse | null>(null);
  const [stepperDismissed, setStepperDismissed] = useState(false);

  const execStatus = systemStatus?.status.status || 'idle';
  const isRunning = execStatus === 'running';
  const isCompleted = execStatus === 'completed';

  // Reset stepper dismissal whenever a job starts running
  useEffect(() => {
    if (isRunning) {
      setStepperDismissed(false);
    }
  }, [isRunning]);

  // Fetch preflight & executor status on mount and when executor config changes
  useEffect(() => {
    fetchPreflight()
      .then((data) => setPreflight(data))
      .catch((err) => console.error('Failed to fetch preflight:', err));
    fetchExecutors()
      .then((data) => setExecutorStatus(data))
      .catch((err) => console.error('Failed to fetch executors:', err));
  }, [executorRefreshVersion]);

  const { stage: inferredStage, lastLine: inferredLastLine } = useMemo(
    () => inferStageFromLogs(logs),
    [logs]
  );

  const handleStopJob = async () => {
    try {
      await stopExecution();
      showToast(tx('已发送终止执行指令', 'Stop signal sent to active job'), 'info');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showToast(tx(`终止失败: ${message}`, `Failed to stop: ${message}`), 'error');
    }
  };

  const handleGoToDashboard = () => {
    if (onNavigateToDashboard) {
      onNavigateToDashboard(selectedRunId);
    } else {
      onSelectRun(selectedRunId, 'dashboard');
    }
  };

  const totalCompleted = runs.reduce((acc, r) => acc + r.completed_count, 0);
  const totalTasks = runs.reduce((acc, r) => acc + r.task_count, 0);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Quick Help */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-sm">
              {tx('一体化演进工作台 (Harness² Workbench)', 'Harness² Unified Evolution Workbench')}
            </span>
            <span className="text-xs text-blue-100 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              {tx('统一全景调度 · 敏捷执行中心', 'Unified Dispatch · Agile Execution Hub')}
            </span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight mt-1.5">
            {tx(
              '智能体套件递归自适应进化工作台',
              'Recursive Self-Evolving Agent Harness Workbench'
            )}
          </h2>
          <p className="text-xs text-blue-100 mt-1 max-w-2xl leading-relaxed">
            {tx(
              '在不微调大模型权重的前提下，让 AI 自主诊断缺陷、试跑探测效果并提炼出最强运行装备（提示词、工具指引、安全护栏、技能手册与辅助脚本）。支持原生一键使用 Claude Code 深度思考执行器。',
              'Without fine-tuning model weights, Harness² autonomously diagnoses trajectory flaws, probes candidate edits, and composes stronger agent surfaces (prompts, tool contracts, guardrails, skills, and scripts).'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGoToDashboard}
            className="px-3.5 py-2 bg-white/20 hover:bg-white/30 border border-white/40 rounded-xl text-xs font-bold text-white flex items-center gap-2 transition-all cursor-pointer backdrop-blur-sm shadow-sm"
          >
            <BarChart3 className="w-4 h-4 text-amber-200" />
            <span>{tx('前往数据与评测大盘', 'View Runs & Analytics')}</span>
          </button>

          {onNavigateToStudio && (
            <button
              type="button"
              onClick={onNavigateToStudio}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-xl text-xs font-semibold text-white flex items-center gap-2 transition-all cursor-pointer backdrop-blur-sm"
            >
              <Layers className="w-4 h-4 text-cyan-200" />
              <span>{tx('Harness 组件工作室', 'Component Studio')}</span>
            </button>
          )}

          {onOpenTerminology && (
            <button
              type="button"
              onClick={onOpenTerminology}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-xl text-xs font-semibold text-white flex items-center gap-2 transition-all cursor-pointer backdrop-blur-sm"
            >
              <HelpCircle className="w-4 h-4 text-blue-200" />
              <span>{tx('核心概念小百科', 'Concepts Guide')}</span>
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
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {tx('系统前置环境检测与执行器就绪度', 'Environment Preflight & Substrate Readiness')}
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 font-semibold">
                  {preflight.has_credentials
                    ? tx('大模型凭据已就绪', 'LLM Credentials Ready')
                    : tx('本地离线就绪 (免API)', 'Offline Demo Ready (No API Needed)')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {preflight.credentials.message} · {preflight.docker.message}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {onOpenExecutorConfig && (
              <button
                type="button"
                onClick={onOpenExecutorConfig}
                className="px-2.5 py-1 rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[11px] font-medium flex items-center gap-1 hover:bg-orange-500/20 cursor-pointer"
              >
                <Flame className="w-3 h-3" />
                <span>{tx('配置 Unified API / 执行器', 'Configure Unified API / Executors')}</span>
              </button>
            )}
            <span
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium ${
                preflight.benchmarks.demo.available
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              {tx('Demo: 开箱可用', 'Demo: Ready')}
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium ${
                preflight.benchmarks.jb.available
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  : 'bg-slate-50 text-slate-400 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              JobBench:{' '}
              {preflight.benchmarks.jb.available
                ? tx('已安装', 'Ready')
                : tx('未就绪', 'Not Installed')}
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium ${
                preflight.benchmarks.lab.available
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  : 'bg-slate-50 text-slate-400 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              LAB:{' '}
              {preflight.benchmarks.lab.available
                ? tx('已安装', 'Ready')
                : tx('未就绪', 'Not Installed')}
            </span>
          </div>
        </div>
      )}

      {/* 3. Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
              <span>{tx('已注册演进任务', 'Registered Evolution Tasks')}</span>
              <Layers className="w-4 h-4 text-blue-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {totalTasks}
            </p>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {tx(`涵盖 ${runs.length} 个独立评测与运行集合`, `Across ${runs.length} run collection(s)`)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleGoToDashboard}
            className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
          >
            <span>{tx('在数据大盘查看明细', 'Inspect in Dashboard')}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
              <span>{tx('成功演进达标数', 'Completed Adaptations')}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {totalCompleted}
            </p>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {tx('通过率:', 'Completion rate:')}{' '}
              {totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0}%
            </span>
          </div>
          <button
            type="button"
            onClick={handleGoToDashboard}
            className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
          >
            <span>{tx('查看量化评测对比', 'View Benchmark Deltas')}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
              <span>{tx('Harness 组件维度', 'Harness Surface Dimensions')}</span>
              <Sliders className="w-4 h-4 text-purple-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {tx('9 维架构', '9 Dimensions')}
            </p>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              c1~c9: Prompt, Memory, Skills, MCP...
            </span>
          </div>
          {onNavigateToStudio && (
            <button
              type="button"
              onClick={onNavigateToStudio}
              className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <span>{tx('前往组件工作室定制', 'Customize in Studio')}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
              <span>{tx('当前默认执行器', 'Active Default Executor')}</span>
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
            <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
              <span>
                {executorStatus?.active_executor === 'oc'
                  ? 'OpenCode (oc)'
                  : executorStatus?.active_executor === 'cx'
                  ? 'Codex (cx)'
                  : 'Claude Code'}
              </span>
            </p>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {executorStatus?.unified_config?.base_url ||
              executorStatus?.unified_config?.api_key_configured
                ? tx(
                    `Unified API 已启用 (${executorStatus.unified_config.protocol || 'auto'})`,
                    `Unified API Active (${executorStatus.unified_config.protocol || 'auto'})`
                  )
                : tx('支持 Unified API 一键打通全引擎', 'Unified API ready for all substrates')}
            </span>
          </div>
          {onOpenExecutorConfig && (
            <button
              type="button"
              onClick={onOpenExecutorConfig}
              className="mt-2 text-xs text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <span>{tx('配置 Unified API 与执行器', 'Configure API & Substrates')}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Active Run Banner & Persistent Stepper */}
      {execStatus !== 'idle' && !stepperDismissed && (
        <div className="space-y-4">
          {isRunning && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-500/40 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-600/10 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center animate-spin">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white text-sm">
                      {tx('后台正在运行:', 'Running Job:')} {systemStatus?.status.job?.job_id}
                    </span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-semibold">
                      {tx('执行中', 'RUNNING')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                    {systemStatus?.status.job?.command?.join(' ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenConsole}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>{tx('打开控制台', 'Open Console')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleStopJob}
                  className="px-3 py-1.5 bg-rose-50 dark:bg-rose-600/20 hover:bg-rose-100 dark:hover:bg-rose-600/40 text-xs font-medium text-rose-600 dark:text-rose-300 rounded-lg border border-rose-200 dark:border-rose-500/40 transition-colors cursor-pointer"
                >
                  {tx('终止执行', 'Stop Job')}
                </button>
              </div>
            </div>
          )}

          {/* Stepper with onExploreResult linking to Dashboard */}
          <ExecutionProgressStepper
            isRunning={isRunning}
            status={execStatus}
            currentStage={inferredStage}
            currentMessage={
              inferredLastLine || systemStatus?.status.job?.command?.join(' ') || ''
            }
            onOpenConsole={onOpenConsole}
            onExploreResult={handleGoToDashboard}
            onDismiss={() => setStepperDismissed(true)}
          />

          {/* Completion Callout Card */}
          {isCompleted && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/80 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-sm animate-fadeIn">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    {tx('本次任务已成功完成演进！', 'Job execution finished successfully!')}
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300/80 mt-0.5">
                    {tx(
                      '已提炼出候选套件组件与运行产物。前往数据与评测大盘审阅完整变更 Diff 与指标。',
                      'Candidate harness components and outputs generated. Head to Runs & Analytics Dashboard to inspect diffs and metrics.'
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGoToDashboard}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>{tx('前往数据大盘审阅成果与对比', 'View Deliverables in Dashboard')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5. Interactive Task Launcher (Demo & Sweep) */}
      <TaskLauncherCard
        isRunning={isRunning}
        executorStatus={executorStatus}
        onOpenConsole={onOpenConsole}
        onOpenExecutorConfig={onOpenExecutorConfig}
      />
    </div>
  );
};

