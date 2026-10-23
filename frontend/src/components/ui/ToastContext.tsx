import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import { useLang } from '../../i18n/LangContext';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
  confirm: async () => true,
});

export function useEscapeKey(onEscape: () => void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onEscape();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onEscape, enabled]);
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tx } = useLang();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(1);
  const timersRef = useRef<Map<number, number>>(new Map());

  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (val: boolean) => void;
  } | null>(null);

  const dismissToast = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = nextIdRef.current++;
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
      const timer = window.setTimeout(() => {
        dismissToast(id);
      }, 3500);
      timersRef.current.set(id, timer);
    },
    [dismissToast]
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ options, resolve });
    });
  }, []);

  const handleConfirmClose = useCallback(
    (result: boolean) => {
      if (confirmState) {
        confirmState.resolve(result);
        setConfirmState(null);
      }
    },
    [confirmState]
  );

  useEscapeKey(() => handleConfirmClose(false), Boolean(confirmState));

  return (
    <ToastContext.Provider value={{ showToast, confirm }}>
      {children}

      {/* Floating Toast Stack */}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-6 right-6 z-[70] flex flex-col gap-2 max-w-md pointer-events-none"
          role="region"
          aria-live="polite"
        >
          {toasts.map((item) => (
            <div
              key={item.id}
              className="pointer-events-auto bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700/80 dark:border-slate-300 text-xs font-medium transition-all duration-200"
            >
              {item.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 dark:text-rose-600 shrink-0" />
              ) : item.type === 'info' ? (
                <Info className="w-4 h-4 text-blue-400 dark:text-blue-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
              )}
              <span className="flex-1 leading-relaxed">{item.message}</span>
              <button
                onClick={() => dismissToast(item.id)}
                className="text-slate-400 hover:text-white dark:hover:text-slate-900 p-0.5 rounded cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Non-blocking Accessible Confirm Dialog */}
      {confirmState && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => handleConfirmClose(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  confirmState.options.danger
                    ? 'bg-rose-500/10 text-rose-500'
                    : 'bg-amber-500/10 text-amber-500'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {confirmState.options.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {confirmState.options.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {confirmState.options.cancelText || tx('取消', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmClose(true)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer ${
                  confirmState.options.danger
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {confirmState.options.confirmText || tx('确认', 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
