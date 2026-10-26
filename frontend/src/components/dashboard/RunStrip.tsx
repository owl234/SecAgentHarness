import React, { useMemo, useState } from 'react';
import { Search, CheckCircle2 } from 'lucide-react';
import { RunItem } from '../../types';
import { useLang } from '../../i18n/LangContext';

interface RunStripProps {
  runs: RunItem[];
  selectedRunId: string;
  onSelectRunId: (id: string) => void;
}

type TypeFilter = 'all' | 'demo' | 'adapt' | 'sweep';

/** Display label per run type: adapt = per-run artifacts, sweep = batch summary JSON. */
const typeLabel = (type: RunItem['type'], tx: (zh: string, en?: string) => string) =>
  type === 'demo'
    ? tx('演示', 'Demo')
    : type === 'adapt'
    ? tx('演进运行', 'Adapt')
    : type === 'sweep'
    ? tx('批次汇总', 'Sweep')
    : type;

/** Horizontal run picker: search + type filter + scrollable run chips. */
export const RunStrip: React.FC<RunStripProps> = ({ runs, selectedRunId, onSelectRunId }) => {
  const { tx } = useLang();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return runs.filter((r) => {
      const matchQ =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.domain || '').toLowerCase().includes(q);
      const matchT = typeFilter === 'all' || r.type === typeFilter;
      return matchQ && matchT;
    });
  }, [runs, query, typeFilter]);

  return (
    <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-3 flex items-center gap-3">
      <div className="flex flex-col gap-2 shrink-0 w-56">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tx('搜索 Run 标识或名称...', 'Search Run ID or name...')}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(
            [
              { id: 'all', label: tx('全部', 'All') },
              { id: 'demo', label: tx('演示', 'Demo') },
              { id: 'adapt', label: tx('演进运行', 'Adapt') },
              { id: 'sweep', label: tx('批次汇总', 'Sweep') },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeFilter(tab.id)}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium cursor-pointer transition-colors ${
                typeFilter === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <span className="text-[10px] text-slate-400 ml-auto">{filtered.length}</span>
        </div>
      </div>

      <div className="flex-1 min-w-0 flex gap-2 overflow-x-auto pb-1">
        {filtered.length === 0 ? (
          <div className="text-xs text-slate-400 py-4 px-2">
            {tx('未找到匹配的运行记录', 'No matching runs found')}
          </div>
        ) : (
          filtered.map((r) => {
            const selected = r.id === selectedRunId;
            const rate = r.task_count > 0 ? Math.round((r.completed_count / r.task_count) * 100) : 0;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onSelectRunId(r.id)}
                className={`shrink-0 w-48 text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                  selected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-500/40 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{r.name}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 ${
                      r.type === 'demo'
                        ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                        : r.type === 'adapt'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                    }`}
                  >
                    {typeLabel(r.type, tx)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    {r.completed_count}/{r.task_count} ({rate}%)
                  </span>
                  {r.failed_count > 0 && (
                    <span className="text-rose-500 text-[10px]">
                      {tx(`失败 ${r.failed_count}`, `Fail ${r.failed_count}`)}
                    </span>
                  )}
                </div>
                {r.updated_at && (
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {r.updated_at.slice(5, 16).replace('T', ' ')}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
