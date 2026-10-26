import React from 'react';
import { ArrowRight, FileCode } from 'lucide-react';
import { FlowNode, FlowCategory } from './flowTypes';
import { ComponentCategory } from '../../types';
import { CATEGORY_META } from '../studio/categoryMeta';

interface FlowNodeCardProps {
  node: FlowNode;
  isSelected?: boolean;
  isWalkthroughActive?: boolean;
  onClick?: () => void;
  onSelectComponent?: (code: ComponentCategory) => void;
  lang?: 'zh' | 'en';
  compact?: boolean;
}

const CATEGORY_STYLES: Record<
  FlowCategory,
  {
    bg: string;
    border: string;
    selectedRing: string;
    badge: string;
    iconBg: string;
    glow: string;
  }
> = {
  entry: {
    bg: 'bg-white hover:bg-sky-50/40 dark:bg-slate-900/90 dark:hover:bg-slate-850 shadow-sm dark:shadow-none',
    border: 'border-sky-200/90 hover:border-sky-400 dark:border-sky-500/30 dark:hover:border-sky-400/60',
    selectedRing: 'ring-2 ring-sky-500 shadow-md shadow-sky-500/20 border-sky-500 dark:border-sky-400',
    badge: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/30',
    iconBg: 'bg-sky-50 text-sky-600 border border-sky-200 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30',
    glow: 'rgba(56, 189, 248, 0.25)',
  },
  core: {
    bg: 'bg-white hover:bg-indigo-50/40 dark:bg-slate-900/90 dark:hover:bg-slate-850 shadow-sm dark:shadow-none',
    border: 'border-indigo-200/90 hover:border-indigo-400 dark:border-indigo-500/30 dark:hover:border-indigo-400/60',
    selectedRing: 'ring-2 ring-indigo-500 shadow-md shadow-indigo-500/20 border-indigo-500 dark:border-indigo-400',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/30',
    iconBg: 'bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/30',
    glow: 'rgba(99, 102, 241, 0.25)',
  },
  propose: {
    bg: 'bg-white hover:bg-blue-50/40 dark:bg-slate-900/90 dark:hover:bg-slate-850 shadow-sm dark:shadow-none',
    border: 'border-blue-200/90 hover:border-blue-400 dark:border-blue-500/30 dark:hover:border-blue-400/60',
    selectedRing: 'ring-2 ring-blue-500 shadow-md shadow-blue-500/20 border-blue-500 dark:border-blue-400',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30',
    iconBg: 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30',
    glow: 'rgba(59, 130, 246, 0.25)',
  },
  probe: {
    bg: 'bg-white hover:bg-amber-50/40 dark:bg-slate-900/90 dark:hover:bg-slate-850 shadow-sm dark:shadow-none',
    border: 'border-amber-200/90 hover:border-amber-400 dark:border-amber-500/30 dark:hover:border-amber-400/60',
    selectedRing: 'ring-2 ring-amber-500 shadow-md shadow-amber-500/20 border-amber-500 dark:border-amber-400',
    badge: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
    iconBg: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
    glow: 'rgba(245, 158, 11, 0.25)',
  },
  compose: {
    bg: 'bg-white hover:bg-violet-50/40 dark:bg-slate-900/90 dark:hover:bg-slate-850 shadow-sm dark:shadow-none',
    border: 'border-violet-200/90 hover:border-violet-400 dark:border-violet-500/30 dark:hover:border-violet-400/60',
    selectedRing: 'ring-2 ring-violet-500 shadow-md shadow-violet-500/20 border-violet-500 dark:border-violet-400',
    badge: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/30',
    iconBg: 'bg-violet-50 text-violet-600 border border-violet-200 dark:bg-violet-500/15 dark:text-violet-400 dark:border-violet-500/30',
    glow: 'rgba(139, 92, 246, 0.25)',
  },
  judge: {
    bg: 'bg-white hover:bg-emerald-50/40 dark:bg-slate-900/90 dark:hover:bg-slate-850 shadow-sm dark:shadow-none',
    border: 'border-emerald-200/90 hover:border-emerald-400 dark:border-emerald-500/30 dark:hover:border-emerald-400/60',
    selectedRing: 'ring-2 ring-emerald-500 shadow-md shadow-emerald-500/20 border-emerald-500 dark:border-emerald-400',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30',
    iconBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
    glow: 'rgba(16, 185, 129, 0.25)',
  },
  memory: {
    bg: 'bg-white hover:bg-purple-50/40 dark:bg-slate-900/90 dark:hover:bg-slate-850 shadow-sm dark:shadow-none',
    border: 'border-purple-200/90 hover:border-purple-400 dark:border-purple-500/30 dark:hover:border-purple-400/60',
    selectedRing: 'ring-2 ring-purple-500 shadow-md shadow-purple-500/20 border-purple-500 dark:border-purple-400',
    badge: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30',
    iconBg: 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30',
    glow: 'rgba(168, 85, 247, 0.25)',
  },
  substrate: {
    bg: 'bg-white hover:bg-teal-50/40 dark:bg-slate-900/90 dark:hover:bg-slate-850 shadow-sm dark:shadow-none',
    border: 'border-teal-200/90 hover:border-teal-400 dark:border-teal-500/30 dark:hover:border-teal-400/60',
    selectedRing: 'ring-2 ring-teal-500 shadow-md shadow-teal-500/20 border-teal-500 dark:border-teal-400',
    badge: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/30',
    iconBg: 'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-500/15 dark:text-teal-400 dark:border-teal-500/30',
    glow: 'rgba(20, 184, 166, 0.25)',
  },
  bench: {
    bg: 'bg-white hover:bg-orange-50/40 dark:bg-slate-900/90 dark:hover:bg-slate-850 shadow-sm dark:shadow-none',
    border: 'border-orange-200/90 hover:border-orange-400 dark:border-orange-500/30 dark:hover:border-orange-400/60',
    selectedRing: 'ring-2 ring-orange-500 shadow-md shadow-orange-500/20 border-orange-500 dark:border-orange-400',
    badge: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/30',
    iconBg: 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30',
    glow: 'rgba(249, 115, 22, 0.25)',
  },
  alert: {
    bg: 'bg-white hover:bg-rose-50/40 dark:bg-slate-900/90 dark:hover:bg-slate-850 shadow-sm dark:shadow-none',
    border: 'border-rose-200/90 hover:border-rose-400 dark:border-rose-500/30 dark:hover:border-rose-400/60',
    selectedRing: 'ring-2 ring-rose-500 shadow-md shadow-rose-500/20 border-rose-500 dark:border-rose-400',
    badge: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30',
    iconBg: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30',
    glow: 'rgba(244, 63, 94, 0.25)',
  },
};

export const FlowNodeCard: React.FC<FlowNodeCardProps> = ({
  node,
  isSelected = false,
  isWalkthroughActive = false,
  onClick,
  onSelectComponent,
  lang = 'zh',
  compact = false,
}) => {
  const isZh = lang === 'zh';
  const Icon = node.icon;
  const style = CATEGORY_STYLES[node.category] || CATEGORY_STYLES.core;

  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl border transition-all duration-200 cursor-pointer backdrop-blur group ${
        style.bg
      } ${
        isWalkthroughActive
          ? 'ring-2 ring-blue-500 shadow-xl shadow-blue-500/30 border-blue-400 scale-[1.02] z-20'
          : isSelected
          ? style.selectedRing
          : style.border
      } ${compact ? 'p-2.5' : 'p-3.5'}`}
      style={{
        boxShadow: isWalkthroughActive ? `0 0 20px ${style.glow}` : undefined,
      }}
    >
      {/* Walkthrough Live Step Indicator */}
      {isWalkthroughActive && (
        <div className="absolute -top-2.5 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-md animate-bounce z-30">
          {isZh ? '正在演示' : 'Active Step'}
        </div>
      )}

      {/* Top row: Icon, Title & Code badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`p-2 rounded-lg shrink-0 transition-transform group-hover:scale-105 ${
              style.iconBg
            }`}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {node.code && (
                <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-white px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  {node.code}
                </span>
              )}
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white tracking-tight truncate group-hover:text-blue-600 dark:group-hover:text-cyan-300 transition-colors">
                {isZh ? node.titleZh : node.titleEn}
              </h4>
            </div>
            {(node.subtitleZh || node.subtitleEn) && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate mt-0.5">
                {isZh ? node.subtitleZh : node.subtitleEn}
              </span>
            )}
          </div>
        </div>

        {node.badge && (
          <span
            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border shrink-0 ${style.badge}`}
          >
            {node.badge}
          </span>
        )}
      </div>

      {/* Description text */}
      {!compact && (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
          {isZh ? node.descriptionZh : node.descriptionEn}
        </p>
      )}

      {/* Embedded Component Chips (c1 ~ c9) */}
      {node.componentCodes && node.componentCodes.length > 0 && (
        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 shrink-0">
            {isZh ? '关联套件:' : 'Harness:'}
          </span>
          {node.componentCodes.map((code) => {
            const meta = CATEGORY_META[code];
            if (!meta) return null;
            return (
              <button
                key={code}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectComponent) {
                    onSelectComponent(code);
                  } else if (onClick) {
                    onClick();
                  }
                }}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border transition-all hover:scale-105 ${
                  meta.bgLight
                } ${meta.border} ${meta.color}`}
                title={isZh ? `点击查看套件 ${code} (${meta.cnName})` : `Inspect ${code} (${meta.name})`}
              >
                <span>{code}</span>
                <span className="font-sans text-[9px] opacity-80">{meta.cnName}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Invariants or I/O Hint Capsules */}
      {((node.inputsZh && node.inputsZh.length > 0) || (node.outputsZh && node.outputsZh.length > 0)) && (
        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1 truncate max-w-[150px]">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            <span className="truncate">
              In: {isZh ? node.inputsZh?.[0] : node.inputsEn?.[0]}
            </span>
          </div>
          <div className="flex items-center gap-1 truncate max-w-[150px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">
              Out: {isZh ? node.outputsZh?.[0] : node.outputsEn?.[0]}
            </span>
          </div>
        </div>
      )}

      {/* Footer info: File path or formula + Drilldown indicator */}
      <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400 dark:text-slate-500">
        <span className="truncate max-w-[200px]">
          {node.filePath ? (
            <span className="flex items-center gap-1">
              <FileCode className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              <span className="truncate text-slate-500 dark:text-slate-400">{node.filePath}</span>
            </span>
          ) : node.formula ? (
            <span className="text-blue-600 dark:text-cyan-400 truncate">{node.formula}</span>
          ) : (
            <span>Node #{node.id}</span>
          )}
        </span>
        <span className="flex items-center gap-0.5 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all">
          <span className="text-[10px]">{isZh ? '详情' : 'Inspect'}</span>
          <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
};
