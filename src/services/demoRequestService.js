import API from "./apiClient";

export const submitDemoRequest = async (payload) => {
  const response = await API.post("/demo-requests", payload);
  return response.data;
};
