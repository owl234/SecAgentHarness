import React, { useCallback, useEffect, useState } from 'react';
import { NavTabType, RunItem, SystemStatus, LiveStageStep } from './types';
import { fetchRuns, fetchStatus, fetchLogs } from './api';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { OverviewView } from './components/OverviewView';
import { WorkbenchView } from './components/WorkbenchView';
import { DashboardView } from './components/DashboardView';
import { ComponentStudio } from './components/ComponentStudio';
import { LiveConsole } from './components/LiveConsole';
import { TerminologyGuideModal } from './components/TerminologyGuideModal';
import { ExecutorConfigDrawer } from './components/ExecutorConfigDrawer';
import { useUrlState } from './hooks/useUrlState';

const MAX_LOG_LINES = 2000;

export const App: React.FC = () => {
  const {
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
  } = useUrlState();

  const [runs, setRuns] = useState<RunItem[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [showTerminologyModal, setShowTerminologyModal] = useState(false);
  const [showExecutorDrawer, setShowExecutorDrawer] = useState(false);
  const [executorRefreshVersion, setExecutorRefreshVersion] = useState(0);
  const [liveStep, setLiveStep] = useState<LiveStageStep | null>(null);

  // Theme state: 'dark' | 'light'
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('sec_agent_harness2_theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('sec_agent_harness2_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // 1. Initial Data Fetch
  const loadInitialData = useCallback(async () => {
    try {
      const [runsData, statusData, logsData] = await Promise.all([
        fetchRuns(),
        fetchStatus(),
        fetchLogs(200),
      ]);
      setRuns(runsData);
      setSystemStatus(statusData);
      setLogs(logsData.slice(-MAX_LOG_LINES));
      if (runsData.length > 0 && !selectedRunId) {
        setSelectedRunId(runsData[0].id, true);
      }
    } catch (err) {
      console.error('初始加载失败:', err);
    }
  }, [selectedRunId, setSelectedRunId]);

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ensure valid selectedRunId when runs list updates
  useEffect(() => {
    if (runs.length === 0) return;
    if (!selectedRunId || !runs.some((r) => r.id === selectedRunId)) {
      setSelectedRunId(runs[0].id, true);
    }
  }, [runs, selectedRunId, setSelectedRunId]);

  // 2. Setup Server-Sent Events (SSE) for real-time live streaming
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const refreshRunsList = () => {
      fetchRuns()
        .then((updated) => setRuns(updated))
        .catch(() => {});
    };

    const connectSSE = () => {
      es = new EventSource('/api/events');

      es.onopen = () => {
        setConnected(true);
      };

      es.onerror = () => {
        setConnected(false);
        es?.close();
        reconnectTimeout = setTimeout(connectSSE, 3000);
      };

      es.addEventListener('init', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (Array.isArray(payload.logs)) {
            setLogs(payload.logs.slice(-MAX_LOG_LINES));
          }
        } catch {}
      });

      es.addEventListener('log', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.line) {
            setLogs((prev) =>
              prev.length >= MAX_LOG_LINES
                ? [...prev.slice(-(MAX_LOG_LINES - 1)), payload.line]
                : [...prev, payload.line]
            );
          }
        } catch {}
      });

      es.addEventListener('stage_step', (e: MessageEvent) => {
        try {
          const step = JSON.parse(e.data);
          setLiveStep(step);
        } catch {}
      });

      es.addEventListener('start', (e: MessageEvent) => {
        try {
          const job = JSON.parse(e.data);
          setSystemStatus((prev) =>
            prev ? { ...prev, status: { ...prev.status, status: 'running', job } } : prev
          );
          setLiveStep({
            stepIndex: 0,
            nodeId: 's1-task-in',
            stage: 1,
            status: 'active',
            title: '任务规格与隔离接入',
          });
        } catch {}
      });

      es.addEventListener('finish', (e: MessageEvent) => {
        try {
          const job = JSON.parse(e.data);
          setSystemStatus((prev) =>
            prev
              ? {
                  ...prev,
                  status: {
                    ...prev.status,
                    status: job.exit_code === 0 ? 'completed' : 'failed',
                    job,
                  },
                }
              : prev
          );
          if (job.exit_code === 0) {
            setLiveStep({
              stepIndex: 11,
              nodeId: 's5-update-lib',
              stage: 5,
              status: 'completed',
              title: '沉淀领域经验库闭环',
            });
          }
          refreshRunsList();
        } catch {}
      });

      es.addEventListener('terminate', () => {
        setSystemStatus((prev) =>
          prev ? { ...prev, status: { ...prev.status, status: 'terminated' } } : prev
        );
        setLiveStep(null);
        refreshRunsList();
      });

      es.addEventListener('refresh', () => {
        refreshRunsList();
      });
    };

    connectSSE();

    return () => {
      es?.close();
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  const handleSelectRun = (runId: string, targetTab?: NavTabType) => {
    navigateRunAndTab(runId, targetTab);
  };

  const handleExecutorChanged = () => {
    setExecutorRefreshVersion((v) => v + 1);
    loadInitialData();
  };

  const isRunning = systemStatus?.status.status === 'running';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* Slim Top Bar (brand + tools; module nav lives in Sidebar) */}
      <Navbar
        systemStatus={systemStatus}
        connected={connected}
        onToggleConsole={() => setShowConsole(!showConsole)}
        showConsole={showConsole}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenTerminology={() => setShowTerminologyModal(true)}
        onOpenExecutorConfig={() => setShowExecutorDrawer(true)}
      />

      {/* Body: left module nav + main content */}
      <div className="flex flex-1 min-h-0">
        <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

        {/* Main Content Area */}
        <main
          className={`flex-1 min-w-0 ${
            currentTab === 'overview' || currentTab === 'studio'
              ? 'max-w-[1720px] px-3 sm:px-6 py-4'
              : 'max-w-7xl px-4 sm:px-6 lg:px-8 py-8'
          } w-full mx-auto`}
        >
          {currentTab === 'overview' && (
            <OverviewView
              runs={runs}
              selectedRunId={selectedRunId}
              onSelectRunId={(id) => setSelectedRunId(id)}
              systemStatus={systemStatus}
              liveStep={liveStep}
              onNavigateToTab={(tab, runId, taskId, category) => {
                navigateRunAndTab(runId || selectedRunId, tab, taskId, category);
              }}
              onOpenConsole={() => setShowConsole(true)}
            />
          )}

          {currentTab === 'workbench' && (
            <WorkbenchView
              runs={runs}
              selectedRunId={selectedRunId}
              systemStatus={systemStatus}
              logs={logs}
              liveStep={liveStep}
              onNavigateToOverview={() => setCurrentTab('overview')}
              onSelectRun={handleSelectRun}
              onNavigateToDashboard={(runId) => {
                navigateRunAndTab(runId || selectedRunId, 'dashboard');
              }}
              onOpenConsole={() => setShowConsole(true)}
              onNavigateToStudio={() => setCurrentTab('studio')}
              onOpenExecutorConfig={() => setShowExecutorDrawer(true)}
              onOpenTerminology={() => setShowTerminologyModal(true)}
              executorRefreshVersion={executorRefreshVersion}
            />
          )}

          {(currentTab === 'dashboard' || currentTab === 'pipeline' || currentTab === 'benchmark') && (
            <DashboardView
              runs={runs}
              selectedRunId={selectedRunId}
              onSelectRunId={(id) => setSelectedRunId(id)}
              selectedTaskId={selectedTaskId}
              onSelectTaskId={setSelectedTaskId}
              onNavigateToStudio={(runId, taskId, category) => {
                navigateRunAndTab(runId, 'studio', taskId, category);
              }}
              onNavigateToLibrary={(runId, taskId) => {
                navigateRunAndTab(runId, 'library', taskId);
              }}
              onOpenConsole={() => setShowConsole(true)}
            />
          )}

          {(currentTab === 'studio' || currentTab === 'library') && (
            <ComponentStudio
              runs={runs}
              selectedRunId={selectedRunId}
              onSelectRunId={(id) => setSelectedRunId(id)}
              selectedTaskId={selectedTaskId}
              onSelectTaskId={(tid) => setSelectedTaskId(tid)}
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => setSelectedCategory(cat)}
              subTab={studioSubTab}
              onChangeSubTab={setStudioSubTab}
              onNavigateToRun={(runId, taskId) => {
                navigateRunAndTab(runId, 'dashboard', taskId);
              }}
            />
          )}
        </main>
      </div>

      {/* Floating Live Console */}
      <LiveConsole
        logs={logs}
        isOpen={showConsole}
        onClose={() => setShowConsole(false)}
        isRunning={isRunning}
        onClear={() => setLogs([])}
      />

      {/* Terminology Guide Modal */}
      <TerminologyGuideModal
        isOpen={showTerminologyModal}
        onClose={() => setShowTerminologyModal(false)}
      />

      {/* Executor and Model Config Drawer */}
      <ExecutorConfigDrawer
        isOpen={showExecutorDrawer}
        onClose={() => setShowExecutorDrawer(false)}
        onExecutorChanged={handleExecutorChanged}
      />
    </div>
  );
};

export default App;
