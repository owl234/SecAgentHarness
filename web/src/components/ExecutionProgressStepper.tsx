import React from 'react';
import {
  CheckCircle2,
  Clock,
  Play,
  Sparkles,
  Zap,
  Layers,
  ArrowRight,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useLang } from '../i18n/LangContext';

export interface StepperProps {
  isRunning: boolean;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'terminated';
  currentStage?: number; // 0: Base, 1: Propose, 2: Probe, 3: Compose
  currentMessage?: string;
  onOpenConsole?: () => void;
  onExploreResult?: () => void;
  onDismiss?: () => void;
}

/**
 * Dynamically infers the current 4-stage recursion step (0..3) and latest active log line
 * from the real-time SSE log buffer.
 */
export function inferStageFromLogs(logs: string[]): { stage: number; lastLine: string } {
  if (!logs || logs.length === 0) {
    return { stage: 0, lastLine: '' };
  }

  let inferredStage = 0;
  let lastMeaningfulLine = '';

  const recent = logs.slice(-80);
  for (const raw of recent) {
    const line = raw.trim();
    if (!line) continue;
    lastMeaningfulLine = line;
    const lower = line.toLowerCase();

    if (
      lower.includes('compose') ||
      lower.includes('agg1') ||
      lower.includes('agg2') ||
      lower.includes('select') ||
      lower.includes('library') ||
      lower.includes('chosen') ||
      lower.includes('融合') ||
      lower.includes('裁决')
    ) {
      inferredStage = Math.max(inferredStage, 3);
    } else if (
      lower.includes('probe') ||
      lower.includes('rollout') ||
      lower.includes('executing candidate') ||
      lower.includes('试跑') ||
      lower.includes('探测')
    ) {
      inferredStage = Math.max(inferredStage, 2);
    } else if (
      lower.includes('propose') ||
      lower.includes('inv1') ||
      lower.includes('dom1') ||
      lower.includes('diagnos') ||
      lower.includes('improver') ||
      lower.includes('提议')
    ) {
      inferredStage = Math.max(inferredStage, 1);
    } else if (lower.includes('base') || lower.includes('starting') || lower.includes('基线')) {
      inferredStage = Math.max(inferredStage, 0);
    }
  }

  return { stage: inferredStage, lastLine: lastMeaningfulLine };
}

export const ExecutionProgressStepper: React.FC<StepperProps> = ({
  isRunning,
  status,
  currentStage = 0,
  currentMessage = '',
  onOpenConsole,
  onExploreResult,
  onDismiss,
}) => {
  const { tx } = useLang();

  const steps = [
    {
      title: tx('第一步：初始执行 (Base)', 'Step 1: Baseline Rollout (Base)'),
      desc: tx(
        '使用未修改的基准套件运行任务，获取初始执行轨迹与交付成果物',
        'Run the task with the unmodified base harness to capture initial trajectory & deliverables'
      ),
      icon: Play,
    },
    {
      title: tx('第二步：诊断并提议改进 (Propose)', 'Step 2: Diagnose & Propose Edits (Propose)'),
      desc: tx(
        '分析初始缺陷，同时构思通用规则优化 (INV) 与专业技能增强 (DOM)',
        'Diagnose trajectory flaws and propose invariant (INV) & domain-specific (DOM) edits'
      ),
      icon: Sparkles,
    },
    {
      title: tx('第三步：试跑探测 (Probe)', 'Step 3: Probe Candidate Harnesses (Probe)'),
      desc: tx(
        '在同一任务中部署候选套件并试跑，收集执行对比差异与行为证据',
        'Deploy candidate harnesses on the task to gather behavioral contrast evidence'
      ),
      icon: Zap,
    },
    {
      title: tx('第四步：融合最佳装备 (Compose)', 'Step 4: Compose & Distill Memory (Compose)'),
      desc: tx(
        '根据试跑证据择优组合出最终套件，并将证据沉淀至跨任务经验库',
        'Synthesize the best final harness from probe evidence and persist lessons to the library'
      ),
      icon: Layers,
    },
  ];

  if (status === 'idle') {
    return null;
  }

  const isCompleted = status === 'completed';
  const isFailedOrStopped = status === 'failed' || status === 'terminated';

  return (
    <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 transition-all">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-3 h-3 rounded-full ${
              isRunning
                ? 'bg-blue-500 animate-ping'
                : isCompleted
                ? 'bg-emerald-500'
                : 'bg-rose-500'
            }`}
          />
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            {isRunning
              ? tx(
                  '递归套件优化流水线正在执行',
                  'Recursive Harness Evolution Pipeline Running'
                )
              : isCompleted
              ? tx(
                  '套件优化流水线已全部完成',
                  'Harness Evolution Pipeline Completed Successfully'
                )
              : tx(
                  '流水线执行异常或已终止',
                  'Pipeline Execution Failed or Terminated'
                )}
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
              isRunning
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                : isCompleted
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800'
            }`}
          >
            {isRunning
              ? tx('处理中...', 'In Progress...')
              : isCompleted
              ? tx('优化成功', 'Completed')
              : status === 'terminated'
              ? tx('已终止', 'Terminated')
              : tx('执行失败', 'Failed')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenConsole && (
            <button
              type="button"
              onClick={onOpenConsole}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {tx('实时终端日志', 'Live Terminal Logs')}
            </button>
          )}
          {isCompleted && onExploreResult && (
            <button
              type="button"
              onClick={onExploreResult}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1 rounded-md shadow-sm transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>{tx('查看优化成效', 'Explore Results')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          {!isRunning && onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              title={tx('收起进度面板', 'Dismiss progress panel')}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Stepper Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {steps.map((step, idx) => {
          const isDone = isCompleted || idx < currentStage;
          const isCurrent = isRunning && idx === currentStage;
          const isStepFailed = isFailedOrStopped && idx === currentStage;

          return (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border transition-all ${
                isDone
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/60'
                  : isCurrent
                  ? 'bg-blue-50/60 dark:bg-blue-900/20 border-blue-400 dark:border-blue-500/60 shadow-sm'
                  : isStepFailed
                  ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/60'
                  : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/60 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white animate-pulse'
                      : isStepFailed
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isStepFailed ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {isDone
                    ? tx('已完成', 'Done')
                    : isCurrent
                    ? tx('正在进行', 'Active')
                    : isStepFailed
                    ? tx('已中断', 'Stopped')
                    : tx('等待', 'Pending')}
                </div>
              </div>

              <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">
                {step.title}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {step.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Live Log Message Preview */}
      {currentMessage && (
        <div className="bg-slate-900 text-slate-300 font-mono text-xs px-3.5 py-2 rounded-lg flex items-center gap-2 overflow-hidden border border-slate-800">
          <Clock
            className={`w-3.5 h-3.5 text-blue-400 shrink-0 ${
              isRunning ? 'animate-spin' : ''
            }`}
          />
          <span className="truncate">{currentMessage}</span>
        </div>
      )}
    </div>
  );
};
