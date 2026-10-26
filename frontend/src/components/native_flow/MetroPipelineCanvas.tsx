import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ArrowRight,
  Zap,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import { FlowNode } from './flowTypes';
import { ComponentCategory, LiveStageStep } from '../../types';
import { CATEGORY_META } from '../studio/categoryMeta';
import { LIFECYCLE_NODES } from './LifecyclePipelineFlow';

interface MetroPipelineCanvasProps {
  selectedNodeId?: string;
  onSelectNode: (node: FlowNode) => void;
  onSelectComponent?: (code: ComponentCategory) => void;
  lang?: 'zh' | 'en';
  mode?: 'parallel' | 'sequential';
  activeStepIndex?: number | null;
  liveStep?: LiveStageStep | null;
}

interface StationLayout {
  nodeId: string;
  stepIndex: number;
  stationNum: string;
  x: number;
  y: number;
  cardPlacement: 'top' | 'bottom';
  stage: 1 | 2 | 3 | 4 | 5;
  color: string;
  accentHexLight: string;
  accentHexDark: string;
  glowHexLight: string;
  glowHexDark: string;
}

const STATIONS: StationLayout[] = [
  // Stage 1: Cold Start & Baseline (Region: x: 40, width: 510)
  {
    nodeId: 's1-task-in',
    stepIndex: 0,
    stationNum: '01',
    x: 130,
    y: 360,
    cardPlacement: 'top',
    stage: 1,
    color: 'sky',
    accentHexLight: '#0284c7',
    accentHexDark: '#38bdf8',
    glowHexLight: 'rgba(2, 132, 199, 0.3)',
    glowHexDark: 'rgba(56, 189, 248, 0.45)',
  },
  {
    nodeId: 's1-prior-lib',
    stepIndex: 1,
    stationNum: '02',
    x: 260,
    y: 360,
    cardPlacement: 'bottom',
    stage: 1,
    color: 'sky',
    accentHexLight: '#0284c7',
    accentHexDark: '#38bdf8',
    glowHexLight: 'rgba(2, 132, 199, 0.3)',
    glowHexDark: 'rgba(56, 189, 248, 0.45)',
  },
  {
    nodeId: 's1-base-roll',
    stepIndex: 2,
    stationNum: '03',
    x: 390,
    y: 360,
    cardPlacement: 'top',
    stage: 1,
    color: 'sky',
    accentHexLight: '#0284c7',
    accentHexDark: '#38bdf8',
    glowHexLight: 'rgba(2, 132, 199, 0.3)',
    glowHexDark: 'rgba(56, 189, 248, 0.45)',
  },

  // Stage 2: Propose & Probe (Fork & Merge) (Region: x: 580, width: 990)
  {
    nodeId: 's2-context-build',
    stepIndex: 3,
    stationNum: '04',
    x: 670,
    y: 360,
    cardPlacement: 'bottom',
    stage: 2,
    color: 'blue',
    accentHexLight: '#2563eb',
    accentHexDark: '#60a5fa',
    glowHexLight: 'rgba(37, 99, 235, 0.3)',
    glowHexDark: 'rgba(96, 165, 250, 0.5)',
  },
  {
    nodeId: 's2-inv-levers',
    stepIndex: 4,
    stationNum: '05',
    x: 930,
    y: 190,
    cardPlacement: 'bottom',
    stage: 2,
    color: 'blue',
    accentHexLight: '#1d4ed8',
    accentHexDark: '#60a5fa',
    glowHexLight: 'rgba(29, 78, 216, 0.3)',
    glowHexDark: 'rgba(96, 165, 250, 0.5)',
  },
  {
    nodeId: 's2-dom-levers',
    stepIndex: 5,
    stationNum: '06',
    x: 930,
    y: 530,
    cardPlacement: 'bottom',
    stage: 2,
    color: 'amber',
    accentHexLight: '#d97706',
    accentHexDark: '#f59e0b',
    glowHexLight: 'rgba(217, 119, 6, 0.3)',
    glowHexDark: 'rgba(245, 158, 11, 0.5)',
  },
  {
    nodeId: 's2-validation-gate',
    stepIndex: 6,
    stationNum: '07',
    x: 1190,
    y: 360,
    cardPlacement: 'bottom',
    stage: 2,
    color: 'indigo',
    accentHexLight: '#4f46e5',
    accentHexDark: '#818cf8',
    glowHexLight: 'rgba(79, 70, 229, 0.3)',
    glowHexDark: 'rgba(129, 140, 248, 0.5)',
  },
  {
    nodeId: 's2-probe-exec',
    stepIndex: 7,
    stationNum: '08',
    x: 1430,
    y: 360,
    cardPlacement: 'top',
    stage: 2,
    color: 'blue',
    accentHexLight: '#2563eb',
    accentHexDark: '#60a5fa',
    glowHexLight: 'rgba(37, 99, 235, 0.3)',
    glowHexDark: 'rgba(96, 165, 250, 0.45)',
  },

  // Stage 3: Composition Engine (Region: x: 1600, width: 280)
  {
    nodeId: 's3-compose-choice',
    stepIndex: 8,
    stationNum: '09',
    x: 1730,
    y: 360,
    cardPlacement: 'top',
    stage: 3,
    color: 'violet',
    accentHexLight: '#7c3aed',
    accentHexDark: '#a855f7',
    glowHexLight: 'rgba(124, 58, 237, 0.3)',
    glowHexDark: 'rgba(168, 85, 247, 0.5)',
  },

  // Stage 4: Zero-GT Blind Selection (Region: x: 1910, width: 280)
  {
    nodeId: 's4-blind-judge',
    stepIndex: 9,
    stationNum: '10',
    x: 2040,
    y: 360,
    cardPlacement: 'bottom',
    stage: 4,
    color: 'emerald',
    accentHexLight: '#059669',
    accentHexDark: '#10b981',
    glowHexLight: 'rgba(5, 150, 105, 0.3)',
    glowHexDark: 'rgba(16, 185, 129, 0.5)',
  },

  // Stage 5: Experience Reflector & Closed Loop (Region: x: 2220, width: 440)
  {
    nodeId: 's5-reflector',
    stepIndex: 10,
    stationNum: '11',
    x: 2330,
    y: 360,
    cardPlacement: 'top',
    stage: 5,
    color: 'purple',
    accentHexLight: '#9333ea',
    accentHexDark: '#c084fc',
    glowHexLight: 'rgba(147, 51, 234, 0.3)',
    glowHexDark: 'rgba(192, 132, 252, 0.5)',
  },
  {
    nodeId: 's5-update-lib',
    stepIndex: 11,
    stationNum: '12',
    x: 2570,
    y: 360,
    cardPlacement: 'bottom',
    stage: 5,
    color: 'purple',
    accentHexLight: '#c026d3',
    accentHexDark: '#e879f9',
    glowHexLight: 'rgba(192, 38, 211, 0.3)',
    glowHexDark: 'rgba(232, 121, 249, 0.5)',
  },
];

interface StageMeta {
  stage: 1 | 2 | 3 | 4 | 5;
  firstNodeId: string;
  stationRange: string;
  x: number;
  y: number;
  titleZh: string;
  titleEn: string;
  subtitleZh: string;
  subtitleEn: string;
  badge: string;
  tagsZh: string;
  tagsEn: string;
  colorHexLight: string;
  colorHexDark: string;
  glowHex: string;
}

const STAGE_METAS: StageMeta[] = [
  {
    stage: 1,
    firstNodeId: 's1-task-in',
    stationRange: '01~03',
    x: 55,
    y: 92,
    titleZh: '阶段 1 · 任务接入与基线采样',
    titleEn: 'Stage 1 · Baseline',
    subtitleZh: '规格接缝隔离 · 先验冷启动',
    subtitleEn: 'Spec Seam & Cold Start',
    badge: '01',
    tagsZh: 'c9 隔离 · c3 先验',
    tagsEn: 'c9 Seam · c3 Prior',
    colorHexLight: '#0284c7',
    colorHexDark: '#38bdf8',
    glowHex: 'rgba(56, 189, 248, 0.45)',
  },
  {
    stage: 2,
    firstNodeId: 's2-context-build',
    stationRange: '04~08',
    x: 595,
    y: 92,
    titleZh: '阶段 2 · 任务级递归：提议与双轴探针',
    titleEn: 'Stage 2 · Propose–Probe Recursion',
    subtitleZh: 'INV 不变性 vs DOM 领域轴并行试跑与门控校验',
    subtitleEn: 'INV vs DOM Dual-Lever Probing & Gate',
    badge: '02',
    tagsZh: 'c1/c2/c4 (INV) · c5~c8 (DOM)',
    tagsEn: 'c1/c2/c4 (INV) · c5~c8 (DOM)',
    colorHexLight: '#2563eb',
    colorHexDark: '#60a5fa',
    glowHex: 'rgba(96, 165, 250, 0.45)',
  },
  {
    stage: 3,
    firstNodeId: 's3-compose-choice',
    stationRange: '09',
    x: 1615,
    y: 92,
    titleZh: '阶段 3 · 多路组合融合',
    titleEn: 'Stage 3 · Compose',
    subtitleZh: '最优子结构选择与精炼',
    subtitleEn: 'Sub-structure Synthesis',
    badge: '03',
    tagsZh: 'agg 并行 / seq 串行',
    tagsEn: 'agg Parallel / seq Serial',
    colorHexLight: '#7c3aed',
    colorHexDark: '#a855f7',
    glowHex: 'rgba(168, 85, 247, 0.45)',
  },
  {
    stage: 4,
    firstNodeId: 's4-blind-judge',
    stationRange: '10',
    x: 1925,
    y: 92,
    titleZh: '阶段 4 · 0-GT 盲审裁决',
    titleEn: 'Stage 4 · Blind Gate',
    subtitleZh: '零真实标签双盲无监督裁判',
    subtitleEn: 'Zero-GT Cross Judge',
    badge: '04',
    tagsZh: '双盲裁判 · 防过拟合',
    tagsEn: 'Double-blind · Robust',
    colorHexLight: '#059669',
    colorHexDark: '#34d399',
    glowHex: 'rgba(52, 211, 153, 0.45)',
  },
  {
    stage: 5,
    firstNodeId: 's5-reflector',
    stationRange: '11~12',
    x: 2235,
    y: 92,
    titleZh: '阶段 5 · 套件级递归反思闭环',
    titleEn: 'Stage 5 · Harness Reflection',
    subtitleZh: '经验三元组回写 INDEX.md · ⟲ S1 先验',
    subtitleEn: 'Updates INDEX.md · ⟲ S1 Prior',
    badge: '05',
    tagsZh: '跨任务知识持续自增殖',
    tagsEn: 'Closed-loop Feedback',
    colorHexLight: '#c026d3',
    colorHexDark: '#e879f9',
    glowHex: 'rgba(232, 121, 249, 0.45)',
  },
];

const CANVAS_WIDTH = 2700;
const CANVAS_HEIGHT = 740;

export const MetroPipelineCanvas: React.FC<MetroPipelineCanvasProps> = ({
  selectedNodeId,
  onSelectNode,
  onSelectComponent,
  lang = 'zh',
  mode = 'parallel',
  activeStepIndex = null,
  liveStep = null,
}) => {
  const isZh = lang === 'zh';
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamic Theme state tracker
  const [isDark, setIsDark] = useState<boolean>(() => {
    return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          checkTheme();
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Pan & Zoom state
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Fit canvas to container on mount
  const handleFit = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight || 660;
    const scaleX = containerWidth / CANVAS_WIDTH;
    const scaleY = containerHeight / CANVAS_HEIGHT;
    // Fit to width and height nicely with 2% margin to ensure no edge clipping
    const scale = Math.min(Math.max(Math.min(scaleX, scaleY) * 0.98, 0.35), 1.15);
    setZoom(scale);
    const initialPanX = Math.max((containerWidth - CANVAS_WIDTH * scale) / 2, 0);
    const initialPanY = Math.max((containerHeight - CANVAS_HEIGHT * scale) / 2, 0);
    setPan({ x: initialPanX, y: initialPanY });
  }, []);

  useEffect(() => {
    handleFit();
    window.addEventListener('resize', handleFit);
    return () => window.removeEventListener('resize', handleFit);
  }, [handleFit]);

  // Auto-follow active step during walkthrough or live execution
  useEffect(() => {
    const targetIndex = liveStep?.status === 'active' ? liveStep.stepIndex : activeStepIndex;
    if (targetIndex === null || targetIndex === undefined || !containerRef.current) return;
    const targetStation = STATIONS.find((s) => s.stepIndex === targetIndex);
    if (!targetStation) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight || 640;
    const targetPanX = containerWidth / 2 - targetStation.x * zoom;
    const targetPanY = containerHeight / 2 - targetStation.y * zoom;
    setPan({
      x: targetPanX,
      y: targetPanY,
    });
  }, [liveStep?.stepIndex, liveStep?.status, activeStepIndex, zoom]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getNode = (id: string) => LIFECYCLE_NODES.find((n) => n.id === id)!;

  return (
    <div className="relative w-full rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/90 shadow-xl dark:shadow-2xl overflow-hidden select-none bg-tech-grid transition-colors duration-300">
      {/* Ambient Vignette Overlay */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
          isDark
            ? 'bg-[radial-gradient(ellipse_100%_100%_at_50%_50%,rgba(15,23,42,0.4),rgba(2,6,23,0.95))]'
            : 'bg-[radial-gradient(ellipse_100%_100%_at_50%_50%,rgba(241,245,249,0.3),rgba(248,250,252,0.85))]'
        }`}
      />

      {/* 1. INTEGRATED CANVAS TITLEBAR (Non-overlapping, Physical Header Bar) */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md">
        {/* Left: Viewport Controls Group */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 pr-2.5 border-r border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>{isZh ? '全景管线拓扑' : 'Metro Pipeline'}</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <button
              onClick={() => setZoom((prev) => Math.min(prev + 0.1, 1.6))}
              className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title={isZh ? '放大画布' : 'Zoom In'}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-xs text-slate-700 dark:text-slate-300 px-1 min-w-[2.8rem] text-center font-semibold">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((prev) => Math.max(prev - 0.1, 0.35))}
              className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title={isZh ? '缩小画布' : 'Zoom Out'}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 mx-0.5" />
            <button
              onClick={handleFit}
              className="flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title={isZh ? '自适应居中' : 'Fit to Screen'}
            >
              <Maximize2 className="w-3 h-3" />
              <span>{isZh ? '自适应' : 'Fit'}</span>
            </button>
          </div>
        </div>

        {/* Right: High-Tech Track Indicator Legend (Docked in Titlebar) */}
        <div className="flex items-center gap-3.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">INV 不变性轨 (c1, c2, c4)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">DOM 领域轨 (c5~c8)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7] animate-pulse" />
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">⟲ S5 闭环反馈</span>
          </span>
        </div>
      </div>

      {/* 2. MAIN INTERACTIVE SVG METRO CANVAS */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`w-full h-[660px] cursor-${
          isDragging ? 'grabbing' : 'grab'
        } overflow-hidden relative`}
      >
        <div
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="relative"
        >
          {/* SVG TRACKS LAYER */}
          <svg
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="absolute inset-0 pointer-events-none"
          >
            <defs>
              {/* Neon Glow Filters */}
              <filter id="metroGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur1" />
                <feGaussianBlur stdDeviation="8" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Light Mode Physical Conduit Groove Shadow */}
              <filter id="conduitGroove" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#64748b" floodOpacity="0.25" />
              </filter>

              {/* Loop Gradient (S5 ➔ S1) */}
              <linearGradient id="loopGradient" x1="1" y1="0" x2="0" y2="0">
                <stop offset="0%" stopColor={isDark ? '#c084fc' : '#9333ea'} />
                <stop offset="50%" stopColor={isDark ? '#818cf8' : '#4f46e5'} />
                <stop offset="100%" stopColor={isDark ? '#38bdf8' : '#0284c7'} />
              </linearGradient>

              {/* Main Line Spine Gradient */}
              <linearGradient id="mainSpineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={isDark ? '#0ea5e9' : '#0284c7'} />
                <stop offset="25%" stopColor={isDark ? '#3b82f6' : '#2563eb'} />
                <stop offset="55%" stopColor={isDark ? '#818cf8' : '#4f46e5'} />
                <stop offset="75%" stopColor={isDark ? '#10b981' : '#059669'} />
                <stop offset="100%" stopColor={isDark ? '#c084fc' : '#9333ea'} />
              </linearGradient>
            </defs>

            {/* STAGE AMBIENT REGION BACKDROPS (Standardized Top Line y=80, height=580) */}
            {/* Stage 1 Region */}
            <rect
              x="40"
              y="80"
              width="510"
              height="580"
              rx="24"
              fill="#0ea5e9"
              fillOpacity={isDark ? '0.04' : '0.06'}
              stroke="#0ea5e9"
              strokeOpacity={isDark ? '0.25' : '0.35'}
              strokeDasharray="4 4"
            />

            {/* Stage 2 Region (Dual Levers) */}
            <rect
              x="580"
              y="80"
              width="990"
              height="580"
              rx="24"
              fill="#3b82f6"
              fillOpacity={isDark ? '0.04' : '0.05'}
              stroke="#3b82f6"
              strokeOpacity={isDark ? '0.25' : '0.35'}
              strokeDasharray="4 4"
            />

            {/* Stage 3 Region */}
            <rect
              x="1600"
              y="80"
              width="280"
              height="580"
              rx="24"
              fill="#8b5cf6"
              fillOpacity={isDark ? '0.04' : '0.06'}
              stroke="#8b5cf6"
              strokeOpacity={isDark ? '0.25' : '0.35'}
              strokeDasharray="4 4"
            />

            {/* Stage 4 Region */}
            <rect
              x="1910"
              y="80"
              width="280"
              height="580"
              rx="24"
              fill="#10b981"
              fillOpacity={isDark ? '0.04' : '0.06'}
              stroke="#10b981"
              strokeOpacity={isDark ? '0.25' : '0.35'}
              strokeDasharray="4 4"
            />

            {/* Stage 5 Region */}
            <rect
              x="2220"
              y="80"
              width="440"
              height="580"
              rx="24"
              fill="#c084fc"
              fillOpacity={isDark ? '0.04' : '0.06'}
              stroke="#c084fc"
              strokeOpacity={isDark ? '0.25' : '0.35'}
              strokeDasharray="4 4"
            />

            {/* ========================================================
                TRACK 1: MAIN SPINE TRACK (S1 to S2 fork)
                ======================================================== */}
            {/* Conduit Base Groove */}
            <line
              x1="130"
              y1="360"
              x2="670"
              y2="360"
              stroke={isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0'}
              strokeWidth={isDark ? '12' : '10'}
              strokeLinecap="round"
              filter={isDark ? undefined : 'url(#conduitGroove)'}
            />
            {/* Outer Glow */}
            <line
              x1="130"
              y1="360"
              x2="670"
              y2="360"
              stroke={isDark ? '#0284c7' : '#38bdf8'}
              strokeWidth="8"
              strokeOpacity={isDark ? '0.3' : '0.2'}
              strokeLinecap="round"
              filter="url(#metroGlow)"
            />
            {/* Structural Rail */}
            <line
              x1="130"
              y1="360"
              x2="670"
              y2="360"
              stroke={isDark ? '#38bdf8' : '#0284c7'}
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Dynamic Energy Beads (High Contrast Light/Dark) */}
            <line
              x1="130"
              y1="360"
              x2="670"
              y2="360"
              stroke={isDark ? '#ffffff' : '#0369a1'}
              strokeWidth={isDark ? '3.5' : '4'}
              strokeDasharray="7 13"
              className="animate-flow-dash"
            />

            {/* ========================================================
                TRACK 2: STAGE 2 FORK INTO INV (UPPER) & DOM (LOWER)
                ======================================================== */}
            {/* Upper INV Conduit Base Groove */}
            <path
              d="M 670 360 C 770 360, 810 190, 930 190"
              fill="none"
              stroke={isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0'}
              strokeWidth={isDark ? '12' : '10'}
              strokeLinecap="round"
              filter={isDark ? undefined : 'url(#conduitGroove)'}
            />
            {/* Upper INV Rail Curve: (670, 360) ➔ (930, 190) */}
            <path
              d="M 670 360 C 770 360, 810 190, 930 190"
              fill="none"
              stroke={isDark ? '#3b82f6' : '#60a5fa'}
              strokeWidth="8"
              strokeOpacity={isDark ? '0.3' : '0.2'}
              strokeLinecap="round"
              filter="url(#metroGlow)"
            />
            <path
              d="M 670 360 C 770 360, 810 190, 930 190"
              fill="none"
              stroke={isDark ? '#60a5fa' : '#2563eb'}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M 670 360 C 770 360, 810 190, 930 190"
              fill="none"
              stroke={isDark ? '#ffffff' : '#1d4ed8'}
              strokeWidth={isDark ? '3.5' : '4'}
              strokeDasharray="7 13"
              className="animate-flow-dash"
            />

            {/* Lower DOM Conduit Base Groove */}
            <path
              d="M 670 360 C 770 360, 810 530, 930 530"
              fill="none"
              stroke={isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0'}
              strokeWidth={isDark ? '12' : '10'}
              strokeLinecap="round"
              filter={isDark ? undefined : 'url(#conduitGroove)'}
            />
            {/* Lower DOM Rail Curve: (670, 360) ➔ (930, 530) */}
            <path
              d="M 670 360 C 770 360, 810 530, 930 530"
              fill="none"
              stroke={isDark ? '#f59e0b' : '#fbbf24'}
              strokeWidth="8"
              strokeOpacity={isDark ? '0.3' : '0.2'}
              strokeLinecap="round"
              filter="url(#metroGlow)"
            />
            <path
              d="M 670 360 C 770 360, 810 530, 930 530"
              fill="none"
              stroke={isDark ? '#fbbf24' : '#d97706'}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M 670 360 C 770 360, 810 530, 930 530"
              fill="none"
              stroke={isDark ? '#ffffff' : '#b45309'}
              strokeWidth={isDark ? '3.5' : '4'}
              strokeDasharray="7 13"
              className="animate-flow-dash"
            />

            {/* ========================================================
                TRACK 3: CONVERGE FROM INV & DOM INTO VALIDATION GATE
                ======================================================== */}
            {/* INV convergence Groove */}
            <path
              d="M 930 190 C 1050 190, 1090 360, 1190 360"
              fill="none"
              stroke={isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0'}
              strokeWidth={isDark ? '12' : '10'}
              strokeLinecap="round"
              filter={isDark ? undefined : 'url(#conduitGroove)'}
            />
            <path
              d="M 930 190 C 1050 190, 1090 360, 1190 360"
              fill="none"
              stroke={isDark ? '#3b82f6' : '#60a5fa'}
              strokeWidth="8"
              strokeOpacity={isDark ? '0.3' : '0.2'}
              strokeLinecap="round"
              filter="url(#metroGlow)"
            />
            <path
              d="M 930 190 C 1050 190, 1090 360, 1190 360"
              fill="none"
              stroke={isDark ? '#60a5fa' : '#2563eb'}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M 930 190 C 1050 190, 1090 360, 1190 360"
              fill="none"
              stroke={isDark ? '#ffffff' : '#1d4ed8'}
              strokeWidth={isDark ? '3.5' : '4'}
              strokeDasharray="7 13"
              className="animate-flow-dash"
            />

            {/* DOM convergence Groove */}
            <path
              d="M 930 530 C 1050 530, 1090 360, 1190 360"
              fill="none"
              stroke={isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0'}
              strokeWidth={isDark ? '12' : '10'}
              strokeLinecap="round"
              filter={isDark ? undefined : 'url(#conduitGroove)'}
            />
            <path
              d="M 930 530 C 1050 530, 1090 360, 1190 360"
              fill="none"
              stroke={isDark ? '#f59e0b' : '#fbbf24'}
              strokeWidth="8"
              strokeOpacity={isDark ? '0.3' : '0.2'}
              strokeLinecap="round"
              filter="url(#metroGlow)"
            />
            <path
              d="M 930 530 C 1050 530, 1090 360, 1190 360"
              fill="none"
              stroke={isDark ? '#fbbf24' : '#d97706'}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M 930 530 C 1050 530, 1090 360, 1190 360"
              fill="none"
              stroke={isDark ? '#ffffff' : '#b45309'}
              strokeWidth={isDark ? '3.5' : '4'}
              strokeDasharray="7 13"
              className="animate-flow-dash"
            />

            {/* ========================================================
                TRACK 4: S2 MERGE TO S3, S4, S5 (MAIN SPINE)
                ======================================================== */}
            {/* Main Spine Base Groove */}
            <line
              x1="1190"
              y1="360"
              x2="2570"
              y2="360"
              stroke={isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0'}
              strokeWidth={isDark ? '12' : '10'}
              strokeLinecap="round"
              filter={isDark ? undefined : 'url(#conduitGroove)'}
            />
            <line
              x1="1190"
              y1="360"
              x2="2570"
              y2="360"
              stroke="url(#mainSpineGradient)"
              strokeWidth="8"
              strokeOpacity={isDark ? '0.3' : '0.2'}
              strokeLinecap="round"
              filter="url(#metroGlow)"
            />
            <line
              x1="1190"
              y1="360"
              x2="2570"
              y2="360"
              stroke="url(#mainSpineGradient)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <line
              x1="1190"
              y1="360"
              x2="2570"
              y2="360"
              stroke={isDark ? '#ffffff' : '#4338ca'}
              strokeWidth={isDark ? '3.5' : '4'}
              strokeDasharray="7 13"
              className="animate-flow-dash"
            />

            {/* ========================================================
                TRACK 5: TOP OVERHEAD RETURN LOOP (S5 ➔ S1)
                ======================================================== */}
            {/* Loop Base Groove */}
            <path
              d="M 2570 360 C 2640 290, 2640 60, 2530 60 L 340 60 C 260 60, 260 160, 260 360"
              fill="none"
              stroke={isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0'}
              strokeWidth={isDark ? '12' : '10'}
              strokeLinecap="round"
              filter={isDark ? undefined : 'url(#conduitGroove)'}
            />
            {/* Glow Path */}
            <path
              d="M 2570 360 C 2640 290, 2640 60, 2530 60 L 340 60 C 260 60, 260 160, 260 360"
              fill="none"
              stroke="url(#loopGradient)"
              strokeWidth="10"
              strokeOpacity={isDark ? '0.3' : '0.2'}
              strokeLinecap="round"
              filter="url(#metroGlow)"
            />
            {/* Structural Arc */}
            <path
              d="M 2570 360 C 2640 290, 2640 60, 2530 60 L 340 60 C 260 60, 260 160, 260 360"
              fill="none"
              stroke="url(#loopGradient)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Reverse Flow Dash Particles */}
            <path
              d="M 2570 360 C 2640 290, 2640 60, 2530 60 L 340 60 C 260 60, 260 160, 260 360"
              fill="none"
              stroke={isDark ? '#ffffff' : '#7e22ce'}
              strokeWidth={isDark ? '3' : '3.5'}
              strokeDasharray="8 12"
              className="animate-flow-dash-reverse"
            />

            {/* Closed Loop Badge in the Center of Arc */}
            <g transform="translate(1415, 60)">
              <rect
                x="-160"
                y="-19"
                width="320"
                height="38"
                rx="19"
                fill={isDark ? '#0f172a' : '#ffffff'}
                stroke={isDark ? '#c084fc' : '#9333ea'}
                strokeWidth={isDark ? '1.8' : '2'}
                filter="url(#metroGlow)"
              />
              <circle cx="-135" cy="0" r="5" fill={isDark ? '#e879f9' : '#a855f7'} className="animate-ping" />
              <circle cx="-135" cy="0" r="4" fill={isDark ? '#c084fc' : '#9333ea'} />
              <text
                x="-112"
                y="5"
                fill={isDark ? '#f8fafc' : '#1e1b4b'}
                fontSize="12"
                fontWeight="800"
                fontFamily="sans-serif"
                letterSpacing="0.5px"
              >
                {isZh
                  ? '⟲ 跨任务经验闭环 (S5 反思 ➔ S1 先验)'
                  : '⟲ Closed-Loop Feedforward (S5 ➔ S1)'}
              </text>
            </g>
          </svg>

          {/* STAGE HEADER BADGES (Glassmorphism 2.0 Elevated Headers, Non-colliding z-20) */}
          {STAGE_METAS.map((stageMeta) => {
            const isStageActive =
              (activeStepIndex !== null &&
                STATIONS.some((s) => s.stage === stageMeta.stage && s.stepIndex === activeStepIndex)) ||
              (liveStep &&
                liveStep.status === 'active' &&
                STATIONS.some((s) => s.stage === stageMeta.stage && s.stepIndex === liveStep.stepIndex));
            const colorHex = isDark ? stageMeta.colorHexDark : stageMeta.colorHexLight;
            const targetNode = getNode(stageMeta.firstNodeId);

            return (
              <div
                key={stageMeta.stage}
                onClick={() => onSelectNode(targetNode)}
                style={{
                  left: stageMeta.x,
                  top: stageMeta.y,
                  borderColor: isStageActive
                    ? colorHex
                    : isDark
                    ? 'rgba(51, 65, 85, 0.7)'
                    : 'rgba(226, 232, 240, 0.9)',
                  boxShadow: isStageActive
                    ? `0 0 24px ${stageMeta.glowHex}, 0 4px 12px rgba(0, 0, 0, 0.25)`
                    : isDark
                    ? '0 4px 12px rgba(0, 0, 0, 0.3)'
                    : '0 2px 8px rgba(100, 116, 139, 0.08)',
                }}
                className={`absolute z-20 w-fit max-w-[calc(100%-1rem)] px-3.5 py-2 rounded-xl cursor-pointer transition-all duration-300 group backdrop-blur-md select-none ${
                  isStageActive
                    ? 'bg-white/95 dark:bg-slate-900/95 ring-2 scale-102'
                    : 'bg-white/85 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-500 hover:scale-102'
                } border`}
                title={isZh ? `点击聚焦 ${stageMeta.titleZh} 节点` : `Click to focus ${stageMeta.titleEn}`}
              >
                {/* Line 1: Badge Number + Full Stage Title */}
                <div className="flex items-center gap-2">
                  <span
                    className="font-mono font-black text-[11px] px-1.5 py-0.5 rounded-md border shrink-0 transition-transform group-hover:scale-110 shadow-sm"
                    style={{
                      color: colorHex,
                      borderColor: `${colorHex}50`,
                      backgroundColor: `${colorHex}18`,
                    }}
                  >
                    {stageMeta.badge}
                  </span>
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white whitespace-nowrap group-hover:text-blue-600 dark:group-hover:text-cyan-300 transition-colors">
                    {isZh ? stageMeta.titleZh : stageMeta.titleEn}
                  </span>
                </div>

                {/* Line 2: Mechanism Subtitle + Component Tag Pills (Inside the Card Box, never overflowing!) */}
                <div className="flex items-center justify-between gap-3 mt-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight whitespace-nowrap">
                    {isZh ? stageMeta.subtitleZh : stageMeta.subtitleEn}
                  </span>
                  {stageMeta.tagsZh && (
                    <span
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold border shrink-0 whitespace-nowrap"
                      style={{
                        color: colorHex,
                        borderColor: `${colorHex}35`,
                        backgroundColor: `${colorHex}12`,
                      }}
                    >
                      {isZh ? stageMeta.tagsZh : stageMeta.tagsEn}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* STATION NODES & CAPSULE CARDS */}
          {STATIONS.map((station) => {
            const node = getNode(station.nodeId);
            const isSelected = selectedNodeId === station.nodeId;
            const isCurrentWalkthrough = activeStepIndex === station.stepIndex;
            const isLiveActive = liveStep && liveStep.status === 'active' && liveStep.stepIndex === station.stepIndex;
            const isLiveCompleted = liveStep && (
              liveStep.status === 'completed' || liveStep.stepIndex > station.stepIndex
            );
            const isPendingFuture = liveStep && liveStep.status === 'active' && liveStep.stepIndex < station.stepIndex;
            const Icon = node.icon;

            const accentHex = isDark ? station.accentHexDark : station.accentHexLight;
            const glowHex = isDark ? station.glowHexDark : station.glowHexLight;

            const isTop = station.cardPlacement === 'top';

            return (
              <div key={station.nodeId} className="absolute" style={{ left: station.x, top: station.y }}>
                {/* 1. Metro Station Three-Layer Pulsing Energy Hub */}
                <div
                  onClick={() => onSelectNode(node)}
                  className="relative -left-5 -top-5 w-10 h-10 flex items-center justify-center cursor-pointer group/hub z-20"
                  title={isZh ? `点击查看 ${node.titleZh} (站点 ${station.stationNum})` : `Click to inspect ${node.titleEn} (Station ${station.stationNum})`}
                >
                  {/* Layer A: Ground glow halo ring */}
                  <div
                    className={`absolute inset-0 rounded-full transition-all duration-300 ${
                      isLiveActive
                        ? 'animate-energy-halo opacity-100 scale-135'
                        : isLiveCompleted
                        ? 'opacity-80 scale-110'
                        : isCurrentWalkthrough
                        ? 'animate-energy-halo opacity-100'
                        : isSelected
                        ? 'opacity-80 scale-125'
                        : 'opacity-0 group-hover/hub:opacity-60 scale-110'
                    }`}
                    style={{
                      backgroundColor: isLiveActive ? '#f59e0b' : isLiveCompleted ? '#10b981' : glowHex,
                      filter: 'blur(6px)',
                    }}
                  />

                  {/* Layer B: Structural hub ring */}
                  <div
                    className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 border ${
                      isLiveActive
                        ? 'bg-amber-500 text-white shadow-[0_0_25px_#f59e0b] scale-125 border-amber-300 animate-pulse'
                        : isLiveCompleted
                        ? 'bg-emerald-600 text-white shadow-[0_0_15px_#10b981] scale-110 border-emerald-400'
                        : isCurrentWalkthrough
                        ? 'bg-blue-600 text-white shadow-[0_0_20px_#3b82f6] scale-115 border-blue-400'
                        : isSelected
                        ? 'bg-white dark:bg-slate-900 border-cyan-500 shadow-[0_0_15px_#0ea5e9] scale-110'
                        : isPendingFuture
                        ? 'bg-white/60 dark:bg-slate-900/60 border-slate-300 dark:border-slate-700 opacity-60'
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 hover:border-slate-900 dark:hover:border-slate-300 hover:scale-110 shadow-sm'
                    }`}
                  >
                    {/* Layer C: Center Core Station Number or Completion Icon */}
                    {isLiveCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : (
                      <span
                        className={`font-mono font-black text-[11px] ${
                          isLiveActive || isCurrentWalkthrough
                            ? 'text-white font-extrabold'
                            : isSelected
                            ? 'text-cyan-600 dark:text-cyan-400 font-bold'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {station.stationNum}
                      </span>
                    )}
                  </div>
                </div>

                {/* Vertical Stem Line from rail hub to card */}
                <div
                  className={`absolute left-0 w-0.5 pointer-events-none transition-all duration-300 ${
                    isLiveActive
                      ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]'
                      : isLiveCompleted
                      ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                      : isCurrentWalkthrough
                      ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]'
                      : isSelected
                      ? 'bg-cyan-500 shadow-[0_0_8px_#0ea5e9]'
                      : 'bg-slate-400 dark:bg-slate-700/80'
                  }`}
                  style={{
                    top: isTop ? -28 : 0,
                    height: 28,
                  }}
                />

                {/* 2. Glassmorphism 2.0 Station Capsule Card (Light & Dark Adaptive, w-60 240px, Bottom-Anchored for Top Cards) */}
                <div
                  onClick={() => onSelectNode(node)}
                  style={{
                    transform: isTop ? 'translate(-50%, calc(-100% - 28px))' : 'translate(-50%, 28px)',
                    boxShadow: isLiveActive
                      ? '0 0 28px rgba(245, 158, 11, 0.4)'
                      : isLiveCompleted
                      ? '0 0 16px rgba(16, 185, 129, 0.25)'
                      : isCurrentWalkthrough
                      ? `0 0 28px ${glowHex}`
                      : isSelected
                      ? `0 0 20px ${glowHex}`
                      : isDark
                      ? '0 10px 25px -5px rgba(0, 0, 0, 0.4)'
                      : '0 10px 25px -5px rgba(100, 116, 139, 0.15)',
                  }}
                  className={`absolute w-60 p-3.5 rounded-2xl cursor-pointer transition-all duration-300 group ${
                    isLiveActive
                      ? 'bg-white/95 dark:bg-slate-900/95 ring-2 ring-amber-500 dark:ring-amber-400 border border-amber-500 shadow-xl scale-105 z-30'
                      : isLiveCompleted
                      ? 'bg-white/95 dark:bg-slate-900/95 ring-1 ring-emerald-500/50 dark:ring-emerald-500/40 border border-emerald-500/40 z-15'
                      : isCurrentWalkthrough
                      ? 'bg-white/95 dark:bg-slate-900/95 ring-2 ring-blue-500 dark:ring-blue-400 border border-blue-500/80 dark:border-blue-400/80 scale-105 z-30'
                      : isSelected
                      ? 'bg-white/95 dark:bg-slate-900/95 ring-2 ring-cyan-500 dark:ring-cyan-400 border border-cyan-500/80 dark:border-cyan-400/80 scale-102 z-20'
                      : isPendingFuture
                      ? 'bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60 opacity-60 z-10'
                      : 'bg-white/90 dark:bg-slate-900/85 hover:bg-white dark:hover:bg-slate-900 border border-slate-200/90 dark:border-slate-700/80 hover:border-slate-400 dark:hover:border-slate-500 hover:-translate-y-1 z-10'
                  } backdrop-blur-xl`}
                >
                  {/* Subtle Inner Accent Glow Top Border */}
                  <div
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: isLiveActive ? '#f59e0b' : isLiveCompleted ? '#10b981' : accentHex }}
                  />

                  {/* Active / Completed Badges */}
                  {isLiveActive ? (
                    <div className="absolute -top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500 text-white shadow-lg animate-pulse flex items-center gap-1">
                      <Activity className="w-2.5 h-2.5 animate-spin" />
                      <span>{isZh ? '正在执行' : 'Live Rollout'}</span>
                    </div>
                  ) : isLiveCompleted ? (
                    <div className="absolute -top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-600 text-white shadow-md flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>{isZh ? '已完成' : 'Done'}</span>
                    </div>
                  ) : isCurrentWalkthrough ? (
                    <div className="absolute -top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-600 text-white shadow-lg animate-bounce flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      <span>{isZh ? '正在演示' : 'Active'}</span>
                    </div>
                  ) : null}

                  {/* Header Row: Station Number Badge + Icon + Main Title (Full Wrap, No Truncate) + Badge */}
                  <div className="flex items-start justify-between gap-1.5 mb-1.5">
                    <div className="flex items-start gap-1.5 min-w-0 flex-1">
                      <span
                        className="font-mono font-black text-[10px] px-1.5 py-0.5 rounded-md border shrink-0 mt-0.5 transition-transform group-hover:scale-105 shadow-xs"
                        style={{
                          color: accentHex,
                          borderColor: `${accentHex}40`,
                          backgroundColor: `${accentHex}15`,
                        }}
                        title={isZh ? `站点序号 ${station.stationNum}` : `Station ${station.stationNum}`}
                      >
                        {station.stationNum}
                      </span>
                      <div
                        className="p-1.5 rounded-lg shrink-0 mt-0.5 transition-transform group-hover:scale-110"
                        style={{
                          color: accentHex,
                          backgroundColor: `${accentHex}20`,
                        }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-xs text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-cyan-300 transition-colors block">
                          {isZh ? node.titleZh : node.titleEn}
                        </span>
                      </div>
                    </div>

                    {node.badge && (
                      <span
                        className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border shrink-0 mt-0.5"
                        style={{
                          color: accentHex,
                          borderColor: `${accentHex}40`,
                          backgroundColor: `${accentHex}15`,
                        }}
                      >
                        {node.badge}
                      </span>
                    )}
                  </div>

                  {/* Subtitle / Key Mechanism Tag (Graceful Wrap) */}
                  {(node.subtitleZh || node.subtitleEn) && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mb-2">
                      {isZh ? node.subtitleZh : node.subtitleEn}
                    </p>
                  )}

                  {/* Embedded Harness Component Chips (c1 ~ c9) */}
                  {node.componentCodes && node.componentCodes.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap pt-1.5 border-t border-slate-100 dark:border-slate-800/90">
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
                              } else {
                                onSelectNode(node);
                              }
                            }}
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition-all hover:scale-105 cursor-pointer ${meta.bgLight} ${meta.border} ${meta.color}`}
                            title={isZh ? `点击查看套件 ${code} (${meta.cnName})` : `Inspect ${code}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                            <span>{code}</span>
                            <span className="text-[8px] opacity-80">{meta.cnName}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Mode badge for Stage 3 Compose */}
                  {node.id === 's3-compose-choice' && (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/90 text-[9px] font-mono text-purple-700 dark:text-violet-400 flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">运行模式:</span>
                      <span className="bg-purple-50 dark:bg-violet-950/80 px-1.5 py-0.5 rounded border border-purple-200 dark:border-violet-700/60 font-bold flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5 text-purple-600 dark:text-violet-400" />
                        <span>{mode === 'parallel' ? 'agg 并行融合' : 'seq 串行精炼'}</span>
                      </span>
                    </div>
                  )}

                  {/* Inspection Link Bar */}
                  <div className="mt-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    <span className="truncate max-w-[130px] opacity-85">{node.code || `S${station.stage}`}</span>
                    <span className="flex items-center gap-0.5 text-blue-600 dark:text-cyan-400 font-sans font-semibold group-hover:translate-x-1 transition-transform">
                      <span>{isZh ? '技术详情' : 'Inspect'}</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MetroPipelineCanvas;
