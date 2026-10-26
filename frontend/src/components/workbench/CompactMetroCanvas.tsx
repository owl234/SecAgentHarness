import React, { useMemo } from 'react';
import {
  CheckCircle2,
  GitBranch,
  Sparkles,
} from 'lucide-react';
import { FlowNode } from '../native_flow/flowTypes';
import { LIFECYCLE_NODES } from '../native_flow/LifecyclePipelineFlow';
import { LiveStageStep } from '../../types';
import { useLang } from '../../i18n/LangContext';

interface CompactMetroCanvasProps {
  activeStepIndex?: number | null;
  liveStep?: LiveStageStep | null;
  isRunning: boolean;
  isCompleted: boolean;
  mode?: 'parallel' | 'sequential';
  onToggleMode?: (mode: 'parallel' | 'sequential') => void;
  selectedNodeId?: string;
  onSelectNode?: (node: FlowNode) => void;
  activeSubstrate?: string;
}

// 12 station horizontal layout coordinates in a 1020x170 viewBox
const COMPACT_STATIONS = [
  // S1 (Cold Start & Baseline) - Sky Blue
  { step: 0, x: 45, y: 70, stage: 1, color: '#0284c7', label: '任务接入', sub: 'Spec' },
  { step: 1, x: 125, y: 70, stage: 1, color: '#0284c7', label: '先验经验', sub: 'Prior' },
  { step: 2, x: 205, y: 70, stage: 1, color: '#0284c7', label: '基线探针', sub: 'Base' },

  // S2 (Diagnosis & Intent) - Indigo
  { step: 3, x: 295, y: 70, stage: 2, color: '#4f46e5', label: '诊断Agent', sub: 'Diag' },
  { step: 4, x: 375, y: 70, stage: 2, color: '#4f46e5', label: '意图差分', sub: 'Diff' },

  // S3 (Materialization) - Emerald
  { step: 5, x: 465, y: 46, stage: 3, color: '#059669', label: '提示词', sub: 'c1/c2' },
  { step: 6, x: 545, y: 46, stage: 3, color: '#059669', label: '工具护栏', sub: 'c3~c6' },
  { step: 7, x: 625, y: 70, stage: 3, color: '#059669', label: '补丁应用', sub: 'Patch' },

  // S4 (Verification & Grader) - Amber
  { step: 8, x: 715, y: 70, stage: 4, color: '#d97706', label: '验证探针', sub: 'Probe' },
  { step: 9, x: 795, y: 70, stage: 4, color: '#d97706', label: '双盲裁决', sub: 'Judge' },

  // S5 (Aggregate & Library) - Purple
  { step: 10, x: 885, y: 70, stage: 5, color: '#7c3aed', label: '多候选聚合', sub: 'Agg' },
  { step: 11, x: 965, y: 70, stage: 5, color: '#7c3aed', label: '经验沉淀', sub: 'Library' },
];

export const CompactMetroCanvas: React.FC<CompactMetroCanvasProps> = ({
  activeStepIndex = null,
  liveStep = null,
  isRunning,
  isCompleted,
  mode = 'parallel',
  onToggleMode,
  selectedNodeId,
  onSelectNode,
  activeSubstrate,
}) => {
  const { tx, lang } = useLang();
  const isZh = lang === 'zh';

  // Determine current effective step
  const currentStep = useMemo(() => {
    if (liveStep && typeof liveStep.stepIndex === 'number') {
      return liveStep.stepIndex;
    }
    if (typeof activeStepIndex === 'number') {
      return activeStepIndex;
    }
    if (isCompleted) {
      return 11;
    }
    return null;
  }, [liveStep, activeStepIndex, isCompleted]);

  // Stage Regions
  const STAGE_BOUNDS = [
    { stage: 1, name: tx('S1 冷启动与基线', 'S1 Cold Start'), x: 20, w: 230, color: 'sky' },
    { stage: 2, name: tx('S2 缺陷诊断与意图', 'S2 Diagnostics'), x: 270, w: 150, color: 'indigo' },
    { stage: 3, name: tx('S3 候选套件物化', 'S3 Materialization'), x: 440, w: 230, color: 'emerald' },
    { stage: 4, name: tx('S4 候选验证探针', 'S4 Verification'), x: 690, w: 150, color: 'amber' },
    { stage: 5, name: tx('S5 聚合与经验沉淀', 'S5 Aggregation'), x: 860, w: 145, color: 'purple' },
  ];

  return (
    <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
      {/* 1. Header controls */}
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <GitBranch className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              {tx('双轨 12 步演进管线流', 'Dual-Track 12-Step Lifecycle')}
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                12 Stations
              </span>
            </span>
          </div>
        </div>

        {/* Mode Switch & Substrate Badge */}
        <div className="flex items-center gap-2">
          {activeSubstrate && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
              {activeSubstrate}
            </span>
          )}

          {onToggleMode && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-medium">
              <button
                type="button"
                onClick={() => onToggleMode('parallel')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  mode === 'parallel'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title={tx('K 组候选并行探测与交叉聚合', 'Parallel aggregation mode')}
              >
                {tx('并联聚合', 'Parallel')}
              </button>
              <button
                type="button"
                onClick={() => onToggleMode('sequential')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  mode === 'sequential'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title={tx('单候选步步迭代与串行择优', 'Sequential mode')}
              >
                {tx('串行择优', 'Sequential')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Responsive Metro SVG Canvas */}
      <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        <svg
          viewBox="0 0 1020 150"
          className="w-full min-w-[700px] h-[140px] select-none"
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="trackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="25%" stopColor="#4f46e5" />
              <stop offset="55%" stopColor="#059669" />
              <stop offset="80%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>

            {/* Glowing filter for active station */}
            <filter id="activeGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Stage Zones */}
          {STAGE_BOUNDS.map((stg) => (
            <g key={stg.stage}>
              <rect
                x={stg.x}
                y={15}
                width={stg.w}
                height={120}
                rx={10}
                className="fill-slate-50/70 dark:fill-slate-800/40 stroke-slate-200/50 dark:stroke-slate-800/60"
                strokeDasharray="3 3"
              />
              <text
                x={stg.x + 8}
                y={28}
                className="text-[9px] fill-slate-400 dark:fill-slate-500 font-mono font-bold"
              >
                {stg.name}
              </text>
            </g>
          ))}

          {/* Main Metro Line Tracks */}
          {/* Main Horizontal Track */}
          <line
            x1={45}
            y1={70}
            x2={965}
            y2={70}
            stroke="url(#trackGrad)"
            strokeWidth={4}
            strokeLinecap="round"
            className="opacity-70 dark:opacity-80"
          />

          {/* If Parallel Mode: draw candidate fork loop */}
          {mode === 'parallel' && (
            <path
              d="M 375 70 C 410 70, 425 46, 465 46 L 625 46 C 665 46, 680 70, 715 70"
              fill="none"
              stroke="#059669"
              strokeWidth={3}
              strokeDasharray="4 3"
              className="opacity-80"
            />
          )}

          {/* Draw Stations */}
          {COMPACT_STATIONS.map((st) => {
            const isStationActive = isRunning && currentStep === st.step;
            const isStationPassed =
              isCompleted || (typeof currentStep === 'number' && st.step < currentStep);
            const isSelected = selectedNodeId === LIFECYCLE_NODES[st.step]?.id;

            const nodeData = LIFECYCLE_NODES[st.step];

            return (
              <g
                key={st.step}
                className="cursor-pointer group"
                onClick={() => nodeData && onSelectNode && onSelectNode(nodeData)}
              >
                {/* Station Ripple if active */}
                {isStationActive && (
                  <circle
                    cx={st.x}
                    cy={st.y}
                    r={18}
                    fill={st.color}
                    className="opacity-25 animate-ping"
                  />
                )}

                {/* Selection ring */}
                {isSelected && (
                  <circle
                    cx={st.x}
                    cy={st.y}
                    r={15}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    strokeDasharray="2 2"
                  />
                )}

                {/* Station Main Circle */}
                <circle
                  cx={st.x}
                  cy={st.y}
                  r={10}
                  fill={
                    isStationPassed
                      ? '#10b981'
                      : isStationActive
                      ? '#f59e0b'
                      : '#ffffff'
                  }
                  stroke={
                    isStationPassed
                      ? '#059669'
                      : isStationActive
                      ? '#d97706'
                      : st.color
                  }
                  strokeWidth={2.5}
                  filter={isStationActive ? 'url(#activeGlow)' : undefined}
                  className="transition-all duration-200 group-hover:scale-125"
                />

                {/* Station Inner Dot / Check / Step Num */}
                {isStationPassed ? (
                  <text
                    x={st.x}
                    y={st.y + 3}
                    textAnchor="middle"
                    className="text-[8px] fill-white font-black"
                  >
                    ✓
                  </text>
                ) : (
                  <text
                    x={st.x}
                    y={st.y + 3}
                    textAnchor="middle"
                    className={`text-[8px] font-mono font-black ${
                      isStationActive ? 'fill-slate-950' : 'fill-slate-700 dark:fill-slate-300'
                    }`}
                  >
                    {st.step + 1}
                  </text>
                )}

                {/* Station Title Label */}
                <text
                  x={st.x}
                  y={st.y + (st.y < 60 ? -14 : 22)}
                  textAnchor="middle"
                  className={`text-[9.5px] font-bold ${
                    isStationActive
                      ? 'fill-amber-600 dark:fill-amber-400 font-extrabold'
                      : isStationPassed
                      ? 'fill-emerald-700 dark:fill-emerald-300 font-bold'
                      : 'fill-slate-700 dark:fill-slate-300'
                  } group-hover:fill-blue-600 transition-colors`}
                >
                  {isZh ? st.label : nodeData?.titleEn?.split(' ')[0] || st.sub}
                </text>

                {/* Station Code Subtitle */}
                <text
                  x={st.x}
                  y={st.y + (st.y < 60 ? -24 : 31)}
                  textAnchor="middle"
                  className="text-[7.5px] font-mono fill-slate-400 dark:fill-slate-500"
                >
                  {st.sub}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 3. Bottom Dynamic Stage Status Bar */}
      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-2 truncate">
          {isRunning ? (
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold truncate">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
              <span>
                {tx(
                  `正在执行步骤 ${(currentStep ?? 0) + 1} / 12 · ${liveStep?.title || '沙箱探针采样中'}`,
                  `Executing Step ${(currentStep ?? 0) + 1} / 12: ${liveStep?.title || 'Running...'}`
                )}
              </span>
            </div>
          ) : isCompleted ? (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{tx('演进流水线执行完成 · 12 步节点已闭环', 'Lifecycle pipeline finished successfully.')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>{tx('待机中 · 点击任意站台可调出输入输出契约与架构公式', 'Idle: Click any station to inspect specs.')}</span>
            </div>
          )}
        </div>

        <div className="text-[10px] text-slate-400 font-mono hidden sm:block shrink-0">
          {tx('双轨聚合 · 自动沙箱隔离', 'Dual-track sandbox verified')}
        </div>
      </div>
    </div>
  );
};
