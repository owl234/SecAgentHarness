import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Layers,
  Plus,
  Search,
  Download,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Info,
  Sparkles,
} from 'lucide-react';
import {
  ComponentCategory,
  ComponentTemplate,
  HarnessComponent,
  HarnessSnapshot,
  RunItem,
  TaskItem,
} from '../types';
import {
  applyComponent,
  deleteComponent,
  fetchComponents,
  fetchComponentTemplates,
  fetchTaskDetail,
  fetchTaskHarness,
  fetchTasks,
  saveComponent,
} from '../api';
import { CATEGORY_META, WALKTHROUGH_ORDER } from './studio/categoryMeta';
import { StudioTopologyCanvas } from './studio/StudioTopologyCanvas';
import { StudioDrawer } from './studio/StudioDrawer';
import { StudioContextBar } from './studio/StudioContextBar';
import { useLang } from '../i18n/LangContext';
import { useToast } from './ui/ToastContext';

interface ComponentStudioProps {
  runs: RunItem[];
  selectedRunId?: string;
  onSelectRunId?: (id: string) => void;
  selectedTaskId?: string;
  onSelectTaskId?: (taskId: string) => void;
  selectedCategory?: ComponentCategory | null;
  onSelectCategory?: (cat: ComponentCategory | null) => void;
  onNavigateToRun?: (runId: string, taskId?: string) => void;
}

const TOTAL_WALKTHROUGH_STEPS = WALKTHROUGH_ORDER.length;

export const ComponentStudio: React.FC<ComponentStudioProps> = ({
  runs,
  selectedRunId,
  onSelectRunId,
  selectedTaskId,
  onSelectTaskId,
  selectedCategory: externalCategory,
  onSelectCategory: onSelectExternalCategory,
  onNavigateToRun,
}) => {
  const { lang, tx } = useLang();
  const isZh = lang === 'zh';
  const { showToast, confirm } = useToast();

  const [components, setComponents] = useState<HarnessComponent[]>([]);
  const [templates, setTemplates] = useState<ComponentTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'preset' | 'custom'>('all');
  const [leverFilter, setLeverFilter] = useState<'ALL' | 'INV' | 'DOM' | 'PRIOR_SEAM'>('ALL');
  const [loading, setLoading] = useState(false);

  // Walkthrough & Info Popover State
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeWalkthroughStep, setActiveWalkthroughStep] = useState<number | null>(null);
  const [showInfoPopover, setShowInfoPopover] = useState(false);

  // Drawer & Editing State
  const [drawerCategory, setDrawerCategoryState] = useState<ComponentCategory | null>(
    externalCategory || null
  );
  const [editingComp, setEditingComp] = useState<Partial<HarnessComponent> | null>(null);
  const [saving, setSaving] = useState(false);

  // Sync external category deep-link
  useEffect(() => {
    if (externalCategory !== undefined) {
      setDrawerCategoryState(externalCategory);
    }
  }, [externalCategory]);

  const setDrawerCategory = useCallback(
    (cat: ComponentCategory | null) => {
      setDrawerCategoryState(cat);
      onSelectExternalCategory?.(cat);
    },
    [onSelectExternalCategory]
  );

  // Injection & Live Sandbox Context State
  const [targetRunId, setTargetRunIdState] = useState(selectedRunId || runs[0]?.id || '');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [targetTaskId, setTargetTaskIdState] = useState(selectedTaskId || '');
  const [availableLabels, setAvailableLabels] = useState<string[]>([
    'agg1',
    'seq1',
    'base',
    'inv1',
    'dom1',
  ]);
  const [targetLabel, setTargetLabel] = useState('agg1');
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingSandbox, setLoadingSandbox] = useState(false);
  const [sandboxSnapshot, setSandboxSnapshot] = useState<HarnessSnapshot | null>(null);
  const [applying, setApplying] = useState(false);

  // Injected components tracking map: category -> component id
  const [appliedByCategory, setAppliedByCategory] = useState<
    Partial<Record<ComponentCategory, string>>
  >({});

  // Copy feedback helper
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleChangeRun = (runId: string) => {
    setTargetRunIdState(runId);
    onSelectRunId?.(runId);
  };

  const handleChangeTask = (taskId: string) => {
    setTargetTaskIdState(taskId);
    onSelectTaskId?.(taskId);
  };

  // Sync from parent selectedRunId if changed externally
  useEffect(() => {
    if (selectedRunId && selectedRunId !== targetRunId) {
      setTargetRunIdState(selectedRunId);
    } else if (!targetRunId && runs.length > 0) {
      setTargetRunIdState(runs[0].id);
    }
  }, [runs, selectedRunId, targetRunId]);

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
    if (!targetRunId) {
      setTasks([]);
      setTargetTaskIdState('');
      return;
    }
    setLoadingTasks(true);
    fetchTasks(targetRunId)
      .then((tList) => {
        setTasks(tList);
        if (tList.length > 0) {
          const preferred =
            selectedTaskId && tList.some((t) => t.task_id === selectedTaskId)
              ? selectedTaskId
              : tList[0].task_id;
          setTargetTaskIdState(preferred);
        } else {
          setTargetTaskIdState('');
        }
      })
      .catch((err) => {
        console.error('Failed to load tasks for studio:', err);
      })
      .finally(() => {
        setLoadingTasks(false);
      });
  }, [targetRunId, selectedTaskId]);

  // Fetch available harness stages when targetRunId + targetTaskId change
  useEffect(() => {
    if (!targetRunId || !targetTaskId) {
      setAvailableLabels(['agg1', 'seq1', 'base', 'inv1', 'dom1']);
      return;
    }
    fetchTaskDetail(targetRunId, targetTaskId)
      .then((detail) => {
        const harnesses = detail?.available_harnesses || [];
        if (harnesses.length > 0) {
          setAvailableLabels(harnesses);
          setTargetLabel((prev) => {
            if (harnesses.includes(prev)) return prev;
            if (harnesses.includes('agg1')) return 'agg1';
            if (harnesses.includes('agg2')) return 'agg2';
            if (harnesses.includes('c1')) return 'c1';
            return harnesses[0];
          });
        }
      })
      .catch(() => {
        // Fallback to default labels if detail endpoint is unavailable
      });
  }, [targetRunId, targetTaskId]);

  // Fetch live sandbox harness snapshot for bi-directional sync
  const loadSandboxSnapshot = useCallback(async () => {
    if (!targetRunId || !targetTaskId || !targetLabel) {
      setSandboxSnapshot(null);
      return;
    }
    setLoadingSandbox(true);
    try {
      const snap = await fetchTaskHarness(targetRunId, targetTaskId, targetLabel);
      setSandboxSnapshot(snap);
    } catch {
      setSandboxSnapshot(null);
    } finally {
      setLoadingSandbox(false);
    }
  }, [targetRunId, targetTaskId, targetLabel]);

  useEffect(() => {
    loadSandboxSnapshot();
  }, [loadSandboxSnapshot]);

  // Walkthrough auto-play timer
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setActiveWalkthroughStep((prev) => {
        if (prev === null) return 0;
        return prev >= TOTAL_WALKTHROUGH_STEPS - 1 ? 0 : prev + 1;
      });
    }, 3200);
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Calculate matched categories for topology canvas highlighting
  const filterActive = Boolean(searchQuery.trim() || sourceFilter !== 'all');
  const matchedCategories = useMemo(() => {
    const set = new Set<ComponentCategory>();
    for (const comp of components) {
      const matchSource = sourceFilter === 'all' || comp.source === sourceFilter;
      const matchQuery =
        !searchQuery ||
        comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      if (matchSource && matchQuery) {
        set.add(comp.category);
      }
    }
    return set;
  }, [components, sourceFilter, searchQuery]);

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
    setDrawerCategory(category);
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
    setDrawerCategory(tpl.category);
  };

  const handleExtractFromSandbox = (
    category: ComponentCategory,
    path: string,
    content: string
  ) => {
    const meta = CATEGORY_META[category];
    const safeTask = (targetTaskId || 'task').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const extractedName = `${category}_${safeTask}_${targetLabel}`.toLowerCase();
    setEditingComp({
      name: extractedName,
      category,
      type: `${category}_custom`,
      label: tx(
        `${meta.cnName} · 提取自 ${targetTaskId}@${targetLabel}`,
        `${meta.name} · Extracted from ${targetTaskId}@${targetLabel}`
      ),
      description: tx(
        `从评测运行 ${targetRunId} 任务 ${targetTaskId} (${targetLabel} 阶段) 沙箱反向提取的实机组件 (${path})。`,
        `Extracted from live sandbox ${targetRunId} / ${targetTaskId} [${targetLabel}] (${path}).`
      ),
      path,
      tags: [category, targetLabel, 'Extracted'],
      content,
      extra_files: {},
      source: 'custom',
    });
    setDrawerCategory(category);
    showToast(
      tx(
        '已将沙箱实机文件载入编辑器，点击「保存并生效组件」即可入库复用！',
        'Loaded sandbox file into editor. Click Save Component to store in library!'
      ),
      'info'
    );
  };

  const handleEditComponent = (comp: HarnessComponent) => {
    setEditingComp({ ...comp });
    setDrawerCategory(comp.category);
  };

  const handleSaveComponent = async () => {
    if (!editingComp || !editingComp.name) {
      showToast(
        tx('请输入有效的组件名称', 'Please enter a valid component identifier'),
        'error'
      );
      return;
    }
    setSaving(true);
    try {
      await saveComponent(editingComp);
      showToast(tx('组件保存成功！', 'Component saved successfully!'), 'success');
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
      if (editingComp?.id === comp.id) {
        setEditingComp(null);
      }
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showToast(tx(`删除失败: ${message}`, `Delete failed: ${message}`), 'error');
    }
  };

  const handleApplyToRun = async (comp: HarnessComponent) => {
    if (!targetRunId || !targetTaskId) {
      showToast(
        tx(
          '请先在上方选定目标 Run 与任务',
          'Please select target Run and Task at the top bar'
        ),
        'error'
      );
      return;
    }
    setApplying(true);
    try {
      await applyComponent({
        run_id: targetRunId,
        task_id: targetTaskId,
        label: targetLabel,
        component: comp,
      });
      setAppliedByCategory((prev) => ({
        ...prev,
        [comp.category]: comp.id,
      }));
      showToast(
        tx(
          `已成功将组件 [${comp.label}] 注入到 ${targetTaskId} (${targetLabel})！`,
          `Injected [${comp.label}] into ${targetTaskId} (${targetLabel})!`
        ),
        'success'
      );
      await loadSandboxSnapshot();
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
    showToast(
      tx('组件内容已复制到剪贴板', 'Component content copied to clipboard'),
      'info'
    );
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportAll = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(components, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `harness2_components_${Date.now()}.json`);
    dlAnchor.click();
    showToast(tx('组件包已导出', 'Components bundle exported'), 'info');
  };

  const targetSummaryText =
    targetRunId && targetTaskId
      ? `${targetRunId.slice(0, 8)} / ${targetTaskId} [${targetLabel}]`
      : '';

  const currentWalkthroughCat =
    activeWalkthroughStep !== null ? WALKTHROUGH_ORDER[activeWalkthroughStep] : null;
  const currentWalkthroughMeta = currentWalkthroughCat
    ? CATEGORY_META[currentWalkthroughCat]
    : null;

  return (
    <div className="space-y-3">
      {/* 1. ULTRA-COMPACT UNIFIED STUDIO TOOLBAR (Matches OverviewView ~48px Philosophy) */}
      <div className="relative z-30 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur px-3.5 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Brand Identity + Architecture Info Popover */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-900 via-indigo-900 to-purple-900 border border-blue-500/30 flex items-center justify-center shadow-sm shrink-0">
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center truncate">
              <span>{tx('Harness 组件工作室', 'Harness Component Studio')}</span>
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 whitespace-nowrap">
              <Sparkles className="w-3 h-3 text-blue-500" />
              <span>{tx('c1~c9 信号流拓扑', 'c1~c9 Surface Topology')}</span>
            </span>

            {/* Info Trigger Button with Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowInfoPopover((prev) => !prev)}
                className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                  showInfoPopover
                    ? 'bg-blue-500/10 text-blue-600 dark:text-cyan-400 ring-1 ring-blue-500/30'
                    : ''
                }`}
                title={tx('查看 c1~c9 环绕拓扑与双轴演进说明', 'View c1..c9 Topology Guide')}
              >
                <Info className="w-4 h-4" />
              </button>

              {showInfoPopover && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-slate-900/20 dark:bg-black/40 backdrop-blur-[1px]"
                    onClick={() => setShowInfoPopover(false)}
                  />
                  <div className="absolute left-0 top-9 z-50 w-80 sm:w-[440px] max-w-[calc(100vw-2.5rem)] p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-blue-500/40 shadow-2xl backdrop-blur-xl text-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="font-extrabold text-sm text-blue-600 dark:text-cyan-400 flex items-center gap-1.5">
                        <Layers className="w-4 h-4" />
                        <span>
                          {tx(
                            'c1 ~ c9 生命周期组件经络与双轴设计哲学',
                            'c1 ~ c9 Surface Architecture & Dual-Lever Philosophy'
                          )}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowInfoPopover(false)}
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {tx(
                        '以「冻结核心大模型 (Frozen LLM)」与「Substrate 隔离沙箱」为中轴锚点，左侧汇聚 ① 上下文构建 (c1, c2, c3, c6)，中轴挂载 ④ 生命周期拦截钩子 (c8)，右侧扇出 ② 子智能体委派 (c5) 与 ③ 工具接口协议 (c4, c7, c9)。点击任意节点即可检视沙箱实机态、对比 Base 演进 Diff、反向提取入库或热重载写入。',
                        'Centers on the Frozen LLM Core and Substrate Sandbox: Left aggregates Context (c1, c2, c3, c6), Center mounts Middleware Hooks (c8), and Right fans out Delegation (c5) & Tool/MCP Interfaces (c4, c7, c9).'
                      )}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center: Compact Search & Source Filter */}
        <div className="flex flex-1 items-center gap-2 min-w-[260px] max-w-xl">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tx(
                '搜索组件名称、标签、描述或路径 (拓扑节点自动高亮)...',
                'Search components (topology nodes auto-highlight)...'
              )}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setSourceFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                sourceFilter === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tx(`全部 (${components.length})`, `All (${components.length})`)}
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('preset')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                sourceFilter === 'preset'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tx(
                `预设 (${components.filter((c) => c.source === 'preset').length})`,
                `Presets (${components.filter((c) => c.source === 'preset').length})`
              )}
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('custom')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                sourceFilter === 'custom'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tx(
                `自定义 (${components.filter((c) => c.source === 'custom').length})`,
                `Custom (${components.filter((c) => c.source === 'custom').length})`
              )}
            </button>
          </div>
        </div>

        {/* Right: Signal Walkthrough Controller + New / Export Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
            {isPlaying ? (
              <button
                type="button"
                onClick={() => setIsPlaying(false)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-white shadow-xs transition-all cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tx('暂停', 'Pause')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (activeWalkthroughStep === null) setActiveWalkthroughStep(0);
                  setIsPlaying(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all cursor-pointer"
                title={tx(
                  '动态演示单轮智能体如何依次加载 c1~c9 组件并进入沙箱',
                  'Simulate single-turn agent execution across c1..c9 surfaces'
                )}
              >
                <Play className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tx('信号流走查', 'Signal Tour')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setActiveWalkthroughStep((prev) =>
                  prev === null ? 0 : Math.max(0, prev - 1)
                );
              }}
              className="p-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={tx('上一步', 'Previous Step')}
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap">
              {activeWalkthroughStep === null
                ? tx('就绪', 'Ready')
                : `${activeWalkthroughStep + 1}/${TOTAL_WALKTHROUGH_STEPS}`}
            </span>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setActiveWalkthroughStep((prev) =>
                  prev === null ? 0 : Math.min(TOTAL_WALKTHROUGH_STEPS - 1, prev + 1)
                );
              }}
              className="p-1 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={tx('下一步', 'Next Step')}
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            {activeWalkthroughStep !== null && (
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setActiveWalkthroughStep(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={tx('重置走查', 'Reset')}
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleOpenCreateNew('c6')}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{tx('新建自定义组件', 'New Component')}</span>
          </button>

          <button
            type="button"
            onClick={handleExportAll}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
            title={tx('导出全部组件 JSON', 'Export all components JSON')}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{tx('导出组件包', 'Export')}</span>
          </button>
        </div>
      </div>

      {/* 2. LIVE BI-DIRECTIONAL SANDBOX CONTEXT BAR */}
      <StudioContextBar
        runs={runs}
        targetRunId={targetRunId}
        onSelectRun={handleChangeRun}
        tasks={tasks}
        targetTaskId={targetTaskId}
        onSelectTask={handleChangeTask}
        availableLabels={availableLabels}
        targetLabel={targetLabel}
        onSelectLabel={setTargetLabel}
        loadingTasks={loadingTasks}
        loadingSandbox={loadingSandbox}
        sandboxSnapshot={sandboxSnapshot}
        appliedCount={Object.keys(appliedByCategory).length}
        onRefreshSandbox={loadSandboxSnapshot}
        onSelectCategory={(cat) => {
          setDrawerCategory(cat);
          setEditingComp(null);
        }}
        onNavigateToRun={onNavigateToRun}
      />

      {/* 3. CONDITIONAL WALKTHROUGH EXPLANATION STRIP */}
      {currentWalkthroughCat && currentWalkthroughMeta && (
        <div className="px-3.5 py-2 rounded-xl border border-blue-400/40 dark:border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 flex items-center justify-between gap-3 text-xs animate-fadeIn shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded font-mono font-bold bg-blue-600 text-white text-[10px] shrink-0">
              {currentWalkthroughCat.toUpperCase()} · {isZh ? currentWalkthroughMeta.leverBadgeZh : currentWalkthroughMeta.leverBadgeEn}
            </span>
            <strong className="text-slate-900 dark:text-white font-bold shrink-0">
              {isZh ? currentWalkthroughMeta.walkthroughTitleZh : currentWalkthroughMeta.walkthroughTitleEn}：
            </strong>
            <span className="text-slate-700 dark:text-slate-300 truncate">
              {isZh ? currentWalkthroughMeta.walkthroughDescZh : currentWalkthroughMeta.walkthroughDescEn}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setDrawerCategory(currentWalkthroughCat);
              setEditingComp(null);
            }}
            className="shrink-0 text-blue-600 dark:text-cyan-400 font-semibold hover:underline cursor-pointer text-[11px]"
          >
            {tx(`检视 ${currentWalkthroughCat} 抽屉 ➔`, `Inspect ${currentWalkthroughCat} ➔`)}
          </button>
        </div>
      )}

      {/* 4. MAIN INTERACTIVE SVG TOPOLOGY CANVAS */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-500 bg-white/40 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mb-2" />
          <div>{tx('正在加载组件库与模板...', 'Loading components and templates...')}</div>
        </div>
      ) : (
        <StudioTopologyCanvas
          components={components}
          selectedCategory={drawerCategory}
          matchedCategories={matchedCategories}
          filterActive={filterActive}
          appliedByCategory={appliedByCategory}
          sandboxSnapshot={sandboxSnapshot}
          leverFilter={leverFilter}
          onChangeLeverFilter={setLeverFilter}
          activeWalkthroughStep={activeWalkthroughStep}
          targetSummary={targetSummaryText}
          onSelectCategory={(cat) => {
            setDrawerCategory(cat);
            setEditingComp(null);
          }}
          onCreateInCategory={(cat) => handleOpenCreateNew(cat)}
        />
      )}

      {/* 5. SLIDE-OVER BI-DIRECTIONAL STUDIO DRAWER */}
      <StudioDrawer
        category={drawerCategory}
        components={components}
        templates={templates}
        editingComp={editingComp}
        onChangeEditing={setEditingComp}
        saving={saving}
        canApply={Boolean(targetRunId && targetTaskId)}
        targetSummary={targetSummaryText}
        applying={applying}
        appliedId={drawerCategory ? appliedByCategory[drawerCategory] : undefined}
        sandboxCategory={
          drawerCategory ? sandboxSnapshot?.by_category?.[drawerCategory] || null : null
        }
        searchQuery={searchQuery}
        sourceFilter={sourceFilter}
        onResetFilters={() => {
          setSearchQuery('');
          setSourceFilter('all');
        }}
        onClose={() => {
          setDrawerCategory(null);
          setEditingComp(null);
        }}
        onNew={handleOpenCreateNew}
        onFromTemplate={handleCreateFromTemplate}
        onEdit={handleEditComponent}
        onExtractFromSandbox={handleExtractFromSandbox}
        onCancelEdit={() => setEditingComp(null)}
        onSave={handleSaveComponent}
        onDelete={handleDeleteComponent}
        onApply={handleApplyToRun}
        onCopy={handleCopyContent}
        copiedId={copiedId}
      />
    </div>
  );
};
