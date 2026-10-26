import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookmarkPlus,
  Check,
  CheckCircle2,
  Copy,
  Edit3,
  FileCode,
  Filter,
  GitCompare,
  Layers,
  Maximize2,
  Minimize2,
  Plus,
  Save,
  Send,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import {
  ComponentCategory,
  ComponentTemplate,
  HarnessComponent,
  SandboxCategorySnapshot,
} from '../../types';
import { CATEGORY_META } from './categoryMeta';
import { ComponentInlineEditor } from './ComponentInlineEditor';
import { useLang } from '../../i18n/LangContext';
import { useEscapeKey } from '../ui/ToastContext';

interface StudioDrawerProps {
  category: ComponentCategory | null;
  components: HarnessComponent[];
  templates: ComponentTemplate[];
  editingComp: Partial<HarnessComponent> | null;
  onChangeEditing: React.Dispatch<React.SetStateAction<Partial<HarnessComponent> | null>>;
  saving: boolean;
  /** Whether a Run/Task target is selected in the context bar. */
  canApply: boolean;
  targetSummary: string;
  applying: boolean;
  appliedId?: string;
  /** Live sandbox snapshot for this category from the selected Run/Task/Stage. */
  sandboxCategory?: SandboxCategorySnapshot | null;
  searchQuery?: string;
  sourceFilter?: 'all' | 'preset' | 'custom';
  onResetFilters?: () => void;
  onClose: () => void;
  onNew: (cat: ComponentCategory) => void;
  onFromTemplate: (tpl: ComponentTemplate) => void;
  onEdit: (comp: HarnessComponent) => void;
  onExtractFromSandbox?: (cat: ComponentCategory, path: string, content: string) => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onDelete: (comp: HarnessComponent) => void;
  onApply: (comp: HarnessComponent) => void;
  onCopy: (comp: HarnessComponent) => void;
  copiedId: string | null;
}

/** Simple line-level diff helper for previewing changes against sandbox or base. */
function computeLineDiff(
  oldText: string,
  newText: string
): { type: 'same' | 'add' | 'del'; text: string }[] {
  const oldLines = (oldText || '').split('\n');
  const newLines = (newText || '').split('\n');
  const result: { type: 'same' | 'add' | 'del'; text: string }[] = [];
  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < Math.min(maxLen, 160); i++) {
    const o = oldLines[i];
    const n = newLines[i];
    if (o === n && o !== undefined) {
      result.push({ type: 'same', text: `  ${o}` });
    } else {
      if (o !== undefined) result.push({ type: 'del', text: `- ${o}` });
      if (n !== undefined) result.push({ type: 'add', text: `+ ${n}` });
    }
  }
  return result;
}

export const StudioDrawer: React.FC<StudioDrawerProps> = ({
  category,
  components,
  templates,
  editingComp,
  onChangeEditing,
  saving,
  canApply,
  targetSummary,
  applying,
  appliedId,
  sandboxCategory,
  searchQuery = '',
  sourceFilter = 'all',
  onResetFilters,
  onClose,
  onNew,
  onFromTemplate,
  onEdit,
  onExtractFromSandbox,
  onCancelEdit,
  onSave,
  onDelete,
  onApply,
  onCopy,
  copiedId,
}) => {
  const { lang, tx } = useLang();
  const isZh = lang === 'zh';
  const [expanded, setExpanded] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<'library' | 'sandbox'>('library');
  const [selectedSandboxFile, setSelectedSandboxFile] = useState<string>('');
  const [showBaseDiff, setShowBaseDiff] = useState(false);
  const [hotEditingContent, setHotEditingContent] = useState<string | null>(null);

  useEscapeKey(editingComp ? onCancelEdit : onClose, !!category);

  useEffect(() => {
    setPreviewId(null);
    setHotEditingContent(null);
    setShowBaseDiff(false);
    if (sandboxCategory?.diff_from_base) {
      setShowBaseDiff(true);
    }
    const fileKeys = Object.keys(sandboxCategory?.files || {});
    setSelectedSandboxFile(fileKeys[0] || sandboxCategory?.primary_path || '');
  }, [category, sandboxCategory]);

  const allItems = useMemo(() => {
    if (!category) return [];
    return components.filter((c) => c.category === category);
  }, [components, category]);

  const isFilterActive = Boolean(searchQuery.trim() || sourceFilter !== 'all');

  const filteredItems = useMemo(() => {
    return allItems.filter((comp) => {
      const matchSource = !sourceFilter || sourceFilter === 'all' || comp.source === sourceFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        comp.name.toLowerCase().includes(q) ||
        comp.label.toLowerCase().includes(q) ||
        comp.description.toLowerCase().includes(q) ||
        comp.tags?.some((t) => t.toLowerCase().includes(q));
      return matchSource && matchQuery;
    });
  }, [allItems, sourceFilter, searchQuery]);

  if (!category) return null;

  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  const tpls = templates.filter((t) => t.category === category);
  const previewComp = allItems.find((c) => c.id === previewId) || null;

  const sandboxFiles = sandboxCategory?.files || {};
  const sandboxFileKeys = Object.keys(sandboxFiles);
  const activeSandboxPath =
    (selectedSandboxFile && sandboxFiles[selectedSandboxFile] !== undefined
      ? selectedSandboxFile
      : sandboxFileKeys[0]) ||
    sandboxCategory?.primary_path ||
    meta.defaultPath;
  const activeSandboxContent = sandboxFiles[activeSandboxPath] ?? sandboxCategory?.primary_content ?? '';
  const activeBaseContent =
    sandboxCategory?.base_files?.[activeSandboxPath] ?? sandboxCategory?.base_primary_content ?? '';

  return (
    <aside
      className={`fixed top-0 right-0 bottom-0 z-40 flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-[width] duration-200 ${
        expanded ? 'w-full md:w-[58%]' : 'w-full sm:w-[500px]'
      }`}
      role="complementary"
      aria-label={tx('组件详情抽屉', 'Component drawer')}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/60">
        <div className="flex items-center gap-2.5 min-w-0">
          {editingComp && (
            <button
              type="button"
              onClick={onCancelEdit}
              title={tx('返回实例列表', 'Back to list')}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className={`p-2 rounded-xl border ${meta.border} ${meta.bgLight}`}>
            <Icon className={`w-4 h-4 ${meta.color}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                <span className="font-mono uppercase mr-1.5 text-blue-600 dark:text-cyan-400">
                  {category}
                </span>
                {isZh ? meta.cnName : meta.name}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold shrink-0">
                {isZh ? meta.leverBadgeZh : meta.leverBadgeEn}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {editingComp
                ? editingComp.id
                  ? tx('编辑组件', 'Editing component')
                  : tx('新建组件', 'New component')
                : isZh
                  ? meta.desc
                  : meta.enDesc}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? tx('收起', 'Collapse') : tx('展宽到半屏', 'Expand to half screen')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* First-Principles Contract & Formula Banner (when not in full editor mode) */}
      {!editingComp && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50 via-blue-50/40 to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 border-b border-slate-200 dark:border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 truncate">
              {meta.formula}
            </span>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
              {tx(`建议配额 ≤ ${meta.quotaChars} 字`, `Quota ≤ ${meta.quotaChars} chars`)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            {(isZh ? meta.invariantsZh : meta.invariantsEn).map((inv, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300"
              >
                <Shield className="w-3 h-3 text-blue-500 shrink-0" />
                <span className="truncate">{inv}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dual-Perspective View Switcher Tabs */}
      {!editingComp && (
        <div className="flex items-center gap-2 px-4 pt-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
          <button
            type="button"
            onClick={() => setDrawerTab('library')}
            className={`pb-2.5 px-1 font-bold transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
              drawerTab === 'library'
                ? 'border-blue-500 text-blue-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>
              {tx(
                `组件资产库 (${filteredItems.length})`,
                `Component Library (${filteredItems.length})`
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDrawerTab('sandbox')}
            className={`pb-2.5 px-1 font-bold transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
              drawerTab === 'sandbox'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{tx('当前沙箱实机态', 'Live Sandbox State')}</span>
            {sandboxCategory?.exists && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                {sandboxCategory.file_count}
              </span>
            )}
            {sandboxCategory?.diff_from_base && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-amber-500 text-white">
                Δ Base
              </span>
            )}
          </button>
        </div>
      )}

      {/* Body Content */}
      {editingComp ? (
        <>
          <div className="flex-1 min-h-0">
            <ComponentInlineEditor editingComp={editingComp} onChange={onChangeEditing} />
          </div>
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {tx('取消', 'Cancel')}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onSave}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? tx('保存中...', 'Saving...') : tx('保存并生效组件', 'Save Component')}</span>
            </button>
          </div>
        </>
      ) : drawerTab === 'sandbox' ? (
        /* ==============================================================
           TAB 2: LIVE SANDBOX STATE (Bi-Directional Inspection, Diff vs Base, Hot-Edit & Extract)
           ============================================================== */
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>
                  {targetSummary
                    ? tx(`目标沙箱: ${targetSummary}`, `Target Sandbox: ${targetSummary}`)
                    : tx('未选定目标沙箱', 'No target sandbox selected')}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {sandboxCategory?.exists
                  ? tx(
                      `物理路径: ${activeSandboxPath} · ${activeSandboxContent.length} 字符`,
                      `Path: ${activeSandboxPath} · ${activeSandboxContent.length} chars`
                    )
                  : tx('当前阶段沙箱内尚未物化该维度文件', 'No materialized file in this category yet')}
              </div>
            </div>

            {sandboxCategory?.exists && onExtractFromSandbox && (
              <button
                type="button"
                onClick={() =>
                  onExtractFromSandbox(category, activeSandboxPath, activeSandboxContent)
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm cursor-pointer transition-all"
                title={tx(
                  '将当前沙箱中演进或生效的组件反向提取并保存为自定义组件库资产',
                  'Extract this sandbox file into your reusable custom component library'
                )}
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>{tx('反向提取入库', 'Extract to Library')}</span>
              </button>
            )}
          </div>

          {/* File Selector if multiple files exist in this category */}
          {sandboxFileKeys.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {sandboxFileKeys.map((fPath) => (
                <button
                  key={fPath}
                  type="button"
                  onClick={() => {
                    setSelectedSandboxFile(fPath);
                    setHotEditingContent(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border cursor-pointer transition-all ${
                    activeSandboxPath === fPath
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {fPath}
                </button>
              ))}
            </div>
          )}

          {/* Evolution Diff Toggle if modified vs base */}
          {sandboxCategory?.diff_from_base && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 font-semibold">
                <GitCompare className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  {tx(
                    '检测到该组件在当前阶段相比 Base 基线发生了演进变更！',
                    'This component evolved compared to the Base harness!'
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowBaseDiff((v) => !v)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 text-white hover:bg-amber-400 transition-colors cursor-pointer shrink-0"
              >
                {showBaseDiff ? tx('查看完整代码', 'View Full Code') : tx('对比 Base Diff', 'View Base Diff')}
              </button>
            </div>
          )}

          {/* Sandbox Content Viewer / Diff vs Base / Inline Hot-Editor */}
          {!sandboxCategory?.exists && hotEditingContent === null ? (
            <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tx(
                  `当前沙箱阶段尚未挂载 ${category.toUpperCase()} (${meta.cnName}) 文件。你可以从「组件资产库」挑选注入，或直接在此新建写入沙箱。`,
                  `No ${category.toUpperCase()} file is currently mounted in this sandbox stage. Inject one from the Library tab or hot-create below.`
                )}
              </p>
              {canApply && (
                <button
                  type="button"
                  onClick={() =>
                    setHotEditingContent(
                      `# ${meta.cnName} (${meta.name})\n\n`
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{tx('直接在沙箱中创建此文件', 'Hot-Create in Sandbox')}</span>
                </button>
              )}
            </div>
          ) : hotEditingContent !== null ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  {tx('正在热编辑沙箱文件:', 'Hot-editing sandbox file:')} {activeSandboxPath}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {hotEditingContent.length} {tx('字符', 'chars')}
                </span>
              </div>
              <textarea
                rows={16}
                value={hotEditingContent}
                onChange={(e) => setHotEditingContent(e.target.value)}
                className="w-full bg-slate-950 text-slate-100 border border-emerald-500/50 rounded-xl p-3.5 font-mono text-xs leading-relaxed focus:outline-none resize-none"
                spellCheck={false}
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setHotEditingContent(null)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {tx('取消', 'Cancel')}
                </button>
                <button
                  type="button"
                  disabled={!canApply || applying}
                  onClick={() => {
                    onApply({
                      id: `hot_${category}`,
                      name: `${category}_sandbox_hot`,
                      category,
                      type: `${category}_hot`,
                      label: `${meta.cnName} (Sandbox Hot-Edit)`,
                      path: activeSandboxPath,
                      description: 'Direct sandbox hot-edit',
                      tags: [category, 'HotEdit'],
                      content: hotEditingContent,
                      source: 'run',
                      updated_at: new Date().toISOString(),
                    });
                    setHotEditingContent(null);
                  }}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{applying ? tx('写入中...', 'Writing...') : tx('热写入沙箱', 'Write to Sandbox')}</span>
                </button>
              </div>
            </div>
          ) : showBaseDiff && sandboxCategory?.diff_from_base ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>base/{activeSandboxPath} ➔ {targetSummary}</span>
                <span>
                  Δ {activeSandboxContent.length - activeBaseContent.length >= 0 ? '+' : ''}
                  {activeSandboxContent.length - activeBaseContent.length} {tx('字符', 'chars')}
                </span>
              </div>
              <div className="max-h-[420px] overflow-auto rounded-xl bg-slate-950 border border-slate-800 p-3 font-mono text-[11px] leading-relaxed space-y-0.5">
                {computeLineDiff(activeBaseContent, activeSandboxContent).map((line, idx) => (
                  <div
                    key={idx}
                    className={
                      line.type === 'add'
                        ? 'bg-emerald-500/15 text-emerald-300 px-1.5 rounded-xs'
                        : line.type === 'del'
                          ? 'bg-rose-500/15 text-rose-300 px-1.5 rounded-xs'
                          : 'text-slate-400 px-1.5'
                    }
                  >
                    {line.text}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {tx('沙箱实机文件内容', 'Materialized File Content')}
                </span>
                {canApply && (
                  <button
                    type="button"
                    onClick={() => setHotEditingContent(activeSandboxContent)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 dark:text-cyan-400 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{tx('在线热改沙箱', 'Hot-Edit Sandbox')}</span>
                  </button>
                )}
              </div>
              <pre className="max-h-[420px] overflow-auto rounded-xl bg-slate-950 text-slate-100 border border-slate-800 p-3.5 text-[11px] font-mono whitespace-pre-wrap leading-relaxed">
                {activeSandboxContent}
              </pre>
            </div>
          )}
        </div>
      ) : (
        /* ==============================================================
           TAB 1: COMPONENT LIBRARY & PRESET TEMPLATES (with Diff-Before-Inject)
           ============================================================== */
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
              {tx(
                `实例列表 (${filteredItems.length}${isFilterActive ? `/${allItems.length}` : ''})`,
                `Instances (${filteredItems.length}${isFilterActive ? `/${allItems.length}` : ''})`
              )}
            </h3>
            <button
              type="button"
              onClick={() => onNew(category)}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{tx('新建', 'New')}</span>
            </button>
          </div>

          {/* Active Filter Notification Bar */}
          {isFilterActive && (
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-700 dark:text-amber-300">
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <Filter className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {tx('已联动主屏筛选', 'Filtered by search/source')}
                  {searchQuery && ` · "${searchQuery}"`}
                  {sourceFilter !== 'all' &&
                    ` · ${sourceFilter === 'preset' ? tx('预设', 'Presets') : tx('自定义', 'Custom')}`}
                </span>
              </div>
              {onResetFilters && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="shrink-0 text-amber-600 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
                >
                  {tx('清空筛选', 'Clear')}
                </button>
              )}
            </div>
          )}

          {allItems.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              {tx(
                '该类别暂无已注册组件实例。点击上方“新建”开始创建。',
                'No registered component instances in this category. Click New to create one.'
              )}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <p>
                {tx(
                  '未找到符合当前搜索条件的组件实例。',
                  'No component instances matched the active filter.'
                )}
              </p>
              {onResetFilters && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="mt-2 text-xs text-blue-500 hover:underline cursor-pointer"
                >
                  {tx('点击清空筛选', 'Click to clear filter')}
                </button>
              )}
            </div>
          ) : null}

          {filteredItems.map((comp) => {
            const isCustom = comp.source === 'custom';
            const isApplied = appliedId === comp.id;
            const isPreview = previewId === comp.id;
            const existingSandboxText =
              sandboxCategory?.files?.[comp.path] ?? sandboxCategory?.primary_content ?? '';
            const charDelta = comp.content.length - existingSandboxText.length;

            return (
              <div
                key={comp.id}
                className={`rounded-xl border p-3 ${
                  isCustom ? 'border-blue-500/30' : 'border-slate-200 dark:border-slate-800'
                } bg-white dark:bg-slate-900`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {comp.label}
                    </div>
                    <div
                      className="text-[11px] font-mono text-slate-400 truncate"
                      title={comp.path}
                    >
                      {comp.path}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      isCustom
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {isCustom ? tx('用户自定义', 'Custom') : tx('官方预设', 'Preset')}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                  {comp.description || tx('暂无说明描述', 'No description provided')}
                </p>

                {isPreview && (
                  <div className="mt-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        {tx('写入预览与沙箱 Diff 对比', 'Write & Sandbox Diff Preview')} ·{' '}
                        {targetSummary || tx('未选择目标', 'No target selected')}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold">
                        Δ {charDelta >= 0 ? `+${charDelta}` : charDelta} {tx('字符', 'chars')}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-500">
                      → {comp.path} · {comp.content.length} {tx('字符', 'chars')}
                      {comp.extra_files && Object.keys(comp.extra_files).length > 0
                        ? ` + ${Object.keys(comp.extra_files).length} ${tx('个附属文件', 'extra file(s)')}`
                        : ''}
                    </div>

                    {existingSandboxText ? (
                      <div className="max-h-44 overflow-auto rounded-lg bg-slate-950 p-2 font-mono text-[10px] leading-relaxed space-y-0.5">
                        {computeLineDiff(existingSandboxText, comp.content).map((line, idx) => (
                          <div
                            key={idx}
                            className={
                              line.type === 'add'
                                ? 'bg-emerald-500/15 text-emerald-300 px-1 rounded-xs'
                                : line.type === 'del'
                                  ? 'bg-rose-500/15 text-rose-300 px-1 rounded-xs'
                                  : 'text-slate-400 px-1'
                            }
                          >
                            {line.text}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <pre className="max-h-40 overflow-auto rounded-md bg-slate-950 text-slate-100 p-2 text-[11px] font-mono whitespace-pre-wrap">
                        {comp.content.slice(0, 1200)}
                        {comp.content.length > 1200 ? '\n…' : ''}
                      </pre>
                    )}

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewId(null)}
                        className="px-3 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        {tx('取消', 'Cancel')}
                      </button>
                      <button
                        type="button"
                        disabled={!canApply || applying}
                        onClick={() => {
                          onApply(comp);
                          setPreviewId(null);
                        }}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>
                          {applying ? tx('正在注入...', 'Injecting...') : tx('确认注入', 'Confirm inject')}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onCopy(comp)}
                      title={tx('复制组件代码', 'Copy component code')}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {copiedId === comp.id ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(comp)}
                      title={tx('查看与编辑', 'View & edit')}
                      className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {isCustom && (
                      <button
                        type="button"
                        onClick={() => onDelete(comp)}
                        title={tx('删除组件', 'Delete component')}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!canApply}
                    onClick={() => setPreviewId(isPreview ? null : comp.id)}
                    title={
                      canApply
                        ? ''
                        : tx(
                            '请先在顶部选择目标 Run 与 Task',
                            'Select a target Run and Task in the top bar first'
                          )
                    }
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 dark:bg-blue-900/20 dark:hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white rounded-xl text-xs font-semibold border border-blue-500/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isApplied ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                    <span>
                      {isApplied
                        ? tx('已注入 · 再次注入', 'Injected · again')
                        : tx('绑定到目标', 'Bind to target')}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}

          {previewComp === null && tpls.length > 0 && (
            <div className="pt-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-2">
                {tx('官方模板', 'Preset templates')}
              </h3>
              <div className="space-y-2">
                {tpls.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {tpl.label}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{tpl.description}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onFromTemplate(tpl)}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:border-blue-500/50 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{tx('定制', 'Customize')}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
