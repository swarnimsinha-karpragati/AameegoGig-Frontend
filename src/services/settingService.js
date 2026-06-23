import API from "./apiClient";

export const createShift = async (data) => {
  return API.post("/setting/createShift", data);
};

export const getShift = (vendorId) => {
  return API.get(`/setting/getShift/${vendorId}`);
};

export const updateShift = async (shiftId, data) => {
  return API.put(`/setting/updateShift/${shiftId}`, data);
}

export const deleteShift = async (shiftId) => {
  return API.delete(`/setting/deleteShift/${shiftId}`);
}

export const getOvertimePolicies = (vendorId) => {
  return API.get(`/setting/getOvertimePolicies/${vendorId}`);
};


export const createOvertimePolicy  = async (data) => {
  return API.post("/setting/createOvertimePolicy", data);
};

export const deleteOvertimePolicy = async (policyId) => {
  return API.delete(`/setting/deleteOvertimePolicy/${policyId}`);
};

export const updateOvertimePolicy = async (policyId, data) => {
  return API.put(`/setting/updateOvertimePolicy/${policyId}`, data);
};

export const getWeekOffs = (vendorId) => {
  return API.get(`/setting/getWeekOffs/${vendorId}`);
};

export const createWeekOff = async (data) => {
  return API.post("/setting/createWeekOff", data);
};

export const updateWeekOff = async (weekOffId, data) => {
  return API.put(`/setting/updateWeekOff/${weekOffId}`, data);
};

export const deleteWeekOff = async (weekOffId) => {
  return API.delete(`/setting/deleteWeekOff/${weekOffId}`);
};