import React from 'react';
import {
  FileText,
  Shield,
  Brain,
  Wrench,
  Bot,
  Sparkles,
  Zap,
  Terminal,
} from 'lucide-react';
import { ComponentCategory } from '../../types';

export interface CategoryMetaItem {
  name: string;
  cnName: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  border: string;
  bgLight: string;
  role: string;
  defaultPath: string;
  desc: string;
  enDesc: string;
}

export const CATEGORY_META: Record<ComponentCategory, CategoryMetaItem> = {
  c1: {
    name: 'System Prompt',
    cnName: '系统提示词',
    icon: FileText,
    color: 'text-blue-500',
    border: 'border-blue-500/20',
    bgLight: 'bg-blue-50 dark:bg-blue-950/30',
    role: 'Context',
    defaultPath: 'systemprompt.md',
    desc: '设定智能体角色设定、核心执行哲学与第一性原理推演要求。',
    enDesc: 'Defines agent persona, core operating principles, and first-principles axioms.',
  },
  c2: {
    name: 'Guardrails',
    cnName: '安全护栏',
    icon: Shield,
    color: 'text-amber-500',
    border: 'border-amber-500/20',
    bgLight: 'bg-amber-50 dark:bg-amber-950/30',
    role: 'Context',
    defaultPath: 'guardrails.md',
    desc: '系统级与业务操作红线拦截，阻断越权文件删除与敏感凭证外泄。',
    enDesc: 'System & business safety redlines blocking destructive file actions or secret leaks.',
  },
  c3: {
    name: 'Memory',
    cnName: '长期记忆',
    icon: Brain,
    color: 'text-purple-500',
    border: 'border-purple-500/20',
    bgLight: 'bg-purple-50 dark:bg-purple-950/30',
    role: 'Context',
    defaultPath: 'LongTermMEMORY.md',
    desc: '持久化跨轮次沉淀的踩坑教训、库兼容性备忘及有效策略模式。',
    enDesc: 'Persists cross-task domain lessons, compatibility notes, and verified heuristics.',
  },
  c4: {
    name: 'Tool Guidance',
    cnName: '工具指引',
    icon: Wrench,
    color: 'text-emerald-500',
    border: 'border-emerald-500/20',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/30',
    role: 'Interface',
    defaultPath: 'tool_descriptions/tool_guidance.md',
    desc: 'API 参数规范、异常重试协议与工具返回数据契约约束。',
    enDesc: 'Specifies tool invocation contracts, retry protocols, and output invariants.',
  },
  c5: {
    name: 'Subagents',
    cnName: '子智能体',
    icon: Bot,
    color: 'text-indigo-500',
    border: 'border-indigo-500/20',
    bgLight: 'bg-indigo-50 dark:bg-indigo-950/30',
    role: 'Delegation',
    defaultPath: 'sub_agents/{name}/AGENT.md',
    desc: '独立委托职责的轻量级专家智能体（如代码审查员、质量保证员）。',
    enDesc: 'Delegated specialist subagents (e.g., code reviewer, QA auditor, verifier).',
  },
  c6: {
    name: 'Skills',
    cnName: '技能库',
    icon: Sparkles,
    color: 'text-cyan-500',
    border: 'border-cyan-500/20',
    bgLight: 'bg-cyan-50 dark:bg-cyan-950/30',
    role: 'Context',
    defaultPath: 'skills/{name}/SKILL.md',
    desc: '按需触发的领域任务技能手册，包含规范文档与配套可执行脚本。',
    enDesc: 'On-demand domain playbooks bundling instructions and executable helper scripts.',
  },
  c7: {
    name: 'Hooks',
    cnName: '事件钩子',
    icon: Zap,
    color: 'text-rose-500',
    border: 'border-rose-500/20',
    bgLight: 'bg-rose-50 dark:bg-rose-950/30',
    role: 'Environment',
    defaultPath: 'plugins/{name}.ts',
    desc: '在智能体动作前后的事件监听、运行时耗时统计与安全拦截插桩。',
    enDesc: 'Pre/post action lifecycle hooks, runtime telemetry, and policy interceptors.',
  },
  c8: {
    name: 'Scripts',
    cnName: '运行脚本',
    icon: Terminal,
    color: 'text-green-500',
    border: 'border-green-500/20',
    bgLight: 'bg-green-50 dark:bg-green-950/30',
    role: 'Environment',
    defaultPath: 'scripts/{name}.py',
    desc: '支持智能体直接调用的辅助分析工具、语法校验器与数据提取脚本。',
    enDesc: 'Standalone scripts invoked by the agent for data extraction, linting, and verification.',
  },
};
