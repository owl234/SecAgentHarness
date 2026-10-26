import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Award,
  GitBranch,
  Search,
  Folder,
  CheckCircle2,
  XCircle,
  TrendingUp,
  HelpCircle,
  Terminal,
  Sliders,
  RefreshCw,
} from 'lucide-react';
import { RunItem, BenchmarkReport } from '../types';
import { fetchBenchmark } from '../api';
import { useTaskInspector } from '../hooks/useTaskInspector';
import { SmartIntentDiffViewer } from './SmartIntentDiffViewer';
import { useLang } from '../i18n/LangContext';

interface DashboardViewProps {
  runs: RunItem[];
  selectedRunId: string;
  onSelectRunId: (id: string) => void;
  selectedTaskId: string;
  onSelectTaskId: (taskId: string, replace?: boolean) => void;
  onNavigateToPipeline?: (runId: string, taskId?: string) => void;
  onOpenConsole?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  runs,
  selectedRunId,
  onSelectRunId,
  selectedTaskId,
  onSelectTaskId,
  onNavigateToPipeline,
  onOpenConsole,
}) => {
  const { tx } = useLang();

  // Tab state: 'diff' | 'benchmark'
  const [activeSubTab, setActiveSubTab] = useState<'diff' | 'benchmark'>('diff');

  // Search and filter state for left master list
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'demo' | 'sweep'>('all');

  // Benchmark Report state
  const [benchmarkReport, setBenchmarkReport] = useState<BenchmarkReport | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const reqIdRef = useRef(0);

  // Inspector hook for the right diff viewer
  const {
    tasks,
    taskDetail,
    diffBase,
    diffCompare,
    diffResult,
    diffLoading,
    handleComparisonChange,
  } = useTaskInspector({
    selectedRunId,
    selectedTaskId,
    onSelectTaskId,
  });

  // Fetch benchmark report whenever selectedRunId changes
  useEffect(() => {
    if (!selectedRunId) {
      setBenchmarkReport(null);
      return;
    }
    const reqId = ++reqIdRef.current;
    setBenchmarkLoading(true);
    fetchBenchmark(selectedRunId)
      .then((data) => {
        if (reqId === reqIdRef.current) {
          setBenchmarkReport(data);
        }
      })
      .catch((e) => {
        console.error('Failed to load benchmark report:', e);
        if (reqId === reqIdRef.current) {
          setBenchmarkReport(null);
        }
      })
      .finally(() => {
        if (reqId === reqIdRef.current) {
          setBenchmarkLoading(false);
        }
      });
  }, [selectedRunId]);

  // Filtered runs list
  const filteredRuns = useMemo(() => {
    return runs.filter((r) => {
      const matchQuery =
        !searchQuery ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.domain && r.domain.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchType =
        typeFilter === 'all'
          ? true
          : typeFilter === 'demo'
          ? r.type === 'demo'
          : r.type === 'sweep';

      return matchQuery && matchType;
    });
  }, [runs, searchQuery, typeFilter]);

  // Current selected run object
  const currentRun = useMemo(
    () => runs.find((r) => r.id === selectedRunId) || (runs.length > 0 ? runs[0] : null),
    [runs, selectedRunId]
  );

  const hasBenchmarkData =
    benchmarkReport && (benchmarkReport.has_judged || benchmarkReport.has_base_judged);

  const totalRunsCompleted = runs.reduce((sum, r) => sum + r.completed_count, 0);
  const totalRunsTasks = runs.reduce((sum, r) => sum + r.task_count, 0);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              {tx('数据与评测大盘', 'Runs & Analytics Dashboard')}
            </span>
            <span className="text-xs text-slate-400">
              {tx('历史复盘 · 成果审阅 · 量化评估', 'Historical Runs · Deliverables · Quantitative Benchmark')}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mt-1.5 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <span>{tx('演进成果与评测指标全景看板', 'Evolution Deliverables & Benchmark Dashboard')}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {tx(
              '集中审视历次运行演进后的套件改动 (Prompt / Skills / Guards / Scripts)、智能意图提炼以及与基准 (Baseline) 的量化得分对比。',
              'Centrally inspect adapted harness deliverables, smart intent synthesis, and quantitative score deltas against the baseline.'
            )}
          </p>
        </div>

        {/* Global Summary Metric Pill */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl text-right">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
              {tx('总运行次数 / 累积任务', 'Total Runs / Cumulative Tasks')}
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {runs.length} Runs · {totalRunsTasks} Tasks
            </span>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 px-3.5 py-2 rounded-xl text-right">
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-medium">
              {tx('演进成功达标总计', 'Total Completed Tasks')}
            </span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {totalRunsCompleted} (
              {totalRunsTasks > 0
                ? Math.round((totalRunsCompleted / totalRunsTasks) * 100)
                : 0}
              %)
            </span>
          </div>
        </div>
      </div>

      {/* 2. Master-Detail Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Master Run List (4 cols on lg) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          {/* List Header & Search */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-blue-500" />
                <span>{tx(`运行归档列表 (${filteredRuns.length})`, `Run Archives (${filteredRuns.length})`)}</span>
              </h3>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tx('搜索 Run 标识或名称...', 'Search Run ID or name...')}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Type Filter Tabs */}
            <div className="flex items-center gap-1.5 text-xs">
              {(
                [
                  { id: 'all', label: tx('全部', 'All') },
                  { id: 'demo', label: 'Demo' },
                  { id: 'sweep', label: 'Sweep' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTypeFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    typeFilter === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Runs Scroll List */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[calc(100vh-22rem)] overflow-y-auto">
            {filteredRuns.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                {tx('未找到匹配的运行记录', 'No matching runs found')}
              </div>
            ) : (
              filteredRuns.map((r) => {
                const isSelected = r.id === selectedRunId;
                const completionRate =
                  r.task_count > 0
                    ? Math.round((r.completed_count / r.task_count) * 100)
                    : 0;

                return (
                  <div
                    key={r.id}
                    onClick={() => onSelectRunId(r.id)}
                    className={`p-3.5 transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-l-blue-600 shadow-sm'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {r.name}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase shrink-0 ${
                          r.type === 'demo'
                            ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                        }`}
                      >
                        {r.type}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                      <span className="flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>
                          {r.completed_count}/{r.task_count}
                        </span>
                        <span className="text-[10px] text-slate-400">({completionRate}%)</span>
                      </span>

                      {r.failed_count > 0 && (
                        <span className="text-rose-500 text-[10px]">
                          {tx(`失败 ${r.failed_count}`, `Fail ${r.failed_count}`)}
                        </span>
                      )}

                      {r.updated_at && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {r.updated_at.slice(5, 16).replace('T', ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detail View (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-6">
          {!currentRun ? (
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <Folder className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {tx('暂无选中的运行记录', 'No Run Selected')}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {tx('请在左侧列表中点击选择一个 Run 查看其详细成果', 'Select a run from the left list to inspect its deliverables')}
              </p>
            </div>
          ) : (
            <>
              {/* Active Run Header Card */}
              <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                        {currentRun.name}
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                        {currentRun.id}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold">
                        {currentRun.type.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      {currentRun.path}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {onNavigateToPipeline && (
                      <button
                        type="button"
                        onClick={() => onNavigateToPipeline(currentRun.id, selectedTaskId)}
                        className="px-3.5 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-500/20 transition-all cursor-pointer"
                      >
                        <GitBranch className="w-3.5 h-3.5" />
                        <span>{tx('在演进流水线中查看完整 DAG', 'View Full DAG in Pipeline')}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-Tab Navigation Switcher */}
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 mt-5 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('diff')}
                    className={`pb-2.5 px-3 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
                      activeSubTab === 'diff'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    <span>{tx('演进成果与智能 Diff 审阅', 'Deliverables & Smart Intent Diff')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSubTab('benchmark')}
                    className={`pb-2.5 px-3 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
                      activeSubTab === 'benchmark'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>{tx('基准测试与量化打分 (Benchmark)', 'Benchmark & Evaluation')}</span>
                    {hasBenchmarkData && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Sub-Tab 1: Deliverables & Smart Diff Viewer */}
              {activeSubTab === 'diff' && (
                <div className="space-y-4">
                  {/* Task Selector Toolbar */}
                  <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {tx('选择任务 (Task ID):', 'Task Inspector:')}
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

                    <div className="text-xs text-slate-400">
                      {tx(
                        `当前 Run 包含 ${tasks.length} 个演进任务`,
                        `${tasks.length} task(s) in this run`
                      )}
                    </div>
                  </div>

                  {/* Smart Intent Diff Viewer */}
                  <SmartIntentDiffViewer
                    diff={diffResult}
                    baseLabel={diffBase}
                    compareLabel={diffCompare}
                    availableLabels={taskDetail?.available_harnesses || ['base', 'agg1']}
                    onChangeComparison={handleComparisonChange}
                    loading={diffLoading}
                    onViewPipeline={() =>
                      onNavigateToPipeline &&
                      onNavigateToPipeline(currentRun.id, selectedTaskId)
                    }
                  />
                </div>
              )}

              {/* Sub-Tab 2: Benchmark & Quantitative Evaluation */}
              {activeSubTab === 'benchmark' && (
                <div className="space-y-6">
                  {benchmarkLoading ? (
                    <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-xs text-slate-500 space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                      <p>{tx('正在加载评测报告...', 'Loading benchmark evaluation report...')}</p>
                    </div>
                  ) : !hasBenchmarkData ? (
                    <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-4 shadow-sm">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mx-auto">
                        <HelpCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {tx(
                            '当前 Run 尚未生成打分报告 (judged.json)',
                            'No Judged Evaluation Report (judged.json) Found for This Run'
                          )}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1.5 leading-relaxed">
                          {tx(
                            '基准测试打分通常在 Sweep 跑完后由 ',
                            'Benchmark grading is executed after a sweep via '
                          )}
                          <code className="text-blue-600 dark:text-blue-400 font-mono px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 rounded">
                            sec-agent-harness2-judge
                          </code>
                          {tx(
                            ' 独立执行。本地 Demo 任务关注的是确定性递归演进机制与交付物，无需独立大模型裁决打分。',
                            '. Offline Demo runs verify deterministic Propose–Probe–Compose mechanics without requiring an external LLM judge.'
                          )}
                        </p>
                      </div>

                      {onOpenConsole && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={onOpenConsole}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 font-semibold rounded-xl border border-slate-200 dark:border-slate-700 inline-flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <Terminal className="w-3.5 h-3.5" />
                            <span>{tx('打开控制台查看实时日志', 'Open Live Execution Console')}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Comparison Score Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
                            {tx('基准套件均分 (Baseline)', 'Baseline Mean Score')}
                          </span>
                          <p className="text-3xl font-extrabold text-slate-700 dark:text-slate-300 mt-2">
                            {benchmarkReport.base_stats.avg_score}%
                          </p>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                            {tx(
                              `全通过率: ${benchmarkReport.base_stats.all_pass_rate}% (${benchmarkReport.base_stats.graded} 题已评)`,
                              `All-pass rate: ${benchmarkReport.base_stats.all_pass_rate}% (${benchmarkReport.base_stats.graded} graded)`
                            )}
                          </span>
                        </div>

                        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl relative overflow-hidden shadow-sm">
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium block">
                            {tx('优化后套件均分 (Harness² Adapted)', 'Harness² Adapted Mean Score')}
                          </span>
                          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
                            {benchmarkReport.adapted_stats.avg_score}%
                          </p>
                          <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1 block">
                            {tx(
                              `全通过率: ${benchmarkReport.adapted_stats.all_pass_rate}% (${benchmarkReport.adapted_stats.graded} 题已评)`,
                              `All-pass rate: ${benchmarkReport.adapted_stats.all_pass_rate}% (${benchmarkReport.adapted_stats.graded} graded)`
                            )}
                          </span>
                        </div>

                        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                          <span className="text-xs text-purple-600 dark:text-purple-400 font-medium block">
                            {tx('综合性能增益 (Gain)', 'Net Adaptation Gain')}
                          </span>
                          <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-300 mt-2 flex items-center gap-1">
                            <TrendingUp className="w-6 h-6 text-purple-500" />
                            <span>
                              +
                              {(
                                benchmarkReport.adapted_stats.avg_score -
                                benchmarkReport.base_stats.avg_score
                              ).toFixed(1)}
                              %
                            </span>
                          </p>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                            {tx('全通过率变化: +', 'All-pass delta: +')}
                            {(
                              benchmarkReport.adapted_stats.all_pass_rate -
                              benchmarkReport.base_stats.all_pass_rate
                            ).toFixed(1)}
                            %
                          </span>
                        </div>
                      </div>

                      {/* Graded Rows Table */}
                      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {tx('逐题打分明细 (Per-task Graded Records)', 'Per-Task Graded Records')}
                          </h4>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {tx(
                              `共 ${benchmarkReport.judged_rows.length} 条判题记录`,
                              `${benchmarkReport.judged_rows.length} graded task(s)`
                            )}
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100/60 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                              <tr>
                                <th className="py-3 px-4 font-medium">Task ID</th>
                                <th className="py-3 px-4 font-medium">{tx('模式 (Mode)', 'Mode')}</th>
                                <th className="py-3 px-4 font-medium">{tx('采纳阶段 (Label)', 'Chosen Stage')}</th>
                                <th className="py-3 px-4 font-medium">{tx('判题得分 (Score)', 'Score')}</th>
                                <th className="py-3 px-4 font-medium">{tx('全通过 (All Pass)', 'All Pass')}</th>
                                <th className="py-3 px-4 font-medium">{tx('采纳基准?', 'Kept Base?')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-200">
                              {benchmarkReport.judged_rows.map((row, idx) => {
                                const scorePct =
                                  row.n_criteria > 0
                                    ? Math.round((row.n_passed / row.n_criteria) * 100)
                                    : null;

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
                                    <td className="py-3 px-4 font-mono">{row.label}</td>
                                    <td className="py-3 px-4">
                                      {scorePct !== null ? (
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                          {scorePct}% ({row.n_passed}/{row.n_criteria})
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 dark:text-slate-500">Ungraded</span>
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
                                          {tx('保留基准', 'Kept Base')}
                                        </span>
                                      ) : (
                                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                                          {tx('采纳优化', 'Adapted')}
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
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
