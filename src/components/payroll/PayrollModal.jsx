import React from "react";
import { X } from "lucide-react";

export default function PayrollModal({
  open,
  onClose,
  title,
  description,
  children,
  alignLeft = false,
}) {
  if (!open) return null;

  return (
    <div className="upload-overlay" onClick={onClose}>
      <div
        className="upload-modal glass-morphism"
        style={alignLeft ? { textAlign: "left" } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="upload-close" onClick={onClose} type="button">
          <X size={18} />
        </button>
        {title ? <h2 style={{ paddingRight: 32 }}>{title}</h2> : null}
        {description ? <p>{description}</p> : null}
        {children}
      </div>
    </div>
  );
}
