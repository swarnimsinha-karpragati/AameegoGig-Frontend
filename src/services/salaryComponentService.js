import API from "./apiClient";

/* =========================
   ORG COMPONENT LIBRARY
========================= */
export const getSalaryComponents = async (includeInactive = false, componentType = null) => {
  const params = { includeInactive };
  if (componentType) params.componentType = componentType;
  return API.get("/salary-components/components", { params });
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

export const previewEmployeeStructure = async (employeeId, draftPayload = null) => {
  if (draftPayload) {
    return API.post(`/salary-components/structure/${employeeId}/preview`, draftPayload);
  }
  return API.get(`/salary-components/structure/${employeeId}/preview`);
};

export const getCtcPresets = async () => {
  return API.get("/salary-components/ctc-presets");
};

export const suggestCtcSplit = async (annualCTC, preset = "india_standard") => {
  return API.post("/salary-components/ctc-split", { annualCTC, preset });
};

/* =========================
   SALARY STRUCTURE TEMPLATES
========================= */
export const getStructure = async (vendorId) => {
  return API.get(`/salary-components/structure/${vendorId}/salary-structure`);
};

export const createSalaryStructure = async (payload) => {
  return API.post(`/salary-components/structure/${payload.vendorId}/salary-structure`, payload);
};

export const updateSalaryStructure = async (vendorId, structureId, payload) => {
  return API.put(`/salary-components/structure/${vendorId}/salary-structure/${structureId}`, payload);
};

export const deleteSalaryStructure = async (vendorId, structureId) => {
  return API.delete(`/salary-components/structure/${vendorId}/salary-structure/${structureId}`);
};

export const calculateStructureSplit = async (vendorId, payload) => {
  return API.post(`/salary-components/structure/${vendorId}/calculate-split`, payload);
};
