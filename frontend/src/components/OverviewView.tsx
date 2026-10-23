import React, { useState, useEffect } from 'react';
import { Workflow, Sparkles, Activity } from 'lucide-react';
import { RunItem, SystemStatus, NavTabType } from '../types';
import { useLang } from '../i18n/LangContext';
import { FlowNode } from './native_flow/flowTypes';
import { LifecyclePipelineFlow } from './native_flow/LifecyclePipelineFlow';
import { NodeDetailDrawer } from './native_flow/NodeDetailDrawer';

interface OverviewViewProps {
  runs?: RunItem[];
  selectedRunId?: string;
  onSelectRunId?: (id: string) => void;
  systemStatus?: SystemStatus | null;
  onNavigateToTab?: (tab: NavTabType, runId?: string, taskId?: string) => void;
  onOpenConsole?: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  systemStatus,
  onNavigateToTab,
  onOpenConsole,
}) => {
  const { lang } = useLang();
  const isZh = lang === 'zh';

  // Selected node for detail drawer
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);

  // Drawer ESC handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedNode) {
        setSelectedNode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode]);

  const isRunning = systemStatus?.status?.status === 'running';

  return (
    <div className="space-y-6">
      {/* 1. STREAMLINED TOP HEADER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-indigo-50/40 to-blue-50/50 dark:from-slate-900 dark:via-slate-900/90 dark:to-indigo-950/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-2xl p-5 sm:p-6 backdrop-blur">
        {/* Glowing backdrop radial */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.08),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.18),rgba(255,255,255,0))] pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Title & Brand */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-1 ring-white/20 shrink-0">
                <Workflow className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {isZh ? 'Harness² 全景工作流程展示大屏' : 'Harness² Workflow Showcase'}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/30">
                    <Sparkles className="w-3 h-3" />
                    {isZh ? '双层递归全生命周期' : 'Dual-Recursion Lifecycle'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  {isZh
                    ? '穿透任务级递归（S1基线采样 ➔ S2提议探针INV/DOM ➔ S3多路融合 ➔ S4盲选裁决）与套件级经验闭环（S5反思沉淀）全生命周期工作流。'
                    : 'End-to-end staged pipeline connecting Task-level recursion (Base -> INV/DOM -> Compose -> Selection) and Harnessing-level experience loops.'}
                </p>
              </div>
            </div>
          </div>

          {/* Running Console Button */}
          {isRunning && onOpenConsole && (
            <div className="flex items-center shrink-0">
              <button
                onClick={onOpenConsole}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-all animate-pulse"
                title={isZh ? '查看实时运行日志' : 'View Live Console'}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>{isZh ? '执行中...' : 'Running...'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. THE SINGLE CORE WORKFLOW CANVAS */}
      <div className="relative">
        <LifecyclePipelineFlow
          selectedNodeId={selectedNode?.id}
          onSelectNode={(node) => setSelectedNode(node)}
          lang={lang}
        />
      </div>

      {/* 3. SLIDE-OVER DETAIL DRAWER */}
      <NodeDetailDrawer
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        lang={lang}
        onNavigateToTab={(tab) => {
          setSelectedNode(null);
          if (onNavigateToTab) {
            onNavigateToTab(tab as NavTabType);
          }
        }}
      />
    </div>
  );
};

export default OverviewView;
