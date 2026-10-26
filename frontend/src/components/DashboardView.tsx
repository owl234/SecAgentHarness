import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Folder,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Award,
  Loader2,
  RotateCw,
  Layers,
  GitBranch,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from 'lucide-react';
import { RunItem, BenchmarkReport, DAGNode, ComponentCategory } from '../types';
import { fetchBenchmark } from '../api';
import { useTaskInspector } from '../hooks/useTaskInspector';
import { useLang } from '../i18n/LangContext';
import { RunStrip } from './dashboard/RunStrip';
import { GainHero } from './dashboard/GainHero';
import { PipelineGraph } from './PipelineGraph';
import { SmartIntentDiffViewer } from './SmartIntentDiffViewer';
import { StageDetailDrawer } from './StageDetailDrawer';
import { formatStageLabel } from '../utils/labelFormatter';

interface DashboardViewProps {
  runs: RunItem[];
  selectedRunId: string;
  onSelectRunId: (id: string) => void;
  selectedTaskId: string;
  onSelectTaskId: (taskId: string, replace?: boolean) => void;
  onNavigateToStudio?: (runId: string, taskId?: string, category?: ComponentCategory | null) => void;
  onNavigateToLibrary?: (runId: string, taskId?: string) => void;
  onOpenConsole?: () => void;
}

/**
 * Unified Module ③: Evaluation & Evolution Insights (评测与演进洞察).
 * Combines:
 *  - Tier 1: Run Strip + Macro Benchmark Gain Hero + Interactive Per-Task Score Table
 *  - Tier 2: Task-Level Real Recursive DAG (PipelineGraph) + Zero-GT Blind Verdict +
 *            Smart Semantic Diff (SmartIntentDiffViewer) + Rollout Trajectory Drawer
 */
export const DashboardView: React.FC<DashboardViewProps> = ({
  runs,
  selectedRunId,
  onSelectRunId,
  selectedTaskId,
  onSelectTaskId,
  onNavigateToStudio,
  onNavigateToLibrary,
  onOpenConsole,
}) => {
  const { tx } = useLang();

  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [showScoreTable, setShowScoreTable] = useState(true);
  const [drawerNode, setDrawerNode] = useState<DAGNode | null>(null);
  const reqIdRef = useRef(0);

  const {
    tasks,
    tasksLoading,
    taskDetail,
    detailLoading,
    selectedNode,
    setSelectedNode,
    diffBase,
    diffCompare,
    diffResult,
    diffLoading,
    handleComparisonChange,
    reloadDetail,
  } = useTaskInspector({
    selectedRunId,
    selectedTaskId,
    onSelectTaskId,
  });

  const loadBenchmarkReport = useCallback(() => {
    if (!selectedRunId) {
      setReport(null);
      return;
    }
    const reqId = ++reqIdRef.current;
    setReportLoading(true);
    fetchBenchmark(selectedRunId)
      .then((data) => reqId === reqIdRef.current && setReport(data))
      .catch((e) => {
        console.error('Failed to load benchmark report:', e);
        if (reqId === reqIdRef.current) setReport(null);
      })
      .finally(() => reqId === reqIdRef.current && setReportLoading(false));
  }, [selectedRunId]);

  useEffect(() => {
    setDrawerNode(null);
    loadBenchmarkReport();
  }, [loadBenchmarkReport]);

  // Sync open drawer data on live polling updates without opening closed drawer
  useEffect(() => {
    if (!drawerNode || !taskDetail?.pipeline_graph?.nodes) return;
    const updated = taskDetail.pipeline_graph.nodes.find((n) => n.id === drawerNode.id);
    if (updated) {
      setDrawerNode(updated);
    }
  }, [taskDetail, drawerNode]);

  // Reset drawer when switching task
  useEffect(() => {
    setDrawerNode(null);
  }, [selectedTaskId]);

  const currentRun = useMemo(
    () => runs.find((r) => r.id === selectedRunId) || null,
    [runs, selectedRunId]
  );

  const activeTask = tasks.find((t) => t.task_id === selectedTaskId);
  const availableHarnesses = taskDetail?.available_harnesses || ['base', 'agg1'];
  const totalTasks = runs.reduce((s, r) => s + r.task_count, 0);
  const totalDone = runs.reduce((s, r) => s + r.completed_count, 0);

  const hasJudgedRows = Boolean(report && report.judged_rows && report.judged_rows.length > 0);

  return (
    <div className="space-y-5">
      {/* 1. Top Module Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <span>{tx('评测与演进洞察', 'Evaluation & Evolution Insights')}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              {tx('宏观得分 + 微观 DAG + 智能 Diff', 'Macro Scores · Task DAG · Smart Diff')}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {tx(
              '一站式审阅 Run 级基准量化净增益、逐题判分明细，以及单任务真实递归拓扑 (DAG)、盲审裁决依据、语义 Diff 与沙箱执行轨迹。',
              'Unified view for run-level benchmark net gain, per-task scores, real recursive DAG topology, blind selection rationale, semantic diff, and rollout trajectories.'
            )}
          </p>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          {tx(
            `${runs.length} 次运行 · ${totalDone}/${totalTasks} 任务达标`,
            `${runs.length} runs · ${totalDone}/${totalTasks} tasks done`
          )}
        </div>
      </div>

      {/* 2. Run Selector Strip */}
      <RunStrip runs={runs} selectedRunId={selectedRunId} onSelectRunId={onSelectRunId} />

      {!currentRun ? (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Folder className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {tx('暂无选中的运行记录', 'No Run Selected')}
          </p>
          <p className="text-xs mt-1">
            {tx('请在上方选择一个 Run 查看其量化指标与演进拓扑', 'Pick a run above to inspect its metrics and DAG')}
          </p>
        </div>
      ) : (
        <>
          {/* 3. Tier 1: Macro Benchmark Gain Hero */}
          <GainHero
            run={currentRun}
            report={report}
            loading={reportLoading}
            onOpenConsole={onOpenConsole}
            onRefreshReport={loadBenchmarkReport}
          />

          {/* 4. Interactive Per-Task Graded Score Table (When Judged Rows Exist) */}
          {hasJudgedRows && report && (
            <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div
                onClick={() => setShowScoreTable(!showScoreTable)}
                className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    {tx(
                      `逐题打分与采纳明细 (${report.judged_rows.length} 条记录 · 点击任意行联动下方 DAG 拓扑)`,
                      `Per-Task Graded Records (${report.judged_rows.length} rows · Click any row to inspect DAG below)`
                    )}
                  </h3>
                </div>
                <button
                  type="button"
                  className="text-xs text-slate-500 flex items-center gap-1 cursor-pointer"
                >
                  <span>{showScoreTable ? tx('收起表格', 'Collapse') : tx('展开表格', 'Expand')}</span>
                  {showScoreTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {showScoreTable && (
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/60 dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 sticky top-0 backdrop-blur">
                      <tr>
                        <th className="py-2.5 px-4 font-medium">{tx('任务编号 (Task ID)', 'Task ID')}</th>
                        <th className="py-2.5 px-4 font-medium">{tx('演进模式', 'Mode')}</th>
                        <th className="py-2.5 px-4 font-medium">{tx('胜出阶段', 'Chosen Stage')}</th>
                        <th className="py-2.5 px-4 font-medium">{tx('判题得分', 'Score')}</th>
                        <th className="py-2.5 px-4 font-medium">{tx('全部通过', 'All Pass')}</th>
                        <th className="py-2.5 px-4 font-medium">{tx('采纳策略', 'Adoption')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-200">
                      {report.judged_rows.map((row, idx) => {
                        const pct =
                          row.n_criteria > 0
                            ? Math.round((row.n_passed / row.n_criteria) * 100)
                            : null;
                        const active = row.task_id === selectedTaskId;
                        const rawLabel = row.label || '';
                        const labelFmt = formatStageLabel(rawLabel, tx);

                        return (
                          <tr
                            key={`${row.task_id}-${row.mode || idx}`}
                            onClick={() => onSelectTaskId(row.task_id, false)}
                            className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                              active ? 'bg-blue-50/70 dark:bg-blue-950/30 font-semibold' : ''
                            }`}
                          >
                            <td className="py-2.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                              {row.task_id}
                            </td>
                            <td className="py-2.5 px-4 uppercase font-semibold text-slate-500 dark:text-slate-400">
                              {row.mode}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="font-semibold text-slate-900 dark:text-slate-100 mr-1.5">
                                {labelFmt.shortName}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                {rawLabel}
                              </span>
                            </td>
                            <td className="py-2.5 px-4">
                              {pct !== null ? (
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                  {pct}% ({row.n_passed}/{row.n_criteria})
                                </span>
                              ) : (
                                <span className="text-slate-400">{tx('未判分', 'Ungraded')}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4">
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
                            <td className="py-2.5 px-4">
                              {row.chosen_is_base ? (
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                  {tx('保留基线', 'Kept Base')}
                                </span>
                              ) : (
                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                  {tx('采纳演进版', 'Adopted Adapted')}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 5. Tier 2: Task-Level Deep Dive Header & Selector Bar */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  {tx('单任务演进深潜 (Task Inspector)：', 'Task Deep-Dive Inspector:')}
                </span>
              </div>

              <select
                value={selectedTaskId}
                onChange={(e) => onSelectTaskId(e.target.value, false)}
                disabled={tasks.length === 0}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {tasks.map((t) => (
                  <option key={t.task_id} value={t.task_id}>
                    {t.task_id} ({t.domain || 'default'}) - {t.status}
                  </option>
                ))}
              </select>

              {tasks.length > 1 && (
                <div className="hidden xl:flex items-center gap-1">
                  {tasks.slice(0, 6).map((t) => (
                    <button
                      key={t.task_id}
                      type="button"
                      onClick={() => onSelectTaskId(t.task_id, false)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors cursor-pointer ${
                        t.task_id === selectedTaskId
                          ? 'bg-blue-600 text-white font-bold shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {t.task_id}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {activeTask && (
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  k = {activeTask.k}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium">
                  {tx('领域:', 'Domain:')} {activeTask.domain}
                </span>
                {activeTask.total_usd > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-mono">
                    ${activeTask.total_usd.toFixed(3)}
                  </span>
                )}
                {activeTask.status === 'in_progress' ? (
                  <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-semibold flex items-center gap-1.5 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> {tx('执行中', 'In Progress')}
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {activeTask.status}
                  </span>
                )}

                {onNavigateToStudio && (
                  <button
                    type="button"
                    onClick={() => onNavigateToStudio(selectedRunId, selectedTaskId, null)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title={tx('在组件与经验工坊中检视或热重载该任务的 c1~c9 沙箱文件', 'Inspect or hot-reload c1..c9 sandbox files in Studio')}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{tx('在工坊打开此沙箱 ➔', 'Open Sandbox in Studio ➔')}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={reloadDetail}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
                  title={tx('手动刷新拓扑与 Diff 状态', 'Refresh Topology & Diff')}
                >
                  <RotateCw className={`w-3.5 h-3.5 ${detailLoading ? 'animate-spin text-blue-500' : ''}`} />
                </button>
              </div>
            )}
          </div>

          {/* 6. Task Deep Dive Body: Real DAG + Blind Verdict + Smart Intent Diff */}
          {tasksLoading ? (
            <div className="p-12 text-center text-xs text-slate-500">
              {tx('正在加载任务列表...', 'Loading tasks...')}
            </div>
          ) : tasks.length === 0 ? (
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-xs text-slate-500">
              {tx('该 Run 暂未包含任何任务记录。', 'No tasks found in this run.')}
            </div>
          ) : detailLoading || !taskDetail ? (
            <div className="p-12 text-center text-xs text-slate-500">
              {tx('正在加载任务详情与递归 DAG 拓扑...', 'Loading task detail & recursive DAG topology...')}
            </div>
          ) : (
            <div className="space-y-5">
              {/* 6A. Real Task-Level Recursive Execution DAG (Click any node for Trajectory & Deliverable) */}
              <PipelineGraph
                nodes={taskDetail.pipeline_graph.nodes}
                edges={taskDetail.pipeline_graph.edges}
                selectedNode={selectedNode}
                onSelectNode={(node) => {
                  setSelectedNode(node);
                  setDrawerNode(node);
                }}
              />

              {/* 6B. Zero-GT Blind Selection Verdict & Distilled Continual Learning Experience */}
              {taskDetail.selections && Object.keys(taskDetail.selections).length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {Object.entries(taskDetail.selections).map(([mName, sel]) => {
                    const exp = sel.experience;

                    return (
                      <div
                        key={mName}
                        className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-amber-500" />
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                              {tx(
                                `零标注盲审裁决与套件采纳 (${mName.toUpperCase()})`,
                                `Zero-GT Blind Selection Verdict (${mName.toUpperCase()})`
                              )}
                            </h4>
                          </div>
                          <span className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/20 font-bold flex items-center gap-1">
                            🏆 {tx('胜出采纳: ', 'Chosen: ')}
                            <span className="font-semibold">
                              {formatStageLabel(sel.chosen_label || '', tx).shortName}
                            </span>
                            <span className="text-[10px] font-mono opacity-80">
                              ({sel.chosen_label})
                            </span>
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-900">
                          <span className="font-semibold text-slate-500 dark:text-slate-400">
                            {tx('盲审裁决依据 (Why)：', 'Rationale (Why): ')}
                          </span>
                          {sel.why || tx('无', 'None')}
                        </p>

                        {exp && (
                          <div className="bg-indigo-50/70 dark:bg-gradient-to-br dark:from-indigo-950/30 dark:to-purple-950/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-500/20 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                                <span>
                                  {tx('持续学习沉淀经验 (S5 反思产出)', 'Distilled Continual Learning Experience')}
                                </span>
                              </div>
                              {onNavigateToLibrary && (
                                <button
                                  type="button"
                                  onClick={() => onNavigateToLibrary(selectedRunId, selectedTaskId)}
                                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <BookOpen className="w-3 h-3" />
                                  <span>{tx('在经验池中转化组件 ➔', 'Crystallize in Studio ➔')}</span>
                                </button>
                              )}
                            </div>

                            {exp.cue && (
                              <div className="text-xs">
                                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                  {tx('触发情景 (Cue)：', 'Trigger Cue: ')}
                                </span>
                                <span className="text-slate-800 dark:text-slate-200">{exp.cue}</span>
                              </div>
                            )}

                            {exp.lesson && (
                              <div className="text-xs">
                                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                  {tx('优化原则 (Lesson)：', 'Learned Lesson: ')}
                                </span>
                                <span className="text-slate-800 dark:text-slate-200">
                                  {exp.lesson}
                                </span>
                              </div>
                            )}

                            {exp.evidence && (
                              <div className="text-xs">
                                <span className="text-slate-500 dark:text-slate-400 font-medium">
                                  {tx('实证依据 (Evidence)：', 'Empirical Evidence: ')}
                                </span>
                                <span className="text-slate-600 dark:text-slate-400">
                                  {exp.evidence}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 6C. Smart Semantic Diff Inspector (Replaces Legacy Plain DiffViewer) */}
              <SmartIntentDiffViewer
                diff={diffResult}
                baseLabel={diffBase}
                compareLabel={diffCompare}
                availableLabels={availableHarnesses}
                onChangeComparison={handleComparisonChange}
                loading={diffLoading}
              />

              {/* 6D. Side Drawer for Node Rollout Trajectory & Deliverable Inspection */}
              <StageDetailDrawer
                node={drawerNode}
                onClose={() => setDrawerNode(null)}
                rolloutArtifacts={
                  drawerNode ? taskDetail.rollouts[drawerNode.id] || {} : {}
                }
                stageInfo={drawerNode ? taskDetail.stages[drawerNode.id] : {}}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
