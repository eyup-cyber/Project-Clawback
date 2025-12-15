"use client";

import {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
  useRef,
} from "react";
import { createPortal } from "react-dom";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastData[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Generate unique ID
function generateId() {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Toast icons
const icons: Record<ToastType, React.ReactNode> = {
  success: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  error: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  info: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  warning: (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

// Toast colors
const colors: Record<
  ToastType,
  { bg: string; border: string; text: string; icon: string }
> = {
  success: {
    bg: "rgba(50, 205, 50, 0.1)",
    border: "var(--primary)",
    text: "var(--foreground)",
    icon: "var(--primary)",
  },
  error: {
    bg: "rgba(255, 0, 255, 0.1)",
    border: "var(--accent)",
    text: "var(--foreground)",
    icon: "var(--accent)",
  },
  info: {
    bg: "rgba(255, 215, 0, 0.1)",
    border: "var(--secondary)",
    text: "var(--foreground)",
    icon: "var(--secondary)",
  },
  warning: {
    bg: "rgba(255, 165, 0, 0.1)",
    border: "#FFA500",
    text: "var(--foreground)",
    icon: "#FFA500",
  },
};

// Individual Toast component
export function Toast({
  toast,
  onRemove,
}: {
  toast: ToastData;
  onRemove: (id: string) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true));

    // Set auto-dismiss timer
    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, duration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.duration]);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  }, [toast.id, onRemove]);

  const color = colors[toast.type];

  return (
    <div
      className="relative flex items-start gap-3 p-4 rounded-xl shadow-lg backdrop-blur-sm transition-all duration-300 cursor-pointer"
      style={{
        background: color.bg,
        border: `1px solid ${color.border}`,
        transform:
          isVisible && !isExiting
            ? "translateX(0) scale(1)"
            : "translateX(100%) scale(0.95)",
        opacity: isVisible && !isExiting ? 1 : 0,
        maxWidth: "400px",
      }}
      onClick={handleDismiss}
      role="alert"
    >
      {/* Icon */}
      <span style={{ color: color.icon, flexShrink: 0 }}>
        {icons[toast.type]}
      </span>

      {/* Message */}
      <p
        className="text-sm font-medium flex-1"
        style={{
          color: color.text,
          fontFamily: "var(--font-body)",
        }}
      >
        {toast.message}
      </p>

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
        className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
        style={{ color: color.text }}
        aria-label="Dismiss"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Progress bar */}
      {toast.duration !== 0 && (
        <div
          className="absolute bottom-0 left-0 h-1 rounded-b-xl"
          style={{
            background: color.border,
            animation: `shrink ${toast.duration ?? 4000}ms linear forwards`,
          }}
        />
      )}

      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

// Toast container component
export function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastData[];
  onRemove: (id: string) => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-auto"
      style={{ maxWidth: "calc(100vw - 2rem)" }}
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>,
    document.body
  );
}

// Toast Provider
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback(
    (type: ToastType, message: string, duration?: number) => {
      const id = generateId();
      setToasts((prev) => [...prev, { id, type, message, duration }]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (message: string, duration?: number) => {
      addToast("success", message, duration);
    },
    [addToast]
  );

  const error = useCallback(
    (message: string, duration?: number) => {
      addToast("error", message, duration);
    },
    [addToast]
  );

  const info = useCallback(
    (message: string, duration?: number) => {
      addToast("info", message, duration);
    },
    [addToast]
  );

  const warning = useCallback(
    (message: string, duration?: number) => {
      addToast("warning", message, duration);
    },
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, info, warning }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// Hook to use toast
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Export for direct import (not in provider context)
export default Toast;
