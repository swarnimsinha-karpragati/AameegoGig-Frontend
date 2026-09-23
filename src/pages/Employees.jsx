import { useEffect, useState, useRef } from "react";
import * as XLSX from "xlsx";
import { useSearchParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import {
  buildEmployeePayload,
  convertToConsultant,
} from "../services/employeeService";

import {
  useEmployees,
  useAddEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useBulkUploadEmployees,
  useToggleAppLogin,
  useConvertToEmployee,
  useResendCredentials,
} from "../hooks/useEmployees";
import { useDepartmentNames } from "../hooks/useDepartments";

import {
  getDocumentViewUrl,
} from "../services/documentService";
import { useEmployeeDocuments, useUploadEmployeeDocument } from "../hooks/useDocuments";

import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Upload,
  X,
  FileText,
  FolderOpen,
  Download,
  MoreVertical,
  Lock,
  LockOpen,
  Mail,
  Copy,
  Check,
  TriangleAlert,
  OctagonX,
  UserCheck,
  Clock,
  ChevronDown,
  Info,
} from "lucide-react";
import { getStoredUser, canManageEmployees, canManageProbation, roleHasPermission } from "../utils/roles";
import { loadRoles } from "../utils/permissions";
import {
  confirmProbationEmployee,
  extendProbationEmployee,
  getEmployeeProbationHistory,
} from "../services/probationService";
import ProbationHistoryModal from "../components/ProbationHistoryModal";


import {
  generateAppointmentLetter,
  generateWarningLetter,
} from "../services/letterService";
import { createTermination } from "../services/terminationService";
import EmployeeSalaryStructureEditor, { hasSalaryData } from "../components/EmployeeSalaryStructureEditor";
import Pagination from "../components/Pagination";
import SearchableEmployeeSelectServer from "../components/attendance/SearchableEmployeeSelectServer";
import EmployeeSalaryStructureView from "../components/EmployeeSalaryStructureView";
import AppointmentLetterSalary from "../components/AppointmentLetterSalary";
import { saveEmployeeStructure, getEmployeeStructure } from "../services/salaryComponentService";

import "./Employees.css";
import {
  DOC_TYPE_ACCEPT,
  DOC_TYPE_OPTIONS,
  acceptFor,
  docTypeLabel,
  isAllowedFile,
} from "../utils/documentTypes";
import {
  employeeValidationSchema,
  getMaxDateOfBirthInputValue,
} from "../validators/employeeValidation";
import { validateStructureDraft, validateComponentsMatchCtc, validateComponentsMatchDailyWage, validateComponentsMatchCalendarDaily, sumLetterMonthlyGross } from "../utils/salaryValidation";
import Button from "../components/Button";
import ConfirmModal from "../components/ConfirmModal";
import DocumentPreview from "../components/DocumentPreview";
import { isSiteVendor, canUseCalendarDailyPay } from "../utils/vendorIdhelper";
import { defaultSelectedModules } from "../utils/roles";
import { downloadCredentialExcel } from "../utils/credentialExcel";
import { getRoles } from "../services/roleService";
import ConsultancyPayments from "../components/consultancy/ConsultancyPayments";
import "../components/consultancy/ConsultancyPayments.css";

const isSite = isSiteVendor();
const name = isSite ? "Site" : "Department";

const EMPLOYEE_FORM_SECTIONS = [
  {
    id: "basic",
    title: "Basic Information",
    description: "Primary contact and role details",
    fields: [
      { key: "employeeCode", label: "Employee Code (leave blank to auto-generate)" },
      { key: "name", label: "Full Name", required: true },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Phone Number", type: "tel" },
      { key: "designation", label: "Designation", required: true },
      { key: "departmentId", label: name, required: true },
      { key: "location", label: "Work Location" },
      { key: "managerId", label: "Reporting Manager", type: "manager" },
      { key: "peopleManagerId", label: "People Manager", type: "people-manager" },
      { key: "dateOfJoining", label: "Date of Joining", type: "date", required: true },
      { key: "dob", label: "Date of Birth", type: "date" },
    ],
  },
  {
    id: "family",
    title: "Family & Personal",
    fields: [
      { key: "gender", label: "Gender", type: "select-gender" },
      { key: "fatherHusbandName", label: "Father / Husband Name" },
      { key: "relationWithMember", label: "Relationship with Member", type: "select-relation" },
      { key: "nationality", label: "Nationality" },
      { key: "maritalStatus", label: "Marital Status", type: "select-marital" },
    ],
  },
  {
    id: "personal",
    title: "Personal Details",
    fields: [
      { key: "bloodGroup", label: "Blood Group" },
      { key: "emergencyContact", label: "Emergency Contact", type: "tel" },
    ],
  },
  {
    id: "address",
    title: "Address",
    fields: [
      { key: "permanentAddress", label: "Permanent Address", fullWidth: true },
    ],
  },
  {
    id: "identity",
    title: "Identity & Compliance",
    fields: [
      { key: "aadhaarNumber", label: "Aadhaar Number" },
      { key: "nameAsPerAadhaar", label: "Name as on Aadhaar" },
      { key: "panNumber", label: "PAN Number" },
      { key: "nameAsPerPan", label: "Name as on PAN" },
      { key: "uan", label: "UAN" },
      { key: "pfNumber", label: "PF Number" },
      { key: "esicNumber", label: "ESIC Number" },
    ],
  },
  {
    id: "bank",
    title: "Bank Details",
    fields: [
      { key: "bankName", label: "Bank Name" },
      { key: "accountHolderName", label: "Account Holder Name" },
      { key: "accountNumber", label: "Account Number" },
      { key: "ifscCode", label: "IFSC Code" },
    ],
  },
  {
    id: "education",
    title: "Education",
    fields: [
      { key: "highestQualification", label: "Highest Qualification", fullWidth: true },
    ],
  },
  {
    id: "employment",
    title: "Employment",
    fields: [
      { key: "client", label: "Client" },
      { key: "probationEndDate", label: "Probation End Date", type: "date" },
      { key: "relievingDate", label: "Relieving Date", type: "date" },
      { key: "payType", label: "Pay Type", type: "select-paytype" },
    ],
  },
];


function EmpModal({ title, onClose, size = "lg", children, footer }) {


  return (
    <div
      className="emp-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className={`emp-modal emp-modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="emp-modal-title"
      >
        <div className="emp-modal__header">
          <h3 id="emp-modal-title">{title}</h3>
          <button
            type="button"
            className="emp-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="emp-modal__body">{children}</div>
        {footer ? <div className="emp-modal__footer">{footer}</div> : null}
      </div>
    </div>
  );
}

const calculateNetConsultancy = (gross, tdsPercent) => {
  const amount = Number(gross) || 0;
  const tdsRate = Math.min(100, Math.max(0, Number(tdsPercent) || 0));
  const tds = Math.round((amount * tdsRate) / 100);
  return { gross: amount, tds, net: amount - tds };
};

// Bug 258: invalid pay/TDS must surface a validation message instead of a
// silently clamped preview.
const consultancyPreviewError = (gross, tdsPercent) => {
  if (gross !== "" && gross !== null && gross !== undefined) {
    const amount = Number(gross);
    if (!Number.isFinite(amount) || amount < 0) return "Consultancy Pay cannot be negative.";
    if (amount <= 0) return "Monthly Consultancy Pay must be greater than ₹0.";
  }
  if (tdsPercent !== "" && tdsPercent !== null && tdsPercent !== undefined) {
    const rate = Number(tdsPercent);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) return "TDS must be between 0% and 100%.";
  }
  return "";
};

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

function EmployeeFormFields({
  sections,
  values,
  onFieldChange,
  emailRequired,
  department,
  errors,
  showTransferNotice
}) {
  const fieldError = (key) => errors?.[key];
  const inputClassName = (key) =>
    fieldError(key) ? "emp-field-input--error" : undefined;

  const renderInput = (field) => {
    const id = `emp-field-${field.key}`;
    const common = {
      id,
      name: field.key,
      value: values[field.key] || "",
      onChange: onFieldChange,
      className: inputClassName(field.key),
    };
    if (field.key === "departmentId") {
      return (
        <>
          <select {...common}>
            <option value="">Select {name}</option>
            {department &&
              department.map((dept) => (
                <option key={dept?._id} value={dept?._id}>
                  {dept?.name}
                </option>
              ))}
          </select>
          <p className={`emp-field-error${fieldError(field.key) ? "" : " emp-field-error--empty"}`} aria-live="polite">{fieldError(field.key) || " "}</p>
          {showTransferNotice ? (
            <p className="emp-transfer-notice">
              Transfer letter will be created and sent to the employee when saved.
            </p>
          ) : null}
        </>
      );
    }

    if (field.type === "manager" || field.type === "people-manager") {
      const excludedManagerId =
        field.type === "manager" ? values.peopleManagerId : values.managerId;
      return (
        <>
          <SearchableEmployeeSelectServer
            value={values[field.key]}
            onChange={(empId) => onFieldChange({ target: { name: field.key, value: empId } })}
            excludeIds={[excludedManagerId]}
            hasError={!!fieldError(field.key)}
            controlClassName="emp-field-input form-control"
            placeholder={`Select ${field.label.toLowerCase()} (optional)`}
          />
          <p className={`emp-field-error${fieldError(field.key) ? "" : " emp-field-error--empty"}`} aria-live="polite">{fieldError(field.key) || " "}</p>
        </>
      );
    }

    if (field.type === "date") {
      const dateInputProps =
        field.key === "dob"
          ? { max: getMaxDateOfBirthInputValue() }
          : {};
      // Full-time hone par Probation End Date change nahi ho sakta.
      if (field.key === "probationEndDate" && values?.employmentStatus === "full-time") {
        dateInputProps.disabled = true;
      }
      // Full-time employee ka DOJ change nahi ho sakta — lekin sirf tab
      // disable karo jab value pehle se ho; empty ho to enable rahega.
      if (field.key === "dateOfJoining" && values?.employmentStatus === "full-time" && values?.dateOfJoining) {
        dateInputProps.disabled = true;
      }

      return (
        <>
          <input {...common} {...dateInputProps} type="date" />
          <p className={`emp-field-error${fieldError(field.key) ? "" : " emp-field-error--empty"}`} aria-live="polite">{fieldError(field.key) || " "}</p>
        </>
      );
    }

    if (field.type === "select-employment-status") {
      return (
        <>
          <select {...common} value={values.employmentStatus || "probation"}>
            <option value="probation">Probation</option>
            <option value="full-time">Full-time</option>
          </select>
          <p className={`emp-field-error${fieldError(field.key) ? "" : " emp-field-error--empty"}`} aria-live="polite">{fieldError(field.key) || " "}</p>
        </>
      );
    }

    if (field.type === "select-paytype") {
      return (
        <>
          <select {...common} value={values.payType || ""}>
            <option value="MONTHLY">Monthly</option>
            <option value="DAILY">Daily</option>
            {(canUseCalendarDailyPay() || values.payType === "CALENDAR_DAILY") && (
              <option value="CALENDAR_DAILY">Calendar Daily</option>
            )}
          </select>

          <p className={`emp-field-error${fieldError(field.key) ? "" : " emp-field-error--empty"}`} aria-live="polite">{fieldError(field.key) || " "}</p>
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

          <p className={`emp-field-error${fieldError(field.key) ? "" : " emp-field-error--empty"}`} aria-live="polite">{fieldError(field.key) || " "}</p>
        </>
      );
    }

    if (field.type === "select-relation") {
      return (
        <>
          <select {...common} value={values.relationWithMember || ""}>
            <option value="">Select</option>
            <option value="Father">Father</option>
            <option value="Mother">Mother</option>
            <option value="Husband">Husband</option>
            <option value="Wife">Wife</option>
            <option value="Spouse">Spouse</option>
            <option value="Son">Son</option>
            <option value="Daughter">Daughter</option>
            <option value="Brother">Brother</option>
            <option value="Sister">Sister</option>
            <option value="Grandfather">Grandfather</option>
            <option value="Grandmother">Grandmother</option>
            <option value="Uncle">Uncle</option>
            <option value="Aunt">Aunt</option>
            <option value="Guardian">Guardian</option>
            <option value="Other">Other</option>
          </select>
          <p className={`emp-field-error${fieldError(field.key) ? "" : " emp-field-error--empty"}`} aria-live="polite">{fieldError(field.key) || " "}</p>
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
          <p className={`emp-field-error${fieldError(field.key) ? "" : " emp-field-error--empty"}`} aria-live="polite">{fieldError(field.key) || " "}</p>
        </>
      );
    }

    return (
      <>
        <input
          {...common}
          type={field.type || "text"}
          placeholder={`Enter ${field.label.toLowerCase()}`}
        />
        {fieldError(field.key) ? (
          <p className="emp-field-error">{fieldError(field.key)}</p>
        ) : null}
      </>
    );
  };

  // Consultants have no probation — Probation End Date never shows for them.
  const visibleSections = values?.isConsultancy
    ? sections.map((section) => ({
        ...section,
        fields: section.fields.filter((field) => field.key !== "probationEndDate"),
      }))
    : sections;

  return visibleSections.map((section) => (
    <FormSection
      key={section.id}
      title={section.title}
      description={section.description}
    >
      {section.fields.map((field) => (
        <FormField
          key={field.key}
          label={field.label}
          htmlFor={`emp-field-${field.key}`}
          required={field.required || (field.key === "email" && emailRequired)}
          fullWidth={field.fullWidth}
          hint={
            field.key === "email" && emailRequired
              ? "Required for app login"
              : field.hint
          }
        >
          {renderInput(field)}
        </FormField>
      ))}
    </FormSection>
  ));
}

const DEFAULT_ROLE_OPTIONS = [
  { roleName: "Employee", displayName: "Employee" },
  { roleName: "Manager", displayName: "Manager" },
  { roleName: "HR", displayName: "HR" },
];

function AppLoginSection({
  enabled,
  onToggle,
  userRole,
  onRoleChange,
  userPassword,
  onPasswordChange,
  alreadyEnabled,
  linkedEmail,
  roles = DEFAULT_ROLE_OPTIONS,
  modulesIdPrefix,
}) {
  const currentRole = userRole || "Employee";
  const hasRole = roles.some((role) => role.roleName === currentRole);
  const roleOptions = hasRole
    ? roles
    : [{ roleName: currentRole, displayName: currentRole }, ...roles];

  const renderRoleField = (
    <FormField label="Login role" htmlFor={`${modulesIdPrefix}-user-role`}>
      <select
        id={`${modulesIdPrefix}-user-role`}
        value={currentRole}
        onChange={onRoleChange}
      >
        {roleOptions.map((role) => (
          <option key={role._id || role.roleName} value={role.roleName}>
            {role.displayName || role.roleName}
          </option>
        ))}
      </select>
    </FormField>
  );

  if (alreadyEnabled) {
    return (
      <div className="emp-login-card emp-field--full">
        <p className="emp-field-hint" style={{ margin: 0 }}>
          App login is enabled
          {linkedEmail ? ` for ${linkedEmail}` : ""}. Choose the role for this
          login below.
        </p>
        <div className="emp-login-card__fields">{renderRoleField}</div>
      </div>
    );
  }

  return (
    <div className="emp-login-card">
      <label className="emp-login-card__toggle">
        <input type="checkbox" checked={enabled} onChange={onToggle} />
        <div>
          <span>Enable app login for this employee</span>
          <span>Unchecked employees are managed by HR only (no mobile app access).</span>
        </div>
      </label>
      {enabled ? (
        <>
          <p className="employee-login-warning">
            Password is shown once after saving. Email must be filled above.
          </p>
          <div className="emp-login-card__fields">
            {renderRoleField}
            <FormField
              label="Password"
              htmlFor={`${modulesIdPrefix}-user-password`}
              hint="Leave blank to auto-generate"
            >
              <input
                id={`${modulesIdPrefix}-user-password`}
                type="text"
                value={userPassword}
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

function Employees() {
  /* =========================
     STATES
  ========================= */

  const user = getStoredUser();
  const canManage = canManageEmployees(user?.role);
  const canViewEmployees =
    user?.role === "Admin" || roleHasPermission(user?.role, "employees:view");
  const canViewConsultancy =
    user?.role === "Admin" ||
    roleHasPermission(user?.role, "consultancy:view") ||
    roleHasPermission(user?.role, "consultancy:manage");
  const canManageConsultancy =
    user?.role === "Admin" || roleHasPermission(user?.role, "consultancy:manage");
  const canLetters = roleHasPermission(user?.role, "employees:letters");
  // Consultancy lives inside Employees page: consultancy-only users get
  // Employees menu access but must see only the Consultancy tab.
  const isConsultancyOnly = !canViewEmployees && !canManage && canViewConsultancy;

  const initialForm = {
    name: "", email: "", phone: "",
    designation: "", departmentId: "", location: "",
    isConsultancy: false, monthlyConsultancyPay: "", tdsPercent: "",
    dob: "", bloodGroup: "", emergencyContact: "",

    gender: "",
    fatherHusbandName: "",
    relationWithMember: "",
    nationality: "",
    maritalStatus: "",
    permanentAddress: "",
    nameAsPerPan: "",
    nameAsPerAadhaar: "",
    client: "",
    payType: "MONTHLY",

    aadhaarNumber: "", panNumber: "",
    uan: "", pfNumber: "", esicNumber: "",
    bankName: "", accountHolderName: "", accountNumber: "", ifscCode: "",
    highestQualification: "",
    dateOfJoining: "", relievingDate: "", managerId: "", peopleManagerId: "",
    basicSalary: "", hra: "", conveyanceAllowance: "", incentive: "", otherAllowance: "", professionalTax: "",
    createAppLogin: false, userRole: "Employee", userPassword: "",
    allowedModules: defaultSelectedModules("Employee"),
  };

  const [form, setForm] = useState(initialForm);

  const [availableRoles, setAvailableRoles] = useState(DEFAULT_ROLE_OPTIONS);

  const [directoryType, setDirectoryType] = useState(() =>
    isConsultancyOnly ? "consultancy" : "employee"
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [consultancyRefreshKey, setConsultancyRefreshKey] = useState(0);

  const [uploadFile, setUploadFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get("status") || "";
  const isPageReload = (() => {
    try {
      const nav = performance.getEntriesByType("navigation")[0];
      if (nav && nav.type) return nav.type === "reload";
      if (performance.navigation) return performance.navigation.type === 1;
    } catch {
      /* ignore — deep-link apply hoga */
    }
    return false;
  })();
  const [statusFilter, setStatusFilter] = useState(isPageReload ? "" : urlStatus);

  const [departmentFilter, setDepartmentFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Role options for access review: system roles + custom catalog roles.
  // Read fresh every render so newly created roles appear immediately.
  const roleFilterOptions = (() => {
    const systemRoles = ["Admin", "HR", "Manager", "Employee"];
    try {
      const catalog = loadRoles();
      const customs = Object.keys(catalog || {}).filter((key) => !systemRoles.includes(key));
      return [...systemRoles, ...customs];
    } catch {
      return systemRoles;
    }
  })();

  const { data: employeeData, refetch: refetchEmployees } = useEmployees({
    departmentId: departmentFilter || undefined,
    status: statusFilter || undefined,
    role: roleFilter || undefined,
    page,
    limit,
    search,
    isConsultancy: directoryType === "consultancy",
    isPagination: "true",
  });

  const employees = employeeData?.employees || [];
  const pagination = employeeData?.pagination || { total: 0, pages: 0 };

  const { data: department = [] } = useDepartmentNames(
    (() => {
      const userData = localStorage.getItem("user");
      if (userData) {
        const { vendorId } = JSON.parse(userData);
        return vendorId;
      }
      return null;
    })()
  );

  const addMutation = useAddEmployee();
  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();
  const bulkUploadMutation = useBulkUploadEmployees();
  const toggleAppLoginMutation = useToggleAppLogin();
  const convertToEmployeeMutation = useConvertToEmployee();
  const resendCredentialsMutation = useResendCredentials();

  const [openDropdownId, setOpenDropdownId] = useState(null);
  // Accordion: which menu category is open (one at a time)
  const [expandedMenuSection, setExpandedMenuSection] = useState("general");

  const toggleMenuSection = (key) => {
    setExpandedMenuSection((prev) => (prev === key ? null : key));
  };

  const renderMenuSectionToggle = (key, label, danger = false) => (
    <button
      type="button"
      className={`dropdown-section-toggle${danger ? " dropdown-section-toggle--danger" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        toggleMenuSection(key);
      }}
      aria-expanded={expandedMenuSection === key}
    >
      <span>{label}</span>
      <ChevronDown
        size={14}
        className={expandedMenuSection === key ? "open" : ""}
      />
    </button>
  );

  // Probation confirm / extend state
  const [confirmProbationTarget, setConfirmProbationTarget] = useState(null);
  const [probationActionLoading, setProbationActionLoading] = useState(false);
  const [extendEmp, setExtendEmp] = useState(null);
  const [extendMonths, setExtendMonths] = useState(1);
  const [extendRemark, setExtendRemark] = useState("");
  const [extendErrors, setExtendErrors] = useState({});

  const validateExtraMonths = (raw) => {
    if (raw === "" || raw === null || raw === undefined) {
      return "Enter a valid value between 1 and 12.";
    }
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 12) {
      return "Enter a valid value between 1 and 12.";
    }
    return "";
  };

  const validateExtendRemark = (raw) => {
    if (!String(raw || "").trim()) {
      return "Reason for extension is required.";
    }
    return "";
  };

  const handleConfirmProbation = (emp) => {
    setConfirmProbationTarget(emp);
  };

  const handleConfirmProbationSubmit = async () => {
    if (!confirmProbationTarget || probationActionLoading) return;
    setProbationActionLoading(true);
    try {
      await confirmProbationEmployee(confirmProbationTarget._id);
      setConfirmProbationTarget(null);
      refetchEmployees();
    } catch (e) {
      alert(e?.response?.data?.message || "Could not mark employee as full-time");
    } finally {
      setProbationActionLoading(false);
    }
  };

  const handleExtendProbationSubmit = async () => {
    if (!extendEmp || probationActionLoading) return;
    const months = Number(extendMonths);
    const monthsError = validateExtraMonths(extendMonths);
    const remarkError = validateExtendRemark(extendRemark);
    if (monthsError || remarkError) {
      setExtendErrors({
        ...(monthsError ? { extendMonths: monthsError } : {}),
        ...(remarkError ? { extendRemark: remarkError } : {}),
      });
      return;
    }
    setProbationActionLoading(true);
    try {
      await extendProbationEmployee(extendEmp._id, months, extendRemark.trim());
      setExtendEmp(null);
      setExtendMonths(1);
      setExtendRemark("");
      setExtendErrors({});
      refetchEmployees();
    } catch (e) {
      alert(e?.response?.data?.message || "Could not extend probation");
    } finally {
      setProbationActionLoading(false);
    }
  };

  const isExtendFormValid =
    !validateExtraMonths(extendMonths) && !validateExtendRemark(extendRemark);

  // Probation history (HR view of selected employee)
  const [showProbHist, setShowProbHist] = useState(false);
  const [probHistData, setProbHistData] = useState(null);
  const [probHistLoading, setProbHistLoading] = useState(false);
  const [probHistError, setProbHistError] = useState("");

  const openProbationHistory = async (emp) => {
    if (!emp) return;
    setShowProbHist(true);
    setProbHistLoading(true);
    setProbHistError("");
    try {
      const data = await getEmployeeProbationHistory(emp._id);
      setProbHistData(data);
    } catch (e) {
      setProbHistError(e?.response?.data?.message || "Could not load probation history");
    } finally {
      setProbHistLoading(false);
    }
  };

  // Convert consultant → employee modal state
  const [convertTarget, setConvertTarget] = useState(null);
  const [converting, setConverting] = useState(false);

  // Bug 265: reverse conversion (employee → consultant) modal state.
  const [convertBackTarget, setConvertBackTarget] = useState(null);
  const [convertBackPay, setConvertBackPay] = useState("");
  const [convertBackTds, setConvertBackTds] = useState("");
  const [convertBackErrors, setConvertBackErrors] = useState({});

  // Bug 268: each directory tab keeps independent filter state — reset search
  // and filters when switching tabs so stale values never leak across.
  const switchDirectoryType = (next) => {
    if (next === directoryType) return;
    setDirectoryType(next);
    setPage(1);
    setSearch("");
    setDepartmentFilter("");
    setStatusFilter("");
    setRoleFilter("");
    setSearchParams({}, { replace: true });
  };

  // Reload par URL ka ?status= bhi saaf karo (chipka filter na rahe).
  useEffect(() => {
    if (isPageReload) setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".action-dropdown-wrapper")) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let mounted = true;
    getRoles()
      .then((roles) => {
        if (mounted && Array.isArray(roles)) {
          const selectable = roles.filter((role) => !role.isAdmin);
          if (selectable.length) setAvailableRoles(selectable);
        }
      })
      .catch(() => {
        /* fall back to default role options */
      });
    return () => {
      mounted = false;
    };
  }, []);

  const [
    showDocumentsModal,
    setShowDocumentsModal,
  ] = useState(false);

  const [
    selectedEmployeeForDocs,
    setSelectedEmployeeForDocs,
  ] = useState(null);

  const { data: empDocsRes } = useEmployeeDocuments(
    selectedEmployeeForDocs?._id,
    {},
    { enabled: !!selectedEmployeeForDocs?._id && showDocumentsModal }
  );
  const employeeDocuments = empDocsRes?.data?.documents || [];
  const uploadDocMutation = useUploadEmployeeDocument();

  const [
    documentType,
    setDocumentType,
  ] = useState("AADHAAR");

  const [
    documentFile,
    setDocumentFile,
  ] = useState(null);

  const [docPreviewUrl, setDocPreviewUrl] = useState(null);


  const [selectedEmployee, setSelectedEmployee] =
    useState(null);

  const [originalDepartmentId, setOriginalDepartmentId] =
    useState("");

  const [isEditing, setIsEditing] =
    useState(false);

  const [enableLoginOnUpdate, setEnableLoginOnUpdate] =
    useState(false);

  const [loginCredentials, setLoginCredentials] =
    useState(null);

  const [sendingCreds, setSendingCreds] = useState(false);

  const [copiedKey, setCopiedKey] = useState(null);

  const [showAddModal, setShowAddModal] =
    useState(false);

  const initialSalaryDraft = { wageType: "MONTHLY", ctcAnnual: 0, dailyWage: 0, components: [] };
  const [salaryDraft, setSalaryDraft] = useState(initialSalaryDraft);

  const [showUploadModal, setShowUploadModal] =
    useState(false);

  const [
    showLetterModal,
    setShowLetterModal,
  ] = useState(false);

  const [letterData, setLetterData] =
    useState({
      employeeId: "",
      employeeName: "",
      designation: "",
      joiningDate: "",
      annualCTC: "",
      monthlySalary: "",
      workLocation: "Gurgaon",
      salaryComponents: [],
      structureName: "",
    });

  const [letterEmployeeId, setLetterEmployeeId] = useState(null);
  const [letterStructureLoading, setLetterStructureLoading] = useState(false);

  const [
    showWarningModal,
    setShowWarningModal,
  ] = useState(false);

  const [warningData, setWarningData] =
    useState({
      employeeId: "",
      employeeName: "",
      employeeCode: "",
      designation: "",
      department: "",
      incidentDate: "",
      reason: "",
      severity: "First",
      actionTaken: "",
      responsePeriod: "5",
    });

  const [
    showTerminationModal,
    setShowTerminationModal,
  ] = useState(false);

  const [terminationData, setTerminationData] =
    useState({
      employeeId: "",
      employeeName: "",
      employeeCode: "",
      designation: "",
      department: "",
      terminationDate: "",
      reason: "",
      noticePeriod: "",
      workLocation: "",
      client: "",
      settlementDate: "",
      noticeClause: "7(B)",
      isExperienceLetterIssued: false,
      isRelievingLetterIssued: false,
      deleteEmployeeAccount: false,
      hrMail: "",
    });

  const salaryEditorRef = useRef(null);

  /* =========================
     FETCH EMPLOYEES (via useEmployees hook)
  ========================= */

  useEffect(() => {
    refetchEmployees();
  }, [departmentFilter, statusFilter, page, limit, search, directoryType, refetchEmployees]);

  useEffect(() => {
    if (!canViewConsultancy && directoryType === "consultancy") {
      setDirectoryType("employee");
      setPage(1);
    }
    if (isConsultancyOnly && directoryType === "employee") {
      setDirectoryType("consultancy");
      setPage(1);
    }
  }, [canViewConsultancy, isConsultancyOnly, directoryType]);

  useEffect(() => {
    setStatusFilter(urlStatus);
    setPage(1);
  }, [urlStatus]);

  useEffect(() => {
    setConsultancyRefreshKey((prev) => prev + 1);
  }, [employeeData]);

  /* =========================
     HANDLE INPUT CHANGE
  ========================= */

  const [errors, setErrors] = useState({});

  const scrollToFirstError = (errorMap) => {
    const firstKey = Object.keys(errorMap).find((key) => errorMap[key]);
    if (!firstKey) return;
    const el = document.getElementById(`emp-field-${firstKey}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus?.();
  };

  const validateEmployeeField = async (name, values) => {
    try {
      await employeeValidationSchema.validateAt(name, values, { abortEarly: true });
      setErrors((prev) => {
        if (!prev[name]) return prev;
        const next = { ...prev };
        delete next[name];
        return next;
      });
    } catch (err) {
      // Yup validateAt unknown path par hard throw karta hai
      // ("The schema does not contain the path: X"). Ye validation error
      // nahi hai, isliye field par dikhane ke bajaye ignore karo.
      if (err?.message?.includes('does not contain the path')) {
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

  const collectEmployeeFormErrors = async (values) => {
    try {
      await employeeValidationSchema.validate(values, { abortEarly: false });
      return {};
    } catch (err) {
      if (!err.inner) throw err;
      const newErrors = {};
      err.inner.forEach((e) => {
        newErrors[e.path] = e.message;
      });
      return newErrors;
    }
  };

  const hasFormErrors = Object.values(errors).some(Boolean);

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;

    const finalValue =
      name === "ifscCode" || name === "panNumber"
        ? value.toUpperCase()
        : value;

    const nextForm = {
      ...form,
      [name]: type === "checkbox" ? checked : finalValue,
    };
    setForm(nextForm);
    validateEmployeeField(
      name,
      buildEmployeePayload(nextForm, { createAppLogin: nextForm.createAppLogin })
    );
  };

  const handleEditFieldChange = (e) => {
    const { name, type, checked, value } = e.target;
    const finalValue =
      name === "ifscCode" || name === "panNumber"
        ? value.toUpperCase()
        : value;

    const nextEmployee = {
      ...selectedEmployee,
      [name]: type === "checkbox" ? checked : finalValue,
    };
    setSelectedEmployee(nextEmployee);
    validateEmployeeField(
      name,
      buildEmployeePayload(nextEmployee, { createAppLogin: enableLoginOnUpdate })
    );
  };

  // Contact (email/phone) copy — inline tick feedback, no alert popup
  const handleCopyContact = async (empId, field, value) => {
    if (!value) return;
    const key = `${empId}-${field}`;
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
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 1500);
    } catch (error) {
      console.error("Copy failed", error);
    }
  };

  /* =========================
     ADD EMPLOYEE
  ========================= */

  const showLoginCredentials = (employeeName, loginInfo, employeeId) => {
    if (!loginInfo) return;

    setLoginCredentials({
      employeeId: employeeId || loginInfo.employeeId || null,
      employeeName,
      email: loginInfo.email,
      role: loginInfo.role,
      temporaryPassword: loginInfo.temporaryPassword,
      organizationCode: loginInfo.organizationCode,
      linkedExisting: Boolean(loginInfo.linkedExisting),
      phone: loginInfo.phone,
    });
  };

  // Resend credentials — no modal. Email hai to mail chala jayega,
  // sirf phone hai to direct Excel download ho jayega.
  const handleResendCredentials = async (employeeId, employeeName) => {
    if (!employeeId || sendingCreds) return;
    setSendingCreds(true);
    try {
      const res = await resendCredentialsMutation.mutateAsync(employeeId);
      const data = res.data || {};
      if (!data.emailSent && data.loginInfo?.temporaryPassword) {
        downloadCredentialExcel({
          employeeName: employeeName || data.loginInfo.name,
          email: data.loginInfo.email,
          phone: data.loginInfo.phone,
          role: data.loginInfo.role,
          organizationCode: data.loginInfo.organizationCode,
          temporaryPassword: data.loginInfo.temporaryPassword,
        });
      }
      alert(data.message || "Credentials sent.");
    } catch (error) {
      alert(
        error.response?.data?.message || "Failed to send credentials"
      );
    } finally {
      setSendingCreds(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (
      form.createAppLogin &&
      !form.email?.trim() &&
      !form.phone?.trim()
    ) {
      alert("Please enter either an email or a phone number.");
      return;
    }

    try {
      const payload = buildEmployeePayload(form, {
        createAppLogin: form.createAppLogin,
      });

      const formErrors = await collectEmployeeFormErrors(payload);
      if (Object.keys(formErrors).length) {
        setErrors(formErrors);
        scrollToFirstError(formErrors);
        return;
      }

      if (hasSalaryData(salaryDraft)) {
        const structureErrors = validateStructureDraft(salaryDraft);
        if (structureErrors.length) {
          setErrors({
            salaryStructure: structureErrors.join("; "),
          });
          alert(structureErrors.join("; "));
          setSubmitting(false)
          return;
        }
        // Manual component entry must add up to CTC / daily wage when no template used
        if (!salaryDraft.structureId) {
          const draftWt = String(salaryDraft.wageType || "").toUpperCase();
          const matchError =
            draftWt === "CALENDAR_DAILY"
              ? validateComponentsMatchCalendarDaily(salaryDraft)
              : draftWt === "DAILY" || (Number(salaryDraft.dailyWage) > 0 && draftWt !== "MONTHLY")
                ? validateComponentsMatchDailyWage(salaryDraft)
                : validateComponentsMatchCtc(salaryDraft);
          if (matchError) {
            setErrors({ salaryStructure: matchError });
            alert(matchError);
            setErrors({});
            setSubmitting(false)
            return;
          }
        }
      }

      setErrors({});
      setSubmitting(true);
      const res = await addMutation.mutateAsync(payload);
      const data = res.data;
      const newEmployeeId = data.employee?._id;

      if (newEmployeeId && hasSalaryData(salaryDraft)) {
        try {
          const draftWt = String(salaryDraft.wageType || "").toUpperCase();
          let structurePayload;
          if (draftWt === "CALENDAR_DAILY") {
            structurePayload = {
              wageType: "CALENDAR_DAILY",
              dailyWage: Number(salaryDraft.dailyWage) || 0,
              monthlyGross: salaryDraft.components
                ?.filter((c) => c.category === "Earning")
                .reduce((s, c) => s + (Number(c.monthlyAmount) || 0), 0),
              structureId: salaryDraft.structureId,
              components: salaryDraft.components,
            };
          } else if (draftWt === "DAILY" || (Number(salaryDraft.dailyWage) > 0 && draftWt !== "MONTHLY")) {
            structurePayload = {
              wageType: "DAILY",
              dailyWage: Number(salaryDraft.dailyWage) || 0,
              components: salaryDraft.components,
            };
          } else {
            structurePayload = {
              wageType: "MONTHLY",
              ctcAnnual: Number(salaryDraft.ctcAnnual) || 0,
              components: salaryDraft.components,
            };
          }
          await saveEmployeeStructure(newEmployeeId, structurePayload);
        } catch (structureError) {
          alert(
            structureError.response?.data?.message ||
            "Employee was created but salary structure could not be saved. Edit the employee to set salary."
          );
        }
      }

      if (data.loginInfo) {
        showLoginCredentials(form.name, data.loginInfo, newEmployeeId);
      } else if (form.createAppLogin) {
        alert(
          data.message ||
          "Employee was saved but app login was not created. Check API URL in .env / src/config/api.js, ensure backend is running, and email is provided."
        );
      } else {
        alert(data.message || "Employee added successfully");
      }

      setForm(initialForm);
      setSalaryDraft(initialSalaryDraft);
      setShowAddModal(false);
      refetchEmployees();
    } catch (error) {
      console.error("Server/Network Error:", error);

      // Bug 253/267: surface duplicate email/phone/code on the field itself
      // instead of failing silently behind a generic alert.
      const serverData = error.response?.data || {};
      const serverMessage = serverData.message || "Failed to add employee";
      const field = serverData.field;
      setSubmitting(false)
      if (field) {
        const mapped = { [field]: serverMessage };
        setErrors(mapped);
        scrollToFirstError(mapped);
      } else if (/email/i.test(serverMessage)) {
        const mapped = { email: serverMessage };
        setErrors(mapped);
        scrollToFirstError(mapped);
      } else if (/phone/i.test(serverMessage)) {
        const mapped = { phone: serverMessage };
        setErrors(mapped);
        scrollToFirstError(mapped);
      } else if (/code/i.test(serverMessage)) {
        const mapped = { employeeCode: serverMessage };
        setErrors(mapped);
        scrollToFirstError(mapped);
      } else {
        setErrors({});
      }
      alert(serverMessage);
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================
     BULK UPLOAD
  ========================= */

  // Sample template. Row 1 is a title (the importer skips it, range:1),
  // row 2 is the header, rows 3+ are examples — matching the parser exactly.
  const handleDownloadTemplate = () => {
    const rows = [
      ["Employee Bulk Upload Template — keep this row; enter employees below the headers. Only Name is required."],
      [
        // Basic & Organization Details
        "EmployeeCode", "Name", "Email", "Phone", "Designation", `${name}Id / Name`, "Client", "workLocation",

        // Personal & Contact Details
        "DOB", "DOJ", "Date Of Exit", "Gender", "Father/Husband Name", "Relation", "Nationality", "Marital Status",
        "Permanent Address", "Blood Group", "Emergency Contact", "Highest Qualification",

        // Statutory & Govt IDs
        "Aadhaar Number", "Name as on Aadhaar", "PAN Number", "Name as on PAN", "UAN", "ESIC No", "PF Number",

        // Bank Details
        "Bank Name", "Bank Account Number", "Bank IFSC", "Name as per Bank details",

        // CTC Keys
        "CTC", "CTC Structure / Template Name"
      ],
      [
        // Sample Data Row
        "EMP001", "Ravi Kumar", "ravi.kumar@example.com", "9876543210", "Field Executive", "Copy_the_" + name + "_ID_OR_Name", "Client_Name", "Delhi",

        "1995-08-20", "2026-01-15", "2027-01-15", "Male", "Suresh Kumar", "Father", "Indian", "Married",
        "H.No 123, Sector 15, Gurgaon, Haryana", "O+", "9876543211", "Graduate",

        "123456789012", "Ravi Kumar", "ABCDE1234F", "Ravi Kumar", "100200300400", "1234567890", "PF12345",

        "State Bank of India", "98765432101234", "SBIN0001234", "Ravi Kumar",

        "360000", "Standard_Sales_Structure"
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // 32 Columns Width Configuration (har column header aur data length ke mutabiq)
    ws["!cols"] = [
      // 1-9: Basic & Org Details
      { wch: 15 }, // EmployeeCode
      { wch: 20 }, // Name
      { wch: 25 }, // Email
      { wch: 15 }, // Phone
      { wch: 18 }, // Designation
      { wch: 25 }, // departmentId
      { wch: 15 }, // Client

      // 10-21: Personal & Contact Details
      { wch: 12 }, // DOB
      { wch: 12 }, // DOJ
      { wch: 14 }, // Date Of Exit
      { wch: 10 }, // Gender
      { wch: 22 }, // Father/Husband Name
      { wch: 12 }, // Relation
      { wch: 12 }, // Nationality
      { wch: 14 }, // Marital Status
      { wch: 35 }, // Permanent Address
      { wch: 12 }, // Blood Group
      { wch: 18 }, // Emergency Contact
      { wch: 22 }, // Highest Qualification

      // 22-28: Statutory & Govt IDs
      { wch: 18 }, // Aadhaar Number
      { wch: 20 }, // Name as on Aadhaar
      { wch: 14 }, // PAN Number
      { wch: 18 }, // Name as on PAN
      { wch: 16 }, // UAN
      { wch: 14 }, // ESIC No
      { wch: 14 }, // PF Number

      // 29-30: Bank Details
      { wch: 22 }, // Bank Name
      { wch: 20 }, // Bank Account Number
      { wch: 14 }, // Bank IFSC
      { wch: 22 }, // Name as per Bank details

      // 31-32: CTC Keys
      { wch: 12 }, // CTC
      { wch: 30 }  // CTC Structure / Template Name
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, "employee-bulk-upload-template.xlsx");
  };

  const handleBulkUpload = async () => {
    if (!uploadFile) {
      alert("Please select an Excel file");
      return;
    }

    // Clear old message before new upload
    setUploadMessage("");

    try {
      setLoading(true);

      const res = await bulkUploadMutation.mutateAsync(uploadFile);

      const errorList = res.data.errors || [];

      let message =
        `Upload Complete: ${res.data.inserted} inserted, ${res.data.skipped} skipped`;

      if (errorList.length > 0) {
        message +=
          "\n\nErrors:\n" +
          errorList.join("\n");
      }

      // Show result in modal
      setUploadMessage(message);

      // Clear selected file
      setUploadFile(null);

      // Refresh table
      refetchEmployees();

      // ❌ do not close the modal
      // setShowUploadModal(false);

    } catch (error) {
      setUploadMessage(
        error.response?.data?.message ||
        "Bulk upload failed"
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     VIEW EMPLOYEE
  ========================= */

  const handleView = (emp) => {
    setSelectedEmployee(emp);
    setIsEditing(false);
  };

  /* =========================
     EDIT EMPLOYEE
  ========================= */

  const normalizeEmployeeForForm = (emp) => ({
    ...emp,
    departmentId: emp.departmentId || emp.department || "",
    departmentName: emp.departmentName || "",
    managerId: emp.managerId?._id || emp.managerId || "",
    peopleManagerId: emp.peopleManagerId?._id || emp.peopleManagerId || "",
    dob: emp.dob ? emp.dob.split("T")[0] : "",
    dateOfJoining:
      emp.dateOfJoining
        ? emp.dateOfJoining.split("T")[0]
        : "",
    relievingDate:
      emp.relievingDate
        ? emp.relievingDate.split("T")[0]
        : "",
    employmentStatus: emp.employmentStatus || "probation",
    probationStartDate: emp.probationStartDate ? emp.probationStartDate.split("T")[0] : "",
    probationEndDate: emp.probationEndDate ? emp.probationEndDate.split("T")[0] : "",
    confirmationDate: emp.confirmationDate ? emp.confirmationDate.split("T")[0] : "",
    basicSalary: emp.basicSalary ?? "",
    hra: emp.hra ?? "",
    conveyanceAllowance: emp.conveyanceAllowance ?? "",
    incentive: emp.incentive ?? "",
    otherAllowance: emp.otherAllowance ?? "",
    professionalTax: emp.professionalTax ?? "",
    location: emp.location || "",
    client: emp.client || emp.clientName || "",
    siteCode: emp.siteCode || "",
    pfNumber: emp.pfNumber || "",
    accountNumber: emp.accountNumber || "",
    accountHolderName: emp.accountHolderName || "",
    ifscCode: emp.ifscCode || "",
    bankName: emp.bankName || "",
    state: emp.state || "",
    country: emp.country || "",
    city: emp.city || "",
    emergencyContact: emp.emergencyContact || "",
    gender: emp.gender || "",
    fatherHusbandName: emp.fatherHusbandName || emp.fatherName || "",
    relationWithMember: emp.relationWithMember || emp.relation || "",
    nationality: emp.nationality || "",
    maritalStatus: emp.maritalStatus || "",
    permanentAddress: emp.permanentAddress || emp.address || "",
    aadhaarNumber: emp.aadhaarNumber || "",
    nameAsPerAadhaar: emp.nameAsPerAadhaar || "",
    panNumber: emp.panNumber || "",
    nameAsPerPan: emp.nameAsPerPan || "",
    highestQualification: emp.highestQualification || "",
    uan: emp.uan || "",
    esicNumber: emp.esicNumber || "",
    userRole: emp.linkedUser?.role || emp.userRole || "Employee",
    payType: emp.payType || "MONTHLY",
    isConsultancy: Boolean(emp.isConsultancy),
    monthlyConsultancyPay: emp.monthlyConsultancyPay ?? "",
    tdsPercent: emp.tdsPercent ?? "",
    allowedModules: defaultSelectedModules(
      emp.linkedUser?.role || emp.userRole || "Employee",
      emp.linkedUser?.allowedModules
    ),
  });

  const handleEdit = (emp) => {
    setErrors({});
    setOriginalDepartmentId(String(emp.departmentId || emp.department || ""));
    setSelectedEmployee(normalizeEmployeeForForm(emp));

    setEnableLoginOnUpdate(false);
    setIsEditing(true);
  };

  const handleUpdate = async () => {
    if (submitting) return;
    try {
      if (
        enableLoginOnUpdate &&
        !selectedEmployee.email?.trim() &&
        !selectedEmployee.phone?.trim()
      ) {
        alert("Please enter either an email or a phone number to enable app login.");
        return;
      }
      const payload = buildEmployeePayload(selectedEmployee, {
        // Only create a new login when the user explicitly enabled it.
        // Normal edits of employees that already had login used to return loginInfo
        // again, which reopened the "App Login Details" modal every time.
        createAppLogin: enableLoginOnUpdate,
      });

      // When login is already enabled, send role/modules/password explicitly for sync
      // so the backend updates without triggering the loginInfo modal.
      if (selectedEmployee.hasAppLogin && !enableLoginOnUpdate) {
        if (selectedEmployee.userRole) {
          payload.userRole = selectedEmployee.userRole;
        }
        if (selectedEmployee.userPassword?.trim()) {
          payload.userPassword = selectedEmployee.userPassword.trim();
        }
      }

      const formErrors = await collectEmployeeFormErrors(payload);
      if (Object.keys(formErrors).length) {
        setErrors(formErrors);
        scrollToFirstError(formErrors);
        return;
      }

      // Manually entered salary components must add up to the Annual CTC before
      // the employee (and their salary structure) can be saved.
      const salaryMatchError = salaryEditorRef.current?.validateStructure?.();
      if (salaryMatchError) {
        alert(salaryMatchError);
        return;
      }

      setErrors({});
      setSubmitting(true);

      const res = await updateMutation.mutateAsync({
        id: selectedEmployee._id,
        data: payload,
      });

      if (salaryEditorRef.current?.hasUnsavedChanges) {
        try {
          await salaryEditorRef.current.saveStructure();
        } catch (salaryErr) {
          alert(
            salaryErr.response?.data?.message ||
            "Employee updated but salary structure could not be saved."
          );
        }
      }

      // Show the modal only when a new login was created or the password was reset.
      // Plain edits don't return loginInfo from the backend / created+password stays empty.
      if (res.data?.loginInfo?.created || res.data?.loginInfo?.temporaryPassword) {
        showLoginCredentials(
          selectedEmployee.name,
          res.data.loginInfo,
          selectedEmployee._id
        );
      } else if (enableLoginOnUpdate) {
        alert(
          res.data?.message ||
          "Employee updated but app login was not created. Add email and try again."
        );
      } else {
        alert(res.data?.message || "Employee updated successfully");
      }

      setSelectedEmployee(null);
      setIsEditing(false);
      setEnableLoginOnUpdate(false);

      refetchEmployees();
    } catch (error) {
      console.error("Server/Network Error:", error);

      const serverData = error.response?.data || {};
      const serverMessage = serverData.message || "Failed to update employee";
      const field = serverData.field;
      if (field) {
        const mapped = { [field]: serverMessage };
        setErrors(mapped);
        scrollToFirstError(mapped);
      } else {
        setErrors({});
      }
      alert(serverMessage);
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================
     CONVERT CONSULTANCY → EMPLOYEE (via info modal + dedicated API)
  ========================= */

  const handleConfirmConvertToEmployee = async () => {
    if (!convertTarget) return;
    setConverting(true);
    try {
      const res = await convertToEmployeeMutation.mutateAsync(convertTarget._id);
      alert(res.data?.message || `${convertTarget.name} is now an Employee.`);
      setConvertTarget(null);
      refetchEmployees();
    } catch (error) {
      alert(
        error.response?.data?.message ||
        "Conversion failed"
      );
    } finally {
      setConverting(false);
    }
  };

  const openConvertBackModal = (emp) => {
    setOpenDropdownId(null);
    setConvertBackTarget(emp);
    setConvertBackPay(emp.monthlyConsultancyPay || "");
    setConvertBackTds(emp.tdsPercent ?? "");
    setConvertBackErrors({});
  };

  const handleConfirmConvertToConsultant = async () => {
    if (!convertBackTarget || converting) return;
    // Inline field-level validation (same rules as Add/Edit Consultant).
    const fieldErrors = {};
    const pay = Number(convertBackPay);
    if (convertBackPay === "" || !Number.isFinite(pay) || pay <= 0) {
      fieldErrors.convertBackPay = "Monthly Consultancy Pay must be greater than ₹0.";
    }
    const tds = convertBackTds === "" ? 0 : Number(convertBackTds);
    if (convertBackTds !== "" && (!Number.isFinite(tds) || tds < 0 || tds > 100)) {
      fieldErrors.convertBackTds = "TDS must be between 0% and 100%.";
    }
    setConvertBackErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) return;
    setConverting(true);
    try {
      const res = await convertToConsultant(convertBackTarget._id, {
        monthlyConsultancyPay: pay,
        tdsPercent: tds,
      });
      alert(res.data?.message || `${convertBackTarget.name} is now a Consultant.`);
      setConvertBackTarget(null);
      setConvertBackPay("");
      setConvertBackTds("");
      setConvertBackErrors({});
      refetchEmployees();
    } catch (error) {
      const serverData = error.response?.data || {};
      const serverMessage = serverData.message || "Conversion failed";
      // Map backend field errors onto the matching input.
      if (serverData.field === "monthlyConsultancyPay") {
        setConvertBackErrors({ convertBackPay: serverMessage });
      } else if (serverData.field === "tdsPercent") {
        setConvertBackErrors({ convertBackTds: serverMessage });
      }
      alert(serverMessage);
    } finally {
      setConverting(false);
    }
  };

  /* =========================
     DELETE EMPLOYEE
  ========================= */

  const handleDelete = async (id) => {
    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this employee? This is a soft delete — their details will be archived and hidden from default views."
      );

    if (!confirmDelete) return;

    try {
      await deleteMutation.mutateAsync(id);

      alert("Employee soft deleted successfully. Their details are archived.");

      if (employees.length <= 1 && page > 1) {
        setPage(page - 1);
      } else {
        refetchEmployees();
      }
    } catch (error) {
      alert(
        error.response?.data
          ?.message ||
        "Delete failed"
      );
    }
  };

  /* =====================================
     Toggle App Login Access (Enable / Disable)
  ======================================== */

  const handleToggleAppLogin = async (emp) => {
    const enable = !emp.hasLoginEnabled;
    const confirmToggle = window.confirm(
      enable
        ? `Enable app login for ${emp.name}? They will be able to log in again.`
        : `Disable app login for ${emp.name}? They will not be able to log in until re-enabled.`
    );

    if (!confirmToggle) return;

    try {
      await toggleAppLoginMutation.mutateAsync({ id: emp._id, enable });
      alert(enable ? "App login enabled." : "App login disabled.");
      refetchEmployees();
    } catch (error) {
      alert(
        error.response?.data?.message ||
        "Failed to update app login access"
      );
    }
  };

  /* =====================================
     Generate Employee Appointment letter
  ======================================== */

  const patchLetterData = (patch) => {
    setLetterData((prev) => ({ ...prev, ...patch }));
  };


  const handleGenerateLetter =
    async () => {
      const monthlyGross = sumLetterMonthlyGross(letterData.salaryComponents);

      if (
        !letterData.employeeName ||
        !letterData.designation ||
        !letterData.joiningDate ||
        !letterData.annualCTC ||
        !monthlyGross ||
        !letterData.workLocation ||
        !letterData.salaryComponents?.length
      ) {
        alert(
          "Please fill all mandatory fields and apply a CTC split or enter salary components"
        );
        return;
      }

      if (!letterData.structureName) {
        alert("Cannot generate appointment letter: This employee does not have an active salary structure. Please create a salary structure for this employee first.");
        return;
      }

      try {
        setLoading(true);
        await generateAppointmentLetter({
          ...letterData,
          monthlySalary: monthlyGross,
          salaryComponents: (letterData.salaryComponents || []).map((c) => ({
            code: c.code,
            componentName: c.componentName || c.name,
            monthly: c.monthly !== "" && c.monthly != null ? c.monthly : Math.round((Number(c.annual) || 0) / 12),
            annual: c.annual !== "" && c.annual != null ? c.annual : (Number(c.monthly) || 0) * 12,
          })),
        });

        alert(
          "Appointment Letter Generated Successfully"
        );

        setShowLetterModal(false);

      } catch (error) {
        alert(
          error.response?.data
            ?.message ||
          "Generation failed"
        );
      } finally {
        setLoading(false);
      }
    };

  /* =========================
       GENERATE WARNING LETTER
     ========================= */

  const handleGenerateWarning =
    async () => {
      if (
        !warningData.employeeName ||
        !warningData.designation ||
        !warningData.incidentDate ||
        !warningData.reason?.trim()
      ) {
        alert(
          "Please fill all mandatory fields (employee, designation, incident date, and reason)"
        );
        return;
      }

      try {
        setLoading(true);
        await generateWarningLetter({
          employeeId: warningData.employeeId,
          employeeName: warningData.employeeName,
          employeeCode: warningData.employeeCode,
          designation: warningData.designation,
          department: warningData.department,
          incidentDate: warningData.incidentDate,
          reason: warningData.reason,
          severity: warningData.severity,
          actionTaken: warningData.actionTaken,
          responsePeriod: warningData.responsePeriod,
        });

        alert(
          "Warning Letter Generated Successfully"
        );

        setShowWarningModal(false);

      } catch (error) {
        alert(
          error.response?.data
            ?.message ||
          "Generation failed"
        );
      } finally {
        setLoading(false);
      }
    };

  /* =========================
       GENERATE TERMINATION LETTER
     ========================= */

  /* =========================
       TERMINATION FLOW
  ========================= */

  const formatDayAfterDate = (dateStr) => {
    if (!dateStr) return "Not scheduled";
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleGenerateTermination =
    async () => {
      const missingFields = [];
      if (!terminationData.employeeId) missingFields.push("Employee");
      if (!terminationData.designation) missingFields.push("Designation");
      if (!terminationData.terminationDate) missingFields.push("Termination date");
      if (!terminationData.reason?.trim()) missingFields.push("Reason");

      if (missingFields.length > 0) {
        alert(`Please fill mandatory fields: ${missingFields.join(", ")}`);
        return;
      }

      const confirmGenerate = window.confirm(
        `Are you sure you want to terminate ${terminationData.employeeName} effective ${terminationData.terminationDate}? The Termination Letter will be generated immediately, and the exit process (experience/relieving letters + F&F) will follow automatically.`
      );

      if (!confirmGenerate) return;

      try {
        setLoading(true);

        await createTermination({
          employeeId: terminationData.employeeId,
          employeeName: terminationData.employeeName,
          employeeCode: terminationData.employeeCode,
          designation: terminationData.designation,
          department: terminationData.department,
          terminationDate: terminationData.terminationDate,
          reason: terminationData.reason,
          noticePeriod: terminationData.noticePeriod,
          workLocation: terminationData.workLocation,
          client: terminationData.client,
          settlementDate: terminationData.settlementDate,
          noticeClause: terminationData.noticeClause,
          isExperienceLetterIssued: terminationData.isExperienceLetterIssued,
          isRelievingLetterIssued: terminationData.isRelievingLetterIssued,
          deleteEmployeeAccount: terminationData.deleteEmployeeAccount,
          hrMail: terminationData.hrMail,
          generateAndSend: true,
        });

        alert(
          "Termination recorded and letter generated successfully. Exit process will follow automatically."
        );

        setShowTerminationModal(false);
        refetchEmployees();

      } catch (error) {
        alert(
          error.response?.data
            ?.message ||
          "Generation failed"
        );
      } finally {
        setLoading(false);
      }
    };

  const handleSaveTermination =
    async () => {
      const missingFields = [];
      if (!terminationData.employeeId) missingFields.push("Employee");
      if (!terminationData.terminationDate) missingFields.push("Termination date");
      if (!terminationData.reason?.trim()) missingFields.push("Reason");

      if (missingFields.length > 0) {
        alert(`Please fill mandatory fields: ${missingFields.join(", ")}`);
        return;
      }

      const confirmSave = window.confirm(
        `Save termination details for ${terminationData.employeeName} without generating the letter yet? You can generate it later.`
      );

      if (!confirmSave) return;

      try {
        setLoading(true);

        await createTermination({
          employeeId: terminationData.employeeId,
          employeeName: terminationData.employeeName,
          employeeCode: terminationData.employeeCode,
          designation: terminationData.designation,
          department: terminationData.department,
          terminationDate: terminationData.terminationDate,
          reason: terminationData.reason,
          noticePeriod: terminationData.noticePeriod,
          workLocation: terminationData.workLocation,
          client: terminationData.client,
          settlementDate: terminationData.settlementDate,
          noticeClause: terminationData.noticeClause,
          isExperienceLetterIssued: terminationData.isExperienceLetterIssued,
          isRelievingLetterIssued: terminationData.isRelievingLetterIssued,
          deleteEmployeeAccount: terminationData.deleteEmployeeAccount,
          hrMail: terminationData.hrMail,
          generateAndSend: false,
        });

        alert(
          "Termination details saved. Click Generate & Send when ready to start the exit process."
        );

        setShowTerminationModal(false);
        refetchEmployees();

      } catch (error) {
        alert(
          error.response?.data
            ?.message ||
          "Failed to save termination"
        );
      } finally {
        setLoading(false);
      }
    };

  /* =========================
       FILTER EMPLOYEES
     ========================= */

  const filteredEmployees = employees;

  const handleUploadDocument =
    async () => {

      if (!documentFile) {
        alert(
          "Please select file"
        );
        return;
      }

      if (!isAllowedFile(documentType, documentFile.name)) {
        alert(
          `Invalid file for ${docTypeLabel(documentType)}. Allowed: ${DOC_TYPE_ACCEPT[
            documentType
          ].join(", ")}`
        );
        return;
      }

      try {

        const formData =
          new FormData();

        formData.append(
          "file",
          documentFile
        );

        formData.append(
          "employeeId",
          selectedEmployeeForDocs._id
        );

        formData.append(
          "documentType",
          documentType
        );

        await uploadDocMutation.mutateAsync(formData);

        alert(
          "Document uploaded successfully"
        );

        setDocumentFile(null);

      } catch (error) {

        alert(
          "Upload failed"
        );
      }
    };

  return (
    <MainLayout>
      <div className="employee-page">

        <div className="employee-directory-tabs" role="tablist" aria-label="People directory">
          {canViewEmployees ? (
            <button type="button" className={`employee-directory-tab ${directoryType === "employee" ? "active" : ""}`} onClick={() => switchDirectoryType("employee")}>
              Employees
              {directoryType === "employee" ? <span className="employee-directory-tab__badge">{pagination?.total || 0}</span> : null}
            </button>
          ) : null}
          {canViewConsultancy ? (
            <button type="button" className={`employee-directory-tab ${directoryType === "consultancy" ? "active" : ""}`} onClick={() => switchDirectoryType("consultancy")}>
              Consultancy
              {directoryType === "consultancy" ? <span className="employee-directory-tab__badge">{pagination?.total || 0}</span> : null}
            </button>
          ) : null}
        </div>

        {/* <p className="employee-page__count">
          Total {directoryType === "consultancy" ? "consultants" : "employees"}: <strong>{pagination?.total || 0}</strong>
        </p> */}

        <div className="employee-toolbar">

          {/* SEARCH */}
          <div className="search-wrapper">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* ACTION BUTTONS */}
          <div className="toolbar-actions">

            <div className="employee-filter">
              <select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">
                  {isSiteVendor() ? "All Sites" : "All Departments"}
                </option>

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
                  setSearchParams(
                    (prev) => {
                      const next = new URLSearchParams(prev);
                      if (e.target.value) next.set("status", e.target.value);
                      else next.delete("status");
                      return next;
                    },
                    { replace: true }
                  );
                }}
              >
                <option value="">All Employees</option>
                <option value="active">Active Employees</option>
                <option value="probation">Probation Employees</option>
                <option value="expiring-soon">Probation Expiring Soon (30 days)</option>
                <option value="full-time">Full-time Employees</option>
                <option value="inactive">Inactive Employees</option>
                <option value="exited">Exited Employees</option>
                <option value="deleted">Deleted Employees</option>
              </select>
            </div>

            <div className="employee-filter">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="Filter by role"
              >
                <option value="">All Roles</option>
                {roleFilterOptions.map((roleName) => (
                  <option key={roleName} value={roleName}>
                    {roleName}
                  </option>
                ))}
              </select>
            </div>

            {directoryType === "employee" && canManage && (
              <Button
                variant="secondary"
                icon={<Upload size={18} />}
                onClick={() => {
                  setShowUploadModal(true)
                  setUploadMessage("")
                  setUploadFile(null)
                }}
              >
                Bulk Upload
              </Button>
            )}

            {(directoryType === "employee" ? canManage : canManageConsultancy) && (
              <Button
                icon={<Plus size={18} />}
                onClick={() => {
                  setForm({ ...initialForm, isConsultancy: directoryType === "consultancy" });
                  setSalaryDraft(initialSalaryDraft);
                  setErrors({});
                  setShowAddModal(true);
                }}
              >
                Add {directoryType === "consultancy" ? "Consultant" : "Employee"}
              </Button>
            )}
          </div>
        </div>

        {directoryType === "consultancy" ? <ConsultancyPayments refreshKey={consultancyRefreshKey} search={search} departmentFilter={departmentFilter} employeeStatusFilter={statusFilter} canManage={canManageConsultancy} /> : null}

        <div className="employee-table-card">
          <div className="employee-table-scroll">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Designation</th>
                  <th>{name} name</th>
                  <th>Reporting Manager</th>
                  <th>State name</th>
                  <th>App Login</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((emp) => (
                    <tr key={emp._id}>
                      <td>{emp.employeeCode}</td>

                      <td title={emp.name}>{emp.name}</td>

                      <td>
                        <div className="emp-contact-cell">
                          <div
                            className="emp-contact-line"
                            title={emp.email || ""}
                          >
                            <span className="emp-contact-text">
                              {emp.email || "-"}
                            </span>
                            {emp.email ? (
                              <button
                                type="button"
                                className="emp-copy-btn"
                                title="Copy email"
                                onClick={() =>
                                  handleCopyContact(emp._id, "email", emp.email)
                                }
                              >
                                {copiedKey === `${emp._id}-email` ? (
                                  <Check size={12} />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            ) : null}
                          </div>
                          <div
                            className="emp-contact-line emp-contact-line--phone"
                            title={emp.phone || ""}
                          >
                            <span className="emp-contact-text">
                              {emp.phone || "-"}
                            </span>
                            {emp.phone ? (
                              <button
                                type="button"
                                className="emp-copy-btn"
                                title="Copy phone"
                                onClick={() =>
                                  handleCopyContact(emp._id, "phone", emp.phone)
                                }
                              >
                                {copiedKey === `${emp._id}-phone` ? (
                                  <Check size={12} />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td title={emp.designation}>
                        {emp.designation || "-"}
                      </td>

                      <td title={emp.department}>
                        <span className="emp-truncate emp-truncate--dept">
                          {emp.department || "-"}
                        </span>
                      </td>

                      <td title={emp.managerId?.name}>
                        <span className="emp-truncate emp-truncate--manager">
                          {emp.managerId?.name || "-"}
                        </span>
                      </td>

                      <td title={emp.stateName}>
                        <span className="emp-truncate emp-truncate--state">
                          {emp.stateName || "-"}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`login-chip ${emp.hasAppLogin
                            ? emp.hasLoginEnabled
                              ? "login-chip--on"
                              : "login-chip--off"
                            : "login-chip--none"
                            }`}
                          title={
                            emp.hasAppLogin
                              ? emp.hasLoginEnabled
                                ? "App login enabled"
                                : "App login disabled"
                              : "No app login"
                          }
                        >
                          {emp.hasAppLogin
                            ? emp.hasLoginEnabled
                              ? "Enabled"
                              : "Disabled"
                            : "No login"}
                        </span>
                      </td>

                      <td>
                        <div className="emp-status-cell">
                          <span
                            className={`status-badge ${emp.isDeleted
                              ? "deleted"
                              : emp.isExited
                                ? "exited"
                                : emp.isActive
                                  ? "active"
                                  : "inactive"
                              }`}
                          >
                            {emp.isDeleted
                              ? "Deleted"
                              : emp.isExited
                                ? "Exited"
                                : emp.isActive
                                  ? "Active"
                                  : "Inactive"}
                          </span>
                          {!emp.isDeleted && !emp.isExited && !emp.isConsultancy ? (
                            emp.employmentStatus === "probation" ? (
                              <>
                                <span className="status-badge probation" title={emp.probationEndDate ? `Probation till ${new Date(emp.probationEndDate).toLocaleDateString()}` : "On probation"}>
                                  Probation
                                  <button
                                    type="button"
                                    className="emp-info-btn"
                                    title="View probation history"
                                    aria-label={`View probation history of ${emp.name}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openProbationHistory(emp);
                                    }}
                                  >
                                    <Info size={12} />
                                  </button>
                                </span>
                                {emp.probationEndDate ? (
                                  <span className="emp-probation-date" title={`Probation ends ${new Date(emp.probationEndDate).toLocaleDateString()}`}>
                                    Ends {new Date(emp.probationEndDate).toLocaleDateString()}
                                  </span>
                                ) : (
                                  <span className="emp-probation-date emp-probation-date--none">End date —</span>
                                )}
                              </>
                            ) : (
                              <span className="status-badge full-time" title="Confirmed employee">
                                Full-time
                              </span>
                            )
                          ) : null}
                        </div>
                      </td>

                      <td>
                        <div className="action-dropdown-wrapper">
                          <button
                            className="emp-grid-btn dropdown-toggle"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (openDropdownId !== emp._id) {
                                setExpandedMenuSection("general");
                              }
                              setOpenDropdownId(
                                openDropdownId === emp._id ? null : emp._id
                              );
                            }}
                          >
                            <MoreVertical size={18} />
                          </button>

                          {openDropdownId === emp._id && (
                            <div className="action-dropdown-menu">
                              {renderMenuSectionToggle("general", "General")}
                              {expandedMenuSection === "general" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      handleView(emp);
                                    }}
                                  >
                                    <Eye size={16} /> View Profile
                                  </button>

                                  {(directoryType === "employee" ? canManage : canManageConsultancy) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenDropdownId(null);
                                        handleEdit(emp);
                                      }}
                                    >
                                      <Pencil size={16} /> Edit Details
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      setSelectedEmployeeForDocs(emp);
                                      setShowDocumentsModal(true);
                                    }}
                                  >
                                    <FolderOpen size={16} /> Documents
                                  </button>
                                </>
                              )}

                              {directoryType === "employee" && canManageProbation(user?.role) && !emp.isConsultancy && emp.employmentStatus === "probation" && !emp.isDeleted && !emp.isExited ? (
                                <>
                                  {renderMenuSectionToggle("probation", "Probation")}
                                  {expandedMenuSection === "probation" && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenDropdownId(null);
                                          handleConfirmProbation(emp);
                                        }}
                                      >
                                        <UserCheck size={16} /> Mark Full-time
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenDropdownId(null);
                                          setExtendEmp(emp);
                                          setExtendMonths(1);
                                          setExtendRemark("");
                                          setExtendErrors({});
                                        }}
                                      >
                                        <Clock size={16} /> Extend Probation
                                      </button>
                                    </>
                                  )}
                                </>
                              ) : null}

                              {canLetters && renderMenuSectionToggle("letters", "Letters")}

                              {canLetters && expandedMenuSection === "letters" && (
                                <button
                                  type="button"
                                  disabled={!emp.isActive}
                                  className={!emp.isActive ? "dropdown-item-disabled" : ""}
                                  onClick={async () => {
                                    if (!emp.isActive) return;
                                    setOpenDropdownId(null);
                                    setLetterEmployeeId(emp._id);
                                    setLetterStructureLoading(true);
                                    try {
                                      const structRes = await getEmployeeStructure(emp._id);
                                      const structData = structRes.data?.data;
                                      if (!structData || !structData._id) {
                                        alert("Cannot generate appointment letter: This employee does not have an active salary structure. Please create a salary structure for this employee first.");
                                        setLetterStructureLoading(false);
                                        return;
                                      }
                                      const structureName = structData.salaryStructure?.name || "";
                                      setLetterData({
                                        employeeId: emp._id,
                                        employeeName: emp.name || "",
                                        designation: emp.designation || "",
                                        joiningDate: emp.dateOfJoining?.split("T")[0] || "",
                                        annualCTC: structData.ctcAnnual || "",
                                        monthlySalary: structData.monthlyGross || "",
                                        workLocation: emp.location || "Gurgaon",
                                        structureName,
                                        salaryComponents: structData.components?.map((c) => ({
                                          code: c.code,
                                          componentName: c.name,
                                          name: c.name,
                                          category: c.category,
                                          monthly: c.monthlyAmount || 0,
                                          annual: (c.monthlyAmount || 0) * 12,
                                        })) || [],
                                      });
                                      setShowLetterModal(true);
                                    } catch (err) {
                                      alert("Failed to load employee salary structure. Please try again.");
                                    } finally {
                                      setLetterStructureLoading(false);
                                    }
                                  }}
                                >
                                  <FileText size={16} /> Appointment Letter
                                </button>
                              )}

                              {canLetters && expandedMenuSection === "letters" && (
                                <button
                                  type="button"
                                  disabled={!emp.isActive}
                                  className={!emp.isActive ? "dropdown-item-disabled" : ""}
                                  onClick={() => {
                                    if (!emp.isActive) return;
                                    setOpenDropdownId(null);
                                    setWarningData({
                                      employeeId: emp._id,
                                      employeeName: emp.name || "",
                                      employeeCode: emp.employeeCode || "",
                                      designation: emp.designation || "",
                                      department: emp.department || "",
                                      incidentDate: new Date().toISOString().split("T")[0],
                                      reason: "",
                                      severity: "First",
                                      actionTaken: "",
                                      responsePeriod: "5",
                                    });
                                    setShowWarningModal(true);
                                  }}
                                >
                                  <TriangleAlert size={16} /> Warning Letter
                                </button>
                              )}

                              {canLetters && expandedMenuSection === "letters" && (
                                <button
                                  type="button"
                                  disabled={!emp.isActive}
                                  className={!emp.isActive ? "dropdown-item-disabled" : ""}
                                  onClick={() => {
                                    if (!emp.isActive) return;
                                    setOpenDropdownId(null);
                                    setTerminationData({
                                      employeeId: emp._id,
                                      employeeName: emp.name || "",
                                      employeeCode: emp.employeeCode || "",
                                      designation: emp.designation || "",
                                      department: emp.department || "",
                                      terminationDate: new Date().toISOString().split("T")[0],
                                      reason: "",
                                      noticePeriod: "",
                                      workLocation: emp.location || "",
                                      client: emp.client || "",
                                      settlementDate: new Date().toISOString().split("T")[0],
                                      noticeClause: "7(B)",
                                      isExperienceLetterIssued: false,
                                      isRelievingLetterIssued: false,
                                      deleteEmployeeAccount: false,
                                      hrMail: "",
                                    });
                                    setShowTerminationModal(true);
                                  }}
                                >
                                  <OctagonX size={16} /> Termination Letter
                                </button>
                              )}

                              {(directoryType === "employee" ? canManage : canManageConsultancy) && emp.hasAppLogin && renderMenuSectionToggle("access", "Access")}

                              {(directoryType === "employee" ? canManage : canManageConsultancy) && emp.hasAppLogin && expandedMenuSection === "access" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      handleToggleAppLogin(emp);
                                    }}
                                  >
                                    {emp.hasLoginEnabled ? (
                                      <>
                                        <Lock size={16} /> Disable App Login
                                      </>
                                    ) : (
                                      <>
                                        <LockOpen size={16} /> Enable App Login
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      handleResendCredentials(emp._id, emp.name);
                                    }}
                                  >
                                    <Mail size={16} /> Send Credentials
                                  </button>
                                </>
                              )}

                              {directoryType === "consultancy" && canManageConsultancy && renderMenuSectionToggle("convert", "Convert")}

                              {directoryType === "consultancy" && canManageConsultancy && expandedMenuSection === "convert" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    setConvertTarget(emp);
                                  }}
                                >
                                  <UserCheck size={16} /> Make it Employee
                                </button>
                              )}

                              {directoryType === "employee" && canManage && renderMenuSectionToggle("convert", "Convert")}

                              {directoryType === "employee" && canManage && expandedMenuSection === "convert" && (
                                <button
                                  type="button"
                                  onClick={() => openConvertBackModal(emp)}
                                >
                                  <UserCheck size={16} /> Make it Consultant
                                </button>
                              )}

                              {(directoryType === "employee" ? canManage : canManageConsultancy) && renderMenuSectionToggle("danger", "Danger", true)}

                              {(directoryType === "employee" ? canManage : canManageConsultancy) && expandedMenuSection === "danger" && (
                                <button
                                  type="button"
                                  className="dropdown-item-danger"
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    handleDelete(emp._id);
                                  }}
                                >
                                  <Trash2 size={16} /> Delete {directoryType === "consultancy" ? "Consultant" : "Employee"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="10"
                      className="empty-row"
                    >
                      No employees found.
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

        {/* ================= ADD EMPLOYEE MODAL ================= */}
        {showAddModal ? (
          <EmpModal
            title={`Add ${form.isConsultancy ? "Consultant" : "Employee"}`}
            onClose={() => {
              setShowAddModal(false);
              setSalaryDraft(initialSalaryDraft);
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
                    setSalaryDraft(initialSalaryDraft);
                    setErrors({});
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="add-employee-form"
                  disabled={hasFormErrors || submitting}
                >
                  {submitting ? "Creating..." : form.isConsultancy ? "Save Consultant" : "Save Employee"}
                </Button>
              </>
            }
          >
            <form id="add-employee-form" onSubmit={handleSubmit}>
              <EmployeeFormFields
                sections={EMPLOYEE_FORM_SECTIONS}
                values={form}
                onFieldChange={handleChange}
                employees={employees}
                emailRequired={form.createAppLogin}
                department={department}
                errors={errors}
              />
              {form.isConsultancy ? (
                <FormSection title="Consultancy Payment" description="Consultants are paid monthly and excluded from payroll. TDS is deducted from the monthly amount.">
                  <FormField label="Monthly Consultancy Pay" htmlFor="emp-field-monthlyConsultancyPay" required>
                    <input id="emp-field-monthlyConsultancyPay" name="monthlyConsultancyPay" type="number" min="0" value={form.monthlyConsultancyPay} onChange={handleChange} placeholder="Enter monthly amount" className={errors.monthlyConsultancyPay ? "emp-field-input--error" : undefined} />
                    <p className={`emp-field-error${errors.monthlyConsultancyPay ? "" : " emp-field-error--empty"}`} aria-live="polite">{errors.monthlyConsultancyPay || " "}</p>
                  </FormField>
                  <FormField label="TDS %" htmlFor="emp-field-tdsPercent">
                    <input id="emp-field-tdsPercent" name="tdsPercent" type="number" min="0" max="100" value={form.tdsPercent} onChange={handleChange} placeholder="e.g. 10" className={errors.tdsPercent ? "emp-field-input--error" : undefined} />
                    <p className={`emp-field-error${errors.tdsPercent ? "" : " emp-field-error--empty"}`} aria-live="polite">{errors.tdsPercent || " "}</p>
                  </FormField>
                  <div className="consultancy-net-summary">
                    <span>Gross: ₹{calculateNetConsultancy(form.monthlyConsultancyPay, form.tdsPercent).gross.toLocaleString("en-IN")}</span>
                    <span>TDS ({form.tdsPercent || 0}%): −₹{calculateNetConsultancy(form.monthlyConsultancyPay, form.tdsPercent).tds.toLocaleString("en-IN")}</span>
                    <strong>Net Payable: ₹{calculateNetConsultancy(form.monthlyConsultancyPay, form.tdsPercent).net.toLocaleString("en-IN")}</strong>
                  </div>
                  {consultancyPreviewError(form.monthlyConsultancyPay, form.tdsPercent) ? (
                    <p className="emp-field-error" role="alert">{consultancyPreviewError(form.monthlyConsultancyPay, form.tdsPercent)}</p>
                  ) : null}
                </FormSection>
              ) : null}
              <FormSection title="App Access">
                <AppLoginSection
                  enabled={form.createAppLogin}
                  onToggle={(e) =>
                    setForm({
                      ...form,
                      createAppLogin: e.target.checked,
                    })
                  }
                  userRole={form.userRole}
                  onRoleChange={(e) => {
                    const userRole = e.target.value;
                    setForm({
                      ...form,
                      userRole,
                      allowedModules: defaultSelectedModules(
                        userRole,
                        form.allowedModules
                      ),
                    });
                  }}
                  userPassword={form.userPassword}
                  onPasswordChange={(e) =>
                    setForm({ ...form, userPassword: e.target.value })
                  }
                  roles={availableRoles}
                  modulesIdPrefix="add-emp-mod"
                />
              </FormSection>
              {!form.isConsultancy ? <FormSection
                title="Salary Structure"
                description="Set earnings and deductions from your organization component library"
                fullWidth
              >
                {errors.salaryStructure ? (
                  <p className="emp-field-error">{errors.salaryStructure}</p>
                ) : null}
                <EmployeeSalaryStructureEditor
                  key="add-employee-salary-structure"
                  payType={form.payType}
                  draftValue={salaryDraft}
                  onDraftChange={setSalaryDraft}
                  hideActions
                />
              </FormSection> : null}
            </form>
          </EmpModal>
        ) : null}

        {/* ================= BULK UPLOAD MODAL ================= */}
        {showUploadModal ? (
          <EmpModal
            title="Bulk Upload Employees"
            onClose={() => { setShowUploadModal(false); setErrors({}) }}
            size="md"
            footer={
              <button
                type="button"
                className="emp-btn emp-btn--primary emp-btn--block"
                onClick={handleBulkUpload}
                disabled={loading || !uploadFile}
              >
                {loading ? "Uploading…" : "Upload Excel"}
              </button>
            }
          >
            <FormSection
              title="Excel File"
              description="Download the template, fill it in, then upload it here."
            >
              <div className="emp-field emp-field--full">
                <button
                  type="button"
                  className="emp-btn emp-btn--secondary"
                  onClick={handleDownloadTemplate}
                  style={{ marginBottom: 14 }}
                >
                  <Download size={15} />
                  Download sample template
                </button>
              </div>
              <div className="emp-field emp-field--full">
                <div className="emp-upload-zone">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) =>
                      setUploadFile(e.target.files?.[0] || null)
                    }
                  />
                  <Upload size={24} color="#64748b" />
                  <span className="emp-upload-zone__title">
                    Choose .xlsx or .xls file
                  </span>
                  {uploadFile ? (
                    <span className="emp-upload-zone__file">
                      {uploadFile.name}
                    </span>
                  ) : null}
                </div>
              </div>
            </FormSection>
            {uploadMessage ? (
              <p className="success" style={{ whiteSpace: "pre-line" }}>
                {uploadMessage}
              </p>
            ) : null}
          </EmpModal>
        ) : null}

        {/* ================= VIEW / EDIT MODAL ================= */}
        {selectedEmployee ? (
          <EmpModal
            title={isEditing ? `Edit ${selectedEmployee.isConsultancy ? "Consultant" : "Employee"}` : `${selectedEmployee.isConsultancy ? "Consultant" : "Employee"} Details`}
            onClose={() => setSelectedEmployee(null)}
            size="lg"
            footer={
              isEditing ? (
                <>
                  <Button
                    type="button"
                    className="secondary-btn"
                    onClick={() => { setSelectedEmployee(null); setErrors({}) }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleUpdate}
                    disabled={hasFormErrors || submitting}
                  >
                    {submitting ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              ) : null
            }
          >
            {isEditing ? (
              <>
                <EmployeeFormFields
                  sections={EMPLOYEE_FORM_SECTIONS}
                  values={selectedEmployee}
                  onFieldChange={handleEditFieldChange}
                  employees={employees}
                  excludeEmployeeId={selectedEmployee._id}
                  emailRequired={enableLoginOnUpdate}
                  department={department}
                  errors={errors}
                  showTransferNotice={
                    isEditing &&
                    !!selectedEmployee?.departmentId &&
                    !!originalDepartmentId &&
                    String(selectedEmployee.departmentId) !==
                    String(originalDepartmentId)
                  }
                />
                {selectedEmployee.isConsultancy ? (
                  <FormSection title="Consultancy Payment" description="Consultants are paid monthly and excluded from payroll. TDS is deducted from the monthly amount.">
                    <FormField label="Monthly Consultancy Pay" htmlFor="emp-field-monthlyConsultancyPay" required>
                      <input id="emp-field-monthlyConsultancyPay" name="monthlyConsultancyPay" type="number" min="0" value={selectedEmployee.monthlyConsultancyPay ?? ""} onChange={handleEditFieldChange} placeholder="Enter monthly amount" className={errors.monthlyConsultancyPay ? "emp-field-input--error" : undefined} />
                      <p className={`emp-field-error${errors.monthlyConsultancyPay ? "" : " emp-field-error--empty"}`} aria-live="polite">{errors.monthlyConsultancyPay || " "}</p>
                    </FormField>
                    <FormField label="TDS %" htmlFor="emp-field-tdsPercent">
                      <input id="emp-field-tdsPercent" name="tdsPercent" type="number" min="0" max="100" value={selectedEmployee.tdsPercent ?? ""} onChange={handleEditFieldChange} placeholder="e.g. 10" className={errors.tdsPercent ? "emp-field-input--error" : undefined} />
                      <p className={`emp-field-error${errors.tdsPercent ? "" : " emp-field-error--empty"}`} aria-live="polite">{errors.tdsPercent || " "}</p>
                    </FormField>
                    <div className="consultancy-net-summary">
                      <span>Gross: ₹{calculateNetConsultancy(selectedEmployee.monthlyConsultancyPay, selectedEmployee.tdsPercent).gross.toLocaleString("en-IN")}</span>
                      <span>TDS ({selectedEmployee.tdsPercent || 0}%): −₹{calculateNetConsultancy(selectedEmployee.monthlyConsultancyPay, selectedEmployee.tdsPercent).tds.toLocaleString("en-IN")}</span>
                      <strong>Net Payable: ₹{calculateNetConsultancy(selectedEmployee.monthlyConsultancyPay, selectedEmployee.tdsPercent).net.toLocaleString("en-IN")}</strong>
                    </div>
                    {consultancyPreviewError(selectedEmployee.monthlyConsultancyPay, selectedEmployee.tdsPercent) ? (
                      <p className="emp-field-error" role="alert">{consultancyPreviewError(selectedEmployee.monthlyConsultancyPay, selectedEmployee.tdsPercent)}</p>
                    ) : null}
                  </FormSection>
                ) : null}
                <FormSection title="App Access">
                  <AppLoginSection
                    enabled={enableLoginOnUpdate}
                    onToggle={(e) =>
                      setEnableLoginOnUpdate(e.target.checked)
                    }
                    userRole={selectedEmployee.userRole || "Employee"}
                    onRoleChange={(e) => {
                      const userRole = e.target.value;
                      setSelectedEmployee({
                        ...selectedEmployee,
                        userRole,
                        allowedModules: defaultSelectedModules(
                          userRole,
                          selectedEmployee.allowedModules
                        ),
                      });
                    }}
                    userPassword={selectedEmployee.userPassword || ""}
                    onPasswordChange={(e) =>
                      setSelectedEmployee({
                        ...selectedEmployee,
                        userPassword: e.target.value,
                      })
                    }
                    alreadyEnabled={selectedEmployee.hasAppLogin}
                    linkedEmail={selectedEmployee.linkedUser?.email}
                    roles={availableRoles}
                    modulesIdPrefix="edit-emp-mod"
                  />
                </FormSection>
                {!selectedEmployee.isConsultancy ? <FormSection
                  title="Salary Structure"
                  description="Dynamic earnings and deductions from your organization library"
                  fullWidth
                >
                  <EmployeeSalaryStructureEditor ref={salaryEditorRef} employeeId={selectedEmployee._id} payType={selectedEmployee.payType} />
                </FormSection> : null}
              </>
            ) : (
              <div className="emp-view-body">
                <div className="profile-section">
                  <h4>Basic Information</h4>

                  <div className="profile-grid">
                    <div>
                      <label>Employee Code</label>
                      <span>{selectedEmployee.employeeCode}</span>
                    </div>

                    <div>
                      <label>Name</label>
                      <span>{selectedEmployee.name}</span>
                    </div>

                    <div>
                      <label>Email</label>
                      <span>{selectedEmployee.email || "-"}</span>
                    </div>

                    <div>
                      <label>Phone</label>
                      <span>{selectedEmployee.phone || "-"}</span>
                    </div>
                  </div>
                </div>

                <div className="profile-section">
                  <h4>Employment Details</h4>

                  <div className="profile-grid">
                    <div>
                      <label>Designation</label>
                      <span>{selectedEmployee.designation || "-"}</span>
                    </div>

                    <div>
                      <label>Reporting Manager</label>
                      <span>
                        {selectedEmployee.managerId?.name ||
                          selectedEmployee.managerName ||
                          "-"}
                      </span>
                    </div>

                    <div>
                      <label>Department</label>
                      <span>{selectedEmployee.department || "-"}</span>
                    </div>

                    <div>
                      <label>Location</label>
                      <span>{selectedEmployee.location || "-"}</span>
                    </div>

                    <div>
                      <label>Client</label>
                      <span>{selectedEmployee.client || "-"}</span>
                    </div>

                    <div>
                      <label>Date Of Joining</label>
                      <span>
                        {selectedEmployee.dateOfJoining
                          ? new Date(
                            selectedEmployee.dateOfJoining
                          ).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>

                    {!selectedEmployee.isConsultancy ? (
                      <div>
                        <label>Employment Status</label>
                        <span>
                          {selectedEmployee.employmentStatus === "probation"
                            ? "Probation"
                            : selectedEmployee.employmentStatus === "full-time"
                              ? "Full-time"
                              : "-"}
                          {selectedEmployee.employmentStatus === "probation" ? (
                            <button
                              type="button"
                              className="emp-info-btn"
                              title="View probation history"
                              aria-label="View probation history"
                              onClick={() => openProbationHistory(selectedEmployee)}
                            >
                              <Info size={12} />
                            </button>
                          ) : null}
                        </span>
                      </div>
                    ) : null}

                    {!selectedEmployee.isConsultancy ? (
                      <div>
                        <label>Probation End Date</label>
                        <span>
                          {selectedEmployee.probationEndDate
                            ? new Date(
                              selectedEmployee.probationEndDate
                            ).toLocaleDateString()
                            : "-"}
                        </span>
                      </div>
                    ) : null}

                    {!selectedEmployee.isConsultancy && selectedEmployee.confirmationDate ? (
                      <div>
                        <label>Confirmation Date</label>
                        <span>
                          {new Date(selectedEmployee.confirmationDate).toLocaleDateString()}
                        </span>
                      </div>
                    ) : null}

                    <div>
                      <label>Relieving Date</label>
                      <span>
                        {selectedEmployee.relievingDate
                          ? new Date(
                            selectedEmployee.relievingDate
                          ).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>

                    <div>
                      <label>UAN</label>
                      <span>{selectedEmployee.uan || "-"}</span>
                    </div>

                    <div>
                      <label>ESIC</label>
                      <span>{selectedEmployee.esicNumber || "-"}</span>
                    </div>

                    <div>
                      <label>PF Number</label>
                      <span>{selectedEmployee.pfNumber || "-"}</span>
                    </div>
                  </div>
                </div>

                <div className="profile-section">
                  <h4>Access &amp; Login</h4>

                  <div className="profile-grid">
                    <div>
                      <label>App Login</label>
                      <span>
                        {selectedEmployee.hasAppLogin
                          ? selectedEmployee.hasLoginEnabled
                            ? "Enabled"
                            : "Disabled"
                          : "No login"}
                      </span>
                    </div>

                    <div>
                      <label>Login Role</label>
                      <span>{selectedEmployee.linkedUser?.role || selectedEmployee.userRole || "-"}</span>
                    </div>
                  </div>
                </div>

                <div className="profile-section">
                  <h4>Personal Details</h4>

                  <div className="profile-grid">
                    <div>
                      <label>Date Of Birth</label>
                      <span>
                        {selectedEmployee.dob
                          ? new Date(
                            selectedEmployee.dob
                          ).toLocaleDateString()
                          : "-"}
                      </span>
                    </div>

                    <div>
                      <label>Gender</label>
                      <span>{selectedEmployee.gender || "-"}</span>
                    </div>

                    <div>
                      <label>Father / Husband Name</label>
                      <span>{selectedEmployee.fatherHusbandName || "-"}</span>
                    </div>

                    <div>
                      <label>Relation</label>
                      <span>{selectedEmployee.relationWithMember || "-"}</span>
                    </div>

                    <div>
                      <label>Nationality</label>
                      <span>{selectedEmployee.nationality || "-"}</span>
                    </div>

                    <div>
                      <label>Marital Status</label>
                      <span>{selectedEmployee.maritalStatus || "-"}</span>
                    </div>

                    <div>
                      <label>Permanent Address</label>
                      <span>{selectedEmployee.permanentAddress || "-"}</span>
                    </div>

                    <div>
                      <label>Blood Group</label>
                      <span>{selectedEmployee.bloodGroup || "-"}</span>
                    </div>

                    <div>
                      <label>Emergency Contact</label>
                      <span>{selectedEmployee.emergencyContact || "-"}</span>
                    </div>
                  </div>
                </div>

                <div className="profile-section">
                  <h4>Government Details</h4>

                  <div className="profile-grid">
                    <div>
                      <label>Aadhaar Number</label>
                      <span>
                        {selectedEmployee.aadhaarNumber
                          ? `XXXX XXXX ${selectedEmployee.aadhaarNumber.slice(-4)}`
                          : "-"}
                      </span>
                    </div>

                    <div>
                      <label>Name as on Aadhaar</label>
                      <span>
                        {selectedEmployee.nameAsPerAadhaar || "-"}
                      </span>
                    </div>

                    <div>
                      <label>PAN Number</label>
                      <span>
                        {selectedEmployee.panNumber
                          ? `${selectedEmployee.panNumber.slice(
                            0,
                            2
                          )}XXXXX${selectedEmployee.panNumber.slice(-3)}`
                          : "-"}
                      </span>
                    </div>

                    <div>
                      <label>Name as on PAN</label>
                      <span>{selectedEmployee.nameAsPerPan || "-"}</span>
                    </div>
                  </div>
                </div>

                <div className="profile-section">
                  <h4>Bank Details</h4>

                  <div className="profile-grid">
                    <div>
                      <label>Bank Name</label>
                      <span>{selectedEmployee.bankName || "-"}</span>
                    </div>

                    <div>
                      <label>Account Holder</label>
                      <span>{selectedEmployee.accountHolderName || "-"}</span>
                    </div>

                    <div>
                      <label>Account Number</label>
                      <span>{selectedEmployee.accountNumber || "-"}</span>
                    </div>

                    <div>
                      <label>IFSC Code</label>
                      <span>
                        {selectedEmployee.ifscCode
                          ? selectedEmployee.ifscCode.toUpperCase()
                          : "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="profile-section">
                  <h4>Education</h4>

                  <div className="profile-grid">
                    <div>
                      <label>Highest Qualification</label>
                      <span>
                        {selectedEmployee.highestQualification || "-"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="profile-section">
                  <h4>Salary Structure</h4>
                  <EmployeeSalaryStructureView employeeId={selectedEmployee._id} />
                </div>
              </div>
            )}
          </EmpModal>
        ) : null}

        {/* ================= APPOINTMENT LETTER MODAL ================= */}
        {showLetterModal ? (
          <EmpModal
            title="Generate Appointment Letter"
            onClose={() => {
              setShowLetterModal(false);
              setLetterEmployeeId(null);
              setLetterStructureLoading(false);
            }}
            size="xl"
            footer={
              <>
                <Button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setShowLetterModal(false);
                    setLetterEmployeeId(null);
                    setLetterStructureLoading(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleGenerateLetter}
                  disabled={loading || letterStructureLoading}
                >
                  {loading ? "Generating…" : "Generate Letter"}
                </Button>
              </>
            }
          >
            {letterStructureLoading && (
              <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Loading salary structure…</div>
            )}
            {!letterStructureLoading && (
              <FormSection
                  title="Employee Details"
                  description="Information printed on the appointment letter"
                >
                  <FormField label="Employee Name" htmlFor="letter-name" required>
                    <input
                      id="letter-name"
                      required
                      value={letterData.employeeName}
                      onChange={(e) =>
                        setLetterData({
                          ...letterData,
                          employeeName: e.target.value,
                        })
                      }
                      placeholder="Full name"
                    />
                  </FormField>
                  <FormField label="Designation" htmlFor="letter-designation" required>
                    <input
                      id="letter-designation"
                      required
                      value={letterData.designation}
                      onChange={(e) =>
                        setLetterData({
                          ...letterData,
                          designation: e.target.value,
                        })
                      }
                      placeholder="Job title"
                    />
                  </FormField>
                  <FormField label="Joining Date" htmlFor="letter-joining" required>
                    <input
                      id="letter-joining"
                      required
                      type="date"
                      value={letterData.joiningDate}
                      onChange={(e) =>
                        setLetterData({
                          ...letterData,
                          joiningDate: e.target.value,
                        })
                      }
                    />
                  </FormField>
                  <FormField label="Work Location" htmlFor="letter-location" required>
                    <input
                      id="letter-location"
                      required
                      value={letterData.workLocation}
                      onChange={(e) =>
                        setLetterData({
                          ...letterData,
                          workLocation: e.target.value,
                        })
                      }
                      placeholder="City / office"
                    />
                  </FormField>
                  <FormField label="Annual CTC" htmlFor="letter-ctc" required>
                    <input
                      id="letter-ctc"
                      required
                      type="number"
                      value={letterData.annualCTC}
                      onChange={(e) =>
                        patchLetterData({
                          annualCTC: e.target.value,
                        })
                      }
                      placeholder="e.g. 600000"
                      disabled={!!letterData.structureName}
                      style={!!letterData.structureName ? { backgroundColor: "#f1f5f9", cursor: "not-allowed" } : {}}
                    />
                  </FormField>
                  <FormField label="Monthly Salary" htmlFor="letter-monthly" required>
                    <input
                      id="letter-monthly"
                      required
                      type="number"
                      value={letterData.monthlySalary}
                      onChange={(e) =>
                        patchLetterData({
                          monthlySalary: e.target.value,
                        })
                      }
                      placeholder="Auto-filled from components"
                      disabled={!!letterData.structureName}
                      style={!!letterData.structureName ? { backgroundColor: "#f1f5f9", cursor: "not-allowed" } : {}}
                    />
                  </FormField>

                </FormSection>
            )}
            {!letterStructureLoading && (
              <FormSection
                title="Salary Structure"
                fullWidth
              >
                <AppointmentLetterSalary
                  employeeId={letterEmployeeId}
                />
              </FormSection>
            )}
          </EmpModal>
        ) : null}

        {showWarningModal ? (
          <EmpModal
            title="Generate Warning Letter"
            onClose={() => setShowWarningModal(false)}
            size="md"
            footer={
              <Button
                type="button"
                icon={<TriangleAlert size={16} />}
                onClick={handleGenerateWarning}
                disabled={loading}
                style={{ flex: 1 }}
              >
                {loading ? "Generating…" : "Generate Warning Letter"}
              </Button>
            }
          >
            <FormSection
              title="Employee Details"
              description="Auto-filled from the selected employee"
            >
              <FormField label="Employee Name" htmlFor="warn-name" required>
                <input
                  id="warn-name"
                  required
                  value={warningData.employeeName}
                  readOnly
                />
              </FormField>
              <FormField label="Employee Code" htmlFor="warn-code">
                <input
                  id="warn-code"
                  value={warningData.employeeCode}
                  readOnly
                />
              </FormField>
              <FormField label="Designation" htmlFor="warn-designation" required>
                <input
                  id="warn-designation"
                  required
                  value={warningData.designation}
                  readOnly
                />
              </FormField>
            </FormSection>

            <FormSection
              title="Incident Details"
              description="Provide details regarding the incident and action"
            >
              <FormField label="Incident Date" htmlFor="warn-incident-date" required>
                <input
                  id="warn-incident-date"
                  required
                  type="date"
                  value={warningData.incidentDate}
                  onChange={(e) =>
                    setWarningData({
                      ...warningData,
                      incidentDate: e.target.value,
                    })
                  }
                />
              </FormField>

              <FormField label="Warning Severity" htmlFor="warn-severity">
                <select
                  id="warn-severity"
                  value={warningData.severity}
                  onChange={(e) =>
                    setWarningData({
                      ...warningData,
                      severity: e.target.value,
                    })
                  }
                >
                  <option value="First">First</option>
                  <option value="Second">Second</option>
                  <option value="Final">Final</option>
                </select>
              </FormField>

              <FormField label="Reason / Description" htmlFor="warn-reason" fullWidth required>
                <textarea
                  id="warn-reason"
                  required
                  rows={4}
                  value={warningData.reason}
                  onChange={(e) =>
                    setWarningData({
                      ...warningData,
                      reason: e.target.value,
                    })
                  }
                  placeholder="Describe the incident / violation in detail"
                />
              </FormField>

              <FormField label="Action Taken" htmlFor="warn-action" fullWidth>
                <textarea
                  id="warn-action"
                  rows={2}
                  value={warningData.actionTaken}
                  onChange={(e) =>
                    setWarningData({
                      ...warningData,
                      actionTaken: e.target.value,
                    })
                  }
                  placeholder="e.g. deduction, suspension, coaching, etc."
                />
              </FormField>

              <FormField label="Response Period (days)" htmlFor="warn-response">
                <input
                  id="warn-response"
                  type="number"
                  min="1"
                  value={warningData.responsePeriod}
                  onChange={(e) =>
                    setWarningData({
                      ...warningData,
                      responsePeriod: e.target.value,
                    })
                  }
                />
              </FormField>
            </FormSection>
          </EmpModal>
        ) : null}

        {showTerminationModal ? (
          <EmpModal
            title="Generate Termination Letter"
            onClose={() => setShowTerminationModal(false)}
            size="md"
            footer={
              <div style={{ display: "flex", gap: 10, width: "100%" }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSaveTermination}
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  Save Details
                </Button>
                <Button
                  type="button"
                  icon={<OctagonX size={16} />}
                  onClick={handleGenerateTermination}
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  {loading ? "Processing…" : "Generate & Send"}
                </Button>
              </div>
            }
          >
            <FormSection
              title="Employee Details"
              description="Auto-filled from the selected employee"
            >
              <FormField label="Employee Name" htmlFor="term-name" required>
                <input
                  id="term-name"
                  required
                  value={terminationData.employeeName}
                  readOnly
                />
              </FormField>
              <FormField label="Employee Code" htmlFor="term-code">
                <input
                  id="term-code"
                  value={terminationData.employeeCode}
                  readOnly
                />
              </FormField>
              <FormField label="Designation" htmlFor="term-designation" required>
                <input
                  id="term-designation"
                  required
                  value={terminationData.designation}
                  readOnly
                />
              </FormField>
            </FormSection>

            <FormSection
              title="Termination Details"
              description="Provide details regarding the termination"
            >
              <FormField label="Termination / Last Working Day" htmlFor="term-date" required>
                <input
                  id="term-date"
                  required
                  type="date"
                  value={terminationData.terminationDate}
                  onChange={(e) =>
                    setTerminationData({
                      ...terminationData,
                      terminationDate: e.target.value,
                    })
                  }
                />
              </FormField>

              <FormField label="Reason for Termination" htmlFor="term-reason" fullWidth required>
                <textarea
                  id="term-reason"
                  required
                  rows={4}
                  value={terminationData.reason}
                  onChange={(e) =>
                    setTerminationData({
                      ...terminationData,
                      reason: e.target.value,
                    })
                  }
                  placeholder="Describe the reason for termination"
                />
              </FormField>

              <FormField label="Notice Period (payment in lieu)" htmlFor="term-notice" fullWidth>
                <input
                  id="term-notice"
                  value={terminationData.noticePeriod}
                  onChange={(e) =>
                    setTerminationData({
                      ...terminationData,
                      noticePeriod: e.target.value,
                    })
                  }
                  placeholder="e.g. 1 month salary or leave blank"
                />
              </FormField>

              <FormField label="Work Location / Site" htmlFor="term-location" fullWidth>
                <input
                  id="term-location"
                  value={terminationData.workLocation}
                  onChange={(e) =>
                    setTerminationData({
                      ...terminationData,
                      workLocation: e.target.value,
                    })
                  }
                  placeholder="e.g. Gurgaon"
                />
              </FormField>

              <FormField label="Client / Site Name" htmlFor="term-client" fullWidth>
                <input
                  id="term-client"
                  value={terminationData.client}
                  onChange={(e) =>
                    setTerminationData({
                      ...terminationData,
                      client: e.target.value,
                    })
                  }
                  placeholder="e.g. ABC Towers"
                />
              </FormField>

              <FormField label="Settlement / F&F Reporting Date" htmlFor="term-settlement">
                <input
                  id="term-settlement"
                  type="date"
                  value={terminationData.settlementDate}
                  onChange={(e) =>
                    setTerminationData({
                      ...terminationData,
                      settlementDate: e.target.value,
                    })
                  }
                />
              </FormField>

              <FormField label="Appointment Letter Clause No." htmlFor="term-clause">
                <input
                  id="term-clause"
                  value={terminationData.noticeClause}
                  onChange={(e) =>
                    setTerminationData({
                      ...terminationData,
                      noticeClause: e.target.value,
                    })
                  }
                  placeholder='e.g. 7(B)'
                />
              </FormField>
            </FormSection>

            <FormSection
              title="Exit Process Setup"
              description="Auto-run schedule after your sign-off — mirrors the resignation flow:"
            >
              <div className="termination-schedule-box">
                <div className="termination-schedule-row">
                  <span>Termination Letter</span>
                  <strong>On "Generate &amp; Send"</strong>
                </div>
                <div className="termination-schedule-row">
                  <span>Employee deactivated (Exited)</span>
                  <strong>{terminationData.terminationDate || "Not scheduled"}</strong>
                </div>
                <div className="termination-schedule-row">
                  <span>Experience / Relieving Letters</span>
                  <strong>{formatDayAfterDate(terminationData.terminationDate)}</strong>
                </div>
                <div className="termination-schedule-row">
                  <span>Final Salary Slips + F&amp;F Statement</span>
                  <strong>{formatDayAfterDate(terminationData.settlementDate)}</strong>
                </div>
                <div className="termination-schedule-row">
                  <span>Status update</span>
                  <strong>Auto-updates to "Released" after F&amp;F</strong>
                </div>
              </div>

              <FormField label="Documents to auto-generate" fullWidth>
                <div className="termination-exit-list">
                  <label className="termination-exit-label">
                    <input
                      type="checkbox"
                      checked={terminationData.isExperienceLetterIssued}
                      onChange={(e) =>
                        setTerminationData({
                          ...terminationData,
                          isExperienceLetterIssued: e.target.checked,
                        })
                      }
                    />
                    <strong>Experience Certificate</strong>
                  </label>
                  <label className="termination-exit-label">
                    <input
                      type="checkbox"
                      checked={terminationData.isRelievingLetterIssued}
                      onChange={(e) =>
                        setTerminationData({
                          ...terminationData,
                          isRelievingLetterIssued: e.target.checked,
                        })
                      }
                    />
                    <strong>Relieving Letter</strong>
                  </label>
                </div>
              </FormField>

              <FormField label="HR Email (for exit/F&F notifications)" htmlFor="term-hrmail" fullWidth>
                <input
                  id="term-hrmail"
                  type="email"
                  value={terminationData.hrMail}
                  onChange={(e) =>
                    setTerminationData({
                      ...terminationData,
                      hrMail: e.target.value,
                    })
                  }
                  placeholder="hr@company.com (optional)"
                />
              </FormField>

              <FormField label="Account after settlement" fullWidth>
                <div className="termination-exit-list">
                  <label className="termination-exit-label termination-exit-label--danger">
                    <input
                      type="checkbox"
                      checked={terminationData.deleteEmployeeAccount}
                      onChange={(e) =>
                        setTerminationData({
                          ...terminationData,
                          deleteEmployeeAccount: e.target.checked,
                        })
                      }
                    />
                    Archive (soft-delete) employee after F&amp;F is dispatched
                  </label>
                </div>
              </FormField>
            </FormSection>
          </EmpModal>
        ) : null}

      </div>

      {showDocumentsModal ? (
        <EmpModal
          title="Employee Documents"
          onClose={() => setShowDocumentsModal(false)}
          size="md"
          footer={
            <Button
              type="button"
              icon={<Upload size={16} />}
              onClick={handleUploadDocument}
              disabled={!documentFile}
              style={{ flex: 1 }}
            >

              Upload Document
            </Button>
          }
        >
          <div className="emp-doc-hero">
            <div className="emp-doc-hero__icon">
              <FolderOpen size={22} />
            </div>
            <div>
              <span className="emp-doc-hero__label">Employee</span>
              <p className="emp-doc-hero__name">
                {selectedEmployeeForDocs?.name}
              </p>
            </div>
          </div>

          <FormSection title="Upload New Document">
            <FormField label="Document Type" htmlFor="doc-type" fullWidth>
              <select
                id="doc-type"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
              >
                {DOC_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FormField>
            <div className="emp-field emp-field--full">
              <label>File</label>
              <div className="emp-upload-zone">
                <input
                  type="file"
                  accept={acceptFor(documentType)}
                  onChange={(e) =>
                    setDocumentFile(e.target.files?.[0] || null)
                  }
                />
                <Upload size={24} color="#64748b" />
                <span className="emp-upload-zone__title">
                  Click or drag file to upload
                </span>
                <span className="emp-upload-zone__hint">
                  {DOC_TYPE_ACCEPT[documentType].join(", ")} up to 10MB
                </span>
                {documentFile ? (
                  <span className="emp-upload-zone__file">
                    {documentFile.name}
                  </span>
                ) : null}
              </div>
            </div>
          </FormSection>

          <div className="emp-doc-list">
            <h4>Uploaded Documents</h4>

            {!Array.isArray(employeeDocuments) ? (
              <p className="emp-doc-list__empty">Loading…</p>
            ) : employeeDocuments.length === 0 ? (
              <p className="emp-doc-list__empty">No documents uploaded yet</p>
            ) : (
              employeeDocuments.map((doc) => (
                <div key={doc._id} className="emp-doc-item">
                  <div>
                    <span className="emp-doc-item__type">
                      {docTypeLabel(doc.documentType)}
                    </span>
                    <span className="emp-doc-item__name">
                      {doc.originalName}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="emp-btn emp-btn--secondary"
                    onClick={() => setDocPreviewUrl(getDocumentViewUrl(doc._id))}
                  >
                    <Eye size={14} />
                    View
                  </button>
                </div>
              ))
            )}
          </div>
        </EmpModal>
      ) : null}

      {loginCredentials ? (
        <EmpModal
          title="App Login Details"
          onClose={() => setLoginCredentials(null)}
          size="md"
          footer={
            <div style={{ display: "flex", gap: "8px", width: "100%" }}>
              {loginCredentials.email ? (
                <button
                  type="button"
                  className="emp-btn emp-btn--secondary"
                  style={{ flex: 1 }}
                  disabled={sendingCreds}
                  onClick={() =>
                    handleResendCredentials(
                      loginCredentials.employeeId,
                      loginCredentials.employeeName
                    )
                  }
                >
                  <Mail size={14} />{" "}
                  {sendingCreds ? "Sending..." : "Send on Email"}
                </button>
              ) : null}
              <button
                type="button"
                className="emp-btn emp-btn--secondary"
                style={{ flex: 1 }}
                onClick={() => downloadCredentialExcel(loginCredentials)}
              >
                <Download size={14} /> Download Excel
              </button>
              <button
                type="button"
                className="emp-btn emp-btn--primary"
                style={{ flex: 1 }}
                onClick={() => setLoginCredentials(null)}
              >
                Done
              </button>
            </div>
          }
        >
          <div className="credentials-body">
            <p>
              <strong>{loginCredentials.employeeName}</strong> can now sign in
              to the app.
            </p>

            <div className="credentials-row">
              <span>Email / phone login</span>
              <strong>{loginCredentials.email || loginCredentials.phone}</strong>
            </div>

            <div className="credentials-row">
              <span>Role</span>
              <strong>{loginCredentials.role}</strong>
            </div>

            {loginCredentials.organizationCode ? (
              <div className="credentials-row">
                <span>Organization code (for login page)</span>
                <strong>{loginCredentials.organizationCode}</strong>
              </div>
            ) : null}

            {loginCredentials.temporaryPassword ? (
              <div className="credentials-password-box">
                <span>Temporary password (shown only once)</span>
                <strong>{loginCredentials.temporaryPassword}</strong>
                <p>
                  Share this with the employee. This password is shown only
                  once — copy it now.
                </p>
              </div>
            ) : (
              <p className="employee-login-hint">
                {loginCredentials.linkedExisting
                  ? "This employee was linked to an existing user account. They should use their current password."
                  : "Login enabled with the password you set."}
              </p>
            )}
          </div>
        </EmpModal>
      ) : null}

      <ConfirmModal
        open={!!confirmProbationTarget}
        title="Mark as Full-time?"
        variant="success"
        confirmLabel="Mark Full-time"
        loading={probationActionLoading}
        onCancel={() => !probationActionLoading && setConfirmProbationTarget(null)}
        onConfirm={handleConfirmProbationSubmit}
        message={
          confirmProbationTarget ? (
            <span>
              {confirmProbationTarget.name} ({confirmProbationTarget.employeeCode})
              will be confirmed and marked as <strong>full-time</strong>.
            </span>
          ) : null
        }
      />

      {extendEmp ? (
        <EmpModal title={`Extend Probation — ${extendEmp.name}`} onClose={() => !probationActionLoading && setExtendEmp(null)}>
          <div className="probation-row">
            <FormField label="Extra Months (1–12)" htmlFor="probation-extend-months" required hint="Valid range: 1–12">
              <input
                id="probation-extend-months"
                type="number"
                min={1}
                max={12}
                step={1}
                value={extendMonths}
                onChange={(e) => {
                  setExtendMonths(e.target.value);
                  const msg = validateExtraMonths(e.target.value);
                  setExtendErrors((prev) => {
                    const next = { ...prev };
                    if (msg) next.extendMonths = msg;
                    else delete next.extendMonths;
                    return next;
                  });
                }}
                aria-invalid={Boolean(extendErrors.extendMonths)}
                className={extendErrors.extendMonths ? "emp-field-input--error" : undefined}
              />
              <p className={`emp-field-error${extendErrors.extendMonths ? "" : " emp-field-error--empty"}`} aria-live="polite" role={extendErrors.extendMonths ? "alert" : undefined}>{extendErrors.extendMonths || " "}</p>
            </FormField>
            <FormField label="Reason for Extension" htmlFor="probation-extend-remark" required fullWidth>
              <input
                id="probation-extend-remark"
                type="text"
                placeholder="Enter reason for extension (required)"
                value={extendRemark}
                onChange={(e) => {
                  setExtendRemark(e.target.value);
                  const msg = validateExtendRemark(e.target.value);
                  setExtendErrors((prev) => {
                    const next = { ...prev };
                    if (msg) next.extendRemark = msg;
                    else delete next.extendRemark;
                    return next;
                  });
                }}
                aria-invalid={Boolean(extendErrors.extendRemark)}
                className={extendErrors.extendRemark ? "emp-field-input--error" : undefined}
              />
              <p className={`emp-field-error${extendErrors.extendRemark ? "" : " emp-field-error--empty"}`} aria-live="polite" role={extendErrors.extendRemark ? "alert" : undefined}>{extendErrors.extendRemark || " "}</p>
            </FormField>
          </div>
          {extendEmp.probationEndDate ? (
            <p className="emp-field-hint">
              Current end: {new Date(extendEmp.probationEndDate).toLocaleDateString()}
            </p>
          ) : null}
          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <Button type="button" disabled={probationActionLoading || !isExtendFormValid} onClick={handleExtendProbationSubmit}>
              {probationActionLoading ? "Saving…" : "Extend Probation"}
            </Button>
            <Button type="button" variant="secondary" disabled={probationActionLoading} onClick={() => { setExtendEmp(null); setExtendErrors({}); }}>
              Cancel
            </Button>
          </div>
        </EmpModal>
      ) : null}

      <DocumentPreview
        isOpen={!!docPreviewUrl}
        onClose={() => setDocPreviewUrl(null)}
        url={docPreviewUrl}
      />

      <ProbationHistoryModal
        open={showProbHist}
        onClose={() => setShowProbHist(false)}
        loading={probHistLoading}
        error={probHistError}
        data={probHistData}
      />

      <ConfirmModal
        open={!!convertTarget}
        title="Make it Employee"
        variant="success"
        confirmLabel="Convert to Employee"
        loading={converting}
        onCancel={() => !converting && setConvertTarget(null)}
        onConfirm={handleConfirmConvertToEmployee}
        message={
          convertTarget ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", textAlign: "left" }}>
              <div className="credentials-body" style={{ margin: 0 }}>
                <div className="credentials-row">
                  <span>Name</span>
                  <strong>{convertTarget.name || "-"}</strong>
                </div>
                <div className="credentials-row">
                  <span>Employee code</span>
                  <strong>{convertTarget.employeeCode || "-"}</strong>
                </div>
                <div className="credentials-row">
                  <span>Designation</span>
                  <strong>{convertTarget.designation || "-"}</strong>
                </div>
                <div className="credentials-row">
                  <span>Monthly consultancy pay</span>
                  <strong>₹{Number(convertTarget.monthlyConsultancyPay || 0).toLocaleString("en-IN")}</strong>
                </div>
                <div className="credentials-row">
                  <span>TDS</span>
                  <strong>{convertTarget.tdsPercent || 0}%</strong>
                </div>
              </div>
              <div style={{ fontSize: "0.85rem", color: "#475569", lineHeight: 1.6 }}>
                <strong>After conversion:</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: "18px" }}>
                  <li>Moves to the Employees list</li>
                  <li>Past consultancy payment history is preserved for audit</li>
                  <li>Only future consultancy payments stop generating</li>
                  <li>Becomes payroll-eligible — assign department + salary structure next</li>
                </ul>
              </div>
            </div>
          ) : null
        }
      />

      {convertBackTarget ? (
        <EmpModal title={`Make it Consultant — ${convertBackTarget.name}`} onClose={() => !converting && (setConvertBackTarget(null), setConvertBackErrors({}))}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <p className="emp-field-hint" style={{ margin: 0 }}>
              {convertBackTarget.convertedFromConsultancy
                ? "This employee was converted from consultancy — converting back restores monthly consultancy payments."
                : "This employee will move to the Consultancy list and become payroll-excluded."}
            </p>
            <FormField label="Monthly Consultancy Pay" htmlFor="convert-back-pay" required>
              <input
                id="convert-back-pay"
                type="number"
                min="1"
                step="any"
                value={convertBackPay}
                onChange={(e) => {
                  setConvertBackPay(e.target.value);
                  setConvertBackErrors((prev) => {
                    if (!prev.convertBackPay) return prev;
                    const next = { ...prev };
                    delete next.convertBackPay;
                    return next;
                  });
                }}
                placeholder="Enter monthly amount"
                className={convertBackErrors.convertBackPay ? "emp-field-input--error" : undefined}
              />
              <p className={`emp-field-error${convertBackErrors.convertBackPay ? "" : " emp-field-error--empty"}`} aria-live="polite">{convertBackErrors.convertBackPay || " "}</p>
            </FormField>
            <FormField label="TDS %" htmlFor="convert-back-tds">
              <input
                id="convert-back-tds"
                type="number"
                min="0"
                max="100"
                step="any"
                value={convertBackTds}
                onChange={(e) => {
                  setConvertBackTds(e.target.value);
                  setConvertBackErrors((prev) => {
                    if (!prev.convertBackTds) return prev;
                    const next = { ...prev };
                    delete next.convertBackTds;
                    return next;
                  });
                }}
                placeholder="e.g. 10"
                className={convertBackErrors.convertBackTds ? "emp-field-input--error" : undefined}
              />
              <p className={`emp-field-error${convertBackErrors.convertBackTds ? "" : " emp-field-error--empty"}`} aria-live="polite">{convertBackErrors.convertBackTds || " "}</p>
            </FormField>
            {consultancyPreviewError(convertBackPay === "" ? null : convertBackPay, convertBackTds === "" ? null : convertBackTds) ? (
              <p className="emp-field-error" role="alert">{consultancyPreviewError(convertBackPay === "" ? null : convertBackPay, convertBackTds === "" ? null : convertBackTds)}</p>
            ) : (
              <div className="consultancy-net-summary">
                <span>Gross: ₹{calculateNetConsultancy(convertBackPay || 0, convertBackTds || 0).gross.toLocaleString("en-IN")}</span>
                <span>TDS ({convertBackTds || 0}%): −₹{calculateNetConsultancy(convertBackPay || 0, convertBackTds || 0).tds.toLocaleString("en-IN")}</span>
                <strong>Net Payable: ₹{calculateNetConsultancy(convertBackPay || 0, convertBackTds || 0).net.toLocaleString("en-IN")}</strong>
              </div>
            )}
            <div style={{ display: "flex", gap: "8px" }}>
              <Button type="button" disabled={converting} onClick={handleConfirmConvertToConsultant}>
                {converting ? "Converting…" : "Convert to Consultant"}
              </Button>
              <Button type="button" variant="secondary" disabled={converting} onClick={() => { setConvertBackTarget(null); setConvertBackErrors({}); }}>
                Cancel
              </Button>
            </div>
          </div>
        </EmpModal>
      ) : null}
    </MainLayout>
  );
}

export default Employees;