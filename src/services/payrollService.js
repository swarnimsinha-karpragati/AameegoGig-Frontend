import API from "./apiClient";

// export const getPayrollById = (
//   payrollId
// ) => {
//   return axios.get(
//     `/api/payroll/${payrollId}`
//   );
// };

/* =========================
   ADD SINGLE EMPLOYEE
========================= */
export const createPayrollEntry = async (data) => {
  return API.post("/payroll/entries", data);
};

/* =========================
   BULK UPLOAD PAYROLL ENTRIES
========================= */
// export const createBulkPayrollEntry = async (data) => {
//   return API.post("/payroll/bulk", data);
// };

// export const createBulkPayrollEntry = async (data) => {
//   return API.post("/payroll/bulkPayrollUpload", data);
// };



export const bulkUploadPayrollEntries = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  return API.post(
    "/payroll/bulkPayrollUpload",
    formData,
    {
      headers: {
        "Content-Type":
          "multipart/form-data",
      },
    }
  );
};

export const getPaymentHistory = () => {
  return API.get("/payments/all");
};

export const getSalarySlip = (data) => {
  return API.get("/payroll/generate", data)
}