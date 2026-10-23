import React, { useEffect, useState } from 'react';
import {
  Cpu,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Terminal,
  Key,
  RefreshCw,
  Flame,
  Bot,
  Zap,
  Globe,
  Link2,
  Play,
  Square,
  Activity,
  FileCode2,
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

interface ExecutorConfigDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onExecutorChanged?: () => void;
}

type DrawerTabId = 'unified' | 'claude' | 'oc' | 'cx' | 'vertex';

export const ExecutorConfigDrawer: React.FC<ExecutorConfigDrawerProps> = ({
  isOpen,
  onClose,
  onExecutorChanged,
}) => {
  const [executorsData, setExecutorsData] = useState<ExecutorStatusResponse | null>(null);
  const [selectedTab, setSelectedTab] = useState<DrawerTabId>('unified');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [bridgeBusy, setBridgeBusy] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [probeResult, setProbeResult] = useState<EndpointProbeResult | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  // 0. Unified API States (HARNESS2_API_*)
  const [unifiedBaseUrl, setUnifiedBaseUrl] = useState('');
  const [unifiedApiKey, setUnifiedApiKey] = useState('');
  const [unifiedModel, setUnifiedModel] = useState('');
  const [unifiedProtocol, setUnifiedProtocol] = useState('');

  // 1. Claude Configuration Form States
  const [claudeModel, setClaudeModel] = useState('');
  const [claudeEffort, setClaudeEffort] = useState<'low' | 'medium' | 'high'>('high');
  const [claudeBaseUrl, setClaudeBaseUrl] = useState('');
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [claudeProtocol, setClaudeProtocol] = useState('');

  // 2. OpenCode Configuration Form States
  const [ocModel, setOcModel] = useState('');
  const [ocBaseUrl, setOcBaseUrl] = useState('');
  const [ocApiKey, setOcApiKey] = useState('');
  const [ocProtocol, setOcProtocol] = useState('');

  // 3. Codex Configuration Form States
  const [cxModel, setCxModel] = useState('');
  const [cxBaseUrl, setCxBaseUrl] = useState('');
  const [cxContainerUrl, setCxContainerUrl] = useState('');
  const [cxApiKey, setCxApiKey] = useState('');
  const [bridgeHost, setBridgeHost] = useState<'127.0.0.1' | '0.0.0.0'>('127.0.0.1');

  // 4. Improver / Judge / Vertex AI States
  const [improverModel, setImproverModel] = useState('');
  const [judgeModel, setJudgeModel] = useState('');
  const [judgeBaseUrl, setJudgeBaseUrl] = useState('');
  const [judgeApiKey, setJudgeApiKey] = useState('');
  const [vertexProject, setVertexProject] = useState('');
  const [vertexLocation, setVertexLocation] = useState('global');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const applyExecutorsData = (data: ExecutorStatusResponse) => {
    setExecutorsData(data);
    if (data.unified_config) {
      setUnifiedBaseUrl(data.unified_config.base_url || '');
      setUnifiedModel(data.unified_config.model || '');
      setUnifiedProtocol(data.unified_config.protocol || '');
      setImproverModel(data.unified_config.improver_model || '');
      setJudgeModel(data.unified_config.judge_model || '');
      setJudgeBaseUrl(data.unified_config.judge_base_url || '');
      setVertexProject(data.unified_config.vertex_project || '');
      setVertexLocation(data.unified_config.vertex_location || 'global');
    }

    const claude = data.executors.find((e) => e.id === 'claude');
    if (claude) {
      setClaudeModel(claude.model_override || claude.current_model || '');
      if (claude.effort === 'low' || claude.effort === 'medium' || claude.effort === 'high') {
        setClaudeEffort(claude.effort);
      }
      setClaudeBaseUrl(claude.base_url || '');
      setClaudeProtocol(claude.protocol_override || '');
    }

    const oc = data.executors.find((e) => e.id === 'oc');
    if (oc) {
      setOcModel(oc.model_override || oc.current_model || '');
      setOcBaseUrl(oc.base_url || '');
      setOcProtocol(oc.protocol_override || '');
    }

    const cx = data.executors.find((e) => e.id === 'cx');
    if (cx) {
      setCxModel(cx.model_override || cx.current_model || '');
      setCxBaseUrl(cx.base_url || '');
      setCxContainerUrl(cx.container_url || '');
    }
  };

  const loadExecutors = async () => {
    setLoading(true);
    try {
      const data = await fetchExecutors();
      applyExecutorsData(data);
    } catch (err: any) {
      console.error('获取执行器失败 (Failed to load executors):', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setProbeResult(null);
      loadExecutors();
    }
  }, [isOpen]);

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
          base_url: unifiedBaseUrl,
          api_key: unifiedApiKey || undefined,
          model: unifiedModel,
          protocol: unifiedProtocol,
          persist_dotenv: true,
        });
        setUnifiedApiKey('');
      } else if (selectedTab === 'claude') {
        updated = await saveExecutorConfig({
          executor_id: 'claude',
          model: claudeModel,
          effort: claudeEffort,
          base_url: claudeBaseUrl,
          api_key: claudeApiKey || undefined,
          protocol: claudeProtocol,
          persist_dotenv: true,
        });
        setClaudeApiKey('');
      } else if (selectedTab === 'oc') {
        updated = await saveExecutorConfig({
          executor_id: 'oc',
          model: ocModel,
          base_url: ocBaseUrl,
          api_key: ocApiKey || undefined,
          protocol: ocProtocol,
          persist_dotenv: true,
        });
        setOcApiKey('');
      } else if (selectedTab === 'cx') {
        updated = await saveExecutorConfig({
          executor_id: 'cx',
          model: cxModel,
          base_url: cxBaseUrl,
          container_url: cxContainerUrl,
          api_key: cxApiKey || undefined,
          persist_dotenv: true,
        });
        setCxApiKey('');
      } else {
        updated = await saveExecutorConfig({
          executor_id: 'vertex',
          improver_model: improverModel,
          judge_model: judgeModel,
          judge_base_url: judgeBaseUrl,
          judge_api_key: judgeApiKey || undefined,
          vertex_project: vertexProject,
          vertex_location: vertexLocation,
          persist_dotenv: true,
        });
        setJudgeApiKey('');
      }
      applyExecutorsData(updated);
      showToast('配置已更新并同步写入 .env 及派生运行文件！');
      if (onExecutorChanged) onExecutorChanged();
    } catch (err: any) {
      showToast(`配置保存失败: ${err.message}`);
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
          base_url: unifiedBaseUrl || undefined,
          api_key: unifiedApiKey || undefined,
          protocol: unifiedProtocol || undefined,
          model: unifiedModel || undefined,
        };
      } else if (selectedTab === 'claude') {
        payload = {
          target: 'claude',
          base_url: claudeBaseUrl || undefined,
          api_key: claudeApiKey || undefined,
          protocol: claudeProtocol || undefined,
          model: claudeModel || undefined,
        };
      } else if (selectedTab === 'oc') {
        payload = {
          target: 'oc',
          base_url: ocBaseUrl || undefined,
          api_key: ocApiKey || undefined,
          protocol: ocProtocol || undefined,
          model: ocModel || undefined,
        };
      } else if (selectedTab === 'cx') {
        payload = {
          target: 'cx',
          base_url: cxBaseUrl || undefined,
          api_key: cxApiKey || undefined,
          protocol: 'openai-responses',
          model: cxModel || undefined,
        };
      } else if (selectedTab === 'vertex') {
        payload = {
          target: 'vertex',
          base_url: judgeBaseUrl || undefined,
          api_key: judgeApiKey || undefined,
          model: judgeModel || undefined,
        };
      }

      const res = await testExecutorEndpoint(payload);
      setProbeResult(res);
    } catch (err: any) {
      setProbeResult({
        ok: false,
        target: selectedTab,
        endpoint: '',
        protocol: '',
        status_code: null,
        latency_ms: 0,
        message: `测试请求失败: ${err.message}`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleStartBridge = async () => {
    setBridgeBusy(true);
    try {
      const res = await startResponsesBridge({
        upstream: unifiedBaseUrl || undefined,
        api_key: unifiedApiKey || undefined,
        host: bridgeHost,
        auto_bind_codex: true,
      });
      applyExecutorsData(res.executors);
      showToast('Responses 转换桥已启动，并已自动绑定 Codex 配置与 config.toml！');
      if (onExecutorChanged) onExecutorChanged();
    } catch (err: any) {
      showToast(`转换桥启动失败: ${err.message}`);
    } finally {
      setBridgeBusy(false);
    }
  };

  const handleStopBridge = async () => {
    setBridgeBusy(true);
    try {
      const res = await stopResponsesBridge();
      applyExecutorsData(res.executors);
      showToast('Responses 转换桥已停止');
    } catch (err: any) {
      showToast(`停止转换桥失败: ${err.message}`);
    } finally {
      setBridgeBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full max-w-2xl h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-500/20 to-orange-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  统一 API 与执行基座配置中心
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  自动同步 .env
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                一处配置 HARNESS2_API_* 同时驱动 Claude (clawgod)、OpenCode 与 Codex，支持按基座独立覆盖
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector Pills: Unified API first + 4 Executor/Role tabs */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedTab('unified')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
              selectedTab === 'unified'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <Globe className={`w-3.5 h-3.5 ${selectedTab === 'unified' ? 'text-blue-200' : 'text-blue-500'}`} />
            <span>统一 API (推荐)</span>
            <span
              className={`w-2 h-2 rounded-full ${
                isUnifiedReady ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
              title={isUnifiedReady ? '已配置统一 API' : '待配置'}
            />
          </button>

          {executorsData?.executors.map((e) => {
            const isSelected = selectedTab === e.id;
            const isReady = e.status === 'ready';

            return (
              <button
                key={e.id}
                onClick={() => setSelectedTab(e.id as DrawerTabId)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {e.id === 'claude' && (
                  <Flame className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300' : 'text-orange-500'}`} />
                )}
                {e.id === 'oc' && (
                  <Bot className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-200' : 'text-blue-500'}`} />
                )}
                {e.id === 'cx' && (
                  <Terminal className={`w-3.5 h-3.5 ${isSelected ? 'text-green-200' : 'text-green-500'}`} />
                )}
                {e.id === 'vertex' && (
                  <Zap className={`w-3.5 h-3.5 ${isSelected ? 'text-purple-200' : 'text-purple-500'}`} />
                )}

                <span>{e.name}</span>

                <span
                  className={`w-2 h-2 rounded-full ${
                    isReady ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                  title={isReady ? '就绪' : '待配置'}
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
                    {probeResult.ok ? '端点连通性探测通过' : '端点连通性探测异常'}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] opacity-90">{probeResult.message}</div>
                </div>
              </div>
              <button
                onClick={() => setProbeResult(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 0: UNIFIED API (HARNESS2_API_*)                       */}
          {/* ========================================================= */}
          {selectedTab === 'unified' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl border bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border-blue-500/30 text-slate-800 dark:text-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                    <Globe className="w-4 h-4" />
                    <span>统一 API 网关接入 (harness2/api.py)</span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      isUnifiedReady
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {isUnifiedReady ? '已激活统一接入' : '未设置统一端点'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  只需填写一组 <code className="font-mono text-[11px]">HARNESS2_API_BASE_URL</code> 与{' '}
                  <code className="font-mono text-[11px]">HARNESS2_API_KEY</code>，系统会自动按各 CLI 的线协议完成适配：
                  Claude 走 Anthropic Messages（或 clawgod 代理）、OpenCode 自动生成{' '}
                  <code className="font-mono text-[11px]">harness2/&lt;model&gt;</code> Provider 块、Codex 走 Responses 协议。
                </p>
              </div>

              {/* Base URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  统一 API 端点地址 (HARNESS2_API_BASE_URL)
                </label>
                <input
                  type="text"
                  value={unifiedBaseUrl}
                  onChange={(e) => setUnifiedBaseUrl(e.target.value)}
                  placeholder="https://your-endpoint.example.com/v1"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* API Key */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-slate-400" />
                    <span>统一 API 密钥 (HARNESS2_API_KEY)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-[11px] text-blue-500 hover:underline cursor-pointer"
                  >
                    {showApiKey ? '隐藏密文' : '显示密文'}
                  </button>
                </div>
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={unifiedApiKey}
                  onChange={(e) => setUnifiedApiKey(e.target.value)}
                  placeholder={
                    unifiedCfg?.api_key_configured
                      ? `已配置 (${unifiedCfg.api_key_masked}) · 输入新密钥可覆盖，留空保持不变`
                      : 'sk-...'
                  }
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Unified Model + Protocol */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    默认模型 ID (HARNESS2_API_MODEL)
                  </label>
                  <input
                    type="text"
                    value={unifiedModel}
                    onChange={(e) => setUnifiedModel(e.target.value)}
                    placeholder="例如: claude-sonnet-4-6 或 gpt-5.4"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['claude-sonnet-4-6', 'gpt-5.4', 'gemini-2.5-pro', 'gpt-4o'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setUnifiedModel(m)}
                        className="px-2 py-0.5 text-[10px] font-mono rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-500/10 hover:text-blue-500 border border-slate-200 dark:border-slate-700 cursor-pointer"
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    协议覆盖 (HARNESS2_API_PROTOCOL · 可选)
                  </label>
                  <select
                    value={unifiedProtocol}
                    onChange={(e) => setUnifiedProtocol(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">自动按基座适配 (默认推荐)</option>
                    <option value="anthropic">anthropic (Anthropic Messages 协议)</option>
                    <option value="openai-chat">openai-chat (OpenAI Chat Completions)</option>
                    <option value="openai-responses">openai-responses (OpenAI Responses)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                    留空时：Claude 默认走 anthropic，OpenCode 走 openai-chat，Codex 走 openai-responses。
                  </p>
                </div>
              </div>

              {/* Live Substrate Resolution Summary Table */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>三基座实时协议解析预览 (api.describe)</span>
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px] font-mono">
                  {executorsData?.executors
                    .filter((e) => e.id !== 'vertex')
                    .map((e) => (
                      <div
                        key={e.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
                      >
                        <div className="flex items-center gap-2 font-sans font-semibold text-slate-700 dark:text-slate-300">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              e.status === 'ready' ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                          <span>{e.name}</span>
                          {e.using_unified && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              统一API
                            </span>
                          )}
                        </div>
                        <span className="text-slate-500 dark:text-slate-400 truncate max-w-md">
                          {e.resolved_endpoint || '(未配置端点)'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 1..4: INDIVIDUAL SUBSTRATE / VERTEX TABS              */}
          {/* ========================================================= */}
          {selectedTab !== 'unified' && activeExecutor && (
            <>
              {/* Executor Status Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  activeExecutor.status === 'ready'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-300'
                }`}
              >
                {activeExecutor.status === 'ready' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wide">
                      {activeExecutor.title}
                    </span>
                    {activeExecutor.using_unified && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-semibold">
                        正在复用统一 API
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5 leading-relaxed break-all">
                    {activeExecutor.status_message}
                  </p>
                </div>
              </div>

              {/* ------------------------------------------------------- */}
              {/* CLAUDE SUBSTRATE CONFIGURATION                          */}
              {/* ------------------------------------------------------- */}
              {selectedTab === 'claude' && (
                <div className="space-y-4">
                  {/* Claude Model Input (Free-form + Presets) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Claude 模型 ID (HARNESS2_CLAUDE_MODEL · 留空默认复用统一 API 模型)
                    </label>
                    <input
                      type="text"
                      value={claudeModel}
                      onChange={(e) => setClaudeModel(e.target.value)}
                      placeholder="claude-sonnet-4-6 或 claude-3-7-sonnet-20250219"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {activeExecutor.supported_models.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setClaudeModel(m)}
                          className={`px-2 py-0.5 text-[10px] font-mono rounded-md border cursor-pointer ${
                            claudeModel === m
                              ? 'bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-500/40 font-semibold'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-400'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Real Reasoning Effort Selector (HARNESS2_CLAUDE_EFFORT: low | medium | high) */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          推理强度档位 (HARNESS2_CLAUDE_EFFORT · 传递为 clawgod --effort)
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded-full border border-orange-500/20">
                        {claudeEffort.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'low', label: 'Low (轻量快速)', desc: '低延迟快速验证' },
                          { id: 'medium', label: 'Medium (均衡)', desc: '兼顾速度与推理深度' },
                          { id: 'high', label: 'High (推荐默认)', desc: '深度思考与严密自检' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setClaudeEffort(opt.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            claudeEffort === opt.id
                              ? 'bg-orange-500/10 border-orange-500 text-orange-950 dark:text-orange-200 ring-1 ring-orange-500'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <div className="text-xs font-bold">{opt.label}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Per-substrate Endpoint & Protocol Overrides */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        专属端点覆盖 (HARNESS2_CLAUDE_BASE_URL)
                      </label>
                      <input
                        type="text"
                        value={claudeBaseUrl}
                        onChange={(e) => setClaudeBaseUrl(e.target.value)}
                        placeholder={
                          unifiedCfg?.base_url
                            ? `留空默认继承统一 API (${unifiedCfg.base_url})`
                            : 'https://api.anthropic.com'
                        }
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        线协议 (HARNESS2_CLAUDE_PROTOCOL)
                      </label>
                      <select
                        value={claudeProtocol}
                        onChange={(e) => setClaudeProtocol(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">默认 (anthropic 原生 Messages)</option>
                        <option value="anthropic">anthropic (原生 Messages API)</option>
                        <option value="openai-chat">
                          openai-chat (启用 clawgod provider.json 转换代理)
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Claude API Key Override */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-slate-400" />
                        <span>专属密钥覆盖 (HARNESS2_CLAUDE_API_KEY / ANTHROPIC_API_KEY)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="text-[11px] text-blue-500 hover:underline cursor-pointer"
                      >
                        {showApiKey ? '隐藏密文' : '显示密文'}
                      </button>
                    </div>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={claudeApiKey}
                      onChange={(e) => setClaudeApiKey(e.target.value)}
                      placeholder={
                        activeExecutor.api_key_configured
                          ? `已配置 (${activeExecutor.api_key_masked || '继承自统一API'}) · 留空保持不变`
                          : 'sk-ant-...'
                      }
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* clawgod CLI Path Check */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>项目隔离运行时 (dependencies/claude/bin/clawgod)</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                        {activeExecutor.cli_available
                          ? activeExecutor.cli_path
                          : '未安装 · 请运行 harness2 setup <bench> --substrate claude'}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0 ${
                        activeExecutor.cli_available
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {activeExecutor.cli_available ? 'clawgod 已就绪' : '待安装'}
                    </span>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------- */}
              {/* OPENCODE SUBSTRATE CONFIGURATION                        */}
              {/* ------------------------------------------------------- */}
              {selectedTab === 'oc' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      OpenCode 求解器模型 (HARNESS2_SOLVER_MODEL · 需带 provider/ 前缀)
                    </label>
                    <input
                      type="text"
                      value={ocModel}
                      onChange={(e) => setOcModel(e.target.value)}
                      placeholder="例如: harness2/claude-sonnet-4-6 或 google-vertex/gemini-2.5-pro"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {activeExecutor.supported_models.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setOcModel(m)}
                          className={`px-2 py-0.5 text-[10px] font-mono rounded-md border cursor-pointer ${
                            ocModel === m
                              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/40 font-semibold'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      当配置了统一 API (<code className="font-mono">HARNESS2_API_BASE_URL</code>) 时，系统会自动通过{' '}
                      <code className="font-mono">OPENCODE_CONFIG_CONTENT</code> 注入名为{' '}
                      <code className="font-mono">harness2</code> 的 Provider 块。
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        专属端点覆盖 (HARNESS2_OPENCODE_BASE_URL)
                      </label>
                      <input
                        type="text"
                        value={ocBaseUrl}
                        onChange={(e) => setOcBaseUrl(e.target.value)}
                        placeholder={
                          unifiedCfg?.base_url
                            ? `留空默认继承统一 API (${unifiedCfg.base_url})`
                            : 'https://your-openai-compatible.example.com/v1'
                        }
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        SDK 协议包 (HARNESS2_OPENCODE_PROTOCOL)
                      </label>
                      <select
                        value={ocProtocol}
                        onChange={(e) => setOcProtocol(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">默认 (openai-chat / @ai-sdk/openai-compatible)</option>
                        <option value="openai-chat">openai-chat (@ai-sdk/openai-compatible)</option>
                        <option value="anthropic">anthropic (@ai-sdk/anthropic)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      专属 API Key 覆盖 (HARNESS2_OPENCODE_API_KEY)
                    </label>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={ocApiKey}
                      onChange={(e) => setOcApiKey(e.target.value)}
                      placeholder={
                        activeExecutor.api_key_configured
                          ? `已配置 (${activeExecutor.api_key_masked || '继承自统一API / Vertex'}) · 留空保持不变`
                          : '留空使用统一 API Key 或 Vertex ADC'
                      }
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------- */}
              {/* CODEX SUBSTRATE & RESPONSES BRIDGE CONFIGURATION        */}
              {/* ------------------------------------------------------- */}
              {selectedTab === 'cx' && (
                <div className="space-y-4">
                  {/* Built-in Responses Bridge Control Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            内置 Responses 协议转换桥 (harness2-responses-bridge)
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              bridge?.running
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            {bridge?.running ? `运行中 (:${bridge.port})` : '未运行'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          Codex 0.144.6 仅支持 <code className="font-mono">wire_api = &quot;responses&quot;</code>。若上游网关仅提供 OpenAI Chat Completions，可在此一键启动本地转换桥并自动写入{' '}
                          <code className="font-mono">dependencies/codex/home/config.toml</code>。
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500 font-medium">监听地址:</span>
                        <select
                          value={bridgeHost}
                          onChange={(e) => setBridgeHost(e.target.value as '127.0.0.1' | '0.0.0.0')}
                          className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-900 dark:text-white"
                        >
                          <option value="127.0.0.1">127.0.0.1 (宿主机 JB / LAB)</option>
                          <option value="0.0.0.0">0.0.0.0 (含 WorkBuddy Docker 容器)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        {bridge?.running ? (
                          <button
                            type="button"
                            disabled={bridgeBusy}
                            onClick={handleStopBridge}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Square className="w-3.5 h-3.5 fill-current" />
                            <span>停止转换桥</span>
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={bridgeBusy}
                          onClick={handleStartBridge}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>
                            {bridgeBusy
                              ? '正在处理...'
                              : bridge?.running
                              ? '重启转换桥并同步'
                              : '一键启动转换桥并绑定 Codex'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {bridge?.running && (
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 space-y-1">
                        <div>Local URL: {bridge.local_url}</div>
                        <div>Upstream: {bridge.upstream}</div>
                      </div>
                    )}
                  </div>

                  {/* Codex config.toml Sync Status */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <FileCode2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>CODEX_HOME/config.toml 状态校验</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                        {activeExecutor.config_toml_status === 'ok'
                          ? 'dependencies/codex/home/config.toml 与当前环境变量完全一致'
                          : activeExecutor.config_toml_error || '保存配置时将自动重新生成 config.toml'}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0 ${
                        activeExecutor.config_toml_status === 'ok'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {activeExecutor.config_toml_status === 'ok' ? '已同步' : '待同步'}
                    </span>
                  </div>

                  {/* Codex Model */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Codex 模型 ID (HARNESS2_CODEX_MODEL · 不带 provider 前缀)
                    </label>
                    <input
                      type="text"
                      value={cxModel}
                      onChange={(e) => setCxModel(e.target.value)}
                      placeholder="例如: gpt-5.4 或 gpt-4o"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {activeExecutor.supported_models.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setCxModel(m)}
                          className={`px-2 py-0.5 text-[10px] font-mono rounded-md border cursor-pointer ${
                            cxModel === m
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/40 font-semibold'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Codex Endpoints */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Responses 端点 (HARNESS2_CODEX_BASE_URL)
                      </label>
                      <input
                        type="text"
                        value={cxBaseUrl}
                        onChange={(e) => setCxBaseUrl(e.target.value)}
                        placeholder={
                          unifiedCfg?.base_url
                            ? `留空继承统一 API (${unifiedCfg.base_url})`
                            : 'http://127.0.0.1:PORT/v1'
                        }
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        容器内端点 (HARNESS2_CODEX_CONTAINER_URL · 可选)
                      </label>
                      <input
                        type="text"
                        value={cxContainerUrl}
                        onChange={(e) => setCxContainerUrl(e.target.value)}
                        placeholder="http://host.docker.internal:PORT/v1"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Codex 鉴权密钥 (HARNESS2_CODEX_API_KEY)
                    </label>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={cxApiKey}
                      onChange={(e) => setCxApiKey(e.target.value)}
                      placeholder={
                        activeExecutor.api_key_configured
                          ? `已配置 (${activeExecutor.api_key_masked || '继承自统一API'}) · 留空保持不变`
                          : '留空默认继承 HARNESS2_API_KEY'
                      }
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------- */}
              {/* IMPROVER, JUDGE & VERTEX AI CONFIGURATION               */}
              {/* ------------------------------------------------------- */}
              {selectedTab === 'vertex' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        改进器模型 (HARNESS2_IMPROVER_MODEL)
                      </label>
                      <input
                        type="text"
                        value={improverModel}
                        onChange={(e) => setImproverModel(e.target.value)}
                        placeholder={
                          unifiedCfg?.effective_improver_model
                            ? `默认复用执行器 (${unifiedCfg.effective_improver_model})`
                            : '留空默认复用 SOLVER_MODEL'
                        }
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        用于 Propose / Compose / Select 演进通道（OpenCode 语法需带 provider/ 前缀）。
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        双盲裁判模型 (HARNESS2_JUDGE_MODEL)
                      </label>
                      <input
                        type="text"
                        value={judgeModel}
                        onChange={(e) => setJudgeModel(e.target.value)}
                        placeholder="例如: gemini-2.5-pro 或 claude-sonnet-4-6"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {activeExecutor.supported_models.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setJudgeModel(m)}
                            className="px-2 py-0.5 text-[10px] font-mono rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-purple-400 cursor-pointer"
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* External Judge Endpoint Overrides */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        裁判专属端点 (HARNESS2_JUDGE_BASE_URL · 可选)
                      </label>
                      <input
                        type="text"
                        value={judgeBaseUrl}
                        onChange={(e) => setJudgeBaseUrl(e.target.value)}
                        placeholder="https://your-judge-endpoint.example.com/v1"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        裁判专属密钥 (HARNESS2_JUDGE_API_KEY · 可选)
                      </label>
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={judgeApiKey}
                        onChange={(e) => setJudgeApiKey(e.target.value)}
                        placeholder={
                          unifiedCfg?.judge_api_key_configured
                            ? `已配置 (${unifiedCfg.judge_api_key_masked}) · 留空保持不变`
                            : '使用非 Vertex 裁判服务时填写'
                        }
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Google Cloud Vertex AI Project & Location */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Google Cloud Vertex AI 配置（仅在使用 google-vertex/* 模型或 Vertex 裁判时需要）
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          GCP 项目 ID (GOOGLE_CLOUD_PROJECT)
                        </label>
                        <input
                          type="text"
                          value={vertexProject}
                          onChange={(e) => setVertexProject(e.target.value)}
                          placeholder="your-gcp-project-id"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Vertex 区域 (GOOGLE_CLOUD_LOCATION)
                        </label>
                        <input
                          type="text"
                          value={vertexLocation}
                          onChange={(e) => setVertexLocation(e.target.value)}
                          placeholder="global"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Capabilities List */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wide">
                  基座架构特性 (Substrate Surface & Capabilities)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {activeExecutor.capabilities.map((cap, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate" title={cap}>
                        {cap}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
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
              <span>刷新状态</span>
            </button>

            <button
              type="button"
              disabled={testing}
              onClick={handleTestEndpoint}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl cursor-pointer disabled:opacity-50"
            >
              <Activity className={`w-3.5 h-3.5 ${testing ? 'animate-pulse' : ''}`} />
              <span>{testing ? '正在探测端点...' : '测试端点连通性'}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              关闭
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveConfig}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? <span>保存同步中...</span> : <span>保存并同步到 .env</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
