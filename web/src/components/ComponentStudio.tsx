import React, { useEffect, useState } from 'react';
import {
  Layers,
  Sparkles,
  Plus,
  Search,
  Code2,
  FileText,
  Shield,
  Brain,
  Wrench,
  Bot,
  Zap,
  Terminal,
  Trash2,
  Edit3,
  Copy,
  Check,
  Download,
  Upload,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Folder,
  Send,
  X,
} from 'lucide-react';
import {
  ComponentCategory,
  ComponentTemplate,
  HarnessComponent,
  RunItem,
  TaskItem,
} from '../types';
import {
  applyComponent,
  deleteComponent,
  fetchComponents,
  fetchComponentTemplates,
  fetchTasks,
  saveComponent,
} from '../api';

interface ComponentStudioProps {
  runs: RunItem[];
  onNavigateToRun?: (runId: string, taskId?: string) => void;
}

const CATEGORY_META: Record<
  ComponentCategory,
  {
    name: string;
    cnName: string;
    icon: any;
    color: string;
    border: string;
    bgLight: string;
    role: string;
    defaultPath: string;
    desc: string;
  }
> = {
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
  },
};

export const ComponentStudio: React.FC<ComponentStudioProps> = ({
  runs,
  onNavigateToRun,
}) => {
  const [components, setComponents] = useState<HarnessComponent[]>([]);
  const [templates, setTemplates] = useState<ComponentTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'preset' | 'custom'>('all');
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Edit / Create Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<Partial<HarnessComponent> | null>(null);
  const [editorActiveTab, setEditorActiveTab] = useState<'meta' | 'code' | 'extra'>('code');
  const [saving, setSaving] = useState(false);

  // Apply to Run Modal state
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyingComp, setApplyingComp] = useState<HarnessComponent | null>(null);
  const [targetRunId, setTargetRunId] = useState(runs[0]?.id || '');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [targetTaskId, setTargetTaskId] = useState('');
  const [targetLabel, setTargetLabel] = useState('agg1');
  const [applying, setApplying] = useState(false);

  // Copy helper
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [compList, tplList] = await Promise.all([
        fetchComponents(),
        fetchComponentTemplates(),
      ]);
      setComponents(compList);
      setTemplates(tplList);
    } catch (err: any) {
      showToast(`加载组件失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update tasks list when targetRunId changes
  useEffect(() => {
    if (!targetRunId) return;
    fetchTasks(targetRunId)
      .then((tList) => {
        setTasks(tList);
        if (tList.length > 0) {
          setTargetTaskId(tList[0].task_id);
        } else {
          setTargetTaskId('');
        }
      })
      .catch((err) => console.error('获取可装配任务失败 (Failed to load tasks for apply):', err));
  }, [targetRunId]);

  // Filtering
  const filteredComponents = components.filter((comp) => {
    const matchCat = selectedCategory === 'all' || comp.category === selectedCategory;
    const matchSource = sourceFilter === 'all' || comp.source === sourceFilter;
    const matchQuery =
      !searchQuery ||
      comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSource && matchQuery;
  });

  // Action handlers
  const handleOpenCreateNew = (category: ComponentCategory = 'c6') => {
    const meta = CATEGORY_META[category];
    const defaultName = `new_${meta.name.toLowerCase().replace(/\s+/g, '_')}`;
    const defaultPath = meta.defaultPath.replace('{name}', defaultName);

    setEditingComp({
      name: defaultName,
      category,
      type: `${category}_custom`,
      label: `新建 ${meta.cnName}`,
      description: meta.desc,
      path: defaultPath,
      tags: [category, 'Custom'],
      content: `# ${meta.cnName}\n\n在这里编写 ${meta.name} 组件的规范和指令内容...`,
      extra_files: {},
      source: 'custom',
    });
    setEditorActiveTab('code');
    setIsEditModalOpen(true);
  };

  const handleCreateFromTemplate = (tpl: ComponentTemplate) => {
    setEditingComp({
      name: `${tpl.name}_custom`,
      category: tpl.category,
      type: `${tpl.category}_custom`,
      label: `${tpl.label} (定制)`,
      description: tpl.description,
      path: tpl.path,
      tags: [...tpl.tags, '定制'],
      content: tpl.content,
      extra_files: tpl.extra_files ? { ...tpl.extra_files } : {},
      source: 'custom',
    });
    setEditorActiveTab('code');
    setIsEditModalOpen(true);
  };

  const handleEditComponent = (comp: HarnessComponent) => {
    setEditingComp({ ...comp });
    setEditorActiveTab('code');
    setIsEditModalOpen(true);
  };

  const handleSaveComponent = async () => {
    if (!editingComp || !editingComp.name) {
      showToast('请输入有效的组件名称');
      return;
    }
    setSaving(true);
    try {
      await saveComponent(editingComp);
      showToast('组件保存成功！');
      setIsEditModalOpen(false);
      setEditingComp(null);
      await loadData();
    } catch (err: any) {
      showToast(`保存失败: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteComponent = async (comp: HarnessComponent) => {
    if (!window.confirm(`确认要删除组件 [${comp.label}] 吗？`)) return;
    try {
      await deleteComponent(comp.id);
      showToast('组件删除成功');
      await loadData();
    } catch (err: any) {
      showToast(`删除失败: ${err.message}`);
    }
  };

  const handleOpenApplyModal = (comp: HarnessComponent) => {
    setApplyingComp(comp);
    if (runs.length > 0 && !targetRunId) {
      setTargetRunId(runs[0].id);
    }
    setIsApplyModalOpen(true);
  };

  const handleApplyToRun = async () => {
    if (!applyingComp || !targetRunId || !targetTaskId) {
      showToast('请选择目标 Run 及任务');
      return;
    }
    setApplying(true);
    try {
      await applyComponent({
        run_id: targetRunId,
        task_id: targetTaskId,
        label: targetLabel,
        component: applyingComp,
      });
      showToast(`已成功将组件注入到 ${targetTaskId} (${targetLabel})！`);
      setIsApplyModalOpen(false);
      if (onNavigateToRun) {
        onNavigateToRun(targetRunId, targetTaskId);
      }
    } catch (err: any) {
      showToast(`装配注入失败: ${err.message}`);
    } finally {
      setApplying(false);
    }
  };

  const handleCopyContent = (comp: HarnessComponent) => {
    navigator.clipboard.writeText(comp.content);
    setCopiedId(comp.id);
    showToast('组件内容已复制到剪贴板');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportAll = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(components, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `harness2_components_${Date.now()}.json`);
    dlAnchor.click();
    showToast('组件包已导出');
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 text-sm animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Hero Header & Quick Actions */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/20 rounded-2xl p-6 backdrop-blur shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                <span>Harness² Component Hub</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">c1 ~ c8 全架构体系</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span>Harness 组件工作室</span>
              <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                (Component Studio & Visual Assembler)
              </span>
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
              探索、设计、校验与装配智能体的 8 维运行组件。支持随时创建自定义技能（Skill）、编写安全护栏（Guardrail）、注入工具指引并一键挂载至评测环境。
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleOpenCreateNew('c6')}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>新建自定义组件</span>
            </button>
            <button
              onClick={handleExportAll}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>导出组件包</span>
            </button>
          </div>
        </div>

        {/* 8-Component Role Overview Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mt-6 pt-5 border-t border-slate-200/50 dark:border-slate-800/80">
          {(Object.keys(CATEGORY_META) as ComponentCategory[]).map((cat) => {
            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            const count = components.filter((c) => c.category === cat).length;
            const isSelected = selectedCategory === cat;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(isSelected ? 'all' : cat)}
                className={`flex flex-col items-center text-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold ring-1 ring-blue-500/30'
                    : 'bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1 mb-1">
                  <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                  <span className="text-xs font-mono font-bold uppercase">{cat}</span>
                </div>
                <span className="text-xs truncate w-full font-medium">{meta.cnName}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">{count} 个组件</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索组件名称、标签、功能描述或文件路径..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Source Filter */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setSourceFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                sourceFilter === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              全部来源 ({components.length})
            </button>
            <button
              onClick={() => setSourceFilter('preset')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                sourceFilter === 'preset'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              官方预设 ({components.filter((c) => c.source === 'preset').length})
            </button>
            <button
              onClick={() => setSourceFilter('custom')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                sourceFilter === 'custom'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              自定义组件 ({components.filter((c) => c.source === 'custom').length})
            </button>
          </div>
        </div>

        {selectedCategory !== 'all' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">已筛选分类:</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium flex items-center gap-1">
              <span>{CATEGORY_META[selectedCategory as ComponentCategory]?.cnName}</span>
              <button onClick={() => setSelectedCategory('all')}>
                <X className="w-3 h-3 hover:text-red-500" />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Preset Templates Quick Shelf (if showing all or no custom yet) */}
      {templates.length > 0 && (
        <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                开箱即用官方模板库 (Preset Templates)
              </h2>
            </div>
            <span className="text-xs text-slate-400">点击任意模板快速派生定制组件</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {templates.slice(0, 4).map((tpl) => {
              const meta = CATEGORY_META[tpl.category];
              const Icon = meta.icon;

              return (
                <div
                  key={tpl.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 p-3.5 rounded-xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <Icon className={`w-3 h-3 ${meta.color}`} />
                        <span>{tpl.category.toUpperCase()}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono truncate">{tpl.path}</span>
                    </div>
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-500 transition-colors">
                      {tpl.label}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>

                  <button
                    onClick={() => handleCreateFromTemplate(tpl)}
                    className="mt-3 w-full py-1.5 px-2 bg-slate-50 hover:bg-blue-50 dark:bg-slate-800/80 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>基于此模板定制</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Component Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              已注册组件列表 ({filteredComponents.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            支持一键注入 (Inject) 到运行中的沙箱或 Demo 环境中立即生效
          </span>
        </div>

        {filteredComponents.length === 0 ? (
          <div className="bg-white dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-12 text-center">
            <Layers className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-slate-900 dark:text-white">未找到匹配的 Harness 组件</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              尝试更改筛选条件，或者点击“新建自定义组件”添加专属技能、安全护栏或脚本。
            </p>
            <button
              onClick={() => handleOpenCreateNew('c6')}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-500 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>新建自定义组件</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredComponents.map((comp) => {
              const meta = CATEGORY_META[comp.category] || CATEGORY_META.c6;
              const Icon = meta.icon;
              const isCustom = comp.source === 'custom';

              return (
                <div
                  key={comp.id}
                  className={`bg-white dark:bg-slate-900 border ${
                    isCustom ? 'border-blue-500/30 shadow-xs' : 'border-slate-200 dark:border-slate-800'
                  } rounded-2xl p-4 flex flex-col justify-between hover:border-blue-500/50 hover:shadow-md transition-all group`}
                >
                  <div>
                    {/* Top Tag & Path Bar */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border ${meta.border} ${meta.bgLight} ${meta.color}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{comp.category.toUpperCase()} {meta.cnName}</span>
                        </span>
                        {isCustom ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                            用户自定义
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                            官方预设
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]" title={comp.path}>
                        {comp.path}
                      </span>
                    </div>

                    {/* Title & Name */}
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                      {comp.label}
                    </h3>
                    <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mb-2">
                      id: {comp.name}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {comp.description || '暂无说明描述'}
                    </p>

                    {/* Tags */}
                    {comp.tags && comp.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {comp.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Code Snippet Preview */}
                    <div className="mt-3 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/60 font-mono text-[11px] text-slate-600 dark:text-slate-400 max-h-20 overflow-hidden relative">
                      <pre className="whitespace-pre-wrap line-clamp-3">
                        {comp.content.slice(0, 180)}...
                      </pre>
                      <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent pointer-events-none" />
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyContent(comp)}
                        title="复制组件代码 (Copy)"
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        {copiedId === comp.id ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => handleEditComponent(comp)}
                        title="查看与编辑 (View & edit)"
                        className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {isCustom && (
                        <button
                          onClick={() => handleDeleteComponent(comp)}
                          title="删除组件 (Delete)"
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => handleOpenApplyModal(comp)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 dark:bg-blue-900/20 dark:hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white rounded-xl text-xs font-semibold border border-blue-500/20 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>装配注入 (Apply)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. Create / Edit Component Modal */}
      {/* ========================================================================= */}
      {isEditModalOpen && editingComp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingComp.id ? '编辑与调优 Harness 组件' : '设计新 Harness 组件'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    遵循 Harness² c1~c8 契约规范，具备自动语法校验与文件相对路径保护
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
              <button
                onClick={() => setEditorActiveTab('code')}
                className={`pb-2.5 font-semibold transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
                  editorActiveTab === 'code'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Code2 className="w-4 h-4" />
                <span>核心指令与代码 (Main Content)</span>
              </button>

              <button
                onClick={() => setEditorActiveTab('meta')}
                className={`pb-2.5 font-semibold transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
                  editorActiveTab === 'meta'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Folder className="w-4 h-4" />
                <span>元数据与装配路径 (Metadata & Path)</span>
              </button>

              <button
                onClick={() => setEditorActiveTab('extra')}
                className={`pb-2.5 font-semibold transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
                  editorActiveTab === 'extra'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span>配套可执行脚本 (Extra Files)</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {editorActiveTab === 'meta' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      组件分类 (c1..c8)
                    </label>
                    <select
                      value={editingComp.category || 'c6'}
                      onChange={(e) => {
                        const newCat = e.target.value as ComponentCategory;
                        const meta = CATEGORY_META[newCat];
                        setEditingComp((prev) => ({
                          ...prev,
                          category: newCat,
                          type: `${newCat}_custom`,
                          path: meta.defaultPath.replace('{name}', prev?.name || 'custom'),
                        }));
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                    >
                      {(Object.keys(CATEGORY_META) as ComponentCategory[]).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.toUpperCase()}: {CATEGORY_META[cat].cnName} ({CATEGORY_META[cat].name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      标识符名称 (Regex: [a-z0-9_-])
                    </label>
                    <input
                      type="text"
                      value={editingComp.name || ''}
                      onChange={(e) => {
                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9_\-]/g, '_');
                        setEditingComp((prev) => {
                          const meta = CATEGORY_META[prev?.category || 'c6'];
                          return {
                            ...prev,
                            name: val,
                            path: meta.defaultPath.replace('{name}', val),
                          };
                        });
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono"
                      placeholder="如: data_cleaner, arch_reviewer"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      中文展示标题 (Human Label)
                    </label>
                    <input
                      type="text"
                      value={editingComp.label || ''}
                      onChange={(e) => setEditingComp((prev) => ({ ...prev, label: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                      placeholder="如: 交易流水数据清洗技能手册"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      挂载目标相对路径 (Harness Surface Path)
                    </label>
                    <input
                      type="text"
                      value={editingComp.path || ''}
                      onChange={(e) => setEditingComp((prev) => ({ ...prev, path: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono"
                      placeholder="如: skills/data_cleaner/SKILL.md"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      必须在受控 Harness 表面路径内，严禁超出目标 Harness 根目录。
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      详细功能概述
                    </label>
                    <textarea
                      rows={3}
                      value={editingComp.description || ''}
                      onChange={(e) => setEditingComp((prev) => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white resize-none"
                      placeholder="解释该组件的解决痛点、适用评测场景与预期行为约束..."
                    />
                  </div>
                </div>
              )}

              {editorActiveTab === 'code' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-blue-500">{editingComp.path}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {editingComp.content?.length || 0} 字符
                      </span>
                    </div>
                    <span>支持标准 Markdown、Frontmatter 与 Python/TS 混入</span>
                  </div>

                  <div className="relative">
                    <textarea
                      rows={16}
                      value={editingComp.content || ''}
                      onChange={(e) => setEditingComp((prev) => ({ ...prev, content: e.target.value }))}
                      className="w-full bg-slate-950 text-slate-100 border border-slate-800 rounded-xl p-4 font-mono text-xs leading-relaxed focus:outline-none focus:border-blue-500 resize-none"
                      spellCheck={false}
                    />
                  </div>
                </div>
              )}

              {editorActiveTab === 'extra' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        伴随脚本与附加文件 (Extra Assets)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        针对 Skill (c6) 的 scripts/*.py 或其它辅助运行资源
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        const name = editingComp.name || 'comp';
                        const extraKey = `skills/${name}/scripts/run_${Date.now() % 1000}.py`;
                        setEditingComp((prev) => ({
                          ...prev,
                          extra_files: {
                            ...(prev?.extra_files || {}),
                            [extraKey]: '#!/usr/bin/env python3\nprint("Helper ready.")\n',
                          },
                        }));
                      }}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium cursor-pointer"
                    >
                      + 添加伴随脚本
                    </button>
                  </div>

                  {(!editingComp.extra_files || Object.keys(editingComp.extra_files).length === 0) ? (
                    <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400">
                      暂无附加文件。对于独立组件（如提示词、护栏），通常无需此项。
                    </div>
                  ) : (
                    Object.entries(editingComp.extra_files).map(([filePath, content]) => (
                      <div
                        key={filePath}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-emerald-500">{filePath}</span>
                          <button
                            onClick={() => {
                              const updated = { ...(editingComp.extra_files || {}) };
                              delete updated[filePath];
                              setEditingComp((prev) => ({ ...prev, extra_files: updated }));
                            }}
                            className="text-slate-400 hover:text-red-500 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <textarea
                          rows={6}
                          value={content}
                          onChange={(e) => {
                            const updated = { ...(editingComp.extra_files || {}) };
                            updated[filePath] = e.target.value;
                            setEditingComp((prev) => ({ ...prev, extra_files: updated }));
                          }}
                          className="w-full bg-slate-900 text-slate-100 border border-slate-800 rounded-lg p-2.5 font-mono text-xs resize-none"
                        />
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                disabled={saving}
                onClick={handleSaveComponent}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <span>保存中...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>保存并生效组件</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. Apply / Inject to Run Modal */}
      {/* ========================================================================= */}
      {isApplyModalOpen && applyingComp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    装配注入 Harness 组件
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    将此组件直接挂载至选定的任务与执行分支
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsApplyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Component Info Card */}
            <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-white mb-1">
                <span>{applyingComp.label}</span>
                <span className="font-mono text-blue-500 text-[11px]">{applyingComp.category.toUpperCase()}</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mb-1">
                写入相对路径: {applyingComp.path}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                {applyingComp.description}
              </p>
            </div>

            {/* Form Fields */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  目标评测运行 (Run ID)
                </label>
                <select
                  value={targetRunId}
                  onChange={(e) => setTargetRunId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                >
                  {runs.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  目标评测任务 (Task ID)
                </label>
                <select
                  value={targetTaskId}
                  onChange={(e) => setTargetTaskId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                >
                  {tasks.length === 0 ? (
                    <option value="">加载中或无可用任务...</option>
                  ) : (
                    tasks.map((t) => (
                      <option key={t.task_id} value={t.task_id}>
                        {t.task_id} ({t.domain})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  目标 Harness 分支阶段 (Label)
                </label>
                <select
                  value={targetLabel}
                  onChange={(e) => setTargetLabel(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                >
                  <option value="base">base (基线套件)</option>
                  <option value="agg1">agg1 (并行合成首轮套件)</option>
                  <option value="seq1">seq1 (串行递推首轮套件)</option>
                  <option value="c1">c1 (首轮候选阶段)</option>
                </select>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsApplyModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                disabled={applying || !targetTaskId}
                onClick={handleApplyToRun}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {applying ? <span>正在注入...</span> : <span>立即装配注入</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
