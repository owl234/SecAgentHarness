import React from 'react';
import {
  X,
  FileCode,
  ExternalLink,
  Shield,
  CheckCircle2,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { FlowNode } from './flowTypes';
import { formatStageLabel } from '../../utils/labelFormatter';

interface NodeDetailDrawerProps {
  node: FlowNode | null;
  onClose: () => void;
  lang?: 'zh' | 'en';
  onNavigateToTab?: (tab: string) => void;
  telemetryData?: {
    stageCount?: number;
    chosenLabel?: string;
    hasExperience?: boolean;
    domain?: string;
  };
}

export const NodeDetailDrawer: React.FC<NodeDetailDrawerProps> = ({
  node,
  onClose,
  lang = 'zh',
  onNavigateToTab,
  telemetryData,
}) => {
  if (!node) return null;
  const isZh = lang === 'zh';
  const Icon = node.icon;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-white/98 dark:bg-slate-950/95 border-l border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-xl flex flex-col transition-transform duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-900/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-600/10 dark:border-blue-500/30 dark:text-blue-400 shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {node.code && (
                <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-cyan-400 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  {node.code}
                </span>
              )}
              <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                {isZh ? node.titleZh : node.titleEn}
              </h3>
            </div>
            {(node.subtitleZh || node.subtitleEn) && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {isZh ? node.subtitleZh : node.subtitleEn}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="关闭"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-700 dark:text-slate-300">
        {/* Mathematical Formula Preview if available */}
        {node.formula && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold block">
              {isZh ? '数学 / 状态转移方程' : 'State Transition Formula'}
            </span>
            <code className="text-blue-700 dark:text-cyan-300 font-mono text-xs block overflow-x-auto whitespace-pre-wrap">
              {node.formula}
            </code>
          </div>
        )}

        {/* Mechanism Overview */}
        <div className="space-y-1.5">
          <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] block">
            {isZh ? '📖 核心机制与原理解析' : 'Mechanism & Principle'}
          </span>
          <p className="text-slate-700 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
            {isZh ? node.descriptionZh : node.descriptionEn}
          </p>
        </div>

        {/* Source File Location Link */}
        {node.filePath && (
          <div className="space-y-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] block">
              {isZh ? '⚙️ 源码物理路径' : 'Source File'}
            </span>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 font-mono text-[11px]">
              <span className="text-blue-600 dark:text-cyan-400 truncate max-w-[320px]">{node.filePath}</span>
              <span
                className="text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0 ml-2"
                title={node.filePath}
              >
                <FileCode className="w-3.5 h-3.5" />
                <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          </div>
        )}

        {/* Invariants & Contracts */}
        {((isZh ? node.invariantsZh : node.invariantsEn) || []).length > 0 && (
          <div className="space-y-2">
            <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span>{isZh ? '设计契约与关键不变量 (Invariants)' : 'Design Invariants'}</span>
            </span>
            <div className="space-y-1.5">
              {(isZh ? node.invariantsZh : node.invariantsEn)!.map((rule, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>{rule}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inputs & Outputs Grid */}
        {((node.inputsZh && node.inputsZh.length > 0) || (node.outputsZh && node.outputsZh.length > 0)) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Inputs */}
            {node.inputsZh && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 space-y-1.5">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  {isZh ? '📥 输入契约 (Inputs)' : '📥 Inputs'}
                </span>
                <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {(isZh ? node.inputsZh : node.inputsEn)!.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0" />
                      <span className="truncate">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Outputs */}
            {node.outputsZh && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 space-y-1.5">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  {isZh ? '📤 产出交付物 (Outputs)' : '📤 Outputs'}
                </span>
                <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {(isZh ? node.outputsZh : node.outputsEn)!.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
                      <span className="truncate">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Telemetry Card if available */}
        {telemetryData && (
          <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-1.5">
            <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>{isZh ? '实机运行遥测映射 (Live Telemetry)' : 'Live Telemetry'}</span>
            </span>
            <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300 space-y-0.5">
              <div>Domain: <strong className="text-slate-900 dark:text-white">{telemetryData.domain || 'general'}</strong></div>
              <div>Executed Stages: <strong className="text-blue-600 dark:text-cyan-400">{telemetryData.stageCount || 0}</strong></div>
              <div>Chosen Winner: <strong className="text-emerald-600 dark:text-emerald-400">{formatStageLabel(telemetryData.chosenLabel || 'base', (zh, en) => isZh ? zh : en).fullName}</strong></div>
              <div>Experience Reflection: <strong className="text-purple-600 dark:text-purple-400">{telemetryData.hasExperience ? 'Emitted' : 'None'}</strong></div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-900/70 flex items-center justify-end gap-2">
        {node.actionTab && onNavigateToTab && (
          <button
            onClick={() => onNavigateToTab(node.actionTab!)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all"
          >
            <span>{isZh ? node.actionLabelZh || '前往相关模块' : node.actionLabelEn || 'Jump to Module'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
