import React, { useState } from 'react';
import { DAGNode } from '../types';
import {
  X,
  FileText,
  Activity,
  AlertCircle,
  CheckCircle2,
  Brain,
  MessageSquare,
} from 'lucide-react';

interface StageDetailDrawerProps {
  node: DAGNode | null;
  onClose: () => void;
  rolloutArtifacts?: Record<string, string>;
  stageInfo?: any;
}

export const StageDetailDrawer: React.FC<StageDetailDrawerProps> = ({
  node,
  onClose,
  rolloutArtifacts = {},
}) => {
  const [activeTab, setActiveTab] = useState<'deliverable' | 'trajectory' | 'intention'>('intention');

  if (!node) return null;

  const deliverableText = rolloutArtifacts['answer.txt'] || node.deliverable || '';
  const trajectoryText = rolloutArtifacts['trajectory.md'] || '';

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white/95 dark:bg-slate-900/95 border-l border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-xl flex flex-col transition-colors">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-base text-slate-900 dark:text-white">{node.id}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/30">
              {node.dim || node.type}
            </span>
            {node.is_chosen && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30">
                最终采纳 (Chosen Final)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">阶段详细执行轨迹与提议决策</p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Overview Stats Bar */}
      <div className="grid grid-cols-3 gap-2 p-4 bg-slate-100/60 dark:bg-slate-950/30 border-b border-slate-200 dark:border-slate-800/80 text-xs">
        <div>
          <span className="text-slate-500 block">状态</span>
          <span
            className={`font-semibold flex items-center gap-1 mt-0.5 ${
              node.fell_back ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {node.fell_back ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {node.fell_back ? '回退 (Fell Back)' : '正常执行'}
          </span>
        </div>

        <div>
          <span className="text-slate-500 block">重试与尝试</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
            {node.attempts || 1} 次尝试
          </span>
        </div>

        <div>
          <span className="text-slate-500 block">模型花费 (USD)</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block font-mono">
            ${(node.usd || 0).toFixed(4)}
          </span>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-4">
        <button
          onClick={() => setActiveTab('intention')}
          className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'intention'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>提议意图与说明</span>
        </button>

        <button
          onClick={() => setActiveTab('deliverable')}
          className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'deliverable'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>生成交付物 (Deliverable)</span>
        </button>

        <button
          onClick={() => setActiveTab('trajectory')}
          className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'trajectory'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Agent 行为轨迹</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'intention' && (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                <span>套件编辑器决策说明 (Proposer Decision Notes)</span>
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                {node.notes || '无特殊说明（可能为基础套件或沿用前序提议）'}
              </p>
            </div>

            {node.error && (
              <div className="bg-rose-50 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-200 dark:border-rose-800/40">
                <h4 className="text-xs font-semibold text-rose-700 dark:text-rose-300 mb-1 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span>阶段执行错误日志</span>
                </h4>
                <p className="text-xs text-rose-600 dark:text-rose-200 font-mono whitespace-pre-wrap break-all">
                  {node.error}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'deliverable' && (
          <div className="bg-slate-50 dark:bg-slate-950/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>任务执行产物 (Answer Output)</span>
            </h4>
            {deliverableText ? (
              <pre className="text-xs text-slate-800 dark:text-slate-200 font-mono whitespace-pre-wrap break-all leading-relaxed">
                {deliverableText}
              </pre>
            ) : (
              <p className="text-xs text-slate-500">本阶段未生成独立文本产物或产物文件为空</p>
            )}
          </div>
        )}

        {activeTab === 'trajectory' && (
          <div className="bg-slate-50 dark:bg-slate-950/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-500" />
              <span>执行循环轨迹 (Action / Observation Stream)</span>
            </h4>
            {trajectoryText ? (
              <div className="space-y-3 font-mono text-xs">
                {trajectoryText.split('\n\n').map((block, idx) => {
                  let blockStyle = 'bg-white dark:bg-slate-900/60 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-800';
                  if (block.includes('[ACTION]')) {
                    blockStyle = 'bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-900/40';
                  } else if (block.includes('[OBSERVATION]')) {
                    blockStyle = 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40';
                  }

                  return (
                    <div key={idx} className={`p-3 rounded-lg border ${blockStyle} whitespace-pre-wrap leading-relaxed`}>
                      {block}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500">暂无捕获到的 Trajectory 步骤</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
