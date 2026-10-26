import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Terminal,
  Copy,
  Trash2,
  Maximize2,
  Minimize2,
  Search,
  Check,
  Pause,
  Play,
} from 'lucide-react';
import { useLang } from '../../i18n/LangContext';

interface EmbeddedLiveTerminalProps {
  logs: string[];
  isRunning: boolean;
  onClearLogs?: () => void;
  currentStepTitle?: string;
}

export const EmbeddedLiveTerminal: React.FC<EmbeddedLiveTerminalProps> = ({
  logs,
  isRunning,
  onClearLogs,
  currentStepTitle,
}) => {
  const { tx } = useLang();
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterLevel, setFilterLevel] = useState<'all' | 'stage' | 'error' | 'warn'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic
  useEffect(() => {
    if (!autoScroll) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const rafId = window.requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [logs, autoScroll]);

  // Filter logs based on level and search query
  const filteredLogs = useMemo(() => {
    return logs.filter((line) => {
      // 1. Level filter
      if (filterLevel === 'error') {
        const lower = line.toLowerCase();
        if (!lower.includes('error') && !lower.includes('failed') && !lower.includes('exception') && !lower.includes('fatal')) {
          return false;
        }
      } else if (filterLevel === 'warn') {
        const lower = line.toLowerCase();
        if (!lower.includes('warn') && !lower.includes('warning')) {
          return false;
        }
      } else if (filterLevel === 'stage') {
        const lower = line.toLowerCase();
        if (!lower.includes('[stage') && !lower.includes('step') && !lower.includes('stage_') && !lower.includes('===')) {
          return false;
        }
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        return line.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [logs, filterLevel, searchQuery]);

  const handleCopy = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-950 flex flex-col overflow-hidden transition-all duration-300 shadow-lg ${
        isExpanded
          ? 'fixed inset-6 z-50 shadow-2xl ring-2 ring-blue-500/50'
          : 'relative w-full flex-1 min-h-[340px] max-h-[480px]'
      }`}
    >
      {/* 1. Terminal Top Bar */}
      <div className="flex flex-wrap items-center justify-between px-3.5 py-2 bg-slate-900/90 border-b border-slate-800/80 gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-xs font-bold text-slate-200">
            {tx('实时执行终端流', 'Live Execution Stream')}
          </span>

          {isRunning ? (
            <span className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              LIVE
            </span>
          ) : (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              IDLE
            </span>
          )}

          {currentStepTitle && (
            <span className="text-[10px] text-blue-300/80 font-mono hidden md:inline truncate max-w-[200px]">
              [{currentStepTitle}]
            </span>
          )}
        </div>

        {/* Filter & Action Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Level Filter Tabs */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono">
            {(['all', 'stage', 'warn', 'error'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setFilterLevel(lvl)}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer uppercase ${
                  filterLevel === lvl
                    ? lvl === 'error'
                      ? 'bg-rose-900/70 text-rose-200 font-bold'
                      : lvl === 'warn'
                      ? 'bg-amber-900/70 text-amber-200 font-bold'
                      : 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="relative hidden sm:block">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tx('过滤日志...', 'Filter...')}
              className="bg-slate-950 text-slate-200 placeholder-slate-600 text-[10px] font-mono px-2 py-1 pl-6 rounded-lg border border-slate-800 focus:outline-none focus:border-blue-500 w-24 focus:w-36 transition-all"
            />
            <Search className="w-3 h-3 text-slate-500 absolute left-1.5 top-1.5" />
          </div>

          {/* Auto Scroll Toggle */}
          <button
            type="button"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
              autoScroll
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                : 'text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
            title={autoScroll ? tx('点击暂停滚屏', 'Pause auto-scroll') : tx('点击恢复自动滚屏', 'Enable auto-scroll')}
          >
            {autoScroll ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Copy Logs */}
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors cursor-pointer"
            title={tx('复制全部日志', 'Copy logs')}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Clear Logs */}
          {onClearLogs && (
            <button
              type="button"
              onClick={onClearLogs}
              className="p-1.5 text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg border border-slate-800 transition-colors cursor-pointer"
              title={tx('清空日志', 'Clear logs')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Expand / Minimize Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors cursor-pointer ml-1"
            title={isExpanded ? tx('缩小视窗', 'Minimize') : tx('全屏放大', 'Expand')}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. Terminal Log Body */}
      <div
        ref={scrollContainerRef}
        className="flex-1 p-3 overflow-y-auto font-mono text-[11px] leading-relaxed bg-slate-950 text-slate-300 select-text scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2 select-none">
            <Terminal className="w-6 h-6 text-slate-700" />
            <span>
              {logs.length === 0
                ? tx('终端待命中 · 启动任务后将在此输出实时标准输出与沙箱探针流', 'Terminal waiting for job launch...')
                : tx('未匹配到符合过滤条件的日志', 'No matching logs for current filter')}
            </span>
          </div>
        ) : (
          filteredLogs.map((line, idx) => {
            const lower = line.toLowerCase();
            let color = 'text-slate-300';
            let prefixBg = '';

            if (lower.includes('error:') || lower.includes('failed') || lower.includes('exception')) {
              color = 'text-rose-400 font-semibold';
              prefixBg = 'bg-rose-950/20';
            } else if (lower.includes('ok') || lower.includes('success') || lower.includes('pass')) {
              color = 'text-emerald-400';
            } else if (lower.includes('warning') || lower.includes('warn:')) {
              color = 'text-amber-400';
            } else if (line.startsWith('===') || lower.includes('[stage') || lower.includes('[step')) {
              color = 'text-sky-300 font-bold';
              prefixBg = 'bg-sky-950/30';
            } else if (lower.includes('docker') || lower.includes('exec') || line.startsWith('$')) {
              color = 'text-purple-300';
            }

            return (
              <div
                key={idx}
                className={`py-0.5 px-1.5 rounded hover:bg-slate-900/60 transition-colors flex items-start gap-2 ${prefixBg}`}
              >
                <span className="text-slate-600 text-[10px] select-none shrink-0 w-8 text-right font-mono">
                  {idx + 1}
                </span>
                <span className={`break-all ${color}`}>{line}</span>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Terminal Footer status bar */}
      <div className="px-3.5 py-1.5 bg-slate-900/70 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono shrink-0">
        <div className="flex items-center gap-3">
          <span>{tx(`共 ${logs.length} 行`, `Total ${logs.length} lines`)}</span>
          {searchQuery && (
            <span className="text-blue-400">
              {tx(`匹配 ${filteredLogs.length} 行`, `${filteredLogs.length} matches`)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
          <span>UTF-8 / Sandbox PTY</span>
        </div>
      </div>
    </div>
  );
};
