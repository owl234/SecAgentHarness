import React, { useEffect, useState } from 'react';
import { NavTabType, RunItem, SystemStatus } from './types';
import { fetchRuns, fetchStatus, fetchLogs } from './api';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { WorkbenchView } from './components/WorkbenchView';
import { ComponentStudio } from './components/ComponentStudio';
import { PipelineView } from './components/PipelineView';
import { LibraryView } from './components/LibraryView';
import { BenchmarkView } from './components/BenchmarkView';
import { LiveConsole } from './components/LiveConsole';
import { TerminologyGuideModal } from './components/TerminologyGuideModal';
import { ExecutorConfigDrawer } from './components/ExecutorConfigDrawer';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTabType>('workbench');
  const [runs, setRuns] = useState<RunItem[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [showTerminologyModal, setShowTerminologyModal] = useState(false);
  const [showExecutorDrawer, setShowExecutorDrawer] = useState(false);

  // Theme state: 'dark' | 'light'
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('harness2_theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('harness2_theme', theme);
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
  const loadInitialData = async () => {
    try {
      const [runsData, statusData, logsData] = await Promise.all([
        fetchRuns(),
        fetchStatus(),
        fetchLogs(200),
      ]);
      setRuns(runsData);
      setSystemStatus(statusData);
      setLogs(logsData);
      if (runsData.length > 0 && !selectedRunId) {
        setSelectedRunId(runsData[0].id);
      }
    } catch (err) {
      console.error('初始加载失败 (Initial load failed):', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // 2. Setup Server-Sent Events (SSE) for real-time live streaming
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimeout: any = null;

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

      es.addEventListener('init', (e: any) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.logs) {
            setLogs(payload.logs);
          }
        } catch {}
      });

      es.addEventListener('log', (e: any) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.line) {
            setLogs((prev) => [...prev, payload.line]);
          }
        } catch {}
      });

      es.addEventListener('start', (e: any) => {
        try {
          const job = JSON.parse(e.data);
          setSystemStatus((prev) =>
            prev ? { ...prev, status: { ...prev.status, status: 'running', job } } : prev
          );
        } catch {}
      });

      es.addEventListener('finish', (e: any) => {
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
        } catch {}
      });

      es.addEventListener('terminate', () => {
        setSystemStatus((prev) =>
          prev ? { ...prev, status: { ...prev.status, status: 'terminated' } } : prev
        );
      });

      es.addEventListener('refresh', () => {
        fetchRuns().then((updated) => setRuns(updated));
      });
    };

    connectSSE();

    return () => {
      es?.close();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  const handleSelectRun = (
    runId: string,
    targetTab?: NavTabType
  ) => {
    setSelectedRunId(runId);
    if (targetTab) {
      setCurrentTab(targetTab);
    }
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
        <main className="flex-1 min-w-0 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {currentTab === 'workbench' && (
            <WorkbenchView
              runs={runs}
              systemStatus={systemStatus}
              onSelectRun={handleSelectRun}
              onOpenConsole={() => setShowConsole(true)}
              onNavigateToStudio={() => setCurrentTab('studio')}
              onOpenExecutorConfig={() => setShowExecutorDrawer(true)}
              onOpenTerminology={() => setShowTerminologyModal(true)}
            />
          )}

          {currentTab === 'studio' && (
            <ComponentStudio
              runs={runs}
              onNavigateToRun={(runId) => {
                setSelectedRunId(runId);
                setCurrentTab('pipeline');
              }}
            />
          )}

          {currentTab === 'pipeline' && (
            <PipelineView
              runs={runs}
              selectedRunId={selectedRunId}
              onSelectRunId={setSelectedRunId}
            />
          )}

          {currentTab === 'library' && (
            <LibraryView
              runs={runs}
              selectedRunId={selectedRunId}
              onSelectRunId={setSelectedRunId}
              onNavigateToStudio={() => setCurrentTab('studio')}
            />
          )}

          {currentTab === 'benchmark' && (
            <BenchmarkView
              runs={runs}
              selectedRunId={selectedRunId}
              onSelectRunId={setSelectedRunId}
              onOpenConsole={() => setShowConsole(true)}
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
        onExecutorChanged={loadInitialData}
      />
    </div>
  );
};

export default App;
