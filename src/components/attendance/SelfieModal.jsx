import { X } from "lucide-react";
import "./SelfieModal.css";

function SelfieModal({ open, imageUrl, title, onClose }) {
  if (!open || !imageUrl) return null;

  return (
    <div className="attendance-selfie-modal-overlay" onClick={onClose}>
      <div
        className="attendance-selfie-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="attendance-selfie-modal-header">
          <h3>{title}</h3>
          <button
            type="button"
            className="attendance-selfie-close-btn"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="attendance-selfie-modal-body">
          <img src={imageUrl} alt={title} className="attendance-selfie-preview-img" />
        </div>
      </div>
    </div>
  );
}

export default SelfieModal;
