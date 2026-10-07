import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Upload,
  X,
  FolderOpen,
  Download,
  MoreVertical,
  Copy,
  Check,
  Clock,
  RotateCcw,
  UserCheck,
  CalendarClock,
  Lock,
  LockOpen,
  Mail,
} from "lucide-react";

import {
  useInterns,
  useAddIntern,
  useUpdateIntern,
  useUpdateInternStatus,
  useExtendInternship,
  useConfigureInternStipend,
  useConvertInternToEmployee,
  useDeleteIntern,
  useRestoreIntern,
  useInternDocuments,
  useToggleInternAppLogin,
  useResendInternCredentials,
} from "../../hooks/useInterns";
import {
  buildInternPayload,
  exportInterns,
  uploadInternDocument,
  hasStipendData,
  validateStipendDraft,
} from "../../services/internService";
import {
  getDocumentViewUrl,
  deleteDocument,
} from "../../services/documentService";
import { useDepartmentNames } from "../../hooks/useDepartments";
import Pagination from "../Pagination";
import Button from "../Button";
import DocumentPreview from "../DocumentPreview";
import SearchableEmployeeSelectServer from "../attendance/SearchableEmployeeSelectServer";
import { getStoredUser, canManageEmployees } from "../../utils/roles";
import { isSiteVendor } from "../../utils/vendorIdhelper";
import {
  acceptFor,
  docTypeLabel,
  isAllowedFile,
} from "../../utils/documentTypes";
import {
  internValidationSchema,
  getMinInternshipEndInputValue,
  getMaxInternDobInputValue,
  MAX_DOC_FILE_BYTES,
} from "../../validators/internValidation";
import { downloadCredentialExcel } from "../../utils/credentialExcel";
import { maskEmployeeCode } from "../../utils/employeeCodeFormat";
import "../../pages/Employees.css";

const isSite = isSiteVendor();
const deptLabel = isSite ? "Site" : "Department";

const NEXT_STATUS = {
  active: ["completed", "terminated", "on-hold"],
  "on-hold": ["active", "terminated"],
  completed: [],
  terminated: [],
  converted: [],
};

const INTERN_DOC_TYPES = [
  "INTERNSHIP_OFFER_LETTER",
  "INTERNSHIP_AGREEMENT",
  "UNIVERSITY_NOC",
  "INTERNSHIP_COMPLETION_CERTIFICATE",
  "INTERNSHIP_EVALUATION_REPORT",
  "STIPEND_RECEIPT",
  "CONVERSION_OFFER_LETTER",
  "PHOTO",
  "AADHAAR",
  "PAN",
  "EDUCATION",
  "BANK",
];

const toDateInput = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

const addDaysInput = (value, days) => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return toDateInput(d);
};

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
};

const statusBadgeClass = (status) => {
  if (status === "active") return "active";
  if (status === "on-hold") return "probation";
  if (status === "completed") return "full-time";
  if (status === "converted") return "exited";
  return "inactive";
};

const statusLabel = (status) => {
  if (status === "on-hold") return "On Hold";
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : "-";
};

const formatStipend = (amount, frequency) => {
  if (!Number(amount)) return "Unpaid";
  return `₹${Number(amount).toLocaleString("en-IN")} (${frequency || "monthly"})`;
};

const getVendorId = () => {
  try {
    const userData = localStorage.getItem("user");
    if (userData) return JSON.parse(userData)?.vendorId || null;
  } catch {
    return null;
  }
  return null;
};

const deptNameOf = (intern) => {
  if (!intern?.department) return "-";
  if (typeof intern.department === "object") return intern.department.name || "-";
  return intern.department || "-";
};

const personNameOf = (person) => {
  if (!person) return "-";
  if (typeof person === "object") return person.name || "-";
  return person;
};

/* =========================
   Small building blocks (same CSS as Employees page)
========================= */

function InternModal({ title, onClose, size = "lg", children, footer }) {
  return (
    <div
      className="emp-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className={`emp-modal emp-modal--${size}`} role="dialog" aria-modal="true">
        <div className="emp-modal__header">
          <h3>{title}</h3>
          <button type="button" className="emp-modal__close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="emp-modal__body">{children}</div>
        {footer ? <div className="emp-modal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}

function FormSection({ title, description, children, fullWidth = false }) {
  return (
    <section className="emp-form-section">
      <div className="emp-form-section__head">
        <h4>{title}</h4>
        {description ? <p>{description}</p> : null}
      </div>
      {fullWidth ? children : <div className="emp-form-grid">{children}</div>}
    </section>
  );
}

function FormField({ label, htmlFor, required, hint, fullWidth, children }) {
  return (
    <div className={`emp-field${fullWidth ? " emp-field--full" : ""}`}>
      <label htmlFor={htmlFor}>
        {label}
        {required ? <span className="emp-required">*</span> : null}
      </label>
      {children}
      {hint ? <span className="emp-field-hint">{hint}</span> : null}
    </div>
  );
}

function FieldError({ message }) {
  return (
    <p className={`emp-field-error${message ? "" : " emp-field-error--empty"}`} aria-live="polite">
      {message || " "}
    </p>
  );
}

const INTERN_LOGIN_ROLE_OPTIONS = [
  { roleName: "Intern", displayName: "Intern" },
  { roleName: "Employee", displayName: "Employee" },
  { roleName: "Manager", displayName: "Manager" },
  { roleName: "HR", displayName: "HR" },
];

function InternAppLoginSection({
  enabled,
  onToggle,
  userRole,
  onRoleChange,
  userPassword,
  onPasswordChange,
  alreadyEnabled,
}) {
  if (alreadyEnabled) {
    return (
      <div className="emp-login-card emp-field--full">
        <p className="emp-field-hint" style={{ margin: 0 }}>
          App login is enabled for this intern. Choose the role for this login below.
        </p>
        <div className="emp-login-card__fields">
          <FormField label="Login role" htmlFor="intern-user-role">
            <select id="intern-user-role" value={userRole || "Intern"} onChange={onRoleChange}>
              {INTERN_LOGIN_ROLE_OPTIONS.map((role) => (
                <option key={role.roleName} value={role.roleName}>
                  {role.displayName}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </div>
    );
  }

  return (
    <div className="emp-login-card">
      <label className="emp-login-card__toggle">
        <input type="checkbox" checked={!!enabled} onChange={onToggle} />
        <div>
          <span>Enable app login for this intern</span>
          <span>Unchecked interns are managed by HR only (no mobile app access).</span>
        </div>
      </label>
      {enabled ? (
        <>
          <p className="employee-login-warning">
            Password is shown once after saving. Email or phone must be filled above.
          </p>
          <div className="emp-login-card__fields">
            <FormField label="Login role" htmlFor="intern-user-role">
              <select id="intern-user-role" value={userRole || "Intern"} onChange={onRoleChange}>
                {INTERN_LOGIN_ROLE_OPTIONS.map((role) => (
                  <option key={role.roleName} value={role.roleName}>
                    {role.displayName}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              label="Password"
              htmlFor="intern-user-password"
              hint="Leave blank to auto-generate"
            >
              <input
                id="intern-user-password"
                type="text"
                value={userPassword || ""}
                onChange={onPasswordChange}
                placeholder="Optional"
              />
            </FormField>
          </div>
        </>
      ) : null}
    </div>
  );
}

export const INTERN_FORM_SECTIONS = [
  {
    id: "basic",
    title: "Basic Information",
    description: "Primary contact and role details",
    fields: [
      { key: "employeeCode", label: "Employee Code (leave blank to auto-generate)" },
      { key: "name", label: "Full Name", required: true },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Phone Number", type: "tel" },
      { key: "designation", label: "Designation" },
      { key: "departmentId", label: deptLabel, required: true, type: "department" },
      { key: "location", label: "Work Location" },
      { key: "mentorId", label: "Mentor", type: "mentor" },
      { key: "reportingManagerId", label: "Reporting Manager", type: "manager" },
      { key: "dob", label: "Date of Birth", type: "date" },
    ],
  },
  {
    id: "internship",
    title: "Internship Details",
    description: "Duration, stipend and academic background",
    fields: [
      { key: "internshipStartDate", label: "Internship Start Date", type: "date", required: true },
      { key: "internshipEndDate", label: "Internship End Date", type: "date", required: true },
      { key: "universityOrInstitute", label: "University / Institute" },
      { key: "courseOrProgram", label: "Course / Program" },
      { key: "expectedGraduationDate", label: "Expected Graduation", type: "date" },
      { key: "highestQualification", label: "Highest Qualification" },
    ],
  },
  {
    id: "personal",
    title: "Personal Details",
    fields: [
      { key: "gender", label: "Gender", type: "select-gender" },
      { key: "bloodGroup", label: "Blood Group" },
      { key: "emergencyContact", label: "Emergency Contact", type: "tel" },
      { key: "fatherHusbandName", label: "Father / Husband Name" },
      { key: "relationWithMember", label: "Relationship with Member" },
      { key: "nationality", label: "Nationality" },
      { key: "maritalStatus", label: "Marital Status", type: "select-marital" },
      { key: "permanentAddress", label: "Permanent Address", fullWidth: true },
    ],
  },
  {
    id: "identity",
    title: "Identity & Bank",
    fields: [
      { key: "aadhaarNumber", label: "Aadhaar Number" },
      { key: "nameAsPerAadhaar", label: "Name as on Aadhaar" },
      { key: "panNumber", label: "PAN Number" },
      { key: "nameAsPerPan", label: "Name as on PAN" },
      { key: "bankName", label: "Bank Name" },
      { key: "accountHolderName", label: "Account Holder Name" },
      { key: "accountNumber", label: "Account Number" },
      { key: "ifscCode", label: "IFSC Code" },
    ],
  },
];

export function InternFormFields({ values, onFieldChange, departments, errors }) {
  const renderInput = (field) => {
    const id = `intern-field-${field.key}`;
    const common = {
      id,
      name: field.key,
      value: values[field.key] ?? "",
      onChange: onFieldChange,
      className: errors?.[field.key] ? "emp-field-input--error" : undefined,
    };

    if (field.type === "department") {
      return (
        <>
          <select {...common}>
            <option value="">Select {deptLabel}</option>
            {(departments || []).map((dept) => (
              <option key={dept?._id} value={dept?._id}>
                {dept?.name}
              </option>
            ))}
          </select>
          <FieldError message={errors?.[field.key]} />
        </>
      );
    }

    if (field.type === "mentor" || field.type === "manager") {
      const excludedId = field.type === "mentor" ? values.reportingManagerId : values.mentorId;
      const rawValue = values[field.key];
      const selectValue = rawValue && typeof rawValue === "object" ? rawValue._id : rawValue || "";
      return (
        <>
          <SearchableEmployeeSelectServer
            value={selectValue}
            onChange={(empId) => onFieldChange({ target: { name: field.key, value: empId } })}
            excludeIds={[idOf(excludedId)]}
            hasError={!!errors?.[field.key]}
            controlClassName="emp-field-input form-control"
            placeholder={`Select ${(field.label || "").toLowerCase()} (optional)`}
          />
          <FieldError message={errors?.[field.key]} />
        </>
      );
    }

    if (field.type === "date") {
      const dateAttrs = {};
      if (field.key === "dob") dateAttrs.max = getMaxInternDobInputValue();
      // End date can never be picked in the past, nor before the start date.
      if (field.key === "internshipEndDate") {
        dateAttrs.min = getMinInternshipEndInputValue(values.internshipStartDate);
      }
      return (
        <>
          <input {...common} {...dateAttrs} type="date" />
          <FieldError message={errors?.[field.key]} />
        </>
      );
    }

    if (field.type === "select-gender") {
      return (
        <>
          <select {...common} value={values.gender || ""}>
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <FieldError message={errors?.[field.key]} />
        </>
      );
    }

    if (field.type === "select-marital") {
      return (
        <>
          <select {...common} value={values.maritalStatus || ""}>
            <option value="">Select</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
          </select>
          <FieldError message={errors?.[field.key]} />
        </>
      );
    }

    const textAttrs = {};
    if (["phone", "emergencyContact"].includes(field.key)) {
      textAttrs.maxLength = 10;
      textAttrs.inputMode = "numeric";
    } else if (field.key === "aadhaarNumber") {
      textAttrs.maxLength = 12;
      textAttrs.inputMode = "numeric";
    } else if (field.key === "accountNumber") {
      textAttrs.maxLength = 18;
      textAttrs.inputMode = "numeric";
    } else if (field.key === "email") {
      textAttrs.maxLength = 254;
    } else if (
      ["name", "designation", "location", "fatherHusbandName", "nameAsPerAadhaar", "nameAsPerPan", "bankName", "accountHolderName", "nationality", "universityOrInstitute"].includes(field.key)
    ) {
      textAttrs.maxLength = 120;
    } else if (["highestQualification", "courseOrProgram"].includes(field.key)) {
      textAttrs.maxLength = 255;
    }

    return (
      <>
        <input
          {...common}
          {...textAttrs}
          type={field.type || "text"}
          placeholder={`Enter ${field.label.toLowerCase()}`}
        />
        {errors?.[field.key] ? <p className="emp-field-error">{errors[field.key]}</p> : null}
      </>
    );
  };

  return INTERN_FORM_SECTIONS.map((section) => (
    <FormSection key={section.id} title={section.title} description={section.description}>
      {section.fields.map((field) => (
        <FormField
          key={field.key}
          label={field.label}
          htmlFor={`intern-field-${field.key}`}
          required={field.required}
          fullWidth={field.fullWidth}
        >
          {renderInput(field)}
        </FormField>
      ))}
    </FormSection>
  ));
}

const idOf = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value._id || null;
  return value;
};

/* =========================
   MAIN TAB COMPONENT
========================= */

const initialForm = {
  employeeCode: "",
  name: "",
  email: "",
  phone: "",
  designation: "Intern",
  departmentId: "",
  location: "",
  dob: "",
  gender: "",
  bloodGroup: "",
  emergencyContact: "",
  fatherHusbandName: "",
  relationWithMember: "",
  nationality: "",
  maritalStatus: "",
  permanentAddress: "",
  aadhaarNumber: "",
  nameAsPerAadhaar: "",
  panNumber: "",
  nameAsPerPan: "",
  bankName: "",
  accountHolderName: "",
  accountNumber: "",
  ifscCode: "",
  highestQualification: "",
  internshipStartDate: "",
  internshipEndDate: "",
  universityOrInstitute: "",
  courseOrProgram: "",
  expectedGraduationDate: "",
  mentorId: "",
  reportingManagerId: "",
  createAppLogin: false,
  userRole: "Intern",
  userPassword: "",
};

const normalizeInternForForm = (intern) => ({
  ...initialForm,
  ...intern,
  departmentId:
    intern.department?._id || (typeof intern.department === "string" ? intern.department : "") || "",
  mentorId: intern.mentorId?._id || intern.mentorId || "",
  reportingManagerId: intern.reportingManagerId?._id || intern.reportingManagerId || "",
  dob: toDateInput(intern.dob),
  internshipStartDate: toDateInput(intern.internshipStartDate),
  internshipEndDate: toDateInput(intern.internshipEndDate),
  expectedGraduationDate: toDateInput(intern.expectedGraduationDate),
  stipendAmount: intern.stipendAmount ?? "",
  // Login inputs always start fresh — never prefill a password.
  createAppLogin: false,
  userRole: "Intern",
  userPassword: "",
});

export default function InternsTab() {
  const user = getStoredUser();
  const canManage = canManageEmployees(user?.role);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  // Floating row menu rendered in a portal so the table's scroll
  // container can never clip it.
  const [menu, setMenu] = useState(null); // { id, top, left }
  const closeMenu = () => setMenu(null);
  const openMenu = (e, intern) => {
    e.stopPropagation();
    if (menu?.id === intern._id) {
      setMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const width = 230;
    const height = 340;
    let left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    let top = rect.bottom + 6;
    if (top + height > window.innerHeight) {
      top = Math.max(8, rect.top - 6 - height);
    }
    setMenu({ id: intern._id, top, left });
  };
  const [copiedKey, setCopiedKey] = useState(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const [statusTarget, setStatusTarget] = useState(null);
  const [statusValue, setStatusValue] = useState("");
  const [statusRemark, setStatusRemark] = useState("");
  const [statusErrors, setStatusErrors] = useState({});

  const [extendTarget, setExtendTarget] = useState(null);
  const [extendDate, setExtendDate] = useState("");
  const [extendRemark, setExtendRemark] = useState("");
  const [extendErrors, setExtendErrors] = useState({});

  // Monthly stipend only — no salary-structure breakdown.
  const initialStipendDraft = {
    monthlyStipend: "",
    stipendFrequency: "monthly",
  };
  const [stipendDraft, setStipendDraft] = useState(initialStipendDraft);
  const [stipendDirty, setStipendDirty] = useState(false);

  const handleStipendMetaChange = (e) => {
    const { name, value } = e.target;
    const finalValue = name === "monthlyStipend" ? sanitizeStipendValue(value) : value;
    setStipendDirty(true);
    setStipendDraft((prev) => {
      const next = { ...prev, [name]: finalValue };
      const stipendError = validateStipendDraft(next);
      setErrors((prevErrs) => {
        const errs = { ...prevErrs };
        if (stipendError) errs.stipend = stipendError;
        else delete errs.stipend;
        return errs;
      });
      return next;
    });
  };

  const internStipendToDraft = (intern) => ({
    monthlyStipend: intern.stipendAmount ?? "",
    stipendFrequency: intern.stipendFrequency || "monthly",
  });

  const validateStipendForSave = () => {
    if (!hasStipendData(stipendDraft)) return "";
    return validateStipendDraft(stipendDraft);
  };

  const buildStipendPayload = () => ({
    stipendAmount: Number(stipendDraft.monthlyStipend) || 0,
    stipendFrequency: stipendDraft.stipendFrequency || "monthly",
  });

  const renderStipendSection = () => (
    <FormSection
      title="Stipend"
      description="Monthly stipend for this intern"
      fullWidth
    >
      {errors.stipend ? (
        <p className="emp-field-error">{errors.stipend}</p>
      ) : null}
      <div className="emp-form-grid">
        <div className="emp-field">
          <label htmlFor="intern-monthly-stipend">
            Monthly Stipend (₹)
          </label>
          <input
            id="intern-monthly-stipend"
            name="monthlyStipend"
            type="text"
            inputMode="decimal"
            maxLength={12}
            value={stipendDraft.monthlyStipend}
            onChange={handleStipendMetaChange}
            placeholder="e.g. 10000"
          />
        </div>
        <div className="emp-field">
          <label htmlFor="intern-stipend-frequency">Frequency</label>
          <select
            id="intern-stipend-frequency"
            name="stipendFrequency"
            value={stipendDraft.stipendFrequency || "monthly"}
            onChange={handleStipendMetaChange}
          >
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
            <option value="lump-sum">Lump sum</option>
          </select>
        </div>
      </div>
    </FormSection>
  );

  // Local calendar date (YYYY-MM-DD) — toISOString() is UTC-based and shows
  // yesterday during the first hours of the day in +UTC zones.
  const toLocalDateInput = (value = new Date()) => {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return "";
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
  };

  const [convertTarget, setConvertTarget] = useState(null);
  const [convertForm, setConvertForm] = useState({
    dateOfJoining: toLocalDateInput(),
    designation: "",
    departmentId: "",
    employmentStatus: "probation",
  });
  const [convertErrors, setConvertErrors] = useState({});
  const [docError, setDocError] = useState("");

  const [docsTarget, setDocsTarget] = useState(null);
  const [docType, setDocType] = useState("INTERNSHIP_OFFER_LETTER");
  const [docFile, setDocFile] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docPreviewUrl, setDocPreviewUrl] = useState(null);

  const { data: internData, refetch: refetchInterns } = useInterns({
    departmentId: departmentFilter || undefined,
    status: statusFilter || undefined,
    page,
    limit,
    search: search || undefined,
    isPagination: "true",
  });
  const interns = internData?.interns || [];
  const pagination = internData?.pagination || { total: 0, pages: 0 };
  const menuIntern = menu ? interns.find((i) => i._id === menu.id) : null;

  const { data: department = [] } = useDepartmentNames(getVendorId());
  const { data: docsRes, refetch: refetchDocs } = useInternDocuments(docsTarget?._id, {
    enabled: !!docsTarget?._id,
  });

  const addMutation = useAddIntern();
  const updateMutation = useUpdateIntern();
  const statusMutation = useUpdateInternStatus();
  const extendMutation = useExtendInternship();
  const stipendMutation = useConfigureInternStipend();
  const convertMutation = useConvertInternToEmployee();
  const deleteMutation = useDeleteIntern();
  const restoreMutation = useRestoreIntern();
  const toggleLoginMutation = useToggleInternAppLogin();
  const resendCredentialsMutation = useResendInternCredentials();
  const [loginCredentials, setLoginCredentials] = useState(null);

  const showLoginCredentials = (internName, loginInfo, internId) => {
    if (!loginInfo) return;
    setLoginCredentials({
      employeeName: internName,
      employeeId: internId || loginInfo.employeeId || null,
      email: loginInfo.email,
      role: loginInfo.role,
      temporaryPassword: loginInfo.temporaryPassword,
      organizationCode: loginInfo.organizationCode,
      linkedExisting: Boolean(loginInfo.linkedExisting),
      phone: loginInfo.phone,
    });
  };

  const handleResendCredentials = async (internId, internName) => {
    try {
      const res = await resendCredentialsMutation.mutateAsync(internId);
      const data = res.data || {};
      if (!data.emailSent && data.loginInfo?.temporaryPassword) {
        showLoginCredentials(
          internName || data.loginInfo.name,
          data.loginInfo,
          internId
        );
        return;
      }
      alert(data.message || "Credentials sent.");
      refetchInterns();
    } catch (error) {
      alert(
        error.response?.data?.message || "Failed to send credentials"
      );
    }
  };

  const handleToggleAppLogin = async (intern) => {
    if (!intern.hasAppLogin) {
      alert("This intern does not have an app login account yet. Enable app login from Edit Details first.");
      return;
    }
    const enable = !intern.hasLoginEnabled;
    const confirmed = window.confirm(
      enable
        ? `Enable app login for ${intern.name}? They will be able to log in again.`
        : `Disable app login for ${intern.name}? They will not be able to log in until re-enabled.`
    );
    if (!confirmed) return;
    try {
      await toggleLoginMutation.mutateAsync({ id: intern._id, enable });
      alert(enable ? "App login enabled." : "App login disabled.");
      refetchInterns();
    } catch (error) {
      alert(
        error.response?.data?.message || "Failed to update app login access"
      );
    }
  };

  useEffect(() => {
    if (!menu) return undefined;
    const handleClickOutside = (e) => {
      if (!e.target.closest(".action-dropdown-menu") && !e.target.closest(".emp-grid-btn")) {
        setMenu(null);
      }
    };
    const handleScroll = () => setMenu(null);
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [menu]);

  useEffect(() => {
    refetchInterns();
  }, [departmentFilter, statusFilter, page, limit, search, refetchInterns]);

  // ---- input sanitizers: invalid characters never reach the state ----
  const DIGIT_FIELDS = { phone: 10, emergencyContact: 10, aadhaarNumber: 12, accountNumber: 18 };
  const NAME_FIELDS = ["name", "fatherHusbandName", "nameAsPerAadhaar", "nameAsPerPan", "accountHolderName"];

  const sanitizeFieldValue = (name, value) => {
    const str = String(value ?? "");
    if (DIGIT_FIELDS[name]) return str.replace(/\D/g, "").slice(0, DIGIT_FIELDS[name]);
    if (NAME_FIELDS.includes(name)) return str.replace(/[0-9]/g, "");
    if (name === "ifscCode" || name === "panNumber") return str.toUpperCase().replace(/\s/g, "");
    // Employee codes are masked live: invalid keystrokes are swallowed, so
    // no character error is ever shown (only a finished all-zeros code can
    // still fail at submit).
    if (name === "employeeCode") return maskEmployeeCode(value);
    return value;
  };

  // Never auto-correct the amount — out-of-range values stay visible
  // and surface a validation error instead.
  const sanitizeStipendValue = (raw) => {
    let v = String(raw ?? "").replace(/[^0-9.]/g, "");
    const dot = v.indexOf(".");
    if (dot !== -1) v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, "");
    if (dot !== -1) {
      const [intPart, decPart = ""] = v.split(".");
      v = `${intPart}.${decPart.slice(0, 2)}`;
    }
    return v;
  };

  // Normalize linked entities to plain ids before running the schema.
  const toValidationValues = (values) => ({
    ...values,
    departmentId:
      values.departmentId && typeof values.departmentId === "object"
        ? values.departmentId._id || ""
        : values.departmentId,
    mentorId: idOf(values.mentorId) || "",
    reportingManagerId: idOf(values.reportingManagerId) || "",
    evaluatedBy: idOf(values.evaluatedBy) || values.evaluatedBy || "",
  });

  const validateInternField = async (name, values) => {
    try {
      await internValidationSchema.validateAt(name, values, { abortEarly: true });
      setErrors((prev) => {
        if (!prev[name]) return prev;
        const next = { ...prev };
        delete next[name];
        return next;
      });
    } catch (err) {
      // Unknown paths (e.g. helper-only keys) carry no schema rule — clear instead.
      if (err?.message?.includes("does not contain the path")) {
        setErrors((prev) => {
          if (!prev[name]) return prev;
          const next = { ...prev };
          delete next[name];
          return next;
        });
        return;
      }
      setErrors((prev) => ({ ...prev, [name]: err.message }));
    }
  };

  const collectInternFormErrors = async (values) => {
    try {
      await internValidationSchema.validate(toValidationValues(values), { abortEarly: false });
      return {};
    } catch (err) {
      if (!err.inner) throw err;
      const mapped = {};
      err.inner.forEach((e) => {
        if (e.path && !mapped[e.path]) mapped[e.path] = e.message;
      });
      return mapped;
    }
  };

  const validateForm = (values) => collectInternFormErrors(values);

  const hasFormErrors = Object.values(errors).some(Boolean);

  const handleFieldChange = (setter) => (e) => {
    const { name, value } = e.target;
    const finalValue = sanitizeFieldValue(name, value);
    setter((prev) => {
      const next = { ...prev, [name]: finalValue };
      validateInternField(name, toValidationValues(next));
      return next;
    });
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleCopyContact = async (internId, field, value) => {
    if (!value) return;
    const key = `${internId}-${field}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement("textarea");
        ta.value = value;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1500);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  /* ---------- onboard ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const formErrors = await validateForm(form);
    if (Object.keys(formErrors).length) {
      setErrors(formErrors);
      const firstKey = Object.keys(formErrors)[0];
      document.getElementById(`intern-field-${firstKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    // Stipend configured inside the modal must fit within the monthly stipend.
    const stipendError = validateStipendForSave();
    if (stipendError) {
      setErrors({ stipend: stipendError });
      alert(stipendError);
      return;
    }
    if (form.createAppLogin && !form.email?.trim() && !form.phone?.trim()) {
      alert("Please enter either an email or a phone number to enable app login.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await addMutation.mutateAsync(buildInternPayload(form));
      const newInternId = res.data?.intern?._id;

      if (newInternId && hasStipendData(stipendDraft)) {
        try {
          await stipendMutation.mutateAsync({ id: newInternId, ...buildStipendPayload() });
        } catch (stipendError) {
          alert(
            stipendError.response?.data?.message ||
            "Intern was onboarded but stipend could not be saved. Edit the intern to set stipend."
          );
        }
      }

      alert(res.data?.message || "Intern onboarded successfully");
      if (res.data?.loginInfo) {
        showLoginCredentials(form.name, res.data.loginInfo, newInternId);
      }
      setForm(initialForm);
      setStipendDraft(initialStipendDraft);
      setStipendDirty(false);
      setErrors({});
      setShowAddModal(false);
      refetchInterns();
    } catch (error) {
      const serverData = error.response?.data || {};
      const serverMessage = serverData.message || "Failed to onboard intern";
      if (serverData.field) setErrors({ [serverData.field]: serverMessage });
      alert(serverMessage);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- edit ---------- */
  const handleEdit = (intern) => {
    setErrors({});
    setSelectedIntern(normalizeInternForForm(intern));
    setStipendDraft(internStipendToDraft(intern));
    setStipendDirty(false);
    setIsEditing(true);
  };

  const openAddModal = () => {
    setForm(initialForm);
    setStipendDraft(initialStipendDraft);
    setStipendDirty(false);
    setErrors({});
    setShowAddModal(true);
  };

  const handleUpdate = async () => {
    if (submitting || !selectedIntern) return;
    const formErrors = await validateForm(selectedIntern);
    if (Object.keys(formErrors).length) {
      setErrors(formErrors);
      return;
    }

    // Enabling login on update needs a contact to attach the account to.
    const enableLoginOnUpdate = selectedIntern.createAppLogin && !selectedIntern.hasAppLogin;
    if (enableLoginOnUpdate && !selectedIntern.email?.trim() && !selectedIntern.phone?.trim()) {
      alert("Please enter either an email or a phone number to enable app login.");
      return;
    }

    // Stipend configured inside the edit modal must be valid before saving.
    if (stipendDirty && hasStipendData(stipendDraft)) {
      const stipendMatchError = validateStipendForSave();
      if (stipendMatchError) {
        setErrors({ stipend: stipendMatchError });
        alert(stipendMatchError);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await updateMutation.mutateAsync({
        id: selectedIntern._id,
        data: buildInternPayload(selectedIntern),
      });

      if (stipendDirty && hasStipendData(stipendDraft)) {
        try {
          await stipendMutation.mutateAsync({ id: selectedIntern._id, ...buildStipendPayload() });
        } catch (stipendErr) {
          alert(
            stipendErr.response?.data?.message ||
            stipendErr.message ||
            "Intern updated but stipend could not be saved."
          );
        }
      }

      alert(res.data?.message || "Intern updated successfully");
      if (res.data?.loginInfo?.created || res.data?.loginInfo?.temporaryPassword) {
        showLoginCredentials(
          selectedIntern.name,
          res.data.loginInfo,
          selectedIntern._id
        );
      }
      setSelectedIntern(null);
      setIsEditing(false);
      setErrors({});
      refetchInterns();
    } catch (error) {
      const serverData = error.response?.data || {};
      const serverMessage = serverData.message || "Failed to update intern";
      if (serverData.field) setErrors({ [serverData.field]: serverMessage });
      alert(serverMessage);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- delete / restore ---------- */
  const handleDelete = async (intern) => {
    if (!window.confirm(`Archive ${intern.name}? The record will be hidden from default views.`)) return;
    try {
      await deleteMutation.mutateAsync(intern._id);
      alert("Intern archived successfully");
      if (interns.length <= 1 && page > 1) setPage(page - 1);
      else refetchInterns();
    } catch (error) {
      alert(error.response?.data?.message || "Delete failed");
    }
  };

  const handleRestore = async (intern) => {
    try {
      await restoreMutation.mutateAsync(intern._id);
      alert("Intern restored successfully");
      refetchInterns();
    } catch (error) {
      alert(error.response?.data?.message || "Restore failed");
    }
  };

  /* ---------- status ---------- */
  const openStatusModal = (intern) => {
    setStatusTarget(intern);
    setStatusValue("");
    setStatusRemark("");
    setStatusErrors({});
  };

  const handleStatusSubmit = async () => {
    if (!statusTarget) return;
    const errs = {};
    const allowed = NEXT_STATUS[statusTarget.internStatus] || [];
    if (!statusValue) errs.status = "Select a status";
    else if (!allowed.includes(statusValue)) {
      errs.status = `Cannot move intern from '${statusTarget.internStatus}' to '${statusValue}'`;
    }
    if (!statusRemark.trim()) errs.remark = "Remark is required for audit trail";
    else if (statusRemark.trim().length > 500) errs.remark = "Remark must be at most 500 characters";
    if (Object.keys(errs).length) {
      setStatusErrors(errs);
      return;
    }
    setStatusErrors({});
    try {
      const res = await statusMutation.mutateAsync({
        id: statusTarget._id,
        status: statusValue,
        remark: statusRemark.trim(),
      });
      alert(res.data?.message || "Status updated");
      setStatusTarget(null);
      refetchInterns();
    } catch (error) {
      alert(error.response?.data?.message || "Status update failed");
    }
  };

  /* ---------- extend ---------- */
  const openExtendModal = (intern) => {
    setExtendTarget(intern);
    setExtendDate("");
    setExtendRemark("");
    setExtendErrors({});
  };

  const handleExtendSubmit = async () => {
    if (!extendTarget) return;
    const errs = {};
    const currentEnd = extendTarget.internshipEndDate ? new Date(extendTarget.internshipEndDate) : null;
    if (currentEnd) currentEnd.setHours(0, 0, 0, 0);
    if (!extendDate) {
      errs.newEndDate = "Select the new end date";
    } else {
      const next = new Date(extendDate);
      if (isNaN(next.getTime())) errs.newEndDate = "Enter a valid end date";
      else {
        next.setHours(0, 0, 0, 0);
        if (currentEnd && next <= currentEnd) {
          errs.newEndDate = `New end date must be after the current end date (${formatDate(extendTarget.internshipEndDate)})`;
        }
      }
    }
    if (!extendRemark.trim()) errs.remark = "Remark is required for audit trail";
    else if (extendRemark.trim().length > 500) errs.remark = "Remark must be at most 500 characters";
    if (Object.keys(errs).length) {
      setExtendErrors(errs);
      return;
    }
    setExtendErrors({});
    try {
      const res = await extendMutation.mutateAsync({
        id: extendTarget._id,
        newEndDate: extendDate,
        remark: extendRemark.trim(),
      });
      alert(res.data?.message || "Internship extended");
      setExtendTarget(null);
      refetchInterns();
    } catch (error) {
      alert(error.response?.data?.message || "Extension failed");
    }
  };

  /* ---------- convert ---------- */
  const openConvertModal = (intern) => {
    setConvertTarget(intern);
    setConvertForm({
      dateOfJoining: toLocalDateInput(),
      designation: intern.designation === "Intern" ? "" : intern.designation || "",
      departmentId: intern.department?._id || intern.department || "",
      employmentStatus: "probation",
    });
    setConvertErrors({});
  };

  const handleConvertSubmit = async () => {
    if (!convertTarget) return;
    const errs = {};
    if (!convertForm.designation.trim()) errs.designation = "Enter the full-time designation";
    else if (convertForm.designation.trim().length > 120) {
      errs.designation = "Designation must be at most 120 characters";
    }
    if (!convertForm.dateOfJoining) errs.dateOfJoining = "Date of joining is required";
    else {
      const doj = new Date(convertForm.dateOfJoining);
      if (isNaN(doj.getTime())) errs.dateOfJoining = "Enter a valid joining date";
      else if (convertTarget?.internshipStartDate) {
        const start = new Date(convertTarget.internshipStartDate);
        start.setHours(0, 0, 0, 0);
        doj.setHours(0, 0, 0, 0);
        if (doj < start) {
          errs.dateOfJoining = `Joining date cannot be earlier than the internship start date (${formatDate(convertTarget.internshipStartDate)})`;
        }
      }
    }
    if (Object.keys(errs).length) {
      setConvertErrors(errs);
      return;
    }
    setConvertErrors({});
    try {
      const res = await convertMutation.mutateAsync({
        id: convertTarget._id,
        dateOfJoining: convertForm.dateOfJoining || undefined,
        designation: convertForm.designation.trim(),
        departmentId: convertForm.departmentId || undefined,
        employmentStatus: convertForm.employmentStatus,
      });
      alert(res.data?.message || "Intern converted to employee");
      setConvertTarget(null);
      refetchInterns();
    } catch (error) {
      alert(error.response?.data?.message || "Conversion failed");
    }
  };

  /* ---------- documents ---------- */
  const openDocsModal = (intern) => {
    setDocsTarget(intern);
    setDocType("INTERNSHIP_OFFER_LETTER");
    setDocFile(null);
    setDocError("");
  };

  const handleDocFileChange = (file, type = docType) => {
    setDocFile(file);
    if (!file) {
      setDocError("");
      return;
    }
    if (!isAllowedFile(type, file.name)) {
      setDocError(`Invalid file for ${docTypeLabel(type)}. Allowed: ${acceptFor(type)}`);
      return;
    }
    if (file.size > MAX_DOC_FILE_BYTES) {
      setDocError("File must be at most 20 MB");
      return;
    }
    setDocError("");
  };

  const handleDocUpload = async () => {
    if (!docsTarget || !docFile) {
      setDocError("Select a file to upload");
      return;
    }
    if (!isAllowedFile(docType, docFile.name)) {
      setDocError(`Invalid file for ${docTypeLabel(docType)}. Allowed: ${acceptFor(docType)}`);
      return;
    }
    if (docFile.size > MAX_DOC_FILE_BYTES) {
      setDocError("File must be at most 20 MB");
      return;
    }
    setDocError("");
    setUploadingDoc(true);
    try {
      await uploadInternDocument({
        internId: docsTarget._id,
        documentType: docType,
        file: docFile,
      });
      alert("Document uploaded");
      setDocFile(null);
      refetchDocs();
      refetchInterns();
    } catch (error) {
      alert(error.response?.data?.message || "Upload failed");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDocDelete = async (docId) => {
    if (!window.confirm("Delete this document?")) return;
    try {
      await deleteDocument(docId);
      refetchDocs();
      refetchInterns();
    } catch (error) {
      alert(error.response?.data?.message || "Delete failed");
    }
  };

  /* ---------- export ---------- */
  const handleDownloadAll = async () => {
    if (downloadingAll) return;
    setDownloadingAll(true);
    try {
      const params = {
        ...(search?.trim() ? { search: search.trim() } : {}),
        ...(departmentFilter ? { departmentId: departmentFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      };
      const res = await exportInterns(params);
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const contentDisposition = res.headers?.["content-disposition"] || "";
      const fileNameMatch = contentDisposition.match(/filename="?([^";]+)"?/);
      const fileName = fileNameMatch?.[1] || `Interns-Export-${new Date().toISOString().split("T")[0]}.xlsx`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to download interns Excel");
    } finally {
      setDownloadingAll(false);
    }
  };

  const docsData = docsRes || {};
  const internDocs = docsData.documents || [];
  const checklist = docsData.requiredDocuments || docsTarget?.requiredDocuments || [];

  return (
    <div className="interns-tab">
      

      <div className="employee-toolbar">
        <div className="search-wrapper">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search interns..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="toolbar-actions">
          <div className="employee-filter">
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{isSite ? "All Sites" : "All Departments"}</option>
              {department.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="employee-filter">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Interns</option>
              <option value="active">Active Interns</option>
              <option value="on-hold">On-Hold Interns</option>
              <option value="completed">Completed Interns</option>
              <option value="converted">Converted Interns</option>
              <option value="terminated">Terminated Interns</option>
              <option value="expiring-soon">Ending Soon (30 days)</option>
              <option value="deleted">Archived Interns</option>
            </select>
          </div>

          <Button
            variant="secondary"
            icon={<Download size={16} />}
            onClick={handleDownloadAll}
            disabled={downloadingAll}
            title="Download all interns as Excel"
            className="emp-export-btn"
          >
            {downloadingAll ? "..." : "Export"}
          </Button>

          {canManage && (
            <Button
              icon={<Plus size={18} />}
              onClick={openAddModal}
            >
              Add Intern
            </Button>
          )}
        </div>
      </div>

      <div className="employee-table-card">
        <div className="employee-table-scroll">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Contact</th>
                <th>{deptLabel} name</th>
                <th>Designation</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Stipend</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {interns.length > 0 ? (
                interns.map((intern) => (
                  <tr key={intern._id}>
                    <td>{intern.employeeCode}</td>
                    <td title={intern.name}>{intern.name}</td>
                    <td>
                      <div className="emp-contact-cell">
                        <div className="emp-contact-line" title={intern.email || ""}>
                          <span className="emp-contact-text">{intern.email || "-"}</span>
                          {intern.email ? (
                            <button
                              type="button"
                              className="emp-copy-btn"
                              title="Copy email"
                              onClick={() => handleCopyContact(intern._id, "email", intern.email)}
                            >
                              {copiedKey === `${intern._id}-email` ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          ) : null}
                        </div>
                        <div className="emp-contact-line emp-contact-line--phone" title={intern.phone || ""}>
                          <span className="emp-contact-text">{intern.phone || "-"}</span>
                          {intern.phone ? (
                            <button
                              type="button"
                              className="emp-copy-btn"
                              title="Copy phone"
                              onClick={() => handleCopyContact(intern._id, "phone", intern.phone)}
                            >
                              {copiedKey === `${intern._id}-phone` ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td title={deptNameOf(intern)}>
                      <span className="emp-truncate emp-truncate--dept">{deptNameOf(intern)}</span>
                    </td>
                    <td title={intern.designation}>{intern.designation || "-"}</td>
                    <td title={formatDate(intern.internshipStartDate)}>
                      {formatDate(intern.internshipStartDate)}
                    </td>
                    <td title={formatDate(intern.internshipEndDate)}>
                      {formatDate(intern.internshipEndDate)}
                    </td>
                    <td title={formatStipend(intern.stipendAmount, intern.stipendFrequency)}>
                      {Number(intern.stipendAmount) ? (
                        <>₹{Number(intern.stipendAmount).toLocaleString("en-IN")}</>
                      ) : (
                        <span className="status-badge inactive">Unpaid</span>
                      )}
                    </td>
                    <td>
                      <div className="emp-status-cell">
                        {intern.isDeleted ? (
                          <span className="status-badge deleted">Archived</span>
                        ) : (
                          <span className={`status-badge ${statusBadgeClass(intern.internStatus)}`}>
                            {statusLabel(intern.internStatus)}
                          </span>
                        )}
                        {intern.conversionEmployeeCode ? (
                          <span className="emp-probation-date" title={`Converted to ${intern.conversionEmployeeCode}`}>
                            → {intern.conversionEmployeeCode}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <button
                        className="emp-grid-btn dropdown-toggle"
                        aria-label={`Actions for ${intern.name}`}
                        aria-expanded={menu?.id === intern._id}
                        onClick={(e) => openMenu(e, intern)}
                      >
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="empty-row">
                    No interns found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination.pages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={pagination.pages}
          totalRecords={pagination.total}
          limit={limit}
          onPageChange={setPage}
          showPageSize
          onPageSizeChange={(nextLimit) => {
            setLimit(nextLimit);
            setPage(1);
          }}
        />
      )}

      {/* ============ FLOATING ROW MENU (portal — never clipped by table scroll) ============ */}
      {menu && menuIntern && createPortal(
        <div
          className="action-dropdown-menu"
          style={{ position: "fixed", top: menu.top, left: menu.left, marginTop: 0, zIndex: 9999 }}
          onClick={(e) => e.stopPropagation()}
          role="menu"
        >
          <button
            type="button"
            onClick={() => {
              closeMenu();
              setSelectedIntern(menuIntern);
              setIsEditing(false);
            }}
          >
            <Eye size={16} /> View Profile
          </button>
          {canManage && !menuIntern.isDeleted && menuIntern.internStatus !== "converted" && (
            <button
              type="button"
              onClick={() => {
                closeMenu();
                handleEdit(menuIntern);
              }}
            >
              <Pencil size={16} /> Edit Details
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              closeMenu();
              openDocsModal(menuIntern);
            }}
          >
            <FolderOpen size={16} /> Documents
          </button>
          {canManage && !menuIntern.isDeleted && !["converted", "terminated"].includes(menuIntern.internStatus) && (
            <>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  openStatusModal(menuIntern);
                }}
              >
                <CalendarClock size={16} /> Change Status
              </button>
              {["active", "on-hold"].includes(menuIntern.internStatus) && (
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    openExtendModal(menuIntern);
                  }}
                >
                  <CalendarClock size={16} /> Extend
                </button>
              )}
              {["active", "completed", "on-hold"].includes(menuIntern.internStatus) && (
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    openConvertModal(menuIntern);
                  }}
                >
                  <UserCheck size={16} /> Convert to Employee
                </button>
              )}
              {menuIntern.hasAppLogin && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      handleToggleAppLogin(menuIntern);
                    }}
                  >
                    {menuIntern.hasLoginEnabled ? (
                      <><Lock size={16} /> Disable App Login</>
                    ) : (
                      <><LockOpen size={16} /> Enable App Login</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      handleResendCredentials(menuIntern._id, menuIntern.name);
                    }}
                  >
                    <Mail size={16} /> Send Credentials
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  handleDelete(menuIntern);
                }}
              >
                <Trash2 size={16} /> Archive Intern
              </button>
            </>
          )}
          {canManage && menuIntern.isDeleted && (
            <button
              type="button"
              onClick={() => {
                closeMenu();
                handleRestore(menuIntern);
              }}
            >
              <RotateCcw size={16} /> Restore Intern
            </button>
          )}
        </div>,
        document.body
      )}

      {/* ============ ADD INTERN MODAL ============ */}
      {showAddModal ? (
        <InternModal
          title="Add Intern"
          onClose={() => {
            setShowAddModal(false);
            setStipendDraft(initialStipendDraft);
            setStipendDirty(false);
            setErrors({});
          }}
          size="lg"
          footer={
            <>
              <Button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setShowAddModal(false);
                  setStipendDraft(initialStipendDraft);
                  setStipendDirty(false);
                  setErrors({});
                }}
              >
                Cancel
              </Button>
              <Button type="submit" form="add-intern-form" disabled={hasFormErrors || submitting}>
                {submitting ? "Onboarding..." : "Onboard Intern"}
              </Button>
            </>
          }
        >
          <form id="add-intern-form" onSubmit={handleSubmit}>
            <InternFormFields
              values={form}
              onFieldChange={handleFieldChange(setForm)}
              departments={department}
              errors={errors}
            />
            {renderStipendSection()}
            <InternAppLoginSection
              enabled={form.createAppLogin}
              onToggle={(e) => setForm((prev) => ({ ...prev, createAppLogin: e.target.checked }))}
              userRole={form.userRole}
              onRoleChange={(e) => setForm((prev) => ({ ...prev, userRole: e.target.value }))}
              userPassword={form.userPassword}
              onPasswordChange={(e) => setForm((prev) => ({ ...prev, userPassword: e.target.value }))}
              alreadyEnabled={false}
            />
          </form>
        </InternModal>
      ) : null}

      {/* ============ VIEW / EDIT MODAL ============ */}
      {selectedIntern ? (
        <InternModal
          title={isEditing ? `Edit Intern — ${selectedIntern.name}` : `Intern Profile — ${selectedIntern.name}`}
          onClose={() => {
            setSelectedIntern(null);
            setIsEditing(false);
            setErrors({});
          }}
          size="lg"
          footer={
            isEditing ? (
              <>
                <Button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setSelectedIntern(null);
                    setIsEditing(false);
                    setErrors({});
                  }}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleUpdate} disabled={hasFormErrors || submitting}>
                  {submitting ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                {canManage && selectedIntern.internStatus !== "converted" && !selectedIntern.isDeleted ? (
                  <Button type="button" onClick={() => handleEdit(selectedIntern)}>
                    Edit Details
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setSelectedIntern(null);
                    setIsEditing(false);
                  }}
                >
                  Close
                </Button>
              </>
            )
          }
        >
          {isEditing ? (
            <>
              <InternFormFields
                values={selectedIntern}
                onFieldChange={handleFieldChange(setSelectedIntern)}
                departments={department}
                errors={errors}
              />
              {renderStipendSection()}
              <InternAppLoginSection
                enabled={selectedIntern.createAppLogin}
                onToggle={(e) =>
                  setSelectedIntern((prev) => ({ ...prev, createAppLogin: e.target.checked }))
                }
                userRole={selectedIntern.userRole}
                onRoleChange={(e) =>
                  setSelectedIntern((prev) => ({ ...prev, userRole: e.target.value }))
                }
                userPassword={selectedIntern.userPassword}
                onPasswordChange={(e) =>
                  setSelectedIntern((prev) => ({ ...prev, userPassword: e.target.value }))
                }
                alreadyEnabled={selectedIntern.hasAppLogin}
              />
            </>
          ) : (
            <div className="emp-view-body">
              {[
                ["Basic Information", [
                  ["Employee Code", selectedIntern.employeeCode || "-"],
                  ["Full Name", selectedIntern.name],
                  ["Email", selectedIntern.email || "-"],
                  ["Phone", selectedIntern.phone || "-"],
                  ["Designation", selectedIntern.designation || "-"],
                  ["Department", deptNameOf(selectedIntern)],
                  ["Location", selectedIntern.location || "-"],
                  ["Status", statusLabel(selectedIntern.internStatus)],
                  ["App Login", selectedIntern.hasAppLogin ? "Enabled" : "Not enabled"],
                ]],
                ["Internship Details", [
                  ["Start Date", formatDate(selectedIntern.internshipStartDate)],
                  ["End Date", formatDate(selectedIntern.internshipEndDate)],
                  ["Duration", selectedIntern.internshipDurationMonths ? `${selectedIntern.internshipDurationMonths} month(s)` : "-"],
                  ["Monthly Stipend", formatStipend(selectedIntern.stipendAmount, selectedIntern.stipendFrequency)],
                  ["Mentor", personNameOf(selectedIntern.mentorId)],
                  ["Reporting Manager", personNameOf(selectedIntern.reportingManagerId)],
                  ["University / Institute", selectedIntern.universityOrInstitute || "-"],
                  ["Course / Program", selectedIntern.courseOrProgram || "-"],
                  ["Expected Graduation", formatDate(selectedIntern.expectedGraduationDate)],
                  ["Converted To", selectedIntern.conversionEmployeeCode || "-"],
                ]],
                ["Personal & Bank Details", [
                  ["Date of Birth", formatDate(selectedIntern.dob)],
                  ["Gender", selectedIntern.gender || "-"],
                  ["Blood Group", selectedIntern.bloodGroup || "-"],
                  ["Emergency Contact", selectedIntern.emergencyContact || "-"],
                  ["Aadhaar", selectedIntern.aadhaarNumber || "-"],
                  ["PAN", selectedIntern.panNumber || "-"],
                  ["Bank", selectedIntern.bankName ? `${selectedIntern.bankName} • ${selectedIntern.accountNumber || "-"}` : "-"],
                  ["IFSC", selectedIntern.ifscCode || "-"],
                  ["Permanent Address", selectedIntern.permanentAddress || "-"],
                  ["Evaluation Score", selectedIntern.evaluationScore || "-"],
                  ["Evaluation Remarks", selectedIntern.evaluationRemarks || "-"],
                ]],
              ].map(([sectionTitle, rows]) => (
                <div className="profile-section" key={sectionTitle}>
                  <h4>{sectionTitle}</h4>
                  <div className="profile-grid">
                    {rows.map(([label, value]) => (
                      <div key={label}>
                        <label>{label}</label>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </InternModal>
      ) : null}

      {/* ============ STATUS MODAL ============ */}
      {statusTarget ? (
        <InternModal
          title={`Change Status — ${statusTarget.name}`}
          onClose={() => setStatusTarget(null)}
          size="xs"
          footer={
            <>
              <Button type="button" className="secondary-btn" onClick={() => setStatusTarget(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleStatusSubmit}>
                Update Status
              </Button>
            </>
          }
        >
          <FormField label="New Status" htmlFor="intern-status-value" required>
            <select
              id="intern-status-value"
              value={statusValue}
              onChange={(e) => {
                setStatusValue(e.target.value);
                setStatusErrors((p) => {
                  if (!p.status) return p;
                  const n = { ...p };
                  delete n.status;
                  return n;
                });
              }}
              className={statusErrors.status ? "emp-field-input--error" : undefined}
            >
              <option value="">Select status</option>
              {(NEXT_STATUS[statusTarget.internStatus] || []).map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
            <FieldError message={statusErrors.status} />
          </FormField>
          <FormField label="Remark" htmlFor="intern-status-remark" required fullWidth>
            <input
              id="intern-status-remark"
              value={statusRemark}
              maxLength={500}
              onChange={(e) => {
                setStatusRemark(e.target.value);
                setStatusErrors((p) => {
                  if (!p.remark) return p;
                  const n = { ...p };
                  delete n.remark;
                  return n;
                });
              }}
              placeholder="Reason for status change"
              className={statusErrors.remark ? "emp-field-input--error" : undefined}
            />
            <FieldError message={statusErrors.remark} />
          </FormField>
          {!(NEXT_STATUS[statusTarget.internStatus] || []).length ? (
            <p className="emp-field-error">This internship is {statusTarget.internStatus} — no further status changes allowed.</p>
          ) : null}
        </InternModal>
      ) : null}

      {/* ============ EXTEND MODAL ============ */}
      {extendTarget ? (
        <InternModal
          title={`Extend Internship — ${extendTarget.name}`}
          onClose={() => setExtendTarget(null)}
          size="xs"
          footer={
            <>
              <Button type="button" className="secondary-btn" onClick={() => setExtendTarget(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleExtendSubmit}>
                Extend
              </Button>
            </>
          }
        >
          <p className="emp-field-hint">Current end date: {formatDate(extendTarget.internshipEndDate)}</p>
          <FormField label="New End Date" htmlFor="intern-extend-date" required>
            <input
              id="intern-extend-date"
              type="date"
              value={extendDate}
              min={addDaysInput(extendTarget.internshipEndDate, 1)}
              onChange={(e) => {
                setExtendDate(e.target.value);
                setExtendErrors((p) => {
                  if (!p.newEndDate) return p;
                  const n = { ...p };
                  delete n.newEndDate;
                  return n;
                });
              }}
              className={extendErrors.newEndDate ? "emp-field-input--error" : undefined}
            />
            <FieldError message={extendErrors.newEndDate} />
          </FormField>
          <FormField label="Remark" htmlFor="intern-extend-remark" required fullWidth>
            <input
              id="intern-extend-remark"
              value={extendRemark}
              maxLength={500}
              onChange={(e) => {
                setExtendRemark(e.target.value);
                setExtendErrors((p) => {
                  if (!p.remark) return p;
                  const n = { ...p };
                  delete n.remark;
                  return n;
                });
              }}
              placeholder="Reason for extension"
              className={extendErrors.remark ? "emp-field-input--error" : undefined}
            />
            <FieldError message={extendErrors.remark} />
          </FormField>
        </InternModal>
      ) : null}

      {/* ============ CONVERT MODAL ============ */}
      {convertTarget ? (
        <InternModal
          title={`Convert to Employee — ${convertTarget.name}`}
          onClose={() => setConvertTarget(null)}
          size="intern"
          footer={
            <>
              <Button type="button" className="secondary-btn" onClick={() => setConvertTarget(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleConvertSubmit}>
                Convert to Full-Time
              </Button>
            </>
          }
        >
          <FormSection title="Employment Details" description="A new employee record will be created. Salary will be managed from the employee section.">
            <FormField label="Date of Joining" htmlFor="intern-convert-doj" required hint={`Cannot be earlier than internship start (${formatDate(convertTarget?.internshipStartDate)})`}>
              <input
                id="intern-convert-doj"
                type="date"
                min={toDateInput(convertTarget?.internshipStartDate)}
                value={convertForm.dateOfJoining}
                onChange={(e) => {
                  setConvertForm((p) => ({ ...p, dateOfJoining: e.target.value }));
                  setConvertErrors((p) => {
                    if (!p.dateOfJoining) return p;
                    const n = { ...p };
                    delete n.dateOfJoining;
                    return n;
                  });
                }}
                className={convertErrors.dateOfJoining ? "emp-field-input--error" : undefined}
              />
              <FieldError message={convertErrors.dateOfJoining} />
            </FormField>
            <FormField label="Designation" htmlFor="intern-convert-designation" required>
              <input
                id="intern-convert-designation"
                value={convertForm.designation}
                maxLength={120}
                onChange={(e) => {
                  setConvertForm((p) => ({ ...p, designation: e.target.value }));
                  setConvertErrors((p) => {
                    if (!p.designation) return p;
                    const n = { ...p };
                    delete n.designation;
                    return n;
                  });
                }}
                placeholder="e.g. Junior Developer"
                className={convertErrors.designation ? "emp-field-input--error" : undefined}
              />
              <FieldError message={convertErrors.designation} />
            </FormField>
            <FormField label={deptLabel} htmlFor="intern-convert-dept">
              <select
                id="intern-convert-dept"
                value={convertForm.departmentId}
                onChange={(e) => setConvertForm((p) => ({ ...p, departmentId: e.target.value }))}
              >
                <option value="">Keep intern department</option>
                {department.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Employment Status" htmlFor="intern-convert-status">
              <select
                id="intern-convert-status"
                value={convertForm.employmentStatus}
                onChange={(e) => setConvertForm((p) => ({ ...p, employmentStatus: e.target.value }))}
              >
                <option value="probation">Probation</option>
                <option value="full-time">Full-time</option>
              </select>
            </FormField>
          </FormSection>
        </InternModal>
      ) : null}

      {/* ============ DOCUMENTS MODAL (same UI as employee documents) ============ */}
      {docsTarget ? (
        <InternModal
          title="Intern Documents"
          onClose={() => {
            setDocsTarget(null);
            setDocFile(null);
          }}
          size="md"
          footer={
            canManage ? (
              <Button
                type="button"
                icon={<Upload size={16} />}
                onClick={handleDocUpload}
                disabled={uploadingDoc || !docFile || !!docError}
                style={{ flex: 1 }}
              >
                {uploadingDoc ? "Uploading..." : "Upload Document"}
              </Button>
            ) : (
              <Button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setDocsTarget(null);
                  setDocFile(null);
                }}
              >
                Close
              </Button>
            )
          }
        >
          <div className="emp-doc-hero">
            <div className="emp-doc-hero__icon">
              <FolderOpen size={22} />
            </div>
            <div>
              <span className="emp-doc-hero__label">Intern</span>
              <p className="emp-doc-hero__name">
                {docsTarget.name} ({docsTarget.employeeCode})
              </p>
            </div>
          </div>

          <FormSection title="Required Checklist" description="Collected status updates automatically when a document is uploaded." fullWidth>
            {(() => {
              const items = checklist.length ? checklist : [];
              const done = items.filter((i) => i.isCollected).length;
              const pct = items.length ? Math.round((done / items.length) * 100) : 0;
              return (
                <div className="emp-doc-checklist">
                  <div className="emp-doc-checklist__summary">
                    <span>{done} of {items.length} collected</span>
                    <div className="emp-doc-checklist__bar">
                      <div className="emp-doc-checklist__bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="emp-doc-checklist__items">
                    {items.map((item) => (
                      <div
                        key={item.documentType}
                        className={`emp-doc-checklist__item${item.isCollected ? " emp-doc-checklist__item--done" : ""}`}
                      >
                        <span className="emp-doc-checklist__icon">
                          {item.isCollected ? <Check size={15} /> : <Clock size={15} />}
                        </span>
                        <span className="emp-doc-checklist__name" title={docTypeLabel(item.documentType)}>
                          {docTypeLabel(item.documentType)}
                        </span>
                        {item.isCollected ? (
                          <span className="status-badge active">Collected</span>
                        ) : (
                          <span className={`emp-doc-checklist__tag ${item.isRequired ? "emp-doc-checklist__tag--required" : "emp-doc-checklist__tag--optional"}`}>
                            {item.isRequired ? "Required" : "Optional"}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </FormSection>

          {canManage ? (
            <FormSection title="Upload New Document">
              <FormField label="Document Type" htmlFor="doc-type" fullWidth>
                <select
                  id="doc-type"
                  value={docType}
                  onChange={(e) => {
                    setDocType(e.target.value);
                    // Re-validate the picked file against the new type.
                    if (docFile) handleDocFileChange(docFile, e.target.value);
                    else setDocError("");
                  }}
                >
                  {INTERN_DOC_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {docTypeLabel(t)}
                    </option>
                  ))}
                </select>
              </FormField>
              <div className="emp-field emp-field--full">
                <label>File</label>
                <div className="emp-upload-zone">
                  <input
                    type="file"
                    accept={acceptFor(docType)}
                    onChange={(e) => handleDocFileChange(e.target.files?.[0] || null)}
                  />
                  <Upload size={24} color="#64748b" />
                  <span className="emp-upload-zone__title">
                    Click or drag file to upload
                  </span>
                  <span className="emp-upload-zone__hint">
                    {acceptFor(docType)} up to 20MB
                  </span>
                  {docFile ? (
                    <span className="emp-upload-zone__file">
                      {docFile.name}
                    </span>
                  ) : null}
                </div>
                <FieldError message={docError} />
              </div>
            </FormSection>
          ) : null}

          <div className="emp-doc-list">
            <h4>Uploaded Documents</h4>

            {!Array.isArray(internDocs) ? (
              <p className="emp-doc-list__empty">Loading…</p>
            ) : internDocs.length === 0 ? (
              <p className="emp-doc-list__empty">No documents uploaded yet</p>
            ) : (
              internDocs.map((doc) => (
                <div key={doc._id} className="emp-doc-item">
                  <div>
                    <span className="emp-doc-item__type">
                      {docTypeLabel(doc.documentType)}
                    </span>
                    <span className="emp-doc-item__name">
                      {doc.originalName || doc.fileName}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="emp-btn emp-btn--secondary"
                      onClick={() => setDocPreviewUrl(getDocumentViewUrl(doc._id))}
                    >
                      <Eye size={14} />
                      View
                    </button>
                    {canManage ? (
                      <button
                        type="button"
                        className="emp-btn emp-btn--secondary"
                        onClick={() => handleDocDelete(doc._id)}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </InternModal>
      ) : null}

      <DocumentPreview
        isOpen={!!docPreviewUrl}
        onClose={() => setDocPreviewUrl(null)}
        url={docPreviewUrl}
      />

      {/* ============ APP LOGIN CREDENTIALS (shown once) ============ */}
      {loginCredentials ? (
        <InternModal
          title="App Login Details"
          onClose={() => setLoginCredentials(null)}
          footer={
            <>
              {loginCredentials.email ? (
                <Button
                  type="button"
                  className="secondary-btn"
                  onClick={() =>
                    handleResendCredentials(
                      loginCredentials.employeeId,
                      loginCredentials.employeeName
                    )
                  }
                >
                  Resend Email
                </Button>
              ) : null}
              <Button
                type="button"
                onClick={() => downloadCredentialExcel(loginCredentials)}
              >
                Download Excel
              </Button>
              <Button
                type="button"
                className="secondary-btn"
                onClick={() => setLoginCredentials(null)}
              >
                Done
              </Button>
            </>
          }
        >
          <div className="credentials-body">
            <p>
              <strong>{loginCredentials.employeeName}</strong> can now sign in
              with the following credentials. Share them securely — the password
              is shown only once.
            </p>
            <div className="credentials-row">
              <span>Login</span>
              <strong>{loginCredentials.email || loginCredentials.phone}</strong>
            </div>
            <div className="credentials-row">
              <span>Role</span>
              <strong>{loginCredentials.role}</strong>
            </div>
            {loginCredentials.organizationCode ? (
              <div className="credentials-row">
                <span>Organization Code</span>
                <strong>{loginCredentials.organizationCode}</strong>
              </div>
            ) : null}
            {loginCredentials.temporaryPassword ? (
              <div className="credentials-password-box">
                <span>Temporary Password</span>
                <strong>{loginCredentials.temporaryPassword}</strong>
              </div>
            ) : (
              <p className="emp-field-hint">
                {loginCredentials.linkedExisting
                  ? "Linked to an existing user account — no new password was set."
                  : "No new password was generated."}
              </p>
            )}
          </div>
        </InternModal>
      ) : null}
    </div>
  );
}
