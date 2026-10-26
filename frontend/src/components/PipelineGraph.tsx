import React, { useEffect, useMemo, useState } from 'react';
import { DAGNode, DAGEdge } from '../types';
import {
  CheckCircle2,
  AlertTriangle,
  Star,
  Sparkles,
  GitBranch,
  GitMerge,
  Loader2,
  Clock,
} from 'lucide-react';
import { useLang } from '../i18n/LangContext';
import { formatStageLabel } from '../utils/labelFormatter';

interface PipelineGraphProps {
  nodes: DAGNode[];
  edges: DAGEdge[];
  selectedNode: DAGNode | null;
  onSelectNode: (node: DAGNode) => void;
}

function getRoundNumber(id: string): number {
  const m = id.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : 1;
}

export const PipelineGraph: React.FC<PipelineGraphProps> = ({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
}) => {
  const { tx } = useLang();

  const baseNodes = useMemo(() => nodes.filter((n) => n.type === 'base'), [nodes]);
  const aggNodes = useMemo(
    () =>
      nodes.filter(
        (n) => n.mode === 'agg' || (!n.mode && (n.type === 'candidate' || n.type === 'composed'))
      ),
    [nodes]
  );
  const seqNodes = useMemo(
    () => nodes.filter((n) => n.mode === 'seq' || n.type === 'sequential'),
    [nodes]
  );

  const hasAgg = aggNodes.length > 0;
  const hasSeq = seqNodes.length > 0;

  const [activeMode, setActiveMode] = useState<'agg' | 'seq'>('agg');

  useEffect(() => {
    if (hasAgg && !hasSeq) {
      setActiveMode('agg');
    } else if (!hasAgg && hasSeq) {
      setActiveMode('seq');
    } else if (selectedNode?.mode === 'seq') {
      setActiveMode('seq');
    } else if (selectedNode?.mode === 'agg') {
      setActiveMode('agg');
    }
  }, [hasAgg, hasSeq, selectedNode?.mode]);

  // Group Parallel (AGG) nodes by round
  const aggRounds = useMemo(() => {
    const map = new Map<number, { candidates: DAGNode[]; composed: DAGNode[] }>();
    for (const n of aggNodes) {
      const r = getRoundNumber(n.id);
      if (!map.has(r)) {
        map.set(r, { candidates: [], composed: [] });
      }
      const group = map.get(r)!;
      if (n.type === 'composed' || n.dim === 'AGG' || n.dim === 'COMPOSE') {
        group.composed.push(n);
      } else {
        group.candidates.push(n);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [aggNodes]);

  // Group Sequential (SEQ) nodes by round
  const seqRounds = useMemo(() => {
    const map = new Map<number, DAGNode[]>();
    for (const n of seqNodes) {
      const r = getRoundNumber(n.id);
      if (!map.has(r)) {
        map.set(r, []);
      }
      map.get(r)!.push(n);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [seqNodes]);

  // Edge lookup helper for label display
  const getEdgeLabel = (sourceId: string, targetId: string, fallback: string) => {
    const found = edges.find((e) => e.source === sourceId && e.target === targetId);
    return found?.label || fallback;
  };

  const aggHasChosen = aggNodes.some((n) => n.is_chosen);
  const seqHasChosen = seqNodes.some((n) => n.is_chosen);

  return (
    <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-md relative overflow-hidden transition-colors">
      {/* Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span>
              {tx('递归探索拓扑图', 'Recursive Pipeline DAG Topology')}
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {tx(
              '提议—探测—合成递归循环变迁状态 · 点击任意节点审阅轨迹与产物',
              'Propose–Probe–Compose recursive evolution stages · Click any node to inspect rollout & trajectory'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Mode Switcher when both AGG and SEQ exist */}
          {hasAgg && hasSeq && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveMode('agg')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeMode === 'agg'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>{tx('并行合成 (AGG)', 'Parallel (AGG)')}</span>
                {aggHasChosen && (
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('seq')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeMode === 'seq'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>{tx('串行递推 (SEQ)', 'Sequential (SEQ)')}</span>
                {seqHasChosen && (
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                )}
              </button>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-slate-600 dark:text-slate-400">
                {tx('初始基准', 'Base')}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-600 dark:text-slate-400">
                {tx('通用工程 (INV)', 'INV')}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span className="text-slate-600 dark:text-slate-400">
                {tx('业务领域 (DOM)', 'DOM')}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-400">
                {tx('融合终选', 'Compose')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Graphical DAG Layout */}
      <div className="py-3 overflow-x-auto">
        {activeMode === 'agg' && hasAgg ? (
          <div className="flex items-center justify-center gap-6 min-w-[720px]">
            {/* Column 1: Base Rollouts */}
            <div className="flex flex-col items-center gap-3">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {tx('步骤 0：基准参考', 'Step 0: Baseline (Base)')}
              </span>
              <div className="flex flex-col gap-3">
                {baseNodes.map((node) => (
                  <NodeCard
                    key={`base-${node.id}`}
                    node={node}
                    isSelected={
                      selectedNode?.id === node.id &&
                      (selectedNode?.mode || 'base') === (node.mode || 'base')
                    }
                    onClick={() => onSelectNode(node)}
                  />
                ))}
              </div>
            </div>

            {/* SVG Fork Connector */}
            <DagConnector
              label={tx('双轴提议分叉 (INV & DOM)', 'Propose Invariant & Domain')}
              variant="fork"
            />

            {/* Column 2 & 3 grouped by Round (1..k) */}
            <div className="flex flex-col gap-5">
              {aggRounds.map(([roundNum, group]) => (
                <div
                  key={`agg-round-${roundNum}`}
                  className="flex items-center gap-6 p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/70"
                >
                  {/* Round Badge */}
                  {aggRounds.length > 1 && (
                    <div className="flex flex-col items-center justify-center px-2 border-r border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold">
                        {tx(`第 ${roundNum} 轮`, `Round ${roundNum}`)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">k={roundNum}</span>
                    </div>
                  )}

                  {/* Candidates (INV & DOM) */}
                  <div className="flex flex-col items-center gap-2.5">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {tx('步骤 1：试跑探测分支 (INV & DOM)', 'Step 1: Probe Candidates (INV & DOM)')}
                    </span>
                    <div className="flex flex-col gap-2.5">
                      {group.candidates.map((node) => (
                        <NodeCard
                          key={`agg-${node.id}`}
                          node={node}
                          isSelected={
                            selectedNode?.id === node.id && selectedNode?.mode === node.mode
                          }
                          onClick={() => onSelectNode(node)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Merge Connector */}
                  {group.composed.length > 0 && (
                    <>
                      <DagConnector
                        label={getEdgeLabel(
                          group.candidates[0]?.id || '',
                          group.composed[0]?.id || '',
                          tx('融合提炼 (AGG)', 'Compose Aggregated')
                        )}
                        variant="merge"
                      />

                      {/* Composed Node */}
                      <div className="flex flex-col items-center gap-2.5">
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          {tx('步骤 2：并行融合终选', 'Step 2: Composed Final (Aggregated)')}
                        </span>
                        <div className="flex flex-col gap-2.5">
                          {group.composed.map((node) => (
                            <NodeCard
                              key={`agg-${node.id}`}
                              node={node}
                              isSelected={
                                selectedNode?.id === node.id && selectedNode?.mode === node.mode
                              }
                              onClick={() => onSelectNode(node)}
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Sequential (SEQ) Mode Layout grouped by Round */
          <div className="flex items-center justify-start lg:justify-center gap-4 min-w-[720px] pb-2">
            {/* Base */}
            <div className="flex flex-col items-center gap-2.5 shrink-0">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {tx('初始基准', 'Baseline')}
              </span>
              {baseNodes.slice(0, 1).map((node) => (
                <NodeCard
                  key={`seq-base-${node.id}`}
                  node={node}
                  isSelected={
                    selectedNode?.id === node.id &&
                    (selectedNode?.mode || 'base') === (node.mode || 'base')
                  }
                  onClick={() => onSelectNode(node)}
                />
              ))}
            </div>

            {seqRounds.map(([roundNum, roundNodes]) => (
              <React.Fragment key={`seq-round-${roundNum}`}>
                <DagConnector
                  label={tx(`进入第 ${roundNum} 轮`, `Round ${roundNum}`)}
                  variant="straight"
                />
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/70 dark:border-slate-800/70 shrink-0">
                  {roundNodes.map((node, idx) => (
                    <React.Fragment key={`seq-${node.id}`}>
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase">
                          {tx(`第 ${roundNum} 轮 · ${node.dim || 'STEP'}`, `R${roundNum} · ${node.dim || 'STEP'}`)}
                        </span>
                        <NodeCard
                          node={node}
                          isSelected={
                            selectedNode?.id === node.id && selectedNode?.mode === node.mode
                          }
                          onClick={() => onSelectNode(node)}
                        />
                      </div>
                      {idx < roundNodes.length - 1 && (
                        <DagConnector
                          label={roundNodes[idx + 1]?.dim || 'Next'}
                          variant="straight"
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface DagConnectorProps {
  label: string;
  variant: 'fork' | 'merge' | 'straight';
}

const DagConnector: React.FC<DagConnectorProps> = ({ label, variant }) => {
  return (
    <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 shrink-0 px-1">
      {variant === 'fork' ? (
        <svg className="w-12 h-16 stroke-current" viewBox="0 0 48 64" fill="none">
          <path
            d="M2 32 C 20 32, 24 12, 44 12"
            strokeWidth="1.75"
            strokeDasharray="3 2"
          />
          <path
            d="M2 32 C 20 32, 24 52, 44 52"
            strokeWidth="1.75"
            strokeDasharray="3 2"
          />
          <polygon points="42,9 48,12 42,15" className="fill-current" />
          <polygon points="42,49 48,52 42,55" className="fill-current" />
        </svg>
      ) : variant === 'merge' ? (
        <svg className="w-12 h-16 stroke-current" viewBox="0 0 48 64" fill="none">
          <path d="M2 12 C 24 12, 26 32, 44 32" strokeWidth="1.75" />
          <path d="M2 52 C 24 52, 26 32, 44 32" strokeWidth="1.75" />
          <polygon points="41,29 48,32 41,35" className="fill-current" />
        </svg>
      ) : (
        <svg className="w-10 h-6 stroke-current" viewBox="0 0 40 24" fill="none">
          <line x1="2" y1="12" x2="34" y2="12" strokeWidth="1.75" />
          <polygon points="32,8 39,12 32,16" className="fill-current" />
        </svg>
      )}
      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap mt-0.5">
        {label}
      </span>
    </div>
  );
};

interface NodeCardProps {
  node: DAGNode;
  isSelected: boolean;
  onClick: () => void;
}

const NodeCard: React.FC<NodeCardProps> = ({ node, isSelected, onClick }) => {
  const { tx } = useLang();
  const fmt = formatStageLabel(node.id, tx);

  const isRunning = node.status === 'running';
  const isPending = node.status === 'pending';
  const isFailed = node.status === 'failed' || node.fell_back;

  let borderColor =
    'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700';
  let badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  let bgColor = 'bg-white dark:bg-slate-950/80';

  if (isRunning) {
    borderColor = isSelected
      ? 'border-blue-500 ring-4 ring-blue-500/40 shadow-lg shadow-blue-500/20'
      : 'border-blue-500/90 ring-2 ring-blue-500/30 shadow-md shadow-blue-500/10 animate-pulse';
    badgeColor =
      'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-400 dark:border-blue-500/50 font-bold';
    bgColor = 'bg-blue-50/50 dark:bg-slate-950/90';
  } else if (isPending) {
    borderColor = isSelected
      ? 'border-slate-400 dark:border-slate-600 ring-2 ring-slate-400/20'
      : 'border-dashed border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700';
    badgeColor =
      'bg-slate-100 dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-800';
    bgColor = 'bg-slate-50/40 dark:bg-slate-950/40 opacity-70 hover:opacity-100';
  } else if (node.type === 'base') {
    borderColor = isSelected
      ? 'border-blue-500 ring-2 ring-blue-500/30'
      : 'border-blue-300 dark:border-blue-500/40 hover:border-blue-400';
    badgeColor =
      'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30';
    bgColor = 'bg-blue-50/40 dark:bg-slate-950/80';
  } else if (node.dim === 'INV') {
    borderColor = isSelected
      ? 'border-amber-500 ring-2 ring-amber-500/30'
      : 'border-amber-300 dark:border-amber-500/40 hover:border-amber-400';
    badgeColor =
      'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30';
    bgColor = 'bg-amber-50/40 dark:bg-slate-950/80';
  } else if (node.dim === 'DOM') {
    borderColor = isSelected
      ? 'border-purple-500 ring-2 ring-purple-500/30'
      : 'border-purple-300 dark:border-purple-500/40 hover:border-purple-400';
    badgeColor =
      'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30';
    bgColor = 'bg-purple-50/40 dark:bg-slate-950/80';
  } else if (node.type === 'composed' || node.dim === 'COMPOSE' || node.dim === 'AGG') {
    borderColor = isSelected
      ? 'border-emerald-500 ring-2 ring-emerald-500/30'
      : 'border-emerald-300 dark:border-emerald-500/40 hover:border-emerald-400';
    badgeColor =
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30';
    bgColor = 'bg-emerald-50/40 dark:bg-slate-950/80';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-52 p-3.5 rounded-xl text-left ${bgColor} border ${borderColor} cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md group`}
    >
      {/* Chosen Star Badge */}
      {node.is_chosen && (
        <div className="absolute -top-2.5 -right-2 bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 shadow-md shadow-amber-500/30">
          <Star className="w-3 h-3 fill-current" />
          <span>{tx('胜出采纳', 'CHOSEN')}</span>
        </div>
      )}

      {/* Header with full-spelling & descriptive bilingual subtitles */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-1.5 truncate">
            {fmt.shortName}
            {isRunning && <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping shrink-0" />}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal truncate">
            {fmt.subTitle}
          </span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold shrink-0 ${badgeColor}`}>
          {fmt.badge}
        </span>
      </div>

      {/* Notes / Intention */}
      <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
        {node.notes ||
          (isRunning
            ? tx('该节点正在提炼执行中...', 'Stage is currently executing in workspace...')
            : isPending
            ? tx('排队中，等待前序阶段完成...', 'Queued, waiting for preceding stages...')
            : node.type === 'base'
            ? tx('初始未优化基准套件', 'Initial unmodified baseline harness')
            : tx('探测与组合演进节点', 'Candidate probe & compose node'))}
      </p>

      {/* Meta */}
      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-1">
          {isRunning ? (
            <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1 font-semibold animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" /> {tx('执行中...', 'Running...')}
            </span>
          ) : isPending ? (
            <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3" /> {tx('待执行', 'Pending')}
            </span>
          ) : isFailed ? (
            <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5 font-medium">
              <AlertTriangle className="w-3 h-3" /> {tx('回退 / 失败', 'Fallback')}
            </span>
          ) : node.kept_base ? (
            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5 font-medium">
              <CheckCircle2 className="w-3 h-3" /> {tx('沿用基准', 'Kept Base')}
            </span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 font-medium">
              <CheckCircle2 className="w-3 h-3" /> {tx('已完成', 'Completed')}
            </span>
          )}
        </div>

        {node.usd !== undefined && node.usd > 0 ? (
          <span className="font-mono text-slate-500 dark:text-slate-400">
            ${node.usd.toFixed(3)}
          </span>
        ) : isRunning ? (
          <span className="text-[9px] font-mono text-blue-500 dark:text-blue-400 uppercase tracking-wider font-semibold">
            {tx('运行中', 'ACTIVE')}
          </span>
        ) : null}
      </div>
    </button>
  );
};
