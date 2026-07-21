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

// Monotonic toast ids. `Date.now()` collided when two toasts fired in the same
// millisecond (duplicate React keys; the shared removal timeout then dismissed
// both toasts at once).
let toastSeq = 0;

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
    const id = ++toastSeq;

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
          announced to screen-reader users. Placement is safe-area-aware so a toast
          never sits under the iOS status bar / notch. (`animate-toastIn` — the old
          `animate-slide-in` class never existed, so toasts popped in unanimated;
          `bg-primary-deep` is the brand token, 8:1 with white — up from green-700's 5.3:1.) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="fixed right-[max(1.25rem,env(safe-area-inset-right))] top-[max(1.25rem,env(safe-area-inset-top))] z-50 space-y-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-toastIn max-w-[calc(100vw-2.5rem)] rounded-2xl bg-primary-deep px-5 py-3 text-[15px] font-medium text-white shadow-soft-lg sm:max-w-sm"
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}