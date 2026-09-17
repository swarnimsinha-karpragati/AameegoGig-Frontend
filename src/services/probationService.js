import API from "./apiClient";

export const getProbationPolicy = async () => {
  const res = await API.get("/probation/policy");
  return res.data;
};

export const updateProbationPolicy = async (payload) => {
  const res = await API.put("/probation/policy", payload);
  return res.data;
};

export const confirmProbationEmployee = async (employeeId, remark = "") => {
  const res = await API.patch(`/probation/employees/${employeeId}/confirm`, { remark });
  return res.data;
};

export const extendProbationEmployee = async (employeeId, extraMonths, remark = "") => {
  const res = await API.patch(`/probation/employees/${employeeId}/extend`, { extraMonths, remark });
  return res.data;
};

export const getMyProbationHistory = async () => {
  const res = await API.get("/probation/my-history");
  return res.data;
};

export const getEmployeeProbationHistory = async (employeeId) => {
  const res = await API.get(`/probation/employees/${employeeId}/history`);
  return res.data;
};
