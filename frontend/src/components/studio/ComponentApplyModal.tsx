import React from 'react';
import { Send, X } from 'lucide-react';
import { HarnessComponent, RunItem, TaskItem } from '../../types';
import { useLang } from '../../i18n/LangContext';
import { useEscapeKey } from '../ui/ToastContext';

interface ComponentApplyModalProps {
  isOpen: boolean;
  applyingComp: HarnessComponent | null;
  runs: RunItem[];
  targetRunId: string;
  onChangeRunId: (runId: string) => void;
  tasks: TaskItem[];
  targetTaskId: string;
  onChangeTaskId: (taskId: string) => void;
  targetLabel: string;
  onChangeLabel: (label: string) => void;
  applying: boolean;
  onClose: () => void;
  onApply: () => void;
}

export const ComponentApplyModal: React.FC<ComponentApplyModalProps> = ({
  isOpen,
  applyingComp,
  runs,
  targetRunId,
  onChangeRunId,
  tasks,
  targetTaskId,
  onChangeTaskId,
  targetLabel,
  onChangeLabel,
  applying,
  onClose,
  onApply,
}) => {
  const { tx } = useLang();
  useEscapeKey(onClose, isOpen);

  if (!isOpen || !applyingComp) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {tx('装配注入 Harness 组件', 'Inject Component into Run')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tx(
                  '将此组件直接挂载至选定的任务与执行分支',
                  'Mount this component directly into the selected task & harness stage'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Component Info Card */}
        <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 mb-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-white mb-1">
            <span>{applyingComp.label}</span>
            <span className="font-mono text-blue-500 text-[11px]">
              {applyingComp.category.toUpperCase()}
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 mb-1">
            {tx('写入相对路径:', 'Target Path:')} {applyingComp.path}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
            {applyingComp.description}
          </p>
        </div>

        {/* Form Fields */}
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              {tx('目标评测运行 (Run ID)', 'Target Run ID')}
            </label>
            <select
              value={targetRunId}
              onChange={(e) => onChangeRunId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              {tx('目标评测任务 (Task ID)', 'Target Task ID')}
            </label>
            <select
              value={targetTaskId}
              onChange={(e) => onChangeTaskId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
            >
              {tasks.length === 0 ? (
                <option value="">
                  {tx('加载中或无可用任务...', 'Loading or no tasks available...')}
                </option>
              ) : (
                tasks.map((t) => (
                  <option key={t.task_id} value={t.task_id}>
                    {t.task_id} ({t.domain})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              {tx('目标 Harness 分支阶段 (Label)', 'Target Harness Stage Label')}
            </label>
            <select
              value={targetLabel}
              onChange={(e) => onChangeLabel(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
            >
              <option value="base">{tx('base (基线套件)', 'base (Baseline harness)')}</option>
              <option value="agg1">{tx('agg1 (并行合成首轮套件)', 'agg1 (Parallel composed round 1)')}</option>
              <option value="seq1">{tx('seq1 (串行递推首轮套件)', 'seq1 (Sequential round 1)')}</option>
              <option value="c1">{tx('c1 (首轮候选阶段)', 'c1 (Candidate stage 1)')}</option>
            </select>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {tx('取消', 'Cancel')}
          </button>
          <button
            type="button"
            disabled={applying || !targetTaskId}
            onClick={onApply}
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {applying ? (
              <span>{tx('正在注入...', 'Injecting...')}</span>
            ) : (
              <span>{tx('立即装配注入', 'Inject Component Now')}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
