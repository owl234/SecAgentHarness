import { zh, type ZhKey } from './zh';

/** 保持与 zh.ts 完全一致的字典映射，并提供关键英文品牌与导航覆盖 */
export const en: Record<ZhKey, string> = {
  ...zh,
  'nav.brand': 'SecAgentHarness²',
  'nav.badge': 'Cyber AI Evolution',
  'nav.subtitle': 'Cybersecurity Agent Harness Recursive Evolution & Benchmark Platform',
  'nav.overview': 'Workflow Showcase',
  'nav.overview_title': 'SecAgentHarness² Workflow Showcase: Dual-Recursion Lifecycle',
  'nav.workbench': 'Workbench',
  'nav.dashboard': 'Evaluation Dashboard',
  'nav.studio': 'Component Studio',
  'nav.pipeline': 'Evolution Pipeline',
  'nav.library': 'Experience Library',
  'nav.benchmark': 'Benchmark Matrix',
  'nav.executor': 'API & Substrates',
  'nav.running': 'Running',
  'nav.ready': 'Ready',
  'nav.offline': 'Offline',
  'nav.guide_title': 'View SecAgentHarness² Theory Guide (c1..c9 / k-budget / DAG)',
};

export type Lang = 'zh' | 'en';
export const dicts = { zh, en } as const;
