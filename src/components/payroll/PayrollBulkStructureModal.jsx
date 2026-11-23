import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Check, Copy, Download, Upload } from "lucide-react";
import PayrollModal from "./PayrollModal";
import {
  bulkAssignSalaryStructure,
  getStructure,
} from "../../services/salaryComponentService";

const normalizeClipboard = (value) => String(value ?? "").trim();

export default function PayrollBulkStructureModal({
  open,
  vendorId,
  employees = [],
  onClose,
  onUploaded,
}) {
  const [structures, setStructures] = useState([]);
  const [structuresLoading, setStructuresLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [copiedName, setCopiedName] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    let mounted = true;
    setStructuresLoading(true);
    getStructure(vendorId)
      .then((res) => {
        if (mounted) setStructures(res.data?.data || res.data || []);
      })
      .catch(() => {
        if (mounted) setStructures([]);
      })
      .finally(() => {
        if (mounted) setStructuresLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [open, vendorId]);

  useEffect(() => {
    if (open) return;
    setUploadFile(null);
    setUploading(false);
    setResult(null);
    setPendingConfirm(false);
    setCopiedName("");
  }, [open]);

  const handleCopy = async (name) => {
    try {
      await navigator.clipboard.writeText(name);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = name;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedName(name);
    window.setTimeout(() => setCopiedName((current) => (current === name ? "" : current)), 1600);
  };

  const handleDownloadTemplate = () => {
    const sampleCode = employees?.[0]?.employeeCode || "EMP001";
    const sampleStructure = structures[0]?.name || "Copy_Structure_Name";

    const rows = [
      [
        "Bulk Salary Structure Assignment Template — keep this row; enter employees below the headers. EmployeeCode and Salary Structure Name are required. Annual CTC is optional (blank keeps the employee's current CTC).",
      ],
      ["EmployeeCode", "Salary Structure Name", "Annual CTC"],
      [sampleCode, sampleStructure, 360000],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 18 },
      { wch: 34 },
      { wch: 18 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Salary Structures");
    XLSX.writeFile(wb, "salary-structure-bulk-assignment-template.xlsx");
  };

  const handleFileChange = (file) => {
    setUploadFile(file);
    setPendingConfirm(false);
    setResult(null);
  };

  const requestUpload = () => {
    if (!uploadFile) {
      setResult({ type: "error", text: "Rejected: please select an Excel file first." });
      return;
    }
    setResult(null);
    setPendingConfirm(true);
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      setResult({ type: "error", text: "Rejected: please select an Excel file first." });
      return;
    }
    setResult(null);
    setUploading(true);
    try {
      const res = await bulkAssignSalaryStructure(uploadFile);
      const data = res.data || {};
      const errorList = data.errors || [];
      const inserted = Number(data.inserted) || 0;
      const skipped = Number(data.skipped) || 0;

      let type = "success";
      let text = `Confirmed: salary structure assigned to ${inserted} employee${inserted === 1 ? "" : "s"}.`;
      if (inserted === 0) {
        type = "error";
        text = `Rejected: none of the rows could be applied (${skipped} skipped).`;
      } else if (skipped > 0) {
        type = "warning";
        text = `Partially applied: ${inserted} assigned, ${skipped} rejected.`;
      }
      if (errorList.length) {
        text += `\n\nDetails:\n${errorList.join("\n")}`;
      }

      setResult({ type, text });
      setUploadFile(null);
      setPendingConfirm(false);
      if (inserted > 0) onUploaded?.();
    } catch (error) {
      setPendingConfirm(false);
      setResult({
        type: "error",
        text: `Upload rejected: ${error.response?.data?.message || error.message || "Bulk assignment failed."}`,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <PayrollModal
      open={open}
      onClose={onClose}
      alignLeft
      wide
      title="Bulk Assign Salary Structure"
      description="Download the sample sheet, fill in employee codes and structure names, then upload it. Each employee's salary structure is applied from the sheet."
    >
      <div className="payroll-structure-modal">
        <div className="payroll-structure-section">
          <h4 className="payroll-structure-section-title">1. Sample sheet</h4>
          <button
            type="button"
            className="payroll-structure-template-btn"
            onClick={handleDownloadTemplate}
          >
            <Download size={15} />
            Download sample template
          </button>
          <p className="payroll-structure-hint">
            Required columns: <strong>EmployeeCode</strong> and <strong>Salary Structure Name</strong>.
            Add <strong>Annual CTC</strong> to change pay, or leave it blank to reuse the
            employee's current CTC. All structures are applied as monthly.
          </p>
        </div>

        <div className="payroll-structure-section">
          <h4 className="payroll-structure-section-title">2. Upload filled sheet</h4>
          <label className="payroll-structure-dropzone">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            />
            <Upload size={22} />
            <span className="payroll-structure-dropzone-title">Choose .xlsx or .xls file</span>
            {uploadFile ? (
              <span className="payroll-structure-dropzone-file">{uploadFile.name}</span>
            ) : null}
          </label>
          <button
            type="button"
            className="payroll-structure-submit-btn"
            onClick={requestUpload}
            disabled={uploading || !uploadFile || pendingConfirm}
          >
            {uploading ? "Assigning…" : pendingConfirm ? "Confirm below" : "Upload and assign"}
          </button>

          {pendingConfirm ? (
            <div className="payroll-structure-confirm">
              <p>
                Apply the salary structures from <strong>{uploadFile?.name}</strong>? Existing
                structures for matched employees will be updated.
              </p>
              <div className="payroll-structure-confirm-actions">
                <button
                  type="button"
                  className="payroll-structure-confirm-btn payroll-structure-confirm-btn--yes"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? "Assigning…" : "Yes, apply"}
                </button>
                <button
                  type="button"
                  className="payroll-structure-confirm-btn payroll-structure-confirm-btn--no"
                  onClick={() => setPendingConfirm(false)}
                  disabled={uploading}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="payroll-structure-section">
          <h4 className="payroll-structure-section-title">Salary Structure names</h4>
          <p className="payroll-structure-hint">
            Click a name to copy it into the <strong>Salary Structure Name</strong> column.
          </p>
          {structuresLoading ? (
            <p className="payroll-structure-hint">Loading salary structures…</p>
          ) : structures.length ? (
            <div className="payroll-structure-copy-list">
              {structures.map((structure) => (
                <button
                  key={structure._id}
                  type="button"
                  className="payroll-structure-copy-item"
                  title={`Copy ${structure.name}`}
                  onClick={() => handleCopy(structure.name)}
                >
                  <span>{normalizeClipboard(structure.name)}</span>
                  {copiedName === structure.name ? <Check size={13} /> : <Copy size={13} />}
                </button>
              ))}
            </div>
          ) : (
            <p className="payroll-structure-hint">
              No salary structures found. Create one under Payroll → Salary Structures first.
            </p>
          )}
        </div>

        {result ? (
          <div
            className={`payroll-structure-result payroll-structure-result--${result.type}`}
            style={{ whiteSpace: "pre-line" }}
            role={result.type === "error" ? "alert" : "status"}
          >
            {result.text}
          </div>
        ) : null}
      </div>
    </PayrollModal>
  );
}
