import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import {
  addEmployee,
  buildEmployeePayload,
  getEmployees,
  bulkUploadEmployees,
  updateEmployee,
  deleteEmployee,
} from "../services/employeeService";

import {
  uploadEmployeeDocument,
  getEmployeeDocuments,
  viewDocument,
} from "../services/documentService";

import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Upload,
  X,
  FileText,
  FolderOpen
} from "lucide-react";


import {
  generateAppointmentLetter,
} from "../services/letterService";
import EmployeeSalaryStructureEditor, { hasSalaryData } from "../components/EmployeeSalaryStructureEditor";
import EmployeeSalaryStructureView from "../components/EmployeeSalaryStructureView";
import AppointmentLetterSalary from "../components/AppointmentLetterSalary";
import { saveEmployeeStructure } from "../services/salaryComponentService";

import "./Employees.css";
import { getDepartmentName } from "../services/departmentService";
import {
  DOC_CATEGORIES,
  DOC_TYPE_ACCEPT,
  DOC_TYPE_OPTIONS,
  acceptFor,
  docTypeLabel,
  filterDocuments,
  isAllowedFile,
} from "../utils/documentTypes";
import {
  employeeValidationSchema,
  getMaxDateOfBirthInputValue,
} from "../validators/employeeValidation";
import { validateStructureDraft } from "../utils/salaryValidation";
import Button from "../components/Button";

export const generateClientEmpCode = (prefix = "EMP") => {
  const randomDigits = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${randomDigits}`;
};

const EMPLOYEE_FORM_SECTIONS = [
  {
    id: "basic",
    title: "Basic Information",
    description: "Primary contact and role details",
    fields: [
      { key: "employeeCode", label: "Employee Code", required: true },
      { key: "name", label: "Full Name", required: true },
      { key: "email", label: "Email", type: "email" },
      { key: "phone", label: "Phone Number", type: "tel" },
      { key: "designation", label: "Designation" },
      { key: "department", label: "Department" },
      { key: "location", label: "Work Location" },
      { key: "managerId", label: "Reporting Manager", type: "manager" },
      { key: "dateOfJoining", label: "Date of Joining", type: "date" },
      { key: "dob", label: "Date of Birth", type: "date" },
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
    id: "identity",
    title: "Identity & Compliance",
    fields: [
      { key: "aadhaarNumber", label: "Aadhaar Number" },
      { key: "panNumber", label: "PAN Number" },
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
      { key: "relievingDate", label: "Relieving Date", type: "date" },
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
  employees,
  excludeEmployeeId,
  emailRequired,
  department,
  errors
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
    if (field.key === "department") {
      return (
        <>
        <select {...common}>
          {department && department.map((dept) => (
            <option key={dept?._id} value={dept?.name}>
              {dept?.name}
            </option>
          ))}
        </select>
        {fieldError(field.key) ? (
          <p className="emp-field-error">{fieldError(field.key)}</p>
        ) : null}
        </>
      );
    }

    if (field.type === "manager") {
      return (
        <>
        <select {...common} value={values.managerId || ""}>
          <option value="">Select manager (optional)</option>
          {employees
            .filter((emp) => emp._id !== excludeEmployeeId)
            .map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.employeeCode} — {emp.name}
              </option>
            ))}
        </select>
        {fieldError(field.key) ? (
          <p className="emp-field-error">{fieldError(field.key)}</p>
        ) : null}
        </>
      );
    }

    if (field.type === "date") {
      const dateInputProps =
        field.key === "dob"
          ? { max: getMaxDateOfBirthInputValue() }
          : {};

      return (
        <>
        <input {...common} {...dateInputProps} type="date" />
        {fieldError(field.key) ? (
          <p className="emp-field-error">{fieldError(field.key)}</p>
        ) : null}
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

  return sections.map((section) => (
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
              : undefined
          }
        >
          {renderInput(field)}
        </FormField>
      ))}
    </FormSection>
  ));
}

function AppLoginSection({
  enabled,
  onToggle,
  userRole,
  onRoleChange,
  userPassword,
  onPasswordChange,
  alreadyEnabled,
  linkedEmail,
}) {
  if (alreadyEnabled) {
    return (
      <div className="emp-login-card emp-field--full">
        <p className="emp-field-hint" style={{ margin: 0 }}>
          App login is enabled
          {linkedEmail ? ` for ${linkedEmail}` : ""}.
        </p>
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
            <FormField label="Login role" htmlFor="emp-user-role">
              <select
                id="emp-user-role"
                value={userRole}
                onChange={onRoleChange}
              >
                <option value="Employee">Employee</option>
                <option value="Manager">Manager</option>
                <option value="HR">HR</option>
              </select>
            </FormField>
            <FormField
              label="Password"
              htmlFor="emp-user-password"
              hint="Leave blank to auto-generate"
            >
              <input
                id="emp-user-password"
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

  const initialForm = {
    employeeCode:generateClientEmpCode(),
    name: "",
    email: "",
    phone: "",
  
    designation: "",
    department: "",
    location: "",
  
    dob: "",
    bloodGroup: "",
    emergencyContact: "",
  
    aadhaarNumber: "",
    panNumber: "",
  
    uan: "",
    pfNumber: "",
    esicNumber: "",
  
    bankName: "",
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
  
    highestQualification: "",
  
    dateOfJoining: "",
    relievingDate: "",
    managerId: "",
    basicSalary: "",
    hra: "",
    conveyanceAllowance: "",
    incentive: "",
    otherAllowance: "",
    professionalTax: "",
    createAppLogin: false,
    userRole: "Employee",
    userPassword: "",
  };

  const [form, setForm] = useState(initialForm);

  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");

  const [uploadFile, setUploadFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [department,setDepartment] = useState(null);

  const [
    showDocumentsModal,
    setShowDocumentsModal,
  ] = useState(false);

  const [
    employeeDocuments,
    setEmployeeDocuments,
  ] = useState([]);
  
  const [
    selectedEmployeeForDocs,
    setSelectedEmployeeForDocs,
  ] = useState(null);
  
  const [
    documentType,
    setDocumentType,
  ] = useState("AADHAAR");
  
  const [
    documentFile,
    setDocumentFile,
  ] = useState(null);

  const [docFilter, setDocFilter] = useState("All");

  const [selectedEmployee, setSelectedEmployee] =
    useState(null);

  const [isEditing, setIsEditing] =
    useState(false);

  const [enableLoginOnUpdate, setEnableLoginOnUpdate] =
    useState(false);

  const [loginCredentials, setLoginCredentials] =
    useState(null);

  const [showAddModal, setShowAddModal] =
    useState(false);

  const initialSalaryDraft = { ctcAnnual: 0, components: [] };
  const [salaryDraft, setSalaryDraft] = useState(initialSalaryDraft);

  const [showUploadModal, setShowUploadModal] =
    useState(false);

    const [
      showLetterModal,
      setShowLetterModal,
    ] = useState(false);
    
    const [letterData, setLetterData] =
  useState({
    employeeId:"",
    employeeName: "",
    designation: "",
    joiningDate: "",
    annualCTC: "",
    monthlySalary: "",
    workLocation: "Gurgaon",
    salaryComponents: [],
  });

  const [letterEmployeeId, setLetterEmployeeId] = useState(null);

  /* =========================
     FETCH EMPLOYEES
  ========================= */

  const fetchEmployees = async () => {
    try {
      const res = await getEmployees();
      setEmployees(
        res.data.employees || []
      );
    } catch (error) {
      console.error(
        "Error fetching employees:",
        error
      );
    }
  };

  useEffect(() => {
    const loggedUser = localStorage.getItem('user')
    const {vendorId} = JSON.parse(loggedUser)
    fetchEmployees();
    fetchDepartment(vendorId);
  }, []);

  const fetchDepartment = async(vendorId) =>{
    try{
      if(!vendorId) return
      const res = await getDepartmentName(vendorId);
      setDepartment(res.data)
      
    }catch(err){
      console.log(err)
    }
  }
  

  const loadEmployeeDocuments =
  async (employeeId) => {
    try {

      const response =
        await getEmployeeDocuments(
          employeeId
        );

      console.log(
        "DOCUMENT RESPONSE",
        response.data
      );

      setEmployeeDocuments(
        response.data.documents || []
      );

    } catch (error) {

      console.error(error);
    }
  };
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
    const nextForm = {
      ...form,
      [name]: type === "checkbox" ? checked : value,
    };
    setForm(nextForm);
    validateEmployeeField(
      name,
      buildEmployeePayload(nextForm, { createAppLogin: nextForm.createAppLogin })
    );
  };

  const handleEditFieldChange = (e) => {
    const { name, type, checked, value } = e.target;
    const nextEmployee = {
      ...selectedEmployee,
      [name]: type === "checkbox" ? checked : value,
    };
    setSelectedEmployee(nextEmployee);
    validateEmployeeField(
      name,
      buildEmployeePayload(nextEmployee, { createAppLogin: enableLoginOnUpdate })
    );
  };

  /* =========================
     ADD EMPLOYEE
  ========================= */

  const showLoginCredentials = (employeeName, loginInfo) => {
    if (!loginInfo) return;

    setLoginCredentials({
      employeeName,
      email: loginInfo.email,
      role: loginInfo.role,
      temporaryPassword: loginInfo.temporaryPassword,
      organizationCode: loginInfo.organizationCode,
      linkedExisting: Boolean(loginInfo.linkedExisting),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.createAppLogin && !form.email?.trim()) {
      alert("Email is required when enabling app login.");
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
          return;
        }
      }

      setErrors({});
      const res = await addEmployee(payload);
      const data = res.data;
      const newEmployeeId = data.employee?._id;

      if (newEmployeeId && hasSalaryData(salaryDraft)) {
        try {
          await saveEmployeeStructure(newEmployeeId, {
            ctcAnnual: Number(salaryDraft.ctcAnnual) || 0,
            components: salaryDraft.components,
          });
        } catch (structureError) {
          alert(
            structureError.response?.data?.message ||
              "Employee was created but salary structure could not be saved. Edit the employee to set salary."
          );
        }
      }

      if (data.loginInfo) {
        showLoginCredentials(form.name, data.loginInfo);
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

      fetchEmployees();
    } catch (error) {
      setErrors({});
      console.error("Server/Network Error:", error);

      const serverMessage = error.response?.data?.message || "Failed to add employee";
      alert(serverMessage);
    }
  };

  /* =========================
     BULK UPLOAD
  ========================= */

  const handleBulkUpload = async () => {
    if (!uploadFile) {
      alert("Please select an Excel file");
      return;
    }
  
    // Clear old message before new upload
    setUploadMessage("");
  
    try {
      setLoading(true);
  
      const res = await bulkUploadEmployees(uploadFile);
  
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
      fetchEmployees();
  
      // ❌ modal close mat karo
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

  const handleEdit = (emp) => {
    setErrors({});
    setSelectedEmployee({
      ...emp,
      managerId: emp.managerId?._id || emp.managerId || "",
      dob: emp.dob ? emp.dob.split("T")[0] : "",
      dateOfJoining:
        emp.dateOfJoining
          ? emp.dateOfJoining
              .split("T")[0]
          : "",
      relievingDate:
        emp.relievingDate
          ? emp.relievingDate.split("T")[0]
          : "",
      basicSalary: emp.basicSalary ?? "",
      hra: emp.hra ?? "",
      conveyanceAllowance: emp.conveyanceAllowance ?? "",
      incentive: emp.incentive ?? "",
      otherAllowance: emp.otherAllowance ?? "",
      professionalTax: emp.professionalTax ?? "",
    });

    setEnableLoginOnUpdate(false);
    setIsEditing(true);
  };

  const handleUpdate = async () => {
    try {
      if (enableLoginOnUpdate && !selectedEmployee.email?.trim()) {
        alert("Email is required before enabling app login.");
        return;
      }

      const payload = buildEmployeePayload(selectedEmployee, {
        createAppLogin: enableLoginOnUpdate,
      });

      const formErrors = await collectEmployeeFormErrors(payload);
      if (Object.keys(formErrors).length) {
        setErrors(formErrors);
        scrollToFirstError(formErrors);
        return;
      }

      setErrors({});

      const res = await updateEmployee(
        selectedEmployee._id,
        payload
      );

      if (res.data?.loginInfo) {
        showLoginCredentials(selectedEmployee.name, res.data.loginInfo);
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

      fetchEmployees();
    } catch (error) {
      setErrors({});
      console.error("Server/Network Error:", error);

      const serverMessage = error.response?.data?.message || "Failed to update employee";
      alert(serverMessage);
    }
  };

  /* =========================
     DELETE EMPLOYEE
  ========================= */

  const handleDelete = async (id) => {
    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this employee?"
      );

    if (!confirmDelete) return;

    try {
      await deleteEmployee(id);

      alert(
        "Employee deleted successfully"
      );

      fetchEmployees();
    } catch (error) {
      alert(
        error.response?.data
          ?.message ||
          "Delete failed"
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

    if (
      !letterData.employeeName ||
      !letterData.designation ||
      !letterData.joiningDate ||
      !letterData.annualCTC ||
      !letterData.monthlySalary ||
      !letterData.workLocation ||
      !letterData.salaryComponents?.length
    ) {
      alert(
        "Please fill all mandatory fields and apply a CTC split or enter salary components"
      );
      return;
    }
    
    

    try {
      setLoading(true);
      await generateAppointmentLetter({
        ...letterData,
        salaryComponents: (letterData.salaryComponents || []).map((c) => ({
          code: c.code,
          componentName: c.componentName || c.name,
          monthly: c.monthly,
          annual: c.annual,
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
     FILTER EMPLOYEES
  ========================= */

  const filteredEmployees =
    employees.filter((emp) =>
      [
        emp.employeeCode,
        emp.name,
        emp.email,
        emp.phone,
        emp.designation,
      ]
        .join(" ")
        .toLowerCase()
        .includes(
          search.toLowerCase()
        )
    );

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

      await uploadEmployeeDocument(
        formData
      );

      loadEmployeeDocuments(selectedEmployeeForDocs._id);

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

        <p className="employee-page__count">
          Total employees: <strong>{employees.length}</strong>
        </p>

        <div className="employee-toolbar">

          {/* SEARCH */}
          <div className="search-wrapper">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
            />
          </div>

          {/* ACTION BUTTONS */}
          <div className="toolbar-actions">

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

            <Button
              icon={<Plus size={18} />}
              onClick={() => {
                setForm({
                  ...initialForm,
                  employeeCode: generateClientEmpCode(),
                });
                setSalaryDraft(initialSalaryDraft);
                setErrors({});
                setShowAddModal(true);
              }}
            >
              Add Employee
            </Button>
          </div>
        </div>

       <div className="employee-table-card">
          <div className="employee-table-scroll">
          <table className="employee-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Designation</th>
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

                    <td>{emp.name}</td>

                    <td>
                      {emp.phone || "-"}
                    </td>

                    <td>
                      {emp.designation || "-"}
                    </td>

                    <td>
                      <span
                        className={`status-badge ${
                          emp.hasAppLogin ? "active" : "inactive"
                        }`}
                      >
                        {emp.hasAppLogin ? "Login enabled" : "No login"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`status-badge ${
                          emp.isActive
                            ? "active"
                            : "inactive"
                        }`}
                      >
                        {emp.isActive
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    <td>
                      <div className="emp-action-buttons">

                        <button
                          className="emp-grid-btn"
                          onClick={() =>
                            handleView(emp)
                          }
                        >
                          <Eye />
                        </button>

                        <button
                          className="emp-grid-btn"
                          onClick={() =>
                            handleEdit(emp)
                          }
                        >
                          <Pencil />
                        </button>

                        <button
                          className="emp-grid-btn"
                          onClick={() => {
                            setLetterEmployeeId(emp._id);
                            setLetterData({
                              employeeId: emp._id,
                              employeeName: emp.name || "",
                              designation: emp.designation || "",
                              joiningDate: emp.dateOfJoining?.split("T")[0] || "",
                              annualCTC: "",
                              monthlySalary: "",
                              workLocation: emp.location || "Gurgaon",
                              salaryComponents: [],
                            });
                            setShowLetterModal(true);
                          }}
                        >
                          <FileText />
                        </button>

                        <button
                          className="emp-grid-btn"
                          onClick={async () => {
                            setSelectedEmployeeForDocs(emp);
                            setDocFilter("All");
                            await loadEmployeeDocuments(emp._id);
                            setShowDocumentsModal(true);
                          }}
                        >
                          <FolderOpen />
                        </button>

                        <button
                          className=" emp-grid-btn"
                          onClick={() =>
                            handleDelete(
                              emp._id
                            )
                          }
                        >
                          <Trash2 />
                        </button>

                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="7"
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

        {/* ================= ADD EMPLOYEE MODAL ================= */}
        {showAddModal ? (
          <EmpModal
            title="Add Employee"
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
                  disabled={hasFormErrors}
                >
                  Save Employee
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
                  onRoleChange={(e) =>
                    setForm({ ...form, userRole: e.target.value })
                  }
                  userPassword={form.userPassword}
                  onPasswordChange={(e) =>
                    setForm({ ...form, userPassword: e.target.value })
                  }
                />
              </FormSection>
              <FormSection
                title="Salary Structure"
                description="Set earnings and deductions from your organization component library"
                fullWidth
              >
                {errors.salaryStructure ? (
                  <p className="emp-field-error">{errors.salaryStructure}</p>
                ) : null}
                <EmployeeSalaryStructureEditor
                  key="add-employee-salary-structure"
                  draftValue={salaryDraft}
                  onDraftChange={setSalaryDraft}
                  hideActions
                />
              </FormSection>
            </form>
          </EmpModal>
        ) : null}

        {/* ================= BULK UPLOAD MODAL ================= */}
        {showUploadModal ? (
          <EmpModal
            title="Bulk Upload Employees"
            onClose={() => {setShowUploadModal(false); setErrors({})}}
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
              description="Use the official template with employee columns"
            >
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
            title={isEditing ? "Edit Employee" : "Employee Details"}
            onClose={() => setSelectedEmployee(null)}
            size="lg"
            footer={
              isEditing ? (
                <>
                  <Button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {setSelectedEmployee(null); setErrors({})}}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleUpdate}
                    disabled={hasFormErrors}
                  >
                    Save Changes
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
                  />
                  <FormSection title="App Access">
                    <AppLoginSection
                      enabled={enableLoginOnUpdate}
                      onToggle={(e) =>
                        setEnableLoginOnUpdate(e.target.checked)
                      }
                      userRole={selectedEmployee.userRole || "Employee"}
                      onRoleChange={(e) =>
                        setSelectedEmployee({
                          ...selectedEmployee,
                          userRole: e.target.value,
                        })
                      }
                      userPassword={selectedEmployee.userPassword || ""}
                      onPasswordChange={(e) =>
                        setSelectedEmployee({
                          ...selectedEmployee,
                          userPassword: e.target.value,
                        })
                      }
                      alreadyEnabled={selectedEmployee.hasAppLogin}
                      linkedEmail={selectedEmployee.linkedUser?.email}
                    />
                  </FormSection>
                  <FormSection
                    title="Salary Structure"
                    description="Dynamic earnings and deductions from your organization library"
                    fullWidth
                  >
                    <EmployeeSalaryStructureEditor employeeId={selectedEmployee._id} />
                  </FormSection>
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
                      <label>Department</label>
                      <span>{selectedEmployee.department || "-"}</span>
                    </div>
              
                    <div>
                      <label>Location</label>
                      <span>{selectedEmployee.location || "-"}</span>
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
              
                    <div>
                      <label>UAN</label>
                      <span>{selectedEmployee.uan || "-"}</span>
                    </div>
              
                    <div>
                      <label>ESIC</label>
                      <span>{selectedEmployee.esicNumber || "-"}</span>
                    </div>
                  </div>
                </div>
              
                <div className="profile-section">
                  <h4>Personal Details</h4>
              
                  <div className="profile-grid">
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
                      <label>PAN Number</label>
                      <span>
                        {selectedEmployee.panNumber
                          ? `${selectedEmployee.panNumber.slice(
                              0,
                              2
                            )}XXXXX${selectedEmployee.panNumber.slice(
                              -3
                            )}`
                          : "-"}
                      </span>
                    </div>
              
                    <div>
                      <label>PF Number</label>
                      <span>{selectedEmployee.pfNumber || "-"}</span>
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
                      <span>{selectedEmployee.ifscCode || "-"}</span>
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
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleGenerateLetter}
                  disabled={loading}
                >
                  {loading ? "Generating…" : "Generate Letter"}
                </Button>
              </>
            }
          >
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
                  readOnly
                />
              </FormField>
            </FormSection>

            <FormSection
              title="Salary Structure"
              description="From your organization component library — split from CTC or apply to employee record"
              fullWidth
            >
              <AppointmentLetterSalary
                employeeId={letterEmployeeId}
                letterData={letterData}
                onChange={patchLetterData}
              />
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
                style={{flex:1}}
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

              <div className="document-filters">
                {DOC_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={`emp-btn ${
                      docFilter === category
                        ? "emp-btn--primary"
                        : "emp-btn--secondary"
                    }`}
                    onClick={() => setDocFilter(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {!Array.isArray(employeeDocuments) ? (
                <p className="emp-doc-list__empty">Loading…</p>
              ) : (
                (() => {
                  const shown = filterDocuments(employeeDocuments, {
                    category: docFilter,
                  });
                  if (shown.length === 0) {
                    return (
                      <p className="emp-doc-list__empty">
                        No documents in this category
                      </p>
                    );
                  }
                  return shown.map((doc) => (
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
                        onClick={() => viewDocument(doc._id)}
                      >
                        <Eye size={14} />
                        View
                      </button>
                    </div>
                  ));
                })()
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
              <button
                type="button"
                className="emp-btn emp-btn--primary emp-btn--block"
                onClick={() => setLoginCredentials(null)}
              >
                Done
              </button>
            }
          >
              <div className="credentials-body">
                <p>
                  <strong>{loginCredentials.employeeName}</strong> can now sign in
                  to the app.
                </p>

                <div className="credentials-row">
                  <span>Email / login</span>
                  <strong>{loginCredentials.email}</strong>
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
    </MainLayout>
  );
}

export default Employees;