import React from 'react';
import { DAGNode, DAGEdge } from '../types';
import {
  CheckCircle2,
  AlertTriangle,
  Star,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface PipelineGraphProps {
  nodes: DAGNode[];
  edges: DAGEdge[];
  selectedNodeId: string | null;
  onSelectNode: (node: DAGNode) => void;
}

export const PipelineGraph: React.FC<PipelineGraphProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
}) => {
  const baseNodes = nodes.filter((n) => n.type === 'base');
  const candidateNodes = nodes.filter((n) => n.type === 'candidate');
  const composedNodes = nodes.filter((n) => n.type === 'composed');
  const seqNodes = nodes.filter((n) => n.type === 'sequential');

  const isParallel = candidateNodes.length > 0 || composedNodes.length > 0;

  return (
    <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-md relative overflow-hidden transition-colors">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span>递归探索拓扑图 (Recursive Pipeline Graph)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            提议–探测–组合 (Propose–Probe–Compose) 递归循环变迁状态
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-slate-600 dark:text-slate-400">初始套件 (Base)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-600 dark:text-slate-400">探测分支 (Probe)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-600 dark:text-slate-400">精炼组合 (Compose)</span>
          </div>
        </div>
      </div>

      {/* Graphical Tree Layout */}
      <div className="py-4 overflow-x-auto">
        {isParallel ? (
          <div className="flex items-center justify-center gap-8 min-w-[600px]">
            {/* Column 1: Base */}
            <div className="flex flex-col items-center gap-4">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                步骤 0: 基准参考 (Base)
              </span>
              {baseNodes.map((node) => (
                <NodeCard
                  key={node.id}
                  node={node}
                  isSelected={selectedNodeId === node.id}
                  onClick={() => onSelectNode(node)}
                />
              ))}
            </div>

            {/* Connecting Arrow */}
            <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
              <ArrowRight className="w-6 h-6" />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">提议 (Propose)</span>
            </div>

            {/* Column 2: Candidates (INV & DOM branches) */}
            <div className="flex flex-col items-center gap-4">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                步骤 1: 提议与试跑 (Probe)
              </span>
              <div className="flex flex-col gap-3">
                {candidateNodes.map((node) => (
                  <NodeCard
                    key={node.id}
                    node={node}
                    isSelected={selectedNodeId === node.id}
                    onClick={() => onSelectNode(node)}
                  />
                ))}
              </div>
            </div>

            {/* Connecting Arrow */}
            <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
              <ArrowRight className="w-6 h-6" />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">融合 (Compose)</span>
            </div>

            {/* Column 3: Composed Final */}
            <div className="flex flex-col items-center gap-4">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                步骤 2: 精炼合成 (Final)
              </span>
              {composedNodes.map((node) => (
                <NodeCard
                  key={node.id}
                  node={node}
                  isSelected={selectedNodeId === node.id}
                  onClick={() => onSelectNode(node)}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Sequential Mode Layout */
          <div className="flex items-center justify-center gap-6 min-w-[600px]">
            {baseNodes.map((node) => (
              <React.Fragment key={node.id}>
                <NodeCard
                  node={node}
                  isSelected={selectedNodeId === node.id}
                  onClick={() => onSelectNode(node)}
                />
                <ArrowRight className="w-5 h-5 text-slate-400 dark:text-slate-600" />
              </React.Fragment>
            ))}

            {seqNodes.map((node, idx) => (
              <React.Fragment key={node.id}>
                <NodeCard
                  node={node}
                  isSelected={selectedNodeId === node.id}
                  onClick={() => onSelectNode(node)}
                />
                {idx < seqNodes.length - 1 && (
                  <ArrowRight className="w-5 h-5 text-slate-400 dark:text-slate-600" />
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface NodeCardProps {
  node: DAGNode;
  isSelected: boolean;
  onClick: () => void;
}

const NodeCard: React.FC<NodeCardProps> = ({ node, isSelected, onClick }) => {
  let borderColor = 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700';
  let badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  let bgColor = 'bg-white dark:bg-slate-950/80';

  if (node.type === 'base') {
    borderColor = isSelected
      ? 'border-blue-500 ring-2 ring-blue-500/30'
      : 'border-blue-300 dark:border-blue-500/40 hover:border-blue-400';
    badgeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30';
    bgColor = 'bg-blue-50/40 dark:bg-slate-950/80';
  } else if (node.dim === 'INV') {
    borderColor = isSelected
      ? 'border-amber-500 ring-2 ring-amber-500/30'
      : 'border-amber-300 dark:border-amber-500/40 hover:border-amber-400';
    badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30';
    bgColor = 'bg-amber-50/40 dark:bg-slate-950/80';
  } else if (node.dim === 'DOM') {
    borderColor = isSelected
      ? 'border-purple-500 ring-2 ring-purple-500/30'
      : 'border-purple-300 dark:border-purple-500/40 hover:border-purple-400';
    badgeColor = 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30';
    bgColor = 'bg-purple-50/40 dark:bg-slate-950/80';
  } else if (node.type === 'composed') {
    borderColor = isSelected
      ? 'border-emerald-500 ring-2 ring-emerald-500/30'
      : 'border-emerald-300 dark:border-emerald-500/40 hover:border-emerald-400';
    badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30';
    bgColor = 'bg-emerald-50/40 dark:bg-slate-950/80';
  }

  return (
    <div
      onClick={onClick}
      className={`relative w-56 p-4 rounded-xl ${bgColor} border ${borderColor} cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md group`}
    >
      {/* Chosen Star Badge */}
      {node.is_chosen && (
        <div className="absolute -top-2.5 -right-2 bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 shadow-md shadow-amber-500/30">
          <Star className="w-3 h-3 fill-current" />
          <span>已选中 (CHOSEN)</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {node.id}
        </span>
        <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${badgeColor}`}>
          {node.dim || node.type}
        </span>
      </div>

      {/* Notes / Intention */}
      <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
        {node.notes || (node.type === 'base' ? '初始未优化基准套件' : '等待探测与组合')}
      </p>

      {/* Meta */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-1">
          {node.fell_back ? (
            <span className="text-rose-600 dark:text-rose-400 flex items-center gap-0.5 font-medium">
              <AlertTriangle className="w-3 h-3" /> 回退
            </span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 font-medium">
              <CheckCircle2 className="w-3 h-3" /> 成功
            </span>
          )}
        </div>

        {node.usd !== undefined && node.usd > 0 && (
          <span className="font-mono text-slate-500 dark:text-slate-400">${node.usd.toFixed(3)}</span>
        )}
      </div>
    </div>
  );
};
