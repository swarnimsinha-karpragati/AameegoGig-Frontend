import API from "./apiClient";

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