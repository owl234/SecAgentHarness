import React, { useEffect, useRef, useState } from 'react';
import { RunItem, LibraryEntry, TaskItem, HarnessSnapshot } from '../types';
import { fetchLibrary, fetchTasks, fetchTaskHarness } from '../api';
import {
  BookOpen,
  FileText,
  Shield,
  Brain,
  Wrench,
  Code2,
  Puzzle,
  Search,
  Sparkles,
  Bot,
  Zap,
  Terminal,
  Layers,
} from 'lucide-react';
import { useLang } from '../i18n/LangContext';

interface LibraryViewProps {
  runs: RunItem[];
  selectedRunId: string;
  onSelectRunId: (id: string) => void;
  selectedTaskId?: string;
  onSelectTaskId?: (taskId: string, replace?: boolean) => void;
  onNavigateToStudio?: () => void;
}

type InspectorTab =
  | 'systemprompt'
  | 'guardrails'
  | 'memory'
  | 'tools'
  | 'subagents'
  | 'skills'
  | 'plugins'
  | 'scripts';

export const LibraryView: React.FC<LibraryViewProps> = ({
  runs,
  selectedRunId,
  onSelectRunId,
  selectedTaskId,
  onSelectTaskId,
  onNavigateToStudio,
}) => {
  const { tx } = useLang();
  const [libraryEntries, setLibraryEntries] = useState<LibraryEntry[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [activeComponentTab, setActiveComponentTab] = useState<InspectorTab>('scripts');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [localTask, setLocalTask] = useState<string>('');
  const [harnessComponents, setHarnessComponents] = useState<HarnessSnapshot | null>(null);
  const [harnessLoading, setHarnessLoading] = useState(false);

  const activeTask = selectedTaskId || localTask;
  const setActiveTask = (taskId: string) => {
    setLocalTask(taskId);
    if (onSelectTaskId) {
      onSelectTaskId(taskId, true);
    }
  };

  const runReqId = useRef(0);
  const harnessReqId = useRef(0);

  // Fetch library experiences & tasks
  useEffect(() => {
    if (!selectedRunId) return;
    const reqId = ++runReqId.current;
    setSelectedDomain('all');

    fetchLibrary(selectedRunId)
      .then((entries) => {
        if (reqId === runReqId.current) {
          setLibraryEntries(entries);
        }
      })
      .catch((e) => console.error('Failed to load library:', e));

    fetchTasks(selectedRunId)
      .then((tList) => {
        if (reqId !== runReqId.current) return;
        setTasks(tList);
        if (tList.length > 0) {
          const exists = tList.some((t) => t.task_id === activeTask);
          if (!activeTask || !exists) {
            setActiveTask(tList[0].task_id);
          }
        } else {
          setActiveTask('');
          setHarnessComponents(null);
        }
      })
      .catch((e) => console.error('Failed to load tasks:', e));
  }, [selectedRunId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch harness components
  useEffect(() => {
    if (!selectedRunId || !activeTask) {
      setHarnessComponents(null);
      return;
    }
    const reqId = ++harnessReqId.current;
    setHarnessLoading(true);
    fetchTaskHarness(selectedRunId, activeTask, 'agg1')
      .catch(() => fetchTaskHarness(selectedRunId, activeTask, 'base'))
      .then((data) => {
        if (reqId === harnessReqId.current) {
          setHarnessComponents(data);
        }
      })
      .catch((e) => console.error('Failed to load harness components:', e))
      .finally(() => {
        if (reqId === harnessReqId.current) {
          setHarnessLoading(false);
        }
      });
  }, [selectedRunId, activeTask]);

  const domains = Array.from(new Set(libraryEntries.map((e) => e.domain)));
  const filteredEntries = libraryEntries.filter((e) => {
    const matchDomain = selectedDomain === 'all' || e.domain === selectedDomain;
    const matchSearch =
      !searchQuery ||
      e.cue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.lesson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.task_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDomain && matchSearch;
  });

  const componentTabs: { id: InspectorTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'systemprompt', label: tx('c1 提示词', 'c1 Prompt'), icon: FileText },
    { id: 'guardrails', label: tx('c2 护栏', 'c2 Guardrails'), icon: Shield },
    { id: 'memory', label: tx('c3 记忆', 'c3 Memory'), icon: Brain },
    { id: 'tools', label: tx('c4 工具指引', 'c4 Tool Guidance'), icon: Wrench },
    { id: 'subagents', label: tx('c5 子智能体', 'c5 Subagents'), icon: Bot },
    { id: 'skills', label: tx('c6 技能库', 'c6 Skills'), icon: Puzzle },
    { id: 'plugins', label: tx('c7 钩子', 'c7 Hooks'), icon: Zap },
    { id: 'scripts', label: tx('c8 独立脚本', 'c8 Scripts'), icon: Terminal },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
            <span>
              {tx(
                '跨任务持续经验库与套件全景 (Continual Learning & Component Library)',
                'Continual Learning Experience Library & 8-Component Inspector'
              )}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {tx(
              '套件级递归 (Harnessing-level recursion)：跨任务沉淀的经验池与可复用优化知识',
              'Harnessing-level recursion: cross-task distilled lessons, trigger cues, and runtime surface inspection'
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onNavigateToStudio && (
            <button
              type="button"
              onClick={onNavigateToStudio}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold border border-blue-500/20 transition-all cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{tx('进入组件工作室', 'Open Component Studio')}</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {tx('选择 Run:', 'Run:')}
            </span>
            <select
              value={selectedRunId}
              onChange={(e) => onSelectRunId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section 1: Continual Learning Experience Library */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {tx(
                `跨任务经验累积池 (${filteredEntries.length} 条经验)`,
                `Cross-Task Distilled Experience Pool (${filteredEntries.length})`
              )}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Domain Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {tx('领域:', 'Domain:')}
              </span>
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200"
              >
                <option value="all">
                  {tx(`全部领域 (${libraryEntries.length})`, `All Domains (${libraryEntries.length})`)}
                </option>
                {domains.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder={tx('搜索经验、情景或任务...', 'Search cues, lessons, or tasks...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500 w-52"
              />
            </div>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            {tx(
              '暂未检索到经验库沉淀条目（运行带采纳经验的任务后将在此汇聚）',
              'No experience entries found for this filter. Run tasks with adopted edits to populate the library.'
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEntries.map((entry, idx) => (
              <div
                key={`${entry.task_id}-${idx}`}
                className="bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-slate-700/80 p-5 rounded-2xl space-y-3 transition-all shadow-sm group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                    {entry.task_id}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 uppercase font-semibold">
                    {entry.domain}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold block text-[11px] mb-0.5">
                      {tx('触发情景 (Cue):', 'Trigger Cue:')}
                    </span>
                    <p className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 leading-relaxed">
                      {entry.cue || tx('未命名情景', 'Unnamed cue')}
                    </p>
                  </div>

                  <div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold block text-[11px] mb-0.5">
                      {tx('习得原则 (Lesson):', 'Distilled Lesson:')}
                    </span>
                    <p className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 leading-relaxed">
                      {entry.lesson || tx('未命名原则', 'Unnamed lesson')}
                    </p>
                  </div>

                  {entry.confidence && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex items-center justify-between">
                      <span>{tx('置信度:', 'Confidence:')}</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {entry.confidence}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: 8-Component Inspector */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Code2 className="w-4 h-4 text-indigo-500" />
              <span>
                {tx('八大组件全景审阅器 (8-Component Inspector)', '8-Component Runtime Harness Inspector')}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {tx(
                '提示词、护栏、记忆、工具指引、子智能体、技能、插件与脚本运行时全量映射',
                'Full inspection of prompts, guardrails, memory, tools, subagents, skills, hooks, and scripts'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {tx('查看任务:', 'Inspect Task:')}
            </span>
            <select
              value={activeTask}
              onChange={(e) => setActiveTask(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-slate-200 font-medium"
            >
              {tasks.map((t) => (
                <option key={t.task_id} value={t.task_id}>
                  {t.task_id}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 8-Component Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/50 rounded-xl p-1 overflow-x-auto gap-1">
          {componentTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeComponentTab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveComponentTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Component Content Display */}
        <div className="bg-slate-950 text-slate-200 rounded-2xl p-4 font-mono text-xs max-h-96 overflow-y-auto border border-slate-800 leading-relaxed whitespace-pre-wrap">
          {harnessLoading ? (
            tx('正在加载组件数据...', 'Loading harness surface files...')
          ) : harnessComponents ? (
            activeComponentTab === 'systemprompt' ? (
              harnessComponents.systemprompt || tx('（空系统提示词）', '(Empty system prompt)')
            ) : activeComponentTab === 'guardrails' ? (
              harnessComponents.guardrails || tx('（空安全护栏）', '(Empty guardrails)')
            ) : activeComponentTab === 'memory' ? (
              harnessComponents.memory || tx('（空长期记忆）', '(Empty long-term memory)')
            ) : activeComponentTab === 'tools' ? (
              harnessComponents.tool_guidance || tx('（空工具指引）', '(Empty tool guidance)')
            ) : activeComponentTab === 'subagents' ? (
              Object.keys(harnessComponents.subagents || {}).length > 0 ? (
                Object.entries(harnessComponents.subagents || {}).map(([sname, content]) => (
                  <div key={sname} className="mb-4">
                    <div className="text-indigo-400 font-bold mb-1 border-b border-slate-800 pb-1">
                      # sub_agents/{sname}/AGENT.md
                    </div>
                    <div>
                      {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
                    </div>
                  </div>
                ))
              ) : (
                tx('（无子智能体）', '(No subagents defined)')
              )
            ) : activeComponentTab === 'skills' ? (
              Object.keys(harnessComponents.skills || {}).length > 0 ? (
                Object.entries(harnessComponents.skills || {}).map(([sname, sfiles]) => (
                  <div key={sname} className="mb-4">
                    <div className="text-cyan-400 font-bold mb-1 border-b border-slate-800 pb-1">
                      # skills/{sname}
                    </div>
                    {typeof sfiles === 'object' && sfiles !== null ? (
                      Object.entries(sfiles).map(([fn, fc]) => (
                        <div key={fn} className="mt-1">
                          <span className="text-slate-400">--- {fn} ---</span>
                          <div>{fc}</div>
                        </div>
                      ))
                    ) : (
                      <div>{String(sfiles)}</div>
                    )}
                  </div>
                ))
              ) : (
                tx('（无独立技能目录）', '(No standalone skills defined)')
              )
            ) : activeComponentTab === 'plugins' ? (
              Object.keys(harnessComponents.plugins || {}).length > 0 ? (
                Object.entries(harnessComponents.plugins || {}).map(([pname, content]) => (
                  <div key={pname} className="mb-4">
                    <div className="text-rose-400 font-bold mb-1 border-b border-slate-800 pb-1">
                      # plugins/{pname}
                    </div>
                    <div>{content}</div>
                  </div>
                ))
              ) : (
                tx('（无事件钩子/插件）', '(No event hooks or plugins)')
              )
            ) : activeComponentTab === 'scripts' ? (
              Object.keys(harnessComponents.scripts || {}).length > 0 ? (
                Object.entries(harnessComponents.scripts || {}).map(([fname, content]) => (
                  <div key={fname} className="mb-4">
                    <div className="text-emerald-400 font-bold mb-1 border-b border-slate-800 pb-1">
                      # scripts/{fname}
                    </div>
                    <div>{content}</div>
                  </div>
                ))
              ) : (
                tx('（无额外脚本）', '(No helper scripts)')
              )
            ) : (
              tx('（无内容）', '(No content)')
            )
          ) : (
            tx('暂无可展示的套件组件', 'No harness component snapshot available')
          )}
        </div>
      </div>
    </div>
  );
};
