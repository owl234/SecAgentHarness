import React from 'react';
import {
  X,
  FileCode,
  ExternalLink,
  Shield,
  CheckCircle2,
  ArrowRight,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { FlowNode } from './flowTypes';
import { ComponentCategory } from '../../types';
import { CATEGORY_META } from '../studio/categoryMeta';
import { formatStageLabel } from '../../utils/labelFormatter';
import { FormulaCard } from './FormulaCard';

interface NodeDetailDrawerProps {
  node: FlowNode | null;
  selectedComponentCode?: ComponentCategory | null;
  onClose: () => void;
  lang?: 'zh' | 'en';
  onNavigateToTab?: (tab: string, category?: ComponentCategory | null) => void;
  telemetryData?: {
    stageCount?: number;
    chosenLabel?: string;
    hasExperience?: boolean;
    domain?: string;
  };
}

export const NodeDetailDrawer: React.FC<NodeDetailDrawerProps> = ({
  node,
  selectedComponentCode,
  onClose,
  lang = 'zh',
  onNavigateToTab,
  telemetryData,
}) => {
  if (!node && !selectedComponentCode) return null;
  const isZh = lang === 'zh';

  // Highlighted component meta if user clicked a specific component code
  const activeComponent = selectedComponentCode ? CATEGORY_META[selectedComponentCode] : null;
  const Icon = node ? node.icon : activeComponent ? activeComponent.icon : Sparkles;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white/95 dark:bg-slate-950/95 border-l border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-xl flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-900/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-600/10 dark:border-blue-500/30 dark:text-blue-400 shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {node?.code && (
                <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-cyan-400 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  {node.code}
                </span>
              )}
              {activeComponent && (
                <span className="font-mono font-bold text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-700">
                  {selectedComponentCode}
                </span>
              )}
              <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                {activeComponent
                  ? `${selectedComponentCode} · ${isZh ? activeComponent.cnName : activeComponent.name}`
                  : node
                  ? isZh
                    ? node.titleZh
                    : node.titleEn
                  : ''}
              </h3>
            </div>
            {node && (node.subtitleZh || node.subtitleEn) && (
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
        {/* If a specific component is selected or node has componentCodes */}
        {activeComponent && selectedComponentCode && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/70 to-blue-50/50 dark:from-indigo-950/30 dark:to-slate-900/60 border border-indigo-200 dark:border-indigo-800/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>{selectedComponentCode} · {isZh ? activeComponent.cnName : activeComponent.name}</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/50">
                {activeComponent.role}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
              {isZh ? activeComponent.desc : activeComponent.enDesc}
            </p>
            <div className="flex items-center justify-between pt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
              <span className="truncate">Path: {activeComponent.defaultPath}</span>
              {onNavigateToTab && (
                <button
                  onClick={() => onNavigateToTab('studio', selectedComponentCode)}
                  className="text-indigo-600 dark:text-indigo-400 font-sans font-semibold flex items-center gap-1 hover:underline ml-2 shrink-0 cursor-pointer"
                >
                  <span>{isZh ? '在组件工作室调试' : 'Open in Studio'}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mathematical Formula Preview with KaTeX and Semantic Explanation */}
        {node?.formula && (
          <FormulaCard
            formula={node.formula}
            explanationZh={node.formulaExplanationZh}
            explanationEn={node.formulaExplanationEn}
            lang={lang}
          />
        )}

        {/* Mechanism Overview */}
        {node && (
          <div className="space-y-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] block">
              {isZh ? '📖 核心机制与原理解析' : 'Mechanism & Principle'}
            </span>
            <p className="text-slate-700 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
              {isZh ? node.descriptionZh : node.descriptionEn}
            </p>
          </div>
        )}

        {/* Associated Component Badges in this stage */}
        {node?.componentCodes && node.componentCodes.length > 0 && !selectedComponentCode && (
          <div className="space-y-2">
            <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>{isZh ? '当前阶段直接调用的 SecAgentHarness² 套件 (c1~c9)' : 'Associated SecAgentHarness² Components'}</span>
            </span>
            <div className="grid grid-cols-1 gap-2">
              {node.componentCodes.map((code) => {
                const meta = CATEGORY_META[code];
                if (!meta) return null;
                const MetaIcon = meta.icon;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onNavigateToTab?.('studio', code)}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/70 dark:bg-slate-900/60 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 flex items-start gap-2.5 transition-all cursor-pointer"
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 ${meta.bgLight} ${meta.color}`}>
                      <MetaIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {code} · {isZh ? meta.cnName : meta.name}
                        </span>
                        <span className="text-[10px] font-mono text-blue-600 dark:text-cyan-400">
                          {isZh ? '进入工作室 ➔' : 'Open Studio ➔'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {isZh ? meta.desc : meta.enDesc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Source File Location Link */}
        {node?.filePath && (
          <div className="space-y-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] block">
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
        {node && ((isZh ? node.invariantsZh : node.invariantsEn) || []).length > 0 && (
          <div className="space-y-2">
            <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span>{isZh ? '设计契约与关键不变量' : 'Design Invariants'}</span>
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
        {node && ((node.inputsZh && node.inputsZh.length > 0) || (node.outputsZh && node.outputsZh.length > 0)) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Inputs */}
            {node.inputsZh && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  {isZh ? '📥 输入契约' : '📥 Inputs'}
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
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  {isZh ? '📤 产出交付物' : '📤 Outputs'}
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
              <span>{isZh ? '实机运行遥测映射' : 'Live Telemetry'}</span>
            </span>
            <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300 space-y-0.5">
              <div>{isZh ? '业务领域：' : 'Domain: '}<strong className="text-slate-900 dark:text-white">{telemetryData.domain || 'general'}</strong></div>
              <div>{isZh ? '已执行阶段数：' : 'Executed Stages: '}<strong className="text-blue-600 dark:text-cyan-400">{telemetryData.stageCount || 0}</strong></div>
              <div>{isZh ? '胜出采纳阶段：' : 'Chosen Winner: '}<strong className="text-emerald-600 dark:text-emerald-400">{formatStageLabel(telemetryData.chosenLabel || 'base', (zh, en) => isZh ? zh : en).fullName}</strong></div>
              <div>{isZh ? '经验反思沉淀：' : 'Experience Reflection: '}<strong className="text-purple-600 dark:text-purple-400">{telemetryData.hasExperience ? (isZh ? '已生成' : 'Emitted') : (isZh ? '无' : 'None')}</strong></div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-900/70 flex items-center justify-end gap-2">
        {onNavigateToTab && (
          <button
            onClick={() =>
              onNavigateToTab(
                node?.actionTab || 'studio',
                selectedComponentCode || node?.componentCodes?.[0] || null
              )
            }
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <span>{isZh ? node?.actionLabelZh || '前往相关模块' : node?.actionLabelEn || 'Jump to Module'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
