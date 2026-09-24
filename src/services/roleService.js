import API from "./apiClient";

export const getRoles = async () => {
  const res = await API.get("/roles");
  return res.data?.roles || [];
};

// Fresh personal access snapshot (works for every authenticated user).
export const getSession = async () => {
  const res = await API.get("/auth/session");
  return res.data || null;
};

export const seedRoles = () => API.post("/roles/seed");

export const createRole = (payload) => API.post("/roles", payload);

export const updateRole = (id, payload) => API.put(`/roles/${id}`, payload);

export const deleteRole = (id) => API.delete(`/roles/${id}`);