const idOf = (value) => {
  if (!value) return null;
  if (typeof value === "object") {
    const id = value._id || value.id;
    return id ? String(id) : null;
  }
  return String(value);
};

export const expenseEmployeeId = (expense) => idOf(expense?.employeeId);

export const viewerEmployeeId = (user) => idOf(user?.employeeId);

/** Same employee record — id only. Matching on display name hid Approve/Reject for teammates. */
export const isViewerExpense = (expense, user) => {
  const expenseId = expenseEmployeeId(expense);
  const viewerId = viewerEmployeeId(user);
  return Boolean(expenseId && viewerId && expenseId === viewerId);
};

/**
 * Which buttons belong on an expense row.
 * Team pending approvals (`actionMode: "approve"`) always get Approve + Reject
 * unless the row is the viewer's own claim.
 */
export const expenseRowActions = ({ actionMode, status, isOwn }) => {
  if (actionMode === "owner") {
    if (status === "Draft") return ["submit", "delete"];
    if (status === "Pending") return ["cancel"];
    return [];
  }
  if (isOwn) return [];
  if ((actionMode === "approve" || actionMode === "full") && status === "Pending") {
    return ["approve", "reject"];
  }
  if ((actionMode === "reimburse" || actionMode === "full") && status === "Approved") {
    return ["reimburse"];
  }
  return [];
};
