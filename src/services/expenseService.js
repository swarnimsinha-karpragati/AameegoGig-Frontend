import API from "./apiClient";

/* ── Dashboard ── */
export const getExpenseDashboard = async () => {
  const res = await API.get("/expenses/dashboard");
  return res.data;
};

/* ── List / Detail ── */
export const getExpenses = async (params = {}) => {
  const res = await API.get("/expenses", { params });
  return res.data;
};

export const getExpenseById = async (id) => {
  const res = await API.get(`/expenses/${id}`);
  return res.data;
};

/* ── Create / Update ── */
export const createExpense = async (formData) => {
  const res = await API.post("/expenses", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const updateExpense = async (id, formData) => {
  const res = await API.put(`/expenses/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

/* ── Workflow ── */
export const submitExpense = async (id) => {
  const res = await API.patch(`/expenses/${id}/submit`);
  return res.data;
};

export const approveExpense = async (id, comment = "") => {
  const res = await API.patch(`/expenses/${id}/approve`, { comment });
  return res.data;
};

export const rejectExpense = async (id, comment = "") => {
  const res = await API.patch(`/expenses/${id}/reject`, { comment });
  return res.data;
};

export const markReimbursed = async (id) => {
  const res = await API.patch(`/expenses/${id}/reimburse`);
  return res.data;
};

export const deleteExpense = async (id) => {
  const res = await API.delete(`/expenses/${id}`);
  return res.data;
};

/* ── Policy ── */
export const getExpensePolicy = async () => {
  const res = await API.get("/expenses/policy");
  return res.data;
};

export const updateExpensePolicy = async (data) => {
  const res = await API.put("/expenses/policy", data);
  return res.data;
};

/* ── Receipt URL builder ── */
export const getReceiptUrl = (expenseId) => {
  const token = localStorage.getItem("token");
  return `${API.defaults.baseURL}/expenses/${expenseId}/receipt?token=${token}`;
};
