import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Button from "./Button";
import { useBodyScrollLock, useFocusTrap } from "./overlayHooks";
import "./Drawer.css";

export default function Drawer({ open, title, subtitle, onClose, footer, width = 520, children }) {
  const panelRef = useRef(null);
  const baseId = useId().replace(/:/g, "");
  const titleId = `wz-drawer-${baseId}-title`;
  const subtitleId = `wz-drawer-${baseId}-subtitle`;

  useFocusTrap(panelRef, open, { onEscape: onClose });
  useBodyScrollLock(open);

  if (!open) return null;

  return createPortal(
    <div className="wz-ds wz-drawer-root">
      <div className="wz-drawer-overlay" onMouseDown={() => onClose?.()} aria-hidden="true" />
      <aside
        ref={panelRef}
        className="wz-drawer"
        style={{ "--wz-drawer-width": typeof width === "number" ? `${width}px` : width }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
      >
        <header className="wz-drawer__header">
          <div className="wz-drawer__heading">
            {title && (
              <h2 id={titleId} className="wz-drawer__title">
                {title}
              </h2>
            )}
            {subtitle && (
              <p id={subtitleId} className="wz-drawer__subtitle">
                {subtitle}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" icon={<X />} aria-label="Close" onClick={() => onClose?.()} />
        </header>
        <div className="wz-drawer__body">{children}</div>
        {footer && <footer className="wz-drawer__footer">{footer}</footer>}
      </aside>
    </div>,
    document.body
  );
}
