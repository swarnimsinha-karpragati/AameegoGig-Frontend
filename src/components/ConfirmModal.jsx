import { useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import "./ConfirmModal.css";

/**
 * Reusable confirmation modal.
 *
 * Props:
 *  open        – boolean: whether the modal is visible
 *  title       – string: modal heading
 *  message     – string | ReactNode: descriptive body text
 *  confirmLabel – string (default "Confirm"): text for the confirm button
 *  cancelLabel  – string (default "Cancel")
 *  variant     – "danger" | "warning" | "success" (default "danger")
 *  onConfirm   – () => void
 *  onCancel    – () => void
 *  loading     – boolean: disables buttons while action is in-flight
 *
 *  Extra slot for text-input (e.g. reject comment):
 *  inputLabel  – string: if provided, renders a textarea inside the modal
 *  inputValue  – string
 *  onInputChange – (value: string) => void
 *  inputPlaceholder – string
 */
function ConfirmModal({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
  loading = false,
  inputLabel,
  inputValue,
  onInputChange,
  inputPlaceholder = "",
}) {
  const cancelRef = useRef(null);

  /* Focus cancel on open for keyboard accessibility */
  useEffect(() => {
    if (open) {
      cancelRef.current?.focus();
    }
  }, [open]);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (e.key === "Escape" && !loading) onCancel?.();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const ICONS = {
    danger: <AlertTriangle size={22} className="confirm-modal-icon danger" />,
    warning: <AlertTriangle size={22} className="confirm-modal-icon warning" />,
    success: <CheckCircle2 size={22} className="confirm-modal-icon success" />,
  };

  return (
    <div
      className="confirm-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={() => !loading && onCancel?.()}
    >
      <div
        className={`confirm-modal confirm-modal--${variant}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close X */}
        <button
          type="button"
          className="confirm-modal-close"
          onClick={() => !loading && onCancel?.()}
          disabled={loading}
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="confirm-modal-header">
          {ICONS[variant]}
          <h2 id="confirm-modal-title" className="confirm-modal-title">
            {title}
          </h2>
        </div>

        {/* Body */}
        {message ? (
          <p className="confirm-modal-message">{message}</p>
        ) : null}

        {/* Optional textarea input (e.g. rejection reason) */}
        {inputLabel ? (
          <div className="confirm-modal-input-block">
            <label className="confirm-modal-input-label">{inputLabel}</label>
            <textarea
              className="confirm-modal-textarea"
              placeholder={inputPlaceholder}
              value={inputValue}
              onChange={(e) => onInputChange?.(e.target.value)}
              rows={3}
              disabled={loading}
            />
          </div>
        ) : null}

        {/* Actions */}
        <div className="confirm-modal-actions">
          <button
            ref={cancelRef}
            type="button"
            className="confirm-modal-btn cancel"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-modal-btn confirm confirm--${variant}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
