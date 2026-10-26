import React, { createContext, useCallback, useContext, useEffect } from 'react';
import { zh, type ZhKey } from './zh';

export type Lang = 'zh' | 'en';

interface LangCtx {
  lang: Lang;
  toggle: () => void;
  t: (key: ZhKey) => string;
  tx: (zhText: string, _enText?: string) => string;
}

const Ctx = createContext<LangCtx>({
  lang: 'zh',
  toggle: () => {},
  t: (k) => zh[k] ?? k,
  tx: (zhText) => zhText,
});

export const LangProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    try {
      document.documentElement.lang = 'zh-CN';
    } catch {}
  }, []);
  const toggle = useCallback(() => {}, []);
  const t = useCallback((key: ZhKey) => zh[key] ?? key, []);
  const tx = useCallback((zhText: string, _enText?: string) => zhText, []);
  return <Ctx.Provider value={{ lang: 'zh', toggle, t, tx }}>{children}</Ctx.Provider>;
};

export const useLang = () => useContext(Ctx);
