import React from "react";
import { FileSpreadsheet } from "lucide-react";
import PayrollModal from "./PayrollModal";

export default function PayrollUploadModal({
  open,
  uploadFile,
  uploadMessage,
  loading,
  onClose,
  onFileChange,
  onUpload,
}) {
  return (
    <PayrollModal open={open} onClose={onClose}>
      <div className="upload-icon-wrap">
        <FileSpreadsheet size={28} />
      </div>
      <h2>Bulk Upload Payments Sheet</h2>
      <p>Upload your Excel file containing bank transaction references for payroll reconciliation.</p>

      <label className="upload-dropzone">
        <input type="file" accept=".xlsx,.xls" hidden onChange={(e) => onFileChange(e.target.files[0])} />
        <span>{uploadFile ? uploadFile.name : "Choose file or drag here"}</span>
      </label>

      <button className="upload-submit-btn" type="button" onClick={onUpload} disabled={loading || !uploadFile}>
        {loading ? "Reconciling..." : "Upload and Parse Excel"}
      </button>

      {uploadMessage && (
        <div className="upload-results-box">
          <p className="success-txt">{uploadMessage}</p>
        </div>
      )}
    </PayrollModal>
  );
}
