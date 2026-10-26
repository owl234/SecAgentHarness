import React, { useMemo, useState } from 'react';
import {
  Code2,
  Folder,
  Terminal,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { ComponentCategory, HarnessComponent } from '../../types';
import { CATEGORY_META } from './categoryMeta';
import { useLang } from '../../i18n/LangContext';

interface ComponentInlineEditorProps {
  editingComp: Partial<HarnessComponent>;
  onChange: React.Dispatch<React.SetStateAction<Partial<HarnessComponent> | null>>;
}

interface ContractCheckResult {
  ok: boolean;
  labelZh: string;
  labelEn: string;
}

function evaluateContractChecks(
  cat: ComponentCategory,
  content: string,
  path: string
): ContractCheckResult[] {
  const checks: ContractCheckResult[] = [];
  const trimmed = (content || '').trim();
  const safePath = Boolean(path && !path.includes('..') && !path.startsWith('/'));

  checks.push({
    ok: safePath,
    labelZh: safePath ? '挂载路径符合受控沙箱表面规范' : '挂载路径不可包含 .. 或绝对路径',
    labelEn: safePath ? 'Surface path is sandbox-safe' : 'Path must be relative without ..',
  });

  if (cat === 'c6') {
    const hasFrontmatter = /^---\s*\n[\s\S]*?(name\s*:|description\s*:)[\s\S]*?\n---/.test(trimmed);
    checks.push({
      ok: hasFrontmatter,
      labelZh: hasFrontmatter
        ? '已包含标准 YAML Frontmatter (name/description)'
        : '建议在首部添加 --- name / description --- Frontmatter',
      labelEn: hasFrontmatter
        ? 'Valid YAML Frontmatter detected'
        : 'Recommend adding --- name / description --- YAML Frontmatter',
    });
  } else if (cat === 'c9') {
    let validJson = false;
    try {
      const parsed = JSON.parse(trimmed || '{}');
      validJson = typeof parsed === 'object' && parsed !== null;
    } catch {
      validJson = false;
    }
    checks.push({
      ok: validJson,
      labelZh: validJson ? 'JSON Schema 语法校验通过' : 'MCP 配置需为合法 JSON 格式',
      labelEn: validJson ? 'Valid JSON syntax' : 'MCP config must be valid JSON',
    });
  } else if (cat === 'c7' || cat === 'c8') {
    const hasCodeConstruct = /(def\s+\w+|import\s+\w+|export\s+|function\s+\w+|=>)/.test(trimmed);
    checks.push({
      ok: hasCodeConstruct,
      labelZh: hasCodeConstruct ? '已检测到可执行函数/模块入口' : '建议包含明确的函数或钩子签名入口',
      labelEn: hasCodeConstruct ? 'Executable function/hook signature detected' : 'Recommend adding function/hook entrypoint',
    });
  } else {
    const hasHeading = /^#+\s+\S+/m.test(trimmed) || trimmed.length > 20;
    checks.push({
      ok: hasHeading,
      labelZh: hasHeading ? '结构化指令段落完备' : '建议使用 Markdown 标题组织指令层次',
      labelEn: hasHeading ? 'Structured markdown directives detected' : 'Recommend Markdown headings for clarity',
    });
  }

  return checks;
}

/** Tabbed component editor rendered inline inside the studio drawer with live contract & quota validation. */
export const ComponentInlineEditor: React.FC<ComponentInlineEditorProps> = ({
  editingComp,
  onChange,
}) => {
  const { lang, tx } = useLang();
  const isZh = lang === 'zh';
  const [editorActiveTab, setEditorActiveTab] = useState<'meta' | 'code' | 'extra'>('code');

  const cat: ComponentCategory = (editingComp.category as ComponentCategory) || 'c6';
  const meta = CATEGORY_META[cat];
  const charCount = editingComp.content?.length || 0;
  const quota = meta.quotaChars || 4000;
  const quotaRatio = Math.min((charCount / quota) * 100, 100);
  const isOverQuota = charCount > quota;
  const isNearQuota = charCount > quota * 0.85 && !isOverQuota;

  const contractChecks = useMemo(
    () => evaluateContractChecks(cat, editingComp.content || '', editingComp.path || ''),
    [cat, editingComp.content, editingComp.path]
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Live Quota & Contract Conservation Bar */}
      <div className="px-4 py-2.5 bg-slate-50/90 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>{tx('字符配额与契约守恒校验', 'Quota & Contract Conservation')}</span>
          </span>
          <span
            className={`font-mono font-bold ${
              isOverQuota
                ? 'text-rose-600 dark:text-rose-400'
                : isNearQuota
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {charCount.toLocaleString()} / {quota.toLocaleString()} {tx('字符', 'chars')}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            style={{ width: `${quotaRatio}%` }}
            className={`h-full transition-all duration-200 ${
              isOverQuota ? 'bg-rose-500' : isNearQuota ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />
        </div>

        {/* Contract Check Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {contractChecks.map((chk, idx) => (
            <span
              key={idx}
              className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border ${
                chk.ok
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25'
              }`}
            >
              {chk.ok ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
              )}
              <span>{isZh ? chk.labelZh : chk.labelEn}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Editor Sub-Tabs */}
      <div className="flex items-center gap-4 px-4 pt-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
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

      <div className="p-4 overflow-y-auto flex-1 space-y-4">
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
                  const newMeta = CATEGORY_META[newCat];
                  onChange((prev) => ({
                    ...prev,
                    category: newCat,
                    type: `${newCat}_custom`,
                    path: newMeta.defaultPath.replace('{name}', prev?.name || 'custom'),
                  }));
                }}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              >
                {(Object.keys(CATEGORY_META) as ComponentCategory[]).map((c) => (
                  <option key={c} value={c}>
                    {c.toUpperCase()}: {CATEGORY_META[c].cnName} ({CATEGORY_META[c].name})
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
                    const m = CATEGORY_META[prev?.category || 'c6'];
                    return {
                      ...prev,
                      name: val,
                      path: m.defaultPath.replace('{name}', val),
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
                  {charCount} {tx('字符', 'chars')}
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
                rows={15}
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
    </div>
  );
};
