import API from "./apiClient";

export const createDepartment = async (data) => {
  return API.post("/department/createDepartment", data);
};

export const getDepartments = async (vendorId) => {
  return API.get(`/department/getDepartments/${vendorId}`);
};

export const updateDepartment = async (vendorId, data) => {
  return API.put(`/department/updateDepartment/${vendorId}`, data);
};

export const deleteDepartment = async (vendorId) => {
  return API.delete(`/department/deleteDepartment/${vendorId}`);
};

export const getOtPolicies = async (vendorId) => {
  console.log("Fetching OT policies for vendor ID:", vendorId);
  return API.get(`/department/getOtPolicies/${vendorId}`);
};

export const getShifts = async (vendorId) => {
  return API.get(`/department/getShifts/${vendorId}`);
};

export const getEmployees = async (vendorId) => {
  return API.get(`/department/getEmployees/${vendorId}`);
};

export const getDepartmentName = async (vendorId) => {
  return API.get(`/department/getDepartmentName/${vendorId}`);
};

