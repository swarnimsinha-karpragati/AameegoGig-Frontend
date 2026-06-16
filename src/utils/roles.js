export const ROLES = {
  ADMIN: "Admin",
  HR: "HR",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
};

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

export const getRoleLabel = (role) => {
  const labels = {
    Admin: "Administrator",
    HR: "HR",
    Manager: "Manager",
    Employee: "Employee",
  };
  return labels[role] || role || "User";
};

export const ROUTE_ACCESS = {
  "/dashboard": ["Admin", "HR", "Manager", "Employee"],
  "/employees": ["Admin", "HR"],
  "/attendance": ["Admin", "HR", "Manager", "Employee"],
  "/leave": ["Admin", "HR", "Manager", "Employee"],
  "/payroll": ["Admin", "HR"],
  "/documents": ["Admin", "HR", "Manager", "Employee"],
  "/settings": ["Admin", "HR", "Manager", "Employee"],
};

export const canAccessRoute = (role, path) => {
  const allowed = ROUTE_ACCESS[path];
  if (!allowed) return true;
  return allowed.includes(role);
};

export const getDefaultRouteForRole = (role) => {
  if (canAccessRoute(role, "/dashboard")) return "/dashboard";
  if (canAccessRoute(role, "/attendance")) return "/attendance";
  return "/login";
};

export const getAttendanceViewKey = (role) => {
  if (role === "Admin") return "Organization";
  if (role === "HR") return "HR";
  if (role === "Manager") return "Manager";
  return "Employee";
};

export const getLeaveViewKey = (role) => {
  if (role === "Admin") return "Organization";
  if (role === "HR") return "HR";
  if (role === "Manager") return "Manager";
  return "Employee";
};

export const canMarkAttendance = (role) =>
  role === "Admin" || role === "HR" || role === "Manager";

export const canManageEmployees = (role) =>
  role === "Admin" || role === "HR";

export const canEditLeaveBalances = (role) =>
  role === "Admin" || role === "HR";
