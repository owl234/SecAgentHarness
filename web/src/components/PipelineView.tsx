import React, { useEffect, useState } from 'react';
import {
  RunItem,
  TaskItem,
  TaskDetail,
  DAGNode,
  DiffResult,
} from '../types';
import {
  fetchTasks,
  fetchTaskDetail,
  fetchDiff,
} from '../api';
import { PipelineGraph } from './PipelineGraph';
import { DiffViewer } from './DiffViewer';
import { StageDetailDrawer } from './StageDetailDrawer';
import {
  CheckCircle2,
  Lightbulb,
  Award,
} from 'lucide-react';

interface PipelineViewProps {
  runs: RunItem[];
  selectedRunId: string;
  onSelectRunId: (id: string) => void;
}

export const PipelineView: React.FC<PipelineViewProps> = ({
  runs,
  selectedRunId,
  onSelectRunId,
}) => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [taskDetail, setTaskDetail] = useState<TaskDetail | null>(null);
  const [selectedNode, setSelectedNode] = useState<DAGNode | null>(null);

  // Diff states
  const [diffBase, setDiffBase] = useState('base');
  const [diffCompare, setDiffCompare] = useState('agg1');
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  // 1. Fetch tasks when selectedRunId changes
  useEffect(() => {
    if (!selectedRunId) return;
    fetchTasks(selectedRunId)
      .then((data) => {
        setTasks(data);
        if (data.length > 0) {
          setSelectedTaskId(data[0].task_id);
        } else {
          setSelectedTaskId('');
          setTaskDetail(null);
        }
      })
      .catch((err) => console.error('获取任务列表失败 (Failed to load tasks):', err));
  }, [selectedRunId]);

  // 2. Fetch task detail when selectedTaskId changes
  useEffect(() => {
    if (!selectedRunId || !selectedTaskId) return;
    fetchTaskDetail(selectedRunId, selectedTaskId)
      .then((detail) => {
        setTaskDetail(detail);

        // Auto select chosen final or first composed node
        const chosen = detail.pipeline_graph.nodes.find((n) => n.is_chosen);
        const fallbackNode = detail.pipeline_graph.nodes[detail.pipeline_graph.nodes.length - 1];
        const defaultNode = chosen || fallbackNode;
        if (defaultNode) {
          setSelectedNode(defaultNode);
        }

        // Set diff defaults based on available harnesses
        const available = detail.available_harnesses || [];
        const base = available.includes('base') ? 'base' : available[0] || 'base';
        const comp =
          available.find((h) => h !== base && (h.startsWith('agg') || h.startsWith('c'))) ||
          available[available.length - 1] ||
          'agg1';

        setDiffBase(base);
        setDiffCompare(comp);
      })
      .catch((err) => console.error('获取任务详情失败 (Failed to load task detail):', err));
  }, [selectedRunId, selectedTaskId]);

  // 3. Fetch diff when diffBase or diffCompare changes
  useEffect(() => {
    if (!selectedRunId || !selectedTaskId || !diffBase || !diffCompare) return;
    setDiffLoading(true);
    fetchDiff(selectedRunId, selectedTaskId, diffBase, diffCompare)
      .then((res) => setDiffResult(res))
      .catch((err) => console.error('获取 Diff 失败 (Failed to load diff):', err))
      .finally(() => setDiffLoading(false));
  }, [selectedRunId, selectedTaskId, diffBase, diffCompare]);

  const activeTask = tasks.find((t) => t.task_id === selectedTaskId);
  const availableHarnesses = taskDetail?.available_harnesses || ['base', 'agg1'];

  return (
    <div className="space-y-6">
      {/* Selector & Breadcrumb Header */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">选择 Run:</span>
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
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">选择 Task:</span>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
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
              领域: {activeTask.domain}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {activeTask.status}
            </span>
          </div>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center text-slate-500">
          该 Run 暂未包含任何任务。
        </div>
      ) : !taskDetail ? (
        <div className="p-12 text-center text-slate-500">正在加载任务详情与递归拓扑...</div>
      ) : (
        <>
          {/* Main Pipeline Graph */}
          <PipelineGraph
            nodes={taskDetail.pipeline_graph.nodes}
            edges={taskDetail.pipeline_graph.edges}
            selectedNodeId={selectedNode?.id || null}
            onSelectNode={(node) => setSelectedNode(node)}
          />

          {/* Selection & Continual Learning Reflection */}
          {taskDetail.selections && Object.keys(taskDetail.selections).length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Object.entries(taskDetail.selections).map(([mName, sel]: [string, any]) => {
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
                          盲审裁决与套件采纳 ({mName.toUpperCase()})
                        </h4>
                      </div>
                      <span className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/20 font-bold">
                        Chosen: {sel.chosen_label}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans bg-slate-50 dark:bg-slate-950/60 p-3 rounded-lg border border-slate-200 dark:border-slate-900">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">裁决依据 (Why): </span>
                      {sel.why || '无'}
                    </p>

                    {exp && (
                      <div className="bg-indigo-50/70 dark:bg-gradient-to-br dark:from-indigo-950/30 dark:to-purple-950/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-500/20 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                          <span>沉淀经验 (Continual Learning Memory)</span>
                        </div>

                        {exp.cue && (
                          <div className="text-xs">
                            <span className="text-indigo-600 dark:text-indigo-400 font-medium">触发情景 (Cue): </span>
                            <span className="text-slate-800 dark:text-slate-200">{exp.cue}</span>
                          </div>
                        )}

                        {exp.lesson && (
                          <div className="text-xs">
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">优化原则 (Lesson): </span>
                            <span className="text-slate-800 dark:text-slate-200">{exp.lesson}</span>
                          </div>
                        )}

                        {exp.evidence && (
                          <div className="text-xs">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">实证依据 (Evidence): </span>
                            <span className="text-slate-600 dark:text-slate-400">{exp.evidence}</span>
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
            onChangeComparison={(b, c) => {
              setDiffBase(b);
              setDiffCompare(c);
            }}
            loading={diffLoading}
          />

          {/* Side Drawer for Node Details */}
          <StageDetailDrawer
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            rolloutArtifacts={
              selectedNode ? taskDetail.rollouts[selectedNode.id] || {} : {}
            }
            stageInfo={selectedNode ? taskDetail.stages[selectedNode.id] : {}}
          />
        </>
      )}
    </div>
  );
};
