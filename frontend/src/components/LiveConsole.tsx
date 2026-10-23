import React, { useEffect, useRef, useState } from 'react';
import { Terminal, X, Copy, Trash2, ArrowDown, Square } from 'lucide-react';
import { stopExecution } from '../api';
import { useLang } from '../i18n/LangContext';
import { useEscapeKey } from './ui/ToastContext';

interface LiveConsoleProps {
  logs: string[];
  isOpen: boolean;
  onClose: () => void;
  isRunning: boolean;
  onClear: () => void;
}

export const LiveConsole: React.FC<LiveConsoleProps> = ({
  logs,
  isOpen,
  onClose,
  isRunning,
  onClear,
}) => {
  const { t } = useLang();
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEscapeKey(onClose, isOpen);

  useEffect(() => {
    if (!isOpen || !autoScroll) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const rafId = window.requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [logs, autoScroll, isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStop = async () => {
    try {
      await stopExecution();
    } catch (e) {
      console.error(t('api.stop'), e);
    }
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-full max-w-2xl bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col transition-all duration-200 ring-1 ring-white/10"
      role="region"
      aria-label={t('console.title')}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-xs text-slate-200">
            {t('console.title')}
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            ({logs.length})
          </span>
          {isRunning && (
            <span className="flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              {t('console.running')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {isRunning && (
            <button
              type="button"
              onClick={handleStop}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 rounded-lg border border-rose-500/30 transition-colors cursor-pointer"
              title={t('console.stop_title')}
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>{t('console.stop')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
              autoScroll
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                : 'text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
            title={t('console.autoscroll')}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title={t('console.copy')}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClear}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title={t('console.clear')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors ml-1 cursor-pointer"
            aria-label="Close console"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Log body */}
      <div
        ref={scrollContainerRef}
        className="h-80 p-3 overflow-y-auto font-mono text-[11px] leading-relaxed bg-black/60 text-slate-300 select-text"
      >
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600">
            {t('console.empty')}
          </div>
        ) : (
          logs.map((line, idx) => {
            let color = 'text-slate-300';
            if (line.includes('error:') || line.includes('Error:') || line.includes('failed')) {
              color = 'text-rose-400 font-semibold';
            } else if (line.includes('ok') || line.includes('completed')) {
              color = 'text-emerald-400';
            } else if (line.includes('warning') || line.includes('warn:')) {
              color = 'text-amber-400';
            } else if (line.startsWith('#') || line.startsWith('sweep')) {
              color = 'text-cyan-400 font-medium';
            }

            return (
              <div key={idx} className={`whitespace-pre-wrap break-all ${color}`}>
                {line}
              </div>
            );
          })
        )}
      </div>

      {copied && (
        <div className="absolute top-12 right-6 px-2.5 py-1 bg-blue-600 text-white text-xs rounded shadow-lg">
          {t('console.copied')}
        </div>
      )}
    </div>
  );
};
