import { Info } from "lucide-react";
import "./StatusNoteButton.css";

/** ConfirmModal payload for a read-only note (Close only, no Cancel). */
export function statusNoteDialog({ title, message, onClose }) {
  return {
    title,
    message,
    variant: "info",
    confirmLabel: "Close",
    cancelLabel: null,
    onConfirm: onClose,
  };
}

/** Keeps table rows one line; full note is on hover and opens on click. */
export default function StatusNoteButton({ title, message, onOpen }) {
  const note = String(message || "").trim();
  if (!note) return null;
  return (
    <button
      type="button"
      className="status-note-btn"
      title={`${title}: ${note}`}
      aria-label={title}
      onClick={(event) => {
        event.stopPropagation();
        onOpen?.({ title, message: note });
      }}
    >
      <Info size={15} />
    </button>
  );
}
