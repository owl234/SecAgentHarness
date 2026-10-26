import React from 'react';
import {
  Activity,
  GitBranch,
  BookOpen,
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
  const { t } = useLang();

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
      subLabel: '双层递归全景流',
      icon: Workflow,
      badge: '大屏',
    },
    {
      id: 'workbench',
      label: t('nav.workbench'),
      subLabel: '任务调度与启动',
      icon: Activity,
    },
    {
      id: 'dashboard',
      label: t('nav.dashboard'),
      subLabel: '历史运行与量化评估',
      icon: BarChart3,
    },
    {
      id: 'studio',
      label: t('nav.studio'),
      subLabel: '9 大套件组件编辑',
      icon: Layers,
      badge: 'c1~c9',
    },
    {
      id: 'pipeline',
      label: t('nav.pipeline'),
      subLabel: '递归拓扑与轨迹审阅',
      icon: GitBranch,
    },
    {
      id: 'library',
      label: t('nav.library'),
      subLabel: '跨任务持续演进经验',
      icon: BookOpen,
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
