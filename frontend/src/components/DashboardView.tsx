import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Folder } from 'lucide-react';
import { RunItem, BenchmarkReport } from '../types';
import { fetchBenchmark } from '../api';
import { useTaskInspector } from '../hooks/useTaskInspector';
import { useLang } from '../i18n/LangContext';
import { MetroPipelineCanvas, StationBadge } from './native_flow/MetroPipelineCanvas';
import { FlowNode } from './native_flow/flowTypes';
import { RunStrip } from './dashboard/RunStrip';
import { GainHero } from './dashboard/GainHero';
import { DashboardDrawer } from './dashboard/DashboardDrawer';

interface DashboardViewProps {
  runs: RunItem[];
  selectedRunId: string;
  onSelectRunId: (id: string) => void;
  selectedTaskId: string;
  onSelectTaskId: (taskId: string, replace?: boolean) => void;
  onNavigateToPipeline?: (runId: string, taskId?: string) => void;
  onOpenConsole?: () => void;
}

/**
 * Process-oriented analytics dashboard: run strip → metro pipeline with metric badges →
 * gain hero → drill-down drawer (Smart Diff / per-task scores).
 */
export const DashboardView: React.FC<DashboardViewProps> = ({
  runs,
  selectedRunId,
  onSelectRunId,
  selectedTaskId,
  onSelectTaskId,
  onNavigateToPipeline,
  onOpenConsole,
}) => {
  const { tx, lang } = useLang();

  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [drawerNode, setDrawerNode] = useState<FlowNode | null>(null);
  const reqIdRef = useRef(0);

  const { tasks, taskDetail, diffBase, diffCompare, diffResult, diffLoading, handleComparisonChange } =
    useTaskInspector({ selectedRunId, selectedTaskId, onSelectTaskId });

  useEffect(() => {
    setDrawerNode(null);
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

  const currentRun = useMemo(
    () => runs.find((r) => r.id === selectedRunId) || null,
    [runs, selectedRunId]
  );

  // Map available data onto stations; stations without data keep status-only rendering.
  const stationBadges = useMemo<Record<string, StationBadge>>(() => {
    const badges: Record<string, StationBadge> = {};
    if (!currentRun) return badges;

    if (currentRun.task_count > 0) {
      const failed = currentRun.failed_count;
      badges['s2-validation-gate'] = {
        label: tx('任务达标', 'Tasks OK'),
        value: `${currentRun.completed_count}/${currentRun.task_count}`,
        sub: failed > 0 ? tx(`失败 ${failed}`, `fail ${failed}`) : undefined,
        tone: failed > 0 ? 'bad' : 'good',
      };
    }

    if (report?.has_base_judged) {
      badges['s1-base-roll'] = {
        label: tx('基线均分', 'Baseline'),
        value: `${report.base_stats.avg_score}%`,
        sub: `${report.base_stats.graded}${tx('题', ' q')}`,
        tone: 'neutral',
      };
    }

    if (report?.has_judged) {
      const gain = report.adapted_stats.avg_score - report.base_stats.avg_score;
      badges['s4-blind-judge'] = {
        label: tx('优化后均分', 'Adapted'),
        value: `${report.adapted_stats.avg_score}%`,
        sub: report.has_base_judged ? `${gain >= 0 ? '+' : ''}${gain.toFixed(1)}` : undefined,
        tone: report.has_base_judged && gain < 0 ? 'bad' : 'good',
      };
      const total = report.judged_rows.length;
      const kept = report.judged_rows.filter((r) => r.chosen_is_base).length;
      if (total > 0) {
        badges['s3-compose-choice'] = {
          label: tx('采纳优化', 'Adapted'),
          value: `${total - kept}/${total}`,
          sub: kept > 0 ? tx(`保留基准 ${kept}`, `kept ${kept}`) : undefined,
          tone: 'accent',
        };
      }
    }
    return badges;
  }, [currentRun, report, tx]);

  const totalTasks = runs.reduce((s, r) => s + r.task_count, 0);
  const totalDone = runs.reduce((s, r) => s + r.completed_count, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            {tx('数据与评测大盘', 'Runs & Analytics Dashboard')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {tx(
              '沿演进流程查看每个阶段的成果与指标,点击站点下钻到 Diff 与逐题打分。',
              'Follow the evolution pipeline: stage-level metrics at a glance, click a station to drill into diffs and scores.'
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

      <RunStrip runs={runs} selectedRunId={selectedRunId} onSelectRunId={onSelectRunId} />

      {!currentRun ? (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Folder className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {tx('暂无选中的运行记录', 'No Run Selected')}
          </p>
          <p className="text-xs mt-1">
            {tx('请在上方选择一个 Run 查看其流程与指标', 'Pick a run above to inspect its pipeline and metrics')}
          </p>
        </div>
      ) : (
        <>
          <MetroPipelineCanvas
            selectedNodeId={drawerNode?.id}
            onSelectNode={setDrawerNode}
            lang={lang}
            stationBadges={stationBadges}
          />
          <GainHero report={report} loading={reportLoading} onOpenConsole={onOpenConsole} />
        </>
      )}

      <DashboardDrawer
        node={drawerNode}
        run={currentRun}
        report={report}
        onClose={() => setDrawerNode(null)}
        tasks={tasks}
        selectedTaskId={selectedTaskId}
        onSelectTaskId={onSelectTaskId}
        availableLabels={taskDetail?.available_harnesses || ['base', 'agg1']}
        diffBase={diffBase}
        diffCompare={diffCompare}
        diffResult={diffResult}
        diffLoading={diffLoading}
        onChangeComparison={handleComparisonChange}
        onNavigateToPipeline={onNavigateToPipeline}
      />
    </div>
  );
};
