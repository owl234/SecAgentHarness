import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Activity,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  GitBranch,
  Shield,
  Info,
} from 'lucide-react';
import { RunItem, SystemStatus, NavTabType, ComponentCategory, LiveStageStep } from '../types';
import { useLang } from '../i18n/LangContext';
import { FlowNode } from './native_flow/flowTypes';
import { LIFECYCLE_NODES } from './native_flow/LifecyclePipelineFlow';
import { MetroPipelineCanvas } from './native_flow/MetroPipelineCanvas';
import { NodeDetailDrawer } from './native_flow/NodeDetailDrawer';

interface OverviewViewProps {
  runs?: RunItem[];
  selectedRunId?: string;
  onSelectRunId?: (id: string) => void;
  systemStatus?: SystemStatus | null;
  liveStep?: LiveStageStep | null;
  onNavigateToTab?: (tab: NavTabType, runId?: string, taskId?: string) => void;
  onOpenConsole?: () => void;
}

const TOTAL_STEPS = 12;

export const OverviewView: React.FC<OverviewViewProps> = ({
  runs = [],
  selectedRunId,
  systemStatus,
  liveStep = null,
  onNavigateToTab,
  onOpenConsole,
}) => {
  const { lang } = useLang();
  const isZh = lang === 'zh';

  // Selection states for drawer
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [selectedComponentCode, setSelectedComponentCode] = useState<ComponentCategory | null>(null);

  // Pipeline mode: parallel agg vs sequential seq
  const [pipelineMode, setPipelineMode] = useState<'parallel' | 'sequential'>('parallel');

  // Walkthrough interactive tour state
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);

  // Popover state for architecture info
  const [showInfoPopover, setShowInfoPopover] = useState(false);

  // Find telemetry of currently selected run if available
  const currentRun = runs.find((r) => r.id === selectedRunId);
  const telemetryData = currentRun
    ? {
        domain: currentRun.domain || 'general',
        stageCount: currentRun.task_count || 1,
        chosenLabel: currentRun.modes?.[0] || 'base',
        hasExperience: true,
      }
    : undefined;

  // Auto-play timer loop
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setActiveStepIndex((prev) => {
          if (prev === null) return 0;
          if (prev >= TOTAL_STEPS - 1) {
            return 0; // loop back to start
          }
          return prev + 1;
        });
      }, 3500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying]);

  // Keep selected node synchronized during walkthrough
  useEffect(() => {
    if (activeStepIndex !== null && isPlaying) {
      const stepNode = LIFECYCLE_NODES.find((n) => n.stepIndex === activeStepIndex);
      if (stepNode) {
        setSelectedNode(stepNode);
        setSelectedComponentCode(null);
      }
    }
  }, [activeStepIndex, isPlaying]);

  // Keyboard navigation & ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowInfoPopover(false);
        if (selectedNode || selectedComponentCode) {
          setSelectedNode(null);
          setSelectedComponentCode(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, selectedComponentCode]);

  const handleStartTour = () => {
    if (activeStepIndex === null) {
      setActiveStepIndex(0);
    }
    setIsPlaying(true);
  };

  const handlePauseTour = () => {
    setIsPlaying(false);
  };

  const handleNextStep = () => {
    setIsPlaying(false);
    setActiveStepIndex((prev) => {
      const next = prev === null ? 0 : Math.min(TOTAL_STEPS - 1, prev + 1);
      const stepNode = LIFECYCLE_NODES.find((n) => n.stepIndex === next);
      if (stepNode) setSelectedNode(stepNode);
      return next;
    });
  };

  const handlePrevStep = () => {
    setIsPlaying(false);
    setActiveStepIndex((prev) => {
      const next = prev === null ? 0 : Math.max(0, prev - 1);
      const stepNode = LIFECYCLE_NODES.find((n) => n.stepIndex === next);
      if (stepNode) setSelectedNode(stepNode);
      return next;
    });
  };

  const handleResetTour = () => {
    setIsPlaying(false);
    setActiveStepIndex(null);
    setSelectedNode(null);
    setSelectedComponentCode(null);
  };

  const isRunning = systemStatus?.status?.status === 'running';

  // Current active step metadata (supports real live execution or walkthrough tour)
  const isLiveActive = isRunning && liveStep && liveStep.status === 'active';
  const effectiveStepIndex = isLiveActive ? liveStep.stepIndex : activeStepIndex;
  const currentActiveNode =
    effectiveStepIndex !== null && effectiveStepIndex !== undefined
      ? LIFECYCLE_NODES.find((n) => n.stepIndex === effectiveStepIndex)
      : null;

  return (
    <div className="space-y-3">
      {/* 1. ULTRA-COMPACT UNIFIED TOOLBAR (Y-Axis Optimized ~48px) */}
      <div className="relative z-30 rounded-2xl bg-white/85 dark:bg-slate-900/85 border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur px-3.5 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Brand Identity & Info Popover Trigger */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-900 via-indigo-950 to-blue-900 border border-cyan-500/30 flex items-center justify-center shadow-sm shadow-cyan-500/10 shrink-0">
            <Shield className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center truncate">
              <span className="text-cyan-600 dark:text-cyan-400 font-black">Sec</span>
              <span>AgentHarness</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-mono text-xs align-super ml-0.5">²</span>
              <span className="hidden md:inline ml-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                {isZh ? '全景工作流' : 'Workflow Showcase'}
              </span>
            </h1>

            {/* Micro Badge */}
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 whitespace-nowrap">
              <Sparkles className="w-3 h-3 text-cyan-500" />
              <span>{isZh ? '双层递归' : 'Dual-Recursion'}</span>
            </span>

            {/* Info Trigger Button with Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowInfoPopover((prev) => !prev)}
                className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                  showInfoPopover ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/30' : ''
                }`}
                title={isZh ? '查看系统架构与演进机制说明' : 'View Architecture Info'}
              >
                <Info className="w-4 h-4" />
              </button>

              {/* Info Popover with High-Z Backdrop & Floating Card */}
              {showInfoPopover && (
                <>
                  {/* Backdrop to capture clicks outside */}
                  <div
                    className="fixed inset-0 z-40 bg-slate-900/20 dark:bg-black/40 backdrop-blur-[1px] animate-fadeIn"
                    onClick={() => setShowInfoPopover(false)}
                  />

                  {/* Floating Popover Card */}
                  <div className="absolute left-0 sm:left-2 top-9 z-50 w-80 sm:w-[440px] max-w-[calc(100vw-2.5rem)] p-5 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-cyan-500/40 dark:border-cyan-400/40 shadow-2xl shadow-cyan-500/20 backdrop-blur-xl animate-fadeIn text-xs space-y-3.5 ring-1 ring-cyan-500/20 pointer-events-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-extrabold text-sm">
                        <div className="w-6 h-6 rounded-md bg-cyan-500/10 flex items-center justify-center">
                          <Shield className="w-3.5 h-3.5" />
                        </div>
                        <span>{isZh ? 'SecAgentHarness² 演进架构与理论机制' : 'SecAgentHarness² Architecture Guide'}</span>
                      </div>
                      <button
                        onClick={() => setShowInfoPopover(false)}
                        className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer text-xs"
                        title={isZh ? '关闭' : 'Close'}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Core Paragraph */}
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs">
                      {isZh
                        ? '面向网络安全智能体（CVE攻防、渗透测试、自动化任务流水线），全景展示 SecAgentHarness² 任务级递归（S1基线采样 ➔ S2提议探针INV/DOM ➔ S3多路融合 ➔ S4盲选裁决）与套件级经验闭环（S5反思沉淀）全流程，透传 c1~c9 套件与执行器协同机制。'
                        : 'Panoramic showcase of SecAgentHarness² dual-recursion workflow for cybersecurity agents, connecting S1 baseline sampling, S2 candidate probing (INV/DOM), S3 multi-path fusion, S4 zero-GT blind selection, and S5 cross-task reflection loops across c1..c9 components.'}
                    </p>

                    {/* Key Tenet Pills */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate">
                            {isZh ? 'c1~c9 全景白盒' : 'c1..c9 Whitebox'}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {isZh ? '提示词/护栏/工具/中间件' : 'Context/Interface/Hooks'}
                          </div>
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate">
                            {isZh ? '0 GT 盲选防线' : 'Zero GT Blind Gate'}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {isZh ? '无监督双盲裁决无过拟合' : 'Zero-label Verification'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {isZh ? '三轴正交解耦 · 闭环自增殖' : '3-Axis Decoupled · Closed-Loop'}
                      </span>
                      <span className="text-cyan-600 dark:text-cyan-400 font-bold">SecH² v2.0</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Operational Controls (Walkthrough + Mode Switcher + Live Status) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 1. Walkthrough Step Controller */}
          <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
            {isPlaying ? (
              <button
                onClick={handlePauseTour}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-white shadow-sm transition-all cursor-pointer"
                title={isZh ? '暂停自动走查' : 'Pause Tour'}
              >
                <Pause className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isZh ? '暂停' : 'Pause'}</span>
              </button>
            ) : (
              <button
                onClick={handleStartTour}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-600/20 transition-all cursor-pointer"
                title={isZh ? '开始动态模拟推演' : 'Start Auto Walkthrough'}
              >
                <Play className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isZh ? '走查演示' : 'Auto Play'}</span>
              </button>
            )}

            <button
              onClick={handlePrevStep}
              className="p-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isZh ? '上一步' : 'Previous Step'}
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap">
              {activeStepIndex === null
                ? isZh
                  ? '就绪'
                  : 'Ready'
                : `${activeStepIndex + 1}/${TOTAL_STEPS}`}
            </span>

            <button
              onClick={handleNextStep}
              className="p-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isZh ? '下一步' : 'Next Step'}
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            {activeStepIndex !== null && (
              <button
                onClick={handleResetTour}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={isZh ? '重置并退出演示' : 'Reset'}
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* 2. Pipeline Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
            <button
              onClick={() => setPipelineMode('parallel')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                pipelineMode === 'parallel'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={isZh ? '并行融合模式 (agg)' : 'Parallel Mode'}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>{isZh ? '并行 (agg)' : 'Parallel'}</span>
            </button>

            <button
              onClick={() => setPipelineMode('sequential')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                pipelineMode === 'sequential'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={isZh ? '串行精炼模式 (seq)' : 'Sequential Mode'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isZh ? '串行 (seq)' : 'Sequential'}</span>
            </button>
          </div>

          {/* 3. Live Running Pill (Conditional) */}
          {isRunning && onOpenConsole && (
            <button
              onClick={onOpenConsole}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-all animate-pulse cursor-pointer shadow-sm"
              title={isZh ? '查看实时运行控制台' : 'View Live Console'}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{isZh ? '试跑中...' : 'Running...'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. DYNAMIC STEP EXPLANATION STRIP (Visible during active walkthrough or live execution) */}
      {currentActiveNode && (
        <div
          className={`px-3.5 py-1.5 rounded-xl border flex items-center justify-between text-xs animate-fadeIn shadow-sm ${
            isLiveActive
              ? 'bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-blue-500/15 border-amber-500/40 text-amber-950 dark:text-amber-100'
              : 'bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border-blue-400/40 dark:border-blue-500/30'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`px-2 py-0.5 rounded font-mono font-bold text-white text-[10px] shrink-0 flex items-center gap-1 ${
                isLiveActive ? 'bg-amber-500' : 'bg-blue-600'
              }`}
            >
              {isLiveActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
              {isZh
                ? isLiveActive
                  ? `真实执行态 · 步骤 ${effectiveStepIndex! + 1}`
                  : `走查步骤 ${effectiveStepIndex! + 1}`
                : isLiveActive
                ? `LIVE · Step ${effectiveStepIndex! + 1}`
                : `Step ${effectiveStepIndex! + 1}`}
            </span>
            <strong className="text-slate-900 dark:text-white font-bold shrink-0">
              {isZh ? currentActiveNode.titleZh : currentActiveNode.titleEn}：
            </strong>
            <span className="text-slate-700 dark:text-slate-300 truncate">
              {liveStep?.line || (isZh ? currentActiveNode.descriptionZh : currentActiveNode.descriptionEn)}
            </span>
          </div>
          <button
            onClick={() => {
              setSelectedNode(currentActiveNode);
              setSelectedComponentCode(null);
            }}
            className="ml-3 shrink-0 text-blue-600 dark:text-cyan-400 font-semibold hover:underline cursor-pointer text-[11px]"
          >
            {isZh ? '查看详情抽屉 ➔' : 'Inspect Drawer ➔'}
          </button>
        </div>
      )}

      {/* 4. THE MAIN PRESENTATION CANVAS (100% Focused Metro Pipeline) */}
      <div className="relative">
        <MetroPipelineCanvas
          selectedNodeId={selectedNode?.id}
          onSelectNode={(node) => {
            setSelectedNode(node);
            setSelectedComponentCode(null);
          }}
          onSelectComponent={(compCode) => {
            setSelectedComponentCode(compCode);
            const matchedNode = LIFECYCLE_NODES.find((n) => n.componentCodes?.includes(compCode));
            if (matchedNode) {
              setSelectedNode(matchedNode);
            }
          }}
          lang={lang}
          mode={pipelineMode}
          activeStepIndex={activeStepIndex}
          liveStep={liveStep}
        />
      </div>

      {/* 5. SLIDE-OVER DETAIL DRAWER */}
      <NodeDetailDrawer
        node={selectedNode}
        selectedComponentCode={selectedComponentCode}
        onClose={() => {
          setSelectedNode(null);
          setSelectedComponentCode(null);
        }}
        lang={lang}
        telemetryData={telemetryData}
        onNavigateToTab={(tab) => {
          setSelectedNode(null);
          setSelectedComponentCode(null);
          if (onNavigateToTab) {
            onNavigateToTab(tab as NavTabType, selectedRunId);
          }
        }}
      />
    </div>
  );
};

export default OverviewView;
