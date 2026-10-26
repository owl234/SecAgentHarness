import React, { useState } from 'react';
import { DAGNode, TaskStageSummary } from '../types';
import {
  X,
  FileText,
  Activity,
  AlertCircle,
  CheckCircle2,
  Brain,
  MessageSquare,
} from 'lucide-react';
import { useLang } from '../i18n/LangContext';
import { useEscapeKey } from './ui/ToastContext';
import { formatStageLabel } from '../utils/labelFormatter';

interface StageDetailDrawerProps {
  node: DAGNode | null;
  onClose: () => void;
  rolloutArtifacts?: Record<string, string>;
  stageInfo?: Partial<TaskStageSummary>;
}

export const StageDetailDrawer: React.FC<StageDetailDrawerProps> = ({
  node,
  onClose,
  rolloutArtifacts = {},
}) => {
  const { tx } = useLang();
  const [activeTab, setActiveTab] = useState<'deliverable' | 'trajectory' | 'intention'>('intention');

  useEscapeKey(onClose, Boolean(node));

  if (!node) return null;

  const deliverableText = rolloutArtifacts['answer.txt'] || node.deliverable || '';
  const trajectoryText = rolloutArtifacts['trajectory.md'] || '';
  const fmt = formatStageLabel(node.id, tx);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl h-full bg-white/95 dark:bg-slate-900/95 border-l border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-xl flex flex-col transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-base text-slate-900 dark:text-white">
                {fmt.shortName}
              </span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                {node.id}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/30">
                {fmt.badge}
              </span>
              {node.mode && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono uppercase">
                  {node.mode}
                </span>
              )}
              {node.is_chosen && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30">
                  🏆 {tx('最终采纳', 'Chosen Final')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {fmt.description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Stats Bar */}
        <div className="grid grid-cols-3 gap-2 p-4 bg-slate-100/60 dark:bg-slate-950/30 border-b border-slate-200 dark:border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-500 block">{tx('状态', 'Status')}</span>
            <span
              className={`font-semibold flex items-center gap-1 mt-0.5 ${
                node.fell_back
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {node.fell_back ? (
                <AlertCircle className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              {node.fell_back
                ? tx('异常回退', 'Fell Back')
                : node.kept_base
                ? tx('沿用基准', 'Kept Base')
                : tx('正常执行', 'Succeeded')}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">{tx('重试与尝试', 'Attempts')}</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
              {node.attempts || 1} {tx('次尝试', 'attempt(s)')}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">{tx('模型开销 (USD)', 'Cost (USD)')}</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block font-mono">
              ${(node.usd || 0).toFixed(4)}
            </span>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-4">
          <button
            type="button"
            onClick={() => setActiveTab('intention')}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'intention'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>{tx('提议意图与说明', 'Proposer Intent & Notes')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deliverable')}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'deliverable'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{tx('生成交付物', 'Deliverable Output')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trajectory')}
            className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'trajectory'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{tx('智能体行为轨迹', 'Agent Trajectory')}</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'intention' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                  <span>{tx('套件编辑器决策说明', 'Proposer Decision Notes')}</span>
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                  {node.notes ||
                    tx(
                      '无特殊说明（可能为基础套件或沿用前序提议）',
                      'No specific notes recorded (baseline rollout or inherited from prior stage).'
                    )}
                </p>
              </div>

              {node.error && (
                <div className="bg-rose-50 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-200 dark:border-rose-800/40">
                  <h4 className="text-xs font-semibold text-rose-700 dark:text-rose-300 mb-1 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                    <span>{tx('阶段执行错误日志', 'Stage Error Log')}</span>
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
                <span>{tx('任务执行产物 (answer.txt)', 'Task Deliverable (answer.txt)')}</span>
              </h4>
              {deliverableText ? (
                <pre className="text-xs text-slate-800 dark:text-slate-200 font-mono whitespace-pre-wrap break-all leading-relaxed">
                  {deliverableText}
                </pre>
              ) : (
                <p className="text-xs text-slate-500">
                  {tx(
                    '本阶段未生成独立文本产物或产物文件为空',
                    'No standalone text deliverable generated for this stage.'
                  )}
                </p>
              )}
            </div>
          )}

          {activeTab === 'trajectory' && (
            <div className="bg-slate-50 dark:bg-slate-950/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-500" />
                <span>{tx('执行循环轨迹（动作与观测流）', 'Action / Observation Trajectory')}</span>
              </h4>
              {trajectoryText ? (
                <div className="space-y-3 font-mono text-xs">
                  {trajectoryText.split('\n\n').map((block, idx) => {
                    let blockStyle =
                      'bg-white dark:bg-slate-900/60 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-800';
                    if (block.includes('[ACTION]')) {
                      blockStyle =
                        'bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-900/40';
                    } else if (block.includes('[OBSERVATION]')) {
                      blockStyle =
                        'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40';
                    }

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${blockStyle} whitespace-pre-wrap leading-relaxed`}
                      >
                        {block}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  {tx('暂无捕获到的轨迹步骤', 'No trajectory steps captured for this rollout.')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
