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
  "/departments": ["Admin", "HR"],
  "/sites": ["Admin", "HR"],
  "/employees": ["Admin", "HR"],
  "/attendance": ["Admin", "HR", "Manager", "Employee"],
  "/leave": ["Admin", "HR", "Manager", "Employee"],
  "/payroll": ["Admin", "HR", "Manager", "Employee"],
  "/documents": ["Admin", "HR", "Manager", "Employee"],
  "/expenses": ["Admin", "HR", "Manager", "Employee"],
  "/resignation": ["Admin", "HR", "Manager", "Employee"],
  "/settings": ["Admin", "HR", "Manager", "Employee"],
};

export const GRANTABLE_MODULES = [
  { key: "attendance", label: "Attendance", path: "/attendance" },
  { key: "leave", label: "Leave", path: "/leave" },
  { key: "payroll", label: "Payroll", path: "/payroll" },
  { key: "expenses", label: "Expenses", path: "/expenses" },
  { key: "documents", label: "Documents", path: "/documents" },
  { key: "resignation", label: "Resignation", path: "/resignation" },
  { key: "employees", label: "Employees", path: "/employees" },
  { key: "departments", label: "Departments / Sites", path: "/departments" },
];

const ALWAYS_ON_MODULES = ["dashboard", "settings"];

const MODULE_BY_PATH = {
  "/dashboard": "dashboard",
  "/departments": "departments",
  "/sites": "departments",
  "/employees": "employees",
  "/attendance": "attendance",
  "/leave": "leave",
  "/payroll": "payroll",
  "/documents": "documents",
  "/expenses": "expenses",
  "/resignation": "resignation",
  "/settings": "settings",
};

export const normalizeAppPath = (pathname = "") => {
  if (ROUTE_ACCESS[pathname]) return pathname;
  const segments = String(pathname).split("/").filter(Boolean);
  if (segments.length > 1) {
    return `/${segments.slice(1).join("/")}`;
  }
  return pathname || "/";
};

export const grantableModulesForRole = (role) =>
  GRANTABLE_MODULES.filter((item) => {
    const allowed = ROUTE_ACCESS[item.path];
    return !allowed || allowed.includes(role);
  });

export const defaultSelectedModules = (role, storedModules) => {
  const grantable = grantableModulesForRole(role).map((item) => item.key);
  if (!Array.isArray(storedModules)) return grantable;
  return grantable.filter((key) => storedModules.includes(key));
};

export const canAccessRoute = (role, path, allowedModules) => {
  const appPath = normalizeAppPath(path);
  const allowedRoles = ROUTE_ACCESS[appPath];
  if (allowedRoles && !allowedRoles.includes(role)) return false;

  const moduleKey = MODULE_BY_PATH[appPath];
  if (!moduleKey || ALWAYS_ON_MODULES.includes(moduleKey)) return true;
  if (!Array.isArray(allowedModules)) return true;
  return allowedModules.includes(moduleKey);
};

export const DASHBOARD_STAT_MODULE = {
  employees: "employees",
  attendance: "attendance",
  leave: "leave",
  balance: "leave",
  expense: "expenses",
};

export const userHasModule = (userOrRole, moduleKey, allowedModules) => {
  const role = typeof userOrRole === "string" ? userOrRole : userOrRole?.role;
  const modules = Array.isArray(allowedModules)
    ? allowedModules
    : userOrRole?.allowedModules;
  const canonical = moduleKey === "expense" ? "expenses" : moduleKey;
  if (role === "Admin") return true;
  if (ALWAYS_ON_MODULES.includes(canonical)) return true;
  if (!Array.isArray(modules)) return true;
  return (
    modules.includes(canonical) ||
    (canonical === "expenses" && modules.includes("expense"))
  );
};

export const visibleDashboardStats = (
  stats,
  user,
  allowedModules,
  counts = {}
) => {
  const has = (key) => userHasModule(user, key, allowedModules);
  return (stats || [])
    .map((stat) => {
      if (stat.key !== "pending") return stat;
      const hasLeave = has("leave");
      const hasExpense = has("expenses");
      if (!hasLeave && !hasExpense) return null;
      const leave = hasLeave ? counts.leave || 0 : 0;
      const expense = hasExpense ? counts.expense || 0 : 0;
      const parts = [];
      if (hasLeave) parts.push(`${leave} leave`);
      if (hasExpense) parts.push(`${expense} expense`);
      return { ...stat, value: leave + expense, subtitle: parts.join(" · ") };
    })
    .filter(Boolean)
    .filter((stat) => {
      if (stat.key === "pending") return true;
      const moduleKey = DASHBOARD_STAT_MODULE[stat.key];
      if (!moduleKey) return true;
      return has(moduleKey);
    });
};

export const getDefaultRouteForRole = (role, allowedModules) => {
  if (canAccessRoute(role, "/dashboard", allowedModules)) return "/dashboard";
  if (canAccessRoute(role, "/attendance", allowedModules)) return "/attendance";
  return "/login";
};

export const getAttendanceViewKey = (role) => {
  if (role === "Admin") return "Organization";
  if (role === "HR") return "HR";
  if (role === "Manager") return "Employee";
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

export const hasLinkedEmployeeProfile = (user) => Boolean(user?.employeeId);

export const canApproveExpenses = (role) =>
  role === "Admin" || role === "HR" || role === "Manager";

export const canManageExpensePolicy = (role) =>
  role === "Admin" || role === "HR";

export const getExpenseViewKey = (role) => {
  if (role === "Admin") return "Organization";
  if (role === "HR") return "HR";
  if (role === "Manager") return "Manager";
  return "Employee";
};
