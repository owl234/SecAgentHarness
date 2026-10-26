import React, { useEffect, useRef, useState } from 'react';
import { RunItem, BenchmarkReport } from '../types';
import { fetchBenchmark } from '../api';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Terminal,
} from 'lucide-react';
import { useLang } from '../i18n/LangContext';
import { formatStageLabel } from '../utils/labelFormatter';

interface BenchmarkViewProps {
  runs: RunItem[];
  selectedRunId: string;
  onSelectRunId: (id: string) => void;
  onOpenConsole: () => void;
}

export const BenchmarkView: React.FC<BenchmarkViewProps> = ({
  runs,
  selectedRunId,
  onSelectRunId,
  onOpenConsole,
}) => {
  const { tx } = useLang();
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [loading, setLoading] = useState(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!selectedRunId) return;
    const reqId = ++reqIdRef.current;
    setLoading(true);
    fetchBenchmark(selectedRunId)
      .then((data) => {
        if (reqId === reqIdRef.current) {
          setReport(data);
        }
      })
      .catch((e) => console.error('Failed to load benchmark:', e))
      .finally(() => {
        if (reqId === reqIdRef.current) {
          setLoading(false);
        }
      });
  }, [selectedRunId]);

  const hasData = report && (report.has_judged || report.has_base_judged);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <span>
              {tx(
                '评测分析与效果对比大盘',
                'Benchmark & Evaluation Dashboard'
              )}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {tx(
              '基准套件与递归优化后套件表现量化对比',
              'Quantitative evaluation comparing unmodified Baseline vs. Harness² Adapted harnesses'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {tx('运行记录：', 'Run:')}
          </span>
          <select
            value={selectedRunId}
            onChange={(e) => onSelectRunId(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">
          {tx('正在加载评测报告...', 'Loading benchmark evaluation report...')}
        </div>
      ) : !hasData ? (
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {tx(
                '当前 Run 尚未生成打分报告 (judged.json)',
                'No Judged Evaluation Report (judged.json) Found for This Run'
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              {tx(
                '基准测试打分通常在 Sweep 跑完后由 ',
                'Benchmark grading is executed after a sweep via '
              )}
              <code className="text-blue-600 dark:text-blue-400 font-mono">sec-agent-harness2-judge</code>
              {tx(
                ' 独立执行。本地 Demo 任务关注的是确定性递归优化机制与交付物，无需独立大模型裁决打分。',
                '. Offline Demo runs verify deterministic Propose–Probe–Compose mechanics without requiring an external LLM judge.'
              )}
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenConsole}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 font-medium rounded-lg border border-slate-200 dark:border-slate-700 inline-flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{tx('打开控制台查看实时日志', 'Open Live Execution Console')}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Comparison Score Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
                {tx('基准套件均分', 'Baseline Mean Score')}
              </span>
              <p className="text-3xl font-extrabold text-slate-700 dark:text-slate-300 mt-2">
                {report.base_stats.avg_score}%
              </p>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                {tx(
                  `全通过率: ${report.base_stats.all_pass_rate}% (${report.base_stats.graded} 题已评)`,
                  `All-pass rate: ${report.base_stats.all_pass_rate}% (${report.base_stats.graded} graded)`
                )}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-5 rounded-xl relative overflow-hidden shadow-sm">
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium block">
                {tx('Harness² 优化后套件均分', 'Harness² Adapted Mean Score')}
              </span>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
                {report.adapted_stats.avg_score}%
              </p>
              <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1 block">
                {tx(
                  `全通过率: ${report.adapted_stats.all_pass_rate}% (${report.adapted_stats.graded} 题已评)`,
                  `All-pass rate: ${report.adapted_stats.all_pass_rate}% (${report.adapted_stats.graded} graded)`
                )}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm">
              <span className="text-xs text-purple-600 dark:text-purple-400 font-medium block">
                {tx('综合性能净增益', 'Net Adaptation Gain')}
              </span>
              <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-300 mt-2 flex items-center gap-1">
                <TrendingUp className="w-6 h-6 text-purple-500" />
                <span>
                  +{(report.adapted_stats.avg_score - report.base_stats.avg_score).toFixed(1)}%
                </span>
              </p>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                {tx('全通过率变化: +', 'All-pass delta: +')}
                {(
                  report.adapted_stats.all_pass_rate - report.base_stats.all_pass_rate
                ).toFixed(1)}
                %
              </span>
            </div>
          </div>

          {/* Graded Rows Table */}
          <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
                {tx('逐题打分明细', 'Per-Task Graded Records')}
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {tx(
                  `共 ${report.judged_rows.length} 条判题记录`,
                  `${report.judged_rows.length} graded task(s)`
                )}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/60 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-medium">{tx('任务编号', 'Task ID')}</th>
                    <th className="py-3 px-4 font-medium">{tx('演进模式', 'Mode')}</th>
                    <th className="py-3 px-4 font-medium">{tx('采纳阶段', 'Chosen Stage')}</th>
                    <th className="py-3 px-4 font-medium">{tx('判题得分', 'Score')}</th>
                    <th className="py-3 px-4 font-medium">{tx('全部通过', 'All Pass')}</th>
                    <th className="py-3 px-4 font-medium">{tx('采纳策略', 'Kept Base?')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-200">
                  {report.judged_rows.map((row, idx) => {
                    const scorePct =
                      row.n_criteria > 0
                        ? Math.round((row.n_passed / row.n_criteria) * 100)
                        : null;

                    const rawLabel = row.label || '';
                    const labelFmt = formatStageLabel(rawLabel, tx);

                    return (
                      <tr
                        key={`${row.task_id}-${row.mode || idx}`}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {row.task_id}
                        </td>
                        <td className="py-3 px-4 uppercase font-semibold text-slate-500 dark:text-slate-400">
                          {row.mode}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {labelFmt.shortName}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {rawLabel}
                            </span>
                            {(rawLabel.startsWith('agg') ||
                              rawLabel.startsWith('c') ||
                              rawLabel.startsWith('seq')) && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                🏆
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {scorePct !== null ? (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {scorePct}% ({row.n_passed}/{row.n_criteria})
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">{tx('未判分', 'Ungraded')}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {row.all_pass ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> {tx('是', 'Yes')}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> {tx('否', 'No')}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {row.chosen_is_base ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              {tx('沿用基准', 'Yes (Base)')}
                            </span>
                          ) : (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              {tx('采纳精炼版', 'No (Refined Final)')}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
