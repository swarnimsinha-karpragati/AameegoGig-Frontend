import API from "./apiClient";

export const getMyProfile = () => API.get("/profile");

export const updateMyProfile = (payload) => API.put("/profile", payload);

export const uploadMyProfilePhoto = (file) => {
  const formData = new FormData();
  formData.append("photo", file);
  return API.post("/profile/photo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
