// ============================================================
// PERMISSION CATALOG
// Structure: module -> { label, subModules: { subKey: { label, actions: [{key,label}] } } }
// Permission key format: module:subModule:action  OR module:action (when no subModule)
// ============================================================

const permission = (module, sub, action) =>
  sub ? `${module}:${sub}:${action}` : `${module}:${action}`;

export const ALL_PERMISSIONS = {
  dashboard: {
    label: "Dashboard",
    subModules: {
      widgets: {
        label: "Dashboard Widgets",
        actions: [
          { key: "view", label: "View Dashboard" },
          { key: "view-stats", label: "View Stat Cards" },
          { key: "view-charts", label: "View Charts" },
          { key: "view-activity", label: "View Activity Feed" },
          { key: "view-pending", label: "View Pending Approvals" },
        ],
      },
    },
  },
  employees: {
    label: "Employees",
    subModules: {
      list: {
        label: "Employee List",
        actions: [
          { key: "view", label: "View Employees" },
          { key: "view-active", label: "View Active Employees" },
          { key: "view-inactive", label: "View Inactive Employees" },
          { key: "view-on-notice", label: "View Employees On Notice" },
          { key: "search", label: "Search Employees" },
          { key: "filter", label: "Filter by Department/Status/Designation" },
        ],
      },
      manage: {
        label: "Manage Employees",
        actions: [
          { key: "create", label: "Add Employee" },
          { key: "edit", label: "Edit Employee" },
          { key: "delete", label: "Delete Employee" },
          { key: "bulk-upload", label: "Bulk Upload (Excel)" },
          { key: "link-user", label: "Link User Account" },
          { key: "view-unlinked", label: "View Unlinked Users" },
        ],
      },
      profile: {
        label: "Employee Profile",
        actions: [
          { key: "view-profile", label: "View Employee Profile" },
          { key: "view-documents", label: "View Employee Documents" },
          { key: "view-salary", label: "View Employee Salary Structure" },
          { key: "view-attendance", label: "View Employee Attendance" },
          { key: "view-leave", label: "View Employee Leave" },
        ],
      },
      letters: {
        label: "Letters",
        actions: [
          { key: "appointment", label: "Generate Appointment Letter" },
          { key: "warning", label: "Generate Warning Letter" },
          { key: "termination", label: "Generate Termination Letter" },
          { key: "transfer", label: "Generate Transfer Letter" },
          { key: "experience", label: "Generate Experience Letter" },
          { key: "relieving", label: "Generate Relieving Letter" },
        ],
      },
    },
  },
  departments: {
    label: "Departments / Sites",
    subModules: {
      departments: {
        label: "Departments",
        actions: [
          { key: "view", label: "View Departments" },
          { key: "create", label: "Create Department" },
          { key: "edit", label: "Edit Department" },
          { key: "delete", label: "Delete Department" },
          { key: "copy", label: "Copy Department" },
        ],
      },
      sites: {
        label: "Sites",
        actions: [
          { key: "view", label: "View Sites" },
          { key: "create", label: "Create Site" },
          { key: "edit", label: "Edit Site" },
          { key: "delete", label: "Delete Site" },
        ],
      },
      shifts: {
        label: "Shifts",
        actions: [
          { key: "view", label: "View Shifts" },
          { key: "create", label: "Create Shift" },
          { key: "edit", label: "Edit Shift" },
          { key: "delete", label: "Delete Shift" },
        ],
      },
      otPolicy: {
        label: "OT Policies",
        actions: [
          { key: "view", label: "View OT Policies" },
          { key: "create", label: "Create OT Policy" },
          { key: "edit", label: "Edit OT Policy" },
          { key: "delete", label: "Delete OT Policy" },
        ],
      },
    },
  },
  attendance: {
    label: "Attendance",
    subModules: {
      today: {
        label: "Today",
        actions: [
          { key: "view", label: "View Today's Attendance" },
          { key: "check-in", label: "Check In" },
          { key: "check-out", label: "Check Out" },
          { key: "mark", label: "Mark Attendance for Self" },
        ],
      },
      sessions: {
        label: "Sessions",
        actions: [
          { key: "view", label: "View Sessions" },
          { key: "view-selfie", label: "View Check-In Selfie" },
        ],
      },
      calendar: {
        label: "Attendance Calendar",
        actions: [{ key: "view", label: "View Attendance Calendar" }],
      },
      stats: {
        label: "Statistics",
        actions: [{ key: "view", label: "View Attendance Stats" }],
      },
      monthly: {
        label: "Monthly Report",
        actions: [
          { key: "view", label: "View Monthly Report" },
          { key: "download", label: "Download Monthly Report (Excel)" },
          { key: "export", label: "Export Report" },
        ],
      },
      markOthers: {
        label: "Mark for Others",
        actions: [
          { key: "mark", label: "Mark Attendance for Others" },
          { key: "mark-month", label: "Mark Monthly Attendance" },
          { key: "bulk-upload", label: "Bulk Upload Attendance (Excel)" },
          { key: "edit", label: "Edit Attendance Records" },
          { key: "delete", label: "Delete Attendance Records" },
        ],
      },
      orgView: {
        label: "Organization View",
        actions: [
          { key: "view", label: "View Organization-wide Attendance" },
          { key: "filter-employee", label: "Filter by Employee" },
          { key: "filter-date", label: "Filter by Date" },
        ],
      },
    },
  },
  leave: {
    label: "Leave",
    subModules: {
      requests: {
        label: "Leave Requests",
        actions: [
          { key: "view", label: "View Leave Requests" },
          { key: "view-my", label: "View My Requests" },
          { key: "create", label: "Apply for Leave" },
          { key: "cancel", label: "Cancel Request" },
          { key: "edit", label: "Edit Request" },
          { key: "view-details", label: "View Request Details" },
          { key: "download-pdf", label: "Download Leave PDF" },
        ],
      },
      approvals: {
        label: "Approvals",
        actions: [
          { key: "approve", label: "Approve Leave Request" },
          { key: "reject", label: "Reject Leave Request" },
          { key: "bulk-approve", label: "Bulk Approve" },
          { key: "bulk-reject", label: "Bulk Reject" },
          { key: "filter", label: "Filter by Status/Employee/Date" },
        ],
      },
      balance: {
        label: "Leave Balances",
        actions: [
          { key: "view", label: "View Leave Balances" },
          { key: "edit", label: "Edit Leave Balances" },
        ],
      },
      policy: {
        label: "Leave Policy",
        actions: [
          { key: "view", label: "View Leave Policy" },
          { key: "manage", label: "Manage Leave Policy" },
          { key: "apply-template", label: "Apply Policy Template" },
        ],
      },
      fnf: {
        label: "F&F Encashment",
        actions: [{ key: "view", label: "View F&F Encashment Preview" }],
      },
      orgView: {
        label: "Organization View",
        actions: [
          { key: "view", label: "View Organization-wide Leave" },
          { key: "direct-edit", label: "Direct Edit Leave Records" },
          { key: "filter-employee", label: "Filter by Employee" },
        ],
      },
    },
  },
  regularization: {
    label: "Regularization",
    subModules: {
      requests: {
        label: "Requests",
        actions: [
          { key: "view", label: "View Regularization Requests" },
          { key: "view-my", label: "View My Requests" },
          { key: "submit", label: "Submit Regularization Request" },
          { key: "cancel", label: "Cancel Request" },
          { key: "view-details", label: "View Request Details" },
        ],
      },
      approvals: {
        label: "Approvals",
        actions: [
          { key: "approve", label: "Approve Request" },
          { key: "reject", label: "Reject Request" },
        ],
      },
      directEdit: {
        label: "Direct Edit",
        actions: [
          { key: "attendance", label: "Direct Edit Attendance" },
          { key: "leave", label: "Direct Edit Leave" },
        ],
      },
    },
  },
  payroll: {
    label: "Payroll",
    subModules: {
      payroll: {
        label: "Payroll Manager",
        actions: [
          { key: "view", label: "View Payroll" },
          { key: "preview", label: "Preview Payroll" },
          { key: "calculate", label: "Calculate Single Payroll" },
          { key: "calculate-bulk", label: "Calculate Bulk Payroll" },
          { key: "approve", label: "Approve Payroll" },
          { key: "reject", label: "Reject Payroll" },
          { key: "delete", label: "Delete Payroll" },
          { key: "bulk-approve", label: "Bulk Approve Payrolls" },
          { key: "report", label: "View Payroll Report" },
        ],
      },
      payslips: {
        label: "Payslips",
        actions: [
          { key: "view", label: "View My Payslips" },
          { key: "view-all", label: "View All Payslips" },
          { key: "download-pdf", label: "Download Payslip PDF" },
          { key: "send-email", label: "Email Payslip" },
          { key: "reopen", label: "Reopen Payroll" },
          { key: "release", label: "Release Payroll" },
          { key: "adjustments", label: "Add/Remove Adjustments" },
          { key: "wage-sheet", label: "Download Wage Sheet" },
        ],
      },
      config: {
        label: "Payroll Config",
        actions: [
          { key: "view", label: "View Payroll Config" },
          { key: "manage", label: "Manage Payroll Config" },
          { key: "pt-states", label: "View PT States" },
        ],
      },
      components: {
        label: "Salary Components",
        actions: [
          { key: "view", label: "View Salary Components" },
          { key: "create", label: "Add Component" },
          { key: "edit", label: "Edit Component" },
          { key: "delete", label: "Delete Component" },
          { key: "reorder", label: "Reorder Components" },
        ],
      },
      structure: {
        label: "Salary Structure",
        actions: [
          { key: "view", label: "View Salary Structure" },
          { key: "create", label: "Create Salary Structure" },
          { key: "edit", label: "Edit Salary Structure" },
          { key: "delete", label: "Delete Salary Structure" },
          { key: "calculate-split", label: "Calculate CTC Split" },
        ],
      },
      runs: {
        label: "Payroll Runs",
        actions: [
          { key: "view", label: "View Payroll Runs" },
          { key: "create", label: "Create Run" },
          { key: "calculate", label: "Calculate Run" },
          { key: "approve", label: "Approve Run" },
          { key: "reject", label: "Reject Run" },
          { key: "process", label: "Process Run" },
          { key: "release-pending", label: "Release Pending" },
          { key: "exceptions", label: "View Run Exceptions" },
          { key: "send-payslips", label: "Send Payslips for Run" },
        ],
      },
      reports: {
        label: "Reports",
        actions: [
          { key: "summary", label: "View Summary Report" },
          { key: "export-summary", label: "Export Summary" },
          { key: "export-wagesheet", label: "Export Wage Sheet" },
        ],
      },
      payments: {
        label: "Payments",
        actions: [
          { key: "view", label: "View Payments" },
          { key: "edit", label: "Edit Payment" },
        ],
      },
    },
  },
  expenses: {
    label: "Expenses",
    subModules: {
      requests: {
        label: "Expense Requests",
        actions: [
          { key: "view", label: "View Expense Requests" },
          { key: "view-my", label: "View My Expenses" },
          { key: "view-reimbursed", label: "View Reimbursed" },
          { key: "create", label: "Create Expense Claim" },
          { key: "edit", label: "Edit Expense" },
          { key: "delete", label: "Delete Expense" },
          { key: "upload-receipt", label: "Upload Receipt" },
          { key: "view-receipt", label: "View Receipt" },
          { key: "download-receipt", label: "Download Receipt" },
        ],
      },
      approvals: {
        label: "Approvals",
        actions: [
          { key: "approve", label: "Approve Expense" },
          { key: "reject", label: "Reject Expense" },
          { key: "filter", label: "Filter by Status/Category/Date" },
        ],
      },
      reimburse: {
        label: "Reimbursement",
        actions: [{ key: "mark", label: "Mark as Reimbursed" }],
      },
      policy: {
        label: "Expense Policy",
        actions: [
          { key: "view", label: "View Expense Policy" },
          { key: "manage", label: "Manage Expense Policy" },
        ],
      },
      export: {
        label: "Export",
        actions: [{ key: "excel", label: "Export Excel" }],
      },
    },
  },
  documents: {
    label: "Documents",
    subModules: {
      list: {
        label: "Document List",
        actions: [
          { key: "view", label: "View Documents" },
          { key: "view-all", label: "View All Documents" },
          { key: "view-my", label: "View My Documents" },
          { key: "view-shared", label: "View Shared Documents" },
          { key: "search", label: "Search Documents" },
          { key: "filter", label: "Filter by Category/Employee/Date" },
        ],
      },
      manage: {
        label: "Manage Documents",
        actions: [
          { key: "upload", label: "Upload Document" },
          { key: "download", label: "Download Document" },
          { key: "delete", label: "Delete Document" },
          { key: "preview", label: "Preview Document" },
          { key: "share", label: "Share Document" },
        ],
      },
    },
  },
  resignation: {
    label: "Resignation",
    subModules: {
      requests: {
        label: "Resignation Requests",
        actions: [
          { key: "view", label: "View Resignations" },
          { key: "view-my", label: "View My Resignations" },
          { key: "view-pending", label: "View Pending Approvals" },
          { key: "create", label: "Submit Resignation" },
          { key: "edit", label: "Edit Resignation" },
          { key: "delete", label: "Delete Resignation" },
          { key: "upload-doc", label: "Upload Document" },
          { key: "view-letter", label: "View Resignation Letter" },
          { key: "view-details", label: "View Details" },
        ],
      },
      approvals: {
        label: "Approvals",
        actions: [
          { key: "approve", label: "Approve Resignation" },
          { key: "reject", label: "Reject Resignation" },
          { key: "update-status", label: "Update Status" },
          { key: "final-approval", label: "Final Approval" },
          { key: "filter", label: "Filter by Status/Employee" },
        ],
      },
    },
  },
  advanceLoan: {
    label: "Advance Loan",
    subModules: {
      requests: {
        label: "Loan Requests",
        actions: [
          { key: "view", label: "View Advance Loan Requests" },
          { key: "view-my", label: "View My Requests" },
          { key: "create", label: "Create Request" },
          { key: "cancel", label: "Cancel Request" },
          { key: "edit", label: "Edit Request" },
          { key: "view-details", label: "View Request Details" },
          { key: "comments", label: "Add Comments" },
        ],
      },
      viewAll: {
        label: "All Requests",
        actions: [
          { key: "view-all", label: "View All Requests" },
          { key: "filter", label: "Filter by Status/Employee" },
        ],
      },
      approvals: {
        label: "Approvals",
        actions: [
          { key: "approve", label: "Approve Request" },
          { key: "reject", label: "Reject Request" },
        ],
      },
      repayment: {
        label: "Repayment",
        actions: [
          { key: "manage", label: "Manage Repayment" },
          { key: "record-payment", label: "Record Payment" },
          { key: "defer-deduction", label: "Defer Deduction" },
        ],
      },
      statistics: {
        label: "Statistics",
        actions: [{ key: "view", label: "View Loan Statistics" }],
      },
      config: {
        label: "Loan Configuration",
        actions: [
          { key: "view", label: "View Loan Config" },
          { key: "manage", label: "Manage Loan Config" },
        ],
      },
    },
  },
  settings: {
    label: "Settings",
    subModules: {
      profile: {
        label: "Profile",
        actions: [
          { key: "view", label: "View Profile" },
          { key: "edit", label: "Edit Profile" },
        ],
      },
      security: {
        label: "Security",
        actions: [
          { key: "view", label: "View Security Settings" },
          { key: "change-password", label: "Change Password" },
          { key: "enable-2fa", label: "Enable/Disable 2FA" },
        ],
      },
      notifications: {
        label: "Notifications",
        actions: [
          { key: "view", label: "View Notifications" },
          { key: "update", label: "Update Notification Preferences" },
        ],
      },
      orgProfile: {
        label: "Organization Profile",
        actions: [
          { key: "view", label: "View Org Profile" },
          { key: "manage", label: "Manage Org Profile" },
          { key: "upload-logo", label: "Upload Logo" },
        ],
      },
      shifts: {
        label: "Shift Management",
        actions: [
          { key: "view", label: "View Shifts" },
          { key: "manage", label: "Manage Shifts" },
        ],
      },
      weekOff: {
        label: "Week Off",
        actions: [
          { key: "view", label: "View Week Off" },
          { key: "manage", label: "Configure Week Off" },
        ],
      },
      holidays: {
        label: "Holidays",
        actions: [
          { key: "view", label: "View Holidays" },
          { key: "manage", label: "Manage Holidays" },
        ],
      },
      leavePolicy: {
        label: "Leave Policy",
        actions: [
          { key: "view", label: "View Leave Policy" },
          { key: "manage", label: "Manage Leave Policy" },
        ],
      },
      salaryStructure: {
        label: "Salary Structure",
        actions: [
          { key: "view", label: "View Salary Structure" },
          { key: "manage", label: "Manage Salary Structure" },
        ],
      },
      salaryComponents: {
        label: "Salary Components",
        actions: [
          { key: "view", label: "View Salary Components" },
          { key: "manage", label: "Manage Salary Components" },
        ],
      },
      otPolicy: {
        label: "OT Policy",
        actions: [
          { key: "view", label: "View OT Policy" },
          { key: "manage", label: "Manage OT Policy" },
        ],
      },
    },
  },
  roles: {
    label: "Roles & Access",
    subModules: {
      management: {
        label: "Role Management",
        actions: [
          { key: "view", label: "View Roles" },
          { key: "create", label: "Create Role" },
          { key: "edit", label: "Edit Role" },
          { key: "delete", label: "Delete Role" },
          { key: "assign", label: "Assign Roles to Users" },
        ],
      },
      permissions: {
        label: "Permission Management",
        actions: [
          { key: "view", label: "View Permissions" },
          { key: "add-module", label: "Add New Module" },
          { key: "add-sub-module", label: "Add New Sub-Module" },
          { key: "add-action", label: "Add New Action/View" },
        ],
      },
    },
  },
};

// ============================================================
// HELPERS
// ============================================================

export const MODULE_KEYS = Object.keys(ALL_PERMISSIONS);

// Flatten: every permission key
export const flattenAllPermissions = () =>
  MODULE_KEYS.flatMap((modKey) => {
    const mod = ALL_PERMISSIONS[modKey];
    return Object.entries(mod.subModules).flatMap(([subKey, sub]) =>
      sub.actions.map((a) => permission(modKey, subKey, a.key))
    );
  });

export const getTotalPermissionCount = () => flattenAllPermissions().length;

export const getPermissionCountForModule = (modKey) => {
  const mod = ALL_PERMISSIONS[modKey];
  if (!mod) return 0;
  return Object.values(mod.subModules).reduce(
    (sum, sub) => sum + sub.actions.length,
    0
  );
};

export const getPermissionCountForSubModule = (modKey, subKey) =>
  ALL_PERMISSIONS[modKey]?.subModules[subKey]?.actions.length || 0;

// ============================================================
// DEFAULT ROLES
// ============================================================

// Build default permission lists per role
const buildAdminPerms = () => flattenAllPermissions();

const buildHrPerms = () =>
  MODULE_KEYS.flatMap((modKey) => {
    if (modKey === "roles") {
      return [
        permission("roles", "management", "view"),
        permission("roles", "permissions", "view"),
      ];
    }
    const mod = ALL_PERMISSIONS[modKey];
    return Object.entries(mod.subModules).flatMap(([subKey, sub]) =>
      sub.actions.map((a) => permission(modKey, subKey, a.key))
    );
  });

const buildManagerPerms = () =>
  MODULE_KEYS.flatMap((modKey) => {
    if (modKey === "employees") {
      return [
        permission("employees", "list", "view"),
        permission("employees", "list", "search"),
        permission("employees", "list", "filter"),
        permission("employees", "profile", "view-profile"),
      ];
    }
    if (modKey === "departments") {
      return [
        permission("departments", "departments", "view"),
        permission("departments", "sites", "view"),
        permission("departments", "shifts", "view"),
      ];
    }
    if (modKey === "attendance") {
      return [
        permission("attendance", "today", "view"),
        permission("attendance", "today", "check-in"),
        permission("attendance", "today", "check-out"),
        permission("attendance", "today", "mark"),
        permission("attendance", "sessions", "view"),
        permission("attendance", "calendar", "view"),
        permission("attendance", "stats", "view"),
        permission("attendance", "monthly", "view"),
        permission("attendance", "monthly", "download"),
        permission("attendance", "monthly", "export"),
        permission("attendance", "markOthers", "mark"),
        permission("attendance", "orgView", "view"),
        permission("attendance", "orgView", "filter-employee"),
        permission("attendance", "orgView", "filter-date"),
      ];
    }
    if (modKey === "leave") {
      return [
        permission("leave", "requests", "view"),
        permission("leave", "requests", "view-my"),
        permission("leave", "requests", "create"),
        permission("leave", "requests", "cancel"),
        permission("leave", "requests", "view-details"),
        permission("leave", "approvals", "approve"),
        permission("leave", "approvals", "reject"),
        permission("leave", "approvals", "filter"),
        permission("leave", "balance", "view"),
        permission("leave", "policy", "view"),
        permission("leave", "fnf", "view"),
        permission("leave", "orgView", "view"),
      ];
    }
    if (modKey === "regularization") {
      return [
        permission("regularization", "requests", "view"),
        permission("regularization", "requests", "view-my"),
        permission("regularization", "requests", "submit"),
        permission("regularization", "requests", "cancel"),
        permission("regularization", "approvals", "approve"),
        permission("regularization", "approvals", "reject"),
      ];
    }
    if (modKey === "payroll") {
      return [
        permission("payroll", "payroll", "view"),
        permission("payroll", "payslips", "view"),
        permission("payroll", "payslips", "view-all"),
        permission("payroll", "payslips", "download-pdf"),
        permission("payroll", "reports", "summary"),
      ];
    }
    if (modKey === "expenses") {
      return [
        permission("expenses", "requests", "view"),
        permission("expenses", "requests", "view-my"),
        permission("expenses", "requests", "create"),
        permission("expenses", "requests", "upload-receipt"),
        permission("expenses", "approvals", "approve"),
        permission("expenses", "approvals", "reject"),
        permission("expenses", "policy", "view"),
      ];
    }
    if (modKey === "documents") {
      return [
        permission("documents", "list", "view"),
        permission("documents", "list", "view-my"),
        permission("documents", "list", "search"),
        permission("documents", "manage", "upload"),
        permission("documents", "manage", "download"),
        permission("documents", "manage", "preview"),
      ];
    }
    if (modKey === "resignation") {
      return [
        permission("resignation", "requests", "view"),
        permission("resignation", "requests", "view-my"),
        permission("resignation", "requests", "create"),
        permission("resignation", "requests", "view-details"),
        permission("resignation", "approvals", "approve"),
        permission("resignation", "approvals", "reject"),
        permission("resignation", "approvals", "view-pending"),
      ];
    }
    if (modKey === "advanceLoan") {
      return [
        permission("advanceLoan", "requests", "view"),
        permission("advanceLoan", "requests", "view-my"),
        permission("advanceLoan", "requests", "create"),
        permission("advanceLoan", "requests", "cancel"),
        permission("advanceLoan", "requests", "comments"),
        permission("advanceLoan", "viewAll", "view-all"),
        permission("advanceLoan", "statistics", "view"),
        permission("advanceLoan", "config", "view"),
      ];
    }
    if (modKey === "settings") {
      return [
        permission("settings", "profile", "view"),
        permission("settings", "profile", "edit"),
        permission("settings", "security", "view"),
        permission("settings", "security", "change-password"),
        permission("settings", "notifications", "view"),
        permission("settings", "notifications", "update"),
      ];
    }
    return [];
  });

const buildEmployeePerms = () =>
  MODULE_KEYS.flatMap((modKey) => {
    if (modKey === "employees") {
      return [permission("employees", "list", "view")];
    }
    if (modKey === "attendance") {
      return [
        permission("attendance", "today", "view"),
        permission("attendance", "today", "check-in"),
        permission("attendance", "today", "check-out"),
        permission("attendance", "today", "mark"),
        permission("attendance", "sessions", "view"),
        permission("attendance", "calendar", "view"),
        permission("attendance", "stats", "view"),
        permission("attendance", "monthly", "view"),
        permission("attendance", "monthly", "download"),
        permission("attendance", "monthly", "export"),
      ];
    }
    if (modKey === "leave") {
      return [
        permission("leave", "requests", "view"),
        permission("leave", "requests", "view-my"),
        permission("leave", "requests", "create"),
        permission("leave", "requests", "cancel"),
        permission("leave", "requests", "view-details"),
        permission("leave", "balance", "view"),
        permission("leave", "policy", "view"),
      ];
    }
    if (modKey === "regularization") {
      return [
        permission("regularization", "requests", "view"),
        permission("regularization", "requests", "view-my"),
        permission("regularization", "requests", "submit"),
        permission("regularization", "requests", "cancel"),
      ];
    }
    if (modKey === "payroll") {
      return [
        permission("payroll", "payroll", "view"),
        permission("payroll", "payslips", "view"),
        permission("payroll", "payslips", "download-pdf"),
      ];
    }
    if (modKey === "expenses") {
      return [
        permission("expenses", "requests", "view"),
        permission("expenses", "requests", "view-my"),
        permission("expenses", "requests", "create"),
        permission("expenses", "requests", "upload-receipt"),
        permission("expenses", "requests", "view-receipt"),
        permission("expenses", "requests", "download-receipt"),
      ];
    }
    if (modKey === "documents") {
      return [
        permission("documents", "list", "view"),
        permission("documents", "list", "view-my"),
        permission("documents", "manage", "upload"),
        permission("documents", "manage", "download"),
        permission("documents", "manage", "preview"),
      ];
    }
    if (modKey === "resignation") {
      return [
        permission("resignation", "requests", "view"),
        permission("resignation", "requests", "view-my"),
        permission("resignation", "requests", "create"),
        permission("resignation", "requests", "view-details"),
      ];
    }
    if (modKey === "advanceLoan") {
      return [
        permission("advanceLoan", "requests", "view"),
        permission("advanceLoan", "requests", "view-my"),
        permission("advanceLoan", "requests", "create"),
        permission("advanceLoan", "requests", "cancel"),
        permission("advanceLoan", "requests", "comments"),
        permission("advanceLoan", "config", "view"),
      ];
    }
    if (modKey === "settings") {
      return [
        permission("settings", "profile", "view"),
        permission("settings", "profile", "edit"),
        permission("settings", "security", "view"),
        permission("settings", "security", "change-password"),
        permission("settings", "notifications", "view"),
        permission("settings", "notifications", "update"),
      ];
    }
    return [];
  });

export const DEFAULT_ROLES = {
  Admin: {
    displayName: "Administrator",
    description: "Full access to all modules and permissions",
    isSystem: true,
    permissions: buildAdminPerms(),
  },
  HR: {
    displayName: "HR Manager",
    description: "Manage employees, attendance, leave, payroll and organization settings",
    isSystem: true,
    permissions: buildHrPerms(),
  },
  Manager: {
    displayName: "Manager",
    description: "Team management with limited administrative access",
    isSystem: true,
    permissions: buildManagerPerms(),
  },
  Employee: {
    displayName: "Employee",
    description: "Basic access to self-service modules",
    isSystem: true,
    permissions: buildEmployeePerms(),
  },
};

// ============================================================
// DYNAMIC MODULE/SUB-MODULE helpers
// ============================================================

// Persist custom modules (extensions) in localStorage so the catalog stays dynamic
export const loadCustomModules = () => {
  try {
    return JSON.parse(localStorage.getItem("rbac_custom_modules") || "[]");
  } catch {
    return [];
  }
};

export const saveCustomModules = (modules) => {
  localStorage.setItem("rbac_custom_modules", JSON.stringify(modules));
};

// Merge custom modules into the base catalog
export const getFullPermissionCatalog = () => {
  const base = { ...ALL_PERMISSIONS };
  const custom = loadCustomModules();
  custom.forEach((mod) => {
    if (!base[mod.key]) {
      base[mod.key] = {
        label: mod.label,
        subModules: {},
      };
    }
    (mod.subModules || []).forEach((sub) => {
      base[mod.key].subModules[sub.key] = {
        label: sub.label,
        actions: (sub.actions || []).map((a) => ({ key: a.key, label: a.label })),
      };
    });
  });
  return base;
};

// Extend a role's permission set with legacy single key (module:action) format support
export const hasPermission = (permissions, permKey) => {
  if (!Array.isArray(permissions)) return false;
  if (permissions.includes(permKey)) return true;
  return false;
};
