import API from "./apiClient";

export const getRegularizationDashboard = async () =>
  (await API.get("/regularization/dashboard")).data;

export const listRegularizationRequests = async (params = {}) =>
  (await API.get("/regularization/requests", { params })).data;

export const createRegularizationRequest = async (payload) =>
  (await API.post("/regularization/requests", payload)).data;

export const approveRegularizationRequest = async (id, comment = "") =>
  (await API.patch(`/regularization/requests/${id}/approve`, { comment })).data;

export const rejectRegularizationRequest = async (id, comment) =>
  (await API.patch(`/regularization/requests/${id}/reject`, { comment })).data;

export const cancelRegularizationRequest = async (id, cancelReason) =>
  (await API.patch(`/regularization/requests/${id}/cancel`, { cancelReason })).data;

export const directEditAttendance = async (payload) =>
  (await API.post("/regularization/direct/attendance", payload)).data;

export const directEditLeave = async (leaveRequestId, payload) =>
  (await API.patch(`/regularization/direct/leave/${leaveRequestId}`, payload)).data;
