'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<
  ToastVariant,
  { container: string; icon: string }
> = {
  success: {
    container:
      'bg-status-success-bg border-status-success-border text-status-success-text',
    icon: 'text-status-success-text',
  },
  error: {
    container:
      'bg-status-error-bg border-status-error-border text-status-error-text',
    icon: 'text-status-error-text',
  },
  warning: {
    container:
      'bg-status-warning-bg border-status-warning-border text-status-warning-text',
    icon: 'text-status-warning-text',
  },
  info: {
    container:
      'bg-status-info-bg border-status-info-border text-status-info-text',
    icon: 'text-status-info-text',
  },
};

const ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle className="w-4 h-4 shrink-0" aria-hidden />,
  error: <AlertCircle className="w-4 h-4 shrink-0" aria-hidden />,
  warning: <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />,
  info: <Info className="w-4 h-4 shrink-0" aria-hidden />,
};

const AUTO_DISMISS_MS = 4000;

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onDismiss(toast.id);
    }, AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, onDismiss]);

  const styles = VARIANT_STYLES[toast.variant];

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg animate-fade-in-up min-w-[280px] max-w-sm ${styles.container}`}
    >
      <span className={`mt-0.5 ${styles.icon}`}>{ICONS[toast.variant]}</span>
      <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className={`mt-0.5 shrink-0 rounded focus:outline-none focus:ring-2 focus:ring-accent-primary opacity-70 hover:opacity-100 transition-opacity ${styles.icon}`}
      >
        <X className="w-4 h-4" aria-hidden />
      </button>
    </div>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside ToastProvider');
  }

  const { toast } = ctx;

  return {
    toast: {
      success: (message: string) => toast(message, 'success'),
      error: (message: string) => toast(message, 'error'),
      warning: (message: string) => toast(message, 'warning'),
      info: (message: string) => toast(message, 'info'),
    },
  };
}
