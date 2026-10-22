import React from 'react';
import { X, BookOpen, Layers, Sparkles, Shield, Wrench, Terminal, Cpu, Flame, Bot } from 'lucide-react';

interface TerminologyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TerminologyGuideModal: React.FC<TerminologyGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const coreConcepts = [
    {
      term: '智能体运行套件 (Harness)',
      desc: '围绕底层大模型构建的一整套使之能够自主行动的运行环境，包括提示词、工具定义、记忆管理、安全护栏和自定义执行脚本。',
      icon: Cpu,
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20',
    },
    {
      term: '套件递归优化 (Harnessing)',
      desc: '在冻结大模型权重不变的前提下，通过试跑对比自主发现缺陷并修改这套环境，让智能体在未知新任务中越用越强。',
      icon: Sparkles,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
    },
    {
      term: 'Claude 执行器与混合推理 (Claude Executor)',
      desc: '基于 Anthropic Claude 3.7 Sonnet / Claude Code CLI 的一等公民执行底座，原生支持 Extended Thinking 深度思考推演。',
      icon: Flame,
      color: 'text-orange-500 bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20',
    },
    {
      term: '诊断并提议 (Propose Edits)',
      desc: '优化器深入分析智能体在基线执行中的轨迹和交付物缺陷，提议通用规则修改 (INV) 或领域技能增强 (DOM)。',
      icon: Wrench,
      color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20',
    },
    {
      term: '试跑探测 (Probe Rollouts)',
      desc: '在同一个具体任务中试运行被提议的候选套件，在无标注答案的情况下通过执行轨迹对比差异。',
      icon: Terminal,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
    },
    {
      term: '融合提炼 (Compose / AGG)',
      desc: '将通用改进与领域改进的高分亮点进行无缝融合，合成兼顾稳健性与专业能力的最终交付套件。',
      icon: Layers,
      color: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20',
    },
  ];

  const eightComponents = [
    { id: 'c1', name: '系统提示词 (System Prompt)', role: 'Context', path: 'systemprompt.md', desc: '设定智能体的角色定位、工作规范与第一性原理公理。' },
    { id: 'c2', name: '安全护栏 (Guardrails)', role: 'Context', path: 'guardrails.md', desc: '系统级与业务操作红线拦截，防止文件破坏与凭证泄漏。' },
    { id: 'c3', name: '长期记忆 (Memory)', role: 'Context', path: 'LongTermMEMORY.md', desc: '跨轮次与跨任务持久化保留的关键常识与状态。' },
    { id: 'c4', name: '工具指引 (Tool Guidance)', role: 'Interface', path: 'tool_descriptions/tool_guidance.md', desc: '规范 API 调用参数结构、异常重试与返回契约。' },
    { id: 'c5', name: '子智能体 (Subagents)', role: 'Delegation', path: 'sub_agents/<name>/AGENT.md', desc: '定义委派分工体系与独立专家审查员子角色。' },
    { id: 'c6', name: '技能手册 (Skills)', role: 'Context', path: 'skills/<name>/SKILL.md', desc: '按需触发的专业技能规范文档与配套可执行脚本。' },
    { id: 'c7', name: '事件钩子 (Hooks)', role: 'Environment', path: 'plugins/<name>.ts', desc: '网络拦截、调用前后耗时统计与执行沙箱安全插桩。' },
    { id: 'c8', name: '独立脚本 (Scripts)', role: 'Environment', path: 'scripts/<name>.py', desc: '直接供智能体调用的数据提取、格式清洗与语法校验脚本。' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Harness² 核心概念与图解指南
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                深入理解智能体套件递归自适应进化机制与 c1~c8 架构
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Core Concept Cards */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              核心运行机制
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {coreConcepts.map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-col"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`p-1.5 rounded-lg border ${item.color}`}>
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.term}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 8 Components Grid */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              可被自主定制与演进的 8 维 Harness 核心组件 (c1 ~ c8)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {eightComponents.map((comp, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30 flex items-start gap-2.5"
                >
                  <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800 shrink-0 mt-0.5">
                    {comp.id.toUpperCase()}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {comp.name}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono">({comp.role})</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {comp.desc}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                      路径约定: {comp.path}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            知道了，返回控制台
          </button>
        </div>
      </div>
    </div>
  );
};
