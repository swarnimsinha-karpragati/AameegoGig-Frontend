import API from "./apiClient";

export const getLeaveDashboard = async () => {
  const res = await API.get("/leave/dashboard");
  return res.data;
};

export const getLeaveRequests = async (status) => {
  const res = await API.get("/leave/requests", {
    params: status ? { status } : {},
  });
  return res.data;
};

export const createLeaveRequest = async (payload) => {
  const res = await API.post("/leave/requests", payload);
  return res.data;
};

export const createLeaveRequestMultipart = async (formData) => {
  // Do not set Content-Type manually; axios will add correct multipart boundary.
  const res = await API.post("/leave/requests", formData);
  return res.data;
};

export const approveLeaveRequest = async (id, comment = "") => {
  const res = await API.patch(`/leave/requests/${id}/approve`, { comment });
  return res.data;
};

export const rejectLeaveRequest = async (id, comment = "") => {
  const res = await API.patch(`/leave/requests/${id}/reject`, { comment });
  return res.data;
};

export const cancelLeaveRequest = async (id) => {
  const res = await API.patch(`/leave/requests/${id}/cancel`);
  return res.data;
};

export const getLeaveBalances = async (employeeId) => {
  const res = await API.get("/leave/balances", {
    params: employeeId ? { employeeId } : {},
  });
  return res.data;
};

export const updateLeaveBalances = async (employeeId, payload) => {
  const res = await API.put(`/leave/balances/${employeeId}`, payload);
  return res.data;
};

export const getLeavePolicy = async () => {
  const res = await API.get("/leave/policy");
  return res.data;
};

export const updateLeavePolicy = async (payload) => {
  const res = await API.put("/leave/policy", payload);
  return res.data;
};

export const applyLeavePolicyTemplate = async (templateKey) => {
  const res = await API.post("/leave/policy/apply-template", { templateKey });
  return res.data;
};
