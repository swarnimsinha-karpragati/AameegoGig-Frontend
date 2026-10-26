import { Info } from "lucide-react";
import "./StatusNoteButton.css";

/** Keeps table rows one line; full note opens on click (title covers hover). */
export default function StatusNoteButton({ title, message, onOpen }) {
  const note = String(message || "").trim();
  if (!note) return null;
  return (
    <button
      type="button"
      className="status-note-btn"
      title={title}
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
