import React, { useState } from 'react';
import { CompactMetroCanvas } from './CompactMetroCanvas';
import { EmbeddedLiveTerminal } from './EmbeddedLiveTerminal';
import { NodeDetailDrawer } from '../native_flow/NodeDetailDrawer';
import { FlowNode } from '../native_flow/flowTypes';
import { LiveStageStep, RunItem } from '../../types';
import { useLang } from '../../i18n/LangContext';

interface CockpitRightPipelineProps {
  logs: string[];
  isRunning: boolean;
  isCompleted: boolean;
  liveStep: LiveStageStep | null;
  mode: 'parallel' | 'sequential';
  onToggleMode: (mode: 'parallel' | 'sequential') => void;
  activeSubstrate?: string;
  onClearLogs?: () => void;
  runs: RunItem[];
  selectedRunId?: string;
  onNavigateToTab?: (tab: string) => void;
}

export const CockpitRightPipeline: React.FC<CockpitRightPipelineProps> = ({
  logs,
  isRunning,
  isCompleted,
  liveStep,
  mode,
  onToggleMode,
  activeSubstrate,
  onClearLogs,
  runs,
  selectedRunId,
  onNavigateToTab,
}) => {
  const { lang } = useLang();
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);

  const currentRun = runs.find((r) => r.id === selectedRunId);
  const telemetryData = currentRun
    ? {
        domain: currentRun.domain || 'general',
        stageCount: currentRun.task_count || 1,
        chosenLabel: currentRun.modes?.[0] || 'base',
        hasExperience: true,
      }
    : undefined;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* 1. Upper Section: Compact Metro 12-Step Lifecycle Canvas */}
      <CompactMetroCanvas
        liveStep={liveStep}
        isRunning={isRunning}
        isCompleted={isCompleted}
        mode={mode}
        onToggleMode={onToggleMode}
        selectedNodeId={selectedNode?.id}
        onSelectNode={(node) => setSelectedNode(node)}
        activeSubstrate={activeSubstrate}
      />

      {/* 2. Lower Section: Embedded Live Terminal Log Stream */}
      <EmbeddedLiveTerminal
        logs={logs}
        isRunning={isRunning}
        onClearLogs={onClearLogs}
        currentStepTitle={liveStep?.title}
      />

      {/* 3. Node Detail Drawer for in-place specs & invariants inspection */}
      {selectedNode && (
        <NodeDetailDrawer
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          lang={lang}
          onNavigateToTab={onNavigateToTab}
          telemetryData={telemetryData}
        />
      )}
    </div>
  );
};
