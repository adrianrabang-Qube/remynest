"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useMemo,
} from "react";

type Toast = {
  id: number;
  message: string;
};

type ToastContextType = {
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

export default function ToastProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string) => {
    const id = Date.now();

    setToasts((prev) => [...prev, { id, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  // LA3 (perf): stable context value so useToast() consumers don't re-render on each
  // toast add / ~3s auto-removal (showToast is already a stable useCallback).
  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* LA2 (WCAG 4.1.3 Status Messages): a persistent polite live region so the
          app-wide success/error channel ("Memory saved", "Person added", errors) is
          announced to screen-reader users. */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-5 right-5 space-y-2 z-50"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="bg-green-700 text-white px-4 py-2 rounded shadow-lg animate-slide-in"
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}