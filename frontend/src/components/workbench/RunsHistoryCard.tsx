import React from 'react';
import { Folder, CheckCircle2, ArrowRight } from 'lucide-react';
import { NavTabType, RunItem } from '../../types';
import { useLang } from '../../i18n/LangContext';

interface RunsHistoryCardProps {
  runs: RunItem[];
  selectedRunId: string;
  onSelectRun: (runId: string, targetTab?: NavTabType) => void;
}

export const RunsHistoryCard: React.FC<RunsHistoryCardProps> = ({
  runs,
  selectedRunId,
  onSelectRun,
}) => {
  const { tx } = useLang();

  return (
    <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-blue-500" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            {tx(`已保存的演进与评测记录 (${runs.length})`, `Saved Evolution & Evaluation Runs (${runs.length})`)}
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          {tx(
            '点击任意卡片高亮联动下方成果与 Diff 审阅器，右侧按钮可直达各分析视图',
            'Click any row to sync the Diff Inspector below, or jump directly to DAG / Library / Benchmark'
          )}
        </span>
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {runs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            {tx(
              '暂无历史记录，点击上方“本地快速 Demo”即可一键开始演进！',
              'No saved runs yet — click "Offline Quick Demo" above to launch your first evolution run!'
            )}
          </div>
        ) : (
          runs.map((r) => {
            const isSelected = r.id === selectedRunId;
            return (
              <div
                key={r.id}
                onClick={() => onSelectRun(r.id)}
                className={`p-4 sm:px-6 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/70 dark:bg-blue-950/30 border-l-4 border-l-blue-600 shadow-sm'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {r.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono">
                      {r.type}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {tx('已联动审阅', 'Active in Inspector')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span>
                      {tx(`包含 ${r.task_count} 任务`, `${r.task_count} task(s)`)}
                    </span>
                    <span>·</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {tx(`成功达标: ${r.completed_count}`, `Completed: ${r.completed_count}`)}
                    </span>
                    {r.failed_count > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-rose-500">
                          {tx(`失败: ${r.failed_count}`, `Failed: ${r.failed_count}`)}
                        </span>
                      </>
                    )}
                    {r.updated_at && (
                      <>
                        <span>·</span>
                        <span>
                          {tx('更新于:', 'Updated:')} {r.updated_at.slice(0, 19).replace('T', ' ')}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onSelectRun(r.id, 'pipeline')}
                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>{tx('流水线 DAG', 'Pipeline DAG')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectRun(r.id, 'library')}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                  >
                    {tx('经验库', 'Library')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectRun(r.id, 'benchmark')}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                  >
                    {tx('对比大盘', 'Benchmark')}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
