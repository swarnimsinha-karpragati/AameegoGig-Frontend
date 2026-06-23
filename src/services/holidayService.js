import API from "./apiClient";

export const getHolidays = async ({ vendorId, year, month, department } = {}) => {
  const params = new URLSearchParams();
  if (vendorId) params.set("vendorId", vendorId);
  if (year) params.set("year", year);
  if (month) params.set("month", month);
  if (department) params.set("department", department);

  const query = params.toString();
  return API.get(`/holidays${query ? `?${query}` : ""}`);
};

export const createHoliday = async (data) => {
  return API.post("/holidays", data);
};

export const updateHoliday = async (holidayId, data) => {
  return API.put(`/holidays/${holidayId}`, data);
};

export const deleteHoliday = async (holidayId) => {
  return API.delete(`/holidays/${holidayId}`);
};
