import React, { useEffect, useRef, useState } from "react";
import "./HolidayManager.css";
import { getDepartments } from "../services/departmentService";
import {
  createHoliday,
  deleteHoliday,
  getHolidays,
  updateHoliday,
  bulkUploadHolidays, // Ensure this service method is imported
} from "../services/holidayService";
import Button from "./Button";
import * as XLSX from "xlsx";

const HOLIDAY_TYPES = ["National", "Festival", "Restricted", "Company"];
const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Chandigarh",
  "Delhi",
];
const ALLOWED_FILE_TYPES = [
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];


const formatDisplayDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toInputDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const HolidayManager = ({ vendorId }) => {
  const formRef = useRef(null);
  const currentYear = new Date().getFullYear();

  const initialFormState = {
    name: "",
    date: "",
    department: "",
    state: "",
    type: "National",
    description: "",
  };

  const [holidays, setHolidays] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filterYear, setFilterYear] = useState(currentYear);
  const [loading, setLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [editingHolidayId, setEditingHolidayId] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

  // Bulk Upload Modal & File States
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [modalError, setModalError] = useState("");
  const [uploadSummary, setUploadSummary] = useState(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState("");
  const [isErrorViewerOpen, setIsErrorViewerOpen] = useState(false);

  const fetchDepartments = async () => {
    if (!vendorId) return;
    try {
      const res = await getDepartments(vendorId);
      const list = res?.data?.departments || res?.data?.data || res?.data || [];
      setDepartments(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Failed to load departments:", error);
    }
  };

  const fetchHolidays = async () => {
    if (!vendorId) return;
    try {
      setLoading(true);
      const res = await getHolidays({ vendorId, year: filterYear });
      const list = res?.data?.data || [];
      setHolidays(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Failed to load holidays:", error);
      setStatusMessage({
        type: "error",
        text: error?.response?.data?.message || "Unable to load holidays.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId]);

  useEffect(() => {
    fetchHolidays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId, filterYear]);

  useEffect(() => {
    if (!statusMessage.text) return undefined;
    const timer = setTimeout(() => setStatusMessage({ type: "", text: "" }), 5000);
    return () => clearTimeout(timer);
  }, [statusMessage.text]);

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingHolidayId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditClick = (holiday) => {
    if (holiday.source === "weekOff") {
      setStatusMessage({
        type: "error",
        text: "Legacy holidays from WeekOff settings cannot be edited here.",
      });
      return;
    }

    setEditingHolidayId(holiday._id);
    setFormData({
      name: holiday.name || "",
      date: toInputDate(holiday.date),
      department: holiday.department || "",
      state: holiday.state || "",
      type: holiday.type || "National",
      description: holiday.description || "",
    });

    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleDeleteClick = async (holiday) => {
    if (holiday.source === "weekOff") {
      setStatusMessage({
        type: "error",
        text: "Legacy holidays from WeekOff settings cannot be deleted here.",
      });
      return;
    }

    if (!window.confirm(`Delete holiday "${holiday.name}"?`)) return;
    if (isActionLoading) return;

    try {
      setIsActionLoading(true);
      await deleteHoliday(holiday._id);
      setHolidays((prev) => prev.filter((item) => item._id !== holiday._id));
      if (editingHolidayId === holiday._id) {
        resetForm();
      }
      setStatusMessage({ type: "success", text: "Holiday deleted successfully." });
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error?.response?.data?.message || "Failed to delete holiday.",
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendorId) {
      alert("Vendor configuration not found.");
      return;
    }
    if (!formData.name.trim() || !formData.date) {
      alert("Holiday name and date are required.");
      setStatusMessage({ type: "error", text: "Holiday name and date are required." });
      return;
    }
    if (isActionLoading) return;

    const payload = {
      vendorId,
      name: formData.name.trim(),
      date: formData.date,
      department: formData.department || null,
      state: formData.state || null,
      type: formData.type,
      description: formData.description.trim(),
    };

    try {
      setIsActionLoading(true);
      setStatusMessage({ type: "", text: "" });

      if (editingHolidayId) {
        const res = await updateHoliday(editingHolidayId, payload);
        const updated = res?.data?.data;
        if (updated) {
          setHolidays((prev) =>
            prev.map((item) => (item._id === editingHolidayId ? updated : item))
          );
        } else {
          await fetchHolidays();
        }
        alert("Holiday updated successfully.");
        setStatusMessage({ type: "success", text: "Holiday updated successfully." });
        resetForm();
      } else {
        const res = await createHoliday(payload);
        const created = res?.data?.data;
        if (created) {
          setHolidays((prev) =>
            [...prev, created].sort(
              (a, b) => new Date(a.date) - new Date(b.date)
            )
          );
        } else {
          await fetchHolidays();
        }
        alert("Holiday created successfully.");
        setStatusMessage({ type: "success", text: "Holiday created successfully." });
        setFormData(initialFormState);
      }
    } catch (error) {
      alert(error?.response?.data?.message);
      setStatusMessage({
        type: "error",
        text: error?.response?.data?.message || "Failed to save holiday.",
      });
    } finally {
      setIsActionLoading(false);
    }
  };


  const handleDownloadTemplate = () => {
    const rows = [
      ["INSTRUCTIONS FOR BULK UPLOAD:"],
      ["1. Name (Required): Name of the holiday (e.g., Independence Day)."],
      ["2. Date (Required): Format YYYY-MM-DD (e.g., 2026-08-15)."],
      ["3. Type (Required): Allowed values -> National | Festival | Restricted | Company."],
      ["4. State (Optional): Use exact state name like Delhi, Maharashtra, Karnataka. Leave blank for all states."],
      ["5.  Site/Department (Required): Leave blank or write 'All' for all departments, or enter exact Site/Department ID copy from site/depatment"],
      ["6. Description (Optional): Short details or notes for HR reference."],
      [],
      ["Name", "Date", "Type", "State", "Department", "Description"],
      ["Republic Day", "2026-01-26", "National", "Delhi", "All", "National Holiday"],
      ["Diwali", "2026-11-08", "Festival", "Maharashtra", "All", "Festival Celebration"],
      ["Regional Festival", "2026-04-14", "Restricted", "Karnataka", "Operations", "Optional Holiday"]
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Column Width Configuration (wch = width in characters)
    ws["!cols"] = [
      { wch: 25 }, // Name
      { wch: 15 }, // Date
      { wch: 18 }, // Type
      { wch: 20 }, // State
      { wch: 22 }, // Department
      { wch: 35 }  // Description
    ];

    // Instructions ko 6 columns tak merge karna taaki text neat dikhe
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Row 1
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }, // Row 2
      { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }, // Row 3
      { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } }, // Row 4
      { s: { r: 4, c: 0 }, e: { r: 4, c: 5 } }, // Row 5
      { s: { r: 5, c: 0 }, e: { r: 5, c: 5 } }  // Row 6
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Holidays");
    XLSX.writeFile(wb, "holiday-bulk-upload-template.xlsx");
  };

  // Bulk File Handlers
  const closeBulkModal = () => {
    setIsBulkModalOpen(false);
    setIsErrorViewerOpen(false);
    setBulkFile(null);
    setModalError("");
    setUploadSummary(null);
    setUploadSuccessMessage("");
  };

  const validateAndSetFile = (file) => {
    setModalError("");
    setUploadSummary(null);
    setUploadSuccessMessage("");
    if (!file) return;
    const isExtensionValid = file.name.match(/\.(csv|xlsx|xls)$/i);
    if (!ALLOWED_FILE_TYPES.includes(file.type) && !isExtensionValid) {
      setModalError("Invalid file type. Please upload .csv, .xlsx, or .xls");
      setBulkFile(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setModalError("File size exceeds 5MB limit.");
      setBulkFile(null);
      return;
    }
    setBulkFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!vendorId) {
      alert("Vendor configuration not found.");
      return;
    }
    if (!bulkFile) {
      setModalError("Please select a file to upload.");
      return;
    }
    if (isActionLoading) return;

    const uploadData = new FormData();
    uploadData.append("file", bulkFile);

    try {
      setIsActionLoading(true);
      setModalError("");
      setUploadSuccessMessage("");
      const response = await bulkUploadHolidays(uploadData);
      const responseData = response?.data?.data || {};
      const responseErrors = Array.isArray(responseData.errors)
        ? responseData.errors
        : [];
      const nextSummary = {
        totalRows: Number(responseData.totalRows || 0),
        inserted: Number(responseData.inserted || 0),
        skipped: Number(responseData.skipped || 0),
      };
      setUploadSummary(nextSummary);
      await fetchHolidays();

      if (responseErrors.length > 0) {
        const formattedErrors = responseErrors.join("\n");
        setModalError(formattedErrors || response?.data?.message || "Bulk upload completed with some issues.");
        setStatusMessage({
          type: "error",
          text: response?.data?.message || "Bulk upload completed with validation issues.",
        });
        return;
      }

      setUploadSummary({
        totalRows: Number(nextSummary.totalRows || 0),
        inserted: Number(nextSummary.inserted || 0),
        skipped: Number(nextSummary.skipped || 0),
      });
      setModalError("");
      setUploadSuccessMessage("Upload completed successfully.");
      setStatusMessage({ type: "success", text: "Bulk holidays uploaded successfully." });
      setBulkFile(null);
    } catch (error) {
      const serverMessage = error?.response?.data?.message;
      const rowErrors = Array.isArray(error?.response?.data?.errors)
        ? error.response.data.errors
        : [];
      const backendData = error?.response?.data?.data || {};
      setUploadSummary({
        totalRows: Number(backendData.totalRows || 0),
        inserted: Number(backendData.inserted || 0),
        skipped: Number(backendData.skipped || 0),
      });
      const combinedMessage = rowErrors.length
        ? [serverMessage, ...rowErrors].filter(Boolean).join("\n")
        : serverMessage || "Failed to upload bulk holidays.";
      setModalError(combinedMessage);
      setUploadSuccessMessage("");
    } finally {
      setIsActionLoading(false);
    }
  };

  const sortedHolidays = [...holidays].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  return (
    <div className="holiday-manager-container">
      {/* HOLIDAY LIST SECTION */}
      <section className="holiday-list-section">
        <div className="holiday-list-header">
          <div>
            <h2>Holiday Calendar</h2>
            <p>Manage organization-wide and department-specific paid holidays.</p>
          </div>
          {/* Filter Year mapped back to holiday list section */}
          <div className="holiday-year-filter">
            <label htmlFor="holiday-year">Year</label>
            <select
              id="holiday-year"
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {statusMessage.text ? (
          <div className={`holiday-status holiday-status--${statusMessage.type}`}>
            {statusMessage.text}
          </div>
        ) : null}

        {loading ? (
          <p className="holiday-empty">Loading holidays...</p>
        ) : sortedHolidays.length === 0 ? (
          <p className="holiday-empty">No holidays configured for {filterYear}.</p>
        ) : (
          <div className="holiday-table-wrap">
            <table className="holiday-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Holiday</th>
                  <th>Department</th>
                  <th>State</th>
                  <th>Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedHolidays.map((holiday) => (
                  <tr key={holiday._id || `${holiday.name}-${holiday.date}`}>
                    <td>{formatDisplayDate(holiday.date)}</td>
                    <td>
                      <strong>{holiday.name}</strong>
                      {holiday.description ? (
                        <small>{holiday.description}</small>
                      ) : null}
                    </td>
                    <td>{holiday.department || "All Departments"}</td>
                    <td>{holiday.state || "All States"}</td>
                    <td>
                      <span className={`holiday-type-badge holiday-type-badge--${holiday.type?.toLowerCase()}`}>
                        {holiday.type || "National"}
                      </span>
                    </td>
                    <td className="holiday-actions">
                      <Button
                        type="button"
                        className="action-btn-edit"
                        onClick={() => handleEditClick(holiday)}
                        disabled={holiday.source === "weekOff"}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        className="action-btn-delete"
                        onClick={() => handleDeleteClick(holiday)}
                        disabled={holiday.source === "weekOff"}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SINGLE UPLOAD FORM SECTION */}
      <section ref={formRef} className="holiday-form-section">
        <div className="holiday-form-header">
          <h2>{editingHolidayId ? "Edit Holiday" : "Add Holiday"}</h2>
          <Button
            type="button"
            className="bulk-upload-trigger-btn"
            onClick={() => setIsBulkModalOpen(true)}
          >
            📥 Bulk Upload
          </Button>
        </div>

        <form className="holiday-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="holiday-name">Holiday Name</label>
            <input
              id="holiday-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Independence Day"
              maxLength={50}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="holiday-date">Date</label>
              <input
                id="holiday-date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="holiday-type">Type</label>
              <select
                id="holiday-type"
                name="type"
                value={formData.type}
                onChange={handleChange}
              >
                {HOLIDAY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="holiday-department">Department</label>
              <select
                id="holiday-department"
                name="department"
                value={formData.department}
                onChange={handleChange}
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept._id || dept.name} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="holiday-state">State</label>
              <select
                id="holiday-state"
                name="state"
                value={formData.state}
                onChange={handleChange}
              >
                <option value="">All States</option>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="holiday-description">Description (optional)</label>
            <textarea
              id="holiday-description"
              name="description"
              rows="2"
              value={formData.description}
              onChange={handleChange}
              placeholder="Optional notes for HR"
            />
          </div>

          <div className="holiday-form-actions">
            {editingHolidayId ? (
              <Button
                type="button"
                className="secondary-btn"
                onClick={resetForm}
                disabled={isActionLoading}
              >
                Cancel
              </Button>
            ) : null}
            <Button type="submit" disabled={isActionLoading}>
              {isActionLoading
                ? "Saving..."
                : editingHolidayId
                  ? "Update Holiday"
                  : "Add Holiday"}
            </Button>
          </div>
        </form>
      </section>

      {/* BULK UPLOAD MODAL POPUP */}
      {isBulkModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsBulkModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Bulk Upload Holidays</h3>
              <button
                type="button"
                className="close-modal-btn"
                onClick={closeBulkModal}
                disabled={isActionLoading}
                aria-label="Close bulk upload modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBulkSubmit}>
              <div className="modal-template-download">
                <span>Need reference format?</span>
                <button
                  type="button"
                  className="template-link-btn"
                  onClick={handleDownloadTemplate}
                >
                  📄 Download Sample CSV Template
                </button>
              </div>

              <div
                className={`modal-drop-zone ${dragActive ? "drag-active" : ""}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  id="bulk-modal-file-input"
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                <label htmlFor="bulk-modal-file-input" className="drop-zone-label">
                  {bulkFile ? (
                    <div className="selected-file">
                      <span>📄 {bulkFile.name}</span>
                      <small>({(bulkFile.size / 1024).toFixed(1)} KB)</small>
                    </div>
                  ) : (
                    <div>
                      <p>Drag & drop CSV/Excel file here, or <span>browse</span></p>
                      <small>Supports .csv, .xlsx, .xls (Max 5MB)</small>
                    </div>
                  )}
                </label>
              </div>

              {uploadSummary && (
                <div className="modal-upload-summary" role="status">
                  <div className="summary-item">
                    <span>Total</span>
                    <strong>{uploadSummary.totalRows}</strong>
                  </div>
                  <div className="summary-item success">
                    <span>Uploaded</span>
                    <strong>{uploadSummary.inserted}</strong>
                  </div>
                  <div className="summary-item warning">
                    <span>Failed</span>
                    <strong>{Math.max(uploadSummary.skipped, 0)}</strong>
                  </div>
                </div>
              )}

              {uploadSuccessMessage && (
                <div className="modal-success-message" role="status">
                  {uploadSuccessMessage}
                </div>
              )}

              {modalError && !uploadSuccessMessage && (
                <div className="modal-error-inline" role="alert">
                  <strong>Issues found:</strong>
                  <span>{modalError.split(/\n+/).filter(Boolean).length} row(s) need attention.</span>
                </div>
              )}

              <div className="modal-actions">
                {uploadSuccessMessage ? (
                  <Button type="button" onClick={closeBulkModal}>
                    Done
                  </Button>
                ) : (
                  <>
                    {modalError ? (
                      <Button
                        type="button"
                        className="secondary-btn"
                        onClick={() => setIsErrorViewerOpen(true)}
                        disabled={isActionLoading}
                      >
                        View Errors
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      className="secondary-btn"
                      onClick={closeBulkModal}
                      disabled={isActionLoading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isActionLoading || !bulkFile}>
                      {isActionLoading ? "Uploading..." : "Upload File"}
                    </Button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {isErrorViewerOpen && (
        <div className="modal-backdrop" onClick={() => setIsErrorViewerOpen(false)}>
          <div className="modal-container error-view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Upload Errors</h3>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setIsErrorViewerOpen(false)}
                aria-label="Close error viewer"
              >
                ✕
              </button>
            </div>

            <div className="error-view-body" role="alert">
              {modalError
                .split(/\n+/)
                .filter(Boolean)
                .map((line, index) => (
                  <div key={`${line}-${index}`} className="error-line">
                    {line}
                  </div>
                ))}
            </div>

            <div className="modal-actions">
              <Button type="button" onClick={() => setIsErrorViewerOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidayManager;