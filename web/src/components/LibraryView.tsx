import React, { useEffect, useState } from 'react';
import { RunItem, LibraryEntry } from '../types';
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
  ArrowRight,
  Layers,
} from 'lucide-react';

interface LibraryViewProps {
  runs: RunItem[];
  selectedRunId: string;
  onSelectRunId: (id: string) => void;
  onNavigateToStudio?: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  runs,
  selectedRunId,
  onSelectRunId,
  onNavigateToStudio,
}) => {
  const [libraryEntries, setLibraryEntries] = useState<LibraryEntry[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 8-Component Inspector States
  const [activeComponentTab, setActiveComponentTab] = useState<
    'systemprompt' | 'guardrails' | 'memory' | 'tools' | 'subagents' | 'skills' | 'plugins' | 'scripts'
  >('scripts');

  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [harnessComponents, setHarnessComponents] = useState<any>(null);

  // Fetch library experiences
  useEffect(() => {
    if (!selectedRunId) return;
    fetchLibrary(selectedRunId)
      .then((entries) => setLibraryEntries(entries))
      .catch((e) => console.error('获取经验库失败 (Failed to load library):', e));

    fetchTasks(selectedRunId)
      .then((tList) => {
        setTasks(tList);
        if (tList.length > 0) {
          setSelectedTask(tList[0].task_id);
        }
      })
      .catch((e) => console.error('获取任务列表失败 (Failed to load tasks):', e));
  }, [selectedRunId]);

  // Fetch harness components
  useEffect(() => {
    if (!selectedRunId || !selectedTask) return;
    fetchTaskHarness(selectedRunId, selectedTask, 'agg1')
      .catch(() => fetchTaskHarness(selectedRunId, selectedTask, 'base'))
      .then((data) => setHarnessComponents(data))
      .catch((e) => console.error('获取套件失败 (Failed to load harness components):', e));
  }, [selectedRunId, selectedTask]);

  // Filtered domains
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
            <span>跨任务持续经验库与套件全景 (Continual Learning & Component Library)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            套件级递归 (Harnessing-level recursion)：跨任务沉淀的经验池与可复用优化知识
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onNavigateToStudio && (
            <button
              onClick={onNavigateToStudio}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold border border-blue-500/20 transition-all cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>进入组件工作室</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">选择 Run:</span>
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
              跨任务经验累积池 ({filteredEntries.length} 条经验)
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {/* Domain Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 dark:text-slate-400">领域:</span>
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200"
              >
                <option value="all">全部领域 ({libraryEntries.length})</option>
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
                placeholder="搜索经验、情景或任务..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500 w-48"
              />
            </div>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            暂未检索到经验库沉淀条目（运行带采纳经验的任务后将在此汇聚）
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEntries.map((entry, idx) => (
              <div
                key={idx}
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
                      触发情景 (Cue):
                    </span>
                    <p className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 leading-relaxed">
                      {entry.cue || '未命名情景'}
                    </p>
                  </div>

                  <div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold block text-[11px] mb-0.5">
                      习得原则 (Lesson):
                    </span>
                    <p className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 leading-relaxed">
                      {entry.lesson || '未命名原则'}
                    </p>
                  </div>

                  {entry.confidence && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 flex items-center justify-between">
                      <span>置信度:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">{entry.confidence}</span>
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
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Code2 className="w-4 h-4 text-indigo-500" />
              <span>八大组件全景审阅器 (8-Component Inspector)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              提示词、护栏、记忆、工具指引、子智能体、技能、插件与脚本运行时全量映射
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">查看任务:</span>
            <select
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
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
          <button
            onClick={() => setActiveComponentTab('systemprompt')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeComponentTab === 'systemprompt'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>c1 提示词</span>
          </button>

          <button
            onClick={() => setActiveComponentTab('guardrails')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeComponentTab === 'guardrails'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>c2 护栏</span>
          </button>

          <button
            onClick={() => setActiveComponentTab('memory')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeComponentTab === 'memory'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>c3 记忆</span>
          </button>

          <button
            onClick={() => setActiveComponentTab('tools')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeComponentTab === 'tools'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>c4 工具指引</span>
          </button>

          <button
            onClick={() => setActiveComponentTab('subagents')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeComponentTab === 'subagents'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>c5 子智能体</span>
          </button>

          <button
            onClick={() => setActiveComponentTab('skills')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeComponentTab === 'skills'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Puzzle className="w-3.5 h-3.5" />
            <span>c6 技能库</span>
          </button>

          <button
            onClick={() => setActiveComponentTab('plugins')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeComponentTab === 'plugins'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>c7 钩子</span>
          </button>

          <button
            onClick={() => setActiveComponentTab('scripts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeComponentTab === 'scripts'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>c8 独立脚本</span>
          </button>
        </div>

        {/* Component Content Display */}
        <div className="bg-slate-950 text-slate-200 rounded-2xl p-4 font-mono text-xs max-h-96 overflow-y-auto border border-slate-800 leading-relaxed whitespace-pre-wrap">
          {harnessComponents ? (
            activeComponentTab === 'systemprompt' ? (
              harnessComponents.systemprompt || '（空系统提示词）'
            ) : activeComponentTab === 'guardrails' ? (
              harnessComponents.guardrails || '（空安全护栏）'
            ) : activeComponentTab === 'memory' ? (
              harnessComponents.memory || '（空长期记忆）'
            ) : activeComponentTab === 'tools' ? (
              harnessComponents.tool_guidance || '（空工具指引）'
            ) : activeComponentTab === 'subagents' ? (
              Object.keys(harnessComponents.subagents || {}).length > 0 ? (
                Object.entries(harnessComponents.subagents).map(([sname, content]: [string, any]) => (
                  <div key={sname} className="mb-4">
                    <div className="text-indigo-400 font-bold mb-1 border-b border-slate-800 pb-1">
                      # sub_agents/{sname}/AGENT.md
                    </div>
                    <div>{typeof content === 'string' ? content : JSON.stringify(content, null, 2)}</div>
                  </div>
                ))
              ) : (
                '（无子智能体）'
              )
            ) : activeComponentTab === 'skills' ? (
              Object.keys(harnessComponents.skills || {}).length > 0 ? (
                Object.entries(harnessComponents.skills).map(([sname, sfiles]: [string, any]) => (
                  <div key={sname} className="mb-4">
                    <div className="text-cyan-400 font-bold mb-1 border-b border-slate-800 pb-1">
                      # skills/{sname}
                    </div>
                    {typeof sfiles === 'object' && sfiles !== null ? (
                      Object.entries(sfiles).map(([fn, fc]: [string, any]) => (
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
                '（无独立技能目录）'
              )
            ) : activeComponentTab === 'plugins' ? (
              Object.keys(harnessComponents.plugins || {}).length > 0 ? (
                Object.entries(harnessComponents.plugins).map(([pname, content]: [string, any]) => (
                  <div key={pname} className="mb-4">
                    <div className="text-rose-400 font-bold mb-1 border-b border-slate-800 pb-1">
                      # plugins/{pname}
                    </div>
                    <div>{content}</div>
                  </div>
                ))
              ) : (
                '（无事件钩子/插件）'
              )
            ) : activeComponentTab === 'scripts' ? (
              Object.keys(harnessComponents.scripts || {}).length > 0 ? (
                Object.entries(harnessComponents.scripts).map(([fname, content]: [string, any]) => (
                  <div key={fname} className="mb-4">
                    <div className="text-emerald-400 font-bold mb-1 border-b border-slate-800 pb-1">
                      # scripts/{fname}
                    </div>
                    <div>{content}</div>
                  </div>
                ))
              ) : (
                '（无额外脚本）'
              )
            ) : (
              '（无内容）'
            )
          ) : (
            '正在加载组件数据...'
          )}
        </div>
      </div>
    </div>
  );
};
