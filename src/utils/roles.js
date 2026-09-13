import { loadRoles, BASELINE_PERMISSIONS } from "./permissions";

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
  "/regularization": ["Admin", "HR", "Manager", "Employee"],
  "/payroll": ["Admin", "HR", "Manager", "Employee"],
  "/documents": ["Admin", "HR", "Manager", "Employee"],
  "/expenses": ["Admin", "HR", "Manager", "Employee"],
  "/resignation": ["Admin", "HR", "Manager", "Employee"],
  "/advance-loan": ["Admin", "HR", "Manager", "Employee"],
  "/loan-config": ["Admin", "HR"],
  "/settings": ["Admin", "HR", "Manager", "Employee"],
};

export const GRANTABLE_MODULES = [
  { key: "attendance", label: "Attendance", path: "/attendance" },
  { key: "leave", label: "Leave", path: "/leave" },
  { key: "payroll", label: "Payroll", path: "/payroll" },
  { key: "expenses", label: "Expenses", path: "/expenses" },
  { key: "documents", label: "Documents", path: "/documents" },
  { key: "resignation", label: "Resignation", path: "/resignation" },
  { key: "advance-loan", label: "Advance Loan", path: "/advance-loan" },
  { key: "loan-config", label: "Loan Configuration", path: "/loan-config" },
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
  "/advance-loan": "advance-loan",
  "/loan-config": "loan-config",
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

export const SYSTEM_ROLE_NAMES = ["Admin", "HR", "Manager", "Employee"];

export const grantableModulesForRole = (role) => {
  if (!SYSTEM_ROLE_NAMES.includes(role)) return GRANTABLE_MODULES;
  return GRANTABLE_MODULES.filter((item) => {
    const allowed = ROUTE_ACCESS[item.path];
    return !allowed || allowed.includes(role);
  });
};

export const defaultSelectedModules = (role, storedModules) => {
  const grantable = grantableModulesForRole(role).map((item) => item.key);
  if (!Array.isArray(storedModules)) return grantable;
  return grantable.filter((key) => storedModules.includes(key));
};

const RBAC_ROUTE_PERMISSION = {
  "/departments": "departments:manage",
  "/sites": "departments:manage",
  "/employees": "employees:view",
  "/loan-config": "loan-config:manage",
  "/roles": "roles:manage",
};

const CUSTOM_ROLE_MODULE_PERMISSION = {
  "/attendance": "attendance:view",
  "/leave": "leave:view",
  "/payroll": "payroll:view",
  "/expenses": "expenses:view",
  "/documents": "documents:view",
  "/resignation": "resignation:view",
  "/advance-loan": "advance-loan:view",
  "/loan-config": "loan-config:manage",
  "/employees": "employees:view",
  "/departments": "departments:manage",
  "/sites": "departments:manage",
};

export const canViewConsultancy = (role) =>
  role === "Admin" ||
  roleHasPermission(role, "consultancy:view") ||
  roleHasPermission(role, "consultancy:manage");

export const canManageConsultancy = (role) =>
  role === "Admin" || roleHasPermission(role, "consultancy:manage");

export const canViewEmployees = (role) =>
  role === "Admin" || roleHasPermission(role, "employees:view");

export const canAccessEmployeesPage = (role) =>
  canViewEmployees(role) || canViewConsultancy(role);

export const canViewDepartments = (role) =>
  role === "Admin" ||
  roleHasPermission(role, "departments:view") ||
  roleHasPermission(role, "departments:manage");

export const canManageDepartments = (role) =>
  role === "Admin" || roleHasPermission(role, "departments:manage");

export const canAccessDepartmentsPage = (role) => canViewDepartments(role);

export const canAccessRoute = (role, path, allowedModules) => {
  const appPath = normalizeAppPath(path);

  // Employees page hosts 2 tabs: Employees + Consultancy.
  // Consultancy-only users (consultancy:view/manage without employees:view)
  // must still see the Employees menu and land on the Consultancy tab.
  if (appPath === "/employees") {
    if (!canAccessEmployeesPage(role)) return false;
    // Custom roles are permission-driven — stale allowedModules must not hide it.
    if (!SYSTEM_ROLE_NAMES.includes(role)) return true;
    if (role === "Admin" || role === "HR") {
      if (!Array.isArray(allowedModules)) return true;
      if (allowedModules.includes("employees")) return true;
      // HR with only consultancy permission still gets in.
      if (canViewConsultancy(role)) return true;
      return false;
    }
    // Manager / Employee system roles are normally blocked from /employees,
    // but consultancy permission explicitly grants access (Consultancy tab only).
    if (canViewConsultancy(role)) return true;
    return false;
  }

  // Departments / Sites pages support view + manage (like Consultancy).
  // departments:view grants read access, departments:manage grants full access.
  if (appPath === "/departments" || appPath === "/sites") {
    if (!canAccessDepartmentsPage(role)) return false;
    // Custom roles are permission-driven — stale allowedModules must not hide it.
    if (!SYSTEM_ROLE_NAMES.includes(role)) return true;
    if (role === "Admin" || role === "HR") {
      if (!Array.isArray(allowedModules)) return true;
      if (allowedModules.includes("departments")) return true;
      // HR with departments permission but stale modules still gets in.
      if (canViewDepartments(role)) return true;
      return false;
    }
    // Manager / Employee system roles are normally blocked, but an explicit
    // departments permission grants access (view-only hides Add/Edit/Delete).
    if (canViewDepartments(role)) return true;
    return false;
  }

  // Elevated pages (loan-config, roles) are gated by
  // RBAC permission so any custom role holding the permission gets access.
  const rbacPerm = RBAC_ROUTE_PERMISSION[appPath];
  if (rbacPerm && !roleHasPermission(role, rbacPerm)) return false;

  // Custom roles are permission-driven. A stale allowedModules list must not
  // hide a module explicitly granted by the RBAC catalog.
  if (!SYSTEM_ROLE_NAMES.includes(role)) {
    const modulePermission = CUSTOM_ROLE_MODULE_PERMISSION[appPath];
    if (modulePermission && roleHasPermission(role, modulePermission)) return true;
  }

  const allowedRoles = ROUTE_ACCESS[appPath];
  if (allowedRoles && !allowedRoles.includes(role)) {
    // Custom roles don't appear in the legacy whitelist. Every self-service
    // route is baseline-granted to all roles, so only the system roles (which
    // the whitelist actually describes) can be blocked here.
    if (SYSTEM_ROLE_NAMES.includes(role)) return false;
  }

  if (appPath === "/regularization") {
    if (role === "Admin" || allowedModules == null) return true;
    if (!Array.isArray(allowedModules)) return true;
    // Custom roles are permission-driven (regularization:view is baseline for
    // all) — an assigned regularization permission always opens the hub.
    if (!SYSTEM_ROLE_NAMES.includes(role)) return true;
    return (
      allowedModules.includes("attendance") || allowedModules.includes("leave")
    );
  }

  const moduleKey = MODULE_BY_PATH[appPath];
  if (!moduleKey || ALWAYS_ON_MODULES.includes(moduleKey)) return true;
  if (!Array.isArray(allowedModules)) return true;
  return allowedModules.includes(moduleKey);
};

export const DASHBOARD_STAT_MODULE = {
  employees: "employees",
  activeEmployees: "employees",
  exitEmployees: "employees",
  attendance: "attendance",
  leave: "leave",
  balance: "leave",
  expense: "expenses",
  advanceLoan: "advance-loan",
};

export const canAccessRegularization = (role, allowedModules) =>
  canAccessRoute(role, "/regularization", allowedModules);

export const userHasModule = (userOrRole, moduleKey, allowedModules) => {
  const role = typeof userOrRole === "string" ? userOrRole : userOrRole?.role;
  const modules = Array.isArray(allowedModules)
    ? allowedModules
    : userOrRole?.allowedModules;
  const canonical = moduleKey === "expense" ? "expenses" : moduleKey === "advanceLoan" ? "advance-loan" : moduleKey;
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
  if (roleHasPermission(role, "attendance:view-org")) return "HR";
  // Markers (daily/monthly) get the HR layout too — org table inside it stays
  // gated behind canViewOrgAttendance, but mark forms become reachable.
  if (
    roleHasPermission(role, "attendance:mark") ||
    roleHasPermission(role, "attendance:manage")
  )
    return "HR";
  return "Employee";
};

// Organization-wide attendance read: attendance:view-org (view) or
// attendance:manage (implies full org access). attendance:mark alone does NOT
// grant org view — markers without view-org only see forms + self data.
export const canViewOrgAttendance = (role) =>
  role === "Admin" ||
  roleHasPermission(role, "attendance:view-org") ||
  roleHasPermission(role, "attendance:manage");

export const getLeaveViewKey = (role) => {
  if (role === "Admin") return "Organization";
  if (roleHasPermission(role, "leave:policy") || roleHasPermission(role, "leave:balances")) return "HR";
  // approve-all (anyone's leave) gets the HR layout with org-wide approvals;
  // policy/balances sections inside stay separately gated.
  if (roleHasPermission(role, "leave:approve-all")) return "HR";
  // No team permission exists: team approval is automatic via reporting
  // structure (whoever works under you shows up). System Manager role by
  // definition manages a team; everyone else with reportees gets the auto
  // team block inside the Employee view via dashboard scope.
  if (role === "Manager") return "Manager";
  return "Employee";
};

// Leave approval gating: no team permission exists. Team approvals are
// automatic (reporting structure + dashboard team scope); approve-all is the
// Admin/HR-level grant for anyone's leave.
export const canApproveLeave = (role) =>
  role === "Admin" || roleHasPermission(role, "leave:approve-all");

export const canApproveAnyoneLeave = (role) =>
  role === "Admin" || roleHasPermission(role, "leave:approve-all");

// Organization Leave tab: Admin or any org-wide leave grant (anyone's
// approvals, policy, or balances). Employee tab is always visible.
export const canViewOrgLeave = (role) =>
  role === "Admin" ||
  roleHasPermission(role, "leave:approve-all") ||
  roleHasPermission(role, "leave:policy") ||
  roleHasPermission(role, "leave:balances");

// Regularization: view-all (org list + stats), approve/reject, direct edit.
// approve and direct-edit imply view-all (you must see the queue to act).
export const canViewAllRegularizations = (role) =>
  role === "Admin" ||
  roleHasPermission(role, "regularization:view-all") ||
  roleHasPermission(role, "regularization:approve") ||
  roleHasPermission(role, "regularization:direct-edit");

export const canApproveRegularization = (role) =>
  role === "Admin" || roleHasPermission(role, "regularization:approve");

export const canDirectEditRegularization = (role) =>
  role === "Admin" ||
  roleHasPermission(role, "regularization:approve") ||
  roleHasPermission(role, "regularization:direct-edit");

// Strict split: Mark / Correct Attendance needs attendance:mark only.
// attendance:manage does NOT grant daily marking.
export const canMarkAttendance = (role) =>
  role === "Admin" || roleHasPermission(role, "attendance:mark");

export const canManageEmployees = (role) =>
  roleHasPermission(role, "employees:manage");

export const canManageProbation = (role) =>
  roleHasPermission(role, "probation:manage");

export const canManageProbationPolicy = (role) =>
  roleHasPermission(role, "settings:probation") ||
  roleHasPermission(role, "probation:manage");

export const canEditLeaveBalances = (role) =>
  roleHasPermission(role, "leave:balances");

export const hasLinkedEmployeeProfile = (user) => Boolean(user?.employeeId);

export const canApproveExpenses = (role) =>
  roleHasPermission(role, "expenses:approve");

export const canManageExpensePolicy = (role) =>
  roleHasPermission(role, "expenses:policy");

export const PAYROLL_ADMIN_PERMISSIONS = [
  "payroll:manage",
  "payroll:config",
  "payroll:components",
  "payroll:structure",
  "payroll:reports",
  "payroll:payments",
];

export const canManagePayroll = (role) =>
  PAYROLL_ADMIN_PERMISSIONS.some((key) => roleHasPermission(role, key));

export const getExpenseViewKey = (role) => {
  if (role === "Admin") return "Organization";
  if (roleHasPermission(role, "expenses:policy") || roleHasPermission(role, "expenses:reimburse")) return "HR";
  if (roleHasPermission(role, "expenses:approve")) return "Manager";
  return "Employee";
};

// Organization Expenses tab: Admin or any org-wide expense grant (policy or
// reimburse). My Expenses tab is always visible.
export const canViewOrgExpenses = (role) =>
  role === "Admin" ||
  roleHasPermission(role, "expenses:policy") ||
  roleHasPermission(role, "expenses:reimburse");

export const canReimburseExpenses = (role) =>
  role === "Admin" || roleHasPermission(role, "expenses:reimburse");

export const canApproveAdvanceLoan = (role) =>
  roleHasPermission(role, "advance-loan:approve");

export const canViewAllAdvanceLoan = (role) =>
  roleHasPermission(role, "advance-loan:view-all") || role === "Admin";

// ============================================================
// RBAC WIRING
// ------------------------------------------------------------
// Every helper & route check now consults the Roles & Permissions
// config stored in localStorage (from the Roles page). Admin bypasses.
// Employee baseline permissions are auto-granted to every role.
// ============================================================

export const roleHasPermission = (role, permissionKey) => {
  if (role === "Admin") return true;
  if (BASELINE_PERMISSIONS.includes(permissionKey)) return true;
  const roles = loadRoles();
  const roleCfg = roles[role];
  if (!roleCfg || !Array.isArray(roleCfg.permissions)) return false;
  const perms = roleCfg.permissions;
  if (perms.includes(permissionKey)) return true;

  // Implied / parent permission checks
  if (permissionKey === "employees:view" && perms.includes("employees:manage")) return true;
  // Probation rides on the employee-management grant so setups created
  // before probation:manage existed keep working without a migration.
  if (permissionKey === "probation:manage" && perms.includes("employees:manage")) return true;
  if (permissionKey === "settings:probation" && (perms.includes("probation:manage") || perms.includes("employees:manage"))) return true;
  if (permissionKey === "consultancy:view" && perms.includes("consultancy:manage")) return true;
  if (permissionKey === "departments:view" && perms.includes("departments:manage")) return true;
  if (
    permissionKey === "regularization:view-all" &&
    (perms.includes("regularization:approve") ||
      perms.includes("regularization:direct-edit"))
  )
    return true;
  if (
    permissionKey === "payroll:view" &&
    (perms.includes("payroll:manage") ||
      perms.includes("payroll:config") ||
      perms.includes("payroll:reports") ||
      perms.includes("payroll:payments") ||
      perms.includes("payroll:structure") ||
      perms.includes("payroll:components"))
  )
    return true;
  if (
    permissionKey === "advance-loan:view" &&
    (perms.includes("advance-loan:view-all") ||
      perms.includes("advance-loan:approve") ||
      perms.includes("advance-loan:statistics") ||
      perms.includes("loan-config:manage"))
  )
    return true;
  if (permissionKey === "documents:view" && perms.includes("documents:view-all")) return true;
  if (
    permissionKey === "attendance:view" &&
    (perms.includes("attendance:view-org") || perms.includes("attendance:manage"))
  )
    return true;

  return false;
};

export const rolePermissionList = (role) => {
  if (role === "Admin") return "all";
  const roles = loadRoles();
  const roleCfg = roles[role];
  if (!roleCfg || !Array.isArray(roleCfg.permissions)) return [...BASELINE_PERMISSIONS];
  return roleCfg.permissions;
};

// ------------------------------------------------------------
// Server sync — keeps the local RBAC catalog (used by roleHasPermission)
// fresh so a custom role logged in on any browser gets its permissions.
//
// fetchRolesCatalog() only READS (no save, no event) so route-change
// callers can compare first and save only when something actually
// changed — that keeps the "roles-updated" event loop-free.
// syncRolesFromServer() fetches + saves (fires the event); concurrent
// callers share one in-flight request.
// ------------------------------------------------------------
let rolesSyncPromise = null;

const mergeBackendRoles = (backendRoles) => {
  const merged = { ...loadRoles() };
  backendRoles.forEach((rb) => {
    if (rb.isAdmin) return;
    merged[rb.roleName] = {
      displayName: rb.displayName || rb.roleName,
      description: rb.description || "",
      permissions: rb.permissions || [],
      baselinePermissions: rb.baselinePermissions || BASELINE_PERMISSIONS,
      isSystem: Boolean(rb.isSystem),
      _id: rb._id,
    };
  });
  return merged;
};

// Order-independent fingerprint: backend row order must never count as
// a "change", otherwise every fetch would re-save and re-fire events.
export const rolesCatalogKey = (roles) => {
  const obj = roles || {};
  return JSON.stringify(
    Object.keys(obj)
      .sort()
      .map((k) => [
        k,
        [...((obj[k] && obj[k].permissions) || [])].sort(),
        (obj[k] && obj[k].displayName) || "",
      ])
  );
};

export const fetchRolesCatalog = () => {
  if (rolesSyncPromise) return rolesSyncPromise;
  rolesSyncPromise = (async () => {
    try {
      const { getRoles } = await import("../services/roleService");
      const backendRoles = await getRoles();
      if (!Array.isArray(backendRoles)) return null;
      return mergeBackendRoles(backendRoles);
    } catch {
      /* backend unavailable — local catalog stays in charge */
      return null;
    } finally {
      rolesSyncPromise = null;
    }
  })();
  return rolesSyncPromise;
};

export const syncRolesFromServer = async (force = false) => {
  const merged = await fetchRolesCatalog();
  if (merged && (force || rolesCatalogKey(merged) !== rolesCatalogKey(loadRoles()))) {
    const { saveRoles } = await import("./permissions");
    saveRoles(merged);
  }
};
