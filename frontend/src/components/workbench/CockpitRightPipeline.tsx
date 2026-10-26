import React, { useState } from 'react';
import {
  Folder,
  CheckCircle2,
  ArrowRight,
  Scale,
  Layers,
  Activity,
  Sparkles,
  Zap,
  Award,
} from 'lucide-react';
import { EmbeddedLiveTerminal } from './EmbeddedLiveTerminal';
import { LiveStageStep, NavTabType, RunItem } from '../../types';
import { launchJudge } from '../../api';
import { useLang } from '../../i18n/LangContext';
import { useToast } from '../ui/ToastContext';

interface CockpitRightPipelineProps {
  logs: string[];
  isRunning: boolean;
  isCompleted: boolean;
  liveStep: LiveStageStep | null;
  mode: 'parallel' | 'sequential';
  onToggleMode: (mode: 'parallel' | 'sequential') => void;
  activeSubstrate?: string;
  onClearLogs?: () => void;
  runs: RunItem[];
  selectedRunId?: string;
  onSelectRun?: (runId: string, targetTab?: NavTabType) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const CockpitRightPipeline: React.FC<CockpitRightPipelineProps> = ({
  logs,
  isRunning,
  isCompleted,
  liveStep,
  activeSubstrate,
  onClearLogs,
  runs,
  selectedRunId,
  onSelectRun,
  onNavigateToTab,
}) => {
  const { tx } = useLang();
  const { showToast } = useToast();
  const [judgingRunId, setJudgingRunId] = useState<string | null>(null);

  const currentStage = liveStep?.stage ?? (isCompleted ? 5 : 1);

  const phases = [
    {
      stage: 1,
      code: 'S1',
      title: tx('基线采样与先验', 'Baseline & Prior'),
      sub: tx('沙箱隔离与 Base 试跑', 'TaskSpec + Base Rollout'),
      icon: Activity,
    },
    {
      stage: 2,
      code: 'S2',
      title: tx('双轴提议与探测', 'Propose & Probe'),
      sub: tx('INV/DOM 改进与并发试跑', 'INV/DOM Edits & Rollouts'),
      icon: Sparkles,
    },
    {
      stage: 3,
      code: 'S3',
      title: tx('多路合成精炼', 'Compose & Refine'),
      sub: tx('agg 并行融合 / seq 串行', 'Parallel agg / Sequential seq'),
      icon: Zap,
    },
    {
      stage: 4,
      code: 'S4·S5',
      title: tx('盲审裁决与沉淀', 'Blind Judge & Library'),
      sub: tx('0-GT 裁决与经验入库', 'Zero-GT Verdict & Reflection'),
      icon: Award,
    },
  ];

  const handleQuickJudge = async (e: React.MouseEvent, run: RunItem) => {
    e.stopPropagation();
    if (isRunning) {
      showToast(tx('当前已有作业正在运行，请等待完成或先停止', 'A job is already running'), 'error');
      return;
    }
    setJudgingRunId(run.id);
    try {
      await launchJudge({ run_id: run.id });
      showToast(
        tx(`已启动 [${run.name}] 的评测判分任务 (Judge)`, `Started Judge scoring for ${run.name}`),
        'info'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(tx(`启动判分失败: ${msg}`, `Failed to start judge: ${msg}`), 'error');
    } finally {
      setJudgingRunId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3.5 h-full">
      {/* 1. Compact 4-Phase Execution Progress Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isRunning
                  ? 'bg-amber-400 animate-ping'
                  : isCompleted
                  ? 'bg-emerald-500'
                  : 'bg-blue-500'
              }`}
            />
            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
              {tx('递归演进四阶段实时态势', '4-Phase Recursive Evolution Telemetry')}
            </span>
            {activeSubstrate && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {activeSubstrate}
              </span>
            )}
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            {isRunning && liveStep
              ? `${tx('当前步骤', 'Step')} ${liveStep.stepIndex + 1}/12 · ${liveStep.title || ''}`
              : isCompleted
              ? tx('全流程已闭环 (12/12)', 'Pipeline Completed (12/12)')
              : tx('待命就绪 · 启动任务后自动点亮', 'Standby · Lights up during execution')}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {phases.map((p) => {
            const Icon = p.icon;
            const isDone =
              isCompleted ||
              (isRunning &&
                (p.stage === 4 ? currentStage > 5 : currentStage > p.stage));
            const isActive =
              isRunning &&
              (p.stage === 4 ? currentStage >= 4 : currentStage === p.stage);

            return (
              <div
                key={p.code}
                className={`p-2.5 rounded-xl border transition-all flex items-start gap-2 ${
                  isActive
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 shadow-xs ring-1 ring-blue-500/30'
                    : isDone
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300/70 dark:border-emerald-800/60'
                    : 'bg-slate-50/70 dark:bg-slate-950/50 border-slate-200/80 dark:border-slate-800/80'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold ${
                    isActive
                      ? 'bg-blue-600 text-white animate-pulse'
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                      {p.code}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {p.title}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {p.sub}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Saved Runs Quick Manager & One-Click Judge Trigger */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-3.5 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-blue-500" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              {tx(`历史运行记录与快速判分 (${runs.length})`, `Saved Runs & Quick Judge (${runs.length})`)}
            </h4>
          </div>
          <span className="text-[10px] text-slate-400">
            {tx('点击选中联动全局上下文，或一键触发判分与 DAG 下钻', 'Select to sync context, trigger Judge, or inspect DAG')}
          </span>
        </div>

        {runs.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400">
            {tx('暂无历史运行记录，请从左侧启动首次体验', 'No saved runs yet — launch a job on the left')}
          </div>
        ) : (
          <div className="max-h-[145px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70 pr-1">
            {runs.map((r) => {
              const isSelected = r.id === selectedRunId;
              const isBenchRun = r.type !== 'demo' && r.bench !== 'demo';
              return (
                <div
                  key={r.id}
                  onClick={() => onSelectRun?.(r.id)}
                  className={`py-2 px-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/30 border border-blue-500/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {r.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                      {r.completed_count}/{r.task_count} {tx('达标', 'done')}
                    </span>
                    {isBenchRun && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          r.has_judged
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {r.has_judged ? tx('✓ 已判分', '✓ Judged') : tx('待判分', 'Unjudged')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {isBenchRun && (
                      <button
                        type="button"
                        disabled={isRunning || judgingRunId === r.id}
                        onClick={(e) => handleQuickJudge(e, r)}
                        className="px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                        title={tx('对该基准运行执行 sec-agent-harness2-judge 判分', 'Run Judge scoring for this benchmark run')}
                      >
                        <Scale className="w-3 h-3" />
                        <span>{r.has_judged ? tx('重判', 'Re-Judge') : tx('判分', 'Judge')}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onSelectRun?.(r.id, 'dashboard');
                        onNavigateToTab?.('dashboard');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>{tx('评测与 DAG', 'Insights')}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectRun?.(r.id, 'studio');
                        onNavigateToTab?.('studio');
                      }}
                      className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] transition-colors cursor-pointer"
                      title={tx('在组件与经验工坊中检视该运行', 'Open in Component & Experience Studio')}
                    >
                      <Layers className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Lower Section: Full-Height Embedded Live Terminal Log Stream */}
      <EmbeddedLiveTerminal
        logs={logs}
        isRunning={isRunning}
        onClearLogs={onClearLogs}
        currentStepTitle={liveStep?.title}
      />
    </div>
  );
};
