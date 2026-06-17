import API from "./apiClient";

export const createShift = async (data) => {
  return API.post("/setting/createShift", data);
};

export const getShift = (vendorId) => {
  return API.get(`/setting/getShift/${vendorId}`);
};