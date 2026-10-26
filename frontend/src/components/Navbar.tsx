import React from 'react';
import {
  Terminal,
  Sun,
  Moon,
  HelpCircle,
  Flame,
} from 'lucide-react';
import { SystemStatus } from '../types';
import { useLang } from '../i18n/LangContext';

interface NavbarProps {
  systemStatus: SystemStatus | null;
  connected: boolean;
  onToggleConsole: () => void;
  showConsole: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenTerminology: () => void;
  onOpenExecutorConfig: () => void;
}

/**
 * SecAgentHarness² 专用高科技品牌徽标
 * 融合网络安全防线 (Shield) 与双层递归自适应演化环 (Dual Recursive Loop)
 */
const SecAgentLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="navSecShield" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
      <linearGradient id="navSecCore" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
    </defs>
    {/* Shield contour */}
    <path
      d="M16 3.5L6.5 7.5V14.5C6.5 20.8 10.5 26.5 16 28.5C21.5 26.5 25.5 20.8 25.5 14.5V7.5L16 3.5Z"
      stroke="url(#navSecShield)"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="fill-cyan-500/10"
    />
    {/* Recursive Dual Orbital Loop */}
    <path
      d="M12.5 16C12.5 13.5 14 11.5 16.5 11.5C18.5 11.5 19.8 12.8 20.2 14.2"
      stroke="url(#navSecCore)"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M18.8 14.2H20.5V12.5"
      stroke="url(#navSecCore)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19.5 16C19.5 18.5 18 20.5 15.5 20.5C13.5 20.5 12.2 19.2 11.8 17.8"
      stroke="url(#navSecCore)"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M13.2 17.8H11.5V19.5"
      stroke="url(#navSecCore)"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Center Core Dot */}
    <circle cx="16" cy="16" r="2" fill="#06b6d4" />
  </svg>
);

export const Navbar: React.FC<NavbarProps> = ({
  systemStatus,
  connected,
  onToggleConsole,
  showConsole,
  theme,
  onToggleTheme,
  onOpenTerminology,
  onOpenExecutorConfig,
}) => {
  const { t } = useLang();
  const isRunning = systemStatus?.status.status === 'running';

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Brand (compact) */}
          <div className="flex items-center gap-3 min-w-0 group cursor-default">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-blue-900 border border-cyan-500/30 dark:border-cyan-400/40 flex items-center justify-center shadow-md shadow-cyan-500/15 ring-1 ring-white/10 shrink-0 group-hover:scale-105 transition-transform duration-200">
              <SecAgentLogo className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight truncate flex items-center">
                  <span className="text-cyan-600 dark:text-cyan-400 font-black">Sec</span>
                  <span>AgentHarness</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono text-xs align-super ml-0.5">²</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25 whitespace-nowrap shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                  {t('nav.badge')}
                </span>
              </div>
              <p className="hidden lg:block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {t('nav.subtitle')}
              </p>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            {/* Executor Center Button */}
            <button
              onClick={onOpenExecutorConfig}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20 transition-all cursor-pointer"
              title={t('nav.executor_title')}
            >
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span className="hidden sm:inline">{t('nav.executor')}</span>
            </button>

            {/* Live Status Pill */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium ${
                isRunning
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 animate-pulse'
                  : connected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isRunning
                    ? 'bg-amber-500 animate-ping'
                    : connected
                    ? 'bg-emerald-500'
                    : 'bg-slate-400'
                }`}
              />
              <span className="hidden sm:inline">
                {isRunning ? t('nav.running') : connected ? t('nav.ready') : t('nav.offline')}
              </span>
            </div>

            {/* Live Console Drawer Toggle */}
            <button
              onClick={onToggleConsole}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                showConsole
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
              title={t('nav.console_title')}
            >
              <Terminal className="w-4 h-4" />
            </button>

            {/* Terminology Guide Modal Button */}
            <button
              onClick={onOpenTerminology}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 transition-all cursor-pointer"
              title={t('nav.guide_title')}
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 transition-all cursor-pointer"
              title={theme === 'dark' ? t('nav.theme_light') : t('nav.theme_dark')}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
