import API from "./apiClient";

export const getAssets = (params = {}) => API.get("/assets", { params });
export const getMyAssets = () => API.get("/assets/my");
export const createAsset = (payload) => API.post("/assets", payload);
export const updateAsset = (id, payload) => API.put(`/assets/${id}`, payload);
export const deleteAsset = (id) => API.delete(`/assets/${id}`);
export const assignAsset = (id, payload) => API.post(`/assets/${id}/assign`, payload);
export const returnAsset = (id, payload) => API.post(`/assets/${id}/return`, payload);
