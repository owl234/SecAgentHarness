import React, { useState } from 'react';
import {
  Code2,
  Edit3,
  Folder,
  Terminal,
  Trash2,
  CheckCircle2,
  X,
} from 'lucide-react';
import { ComponentCategory, HarnessComponent } from '../../types';
import { CATEGORY_META } from './categoryMeta';
import { useLang } from '../../i18n/LangContext';
import { useEscapeKey } from '../ui/ToastContext';

interface ComponentEditorModalProps {
  isOpen: boolean;
  editingComp: Partial<HarnessComponent> | null;
  saving: boolean;
  onClose: () => void;
  onChange: React.Dispatch<React.SetStateAction<Partial<HarnessComponent> | null>>;
  onSave: () => void;
}

export const ComponentEditorModal: React.FC<ComponentEditorModalProps> = ({
  isOpen,
  editingComp,
  saving,
  onClose,
  onChange,
  onSave,
}) => {
  const { tx } = useLang();
  const [editorActiveTab, setEditorActiveTab] = useState<'meta' | 'code' | 'extra'>('code');

  useEscapeKey(onClose, isOpen);

  if (!isOpen || !editingComp) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingComp.id
                  ? tx('编辑与调优 Harness 组件', 'Edit & Tune Harness Component')
                  : tx('设计新 Harness 组件', 'Design New Harness Component')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tx(
                  '遵循 Harness² c1~c9 契约规范，具备自动语法校验与文件相对路径保护',
                  'Conforms to Harness² c1..c9 surface contract with relative path sandboxing'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-4 px-6 pt-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
          <button
            type="button"
            onClick={() => setEditorActiveTab('code')}
            className={`pb-2.5 font-semibold transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
              editorActiveTab === 'code'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>{tx('核心指令与代码', 'Main Content')}</span>
          </button>

          <button
            type="button"
            onClick={() => setEditorActiveTab('meta')}
            className={`pb-2.5 font-semibold transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
              editorActiveTab === 'meta'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>{tx('元数据与装配路径', 'Metadata & Surface Path')}</span>
          </button>

          <button
            type="button"
            onClick={() => setEditorActiveTab('extra')}
            className={`pb-2.5 font-semibold transition-all cursor-pointer border-b-2 flex items-center gap-1.5 ${
              editorActiveTab === 'extra'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>{tx('配套可执行脚本', 'Extra Companion Files')}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {editorActiveTab === 'meta' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {tx('组件分类 (c1..c9)', 'Component Category (c1..c9)')}
                </label>
                <select
                  value={editingComp.category || 'c6'}
                  onChange={(e) => {
                    const newCat = e.target.value as ComponentCategory;
                    const meta = CATEGORY_META[newCat];
                    onChange((prev) => ({
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
                  {tx('标识符名称 (Regex: [a-z0-9_-])', 'Identifier Name (Regex: [a-z0-9_-])')}
                </label>
                <input
                  type="text"
                  value={editingComp.name || ''}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
                    onChange((prev) => {
                      const meta = CATEGORY_META[prev?.category || 'c6'];
                      return {
                        ...prev,
                        name: val,
                        path: meta.defaultPath.replace('{name}', val),
                      };
                    });
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono"
                  placeholder={tx('如: data_cleaner, arch_reviewer', 'e.g. data_cleaner, arch_reviewer')}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {tx('展示标题', 'Display Title (Human Label)')}
                </label>
                <input
                  type="text"
                  value={editingComp.label || ''}
                  onChange={(e) => onChange((prev) => ({ ...prev, label: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  placeholder={tx('如: 交易流水数据清洗技能手册', 'e.g. Ledger Data Cleaning Playbook')}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {tx('挂载目标相对路径', 'Target Relative Surface Path')}
                </label>
                <input
                  type="text"
                  value={editingComp.path || ''}
                  onChange={(e) => onChange((prev) => ({ ...prev, path: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono"
                  placeholder="skills/data_cleaner/SKILL.md"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {tx(
                    '必须在受控 Harness 表面路径内，严禁超出目标 Harness 根目录。',
                    'Must reside within the controlled harness surface directory (no .. traversal).'
                  )}
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {tx('详细功能概述', 'Functional Description')}
                </label>
                <textarea
                  rows={3}
                  value={editingComp.description || ''}
                  onChange={(e) => onChange((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white resize-none"
                  placeholder={tx(
                    '解释该组件的解决痛点、适用评测场景与预期行为约束...',
                    'Describe the target failure mode, domain applicability, and behavioral constraints...'
                  )}
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
                    {editingComp.content?.length || 0} {tx('字符', 'chars')}
                  </span>
                </div>
                <span>
                  {tx(
                    '支持标准 Markdown、Frontmatter 与 Python/TS 混入',
                    'Supports Markdown, YAML Frontmatter, Python & TypeScript'
                  )}
                </span>
              </div>

              <div className="relative">
                <textarea
                  rows={16}
                  value={editingComp.content || ''}
                  onChange={(e) => onChange((prev) => ({ ...prev, content: e.target.value }))}
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
                    {tx('伴随脚本与附加文件', 'Companion Scripts & Extra Assets')}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {tx(
                      '针对技能组件 (c6) 的 scripts/*.py 或其它辅助运行资源',
                      'Optional helper scripts (e.g. skills/<name>/scripts/*.py) bundled with this component'
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const name = editingComp.name || 'comp';
                    const extraKey = `skills/${name}/scripts/run_${Date.now() % 1000}.py`;
                    onChange((prev) => ({
                      ...prev,
                      extra_files: {
                        ...(prev?.extra_files || {}),
                        [extraKey]: '#!/usr/bin/env python3\nprint("Helper ready.")\n',
                      },
                    }));
                  }}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium cursor-pointer"
                >
                  {tx('+ 添加伴随脚本', '+ Add Companion Script')}
                </button>
              </div>

              {!editingComp.extra_files || Object.keys(editingComp.extra_files).length === 0 ? (
                <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400">
                  {tx(
                    '暂无附加文件。对于独立组件（如提示词、护栏），通常无需此项。',
                    'No extra companion files attached. Standalone components (prompts, guardrails) do not require extra files.'
                  )}
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
                        type="button"
                        onClick={() => {
                          const updated = { ...(editingComp.extra_files || {}) };
                          delete updated[filePath];
                          onChange((prev) => ({ ...prev, extra_files: updated }));
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
                        onChange((prev) => ({ ...prev, extra_files: updated }));
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
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {tx('取消', 'Cancel')}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <span>{tx('保存中...', 'Saving...')}</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{tx('保存并生效组件', 'Save Component')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
