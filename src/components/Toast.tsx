import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastData {
  message: string;
  type: ToastType;
  id: number;
}

const RETRO_PREFIXES: Record<ToastType, string> = {
  success: 'Gnarly!',
  error: 'Bogus!',
  info: 'Radical!',
};

const ToastContext = createContext<(message: string, type?: ToastType) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, type, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const typeColors: Record<ToastType, string> = {
    success: 'border-neon-cyan bg-neon-cyan/10',
    error: 'border-neon-red bg-neon-red/10',
    info: 'border-neon-pink bg-neon-pink/10',
  };

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[90%] max-w-[400px]">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              px-4 py-3 rounded-lg border text-sm font-medium
              animate-[slideDown_0.3s_ease-out]
              ${typeColors[toast.type]}
            `}
          >
            <span className="font-display font-bold text-xs mr-2">
              {RETRO_PREFIXES[toast.type]}
            </span>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
