import { useCallback, useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { createResignation, finalApproval, getResignation, rejectResignation, updateResignation, viewLetter } from "../services/resignationService";
import {
  Search,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Upload,
  FileText,
  X,
  Edit,
  ShieldCheck,
  UserX
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
  const [currentUser, setCurrentUser] = useState(null);

  const [myRecords, setMyRecords] = useState([]);
  const [underMeRecords, setUnderMeRecords] = useState([]);
  const [finalApprovalRecords, setFinalApprovalRecords] = useState([]);
  
  const [search, setSearch] = useState("");
  const [hrSearch, setHrSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [selectedResignation, setSelectedResignation] = useState(null);
  const [isViewing, setIsViewing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvingRecordId, setApprovingRecordId] = useState(null);
  const [isHrFinalizing, setIsHrFinalizing] = useState(false);

  const [isLoading,setIsLoading] = useState(false)
  
  const [checklistForm, setChecklistForm] = useState({
    isExitChecklistCleared: false,
    isAssetRecovered: false,
    assetRecoveryNotes: "",
    isKnowledgeTransferDone: false,
    isFullAndFinalSettled: false,
    fnfAmount: 0,
    isExperienceLetterIssued: false,
    isRelievingLetterIssued: false,
    deleteEmployeeAccount: false,
    finalSettlementDate:"",
    rolesAndResponsibilities:"",
    conductEvaluation:""
  });

  const initialForm = {
    reasonForLeaving: "",
    hrMail:"",
    requestedLastWorkingDay: "",
    resignationLetter: null,
  };

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setVendorId(parsedUser.vendorId);
      setCurrentUser(parsedUser);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    if (!vendorId || !currentUser?.employeeId) return;
    try {
      setLoading(true);
      const res = await getResignation(vendorId, currentUser.employeeId);
      setMyRecords(res.data.myrecords || []);
      setUnderMeRecords(res.data.underMe || []);
      setFinalApprovalRecords(res.data.finalApproval || []);
    } catch (error) {
      console.error("Error standardizing resignation view initialization:", error);
    } finally {
      setLoading(false);
    }
  }, [vendorId, currentUser?.employeeId]);

  useEffect(() => {
    if (vendorId && currentUser) {
      fetchAllData();
    }
  }, [vendorId, currentUser, fetchAllData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setForm({ ...form, resignationLetter: e.target.files[0] });
    }
  };


  const handleChecklistChange = (e) => {
    const { name, type, checked, value } = e.target;
    setChecklistForm({
      ...checklistForm,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setIsViewing(false);
    setShowApproveModal(false);
    setSelectedResignation(null);
    setApprovingRecordId(null);
    setIsHrFinalizing(false);
    setForm(initialForm);
    setChecklistForm({
      isExitChecklistCleared: false,
      isAssetRecovered: false,
      assetRecoveryNotes: "",
      isKnowledgeTransferDone: false,
      isFullAndFinalSettled: false,
      fnfAmount: 0,
      isExperienceLetterIssued: false,
      isRelievingLetterIssued: false,
      deleteEmployeeAccount: false,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.reasonForLeaving.trim() || !form.requestedLastWorkingDay) {
      alert("Please fill in all required fields.");
      return;
    }
    setIsLoading(true)
    const formData = new FormData();
    formData.append("vendorId", vendorId);
    formData.append("reasonForLeaving", form.reasonForLeaving);
    formData.append("lastWorkingDay", form.requestedLastWorkingDay);
    if (form.resignationLetter) {
      formData.append("resignationLetter", form.resignationLetter);
    }

    try {
      await createResignation(formData);
      alert("Resignation request submitted successfully.");
      handleModalClose();
      fetchAllData(); 
      setIsLoading(false)
    } catch (error) {
      setIsLoading(false)
      alert(error.response?.data?.message || "Submission failed");
    }
  };

  const handleApproveOrEditClick = (record, isHrAction = false) => {
    setApprovingRecordId(record._id);
    setIsHrFinalizing(isHrAction);
    setChecklistForm({
      isExitChecklistCleared: record.isExitChecklistCleared || false,
      isAssetRecovered: record.isAssetRecovered || false,
      assetRecoveryNotes: record.assetRecoveryNotes || "",
      isKnowledgeTransferDone: record.isKnowledgeTransferDone || false,
      isFullAndFinalSettled: record.isFullAndFinalSettled || false,
      fnfAmount: record.fnfAmount || 0,
      isExperienceLetterIssued: record.isExperienceLetterIssued || false,
      isRelievingLetterIssued: record.isRelievingLetterIssued || false,
      deleteEmployeeAccount: record.deleteEmployeeAccount || false,
      finalSettlementDate: record.finalSettlementDate || null,
    });
    setShowApproveModal(true);
  };

  const processChecklistSubmission = async () => {
    try {
      setIsLoading(true)
        if (isHrFinalizing) {
            const payload = {
                status: "Approved",
                isExitApproved: true,
                approvedBy: currentUser?.employeeId,
                ...checklistForm,
                fnfAmount: Number(checklistForm.fnfAmount)
            };
            console.log(payload)
            await finalApproval(approvingRecordId, payload);
            fetchAllData();
            alert(`Checklist metrics successfully saved with configuration status: Approved.`);
            handleModalClose();
        } else {
            const payload = {
                status: "Verified",
                isExitApproved: false,
                verifiedBy: currentUser?.employeeId,
                ...checklistForm,
                fnfAmount: Number(checklistForm.fnfAmount)
            };
            await updateResignation(approvingRecordId, payload);
            fetchAllData();
            alert(`Checklist metrics successfully saved with configuration status: ${payload.status}.`);
            handleModalClose();
        }
        setIsLoading(false)
    } catch (error) {
      setIsLoading(false)
      alert(error.response?.data?.message || "Checklist pipeline save operation failed.");
    }
  };

  const handleRejectStatus = async (id) => {
    if (!window.confirm("Are you sure you want to reject this resignation request?")) return;
    setIsLoading(true)
    try {
      await rejectResignation(id, currentUser?.employeeId);
      fetchAllData();
      setIsLoading(false)
      alert("Request marked as Rejected");
    } catch (error) {
      setIsLoading(false)
      alert(error.response?.data?.message || "Status operation failed");
    }
  };

  const handleView = (res) => {
    setSelectedResignation(res);
    setIsViewing(true);
  };

  const filteredUnderMe = underMeRecords.filter((res) =>
    [res.employeeId?.name, res.reasonForLeaving, res.status]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredFinalApprovals = finalApprovalRecords.filter((res) =>
    [res.employeeId?.name, res.reasonForLeaving, res.status]
      .join(" ")
      .toLowerCase()
      .includes(hrSearch.toLowerCase())
  );

  const isHrOrAdmin = currentUser?.role === "HR" || currentUser?.role === "Admin";

  return (
    <MainLayout>
      <div className="exit-mgmt-container">
        <div className="exit-mgmt-header-row">
          <h2 className="exit-mgmt-title">My Resignation Status</h2>
          <button className="exit-mgmt-add-trigger" onClick={() => setShowAddModal(true)}>
            <Plus size={22} /> Apply for Resignation
          </button>
        </div>

        <div className="exit-mgmt-card exit-mgmt-card--mb-large">
          <div className="exit-mgmt-scrollable">
            <table className="exit-mgmt-table">
              <thead>
                <tr>
                  <th>Submission Date</th>
                  <th>Last Working Day</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {myRecords.length > 0 ? (
                  myRecords.map((res) => (
                    <tr key={res._id}>
                      <td>{new Date(res.submissionDate).toLocaleDateString()}</td>
                      <td>{res.lastWorkingDay ? new Date(res.lastWorkingDay).toLocaleDateString() : "N/A"}</td>
                      <td className="exit-mgmt-truncated-cell">{res.reasonForLeaving}</td>
                      <td>
                        <span className={`exit-badge badge--${res.status?.toLowerCase()}`}>
                          {res.status}
                        </span>
                      </td>
                      <td>
                        <button className="exit-mgmt-btn-view" title="View Details" onClick={() => handleView(res)}>
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="exit-mgmt-empty">
                      {loading ? "Loading records..." : "No personal resignation track found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="exit-mgmt-header-block">
          <h2 className="exit-mgmt-title">Team Resignation Approvals</h2>
          <p className="exit-mgmt-subtitle">
            Requests pending validation from structural reporting subordinates.
          </p>
        </div>

        {underMeRecords.length > 0 ? (
          <>
            <div className="exit-mgmt-toolbar">
              <div className="exit-mgmt-search">
                <Search size={22} />
                <input
                  type="text"
                  placeholder="Search subordinate records..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="exit-mgmt-card exit-mgmt-card--mb-large">
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
                    {filteredUnderMe.length > 0 ? (
                      filteredUnderMe.map((res) => (
                        <tr key={res._id}>
                          <td className="exit-mgmt-employee-name">{res.employeeId?.name || "Unknown Staff"}</td>
                          <td>{new Date(res.submissionDate).toLocaleDateString()}</td>
                          <td>{res.lastWorkingDay ? new Date(res.lastWorkingDay).toLocaleDateString() : "N/A"}</td>
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
                                  <button 
                                    className="exit-mgmt-btn-approve" 
                                    title="Process Checklist Fields" 
                                    onClick={() => handleApproveOrEditClick(res, false)}
                                  >
                                    <CheckCircle size={15} />
                                  </button>
                                  <button className="exit-mgmt-btn-reject" title="Reject Notice" onClick={() => handleRejectStatus(res._id)}>
                                    <XCircle size={15} />
                                  </button>
                                </>
                              )}
                              {res.status === "Verified" && (
                                <button 
                                  className="exit-mgmt-btn-approve" 
                                  title="Edit Checklist Fields" 
                                  onClick={() => handleApproveOrEditClick(res, false)}
                                >
                                  <Edit size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="exit-mgmt-empty">No records matched your search query criteria.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="exit-mgmt-card exit-mgmt-card--mb-large exit-mgmt-card--empty-state">
            You are not currently assigned as a reporting manager to any active processing records.
          </div>
        )}

        {isHrOrAdmin && (
          <>
            <div className="exit-mgmt-header-block" style={{ marginTop: "2rem" }}>
              <h2 className="exit-mgmt-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                HR / Corporate Final Sign-off
              </h2>
              <p className="exit-mgmt-subtitle">
                Authorized administrative scope over verified manager checklists to execute absolute departure settlement.
              </p>
            </div>

            <div className="exit-mgmt-toolbar">
              <div className="exit-mgmt-search">
                <Search size={22} />
                <input
                  type="text"
                  placeholder="Search verified corporate records..."
                  value={hrSearch}
                  onChange={(e) => setHrSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="exit-mgmt-card">
              <div className="exit-mgmt-scrollable">
                <table className="exit-mgmt-table">
                  <thead>
                    <tr>
                      <th>Employee Name</th>
                      <th>Submission Date</th>
                      <th>Final LWD</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFinalApprovals.length > 0 ? (
                      filteredFinalApprovals.map((res) => (
                        <tr key={res._id}>
                          <td className="exit-mgmt-employee-name">{res.employeeId?.name || "Unknown Staff"}</td>
                          <td>{new Date(res.submissionDate).toLocaleDateString()}</td>
                          <td>{res.lastWorkingDay ? new Date(res.lastWorkingDay).toLocaleDateString() : "N/A"}</td>
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
                              
                              {res.status === "Verified" && (
                                <button 
                                  className="exit-mgmt-btn-approve" 
                                  style={{ backgroundColor: "#2f855a", color: "#fff" }}
                                  title="Complete Final HR Approval" 
                                  onClick={() => handleApproveOrEditClick(res, true)}
                                >
                                  <ShieldCheck size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="exit-mgmt-empty">
                          No resignation accounts are currently waiting for absolute HR sign-off.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {showAddModal ? (
          <ResModal
            title="Register Resignation Notice"
            onClose={handleModalClose}
            size="lg"
            footer={
              <>
                <button type="button" className="exit-mgmt-control-btn exit-mgmt-control-btn--secondary" onClick={handleModalClose} disabled={isLoading}>
                  Cancel
                </button>
                <button type="submit" form="resignation-core-form" className="exit-mgmt-control-btn exit-mgmt-control-btn--primary" disabled={isLoading}>
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
                <FormField label="Your HR Mail(Optional)" htmlFor="res-hr" fullWidth>
                  <input
                    id="res-hr"
                    name="hrMail"
                    value={form.hrMail}
                    onChange={handleChange}
                    placeholder=""
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

        {showApproveModal ? (
          <ResModal
            title={isHrFinalizing ? "Execute Absolute Exit Sign-off" : "Update Exit Checklist Configuration"}
            onClose={handleModalClose}
            size="lg"
            footer={
              <div className="exit-mgmt-modal-actions">
                <button type="button" disabled={isLoading} className="exit-mgmt-control-btn exit-mgmt-control-btn--secondary" onClick={handleModalClose}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className={`exit-mgmt-control-btn ${isHrFinalizing ? 'exit-mgmt-control-btn--primary' : 'exit-mgmt-control-btn--verify'}`} 
                  onClick={() => processChecklistSubmission()}
                  disabled={isLoading}
                >
                  {isHrFinalizing ? "Confirm Final Approval" : "Save Progress (Verify)"}
                </button>
              </div>
            }
          >
            <form onSubmit={(e) => e.preventDefault()}>
              <FormSection title="Clearance Criteria Checkmarks" description="Review separation checklist flags before completing action processing profiles">
                <div className="exit-mgmt-checkbox-list">
                  <label className="exit-mgmt-checkbox-label">
                    <input 
                      type="checkbox" 
                      name="isAssetRecovered" 
                      checked={checklistForm.isAssetRecovered} 
                      onChange={handleChecklistChange} 
                    />
                    <strong>Company Assets Recovered</strong>
                  </label>

                  <label className="exit-mgmt-checkbox-label">
                    <input 
                      type="checkbox" 
                      name="isKnowledgeTransferDone" 
                      checked={checklistForm.isKnowledgeTransferDone} 
                      onChange={handleChecklistChange} 
                    />
                    <strong>Knowledge Transfer (KT) Handover Complete</strong>
                  </label>

                  <label className="exit-mgmt-checkbox-label">
                    <input 
                      type="checkbox" 
                      name="isExitChecklistCleared" 
                      checked={checklistForm.isExitChecklistCleared} 
                      onChange={handleChecklistChange} 
                    />
                    <strong>Overall Exit Checklist Master Flag Cleared</strong>
                  </label>
                </div>
              </FormSection>

              <FormSection title="Financial Ledger & Certificate Settings">
                <FormField label="Asset Recovery Logging Notes" htmlFor="assetNotes" fullWidth>
                  <input 
                    id="assetNotes"
                    type="text" 
                    name="assetRecoveryNotes" 
                    value={checklistForm.assetRecoveryNotes} 
                    onChange={handleChecklistChange} 
                    placeholder="Outstanding property tokens or hardware metrics..."
                  />
                </FormField>

                <FormField label="Full & Final Settlement Status">
                  <label className="exit-mgmt-checkbox-label exit-mgmt-checkbox-label--mt">
                    <input 
                      type="checkbox" 
                      name="isFullAndFinalSettled" 
                      checked={checklistForm.isFullAndFinalSettled} 
                      onChange={handleChecklistChange} 
                    />
                    Settled
                  </label>
                </FormField>

                <FormField label="F&F Calculation Value ($)">
                  <input 
                    type="number" 
                    name="fnfAmount" 
                    value={checklistForm.fnfAmount} 
                    onChange={handleChecklistChange} 
                    min="0"
                  />
                </FormField>

                <div className="exit-mgmt-checkbox-group">
                  <label className="exit-mgmt-checkbox-label">
                    <input 
                      type="checkbox" 
                      name="isExperienceLetterIssued" 
                      checked={checklistForm.isExperienceLetterIssued} 
                      onChange={handleChecklistChange} 
                    />
                    <strong>Issue Experience Letter</strong>
                  </label>

                  <label className="exit-mgmt-checkbox-label">
                    <input 
                      type="checkbox" 
                      name="isRelievingLetterIssued" 
                      checked={checklistForm.isRelievingLetterIssued} 
                      onChange={handleChecklistChange} 
                    />
                    <strong>Issue Relieving Letter</strong>
                  </label>
                </div>
              </FormSection>

             
              {isHrFinalizing && (
                <>
                  <FormField label="Final Settlement Date" htmlFor="finalSettlementDate" required fullWidth>
                    <input
                      id="finalSettlementDate"
                      name="finalSettlementDate"
                      type="date"
                      value={checklistForm.finalSettlementDate}
                      onChange={handleChecklistChange}
                      required
                    />
                  </FormField>
                  <br/>
                  <FormField label="Roles and Responsiblity" htmlFor="rolesAndResponsibilities" required fullWidth>
                    <input
                      id="rolesAndResponsibilities"
                      name="rolesAndResponsibilities"
                      type="text"
                      value={checklistForm.rolesAndResponsibilities}
                      onChange={handleChecklistChange}
                      required
                    />
                  </FormField>
                  <br/>
                  <FormField label="Conduct Evaluation" htmlFor="conductEvaluation" required fullWidth>
                    <input
                      id="conductEvaluation"
                      name="conductEvaluation"
                      type="text"
                      value={checklistForm.conductEvaluation}
                      onChange={handleChecklistChange}
                      required
                    />
                  </FormField>
                  <br/>
                  <FormField label="System Account Action" fullWidth>
                    <label className="exit-mgmt-checkbox-label" style={{ color: "#c53030", marginTop: "8px" }}>
                      <input 
                        type="checkbox" 
                        name="deleteEmployeeAccount" 
                        checked={checklistForm.deleteEmployeeAccount} 
                        onChange={handleChecklistChange} 
                      />
                      <UserX size={16} style={{ inlineSize: "auto" }} />
                      <strong>Permanently delete employee account after final settlement</strong>
                    </label>
                  </FormField>
                </>
              )}
            </form>
          </ResModal>
        ) : null}

        {isViewing && selectedResignation ? (
          <ResModal title="Resignation Audit Metrics" onClose={handleModalClose} size="lg">
            <FormSection title="Employee & Timing Details">
              <FormField label="Staff Account"><input type="text" value={selectedResignation.employeeId?.name || "Self"} disabled /></FormField>
              <FormField label="Current Status"><input type="text" value={selectedResignation.status} disabled /></FormField>
              <FormField label="Filing Date"><input type="text" value={new Date(selectedResignation.submissionDate).toLocaleDateString()} disabled /></FormField>
              <FormField label="Proposed Target LWD"><input type="text" value={selectedResignation.lastWorkingDay ? new Date(selectedResignation.lastWorkingDay).toLocaleDateString() : "N/A"} disabled /></FormField>
            </FormSection>

            {selectedResignation.status !== "Pending" && (
              <FormSection title="Separation Checklist Log States">
                <FormField label="Asset Recovery"><input type="text" value={selectedResignation.isAssetRecovered ? "✅ Recovered" : "❌ Pending"} disabled /></FormField>
                <FormField label="Knowledge Transfer"><input type="text" value={selectedResignation.isKnowledgeTransferDone ? "✅ Completed" : "❌ Pending"} disabled /></FormField>
                <FormField label="Overall Exit Checklist"><input type="text" value={selectedResignation.isExitChecklistCleared ? "✅ Cleared" : "❌ Not Cleared"} disabled /></FormField>
                <FormField label="F&F Status"><input type="text" value={selectedResignation.isFullAndFinalSettled ? `✅ Settled ($${selectedResignation.fnfAmount})` : "❌ Processing"} disabled /></FormField>
                <FormField label="Certificates Issued"><input type="text" value={`${selectedResignation.isExperienceLetterIssued ? "Experience" : ""} ${selectedResignation.isRelievingLetterIssued ? "Relieving" : ""}`.trim() || "None"} disabled /></FormField>
                <FormField label="Asset recovery notes"><input type="text" value={selectedResignation.assetRecoveryNotes ? selectedResignation.assetRecoveryNotes : "No Notes"} disabled /></FormField>
                <FormField label="Approved Date"><input type="text" value={selectedResignation.approvedDate ? new Date(selectedResignation.approvedDate).toLocaleDateString() : "N/A"} disabled /></FormField>
                <FormField label="Final Settlement Date"><input type="text" value={selectedResignation.finalSettlementDate ? new Date(selectedResignation.finalSettlementDate).toLocaleDateString() : "N/A"} disabled /></FormField>
              </FormSection>
            )}

            <FormSection title="Narrative & Files">
              <FormField label="Reason for Resignation" fullWidth>
                <textarea rows={3} value={selectedResignation.reasonForLeaving} disabled />
              </FormField>
              <FormField label="Attached Notice File Artifact" fullWidth>
                {selectedResignation.resignationLetterUrl ? (
                  <button
                    type="button"
                    className="document-download-link document-download-link--btn"
                    onClick={() => viewLetter(selectedResignation._id,'resignationLetterUrl')}
                  >
                    <FileText size={18} />
                    <span>View Document Record</span>
                  </button>
                ) : (
                  <span className="no-document-msg">No physical letter attached to this profile entry.</span>
                )}
              </FormField>

              <FormField label="Issued Experience letter" fullWidth>
                {selectedResignation.experienceLetter ? (
                  <button
                    type="button"
                    className="document-download-link document-download-link--btn"
                    onClick={() => viewLetter(selectedResignation._id,'experienceLetter')}
                  >
                    <FileText size={18} />
                    <span>View Document Record</span>
                  </button>
                ) : (
                  <span className="no-document-msg">Experience Letter is not issued.</span>
                )}
              </FormField>

              <FormField label=" Issued Relieving Letter" fullWidth>
                {selectedResignation.relievingLetter ? (
                  <button
                    type="button"
                    className="document-download-link document-download-link--btn"
                    onClick={() => viewLetter(selectedResignation._id,'relievingLetter')}
                  >
                    <FileText size={18} />
                    <span>View Document Record</span>
                  </button>
                ) : (
                  <span className="no-document-msg">Relieving Letter is not issued.</span>
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