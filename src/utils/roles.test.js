import {
  canAccessRoute,
  GRANTABLE_MODULES,
  grantableModulesForRole,
  userHasModule,
  visibleDashboardStats,
} from "./roles";

describe("module route access", () => {
  test("keeps current role access when modules are unset", () => {
    expect(canAccessRoute("Employee", "/attendance")).toBe(true);
    expect(canAccessRoute("Employee", "/employees")).toBe(false);
    expect(canAccessRoute("HR", "/employees")).toBe(true);
  });

  test("hides modules that are not in the user list", () => {
    const modules = ["dashboard", "settings", "attendance", "leave"];
    expect(canAccessRoute("Employee", "/attendance", modules)).toBe(true);
    expect(canAccessRoute("Employee", "/leave", modules)).toBe(true);
    expect(canAccessRoute("Employee", "/payroll", modules)).toBe(false);
    expect(canAccessRoute("Employee", "/dashboard", modules)).toBe(true);
    expect(canAccessRoute("Employee", "/settings", modules)).toBe(true);
  });

  test("normalizes vendor-prefixed paths", () => {
    const modules = ["dashboard", "settings", "leave"];
    expect(canAccessRoute("Employee", "/acme-org/leave", modules)).toBe(true);
    expect(canAccessRoute("Employee", "/acme-org/payroll", modules)).toBe(false);
  });

  test("role still blocks Employees even if listed", () => {
    expect(
      canAccessRoute("Employee", "/employees", [
        "dashboard",
        "settings",
        "employees",
      ])
    ).toBe(false);
  });

  test("userHasModule hides modules that were not granted", () => {
    const user = { role: "Employee", allowedModules: ["dashboard", "settings", "leave"] };
    expect(userHasModule(user, "leave")).toBe(true);
    expect(userHasModule(user, "payroll")).toBe(false);
    expect(userHasModule(user, "dashboard")).toBe(true);
    expect(userHasModule({ role: "Admin", allowedModules: ["leave"] }, "payroll")).toBe(
      true
    );
  });

  test("visibleDashboardStats drops expense cards without expense access", () => {
    const user = {
      role: "Employee",
      allowedModules: ["dashboard", "settings", "attendance", "leave"],
    };
    const stats = visibleDashboardStats(
      [
        { key: "attendance", label: "Present Days", value: 0 },
        { key: "balance", label: "Leave Balance", value: 49 },
        { key: "pending", label: "Pending Requests", value: 0, subtitle: "0 leave · 0 expense" },
        { key: "expense", label: "Expenses This Month", value: "₹0" },
      ],
      user,
      user.allowedModules,
      { leave: 0, expense: 0 }
    );
    expect(stats.map((s) => s.key)).toEqual(["attendance", "balance", "pending"]);
    expect(stats.find((s) => s.key === "pending").subtitle).toBe("0 leave");
  });

  test("grantable list for Employee omits org-admin modules", () => {
    const keys = grantableModulesForRole("Employee").map((item) => item.key);
    expect(keys).toContain("attendance");
    expect(keys).not.toContain("employees");
    expect(GRANTABLE_MODULES.some((item) => item.key === "employees")).toBe(
      true
    );
  });
});
