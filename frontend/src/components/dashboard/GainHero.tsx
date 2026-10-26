import React, { useState } from 'react';
import { TrendingUp, HelpCircle, Terminal, RefreshCw, Scale, CheckCircle2 } from 'lucide-react';
import { BenchmarkReport, RunItem } from '../../types';
import { launchJudge } from '../../api';
import { useLang } from '../../i18n/LangContext';
import { useToast } from '../ui/ToastContext';

interface GainHeroProps {
  run?: RunItem | null;
  report: BenchmarkReport | null;
  loading: boolean;
  onOpenConsole?: () => void;
  onRefreshReport?: () => void;
}

const card =
  'bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm';

const signed = (n: number, digits = 1) => `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`;

/** Hero strip: baseline → adapted score, net gain, all-pass delta + one-click Judge trigger. */
export const GainHero: React.FC<GainHeroProps> = ({
  run,
  report,
  loading,
  onOpenConsole,
  onRefreshReport,
}) => {
  const { tx } = useLang();
  const { showToast } = useToast();
  const [judging, setJudging] = useState(false);

  const isDemoRun = !run || run.type === 'demo' || run.bench === 'demo' || run.id.startsWith('demo');

  const handleTriggerJudge = async (bases: boolean = false) => {
    if (!run) return;
    setJudging(true);
    try {
      await launchJudge({ run_id: run.id, bases });
      showToast(
        tx(
          bases
            ? `已启动 [${run.name}] 基线判分 (--bases)，可在控制台查看实时进度`
            : `已启动 [${run.name}] 评测判分 (Judge)，可在控制台查看实时进度`,
          `Launched Judge scoring for ${run.name}`
        ),
        'info'
      );
      if (onOpenConsole) onOpenConsole();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(tx(`启动判分失败: ${msg}`, `Failed to launch judge: ${msg}`), 'error');
    } finally {
      setJudging(false);
    }
  };

  if (loading) {
    return (
      <div className={`${card} p-6 text-center text-xs text-slate-500 space-y-2`}>
        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-500" />
        <p>{tx('正在加载评测报告...', 'Loading benchmark evaluation report...')}</p>
      </div>
    );
  }

  const hasData = !!report && (report.has_judged || report.has_base_judged);
  if (!report || !hasData) {
    return (
      <div className={`${card} p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4`}>
        <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-[16rem]">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isDemoRun
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            }`}
          >
            {isDemoRun ? <CheckCircle2 className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {isDemoRun
                ? tx(
                    '本地确定性演进运行（免外部 Judge 打分，直接审阅下方真实递归 DAG 与智能 Diff）',
                    'Deterministic Offline Evolution Run (Inspect Recursive DAG & Smart Diff Below)'
                  )
                : tx(
                    '当前基准 Run 尚未生成判分报告 (judged.json)',
                    'No Judged Report (judged.json) Generated Yet for This Run'
                  )}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              {isDemoRun
                ? tx(
                    '离线 Demo 聚焦验证 S1~S5 提议–探测–融合–盲审–经验入库全链路闭环。在下方切换任务即可交互式下钻每个候选节点的 Rollout 轨迹与代码改动。',
                    'Offline demo verifies the end-to-end Propose–Probe–Compose–Select–Reflect loop. Select any task below to inspect its DAG and semantic diff.'
                  )
                : tx(
                    '点击右侧「一键启动 Judge 判分」即可自动调用评测器对盲选胜出套件与基线进行量化打分。',
                    'Click "Run Judge Scoring" on the right to grade selected and baseline harnesses.'
                  )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!isDemoRun && (
            <>
              <button
                type="button"
                disabled={judging}
                onClick={() => handleTriggerJudge(false)}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-sm shadow-purple-500/20 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>{tx('⚖️ 一键启动 Judge 判分', '⚖️ Run Judge Scoring')}</span>
              </button>
              <button
                type="button"
                disabled={judging}
                onClick={() => handleTriggerJudge(true)}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 font-semibold rounded-xl border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title={tx('生成 base_judged.json 基线对比分', 'Score baseline executions (--bases)')}
              >
                <span>{tx('判分基线 (--bases)', 'Score Bases')}</span>
              </button>
            </>
          )}
          {onOpenConsole && (
            <button
              type="button"
              onClick={onOpenConsole}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 font-semibold rounded-xl border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{tx('实时终端', 'Console')}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const base = report.base_stats;
  const adapted = report.adapted_stats;
  const gain = adapted.avg_score - base.avg_score;
  const passDelta = adapted.all_pass_rate - base.all_pass_rate;
  const positive = gain >= 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_1fr] items-stretch gap-4">
        <div className={`${card} p-5 flex flex-col justify-between`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {tx('基准套件均分 (Baseline)', 'Baseline Mean Score')}
            </span>
            {!isDemoRun && !report.has_base_judged && (
              <button
                type="button"
                disabled={judging}
                onClick={() => handleTriggerJudge(true)}
                className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline font-semibold cursor-pointer"
              >
                {tx('+ 补跑基线判分', '+ Score Bases')}
              </button>
            )}
          </div>
          <p className="text-3xl sm:text-4xl font-black text-slate-600 dark:text-slate-300 mt-2 font-mono">
            {base.avg_score}%
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {tx(
              `全通过率 ${base.all_pass_rate}% · ${base.graded} 题已评`,
              `All-pass ${base.all_pass_rate}% · ${base.graded} graded`
            )}
          </span>
        </div>

        <div className="hidden md:flex items-center text-2xl text-slate-300 dark:text-slate-600 font-black">
          →
        </div>

        <div className={`${card} p-5 ring-1 ${positive ? 'ring-emerald-500/30' : 'ring-rose-500/30'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              {tx('Harness² 优化后均分 (Adapted)', 'Harness² Adapted Mean')}
            </span>
            {!isDemoRun && (
              <button
                type="button"
                disabled={judging}
                onClick={() => handleTriggerJudge(false)}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer flex items-center gap-1"
              >
                <Scale className="w-3 h-3" />
                <span>{tx('重跑判分', 'Re-Judge')}</span>
              </button>
            )}
          </div>
          <p
            className={`text-3xl sm:text-4xl font-black mt-2 font-mono ${
              positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {adapted.avg_score}%
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {tx(
              `全通过率 ${adapted.all_pass_rate}% · ${adapted.graded} 题已评`,
              `All-pass ${adapted.all_pass_rate}% · ${adapted.graded} graded`
            )}
          </span>
        </div>

        <div className={`${card} p-5`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
              {tx('综合性能净增益 (Net Gain)', 'Net Adaptation Gain')}
            </span>
            {onRefreshReport && (
              <button
                type="button"
                onClick={onRefreshReport}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                title={tx('刷新评测报告', 'Refresh Report')}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p
            className={`text-3xl sm:text-4xl font-black mt-2 flex items-center gap-1.5 font-mono ${
              positive ? 'text-purple-600 dark:text-purple-300' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            <TrendingUp className={`w-7 h-7 ${positive ? '' : 'rotate-180'}`} />
            {signed(gain)}%
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {tx(`全通过率变化 ${signed(passDelta)}%`, `All-pass delta ${signed(passDelta)}%`)}
          </span>
        </div>
      </div>
    </div>
  );
};
