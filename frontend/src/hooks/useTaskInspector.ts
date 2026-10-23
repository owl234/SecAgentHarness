import { useCallback, useEffect, useRef, useState } from 'react';
import { DAGNode, DiffResult, TaskDetail, TaskItem } from '../types';
import { fetchDiff, fetchTaskDetail, fetchTasks } from '../api';

interface UseTaskInspectorOptions {
  selectedRunId: string;
  selectedTaskId: string;
  onSelectTaskId: (taskId: string, replace?: boolean) => void;
}

export function useTaskInspector({
  selectedRunId,
  selectedTaskId,
  onSelectTaskId,
}: UseTaskInspectorOptions) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskDetail, setTaskDetail] = useState<TaskDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<DAGNode | null>(null);

  const [diffBase, setDiffBase] = useState('base');
  const [diffCompare, setDiffCompare] = useState('agg1');
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  // Monotonic request counters to prevent out-of-order race conditions
  const tasksReqId = useRef(0);
  const detailReqId = useRef(0);
  const diffReqId = useRef(0);

  // 1. Load tasks when selectedRunId changes
  const loadTasks = useCallback(
    async (runId: string) => {
      if (!runId) {
        setTasks([]);
        setTaskDetail(null);
        setDiffResult(null);
        return;
      }
      const reqId = ++tasksReqId.current;
      setTasksLoading(true);
      try {
        const list = await fetchTasks(runId);
        if (reqId !== tasksReqId.current) return;
        setTasks(list);
        if (list.length > 0) {
          const exists = list.some((t) => t.task_id === selectedTaskId);
          if (!selectedTaskId || !exists) {
            onSelectTaskId(list[0].task_id, true);
          }
        } else {
          onSelectTaskId('', true);
          setTaskDetail(null);
          setDiffResult(null);
          setSelectedNode(null);
        }
      } catch (err) {
        if (reqId === tasksReqId.current) {
          console.error('Failed to fetch tasks:', err);
        }
      } finally {
        if (reqId === tasksReqId.current) {
          setTasksLoading(false);
        }
      }
    },
    [selectedTaskId, onSelectTaskId]
  );

  useEffect(() => {
    loadTasks(selectedRunId);
  }, [selectedRunId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Load task detail when selectedRunId or selectedTaskId changes
  const reloadTaskDetail = useCallback(
    async (showLoading = true) => {
      if (!selectedRunId || !selectedTaskId) {
        setTaskDetail(null);
        setSelectedNode(null);
        return;
      }
      const reqId = ++detailReqId.current;
      if (showLoading) setDetailLoading(true);
      try {
        const detail = await fetchTaskDetail(selectedRunId, selectedTaskId);
        if (reqId !== detailReqId.current) return;
        setTaskDetail(detail);

        const nodes = detail.pipeline_graph?.nodes || [];
        setSelectedNode((prev) => {
          if (!prev) {
            // On initial task load, highlight chosen or active node in graph
            if (showLoading) {
              const chosen = nodes.find((n) => n.is_chosen);
              const active = nodes.find((n) => n.status === 'running');
              const lastDone = [...nodes].reverse().find((n) => n.status === 'completed');
              return chosen || active || lastDone || nodes[0] || null;
            }
            return null;
          }
          return nodes.find((n) => n.id === prev.id) || prev;
        });

        const available = detail.available_harnesses || [];
        const base = available.includes('base') ? 'base' : available[0] || 'base';
        const comp =
          available.find((h) => h !== base && (h.startsWith('agg') || h.startsWith('c'))) ||
          available[available.length - 1] ||
          'agg1';
        setDiffBase((prev) => prev || base);
        setDiffCompare((prev) => prev || comp);
      } catch (err) {
        if (reqId === detailReqId.current) {
          console.error('Failed to load task detail:', err);
        }
      } finally {
        if (reqId === detailReqId.current && showLoading) {
          setDetailLoading(false);
        }
      }
    },
    [selectedRunId, selectedTaskId]
  );

  useEffect(() => {
    reloadTaskDetail(true);
  }, [reloadTaskDetail]);

  // Dynamic status synchronization: auto-poll every 3.5s while task is in-flight or any node is running
  useEffect(() => {
    if (!selectedRunId || !selectedTaskId) return;
    const isRunning =
      taskDetail?.status === 'in_progress' ||
      taskDetail?.pipeline_graph?.nodes?.some((n) => n.status === 'running');

    if (!isRunning) return;

    const timer = setInterval(() => {
      reloadTaskDetail(false);
    }, 3500);

    return () => clearInterval(timer);
  }, [selectedRunId, selectedTaskId, taskDetail?.status, taskDetail?.pipeline_graph?.nodes, reloadTaskDetail]);

  // 3. Load diff when diffBase or diffCompare changes
  useEffect(() => {
    if (!selectedRunId || !selectedTaskId || !diffBase || !diffCompare) {
      setDiffResult(null);
      return;
    }
    const reqId = ++diffReqId.current;
    setDiffLoading(true);
    fetchDiff(selectedRunId, selectedTaskId, diffBase, diffCompare)
      .then((res) => {
        if (reqId !== diffReqId.current) return;
        setDiffResult(res);
      })
      .catch((err) => {
        if (reqId === diffReqId.current) {
          console.error('Failed to load diff:', err);
        }
      })
      .finally(() => {
        if (reqId === diffReqId.current) {
          setDiffLoading(false);
        }
      });
  }, [selectedRunId, selectedTaskId, diffBase, diffCompare]);

  const handleComparisonChange = useCallback((base: string, compare: string) => {
    setDiffBase(base);
    setDiffCompare(compare);
  }, []);

  return {
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
    reloadDetail: () => reloadTaskDetail(true),
    refreshTasks: () => loadTasks(selectedRunId),
  };
}
