import React from 'react';
import {
  Target,
  ExternalLink,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  GitCompare,
} from 'lucide-react';
import { ComponentCategory, HarnessSnapshot, RunItem, TaskItem } from '../../types';
import { formatStageLabel } from '../../utils/labelFormatter';
import { useLang } from '../../i18n/LangContext';

interface StudioContextBarProps {
  runs: RunItem[];
  targetRunId: string;
  onSelectRun: (runId: string) => void;
  tasks: TaskItem[];
  targetTaskId: string;
  onSelectTask: (taskId: string) => void;
  availableLabels?: string[];
  targetLabel: string;
  onSelectLabel: (label: string) => void;
  loadingTasks?: boolean;
  loadingSandbox?: boolean;
  sandboxSnapshot?: HarnessSnapshot | null;
  appliedCount: number;
  onRefreshSandbox?: () => void;
  onSelectCategory?: (cat: ComponentCategory) => void;
  onNavigateToRun?: (runId: string, taskId?: string) => void;
}

const DEFAULT_STAGE_LABELS = ['agg1', 'seq1', 'base', 'inv1', 'dom1'];

export const StudioContextBar: React.FC<StudioContextBarProps> = ({
  runs,
  targetRunId,
  onSelectRun,
  tasks,
  targetTaskId,
  onSelectTask,
  availableLabels,
  targetLabel,
  onSelectLabel,
  loadingTasks = false,
  loadingSandbox = false,
  sandboxSnapshot,
  appliedCount,
  onRefreshSandbox,
  onSelectCategory,
  onNavigateToRun,
}) => {
  const { tx } = useLang();

  const isConfigured = Boolean(targetRunId && targetTaskId);
  const stageOptions =
    availableLabels && availableLabels.length > 0 ? availableLabels : DEFAULT_STAGE_LABELS;

  const byCat = sandboxSnapshot?.by_category || {};
  const activeCats = (Object.keys(byCat) as ComponentCategory[]).filter(
    (c) => byCat[c]?.exists
  );
  const diffCats = (Object.keys(byCat) as ComponentCategory[]).filter(
    (c) => byCat[c]?.diff_from_base
  );

  return (
    <div className="rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/90 px-3.5 py-2.5 shadow-sm backdrop-blur-md flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
      {/* Left: Live Sandbox Context Identity & Real-time Telemetry Pills */}
      <div className="flex flex-wrap items-center gap-2.5 min-w-0">
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
            isConfigured
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
          }`}
        >
          <Target className="w-4 h-4" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-extrabold text-slate-900 dark:text-white tracking-tight">
              {tx('双向实机沙箱挂载上下文', 'Bi-Directional Sandbox Context')}
            </span>

            {isConfigured && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/25 font-mono font-semibold">
                <CheckCircle2 className="w-3 h-3 text-sky-500" />
                <span>
                  {tx(
                    `实机激活 ${activeCats.length}/9 维`,
                    `${activeCats.length}/9 Active`
                  )}
                </span>
              </span>
            )}

            {diffCats.length > 0 && (
              <div className="inline-flex items-center gap-1 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-semibold">
                  <GitCompare className="w-3 h-3 text-amber-500" />
                  <span>
                    {tx(
                      `相对 Base 演进 (${diffCats.length}):`,
                      `Evolved vs Base (${diffCats.length}):`
                    )}
                  </span>
                </span>
                {diffCats.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onSelectCategory?.(cat)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500 text-white hover:bg-amber-400 transition-colors cursor-pointer shadow-xs"
                    title={tx(
                      `点击检视 ${cat} 在当前阶段相对于 base 的演进变更`,
                      `Click to inspect ${cat} evolution vs base`
                    )}
                  >
                    Δ {cat}
                  </button>
                ))}
              </div>
            )}

            {appliedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-semibold">
                <Sparkles className="w-3 h-3 text-emerald-500" />
                <span>{tx(`本轮已热注入 ${appliedCount} 项`, `${appliedCount} hot-injected`)}</span>
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {tx(
              '自动同步目标沙箱 c1~c9 真实物化文件：支持对比 Base 演进差异、一键反向提取入库、或将库内组件热重载写入沙箱',
              'Live-syncs c1..c9 files from target sandbox: inspect diffs vs base, extract evolved components to library, or hot-inject'
            )}
          </div>
        </div>
      </div>

      {/* Right: Selectors & Quick Actions */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {/* Run Selector */}
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Run</span>
          <select
            aria-label={tx('目标评测 Run', 'Target Run')}
            value={targetRunId}
            onChange={(e) => onSelectRun(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[170px] truncate"
          >
            {runs.length === 0 ? (
              <option value="">{tx('无可用 Run', 'No runs available')}</option>
            ) : (
              runs.map((r) => (
                <option key={r.id} value={r.id} className="bg-white dark:bg-slate-900">
                  {r.name || r.id} ({r.id.slice(0, 8)})
                </option>
              ))
            )}
          </select>
        </div>

        {/* Task Selector */}
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Task</span>
          <select
            aria-label={tx('目标任务 Task', 'Target Task')}
            value={targetTaskId}
            onChange={(e) => onSelectTask(e.target.value)}
            disabled={loadingTasks || tasks.length === 0}
            className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer disabled:opacity-50 max-w-[180px] truncate"
          >
            {loadingTasks ? (
              <option value="">{tx('加载任务列表中...', 'Loading tasks...')}</option>
            ) : tasks.length === 0 ? (
              <option value="">{tx('此 Run 无独立任务', 'No tasks under this run')}</option>
            ) : (
              tasks.map((t) => (
                <option key={t.task_id} value={t.task_id} className="bg-white dark:bg-slate-900">
                  {t.task_id} {t.domain ? `[${t.domain}]` : ''}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Stage Label Selector */}
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Stage</span>
          <select
            aria-label={tx('挂载阶段 Label', 'Stage Label')}
            value={targetLabel}
            onChange={(e) => onSelectLabel(e.target.value)}
            className="bg-transparent text-xs font-mono font-bold text-blue-600 dark:text-cyan-400 focus:outline-none cursor-pointer"
          >
            {stageOptions.map((lbl) => {
              const fmt = formatStageLabel(lbl, tx);
              return (
                <option key={lbl} value={lbl} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {lbl} ({fmt.shortName})
                </option>
              );
            })}
          </select>
        </div>

        {/* Refresh Sandbox State Button */}
        {isConfigured && onRefreshSandbox && (
          <button
            type="button"
            onClick={onRefreshSandbox}
            disabled={loadingSandbox}
            title={tx('重新读取目标沙箱实机文件', 'Reload live sandbox files')}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingSandbox ? 'animate-spin text-blue-500' : ''}`} />
          </button>
        )}

        {/* Jump to Pipeline / Run */}
        {isConfigured && onNavigateToRun && (
          <button
            type="button"
            onClick={() => onNavigateToRun(targetRunId, targetTaskId)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-600 dark:text-cyan-400 hover:text-white border border-blue-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{tx('进入当前任务运行', 'Jump to Run')}</span>
          </button>
        )}
      </div>
    </div>
  );
};
