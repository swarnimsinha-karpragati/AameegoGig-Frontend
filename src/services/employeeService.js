import API from "./apiClient";

const EMPLOYEE_PAYLOAD_FIELDS = [
  // employeeCode is generated server-side (PREFIX-0001), never sent from here.
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
  "client",
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

  const modules = extras.allowedModules ?? data.allowedModules;
  if (Array.isArray(modules)) {
    payload.allowedModules = modules;
  }

  if (data.email) {
    payload.email = String(data.email).trim().toLowerCase();
  }

  return payload;
};

/* =========================
   GET ALL EMPLOYEES
========================= */
export const getEmployees = async (params = {}) => {
  return API.get("/employees", { params });
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

