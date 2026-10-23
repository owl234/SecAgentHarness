import React from 'react';
import { RunItem, DAGNode } from '../types';
import { PipelineGraph } from './PipelineGraph';
import { DiffViewer } from './DiffViewer';
import { StageDetailDrawer } from './StageDetailDrawer';
import { CheckCircle2, Lightbulb, Award, Loader2, RotateCw } from 'lucide-react';
import { useLang } from '../i18n/LangContext';
import { useTaskInspector } from '../hooks/useTaskInspector';
import { formatStageLabel } from '../utils/labelFormatter';

interface PipelineViewProps {
  runs: RunItem[];
  selectedRunId: string;
  onSelectRunId: (id: string) => void;
  selectedTaskId: string;
  onSelectTaskId: (taskId: string, replace?: boolean) => void;
}

export const PipelineView: React.FC<PipelineViewProps> = ({
  runs,
  selectedRunId,
  onSelectRunId,
  selectedTaskId,
  onSelectTaskId,
}) => {
  const { tx } = useLang();
  const [drawerNode, setDrawerNode] = React.useState<DAGNode | null>(null);
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

  // Sync open drawer data on live polling updates without opening closed drawer
  React.useEffect(() => {
    if (!drawerNode || !taskDetail?.pipeline_graph?.nodes) return;
    const updated = taskDetail.pipeline_graph.nodes.find((n) => n.id === drawerNode.id);
    if (updated) {
      setDrawerNode(updated);
    }
  }, [taskDetail]);

  // Reset drawer when switching task
  React.useEffect(() => {
    setDrawerNode(null);
  }, [selectedTaskId]);

  const activeTask = tasks.find((t) => t.task_id === selectedTaskId);
  const availableHarnesses = taskDetail?.available_harnesses || ['base', 'agg1'];

  return (
    <div className="space-y-6">
      {/* Selector & Breadcrumb Header */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {tx('选择 Run:', 'Run:')}
            </span>
            <select
              value={selectedRunId}
              onChange={(e) => onSelectRunId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.completed_count}/{r.task_count})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {tx('选择 Task:', 'Task:')}
            </span>
            <select
              value={selectedTaskId}
              onChange={(e) => onSelectTaskId(e.target.value, false)}
              disabled={tasks.length === 0}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold focus:outline-none focus:border-blue-500"
            >
              {tasks.map((t) => (
                <option key={t.task_id} value={t.task_id}>
                  {t.task_id} ({t.domain || 'default'}) - {t.status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {activeTask && (
          <div className="flex items-center gap-3 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
              k = {activeTask.k}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium">
              {tx('领域:', 'Domain:')} {activeTask.domain}
            </span>
            {activeTask.status === 'in_progress' ? (
              <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-semibold flex items-center gap-1.5 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {tx('执行中', 'In Progress')}
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {activeTask.status}
              </span>
            )}
            <button
              type="button"
              onClick={reloadDetail}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
              title={tx('手动刷新拓扑状态', 'Refresh Topology')}
            >
              <RotateCw className={`w-3.5 h-3.5 ${detailLoading ? 'animate-spin text-blue-500' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {tasksLoading ? (
        <div className="p-12 text-center text-xs text-slate-500">
          {tx('正在加载任务列表...', 'Loading tasks...')}
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-xs text-slate-500">
          {tx('该 Run 暂未包含任何任务。', 'No tasks found in this run.')}
        </div>
      ) : detailLoading || !taskDetail ? (
        <div className="p-12 text-center text-xs text-slate-500">
          {tx('正在加载任务详情与递归拓扑...', 'Loading task detail & recursive DAG topology...')}
        </div>
      ) : (
        <>
          {/* Main Pipeline Graph */}
          <PipelineGraph
            nodes={taskDetail.pipeline_graph.nodes}
            edges={taskDetail.pipeline_graph.edges}
            selectedNode={selectedNode}
            onSelectNode={(node) => {
              setSelectedNode(node);
              setDrawerNode(node);
            }}
          />

          {/* Selection & Continual Learning Reflection */}
          {taskDetail.selections && Object.keys(taskDetail.selections).length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Object.entries(taskDetail.selections).map(([mName, sel]) => {
                const exp = sel.experience;

                return (
                  <div
                    key={mName}
                    className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-500" />
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                          {tx(
                            `盲审裁决与套件采纳 (${mName.toUpperCase()})`,
                            `Blind Selection Verdict (${mName.toUpperCase()})`
                          )}
                        </h4>
                      </div>
                      <span className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/20 font-bold flex items-center gap-1">
                        🏆 {tx('胜出采纳: ', 'Chosen: ')}
                        <span className="font-semibold">{formatStageLabel(sel.chosen_label || '', tx).shortName}</span>
                        <span className="text-[10px] font-mono opacity-80">({sel.chosen_label})</span>
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans bg-slate-50 dark:bg-slate-950/60 p-3 rounded-lg border border-slate-200 dark:border-slate-900">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">
                        {tx('裁决依据 (Why): ', 'Rationale (Why): ')}
                      </span>
                      {sel.why || tx('无', 'None')}
                    </p>

                    {exp && (
                      <div className="bg-indigo-50/70 dark:bg-gradient-to-br dark:from-indigo-950/30 dark:to-purple-950/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-500/20 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                          <span>
                            {tx(
                              '沉淀经验 (Continual Learning Memory)',
                              'Distilled Continual Learning Experience'
                            )}
                          </span>
                        </div>

                        {exp.cue && (
                          <div className="text-xs">
                            <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                              {tx('触发情景 (Cue): ', 'Trigger Cue: ')}
                            </span>
                            <span className="text-slate-800 dark:text-slate-200">{exp.cue}</span>
                          </div>
                        )}

                        {exp.lesson && (
                          <div className="text-xs">
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                              {tx('优化原则 (Lesson): ', 'Learned Lesson: ')}
                            </span>
                            <span className="text-slate-800 dark:text-slate-200">
                              {exp.lesson}
                            </span>
                          </div>
                        )}

                        {exp.evidence && (
                          <div className="text-xs">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">
                              {tx('实证依据 (Evidence): ', 'Empirical Evidence: ')}
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

          {/* Harness Diff Viewer */}
          <DiffViewer
            diff={diffResult}
            baseLabel={diffBase}
            compareLabel={diffCompare}
            availableLabels={availableHarnesses}
            onChangeComparison={handleComparisonChange}
            loading={diffLoading}
          />

          {/* Side Drawer for Node Details */}
          <StageDetailDrawer
            node={drawerNode}
            onClose={() => setDrawerNode(null)}
            rolloutArtifacts={
              drawerNode ? taskDetail.rollouts[drawerNode.id] || {} : {}
            }
            stageInfo={drawerNode ? taskDetail.stages[drawerNode.id] : {}}
          />
        </>
      )}
    </div>
  );
};
