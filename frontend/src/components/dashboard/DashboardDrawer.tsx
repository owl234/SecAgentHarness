import React, { useEffect, useState } from 'react';
import { X, Award, BarChart3, GitBranch, Sliders, CheckCircle2, XCircle } from 'lucide-react';
import { BenchmarkReport, DiffResult, RunItem, TaskItem } from '../../types';
import { FlowNode } from '../native_flow/flowTypes';
import { SmartIntentDiffViewer } from '../SmartIntentDiffViewer';
import { useLang } from '../../i18n/LangContext';

type DrawerTab = 'diff' | 'scores';

interface DashboardDrawerProps {
  node: FlowNode | null;
  run: RunItem | null;
  report: BenchmarkReport | null;
  onClose: () => void;
  tasks: TaskItem[];
  selectedTaskId: string;
  onSelectTaskId: (taskId: string, replace?: boolean) => void;
  availableLabels: string[];
  diffBase: string;
  diffCompare: string;
  diffResult: DiffResult | null;
  diffLoading: boolean;
  onChangeComparison: (base: string, compare: string) => void;
  onNavigateToPipeline?: (runId: string, taskId?: string) => void;
}

/** Stations whose natural drill-down is the score table rather than the Diff. */
const SCORE_NODES = new Set(['s1-base-roll', 's4-blind-judge']);

export const DashboardDrawer: React.FC<DashboardDrawerProps> = ({
  node,
  run,
  report,
  onClose,
  tasks,
  selectedTaskId,
  onSelectTaskId,
  availableLabels,
  diffBase,
  diffCompare,
  diffResult,
  diffLoading,
  onChangeComparison,
  onNavigateToPipeline,
}) => {
  const { tx } = useLang();
  const [tab, setTab] = useState<DrawerTab>('diff');

  useEffect(() => {
    if (node) setTab(SCORE_NODES.has(node.id) ? 'scores' : 'diff');
  }, [node?.id]);

  useEffect(() => {
    if (!node) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [node, onClose]);

  if (!node || !run) return null;

  const hasScores = !!report && (report.has_judged || report.has_base_judged);
  const rows = report?.judged_rows ?? [];
  const baseRows = report?.base_rows ?? [];
  const showBaseRows = node.id === 's1-base-roll' && baseRows.length > 0;
  const tableRows = showBaseRows ? baseRows : rows;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-[1px] z-40" onClick={onClose} />
      <aside className="fixed top-0 right-0 h-full w-full max-w-3xl bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col">
        <header className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-mono text-slate-400 uppercase">
              {node.code || (node.stage ? `S${node.stage}` : '')} · {run.name}
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
              {tx(node.titleZh, node.titleEn)}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {tx(node.descriptionZh, node.descriptionEn)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer shrink-0"
            aria-label="close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex items-center gap-2 px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {(
            [
              { id: 'diff', icon: Award, label: tx('演进成果与智能 Diff', 'Deliverables & Smart Diff') },
              { id: 'scores', icon: BarChart3, label: tx('逐题打分明细', 'Per-Task Scores') },
            ] as const
          ).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`py-2.5 px-3 text-xs font-bold flex items-center gap-2 cursor-pointer border-b-2 transition-all ${
                tab === id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {id === 'scores' && hasScores && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
            </button>
          ))}
          {onNavigateToPipeline && (
            <button
              type="button"
              onClick={() => onNavigateToPipeline(run.id, selectedTaskId)}
              className="ml-auto my-1.5 px-3 py-1 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-semibold flex items-center gap-1.5 hover:bg-blue-500/20 cursor-pointer"
            >
              <GitBranch className="w-3.5 h-3.5" />
              {tx('查看完整 DAG', 'View Full DAG')}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === 'diff' && (
            <>
              <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {tx('选择任务:', 'Task Inspector:')}
                  </span>
                  <select
                    value={selectedTaskId}
                    onChange={(e) => onSelectTaskId(e.target.value, false)}
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-1 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
                  >
                    {tasks.length === 0 ? (
                      <option value="">{tx('(无任务)', '(No tasks)')}</option>
                    ) : (
                      tasks.map((t) => (
                        <option key={t.task_id} value={t.task_id}>
                          {t.task_id} {t.domain ? `(${t.domain})` : ''} - {t.status}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <span className="text-xs text-slate-400">
                  {tx(`共 ${tasks.length} 个演进任务`, `${tasks.length} task(s)`)}
                </span>
              </div>
              <SmartIntentDiffViewer
                diff={diffResult}
                baseLabel={diffBase}
                compareLabel={diffCompare}
                availableLabels={availableLabels}
                onChangeComparison={onChangeComparison}
                loading={diffLoading}
                onViewPipeline={() => onNavigateToPipeline?.(run.id, selectedTaskId)}
              />
            </>
          )}

          {tab === 'scores' &&
            (!hasScores || tableRows.length === 0 ? (
              <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-xs text-slate-400">
                {tx('该 Run 暂无逐题打分记录', 'No per-task graded records for this run')}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {showBaseRows ? tx('基线逐题打分', 'Baseline Graded Records') : tx('逐题打分明细', 'Per-Task Graded Records')}
                  </h4>
                  <span className="text-xs text-slate-500">
                    {tx(`共 ${tableRows.length} 条`, `${tableRows.length} record(s)`)}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/60 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3 font-medium">{tx('任务编号', 'Task ID')}</th>
                        <th className="py-2.5 px-3 font-medium">{tx('演进模式', 'Mode')}</th>
                        <th className="py-2.5 px-3 font-medium">{tx('采纳阶段', 'Stage')}</th>
                        <th className="py-2.5 px-3 font-medium">{tx('判题得分', 'Score')}</th>
                        <th className="py-2.5 px-3 font-medium">{tx('全部通过', 'All Pass')}</th>
                        <th className="py-2.5 px-3 font-medium">{tx('采纳策略', 'Choice')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-200">
                      {tableRows.map((row, idx) => {
                        const pct = row.n_criteria > 0 ? Math.round((row.n_passed / row.n_criteria) * 100) : null;
                        const active = row.task_id === selectedTaskId;
                        return (
                          <tr
                            key={`${row.task_id}-${row.mode || idx}`}
                            onClick={() => onSelectTaskId(row.task_id, false)}
                            className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                              active ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">{row.task_id}</td>
                            <td className="py-2.5 px-3 uppercase font-semibold text-slate-500 dark:text-slate-400">{row.mode}</td>
                            <td className="py-2.5 px-3 font-mono">{row.label}</td>
                            <td className="py-2.5 px-3">
                              {pct !== null ? (
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                  {pct}% ({row.n_passed}/{row.n_criteria})
                                </span>
                              ) : (
                                <span className="text-slate-400">{tx('未判分', 'Ungraded')}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {row.all_pass ? (
                                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> {tx('是', 'Yes')}
                                </span>
                              ) : (
                                <span className="text-slate-400 flex items-center gap-1">
                                  <XCircle className="w-3.5 h-3.5" /> {tx('否', 'No')}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {row.chosen_is_base ? (
                                <span className="text-amber-600 dark:text-amber-400 font-medium">{tx('保留基准', 'Kept Base')}</span>
                              ) : (
                                <span className="text-blue-600 dark:text-blue-400 font-medium">{tx('采纳优化', 'Adapted')}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
        </div>
      </aside>
    </>
  );
};
