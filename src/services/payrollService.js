import API from "./apiClient";

export const previewPayroll = async (params) => {
  return API.get("/payroll/generate", { params });
};

export const calculateSinglePayroll = async (data) => {
  return API.post("/payroll/calculate", data);
};

export const calculateBulkPayroll = async (data) => {
  return API.post("/payroll/calculate-bulk", data);
};

export const createPayrollEntry = async (data) => {
  return API.post("/payroll/entries", data);
};

export const getAllPayrollRecords = async (params) => {
  return API.get("/payroll/all", { params });
};

export const getMyPayrollRecords = async () => {
  return API.get("/payroll/my-payroll");
};

export const getPayrollByEmployee = async (employeeCode) => {
  return API.get(`/payroll/employee/${employeeCode}`);
};

export const getPayrollById = async (id) => {
  return API.get(`/payroll/${id}`);
};

export const bulkUploadPayrollEntries = async (file, month, year) => {
  const formData = new FormData();
  formData.append("file", file);
  if (month) formData.append("month", month);
  if (year) formData.append("year", year);

  return API.post("/payroll/bulkPayrollUpload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const createPayrollRun = async (data) => {
  return API.post("/payroll/runs", data);
};

export const listPayrollRuns = async (params) => {
  return API.get("/payroll/runs", { params });
};

export const getPayrollRun = async (id) => {
  return API.get(`/payroll/runs/${id}`);
};

export const calculatePayrollRun = async (id) => {
  return API.post(`/payroll/runs/${id}/calculate`);
};

export const approvePayrollRun = async (id, comment) => {
  return API.post(`/payroll/runs/${id}/approve`, { comment });
};

export const rejectPayrollRun = async (id, comment) => {
  return API.post(`/payroll/runs/${id}/reject`, { comment });
};

export const processPayrollRun = async (id) => {
  return API.post(`/payroll/runs/${id}/process`);
};

export const sendRunPayslips = async (id) => {
  return API.post(`/payroll/runs/${id}/send-payslips`);
};

export const getRunExceptions = async (id) => {
  return API.get(`/payroll/runs/${id}/exceptions`);
};

export const downloadServerPayslip = async (id) => {
  return API.get(`/payroll/${id}/payslip`, { responseType: "blob" });
};

export const sendPayslipEmail = async (id) => {
  return API.post(`/payroll/${id}/send-payslip`);
};

export const reopenPayroll = async (id) => {
  return API.post(`/payroll/${id}/reopen`);
};

export const getPayrollConfig = async () => {
  return API.get("/payroll/config");
};

export const updatePayrollConfig = async (data) => {
  return API.put("/payroll/config", data);
};

export const getPayments = async (params) => {
  return API.get("/payroll/payments", { params });
};

export const updatePayment = async (id, data) => {
  return API.patch(`/payroll/payments/${id}`, data);
};

export const getPtStates = async () => {
  return API.get("/payroll/pt-states");
};

export const addPayrollAdjustment = async (payrollId, data) => {
  return API.post(`/payroll/${payrollId}/adjustments`, data);
};

export const removePayrollAdjustment = async (payrollId, adjustmentId) => {
  return API.delete(`/payroll/${payrollId}/adjustments/${adjustmentId}`);
};

export const getPayrollSummary = async (params) => {
  return API.get("/payroll/reports/summary", { params });
};

export const exportPayrollSummary = async (params) => {
  return API.get("/payroll/reports/summary/export", {
    params,
    responseType: "blob",
  });
};
