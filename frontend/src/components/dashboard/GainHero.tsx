import React from 'react';
import { TrendingUp, HelpCircle, Terminal, RefreshCw } from 'lucide-react';
import { BenchmarkReport } from '../../types';
import { useLang } from '../../i18n/LangContext';

interface GainHeroProps {
  report: BenchmarkReport | null;
  loading: boolean;
  onOpenConsole?: () => void;
}

const card =
  'bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm';

const signed = (n: number, digits = 1) => `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`;

/** Hero strip: baseline → adapted score, net gain, all-pass delta. */
export const GainHero: React.FC<GainHeroProps> = ({ report, loading, onOpenConsole }) => {
  const { tx } = useLang();

  if (loading) {
    return (
      <div className={`${card} p-8 text-center text-xs text-slate-500 space-y-2`}>
        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-500" />
        <p>{tx('正在加载评测报告...', 'Loading benchmark evaluation report...')}</p>
      </div>
    );
  }

  const hasData = !!report && (report.has_judged || report.has_base_judged);
  if (!report || !hasData) {
    return (
      <div className={`${card} p-6 flex flex-wrap items-center gap-4`}>
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-[16rem]">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            {tx('当前 Run 尚未生成打分报告 (judged.json)', 'No judged report (judged.json) for this run')}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            {tx('基准打分通常在 Sweep 结束后由 ', 'Benchmark grading runs after a sweep via ')}
            <code className="text-blue-600 dark:text-blue-400 font-mono px-1 bg-blue-50 dark:bg-blue-900/30 rounded">
              sec-agent-harness2-judge
            </code>
            {tx(
              ' 独立执行。本地 Demo 关注确定性演进机制与交付物,无需裁决打分。地铁线仍可点击站点审阅 Diff。',
              '. Offline demos verify deterministic evolution and need no judge. Stations above remain clickable for Diff review.'
            )}
          </p>
        </div>
        {onOpenConsole && (
          <button
            type="button"
            onClick={onOpenConsole}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs text-slate-700 dark:text-slate-200 font-semibold rounded-xl border border-slate-200 dark:border-slate-700 inline-flex items-center gap-2 cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5" />
            {tx('打开控制台', 'Open Console')}
          </button>
        )}
      </div>
    );
  }

  const base = report.base_stats;
  const adapted = report.adapted_stats;
  const gain = adapted.avg_score - base.avg_score;
  const passDelta = adapted.all_pass_rate - base.all_pass_rate;
  const positive = gain >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_1fr] items-stretch gap-4">
      <div className={`${card} p-5`}>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {tx('基准套件均分', 'Baseline Mean Score')}
        </span>
        <p className="text-4xl font-black text-slate-600 dark:text-slate-300 mt-2 font-mono">
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
        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
          {tx('Harness² 优化后均分', 'Harness² Adapted Mean')}
        </span>
        <p
          className={`text-4xl font-black mt-2 font-mono ${
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
        <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
          {tx('综合性能净增益', 'Net Adaptation Gain')}
        </span>
        <p
          className={`text-4xl font-black mt-2 flex items-center gap-1.5 font-mono ${
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
  );
};
