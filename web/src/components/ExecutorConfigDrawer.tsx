import React, { useEffect, useState } from 'react';
import {
  Cpu,
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Terminal,
  Shield,
  Key,
  Sliders,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Flame,
  Bot,
  Zap,
} from 'lucide-react';
import { ExecutorItem, ExecutorStatusResponse } from '../types';
import { fetchExecutors, saveExecutorConfig } from '../api';

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
  const [executorsData, setExecutorsData] = useState<ExecutorStatusResponse | null>(null);
  const [selectedExecutorId, setSelectedExecutorId] = useState<string>('claude');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Claude Configuration Form States
  const [claudeModel, setClaudeModel] = useState('claude-3-7-sonnet-20250219');
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [claudeThinkingTokens, setClaudeThinkingTokens] = useState<number>(4096);
  const [showApiKey, setShowApiKey] = useState(false);

  // Other Executors Form States
  const [ocModel, setOcModel] = useState('google-vertex/gemini-2.5-pro');
  const [cxModel, setCxModel] = useState('gpt-4o');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const loadExecutors = async () => {
    setLoading(true);
    try {
      const data = await fetchExecutors();
      setExecutorsData(data);
      const claude = data.executors.find((e) => e.id === 'claude');
      if (claude) {
        if (claude.current_model) setClaudeModel(claude.current_model);
        if (claude.thinking_budget !== undefined) setClaudeThinkingTokens(claude.thinking_budget);
      }
      const oc = data.executors.find((e) => e.id === 'oc');
      if (oc?.current_model) setOcModel(oc.current_model);
      const cx = data.executors.find((e) => e.id === 'cx');
      if (cx?.current_model) setCxModel(cx.current_model);
    } catch (err: any) {
      console.error('获取执行器失败 (Failed to load executors):', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadExecutors();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeExecutor = executorsData?.executors.find((e) => e.id === selectedExecutorId);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      if (selectedExecutorId === 'claude') {
        await saveExecutorConfig({
          executor_id: 'claude',
          model: claudeModel,
          api_key: claudeApiKey || undefined,
          thinking_budget: claudeThinkingTokens,
        });
      } else if (selectedExecutorId === 'oc') {
        await saveExecutorConfig({
          executor_id: 'oc',
          model: ocModel,
        });
      } else if (selectedExecutorId === 'cx') {
        await saveExecutorConfig({
          executor_id: 'cx',
          model: cxModel,
        });
      }
      showToast('执行器配置已更新并立即生效！');
      await loadExecutors();
      if (onExecutorChanged) onExecutorChanged();
    } catch (err: any) {
      showToast(`配置保存失败: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full max-w-2xl h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-orange-500 border border-orange-500/30">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  执行器与模型配置中心
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                  一等公民扩展
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                管理 Claude Code、OpenCode、Codex 及 Vertex AI 执行引擎与思考预算
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

        {/* Executor Selector Pills */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 overflow-x-auto">
          {executorsData?.executors.map((e) => {
            const isSelected = selectedExecutorId === e.id;
            const isReady = e.status === 'ready';

            return (
              <button
                key={e.id}
                onClick={() => setSelectedExecutorId(e.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {e.id === 'claude' && <Flame className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300' : 'text-orange-500'}`} />}
                {e.id === 'oc' && <Bot className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-200' : 'text-blue-500'}`} />}
                {e.id === 'cx' && <Terminal className={`w-3.5 h-3.5 ${isSelected ? 'text-green-200' : 'text-green-500'}`} />}
                {e.id === 'vertex' && <Zap className={`w-3.5 h-3.5 ${isSelected ? 'text-purple-200' : 'text-purple-500'}`} />}

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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeExecutor && (
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
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide">
                    {activeExecutor.title}
                  </div>
                  <p className="text-xs mt-0.5 leading-relaxed">
                    {activeExecutor.status_message}
                  </p>
                </div>
              </div>

              {/* CLAUDE SPECIFIC CONFIGURATION */}
              {selectedExecutorId === 'claude' && (
                <div className="space-y-5">
                  <div className="bg-gradient-to-r from-orange-500/5 via-amber-500/5 to-transparent border border-orange-500/20 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2 text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                      <Flame className="w-4 h-4" />
                      <span>Claude 专属深度思考与执行器配置 (Claude Extended Engine)</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      已集成 Anthropic 官方 Claude 3.7 Sonnet 混合推理能力。支持在任务执行（Solver）、进化学员（Proposer）与双盲裁判（Judge）中全面调用。
                    </p>
                  </div>

                  {/* Claude Model Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      选择 Claude 推理模型 (Model Version)
                    </label>
                    <select
                      value={claudeModel}
                      onChange={(e) => setClaudeModel(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500"
                    >
                      <option value="claude-3-7-sonnet-20250219">
                        Claude 3.7 Sonnet (推荐 · 支持混合思考 Extended Thinking)
                      </option>
                      <option value="claude-3-5-sonnet-20241022">
                        Claude 3.5 Sonnet v2 (快速 · 极佳代码能力)
                      </option>
                      <option value="claude-3-5-haiku-20241022">
                        Claude 3.5 Haiku (超轻量 · 高并发演进)
                      </option>
                      <option value="claude-3-opus-20240229">
                        Claude 3 Opus (超高逻辑密度与严苛裁判)
                      </option>
                      <option value="vertex/claude-3-7-sonnet">
                        Vertex AI Claude 3.7 Sonnet (Google Cloud 统一凭证通道)
                      </option>
                    </select>
                  </div>

                  {/* Extended Thinking Token Budget */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          深度思考 Token 预算 (Extended Thinking Budget)
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                        {claudeThinkingTokens === 0 ? '已关闭 (0)' : `${claudeThinkingTokens.toLocaleString()} tokens`}
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="32768"
                      step="1024"
                      value={claudeThinkingTokens}
                      onChange={(e) => setClaudeThinkingTokens(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <button
                        onClick={() => setClaudeThinkingTokens(0)}
                        className="hover:text-blue-500 cursor-pointer"
                      >
                        标准模式 (0)
                      </button>
                      <button
                        onClick={() => setClaudeThinkingTokens(4096)}
                        className="hover:text-blue-500 cursor-pointer"
                      >
                        推荐默认 (4,096)
                      </button>
                      <button
                        onClick={() => setClaudeThinkingTokens(8192)}
                        className="hover:text-blue-500 cursor-pointer"
                      >
                        深度推演 (8,192)
                      </button>
                      <button
                        onClick={() => setClaudeThinkingTokens(16384)}
                        className="hover:text-blue-500 cursor-pointer"
                      >
                        极限求解 (16,384)
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      赋予 Claude 更多的内置思考预算，在生成 Harness 补丁或处理边缘 Case 前在推理链条中多重自检，显著降低语法与逻辑回归风险。
                    </p>
                  </div>

                  {/* Anthropic API Key */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-slate-400" />
                        <span>Anthropic API Key (或留空使用系统环境变量)</span>
                      </label>
                      <button
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
                          ? '已通过环境变量注入 (输入新密钥可覆盖更新)'
                          : 'sk-ant-api03-...'
                      }
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Claude CLI Path Check */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-slate-400" />
                        <span>Claude Code CLI 命令行工具</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {activeExecutor.cli_available ? activeExecutor.cli_path : '未检测到 claude 二进制文件 (可通过 npm i -g @anthropic-ai/claude-code 安装)'}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                        activeExecutor.cli_available
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {activeExecutor.cli_available ? 'CLI 已探测' : '未安装'}
                    </span>
                  </div>
                </div>
              )}

              {/* OPENCODE SPECIFIC CONFIGURATION */}
              {selectedExecutorId === 'oc' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      OpenCode 求解器模型 (HARNESS2_SOLVER_MODEL)
                    </label>
                    <select
                      value={ocModel}
                      onChange={(e) => setOcModel(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="google-vertex/gemini-2.5-pro">google-vertex/gemini-2.5-pro</option>
                      <option value="google-vertex/gemini-2.5-flash">google-vertex/gemini-2.5-flash</option>
                      <option value="openai/gpt-4o">openai/gpt-4o</option>
                      <option value="anthropic/claude-3-7-sonnet">anthropic/claude-3-7-sonnet</option>
                    </select>
                  </div>
                </div>
              )}

              {/* CODEX SPECIFIC CONFIGURATION */}
              {selectedExecutorId === 'cx' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Codex 容器模型 (HARNESS2_CODEX_MODEL)
                    </label>
                    <select
                      value={cxModel}
                      onChange={(e) => setCxModel(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="gpt-4o">gpt-4o</option>
                      <option value="o1">o1</option>
                      <option value="o3-mini">o3-mini</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Capabilities List */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wide">
                  引擎支持的特性能力 (Capability Matrix)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {activeExecutor.capabilities.map((cap, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">{cap}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between">
          <button
            onClick={loadExecutors}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>重新诊断执行器</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              关闭
            </button>
            <button
              disabled={saving}
              onClick={handleSaveConfig}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? <span>保存中...</span> : <span>保存并应用配置</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
