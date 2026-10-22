import React from 'react';
import {
  CheckCircle2,
  Clock,
  Play,
  Sparkles,
  Zap,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface StepperProps {
  isRunning: boolean;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'terminated';
  currentStage?: number; // 0: Base, 1: Propose, 2: Probe, 3: Compose
  currentMessage?: string;
  onOpenConsole?: () => void;
  onExploreResult?: () => void;
}

export const ExecutionProgressStepper: React.FC<StepperProps> = ({
  isRunning,
  status,
  currentStage = 0,
  currentMessage = '',
  onOpenConsole,
  onExploreResult,
}) => {
  const steps = [
    {
      title: '第一步：初始执行 (Base)',
      desc: '使用未修改的基准套件运行任务，获取初始执行轨迹与交付成果物',
      icon: Play,
    },
    {
      title: '第二步：诊断并提议改进 (Propose)',
      desc: '分析初始缺陷，同时构思通用规则优化 (INV) 与专业技能增强 (DOM)',
      icon: Sparkles,
    },
    {
      title: '第三步：试跑探测 (Probe)',
      desc: '在同一任务中部署候选套件并试跑，收集执行对比差异与行为证据',
      icon: Zap,
    },
    {
      title: '第四步：融合最佳装备 (Compose)',
      desc: '根据试跑证据择优组合出最终套件，并将证据沉淀至跨任务经验库',
      icon: Layers,
    },
  ];

  if (status === 'idle') {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-3 h-3 rounded-full ${
              isRunning
                ? 'bg-blue-500 animate-ping'
                : status === 'completed'
                ? 'bg-emerald-500'
                : 'bg-rose-500'
            }`}
          />
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            {isRunning
              ? '递归套件优化流水线正在执行'
              : status === 'completed'
              ? '套件优化流水线已全部完成'
              : '流水线执行异常或已终止'}
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
              isRunning
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                : status === 'completed'
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800'
            }`}
          >
            {isRunning ? '处理中...' : status === 'completed' ? '优化成功' : '已停止'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenConsole && (
            <button
              onClick={onOpenConsole}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              实时终端日志
            </button>
          )}
          {status === 'completed' && onExploreResult && (
            <button
              onClick={onExploreResult}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-3 py-1 rounded-md shadow-sm transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>查看优化成效</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Stepper Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {steps.map((step, idx) => {
          const IconComponent = step.icon;
          const isDone = status === 'completed' || idx < currentStage;
          const isCurrent = isRunning && idx === currentStage;
          const isPending = !isDone && !isCurrent;

          return (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border transition-all ${
                isDone
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/60'
                  : isCurrent
                  ? 'bg-blue-50/60 dark:bg-blue-900/20 border-blue-400 dark:border-blue-500/60 shadow-sm'
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
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {isDone ? '已完成' : isCurrent ? '正在进行' : '等待'}
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
      {currentMessage && isRunning && (
        <div className="bg-slate-900 text-slate-300 font-mono text-xs px-3.5 py-2 rounded-lg flex items-center gap-2 overflow-hidden border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 animate-spin" />
          <span className="truncate">{currentMessage}</span>
        </div>
      )}
    </div>
  );
};
