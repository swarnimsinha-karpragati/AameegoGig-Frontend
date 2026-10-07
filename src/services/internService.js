import API from "./apiClient";
import { LIMITS } from "../utils/inputValidation";

const INTERN_PAYLOAD_FIELDS = [
  // Optional manual code (blank auto-generates server-side from the shared
  // per-vendor series). Normalized below to match generated codes.
  "employeeCode",
  "name",
  "email",
  "phone",
  "designation",
  "departmentId",
  "location",
  "photo",
  "dob",
  "gender",
  "bloodGroup",
  "emergencyContact",
  "fatherHusbandName",
  "relationWithMember",
  "nationality",
  "maritalStatus",
  "permanentAddress",
  "aadhaarNumber",
  "nameAsPerAadhaar",
  "panNumber",
  "nameAsPerPan",
  "bankName",
  "accountHolderName",
  "accountNumber",
  "ifscCode",
  "highestQualification",
  "internshipStartDate",
  "internshipEndDate",
  "universityOrInstitute",
  "courseOrProgram",
  "expectedGraduationDate",
  "mentorId",
  "reportingManagerId",
  "stipendAmount",
  "stipendFrequency",
  "evaluationScore",
  "evaluationRemarks",
  "evaluationDate",
  "evaluatedBy",
  "isActive",
  "requiredDocuments",
  "createAppLogin",
  "userRole",
  "userPassword",
  "allowedModules",
];

const idOf = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value._id || null;
  return value;
};

/* =========================
   STIPEND DRAFT HELPERS (monthly stipend only)
========================= */
export const MAX_MONTHLY_STIPEND = LIMITS.MONTHLY_AMOUNT_MAX; // 10,000,000

/* True when a stipend was entered. */
export const hasStipendData = (draft) => {
  if (!draft) return false;
  return draft.monthlyStipend !== "" && draft.monthlyStipend != null;
};

/* An entered stipend must be a real amount within 1 – 10,000,000.
   Blank means unpaid (skipped); all-zeros is rejected, never auto-fixed. */
export const validateStipendDraft = (draft) => {
  if (!draft || !hasStipendData(draft)) return "";
  const raw = String(draft.monthlyStipend).trim();
  const amount = Number(raw);
  if (!Number.isFinite(amount)) return "Enter a valid monthly stipend.";
  if (amount <= 0) {
    return "Monthly stipend must be greater than ₹0. Leave it blank for unpaid internships.";
  }
  if (amount > MAX_MONTHLY_STIPEND) {
    return `Monthly stipend cannot exceed ₹${MAX_MONTHLY_STIPEND.toLocaleString("en-IN")}.`;
  }
  return "";
};

export const buildInternPayload = (data = {}) => {
  const payload = {};
  INTERN_PAYLOAD_FIELDS.forEach((field) => {
    const value = data[field];
    if (value !== undefined && value !== null && value !== "") {
      payload[field] = value;
    }
  });

  if (data.mentorId === "" || data.mentorId === null) {
    payload.mentorId = null;
  } else if (data.mentorId) {
    payload.mentorId = idOf(data.mentorId);
  }

  if (data.reportingManagerId === "" || data.reportingManagerId === null) {
    payload.reportingManagerId = null;
  } else if (data.reportingManagerId) {
    payload.reportingManagerId = idOf(data.reportingManagerId);
  }

  if (data.departmentId && typeof data.departmentId === "object") {
    payload.departmentId = data.departmentId._id;
  }

  if (data.email) {
    payload.email = String(data.email).trim().toLowerCase();
  }

  if (payload.employeeCode) {
    payload.employeeCode = String(payload.employeeCode).trim().toUpperCase();
    if (!payload.employeeCode) delete payload.employeeCode;
  }
  if (data.ifscCode) {
    payload.ifscCode = String(data.ifscCode).toUpperCase();
  }
  if (data.panNumber) {
    payload.panNumber = String(data.panNumber).toUpperCase();
  }

  // App login fields ride along only when login is being enabled, so plain
  // edits never leak a stale password/role into the request.
  if (data.createAppLogin === true) {
    payload.createAppLogin = true;
    payload.userRole = data.userRole || "Intern";
    if (data.userPassword) {
      payload.userPassword = data.userPassword;
    }
    if (Array.isArray(data.allowedModules)) {
      payload.allowedModules = data.allowedModules;
    }
  } else {
    delete payload.createAppLogin;
    delete payload.userRole;
    delete payload.userPassword;
    // allowedModules may still be synced for an already-linked login.
    if (!Array.isArray(data.allowedModules)) {
      delete payload.allowedModules;
    }
  }

  return payload;
};
export const getInterns = async (params = {}) => {
  return API.get("/interns", { params });
};

export const searchInterns = async (params = {}) => {
  return API.get("/interns/search", { params });
};

export const getInternStats = async () => {
  return API.get("/interns/stats");
};

/* =========================
   DETAIL
========================= */
export const getInternById = async (id) => {
  return API.get(`/interns/${id}`);
};

/* =========================
   ONBOARD / UPDATE
========================= */
export const addIntern = async (data) => {
  return API.post("/interns", data);
};

export const updateIntern = async (id, data) => {
  return API.put(`/interns/${id}`, data);
};

/* =========================
   STATUS / EXTEND
========================= */
export const updateInternStatus = async (id, { status, remark }) => {
  return API.patch(`/interns/${id}/status`, { status, remark });
};

export const extendInternship = async (id, { newEndDate, remark }) => {
  return API.patch(`/interns/${id}/extend`, { newEndDate, remark });
};

/* =========================
   STIPEND (org component flow)
========================= */
export const getInternStipend = async (id) => {
  return API.get(`/interns/${id}/stipend`);
};

export const configureInternStipend = async (
  id,
  { stipendAmount, stipendFrequency, templateId, components, effectiveFrom, revisionReason }
) => {
  return API.post(`/interns/${id}/stipend`, {
    stipendAmount,
    stipendFrequency,
    templateId,
    components,
    effectiveFrom,
    revisionReason,
  });
};

/* =========================
   DOCUMENTS
========================= */
export const getInternDocuments = async (id) => {
  return API.get(`/interns/${id}/documents`);
};

export const updateInternChecklist = async (id, items) => {
  return API.patch(`/interns/${id}/documents-checklist`, { items });
};

export const uploadInternDocument = async ({ internId, documentType, file, fileName }) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("internId", internId);
  formData.append("documentType", documentType);
  if (fileName) formData.append("fileName", fileName);
  // No manual Content-Type: axios + the browser add the multipart boundary.
  return API.post("/documents/upload", formData);
};

/* =========================
   CONVERT / ARCHIVE
========================= */
export const convertInternToEmployee = async (
  id,
  { dateOfJoining, designation, departmentId, employmentStatus, createSalaryStructure, ctcAnnual } = {}
) => {
  return API.post(`/interns/${id}/convert-to-employee`, {
    dateOfJoining,
    designation,
    departmentId,
    employmentStatus,
    createSalaryStructure,
    ctcAnnual,
  });
};

export const deleteIntern = async (id) => {
  return API.delete(`/interns/${id}`);
};

export const restoreIntern = async (id) => {
  return API.patch(`/interns/${id}/restore`);
};

/* =========================
   APP LOGIN (enable / disable + resend credentials)
========================= */
export const toggleInternAppLogin = async (id, enable) => {
  return API.patch(`/interns/${id}/app-login`, { isActive: enable });
};

export const resendInternCredentials = async (id) => {
  return API.post(`/interns/${id}/send-credentials`);
};

/* =========================
   EXPORT (backend Excel)
========================= */
export const exportInterns = async (params = {}) => {
  return API.get("/interns/export", { params, responseType: "blob" });
};
