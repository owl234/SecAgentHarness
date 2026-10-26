import { zh, type ZhKey } from './zh';

/** 保持与 zh.ts 完全一致的字典映射 */
export const en: Record<ZhKey, string> = { ...zh };

export type Lang = 'zh' | 'en';
export const dicts = { zh, en } as const;
