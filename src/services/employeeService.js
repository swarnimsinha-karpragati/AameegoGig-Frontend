import API from "./apiClient";

const EMPLOYEE_PAYLOAD_FIELDS = [
  // Optional manual code (blank auto-generates server-side from the shared
  // per-vendor series). Normalized below to match generated codes.
  "employeeCode",
  "name",
  "email",
  "phone",
  "designation",
  "departmentId",
  "department",
  "location",
  "dob",
  "bloodGroup",
  "emergencyContact",
  "gender",
  "fatherHusbandName",
  "relationWithMember",
  "nationality",
  "maritalStatus",
  "permanentAddress",
  "aadhaarNumber",
  "nameAsPerAadhaar",
  "panNumber",
  "nameAsPerPan",
  "uan",
  "pfNumber",
  "esicNumber",
  "bankName",
  "accountHolderName",
  "accountNumber",
  "ifscCode",
  "highestQualification",
  "dateOfJoining",
  "relievingDate",
  "managerId",
  "peopleManagerId",
  "client",
  "isConsultancy",
  "monthlyConsultancyPay",
  "tdsPercent",
  "state",
  "ctc",
  "ctcStructureName",
  "basicSalary",
  "hra",
  "conveyanceAllowance",
  "incentive",
  "otherAllowance",
  "professionalTax",
  "payType",
  "employmentStatus",
  "probationStartDate",
  "probationEndDate",
  "confirmationDate",
];

export const buildEmployeePayload = (data, extras = {}) => {
  const payload = {};

  EMPLOYEE_PAYLOAD_FIELDS.forEach((field) => {
    const value = data[field];
    if (value !== undefined && value !== null && value !== "") {
      payload[field] = value;
    }
  });

  if (data.managerId === "" || data.managerId === null) {
    payload.managerId = null;
  } else if (data.managerId) {
    payload.managerId =
      typeof data.managerId === "object"
        ? data.managerId._id
        : data.managerId;
  }

  if (data.peopleManagerId === "" || data.peopleManagerId === null) {
    payload.peopleManagerId = null;
  } else if (data.peopleManagerId) {
    payload.peopleManagerId =
      typeof data.peopleManagerId === "object"
        ? data.peopleManagerId._id
        : data.peopleManagerId;
  }

  const shouldCreateLogin =
    extras.createAppLogin === true || data.createAppLogin === true;

  if (shouldCreateLogin) {
    payload.createAppLogin = true;
    payload.userRole = extras.userRole || data.userRole || "Employee";
    const password = extras.userPassword ?? data.userPassword;
    if (password) {
      payload.userPassword = password;
    }
  }

  // Always sent when present (even empty) so removing every member clears the list.
  if (Array.isArray(data.familyMembers)) {
    payload.familyMembers = data.familyMembers;
  }

  const modules = extras.allowedModules ?? data.allowedModules;
  if (Array.isArray(modules)) {
    payload.allowedModules = modules;
  }

  if (data.email) {
    payload.email = String(data.email).trim().toLowerCase();
  }

  if (payload.employeeCode) {
    payload.employeeCode = String(payload.employeeCode).trim().toUpperCase();
    if (!payload.employeeCode) delete payload.employeeCode;
  }

  return payload;
};

/* =========================
   GET ALL EMPLOYEES
========================= */
export const getEmployees = async (params = {}) => {
  const mergedParams = { isPagination: "false", ...params };
  return API.get("/employees", { params: mergedParams });
};

export const searchEmployees = async (params = {}) => {
  return API.get("/employees/search", { params });
};

/* =========================
   EXPORT ALL EMPLOYEES (backend-generated Excel, complete details)
========================= */
export const exportEmployees = async (params = {}) => {
  return API.get("/employees/export", { params, responseType: "blob" });
};

/* =========================
   ADD SINGLE EMPLOYEE
========================= */
export const addEmployee = async (data) => {
  return API.post("/employees", data);
};

/* =========================
   BULK UPLOAD EMPLOYEES
========================= */
export const bulkUploadEmployees = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  return API.post(
    "/employees/bulk-upload",
    formData,
    {
      headers: {
        "Content-Type":
          "multipart/form-data",
      },
    }
  );
};

/* =========================
   UPDATE EMPLOYEE
========================= */
export const updateEmployee = async (
  id,
  data
) => {
  return API.put(
    `/employees/${id}`,
    data
  );
};

/* =========================
   DELETE EMPLOYEE
========================= */
export const deleteEmployee = async (
  id
) => {
  return API.delete(
    `/employees/${id}`
  );
};

export const getUnlinkedUsers = async () => {
  return API.get("/employees/unlinked-users");
};

export const linkUserToEmployee = async (employeeId, userId) => {
  return API.patch(`/employees/${employeeId}/link-user`, { userId });
};

export const getVendorName = async (vendorId) => {
  return API.get(`/employees/get-vendor-name/${vendorId}`);
};

/* =========================
   TOGGLE APP LOGIN ACCESS (ENABLE / DISABLE)
========================= */
export const toggleAppLogin = async (id, enable) => {
  return API.patch(`/employees/${id}/app-login`, { isActive: enable });
};

/* =========================
   RESEND CREDENTIALS (new password + email, or loginInfo for Excel download)
========================= */
export const resendCredentials = async (id) => {
  return API.post(`/employees/${id}/send-credentials`);
};

/* =========================
   CONVERT CONSULTANT → EMPLOYEE (dedicated API)
========================= */
export const convertToEmployee = async (id) => {
  return API.patch(`/employees/${id}/convert-to-employee`);
};

/* =========================
   CONVERT EMPLOYEE → CONSULTANT (reverse; bug 265)
========================= */
export const convertToConsultant = async (id, payload = {}) => {
  return API.patch(`/employees/${id}/convert-to-consultant`, payload);
};

