import { useCallback, useEffect, useState } from 'react';
import { ComponentCategory, NavTabType } from '../types';

const VALID_TABS: NavTabType[] = ['overview', 'workbench', 'dashboard', 'studio', 'pipeline', 'library', 'benchmark'];
const VALID_CATS: ComponentCategory[] = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9'];

function normalizeTab(rawTab: NavTabType | null): {
  tab: NavTabType;
  studioSubTab: 'topology' | 'library';
} {
  if (rawTab === 'benchmark' || rawTab === 'pipeline') {
    return { tab: 'dashboard', studioSubTab: 'topology' };
  }
  if (rawTab === 'library') {
    return { tab: 'studio', studioSubTab: 'library' };
  }
  if (rawTab && VALID_TABS.includes(rawTab)) {
    return { tab: rawTab, studioSubTab: 'topology' };
  }
  return { tab: 'workbench', studioSubTab: 'topology' };
}

function parseUrlParams(): {
  tab: NavTabType;
  studioSubTab: 'topology' | 'library';
  runId: string;
  taskId: string;
  category: ComponentCategory | null;
} {
  try {
    const params = new URLSearchParams(window.location.search);
    const rawTab = params.get('tab') as NavTabType | null;
    const { tab, studioSubTab: inferredSub } = normalizeTab(rawTab);
    const rawView = params.get('view');
    const studioSubTab = rawView === 'library' ? 'library' : inferredSub;
    const runId = params.get('run') || '';
    const taskId = params.get('task') || '';
    const rawCat = params.get('cat') as ComponentCategory | null;
    const category = rawCat && VALID_CATS.includes(rawCat) ? rawCat : null;
    return { tab, studioSubTab, runId, taskId, category };
  } catch {
    return { tab: 'workbench', studioSubTab: 'topology', runId: '', taskId: '', category: null };
  }
}

export function useUrlState() {
  const initial = parseUrlParams();
  const [currentTab, setCurrentTabState] = useState<NavTabType>(initial.tab);
  const [studioSubTab, setStudioSubTab] = useState<'topology' | 'library'>(initial.studioSubTab);
  const [selectedRunId, setSelectedRunIdState] = useState<string>(initial.runId);
  const [selectedTaskId, setSelectedTaskIdState] = useState<string>(initial.taskId);
  const [selectedCategory, setSelectedCategoryState] = useState<ComponentCategory | null>(
    initial.category
  );

  const syncToUrl = useCallback(
    (
      nextTab: NavTabType,
      nextRunId: string,
      nextTaskId: string,
      nextCategory: ComponentCategory | null,
      replace: boolean = false,
      nextStudioSubTab?: 'topology' | 'library'
    ) => {
      try {
        const params = new URLSearchParams(window.location.search);
        if (nextTab && nextTab !== 'workbench') {
          params.set('tab', nextTab);
        } else {
          params.delete('tab');
        }
        if (nextTab === 'studio' && nextStudioSubTab === 'library') {
          params.set('view', 'library');
        } else {
          params.delete('view');
        }
        if (nextRunId) {
          params.set('run', nextRunId);
        } else {
          params.delete('run');
        }
        if (nextTaskId) {
          params.set('task', nextTaskId);
        } else {
          params.delete('task');
        }
        if (nextTab === 'studio' && nextCategory) {
          params.set('cat', nextCategory);
        } else {
          params.delete('cat');
        }
        const searchStr = params.toString();
        const nextUrl = `${window.location.pathname}${searchStr ? `?${searchStr}` : ''}${window.location.hash}`;
        const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (nextUrl !== currentUrl) {
          if (replace) {
            window.history.replaceState(null, '', nextUrl);
          } else {
            window.history.pushState(null, '', nextUrl);
          }
        }
      } catch {}
    },
    []
  );

  useEffect(() => {
    const onPopState = () => {
      const parsed = parseUrlParams();
      setCurrentTabState(parsed.tab);
      setStudioSubTab(parsed.studioSubTab);
      setSelectedRunIdState(parsed.runId);
      setSelectedTaskIdState(parsed.taskId);
      setSelectedCategoryState(parsed.category);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const setCurrentTab = useCallback(
    (rawTab: NavTabType) => {
      const { tab, studioSubTab: sub } = normalizeTab(rawTab);
      setCurrentTabState(tab);
      setStudioSubTab(sub);
      syncToUrl(tab, selectedRunId, selectedTaskId, tab === 'studio' ? selectedCategory : null, false, sub);
    },
    [selectedRunId, selectedTaskId, selectedCategory, syncToUrl]
  );

  const setSelectedRunId = useCallback(
    (runId: string, replace: boolean = false) => {
      setSelectedRunIdState(runId);
      setSelectedTaskIdState('');
      syncToUrl(currentTab, runId, '', selectedCategory, replace, studioSubTab);
    },
    [currentTab, selectedCategory, studioSubTab, syncToUrl]
  );

  const setSelectedTaskId = useCallback(
    (taskId: string, replace: boolean = true) => {
      setSelectedTaskIdState(taskId);
      syncToUrl(currentTab, selectedRunId, taskId, selectedCategory, replace, studioSubTab);
    },
    [currentTab, selectedRunId, selectedCategory, studioSubTab, syncToUrl]
  );

  const setSelectedCategory = useCallback(
    (cat: ComponentCategory | null, replace: boolean = true) => {
      setSelectedCategoryState(cat);
      syncToUrl(currentTab, selectedRunId, selectedTaskId, cat, replace, studioSubTab);
    },
    [currentTab, selectedRunId, selectedTaskId, studioSubTab, syncToUrl]
  );

  const navigateRunAndTab = useCallback(
    (
      runId: string,
      targetTab?: NavTabType,
      taskId?: string,
      category?: ComponentCategory | null
    ) => {
      const { tab: nextTab, studioSubTab: nextSub } = normalizeTab(targetTab || currentTab);
      const nextTask = taskId ?? (runId === selectedRunId ? selectedTaskId : '');
      const nextCat =
        category !== undefined ? category : nextTab === 'studio' ? selectedCategory : null;
      setCurrentTabState(nextTab);
      setStudioSubTab(nextSub);
      setSelectedRunIdState(runId);
      setSelectedTaskIdState(nextTask);
      setSelectedCategoryState(nextCat);
      syncToUrl(nextTab, runId, nextTask, nextCat, false, nextSub);
    },
    [currentTab, selectedRunId, selectedTaskId, selectedCategory, syncToUrl]
  );

  return {
    currentTab,
    setCurrentTab,
    studioSubTab,
    setStudioSubTab,
    selectedRunId,
    setSelectedRunId,
    selectedTaskId,
    setSelectedTaskId,
    selectedCategory,
    setSelectedCategory,
    navigateRunAndTab,
  };
}
