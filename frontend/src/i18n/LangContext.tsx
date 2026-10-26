import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { dicts, type Lang } from './en';
import type { ZhKey } from './zh';

const STORAGE_KEY = 'sec_agent_harness2_lang';

function detect(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'zh') return saved;
    const nav = (navigator.language || '').toLowerCase();
    // Default to zh (existing UI is Chinese-first); explicit en only when asked.
    if (nav.startsWith('en')) return 'en';
  } catch {}
  return 'zh';
}

interface LangCtx {
  lang: Lang;
  toggle: () => void;
  t: (key: ZhKey) => string;
  tx: (zhText: string, enText: string) => string;
}

const Ctx = createContext<LangCtx>({
  lang: 'zh',
  toggle: () => {},
  t: (k) => dicts.zh[k] ?? k,
  tx: (zhText) => zhText,
});

export const LangProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>(detect);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
    } catch {}
  }, [lang]);
  const toggle = useCallback(() => setLang((p) => (p === 'zh' ? 'en' : 'zh')), []);
  const t = useCallback((key: ZhKey) => dicts[lang][key] ?? dicts.zh[key] ?? key, [lang]);
  const tx = useCallback(
    (zhText: string, enText: string) => (lang === 'en' ? enText : zhText),
    [lang]
  );
  return <Ctx.Provider value={{ lang, toggle, t, tx }}>{children}</Ctx.Provider>;
};

export const useLang = () => useContext(Ctx);
