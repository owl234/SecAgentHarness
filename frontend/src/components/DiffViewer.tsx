import React, { useEffect, useState } from 'react';
import { DiffResult, DiffFile } from '../types';
import { FileCode, Plus, Minus, ArrowLeftRight } from 'lucide-react';
import { useLang } from '../i18n/LangContext';
import { formatStageLabel } from '../utils/labelFormatter';

interface DiffViewerProps {
  diff: DiffResult | null;
  baseLabel: string;
  compareLabel: string;
  availableLabels: string[];
  onChangeComparison: (base: string, compare: string) => void;
  loading: boolean;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  diff,
  baseLabel,
  compareLabel,
  availableLabels,
  onChangeComparison,
  loading,
}) => {
  const { tx } = useLang();
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);

  useEffect(() => {
    setSelectedFileIdx(0);
  }, [diff?.task_id, baseLabel, compareLabel]);

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
        {tx('正在计算套件差异比对...', 'Computing harness component diff...')}
      </div>
    );
  }

  if (!diff || diff.files.length === 0) {
    return (
      <div className="p-6 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {tx('对比基准:', 'Base:')}
          </span>
          <select
            value={baseLabel}
            onChange={(e) => onChangeComparison(e.target.value, compareLabel)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200 rounded px-2 py-1"
          >
            {availableLabels.map((l) => (
              <option key={l} value={l}>
                {formatStageLabel(l, tx).fullName}
              </option>
            ))}
          </select>
          <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {tx('对比目标:', 'Compare:')}
          </span>
          <select
            value={compareLabel}
            onChange={(e) => onChangeComparison(baseLabel, e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-200 rounded px-2 py-1"
          >
            {availableLabels.map((l) => (
              <option key={l} value={l}>
                {formatStageLabel(l, tx).fullName}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-500">
          {tx(
            '两个阶段套件完全一致（无组件修改或直接继承自基准套件）',
            'The two harness stages are identical (no component edits or inherited directly from base).'
          )}
        </p>
      </div>
    );
  }

  const activeFile: DiffFile = diff.files[selectedFileIdx] || diff.files[0];

  return (
    <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Header Controls */}
      <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <FileCode className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-semibold text-slate-900 dark:text-white">
            {tx('套件组件变更比对', 'Harness Surface Diff')}
          </span>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
            <select
              value={baseLabel}
              onChange={(e) => onChangeComparison(e.target.value, compareLabel)}
              className="bg-transparent text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              {availableLabels.map((l) => (
                <option
                  key={l}
                  value={l}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  {tx('基准:', 'Base:')} {formatStageLabel(l, tx).fullName}
                </option>
              ))}
            </select>
            <ArrowLeftRight className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            <select
              value={compareLabel}
              onChange={(e) => onChangeComparison(baseLabel, e.target.value)}
              className="bg-transparent text-xs text-blue-600 dark:text-blue-400 font-semibold focus:outline-none"
            >
              {availableLabels.map((l) => (
                <option
                  key={l}
                  value={l}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  {tx('目标:', 'Target:')} {formatStageLabel(l, tx).fullName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
            <Plus className="w-3 h-3" /> +{diff.total_additions}
          </span>
          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 font-medium">
            <Minus className="w-3 h-3" /> -{diff.total_deletions}
          </span>
          <span className="text-slate-500 dark:text-slate-400 font-medium">
            {tx(
              `共 ${diff.total_files_changed} 个文件变更`,
              `${diff.total_files_changed} file(s) changed`
            )}
          </span>
        </div>
      </div>

      {/* File Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-950/30 overflow-x-auto">
        {diff.files.map((file, idx) => (
          <button
            type="button"
            key={file.path}
            onClick={() => setSelectedFileIdx(idx)}
            className={`px-3 py-2 text-xs font-mono flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 transition-colors whitespace-nowrap cursor-pointer ${
              idx === selectedFileIdx
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-b-2 border-b-blue-500'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-900/40'
            }`}
          >
            <span>{file.path}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-sans uppercase font-semibold ${
                file.status === 'added'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                  : file.status === 'removed'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
              }`}
            >
              {file.status}
            </span>
          </button>
        ))}
      </div>

      {/* Diff Code View */}
      <div className="p-4 font-mono text-xs leading-relaxed overflow-x-auto bg-slate-950 dark:bg-black/80 max-h-96">
        {activeFile ? (
          activeFile.diff_text.split('\n').map((line, lIdx) => {
            let lineBg = '';
            let lineTextColor = 'text-slate-300';
            if (line.startsWith('+') && !line.startsWith('+++')) {
              lineBg = 'bg-emerald-950/60';
              lineTextColor = 'text-emerald-300 font-medium';
            } else if (line.startsWith('-') && !line.startsWith('---')) {
              lineBg = 'bg-rose-950/60';
              lineTextColor = 'text-rose-300 font-medium';
            } else if (line.startsWith('@@')) {
              lineBg = 'bg-blue-950/50';
              lineTextColor = 'text-cyan-400 font-semibold';
            }

            return (
              <div
                key={lIdx}
                className={`px-2 py-0.5 rounded-sm whitespace-pre ${lineBg} ${lineTextColor}`}
              >
                {line || ' '}
              </div>
            );
          })
        ) : (
          <div className="text-slate-500">
            {tx('选择文件以查看 Diff', 'Select a file to inspect diff')}
          </div>
        )}
      </div>
    </div>
  );
};
