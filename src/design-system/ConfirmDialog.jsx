import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Info, Trash2 } from "lucide-react";
import Button from "./Button";
import { useBodyScrollLock, useFocusTrap } from "./overlayHooks";
import { cx } from "./utils";
import "./ConfirmDialog.css";

const VARIANT_CONFIG = {
  standard: { Icon: Info, confirmVariant: "primary" },
  destructive: { Icon: Trash2, confirmVariant: "danger" },
  success: { Icon: CheckCircle2, confirmVariant: "primary" },
};

export default function ConfirmDialog({
  open,
  variant = "standard",
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
  confirmDisabled = false,
  initialFocusRef,
  children,
}) {
  const safeVariant = VARIANT_CONFIG[variant] ? variant : "standard";
  const { Icon, confirmVariant } = VARIANT_CONFIG[safeVariant];
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);
  const baseId = useId().replace(/:/g, "");
  const titleId = `wz-dialog-${baseId}-title`;
  const messageId = `wz-dialog-${baseId}-message`;

  const requestCancel = () => {
    if (!loading) onCancel?.();
  };

  useFocusTrap(dialogRef, open, {
    initialFocusRef: initialFocusRef || (safeVariant === "destructive" ? cancelRef : confirmRef),
    onEscape: requestCancel,
  });
  useBodyScrollLock(open);

  if (!open) return null;

  return createPortal(
    <div className="wz-ds wz-dialog-root">
      <div className="wz-dialog-overlay" onMouseDown={requestCancel} aria-hidden="true" />
      <div
        ref={dialogRef}
        className={cx("wz-dialog", `wz-dialog--${safeVariant}`)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? messageId : undefined}
        tabIndex={-1}
      >
        <div className="wz-dialog__body">
          <span className="wz-dialog__icon" aria-hidden="true">
            <Icon />
          </span>
          <div className="wz-dialog__content">
            <h2 id={titleId} className="wz-dialog__title">
              {title}
            </h2>
            {message && (
              <p id={messageId} className="wz-dialog__message">
                {message}
              </p>
            )}
            {children}
          </div>
        </div>
        <div className="wz-dialog__footer">
          <Button ref={cancelRef} variant="secondary" onClick={requestCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button ref={confirmRef} variant={confirmVariant} onClick={onConfirm} loading={loading} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
