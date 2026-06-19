import { createContext, useCallback, useContext, useRef, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import "./Toast.css";

/* ========================
   CONTEXT
======================== */
const ToastContext = createContext(null);

let _id = 0;

/**
 * Wrap your app (or just the pages) with <ToastProvider>.
 * Then call useToast() anywhere inside.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ type = "info", message, duration = 4000 }) => {
      const id = ++_id;
      setToasts((prev) => [...prev, { id, type, message }]);

      if (duration > 0) {
        timers.current[id] = setTimeout(() => dismiss(id), duration);
      }

      return id;
    },
    [dismiss]
  );

  const success = useCallback(
    (message, opts) => toast({ type: "success", message, ...opts }),
    [toast]
  );
  const error = useCallback(
    (message, opts) => toast({ type: "error", message, ...opts }),
    [toast]
  );
  const warning = useCallback(
    (message, opts) => toast({ type: "warning", message, ...opts }),
    [toast]
  );
  const info = useCallback(
    (message, opts) => toast({ type: "info", message, ...opts }),
    [toast]
  );

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/** Hook — must be used inside a ToastProvider */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}

/* ========================
   ICONS PER TYPE
======================== */
const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

/* ========================
   SINGLE TOAST ITEM
======================== */
function ToastItem({ toast, onDismiss }) {
  const Icon = ICONS[toast.type] || Info;

  return (
    <div className={`toast-item toast-item--${toast.type}`} role="alert">
      <span className={`toast-icon toast-icon--${toast.type}`}>
        <Icon size={18} strokeWidth={2} />
      </span>
      <p className="toast-message">{toast.message}</p>
      <button
        type="button"
        className="toast-close"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/* ========================
   CONTAINER (rendered at page bottom-right)
======================== */
function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
