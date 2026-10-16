import API from "./apiClient";

export const getOrgProfile = () => API.get("/vendor/profile");

export const updateOrgProfile = (payload) => API.put("/vendor/profile", payload);

/** -> { data: { autoMarkAttendance } } */
export const getAttendanceSettings = () => API.get("/vendor/attendance-settings");

export const updateAttendanceSettings = (payload) => API.put("/vendor/attendance-settings", payload);

export const uploadOrgLogo = (file) => {
  const formData = new FormData();
  formData.append("logo", file);
  // Do NOT set Content-Type manually: the browser must add the multipart
  // boundary. A hard-coded "multipart/form-data" has no boundary, so the
  // server cannot parse the upload and req.file ends up undefined.
  return API.post("/vendor/logo", formData);
};

/** Letter branding images: kind is "signature" or "stamp". -> { data: branding fields } */
export const uploadOrgBrandingImage = (kind, file) => {
  const formData = new FormData();
  formData.append(kind, file);
  return API.post(`/vendor/${kind}`, formData);
};
