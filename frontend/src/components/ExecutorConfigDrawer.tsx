import React, { useCallback, useEffect, useState } from 'react';
import {
  Cpu,
  X,
  CheckCircle2,
  AlertCircle,
  Terminal,
  RefreshCw,
  Flame,
  Bot,
  Zap,
  Globe,
  Activity,
} from 'lucide-react';
import {
  EndpointProbeResult,
  ExecutorStatusResponse,
} from '../types';
import {
  fetchExecutors,
  saveExecutorConfig,
  testExecutorEndpoint,
  startResponsesBridge,
  stopResponsesBridge,
} from '../api';
import {
  DrawerTabId,
  ExecutorFormValues,
  INITIAL_EXECUTOR_FORM,
  buildFormFromExecutorsData,
} from './executor/executorTypes';
import { UnifiedApiTab } from './executor/UnifiedApiTab';
import { SubstrateConfigTab } from './executor/SubstrateConfigTab';
import { useLang } from '../i18n/LangContext';
import { useEscapeKey, useToast } from './ui/ToastContext';

interface ExecutorConfigDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onExecutorChanged?: () => void;
}

export const ExecutorConfigDrawer: React.FC<ExecutorConfigDrawerProps> = ({
  isOpen,
  onClose,
  onExecutorChanged,
}) => {
  const { tx } = useLang();
  const { showToast } = useToast();
  useEscapeKey(onClose, isOpen);

  const [executorsData, setExecutorsData] = useState<ExecutorStatusResponse | null>(null);
  const [selectedTab, setSelectedTab] = useState<DrawerTabId>('unified');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [bridgeBusy, setBridgeBusy] = useState(false);
  const [probeResult, setProbeResult] = useState<EndpointProbeResult | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const [form, setForm] = useState<ExecutorFormValues>(INITIAL_EXECUTOR_FORM);

  const updateForm = useCallback((patch: Partial<ExecutorFormValues>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const applyExecutorsData = useCallback((data: ExecutorStatusResponse) => {
    setExecutorsData(data);
    setForm((prev) => buildFormFromExecutorsData(data, prev));
  }, []);

  const loadExecutors = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchExecutors();
      applyExecutorsData(data);
    } catch (err) {
      console.error('Failed to load executors:', err);
    } finally {
      setLoading(false);
    }
  }, [applyExecutorsData]);

  useEffect(() => {
    if (isOpen) {
      setProbeResult(null);
      loadExecutors();
    }
  }, [isOpen, loadExecutors]);

  useEffect(() => {
    setProbeResult(null);
  }, [selectedTab]);

  if (!isOpen) return null;

  const activeExecutor = executorsData?.executors.find((e) => e.id === selectedTab);
  const unifiedCfg = executorsData?.unified_config;
  const bridge = executorsData?.bridge;
  const isUnifiedReady = Boolean(unifiedCfg?.base_url && unifiedCfg?.api_key_configured);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      let updated: ExecutorStatusResponse;
      if (selectedTab === 'unified') {
        updated = await saveExecutorConfig({
          executor_id: 'unified',
          base_url: form.unifiedBaseUrl,
          api_key: form.unifiedApiKey || undefined,
          model: form.unifiedModel,
          protocol: form.unifiedProtocol,
          persist_dotenv: true,
        });
        updateForm({ unifiedApiKey: '' });
      } else if (selectedTab === 'claude') {
        updated = await saveExecutorConfig({
          executor_id: 'claude',
          model: form.claudeModel,
          effort: form.claudeEffort,
          base_url: form.claudeBaseUrl,
          api_key: form.claudeApiKey || undefined,
          protocol: form.claudeProtocol,
          persist_dotenv: true,
        });
        updateForm({ claudeApiKey: '' });
      } else if (selectedTab === 'oc') {
        updated = await saveExecutorConfig({
          executor_id: 'oc',
          model: form.ocModel,
          base_url: form.ocBaseUrl,
          api_key: form.ocApiKey || undefined,
          protocol: form.ocProtocol,
          persist_dotenv: true,
        });
        updateForm({ ocApiKey: '' });
      } else if (selectedTab === 'cx') {
        updated = await saveExecutorConfig({
          executor_id: 'cx',
          model: form.cxModel,
          base_url: form.cxBaseUrl,
          container_url: form.cxContainerUrl,
          api_key: form.cxApiKey || undefined,
          persist_dotenv: true,
        });
        updateForm({ cxApiKey: '' });
      } else {
        updated = await saveExecutorConfig({
          executor_id: 'vertex',
          improver_model: form.improverModel,
          judge_model: form.judgeModel,
          judge_base_url: form.judgeBaseUrl,
          judge_api_key: form.judgeApiKey || undefined,
          vertex_project: form.vertexProject,
          vertex_location: form.vertexLocation,
          persist_dotenv: true,
        });
        updateForm({ judgeApiKey: '' });
      }
      applyExecutorsData(updated);
      showToast(
        tx(
          '配置已更新并同步写入 .env 及派生运行文件！',
          'Configuration saved and synced to .env & substrate files!'
        ),
        'success'
      );
      if (onExecutorChanged) onExecutorChanged();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showToast(tx(`配置保存失败: ${message}`, `Save failed: ${message}`), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEndpoint = async () => {
    setTesting(true);
    setProbeResult(null);
    try {
      let payload: {
        target: string;
        base_url?: string;
        api_key?: string;
        protocol?: string;
        model?: string;
      } = { target: selectedTab };

      if (selectedTab === 'unified') {
        payload = {
          target: 'unified',
          base_url: form.unifiedBaseUrl || undefined,
          api_key: form.unifiedApiKey || undefined,
          protocol: form.unifiedProtocol || undefined,
          model: form.unifiedModel || undefined,
        };
      } else if (selectedTab === 'claude') {
        payload = {
          target: 'claude',
          base_url: form.claudeBaseUrl || undefined,
          api_key: form.claudeApiKey || undefined,
          protocol: form.claudeProtocol || undefined,
          model: form.claudeModel || undefined,
        };
      } else if (selectedTab === 'oc') {
        payload = {
          target: 'oc',
          base_url: form.ocBaseUrl || undefined,
          api_key: form.ocApiKey || undefined,
          protocol: form.ocProtocol || undefined,
          model: form.ocModel || undefined,
        };
      } else if (selectedTab === 'cx') {
        payload = {
          target: 'cx',
          base_url: form.cxBaseUrl || undefined,
          api_key: form.cxApiKey || undefined,
          protocol: 'openai-responses',
          model: form.cxModel || undefined,
        };
      } else if (selectedTab === 'vertex') {
        payload = {
          target: 'vertex',
          base_url: form.judgeBaseUrl || undefined,
          api_key: form.judgeApiKey || undefined,
          model: form.judgeModel || undefined,
        };
      }

      const res = await testExecutorEndpoint(payload);
      setProbeResult(res);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setProbeResult({
        ok: false,
        target: selectedTab,
        endpoint: '',
        protocol: '',
        status_code: null,
        latency_ms: 0,
        message: tx(`测试请求失败: ${message}`, `Endpoint probe failed: ${message}`),
      });
    } finally {
      setTesting(false);
    }
  };

  const handleStartBridge = async () => {
    setBridgeBusy(true);
    try {
      const res = await startResponsesBridge({
        upstream: form.unifiedBaseUrl || undefined,
        api_key: form.unifiedApiKey || undefined,
        host: form.bridgeHost,
        auto_bind_codex: true,
      });
      applyExecutorsData(res.executors);
      showToast(
        tx(
          'Responses 转换桥已启动，并已自动绑定 Codex 配置与 config.toml！',
          'Responses Bridge started and bound to Codex config.toml!'
        ),
        'success'
      );
      if (onExecutorChanged) onExecutorChanged();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showToast(tx(`转换桥启动失败: ${message}`, `Bridge start failed: ${message}`), 'error');
    } finally {
      setBridgeBusy(false);
    }
  };

  const handleStopBridge = async () => {
    setBridgeBusy(true);
    try {
      const res = await stopResponsesBridge();
      applyExecutorsData(res.executors);
      showToast(tx('Responses 转换桥已停止', 'Responses Bridge stopped'), 'info');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      showToast(tx(`停止转换桥失败: ${message}`, `Bridge stop failed: ${message}`), 'error');
    } finally {
      setBridgeBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full max-w-2xl h-full flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-500/20 to-orange-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {tx('统一 API 与执行基座配置中心', 'Unified API & Executor Configuration Center')}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {tx('自动同步 .env', 'Auto-sync .env')}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {tx(
                  '一处配置 HARNESS2_API_* 同时驱动 Claude (clawgod)、OpenCode 与 Codex，支持按基座独立覆盖',
                  'Configure HARNESS2_API_* once to drive Claude (clawgod), OpenCode, and Codex with per-substrate overrides'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector Pills: Unified API first + 4 Executor/Role tabs */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedTab('unified')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
              selectedTab === 'unified'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <Globe
              className={`w-3.5 h-3.5 ${
                selectedTab === 'unified' ? 'text-blue-200' : 'text-blue-500'
              }`}
            />
            <span>{tx('统一 API (推荐)', 'Unified API (Recommended)')}</span>
            <span
              className={`w-2 h-2 rounded-full ${
                isUnifiedReady ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
              title={isUnifiedReady ? tx('已配置统一 API', 'Configured') : tx('待配置', 'Needs config')}
            />
          </button>

          {executorsData?.executors.map((e) => {
            const isSelected = selectedTab === e.id;
            const isReady = e.status === 'ready';

            return (
              <button
                type="button"
                key={e.id}
                onClick={() => setSelectedTab(e.id as DrawerTabId)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {e.id === 'claude' && (
                  <Flame
                    className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300' : 'text-orange-500'}`}
                  />
                )}
                {e.id === 'oc' && (
                  <Bot
                    className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-200' : 'text-blue-500'}`}
                  />
                )}
                {e.id === 'cx' && (
                  <Terminal
                    className={`w-3.5 h-3.5 ${isSelected ? 'text-green-200' : 'text-green-500'}`}
                  />
                )}
                {e.id === 'vertex' && (
                  <Zap
                    className={`w-3.5 h-3.5 ${isSelected ? 'text-purple-200' : 'text-purple-500'}`}
                  />
                )}

                <span>{e.name}</span>

                <span
                  className={`w-2 h-2 rounded-full ${
                    isReady ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                  title={isReady ? tx('就绪', 'Ready') : tx('待配置', 'Needs config')}
                />
              </button>
            );
          })}
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Probe Result Banner */}
          {probeResult && (
            <div
              className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                probeResult.ok
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-300'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {probeResult.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">
                    {probeResult.ok
                      ? tx('端点连通性探测通过', 'Endpoint Connectivity Probe Passed')
                      : tx('端点连通性探测异常', 'Endpoint Connectivity Probe Failed')}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] opacity-90">
                    {probeResult.message}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProbeResult(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {selectedTab === 'unified' ? (
            <UnifiedApiTab
              executorsData={executorsData}
              form={form}
              updateForm={updateForm}
              showApiKey={showApiKey}
              onToggleShowApiKey={() => setShowApiKey((v) => !v)}
            />
          ) : activeExecutor ? (
            <SubstrateConfigTab
              selectedTab={selectedTab}
              activeExecutor={activeExecutor}
              unifiedCfg={unifiedCfg}
              bridge={bridge}
              form={form}
              updateForm={updateForm}
              showApiKey={showApiKey}
              onToggleShowApiKey={() => setShowApiKey((v) => !v)}
              bridgeBusy={bridgeBusy}
              onStartBridge={handleStartBridge}
              onStopBridge={handleStopBridge}
            />
          ) : null}
        </div>

        {/* Drawer Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadExecutors}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{tx('刷新状态', 'Refresh')}</span>
            </button>

            <button
              type="button"
              disabled={testing}
              onClick={handleTestEndpoint}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl cursor-pointer disabled:opacity-50"
            >
              <Activity className={`w-3.5 h-3.5 ${testing ? 'animate-pulse' : ''}`} />
              <span>
                {testing
                  ? tx('正在探测端点...', 'Probing Endpoint...')
                  : tx('测试端点连通性', 'Test Endpoint')}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              {tx('关闭', 'Close')}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveConfig}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <span>{tx('保存同步中...', 'Saving & Syncing...')}</span>
              ) : (
                <span>{tx('保存并同步到 .env', 'Save & Sync to .env')}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
