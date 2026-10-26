import React from 'react';
import {
  Activity,
  BarChart3,
  Layers,
  Workflow,
} from 'lucide-react';
import { NavTabType } from '../types';
import { useLang } from '../i18n/LangContext';

interface SidebarProps {
  currentTab: NavTabType;
  setCurrentTab: (tab: NavTabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
}) => {
  const { t, tx } = useLang();

  const navItems: {
    id: NavTabType;
    label: string;
    subLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[] = [
    {
      id: 'overview',
      label: t('nav.overview'),
      subLabel: tx('双层递归全景推演', 'Dual-Recursion Showcase'),
      icon: Workflow,
      badge: tx('大屏', 'Flow'),
    },
    {
      id: 'workbench',
      label: t('nav.workbench'),
      subLabel: tx('任务调度与实时终端', 'Dispatcher & Live Console'),
      icon: Activity,
      badge: tx('调度', 'Run'),
    },
    {
      id: 'dashboard',
      label: t('nav.dashboard'),
      subLabel: tx('量化大盘与递归 DAG', 'Scores, DAG & Smart Diff'),
      icon: BarChart3,
      badge: 'DAG·Diff',
    },
    {
      id: 'studio',
      label: t('nav.studio'),
      subLabel: tx('c1~c9 装配与经验池', 'c1~c9 Surfaces & Library'),
      icon: Layers,
      badge: 'c1~c9',
    },
  ];

  return (
    <>
      {/* Desktop: vertical left sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-14 h-[calc(100vh-3.5rem)]">
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer text-left ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 min-w-0 flex flex-col leading-tight">
                  <span className="truncate">{item.label}</span>
                  <span
                    className={`text-[11px] font-normal truncate ${
                      isActive ? 'text-white/75' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {item.subLabel}
                  </span>
                </span>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile: horizontal module strip below topbar */}
      <nav className="flex md:hidden items-center gap-1 px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto sticky top-14 z-30">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
