import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";

/* Commenting out data-fetching service endpoints for now */
// import {
//   getResignations,
//   createResignation,
//   updateResignationStatus,
// } from "../services/resignationService";

import {
  Search,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Upload,
  FileText,
  X
} from "lucide-react";

import "./Resignation.css";

function ResModal({ title, onClose, size = "md", children, footer }) {
  return (
    <div
      className="exit-mgmt-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className={`exit-mgmt-modal exit-mgmt-modal--${size}`} role="dialog" aria-modal="true">
        <div className="exit-mgmt-modal__header">
          <h3>{title}</h3>
          <button type="button" className="exit-mgmt-modal__close" onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>
        </div>
        <div className="exit-mgmt-modal__body">{children}</div>
        {footer ? <div className="exit-mgmt-modal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}

function FormSection({ title, description, children }) {
  return (
    <section className="exit-mgmt-section">
      <div className="exit-mgmt-section__head">
        <h4>{title}</h4>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="exit-mgmt-grid">{children}</div>
    </section>
  );
}

function FormField({ label, htmlFor, required, fullWidth, children }) {
  return (
    <div className={`exit-mgmt-field${fullWidth ? " exit-mgmt-field--full" : ""}`}>
      <label htmlFor={htmlFor}>
        {label}
        {required ? <span className="exit-mgmt-required">*</span> : null}
      </label>
      {children}
    </div>
  );
}

function Resignations() {
  const [vendorId, setVendorId] = useState(null); 

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const { vendorId } = JSON.parse(userData);
      setVendorId(vendorId);
    }
  }, []);

  const initialForm = {
    reasonForLeaving: "",
    requestedLastWorkingDay: "",
    resignationLetter: null,
  };

  const [form, setForm] = useState(initialForm);
  
  /* Mock data initialized so you can preview UI variations */
  const [resignations, setResignations] = useState([
    {
      _id: "mock-1",
      employeeId: { name: "John Doe" },
      submissionDate: new Date().toISOString(),
      requestedLastWorkingDay: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      reasonForLeaving: "Pursuing higher professional technical growth opportunities.",
      status: "Pending",
      resignationLetterUrl: "#"
    },
    {
      _id: "mock-2",
      employeeId: { name: "Jane Smith" },
      submissionDate: new Date().toISOString(),
      requestedLastWorkingDay: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      reasonForLeaving: "Relocating to another major logistical territory state location.",
      status: "Approved",
      resignationLetterUrl: null
    }
  ]);
  
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [selectedResignation, setSelectedResignation] = useState(null);
  const [isViewing, setIsViewing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchAllData = async () => {
    if (!vendorId) return;
    try {
      setLoading(true);
      /* Commented out live service endpoints */
      // const res = await getResignations(vendorId);
      // setResignations(res.data || []);
    } catch (error) {
      console.error("Error standardizing resignation view initialization:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [vendorId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setForm({ ...form, resignationLetter: e.target.files[0] });
    }
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setIsViewing(false);
    setSelectedResignation(null);
    setForm(initialForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.reasonForLeaving.trim() || !form.requestedLastWorkingDay) {
      alert("Please fill in all required fields.");
      return;
    }

    /* Commented out Multipart/FormData backend hit processing loop */
    // const formData = new FormData();
    // formData.append("vendorId", vendorId);
    // formData.append("reasonForLeaving", form.reasonForLeaving);
    // formData.append("requestedLastWorkingDay", form.requestedLastWorkingDay);
    // if (form.resignationLetter) {
    //   formData.append("resignationLetter", form.resignationLetter);
    // }

    try {
      // await createResignation(formData);
      
      // Simulating data updates locally inside application memory context state array
      const newMockRecord = {
        _id: `mock-${Date.now()}`,
        employeeId: { name: "Self (Mock Profile)" },
        submissionDate: new Date().toISOString(),
        requestedLastWorkingDay: new Date(form.requestedLastWorkingDay).toISOString(),
        reasonForLeaving: form.reasonForLeaving,
        status: "Pending",
        resignationLetterUrl: form.resignationLetter ? "#" : null
      };

      setResignations([newMockRecord, ...resignations]);
      alert("Resignation request submitted successfully (Local Sandbox State Created)");
      handleModalClose();
    } catch (error) {
      alert(error.response?.data?.error || "Submission transaction failed");
    }
  };

  const handleStatusUpdate = async (id, status) => {
    if (!window.confirm(`Are you sure you want to change status to ${status}?`)) return;
    try {
      /* Commented out structural status mutation API route call tracker */
      // await updateResignationStatus(id, { status });
      
      // Update entry inside local UI state directly to display workflow response visual changes
      setResignations(prev => 
        prev.map(item => item._id === id ? { ...item, status: status } : item)
      );
      alert(`Request marked as ${status}`);
    } catch (error) {
      alert(error.response?.data?.error || "Status mutation failed");
    }
  };

  const handleView = (res) => {
    setSelectedResignation(res);
    setIsViewing(true);
  };

  const filteredResignations = resignations.filter((res) =>
    [res.employeeId?.name, res.reasonForLeaving, res.status]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="exit-mgmt-container">
        <p className="exit-mgmt-stats">
          Total Offboarding Records: <strong>{resignations.length}</strong>
        </p>

        <div className="exit-mgmt-toolbar">
          <div className="exit-mgmt-search">
            <Search size={22} />
            <input
              type="text"
              placeholder="Search by employee name, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="exit-mgmt-actions">
            <button className="exit-mgmt-add-trigger" onClick={() => setShowAddModal(true)}>
              <Plus size={22} />
              Submit Resignation
            </button>
          </div>
        </div>

        <div className="exit-mgmt-card">
          <div className="exit-mgmt-scrollable">
            <table className="exit-mgmt-table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Submission Date</th>
                  <th>Requested LWD</th>
                  <th>Reason Profile</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResignations.length > 0 ? (
                  filteredResignations.map((res) => (
                    <tr key={res._id}>
                      <td style={{ fontWeight: "600" }}>{res.employeeId?.name || "Self"}</td>
                      <td>{new Date(res.submissionDate).toLocaleDateString()}</td>
                      <td>{new Date(res.requestedLastWorkingDay).toLocaleDateString()}</td>
                      <td className="exit-mgmt-truncated-cell">{res.reasonForLeaving}</td>
                      <td>
                        <span className={`exit-badge badge--${res.status?.toLowerCase()}`}>
                          {res.status}
                        </span>
                      </td>
                      <td>
                        <div className="exit-mgmt-row-buttons">
                          <button className="exit-mgmt-btn-view" title="View Details" onClick={() => handleView(res)}>
                            <Eye size={15} />
                          </button>
                          {res.status === "Pending" && (
                            <>
                              <button className="exit-mgmt-btn-approve" title="Approve" onClick={() => handleStatusUpdate(res._id, "Approved")}>
                                <CheckCircle size={15} />
                              </button>
                              <button className="exit-mgmt-btn-reject" title="Reject" onClick={() => handleStatusUpdate(res._id, "Rejected")}>
                                <XCircle size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="exit-mgmt-empty">
                      {loading ? "Loading resignation matrix data..." : "No active offboarding tracks discovered."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SUBMIT RESIGNATION MODAL */}
        {showAddModal ? (
          <ResModal
            title="Register Resignation Notice"
            onClose={handleModalClose}
            size="lg"
            footer={
              <>
                <button type="button" className="exit-mgmt-control-btn exit-mgmt-control-btn--secondary" onClick={handleModalClose}>
                  Cancel
                </button>
                <button type="submit" form="resignation-core-form" className="exit-mgmt-control-btn exit-mgmt-control-btn--primary">
                  Submit Notice
                </button>
              </>
            }
          >
            <form id="resignation-core-form" onSubmit={handleSubmit}>
              <FormSection title="Notice Scope" description="State parameters regarding your termination processing window">
                <FormField label="Requested Last Working Day" htmlFor="req-lwd" required fullWidth>
                  <input
                    id="req-lwd"
                    name="requestedLastWorkingDay"
                    type="date"
                    value={form.requestedLastWorkingDay}
                    onChange={handleChange}
                    required
                  />
                </FormField>
                <FormField label="Reason Statement" htmlFor="res-reason" required fullWidth>
                  <textarea
                    id="res-reason"
                    name="reasonForLeaving"
                    rows={4}
                    value={form.reasonForLeaving}
                    onChange={handleChange}
                    placeholder="Provide context regarding resignation drivers..."
                    required
                  />
                </FormField>
              </FormSection>

              <FormSection title="Supporting Documentation" description="Upload official signed notice file">
                <FormField label="Resignation Letter File" htmlFor="res-file" fullWidth>
                  <div className="file-upload-zone">
                    <input
                      id="res-file"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                    />
                    <Upload size={24} />
                    <p>
                      {form.resignationLetter 
                        ? `Selected: ${form.resignationLetter.name}` 
                        : "Click to upload or drag formal PDF/Word document here"}
                    </p>
                  </div>
                </FormField>
              </FormSection>
            </form>
          </ResModal>
        ) : null}

        {/* VIEW DETAILS MODAL */}
        {isViewing && selectedResignation ? (
          <ResModal title="Resignation Audit Metrics" onClose={handleModalClose} size="lg">
            <FormSection title="Employee & Timing Details">
              <FormField label="Staff Account"><input type="text" value={selectedResignation.employeeId?.name || "Self"} disabled /></FormField>
              <FormField label="Current Status"><input type="text" value={selectedResignation.status} disabled /></FormField>
              <FormField label="Filing Date"><input type="text" value={new Date(selectedResignation.submissionDate).toLocaleDateString()} disabled /></FormField>
              <FormField label="Proposed Target LWD"><input type="text" value={new Date(selectedResignation.requestedLastWorkingDay).toLocaleDateString()} disabled /></FormField>
            </FormSection>

            <FormSection title="Narrative & Files">
              <FormField label="Reason for Resignation" fullWidth>
                <textarea rows={3} value={selectedResignation.reasonForLeaving} disabled />
              </FormField>
              <FormField label="Attached Notice File Artifact" fullWidth>
                {selectedResignation.resignationLetterUrl ? (
                  <a href={selectedResignation.resignationLetterUrl} target="_blank" rel="noreferrer" className="document-download-link">
                    <FileText size={18} /> View Document Record
                  </a>
                ) : (
                  <span className="no-document-msg">No physical letter attached to this profile entry.</span>
                )}
              </FormField>
            </FormSection>
          </ResModal>
        ) : null}
      </div>
    </MainLayout>
  );
}

export default Resignations;