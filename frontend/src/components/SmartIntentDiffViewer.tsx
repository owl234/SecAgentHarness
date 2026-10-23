import React, { useState } from 'react';
import { DiffResult } from '../types';
import {
  FileCode,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  FileText,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { useLang } from '../i18n/LangContext';

interface SmartIntentDiffViewerProps {
  diff: DiffResult | null;
  baseLabel: string;
  compareLabel: string;
  availableLabels: string[];
  onChangeComparison: (base: string, compare: string) => void;
  loading: boolean;
  onViewPipeline?: () => void;
}

export const SmartIntentDiffViewer: React.FC<SmartIntentDiffViewerProps> = ({
  diff,
  baseLabel,
  compareLabel,
  availableLabels,
  onChangeComparison,
  loading,
  onViewPipeline,
}) => {
  const { tx } = useLang();
  const [activeTab, setActiveTab] = useState<'intent' | 'diff'>('intent');
  const [expandedFileIdx, setExpandedFileIdx] = useState<number | null>(0);

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
        {tx(
          '正在智能分析套件改动意图与组件行级差异...',
          'Analyzing harness edit intent and line-level component diffs...'
        )}
      </div>
    );
  }

  if (!diff || (!diff.has_changes && diff.files.length === 0)) {
    return (
      <div className="p-6 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {tx('基准套件:', 'Base Harness:')}
          </span>
          <select
            value={baseLabel}
            onChange={(e) => onChangeComparison(e.target.value, compareLabel)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200 rounded px-2 py-1"
          >
            {availableLabels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {tx('对比套件:', 'Target Harness:')}
          </span>
          <select
            value={compareLabel}
            onChange={(e) => onChangeComparison(baseLabel, e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200 rounded px-2 py-1"
          >
            {availableLabels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-500">
          {tx(
            '两个套件配置完全一致，未发生组件层面的改动（或直接沿用基准套件）。',
            'Both harnesses are identical; no component surface modifications occurred.'
          )}
        </p>
      </div>
    );
  }

  const intentList = diff.intent_summary || [];
  const compSummary = diff.components_summary || {};

  return (
    <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Top Header & Stage Switcher */}
      <div className="p-4 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{tx('智能体装备改动分析 (Harness Changes)', 'Harness Evolution Diff & Intent')}</span>
              <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 font-medium">
                {tx(`${diff.total_files_changed} 个文件变更`, `${diff.total_files_changed} file(s) changed`)}
              </span>
            </h4>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
              <span>{tx('对比:', 'Compare:')}</span>
              <select
                value={baseLabel}
                onChange={(e) => onChangeComparison(e.target.value, compareLabel)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] rounded px-1.5 py-0.5"
              >
                {availableLabels.map((l) => (
                  <option key={l} value={l}>
                    {tx('基准:', 'Base:')} {l}
                  </option>
                ))}
              </select>
              <span>➔</span>
              <select
                value={compareLabel}
                onChange={(e) => onChangeComparison(baseLabel, e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-blue-600 dark:text-blue-400 rounded px-1.5 py-0.5"
              >
                {availableLabels.map((l) => (
                  <option key={l} value={l}>
                    {tx('目标:', 'Target:')} {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* View Toggle & Pipeline Link */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-200/60 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('intent')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer font-medium ${
                activeTab === 'intent'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tx('通俗改动清单', 'Intent Summary')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('diff')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer font-medium ${
                activeTab === 'diff'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tx('代码行级比对 (Diff)', 'Line-by-Line Diff')}
            </button>
          </div>

          {onViewPipeline && (
            <button
              type="button"
              onClick={onViewPipeline}
              className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
              title={tx(
                '在演进流水线中查看完整 DAG 流程拓扑',
                'View full DAG topology in Pipeline tab'
              )}
            >
              <span>{tx('查看流水线 DAG', 'View Pipeline DAG')}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 8-Component Pill Badges */}
      <div className="px-5 py-3 bg-white dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1">
          <Sliders className="w-3 h-3" />
          <span>{tx('8大组件状态:', '8-Component Surface:')}</span>
        </span>
        {Object.entries(compSummary).map(([k, val]) => {
          const isMod = val.status === 'modified' || val.status === 'added';
          return (
            <span
              key={k}
              className={`text-[11px] px-2.5 py-0.5 rounded-full border flex items-center gap-1 transition-colors ${
                isMod
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300 dark:border-blue-700 font-semibold'
                  : 'bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-400 border-slate-200 dark:border-slate-800 opacity-70'
              }`}
            >
              {isMod ? <CheckCircle2 className="w-3 h-3 text-blue-500" /> : null}
              <span>{val.label}</span>
              {isMod && val.changes > 0 ? (
                <span className="text-[10px] text-blue-500 dark:text-blue-400 font-mono">
                  ({val.changes}
                  {tx('行', 'L')})
                </span>
              ) : null}
            </span>
          );
        })}
      </div>

      {/* Main Content Area */}
      {activeTab === 'intent' ? (
        <div className="p-5 space-y-4">
          {intentList.length > 0 && (
            <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 rounded-xl p-4 space-y-2">
              <h5 className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{tx('本次优化的核心意图与经验总结', 'Optimization Intent & Key Takeaways')}</span>
              </h5>
              <ul className="space-y-1.5 mt-2">
                {intentList.map((item, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 leading-relaxed"
                  >
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {tx('具体变动的文件清单', 'Modified Files')}
            </h5>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900/40">
              {diff.files.map((f, idx) => (
                <div
                  key={f.path || idx}
                  onClick={() => {
                    setExpandedFileIdx(idx);
                    setActiveTab('diff');
                  }}
                  className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 font-mono text-slate-800 dark:text-slate-200">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>{f.path}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        f.status === 'added'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : f.status === 'removed'
                          ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                          : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}
                    >
                      {f.status === 'added'
                        ? tx('新增', 'Added')
                        : f.status === 'removed'
                        ? tx('移除', 'Removed')
                        : tx('修改', 'Modified')}
                    </span>
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                      +{f.additions}
                    </span>
                    <span className="text-[11px] font-mono text-rose-600 dark:text-rose-400">
                      -{f.deletions}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Git Diff View */
        <div className="p-4 space-y-3">
          {diff.files.map((file, idx) => {
            const isExpanded = expandedFileIdx === idx;
            return (
              <div
                key={file.path || idx}
                className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-950 font-mono text-xs"
              >
                <div
                  onClick={() => setExpandedFileIdx(isExpanded ? null : idx)}
                  className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <FileCode className="w-3.5 h-3.5 text-blue-500" />
                    <span>{file.path}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-emerald-600 dark:text-emerald-400">+{file.additions}</span>
                    <span className="text-rose-600 dark:text-rose-400">-{file.deletions}</span>
                  </div>
                </div>

                {isExpanded && (
                  <pre className="p-4 text-[11px] leading-relaxed overflow-x-auto text-slate-800 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-950 font-mono">
                    {file.diff_text.split('\n').map((line, lIdx) => {
                      let lineClass = 'text-slate-600 dark:text-slate-400';
                      if (line.startsWith('+') && !line.startsWith('+++')) {
                        lineClass =
                          'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 block -mx-4 px-4';
                      } else if (line.startsWith('-') && !line.startsWith('---')) {
                        lineClass =
                          'bg-rose-50/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 block -mx-4 px-4';
                      } else if (line.startsWith('@@')) {
                        lineClass = 'text-blue-500 font-semibold my-1 block';
                      }
                      return (
                        <div key={lIdx} className={lineClass}>
                          {line || ' '}
                        </div>
                      );
                    })}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
