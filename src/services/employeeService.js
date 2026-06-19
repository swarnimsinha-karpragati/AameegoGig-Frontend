import API from "./apiClient";

const EMPLOYEE_PAYLOAD_FIELDS = [
  "employeeCode",
  "name",
  "email",
  "phone",
  "designation",
  "department",
  "location",
  "dob",
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
  "highestQualification",
  "dateOfJoining",
  "managerId",
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

  if (data.email) {
    payload.email = String(data.email).trim().toLowerCase();
  }

  return payload;
};

/* =========================
   GET ALL EMPLOYEES
========================= */
export const getEmployees = async () => {
  return API.get("/employees");
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