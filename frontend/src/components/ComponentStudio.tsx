import React, { useEffect, useState } from 'react';
import {
  Layers,
  Sparkles,
  Plus,
  Search,
  Trash2,
  Edit3,
  Copy,
  Check,
  Download,
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
import { CATEGORY_META } from './studio/categoryMeta';
import { ComponentEditorModal } from './studio/ComponentEditorModal';
import { ComponentApplyModal } from './studio/ComponentApplyModal';
import { useLang } from '../i18n/LangContext';
import { useToast } from './ui/ToastContext';

interface ComponentStudioProps {
  runs: RunItem[];
  onNavigateToRun?: (runId: string, taskId?: string) => void;
}

export const ComponentStudio: React.FC<ComponentStudioProps> = ({
  runs,
  onNavigateToRun,
}) => {
  const { lang, tx } = useLang();
  const { showToast, confirm } = useToast();

  const [components, setComponents] = useState<HarnessComponent[]>([]);
  const [templates, setTemplates] = useState<ComponentTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'preset' | 'custom'>('all');
  const [loading, setLoading] = useState(false);

  // Edit / Create Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<Partial<HarnessComponent> | null>(null);
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

  const loadData = async () => {
    setLoading(true);
    try {
      const [compList, tplList] = await Promise.all([
        fetchComponents(),
        fetchComponentTemplates(),
      ]);
      setComponents(compList);
      setTemplates(tplList);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showToast(tx(`加载组件失败: ${message}`, `Failed to load components: ${message}`), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      .catch((err) => console.error('Failed to load tasks for apply:', err));
  }, [targetRunId]);

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

  const handleOpenCreateNew = (category: ComponentCategory = 'c6') => {
    const meta = CATEGORY_META[category];
    const defaultName = `new_${meta.name.toLowerCase().replace(/\s+/g, '_')}`;
    const defaultPath = meta.defaultPath.replace('{name}', defaultName);

    setEditingComp({
      name: defaultName,
      category,
      type: `${category}_custom`,
      label: tx(`新建 ${meta.cnName}`, `New ${meta.name}`),
      description: lang === 'en' ? meta.enDesc : meta.desc,
      path: defaultPath,
      tags: [category, 'Custom'],
      content: `# ${meta.cnName} (${meta.name})\n\n${tx(
        `在这里编写 ${meta.name} 组件的规范和指令内容...`,
        `Write ${meta.name} instructions and surface rules here...`
      )}`,
      extra_files: {},
      source: 'custom',
    });
    setIsEditModalOpen(true);
  };

  const handleCreateFromTemplate = (tpl: ComponentTemplate) => {
    setEditingComp({
      name: `${tpl.name}_custom`,
      category: tpl.category,
      type: `${tpl.category}_custom`,
      label: `${tpl.label} (${tx('定制', 'Custom')})`,
      description: tpl.description,
      path: tpl.path,
      tags: [...tpl.tags, tx('定制', 'Custom')],
      content: tpl.content,
      extra_files: tpl.extra_files ? { ...tpl.extra_files } : {},
      source: 'custom',
    });
    setIsEditModalOpen(true);
  };

  const handleEditComponent = (comp: HarnessComponent) => {
    setEditingComp({ ...comp });
    setIsEditModalOpen(true);
  };

  const handleSaveComponent = async () => {
    if (!editingComp || !editingComp.name) {
      showToast(tx('请输入有效的组件名称', 'Please enter a valid component identifier'), 'error');
      return;
    }
    setSaving(true);
    try {
      await saveComponent(editingComp);
      showToast(tx('组件保存成功！', 'Component saved successfully!'), 'success');
      setIsEditModalOpen(false);
      setEditingComp(null);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showToast(tx(`保存失败: ${message}`, `Save failed: ${message}`), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteComponent = async (comp: HarnessComponent) => {
    const ok = await confirm({
      title: tx('删除自定义组件', 'Delete Custom Component'),
      message: tx(
        `确认要删除组件 [${comp.label}] (${comp.name}) 吗？此操作不可撤销。`,
        `Are you sure you want to delete component [${comp.label}] (${comp.name})? This action cannot be undone.`
      ),
      confirmText: tx('确认删除', 'Delete'),
      danger: true,
    });
    if (!ok) return;

    try {
      await deleteComponent(comp.id);
      showToast(tx('组件删除成功', 'Component deleted'), 'success');
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showToast(tx(`删除失败: ${message}`, `Delete failed: ${message}`), 'error');
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
      showToast(tx('请选择目标 Run 及任务', 'Please select a target Run and Task'), 'error');
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
      showToast(
        tx(
          `已成功将组件注入到 ${targetTaskId} (${targetLabel})！`,
          `Component injected into ${targetTaskId} (${targetLabel})!`
        ),
        'success'
      );
      setIsApplyModalOpen(false);
      if (onNavigateToRun) {
        onNavigateToRun(targetRunId, targetTaskId);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showToast(tx(`装配注入失败: ${message}`, `Injection failed: ${message}`), 'error');
    } finally {
      setApplying(false);
    }
  };

  const handleCopyContent = (comp: HarnessComponent) => {
    navigator.clipboard.writeText(comp.content);
    setCopiedId(comp.id);
    showToast(tx('组件内容已复制到剪贴板', 'Component content copied to clipboard'), 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportAll = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(components, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `harness2_components_${Date.now()}.json`);
    dlAnchor.click();
    showToast(tx('组件包已导出', 'Components bundle exported'), 'info');
  };

  return (
    <div className="space-y-6">
      {/* Hero Header & Quick Actions */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/20 rounded-2xl p-6 backdrop-blur shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                <span>Harness² Component Hub</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {tx('c1 ~ c9 全架构体系', 'c1 ~ c9 Full Surface Architecture')}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5 flex-wrap">
              <span>{tx('Harness 组件工作室', 'Harness Component Studio')}</span>
              <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                (Component Studio & Visual Assembler)
              </span>
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
              {tx(
                '探索、设计、校验与装配智能体的 8 维运行组件。支持随时创建自定义技能（Skill）、编写安全护栏（Guardrail）、注入工具指引并一键挂载至评测环境。',
                'Explore, design, validate, and assemble the 8 agent harness surface dimensions. Create custom Skills, Guardrails, Tool Guidance, and inject them directly into evaluation runs.'
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleOpenCreateNew('c6')}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{tx('新建自定义组件', 'New Custom Component')}</span>
            </button>
            <button
              type="button"
              onClick={handleExportAll}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{tx('导出组件包', 'Export JSON')}</span>
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
                type="button"
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
                <span className="text-xs truncate w-full font-medium">
                  {lang === 'en' ? meta.name : meta.cnName}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  {tx(`${count} 个组件`, `${count} item(s)`)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tx(
                '搜索组件名称、标签、功能描述或文件路径...',
                'Search component name, tags, description, or surface path...'
              )}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Source Filter */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setSourceFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                sourceFilter === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tx(`全部来源 (${components.length})`, `All (${components.length})`)}
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('preset')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                sourceFilter === 'preset'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tx(
                `官方预设 (${components.filter((c) => c.source === 'preset').length})`,
                `Presets (${components.filter((c) => c.source === 'preset').length})`
              )}
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('custom')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                sourceFilter === 'custom'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tx(
                `自定义组件 (${components.filter((c) => c.source === 'custom').length})`,
                `Custom (${components.filter((c) => c.source === 'custom').length})`
              )}
            </button>
          </div>
        </div>

        {selectedCategory !== 'all' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{tx('已筛选分类:', 'Category:')}</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium flex items-center gap-1">
              <span>
                {lang === 'en'
                  ? CATEGORY_META[selectedCategory as ComponentCategory]?.name
                  : CATEGORY_META[selectedCategory as ComponentCategory]?.cnName}
              </span>
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="cursor-pointer"
              >
                <X className="w-3 h-3 hover:text-red-500" />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Preset Templates Quick Shelf */}
      {templates.length > 0 && (
        <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {tx('开箱即用官方模板库 (Preset Templates)', 'Ready-to-Use Preset Templates')}
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              {tx('点击任意模板快速派生定制组件', 'Click any template to derive a custom component')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {templates.slice(0, 4).map((tpl) => {
              const meta = CATEGORY_META[tpl.category];
              const Icon = meta.icon;

              return (
                <div
                  key={tpl.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 p-3.5 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <Icon className={`w-3 h-3 ${meta.color}`} />
                        <span>{tpl.category.toUpperCase()}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono truncate">
                        {tpl.path}
                      </span>
                    </div>
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-500 transition-colors">
                      {tpl.label}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCreateFromTemplate(tpl)}
                    className="mt-3 w-full py-1.5 px-2 bg-slate-50 hover:bg-blue-50 dark:bg-slate-800/80 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{tx('基于此模板定制', 'Customize from Template')}</span>
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
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {tx(
              `已注册组件列表 (${filteredComponents.length})`,
              `Registered Harness Components (${filteredComponents.length})`
            )}
          </h2>
          <span className="text-xs text-slate-400">
            {tx(
              '支持一键注入 (Inject) 到运行中的沙箱或 Demo 环境中立即生效',
              'One-click injection into any target run & harness stage'
            )}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            {tx('正在加载组件库...', 'Loading components...')}
          </div>
        ) : filteredComponents.length === 0 ? (
          <div className="bg-white dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-12 text-center">
            <Layers className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-slate-900 dark:text-white">
              {tx('未找到匹配的 Harness 组件', 'No Matching Harness Components Found')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {tx(
                '尝试更改筛选条件，或者点击“新建自定义组件”添加专属技能、安全护栏或脚本。',
                'Try adjusting your search filters or create a new custom Skill, Guardrail, or Script.'
              )}
            </p>
            <button
              type="button"
              onClick={() => handleOpenCreateNew('c6')}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-500 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{tx('新建自定义组件', 'New Custom Component')}</span>
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
                    isCustom
                      ? 'border-blue-500/30 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800'
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
                          <span>
                            {comp.category.toUpperCase()}{' '}
                            {lang === 'en' ? meta.name : meta.cnName}
                          </span>
                        </span>
                        {isCustom ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                            {tx('用户自定义', 'Custom')}
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                            {tx('官方预设', 'Preset')}
                          </span>
                        )}
                      </div>
                      <span
                        className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]"
                        title={comp.path}
                      >
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
                      {comp.description || tx('暂无说明描述', 'No description provided')}
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
                        type="button"
                        onClick={() => handleCopyContent(comp)}
                        title={tx('复制组件代码 (Copy)', 'Copy component code')}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        {copiedId === comp.id ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditComponent(comp)}
                        title={tx('查看与编辑 (View & edit)', 'View & edit component')}
                        className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComponent(comp)}
                          title={tx('删除组件 (Delete)', 'Delete component')}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenApplyModal(comp)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 dark:bg-blue-900/20 dark:hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white rounded-xl text-xs font-semibold border border-blue-500/20 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{tx('装配注入 (Apply)', 'Inject (Apply)')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Component Modal */}
      <ComponentEditorModal
        isOpen={isEditModalOpen}
        editingComp={editingComp}
        saving={saving}
        onClose={() => setIsEditModalOpen(false)}
        onChange={setEditingComp}
        onSave={handleSaveComponent}
      />

      {/* Apply / Inject to Run Modal */}
      <ComponentApplyModal
        isOpen={isApplyModalOpen}
        applyingComp={applyingComp}
        runs={runs}
        targetRunId={targetRunId}
        onChangeRunId={setTargetRunId}
        tasks={tasks}
        targetTaskId={targetTaskId}
        onChangeTaskId={setTargetTaskId}
        targetLabel={targetLabel}
        onChangeLabel={setTargetLabel}
        applying={applying}
        onClose={() => setIsApplyModalOpen(false)}
        onApply={handleApplyToRun}
      />
    </div>
  );
};
