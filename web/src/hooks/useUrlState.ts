import { useCallback, useEffect, useState } from 'react';
import { NavTabType } from '../types';

const VALID_TABS: NavTabType[] = ['workbench', 'studio', 'pipeline', 'library', 'benchmark'];

function parseUrlParams(): { tab: NavTabType; runId: string; taskId: string } {
  try {
    const params = new URLSearchParams(window.location.search);
    const rawTab = params.get('tab') as NavTabType | null;
    const tab: NavTabType = rawTab && VALID_TABS.includes(rawTab) ? rawTab : 'workbench';
    const runId = params.get('run') || '';
    const taskId = params.get('task') || '';
    return { tab, runId, taskId };
  } catch {
    return { tab: 'workbench', runId: '', taskId: '' };
  }
}

export function useUrlState() {
  const initial = parseUrlParams();
  const [currentTab, setCurrentTabState] = useState<NavTabType>(initial.tab);
  const [selectedRunId, setSelectedRunIdState] = useState<string>(initial.runId);
  const [selectedTaskId, setSelectedTaskIdState] = useState<string>(initial.taskId);

  const syncToUrl = useCallback(
    (nextTab: NavTabType, nextRunId: string, nextTaskId: string, replace: boolean = false) => {
      try {
        const params = new URLSearchParams(window.location.search);
        if (nextTab && nextTab !== 'workbench') {
          params.set('tab', nextTab);
        } else {
          params.delete('tab');
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
      setSelectedRunIdState(parsed.runId);
      setSelectedTaskIdState(parsed.taskId);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const setCurrentTab = useCallback(
    (tab: NavTabType) => {
      setCurrentTabState(tab);
      syncToUrl(tab, selectedRunId, selectedTaskId, false);
    },
    [selectedRunId, selectedTaskId, syncToUrl]
  );

  const setSelectedRunId = useCallback(
    (runId: string, replace: boolean = false) => {
      setSelectedRunIdState(runId);
      setSelectedTaskIdState('');
      syncToUrl(currentTab, runId, '', replace);
    },
    [currentTab, syncToUrl]
  );

  const setSelectedTaskId = useCallback(
    (taskId: string, replace: boolean = true) => {
      setSelectedTaskIdState(taskId);
      syncToUrl(currentTab, selectedRunId, taskId, replace);
    },
    [currentTab, selectedRunId, syncToUrl]
  );

  const navigateRunAndTab = useCallback(
    (runId: string, targetTab?: NavTabType, taskId?: string) => {
      const nextTab = targetTab || currentTab;
      const nextTask = taskId ?? (runId === selectedRunId ? selectedTaskId : '');
      setCurrentTabState(nextTab);
      setSelectedRunIdState(runId);
      setSelectedTaskIdState(nextTask);
      syncToUrl(nextTab, runId, nextTask, false);
    },
    [currentTab, selectedRunId, selectedTaskId, syncToUrl]
  );

  return {
    currentTab,
    setCurrentTab,
    selectedRunId,
    setSelectedRunId,
    selectedTaskId,
    setSelectedTaskId,
    navigateRunAndTab,
  };
}
