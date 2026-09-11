// ============================================================
// SIMPLIFIED RBAC PERMISSION CATALOG
// ------------------------------------------------------------
// Two buckets:
//  1. EMPLOYEE_BASELINE — auto-granted to every role (self-service)
//  2. ELEVATED — HR/Admin accessible features, assignable to
//     any custom role (e.g. Finance team can get payroll:manage)
//
// Permission key format: module:feature  (e.g. "payroll:manage")
// ============================================================

export const RBAC_VERSION = 2;

// ---------- Employee baseline (everyone gets these) ----------
export const BASELINE_PERMISSIONS = [
  "dashboard:view",
  "attendance:view",
  "leave:view",
  "leave:apply",
  "leave:balance",
  "regularization:view",
  "regularization:submit",
  "payroll:view",
  "expenses:view",
  "expenses:create",
  "documents:view",
  "documents:upload",
  "resignation:view",
  "resignation:submit",
  "advance-loan:view",
  "advance-loan:create",
  "settings:profile",
  "settings:security",
  "settings:notifications",
];

export const BASELINE_GROUPS = [
  {
    label: "Self-Service (Auto)",
    note: "Har role ko default milta hai — change karna zaroori nahi",
    perms: BASELINE_PERMISSIONS.map((key) => ({ key })),
  },
];

// ---------- HR / Admin elevated features (assignable) ----------
export const ELEVATED_PERMISSIONS = [
  "employees:view",
  "employees:manage",
  "employees:letters",
  "consultancy:view",
  "consultancy:manage",
  "departments:view",
  "departments:manage",
  "attendance:mark",
  "attendance:manage",
  "attendance:view-org",
  "leave:approve-all",
  "leave:policy",
  "leave:balances",
  "leave:direct-edit",
  "regularization:view-all",
  "regularization:approve",
  "regularization:direct-edit",
  "payroll:manage",
  "payroll:config",
  "payroll:components",
  "payroll:structure",
  "payroll:reports",
  "payroll:payments",
  "expenses:approve",
  "expenses:policy",
  "expenses:reimburse",
  "documents:view-all",
  "resignation:manage",
  "advance-loan:approve",
  "advance-loan:repayment",
  "advance-loan:view-all",
  "advance-loan:statistics",
  "loan-config:manage",
  "settings:org",
  "settings:shifts",
  "settings:holidays",
  "settings:leave-policy",
  "settings:salary",
  "settings:ot",
  "roles:manage",
];

// Display groups for the permission editor UI
export const ELEVATED_GROUPS = [
  {
    key: "employees",
    label: "Employees",
    perms: [
      { key: "employees:view", label: "View All Employees" },
      { key: "employees:manage", label: "Add / Edit / Delete Employees" },
      { key: "employees:letters", label: "Generate Letters (Appointment, Warning, etc.)" },
    ],
  },
  {
    key: "consultancy",
    label: "Consultancy",
    perms: [
      { key: "consultancy:view", label: "View Consultancy" },
      { key: "consultancy:manage", label: "Add / Edit / Delete Consultancy" },
    ],
  },
  {
    key: "departments",
    label: "Departments / Sites",
    perms: [
      { key: "departments:view", label: "View Departments / Sites" },
      { key: "departments:manage", label: "Add / Edit / Delete Departments, Sites, Shifts & OT Policies" },
    ],
  },
  {
    key: "attendance",
    label: "Attendance",
    perms: [
      { key: "attendance:view-org", label: "View + Download Organization Attendance (Table + Calendar)" },
      { key: "attendance:mark", label: "Mark / Correct Daily Attendance for Others" },
      { key: "attendance:manage", label: "Mark Month Attendance + Bulk Upload + Download Reports" },
    ],
  },
  {
    key: "leave",
    label: "Leave",
    perms: [
      { key: "leave:approve-all", label: "Approve / Reject Anyone's Leave (All Employees)" },
      { key: "leave:policy", label: "Manage Leave Policy" },
      { key: "leave:balances", label: "Edit Leave Balances" },
      { key: "leave:direct-edit", label: "Direct Edit Leave Records" },
    ],
  },
  {
    key: "regularization",
    label: "Regularization",
    perms: [
      { key: "regularization:view-all", label: "View All Regularization Requests (Organization)" },
      { key: "regularization:approve", label: "Approve / Reject Regularization" },
      { key: "regularization:direct-edit", label: "Direct Edit Regularization" },
    ],
  },
  {
    key: "payroll",
    label: "Payroll",
    perms: [
      { key: "payroll:manage", label: "Generate / Calculate / Approve / Process Payroll" },
      { key: "payroll:config", label: "Manage Payroll Config" },
      { key: "payroll:components", label: "Manage Salary Components" },
      { key: "payroll:structure", label: "Manage Salary Structure" },
      { key: "payroll:reports", label: "View & Export Payroll Reports" },
      { key: "payroll:payments", label: "Manage Payments" },
    ],
  },
  {
    key: "expenses",
    label: "Expenses",
    perms: [
      { key: "expenses:approve", label: "Approve / Reject Expenses" },
      { key: "expenses:policy", label: "Manage Expense Policy" },
      { key: "expenses:reimburse", label: "Mark Expenses as Reimbursed" },
    ],
  },
  {
    key: "documents",
    label: "Documents",
    perms: [
      { key: "documents:view-all", label: "View All Employees' Documents" },
    ],
  },
  {
    key: "resignation",
    label: "Resignation",
    perms: [
      { key: "resignation:manage", label: "Manage Resignation Status / Final Approval" },
    ],
  },
  {
    key: "advanceLoan",
    label: "Advance Loan",
    perms: [
      { key: "advance-loan:approve", label: "Approve / Reject Loan Requests" },
      { key: "advance-loan:repayment", label: "Manage Repayment / Defer Deduction" },
      { key: "advance-loan:view-all", label: "View All Requests" },
      { key: "advance-loan:statistics", label: "View Loan Statistics" },
      { key: "loan-config:manage", label: "Manage Loan Configuration" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    perms: [
      { key: "settings:org", label: "Manage Organization Profile" },
      { key: "settings:shifts", label: "Manage Shifts & Week Offs" },
      { key: "settings:holidays", label: "Manage Holidays" },
      { key: "settings:leave-policy", label: "Manage Leave Policy" },
      { key: "settings:salary", label: "Manage Salary Structure & Components" },
      { key: "settings:ot", label: "Manage OT Policy" },
    ],
  },
  {
    key: "roles",
    label: "Roles & Access",
    perms: [
      { key: "roles:manage", label: "Manage Roles & Permissions (Admin)" },
    ],
  },
];

// ---------- All keys (baseline + elevated) ----------
export const ALL_PERMISSION_KEYS = [
  ...BASELINE_PERMISSIONS,
  ...ELEVATED_PERMISSIONS,
];

export const getTotalPermissionCount = () => ALL_PERMISSION_KEYS.length;

export const getBaselinePermCount = () => BASELINE_PERMISSIONS.length;

export const getElevatedPermCount = () => ELEVATED_PERMISSIONS.length;

export const isBaselinePermission = (key) =>
  BASELINE_PERMISSIONS.includes(key);

// ============================================================
// DEFAULT SYSTEM ROLES
// ------------------------------------------------------------
// Admin -> full (hidden from management list, auto full access)
// HR    -> baseline + all elevated except roles:manage
// Manager-> baseline + team-level elevated
// Employee -> baseline only
// ============================================================

const ALL_PERMS = ALL_PERMISSION_KEYS;

const ADMIN_ROLE = {
  displayName: "Administrator",
  description: "Full access to every module and permission",
  isSystem: true,
  isAdmin: true,
  permissions: [...ALL_PERMS],
};

const HR_ROLE = {
  displayName: "HR Manager",
  description: "Full HR & admin access to all modules",
  isSystem: true,
  permissions: [...BASELINE_PERMISSIONS, ...ELEVATED_PERMISSIONS.filter((p) => p !== "roles:manage")],
};

const MANAGER_ROLE = {
  displayName: "Manager",
  description: "Team management with limited admin access",
  isSystem: true,
  permissions: [
    ...BASELINE_PERMISSIONS,
    "employees:view",
    "attendance:mark",
    "attendance:view-org",
    "regularization:approve",
    "expenses:approve",
    "documents:view-all",
    "advance-loan:view-all",
    "advance-loan:statistics",
    "resignation:manage",
  ],
};

const EMPLOYEE_ROLE = {
  displayName: "Employee",
  description: "Self-service access to your own data",
  isSystem: true,
  permissions: [...BASELINE_PERMISSIONS],
};

export const SYSTEM_ROLES = {
  Admin: ADMIN_ROLE,
  HR: HR_ROLE,
  Manager: MANAGER_ROLE,
  Employee: EMPLOYEE_ROLE,
};

export const DEFAULT_ROLES = SYSTEM_ROLES;

// ---------- localStorage load/save (versioned) ----------
export const loadRoles = () => {
  try {
    const raw = localStorage.getItem("rbac_roles");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.__v === RBAC_VERSION) {
        const { __v, ...roles } = parsed;
        return roles;
      }
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_ROLES };
};

export const saveRoles = (roles) => {
  localStorage.setItem("rbac_roles", JSON.stringify({ __v: RBAC_VERSION, ...roles }));
  window.dispatchEvent(new Event("roles-updated"));
};

export const hasPermissionIn = (permissions, permKey) => {
  if (!Array.isArray(permissions)) return false;
  if (permissions.includes(permKey)) return true;
  return isBaselinePermission(permKey);
};