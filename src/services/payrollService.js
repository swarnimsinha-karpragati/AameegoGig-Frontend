import API from "./apiClient";

/* ==========================================
   1. PREVIEW SALARY DATA (generate-no-save)
   ========================================== */
export const previewPayroll = async (params) => {
  // params: { employeeId, vendorId, month, year }
  return API.get("/payroll/generate", { params });
};

/* ==========================================
   2. CALCULATE & SAVE SINGLE EMPLOYEE PAYROLL
   ========================================== */
export const calculateSinglePayroll = async (data) => {
  // data: { employeeId, vendorId, month, year }
  return API.post("/payroll/calculate", data);
};

/* ==========================================
   3. CALCULATE & SAVE BULK PAYROLL (ALL EMPLOYEES)
   ========================================== */
export const calculateBulkPayroll = async (data) => {
  // data: { vendorId, month, year }
  return API.post("/payroll/calculate-bulk", data);
};

/* ==========================================
   4. MANUAL PAYROLL ENTRY CREATION
   ========================================== */
export const createPayrollEntry = async (data) => {
  return API.post("/payroll/entries", data);
};

/* ==========================================
   5. GET ALL PAYROLL RECORDS (WITH FILTERS)
   ========================================== */
export const getAllPayrollRecords = async (params) => {
  // params: { vendorId, month, year }
  return API.get("/payroll/all", { params });
};

/* ==========================================
   6. GET PAYROLL BY EMPLOYEE CODE
   ========================================== */
export const getPayrollByEmployee = async (employeeCode) => {
  return API.get(`/payroll/employee/${employeeCode}`);
};

/* ==========================================
   7. GET SINGLE PAYROLL BY ID
   ========================================== */
export const getPayrollById = async (id) => {
  return API.get(`/payroll/${id}`);
};

/* ==========================================
   8. BULK UPLOAD PAYROLL VIA EXCEL FILE
   ========================================== */
export const bulkUploadPayrollEntries = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  return API.post(
    "/payroll/bulkPayrollUpload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
};