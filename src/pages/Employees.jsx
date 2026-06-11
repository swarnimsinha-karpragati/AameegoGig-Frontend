import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import {
  addEmployee,
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

function Employees() {
  /* =========================
     STATES
  ========================= */

  const initialForm = {
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
    managerId: "",
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

  const [showUploadModal, setShowUploadModal] =
    useState(false);

    const [
      showLetterModal,
      setShowLetterModal,
    ] = useState(false);
    
    const [letterData, setLetterData] =
  useState({
    employeeName: "",
    designation: "",
    joiningDate: "",
    annualCTC: "",
    monthlySalary: "",
    workLocation: "Gurgaon",

    salaryComponents: [
      {
        componentName: "Basic Salary",
        monthly: "",
        annual: "",
      },
      {
        componentName: "HRA",
        monthly: "",
        annual: "",
      },
    ],
  });

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
    fetchEmployees();
  }, []);

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

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  /* =========================
     ADD EMPLOYEE
  ========================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.createAppLogin && !form.email?.trim()) {
      alert("Email is required when enabling app login.");
      return;
    }

    try {
      const payload = {
        ...form,
        createAppLogin: Boolean(form.createAppLogin),
      };

      const res = await addEmployee(payload);
      const data = res.data;

      if (form.createAppLogin && !data.hasAppLogin) {
        alert(
          "Employee was saved but app login was not created. Add an email and enable login from Edit."
        );
      } else if (data.loginInfo) {
        setLoginCredentials({
          employeeName: form.name,
          email: data.loginInfo.email,
          role: data.loginInfo.role,
          temporaryPassword: data.loginInfo.temporaryPassword,
          linkedExisting: !data.loginInfo.created,
        });
      } else {
        alert(data.message || "Employee added successfully");
      }

      setForm(initialForm);
      setShowAddModal(false);

      fetchEmployees();
    } catch (error) {
      alert(
        error.response?.data
          ?.message ||
          "Failed to add employee"
      );
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
    setSelectedEmployee({
      ...emp,
      managerId: emp.managerId?._id || emp.managerId || "",
      dateOfJoining:
        emp.dateOfJoining
          ? emp.dateOfJoining
              .split("T")[0]
          : "",
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

      const payload = {
        ...selectedEmployee,
        ...(enableLoginOnUpdate
          ? {
              createAppLogin: true,
              userRole: selectedEmployee.userRole || "Employee",
              userPassword: selectedEmployee.userPassword || "",
            }
          : {}),
      };

      const res = await updateEmployee(
        selectedEmployee._id,
        payload
      );

      if (res.data?.loginInfo) {
        setLoginCredentials({
          employeeName: selectedEmployee.name,
          email: res.data.loginInfo.email,
          role: res.data.loginInfo.role,
          temporaryPassword: res.data.loginInfo.temporaryPassword,
          linkedExisting: !res.data.loginInfo.created,
        });
      } else {
        alert(res.data?.message || "Employee updated successfully");
      }

      setSelectedEmployee(null);
      setIsEditing(false);
      setEnableLoginOnUpdate(false);

      fetchEmployees();
    } catch (error) {
      alert(
        error.response?.data
          ?.message ||
          "Update failed"
      );
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

  const addSalaryComponent = () => {
    setLetterData({
      ...letterData,
      salaryComponents: [
        ...letterData.salaryComponents,
        {
          componentName: "",
          monthly: "",
          annual: "",
        },
      ],
    });
  };
  
  const removeSalaryComponent = (
    index
  ) => {
    const updated = [
      ...letterData.salaryComponents,
    ];
  
    updated.splice(index, 1);
  
    setLetterData({
      ...letterData,
      salaryComponents: updated,
    });
  };


  const handleGenerateLetter =
  async () => {

    if (
      !letterData.employeeName ||
      !letterData.designation ||
      !letterData.joiningDate ||
      !letterData.annualCTC ||
      !letterData.monthlySalary ||
      !letterData.workLocation
    ) {
      alert(
        "Please fill all mandatory fields"
      );
      return;
    }
    
    

    try {
      setLoading(true);

      await generateAppointmentLetter(
        letterData
      );

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

        {/* HEADER */}
        <div className="employee-header">
          <h1>Employees</h1>
          <p>Total Employees: <strong>{employees.length}</strong></p>
        </div>

        {/* TOP ACTION BAR */}
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

            <button
              className="upload-btn"
              onClick={() => {
                setShowUploadModal(true)
                setUploadMessage("")
                setUploadFile(null)
              }}
            >
              <Upload size={18} />
              Bulk Upload
            </button>

            <button
              className="add-btn"
              onClick={() =>
                setShowAddModal(true)
              }
            >
              <Plus size={18} />
              Add Employee
            </button>
          </div>
        </div>

       {/* TABLE */}
       <div className="employee-table-card">
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
                      <div className="action-buttons">

                        <button
                          className="view-btn"
                          onClick={() =>
                            handleView(emp)
                          }
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          className="edit-btn"
                          onClick={() =>
                            handleEdit(emp)
                          }
                        >
                          <Pencil size={16} />
                        </button>

                        <button
  className="letter-btn"
  onClick={() => {
    setLetterData({
      employeeName:
        emp.name || "",
    
      designation:
        emp.designation || "",
    
      joiningDate:
        emp.dateOfJoining
          ?.split("T")[0] || "",
    
      annualCTC: "",
      monthlySalary: "",
    
      workLocation:
        emp.location ||
        "Gurgaon",
    
      salaryComponents: [
        {
          componentName:
            "Basic Salary",
          monthly: "",
          annual: "",
        },
        {
          componentName:
            "HRA",
          monthly: "",
          annual: "",
        },
      ],
    });

    setShowLetterModal(true);
  }}
>
  <FileText size={16} />
</button>

<button
  className="view-btn"
  onClick={async () => {

    setSelectedEmployeeForDocs(
      emp
    );
  
    await loadEmployeeDocuments(
      emp._id
    );
  
    setShowDocumentsModal(
      true
    );
  }}
>
  <FolderOpen size={16} />
</button>

                        <button
                          className="delete-btn"
                          onClick={() =>
                            handleDelete(
                              emp._id
                            )
                          }
                        >
                          <Trash2 size={16} />
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

        {/* ================= ADD EMPLOYEE MODAL ================= */}
        {showAddModal && (
          <div className="modal-overlay">
            <div className="modal large-modal">

              <div className="modal-header">
                <h3>Add Employee</h3>

                <button
                  onClick={() =>
                    setShowAddModal(false)
                  }
                >
                  <X size={20} />
                </button>
              </div>

              <form
                className="employee-form"
                onSubmit={handleSubmit}
              >
                <input
                  name="name"
                  placeholder="Full Name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />

                <input
                  name="email"
                  placeholder={form.createAppLogin ? "Email (required for login)" : "Email (optional)"}
                  value={form.email}
                  onChange={handleChange}
                  required={form.createAppLogin}
                />

                <input
                  name="phone"
                  placeholder="Phone"
                  value={form.phone}
                  onChange={handleChange}
                />

                <input
                  name="designation"
                  placeholder="Designation"
                  value={form.designation}
                  onChange={handleChange}
                />

                <input
                  name="location"
                  placeholder="Location"
                  value={form.location}
                  onChange={handleChange}
                />

<input
  name="department"
  placeholder="Department"
  value={form.department}
  onChange={handleChange}
/>

<select
  name="managerId"
  value={form.managerId}
  onChange={handleChange}
>
  <option value="">Reporting Manager (optional)</option>
  {employees.map((emp) => (
    <option key={emp._id} value={emp._id}>
      {emp.employeeCode} - {emp.name}
    </option>
  ))}
</select>

<input
  type="date"
  name="dob"
  value={form.dob}
  onChange={handleChange}
/>

<input
  name="bloodGroup"
  placeholder="Blood Group"
  value={form.bloodGroup}
  onChange={handleChange}
/>

<input
  name="emergencyContact"
  placeholder="Emergency Contact"
  value={form.emergencyContact}
  onChange={handleChange}
/>

<input
  name="aadhaarNumber"
  placeholder="Aadhaar Number"
  value={form.aadhaarNumber}
  onChange={handleChange}
/>

<input
  name="panNumber"
  placeholder="PAN Number"
  value={form.panNumber}
  onChange={handleChange}
/>

<input
  name="pfNumber"
  placeholder="PF Number"
  value={form.pfNumber}
  onChange={handleChange}
/>

<input
  name="bankName"
  placeholder="Bank Name"
  value={form.bankName}
  onChange={handleChange}
/>

<input
  name="accountHolderName"
  placeholder="Account Holder Name"
  value={form.accountHolderName}
  onChange={handleChange}
/>

<input
  name="accountNumber"
  placeholder="Account Number"
  value={form.accountNumber}
  onChange={handleChange}
/>

<input
  name="ifscCode"
  placeholder="IFSC Code"
  value={form.ifscCode}
  onChange={handleChange}
/>

<input
  name="highestQualification"
  placeholder="Highest Qualification"
  value={form.highestQualification}
  onChange={handleChange}
/>

                <input
                  name="uan"
                  placeholder="UAN"
                  value={form.uan}
                  onChange={handleChange}
                />

                <input
                  name="esicNumber"
                  placeholder="ESIC Number"
                  value={form.esicNumber}
                  onChange={handleChange}
                />

                <input
                  type="date"
                  name="dateOfJoining"
                  value={form.dateOfJoining}
                  onChange={handleChange}
                />

                <div className="employee-login-option full-width">
                  <label className="employee-login-toggle">
                    <input
                      type="checkbox"
                      name="createAppLogin"
                      checked={form.createAppLogin}
                      onChange={handleChange}
                    />
                    <span>Enable app login for this employee</span>
                  </label>
                  <p className="employee-login-hint">
                    Leave unchecked for employees who will not use the app.
                    Admin or manager can manage their attendance and leave.
                  </p>

                  {form.createAppLogin ? (
                    <p className="employee-login-warning">
                      Email is required above to create app login. The password
                      will be shown once after saving.
                    </p>
                  ) : null}

                  {form.createAppLogin ? (
                    <div className="employee-login-fields">
                      <select
                        name="userRole"
                        value={form.userRole}
                        onChange={handleChange}
                      >
                        <option value="Employee">Employee login</option>
                        <option value="Manager">Manager login</option>
                        <option value="HR">HR login</option>
                      </select>
                      <input
                        name="userPassword"
                        type="text"
                        placeholder="Set password (optional — auto-generated if blank)"
                        value={form.userPassword}
                        onChange={handleChange}
                      />
                    </div>
                  ) : null}
                </div>

                <button type="submit">
                  Save Employee
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= BULK UPLOAD MODAL ================= */}
        {showUploadModal && (
          <div className="modal-overlay">
            <div className="modal">

              <div className="modal-header">
                <h3>Bulk Upload</h3>

                <button
                  onClick={() =>
                    setShowUploadModal(false)
                  }
                >
                  <X size={20} />
                </button>
              </div>


              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) =>
                  setUploadFile(
                    e.target.files[0]
                  )
                }
              />

              <button
                onClick={
                  handleBulkUpload
                }
                disabled={loading}
              >
                {loading
                  ? "Uploading..."
                  : "Upload Excel"}
              </button>

              {uploadMessage && (
                <p className="success">
                  {uploadMessage}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ================= VIEW / EDIT MODAL ================= */}
        {selectedEmployee && (
          <div className="modal-overlay">
            <div className="modal large-modal">

              <div className="modal-header">
                <h3>
                  {isEditing
                    ? "Edit Employee"
                    : "Employee Details"}
                </h3>

                <button
                  onClick={() =>
                    setSelectedEmployee(
                      null
                    )
                  }
                >
                  <X size={20} />
                </button>
              </div>

              {isEditing ? (
                <>
                  {[
 "name",
 "email",
 "phone",

 "designation",
 "department",
 "location",

 "bloodGroup",
 "emergencyContact",

 "aadhaarNumber",
 "panNumber",

 "uan",
 "pfNumber",
 "esicNumber",

 "bankName",
 "accountHolderName",
 "accountNumber",
 "ifscCode",

 "highestQualification"
].map((field) => (
                    <input
                      key={field}
                      value={
                        selectedEmployee[
                          field
                        ] || ""
                      }
                      onChange={(e) =>
                        setSelectedEmployee({
                          ...selectedEmployee,
                          [field]:
                            e.target.value,
                        })
                      }
                      placeholder={
                        {
                          name: "Employee Name",
                          email: "Email",
                          phone: "Phone Number",
                      
                          designation: "Designation",
                          department: "Department",
                          location: "Location",
                      
                          bloodGroup: "Blood Group",
                          emergencyContact:
                            "Emergency Contact",
                      
                          aadhaarNumber:
                            "Aadhaar Number",
                      
                          panNumber:
                            "PAN Number",
                      
                          uan:
                            "UAN Number",
                      
                          pfNumber:
                            "PF Number",
                      
                          esicNumber:
                            "ESIC Number",
                      
                          bankName:
                            "Bank Name",
                      
                          accountHolderName:
                            "Account Holder Name",
                      
                          accountNumber:
                            "Account Number",
                      
                          ifscCode:
                            "IFSC Code",
                      
                          highestQualification:
                            "Highest Qualification",
                        }[field]
                      }
                    />
                  ))}

                  <select
                    value={selectedEmployee.managerId || ""}
                    onChange={(e) =>
                      setSelectedEmployee({
                        ...selectedEmployee,
                        managerId: e.target.value || null,
                      })
                    }
                  >
                    <option value="">Reporting Manager (optional)</option>
                    {employees
                      .filter((emp) => emp._id !== selectedEmployee._id)
                      .map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {emp.employeeCode} - {emp.name}
                        </option>
                      ))}
                  </select>

                  <input
                    type="date"
                    value={
                      selectedEmployee.dateOfJoining ||
                      ""
                    }
                    onChange={(e) =>
                      setSelectedEmployee({
                        ...selectedEmployee,
                        dateOfJoining:
                          e.target.value,
                      })
                    }
                  />

                  {!selectedEmployee.hasAppLogin ? (
                    <div className="employee-login-option full-width">
                      <label className="employee-login-toggle">
                        <input
                          type="checkbox"
                          checked={enableLoginOnUpdate}
                          onChange={(e) =>
                            setEnableLoginOnUpdate(e.target.checked)
                          }
                        />
                        <span>Enable app login for this employee</span>
                      </label>
                      {enableLoginOnUpdate ? (
                        <div className="employee-login-fields">
                          <select
                            value={selectedEmployee.userRole || "Employee"}
                            onChange={(e) =>
                              setSelectedEmployee({
                                ...selectedEmployee,
                                userRole: e.target.value,
                              })
                            }
                          >
                            <option value="Employee">Employee login</option>
                            <option value="Manager">Manager login</option>
                            <option value="HR">HR login</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Set password (optional)"
                            value={selectedEmployee.userPassword || ""}
                            onChange={(e) =>
                              setSelectedEmployee({
                                ...selectedEmployee,
                                userPassword: e.target.value,
                              })
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="employee-login-hint full-width">
                      App login is already enabled
                      {selectedEmployee.linkedUser?.email
                        ? ` (${selectedEmployee.linkedUser.email})`
                        : ""}
                      .
                    </p>
                  )}

                  <button
                  className="save-btn"
                    onClick={
                      handleUpdate
                    }
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <>
                <h4
  style={{
    color: "#2563eb",
    marginBottom: "20px",
  }}
>
  Edit Employee Information
</h4>
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
              </>
              )}
            </div>
          </div>
        )}

        {/* ================= APPOINTMENT LETTER MODAL ================= */}

{showLetterModal && (
  <div className="modal-overlay">
    <div className="modal large-modal">

      <div className="modal-header">
        <h3>
          Generate Appointment Letter
        </h3>

        <button
          onClick={() =>
            setShowLetterModal(false)
          }
        >
          <X size={20} />
        </button>
      </div>

      <div className="employee-form">

        <input
          required
          placeholder="Employee Name"
          value={
            letterData.employeeName
          }
          onChange={(e) =>
            setLetterData({
              ...letterData,
              employeeName:
                e.target.value,
            })
          }
        />

        <input
          required
          placeholder="Designation"
          value={
            letterData.designation
          }
          onChange={(e) =>
            setLetterData({
              ...letterData,
              designation:
                e.target.value,
            })
          }
        />

        <input
          required
          type="date"
          value={
            letterData.joiningDate
          }
          onChange={(e) =>
            setLetterData({
              ...letterData,
              joiningDate:
                e.target.value,
            })
          }
        />

        <input
          required
          placeholder="Annual CTC"
          value={
            letterData.annualCTC
          }
          onChange={(e) =>
            setLetterData({
              ...letterData,
              annualCTC:
                e.target.value,
            })
          }
        />

        <input
         required
          placeholder="Monthly Salary"
          value={
            letterData.monthlySalary
          }
          onChange={(e) =>
            setLetterData({
              ...letterData,
              monthlySalary:
                e.target.value,
            })
          }
        />

        <input
          required
          placeholder="Work Location"
          value={
            letterData.workLocation
          }
          onChange={(e) =>
            setLetterData({
              ...letterData,
              workLocation:
                e.target.value,
            })
          }
        />

<div className="full-width">
  <h4>
    Salary Structure
  </h4>
</div>

{letterData.salaryComponents.map(
  (item, index) => (
    <div
      key={index}
      className="salary-row"
    >
      <input
        placeholder="Component Name"
        value={
          item.componentName
        }
        onChange={(e) => {
          const updated = [
            ...letterData.salaryComponents,
          ];

          updated[index]
            .componentName =
            e.target.value;

          setLetterData({
            ...letterData,
            salaryComponents:
              updated,
          });
        }}
      />

      <input
        placeholder="Monthly"
        value={item.monthly}
        onChange={(e) => {
          const updated = [
            ...letterData.salaryComponents,
          ];

          updated[index]
            .monthly =
            e.target.value;

          setLetterData({
            ...letterData,
            salaryComponents:
              updated,
          });
        }}
      />

      <input
        placeholder="Annual"
        value={item.annual}
        onChange={(e) => {
          const updated = [
            ...letterData.salaryComponents,
          ];

          updated[index]
            .annual =
            e.target.value;

          setLetterData({
            ...letterData,
            salaryComponents:
              updated,
          });
        }}
      />

      <button
        type="button"
        onClick={() =>
          removeSalaryComponent(
            index
          )
        }
      >
        Remove
      </button>
    </div>
  )
)}

<button
  type="button"
  onClick={addSalaryComponent}
>
  + Add Component
</button>


        <button
          onClick={
            handleGenerateLetter
          }
        >
          {loading
            ? "Generating..."
            : "Generate Appointment Letter"}
        </button>

      </div>
    </div>
  </div>
)}

      </div>

      {showDocumentsModal && (
  <div className="modal-overlay">

    <div className="modal documents-modal">

 <div className="modal-header">
   <h3>Employee Documents</h3>

   <button
     onClick={() =>
       setShowDocumentsModal(false)
     }
   >
     <X size={20} />
   </button>
 </div>

 <div className="document-section">

   <div className="employee-doc-header">
     <span>Employee</span>
     <h4>
       {selectedEmployeeForDocs?.name}
     </h4>
   </div>

   <select
     className="document-select"
     value={documentType}
     onChange={(e) =>
       setDocumentType(
         e.target.value
       )
     }
   >
     <option value="PHOTO">
       Photo
     </option>

     <option value="AADHAAR">
       Aadhaar
     </option>

     <option value="PAN">
       PAN
     </option>

     <option value="EDUCATION">
       Education
     </option>

     <option value="BANK">
       Bank Proof
     </option>

     <option value="MEDICAL_CARD">
       Medical Card
     </option>

     <option value="SALARY_SLIP">
       Salary Slip
     </option>

     <option value="APPOINTMENT_LETTER">
       Appointment Letter
     </option>
   </select>

   <div className="file-upload-wrapper">
   <input
     type="file"
     className="file-input"
     onChange={(e) =>
       setDocumentFile(
         e.target.files[0]
       )
     }
   />
   </div>

   <button
     className="upload-btn"
     onClick={
       handleUploadDocument
     }
   >
     Upload Document
   </button>
   
   <div className="documents-list">

<h4>
  Uploaded Documents
</h4>

{!Array.isArray(employeeDocuments) ? (

  <p>Loading...</p>

) : employeeDocuments.length === 0 ? (

  <p>
    No documents uploaded
  </p>

) : (

  employeeDocuments.map((doc) => (

    <div
      key={doc._id}
      className="document-item"
    >
      <div>
        <strong>
          {doc.documentType}
        </strong>

        <br />

        <small>
          {doc.originalName}
        </small>
      </div>

      <button
        className="view-doc-btn"
        onClick={() =>
          viewDocument(
            doc._id
          )
        }
      >
        View
      </button>

    </div>

  ))

)}

</div>
 </div>

</div>
</div>
)}

        {loginCredentials ? (
          <div className="modal-overlay">
            <div className="modal credentials-modal">
              <div className="modal-header">
                <h3>App Login Details</h3>
                <button
                  type="button"
                  onClick={() => setLoginCredentials(null)}
                >
                  <X size={20} />
                </button>
              </div>

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

                {loginCredentials.temporaryPassword ? (
                  <div className="credentials-password-box">
                    <span>Temporary password (shown only once)</span>
                    <strong>{loginCredentials.temporaryPassword}</strong>
                    <p>
                      Share this with the employee. They must also use your
                      organization code on the login page.
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

              <button
                type="button"
                className="save-btn"
                onClick={() => setLoginCredentials(null)}
              >
                Done
              </button>
            </div>
          </div>
        ) : null}
    </MainLayout>
  );
}

export default Employees;