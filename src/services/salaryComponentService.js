import API from "./apiClient";

/* =========================
   ORG COMPONENT LIBRARY
========================= */
export const getSalaryComponents = async (includeInactive = false) => {
  return API.get("/salary-components/components", {
    params: { includeInactive },
  });
};

export const createSalaryComponent = async (data) => {
  return API.post("/salary-components/components", data);
};

export const updateSalaryComponent = async (code, data) => {
  return API.put(`/salary-components/components/${code}`, data);
};

export const deleteSalaryComponent = async (code) => {
  return API.delete(`/salary-components/components/${code}`);
};

export const reorderSalaryComponents = async (orderedCodes) => {
  return API.post("/salary-components/components/reorder", { orderedCodes });
};

export const getSalaryTemplates = async () => {
  return API.get("/salary-components/templates");
};

export const applySalaryTemplate = async (templateKey) => {
  return API.post("/salary-components/templates/apply", { templateKey });
};

/* =========================
   EMPLOYEE SALARY STRUCTURE
========================= */
export const getEmployeeStructure = async (employeeId) => {
  return API.get(`/salary-components/structure/${employeeId}`);
};

export const getEmployeeStructureHistory = async (employeeId) => {
  return API.get(`/salary-components/structure/${employeeId}/history`);
};

export const saveEmployeeStructure = async (employeeId, data) => {
  return API.post(`/salary-components/structure/${employeeId}`, data);
};

export const migrateEmployeeStructure = async (employeeId) => {
  return API.post(`/salary-components/structure/${employeeId}/migrate`);
};

export const getCtcPresets = async () => {
  return API.get("/salary-components/ctc-presets");
};

export const suggestCtcSplit = async (annualCTC, preset = "india_standard") => {
  return API.post("/salary-components/ctc-split", { annualCTC, preset });
};
