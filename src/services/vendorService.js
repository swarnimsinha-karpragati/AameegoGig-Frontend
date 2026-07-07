import API from "./apiClient";

export const getOrgProfile = () => API.get("/vendor/profile");

export const updateOrgProfile = (payload) => API.put("/vendor/profile", payload);

export const uploadOrgLogo = (file) => {
  const formData = new FormData();
  formData.append("logo", file);
  return API.post("/vendor/logo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
