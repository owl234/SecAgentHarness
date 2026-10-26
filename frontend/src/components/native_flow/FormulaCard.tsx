import React, { useState, useMemo } from 'react';
import katex from 'katex';
import { Copy, Check, Sparkles, BookOpen, Code, Eye } from 'lucide-react';

interface FormulaCardProps {
  formula: string;
  explanationZh?: string;
  explanationEn?: string;
  lang?: 'zh' | 'en';
}

/**
 * 现代化 KaTeX 学术级数学与状态转移方程渲染卡片
 * 支持 KaTeX 高精排版、暗黑/日间自适应、一键复制 LaTeX 源码与白话推导释义
 */
export const FormulaCard: React.FC<FormulaCardProps> = ({
  formula,
  explanationZh,
  explanationEn,
  lang = 'zh',
}) => {
  const isZh = lang === 'zh';
  const [copied, setCopied] = useState(false);
  const [showRawLatex, setShowRawLatex] = useState(false);

  // 预编译 KaTeX HTML 结构
  const mathHtml = useMemo(() => {
    try {
      return katex.renderToString(formula, {
        displayMode: true,
        throwOnError: false,
        strict: false,
      });
    } catch (err) {
      console.error('KaTeX rendering error:', err);
      return null;
    }
  }, [formula]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formula);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Clipboard copy failed:', e);
    }
  };

  const explanation = isZh ? explanationZh : explanationEn;

  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-slate-50 via-sky-50/20 to-slate-100/60 dark:from-slate-900/90 dark:via-slate-900/95 dark:to-slate-950 border border-slate-200/90 dark:border-cyan-500/30 p-4 shadow-sm dark:shadow-xl space-y-3 transition-colors duration-200">
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 dark:border-slate-800/80 pb-2">
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-cyan-400 font-bold text-xs">
          <Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-cyan-400" />
          <span className="font-mono uppercase tracking-wider text-[11px]">
            {isZh ? '数学 / 状态转移方程' : 'State Transition Formula'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Toggle LaTeX Source vs Rendered */}
          <button
            type="button"
            onClick={() => setShowRawLatex((prev) => !prev)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isZh ? '切换 LaTeX 源码' : 'Toggle LaTeX Source'}
          >
            {showRawLatex ? <Eye className="w-3 h-3" /> : <Code className="w-3 h-3" />}
            <span>{showRawLatex ? (isZh ? '渲染' : 'Render') : 'LaTeX'}</span>
          </button>

          {/* Copy LaTeX button */}
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
              copied
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
            title={isZh ? '复制 LaTeX 公式源码' : 'Copy LaTeX Formula'}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span>{isZh ? '已复制' : 'Copied'}</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>{isZh ? '复制' : 'Copy'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Formula Canvas / Render Container */}
      <div className="rounded-xl bg-white/80 dark:bg-slate-950/90 border border-slate-200/80 dark:border-slate-800/80 p-3 overflow-x-auto flex items-center justify-center min-h-[56px]">
        {showRawLatex ? (
          <code className="text-blue-700 dark:text-cyan-300 font-mono text-xs block whitespace-pre-wrap break-all w-full select-all">
            {formula}
          </code>
        ) : mathHtml ? (
          <div
            className="text-slate-900 dark:text-cyan-200 text-sm max-w-full overflow-x-auto py-1"
            dangerouslySetInnerHTML={{ __html: mathHtml }}
          />
        ) : (
          <code className="text-blue-700 dark:text-cyan-300 font-mono text-xs block whitespace-pre-wrap break-all w-full">
            {formula}
          </code>
        )}
      </div>

      {/* 3. Plain-Text Semantic Explanation */}
      {explanation && (
        <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-slate-950/70 border border-blue-100 dark:border-cyan-500/20 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
          <BookOpen className="w-3.5 h-3.5 text-blue-500 dark:text-cyan-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="font-bold text-slate-700 dark:text-cyan-300 mr-1">
              {isZh ? '推导释义：' : 'Intuition:'}
            </span>
            <span>{explanation}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormulaCard;
