import React from "react";
import { Info, X } from "lucide-react";

export default function PayrollStatusBanner({ message, onDismiss }) {
  if (!message?.text) return null;

  return (
    <div className={`status-banner ${message.type}`}>
      <Info size={18} />
      <span>{message.text}</span>
      <button onClick={onDismiss} className="close-status" type="button">
        <X size={14} />
      </button>
    </div>
  );
}
