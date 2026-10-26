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
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/10 shrink-0">
              <span className="font-extrabold text-white text-base tracking-tighter">H²</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight truncate">
                  {t('nav.brand')}
                </span>
                <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 whitespace-nowrap">
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
