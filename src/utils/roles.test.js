import { RBAC_VERSION } from "./permissions";
import * as roleService from "../services/roleService";
import {
  canAccessRoute,
  canReadOrgProfile,
  canReadRolesCatalog,
  fetchRolesCatalog,
  canEditLetterTemplates,
  canIssueLetters,
  canManageOfferCandidates,
  canViewLetters,
  getLetterAccess,
  LETTERS_FULL_ACCESS_ROLES,
  GRANTABLE_MODULES,
  grantableModulesForRole,
  userHasModule,
  visibleDashboardStats,
  getRoleAccessStatus,
  loadRoleAccess,
  refreshSessionFromServer,
  resetRoleAccessLoads,
  SESSION_REQUEST_TIMEOUT_MS,
  subscribeRoleAccess,
} from "./roles";
import { act } from "@testing-library/react";
import { clearAuthData, getStoredUser, setAuthData } from "./authStorage";

jest.mock("../services/roleService", () => ({ getRoles: jest.fn(), getSession: jest.fn() }));

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

  test("regularization requires attendance or leave module", () => {
    expect(
      canAccessRoute("Employee", "/regularization", [
        "dashboard",
        "settings",
        "attendance",
      ])
    ).toBe(true);
    expect(
      canAccessRoute("Employee", "/regularization", [
        "dashboard",
        "settings",
        "leave",
      ])
    ).toBe(true);
    expect(
      canAccessRoute("Employee", "/regularization", [
        "dashboard",
        "settings",
        "payroll",
      ])
    ).toBe(false);
    expect(canAccessRoute("Admin", "/regularization", ["payroll"])).toBe(true);
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

describe("letters module access", () => {
  const saveCatalog = (roles) =>
    localStorage.setItem("rbac_roles", JSON.stringify({ __v: RBAC_VERSION, ...roles }));

  afterEach(() => localStorage.removeItem("rbac_roles"));

  test("Admin and HR reach /letters; Manager and Employee do not", () => {
    expect(canAccessRoute("Admin", "/acme/letters", ["letters"])).toBe(true);
    expect(canAccessRoute("HR", "/letters")).toBe(true);
    expect(canAccessRoute("Manager", "/letters")).toBe(false);
    expect(canAccessRoute("Employee", "/letters")).toBe(false);
  });

  test("HR without the letters module keeps only the consultancy agreement, like Admin (as on the backend)", () => {
    const restricted = ["dashboard", "settings", "employees"];
    expect(getLetterAccess({ role: "HR", allowedModules: restricted })).toMatchObject({
      canView: false,
      canIssueConsultancyAgreement: true,
    });
    expect(canAccessRoute("HR", "/letters", restricted)).toBe(true);
    saveCatalog({ HR: { permissions: ["employees:view"] } });
    expect(canAccessRoute("HR", "/letters", restricted)).toBe(true);
    expect(getLetterAccess({ role: "HR", allowedModules: restricted }).canView).toBe(false);
    expect(canAccessRoute("HR", "/letters", ["dashboard", "settings", "letters"])).toBe(true);
  });

  test("legacy employees:letters grants issuing and viewing, not template editing", () => {
    saveCatalog({ Finance: { permissions: ["employees:letters"] } });
    expect(canIssueLetters("Finance")).toBe(true);
    expect(canViewLetters("Finance")).toBe(true);
    expect(canEditLetterTemplates("Finance")).toBe(false);
    expect(canManageOfferCandidates("Finance")).toBe(false);
  });

  test("any letters grant opens the module for custom roles", () => {
    saveCatalog({ Recruiter: { permissions: ["letters:offers"] }, Clerk: { permissions: [] } });
    expect(canViewLetters("Recruiter")).toBe(true);
    expect(canAccessRoute("Recruiter", "/letters")).toBe(true);
    expect(canAccessRoute("Clerk", "/letters")).toBe(false);
  });

  test("letters is a grantable module for HR but not for Employee", () => {
    expect(grantableModulesForRole("HR").map((m) => m.key)).toContain("letters");
    expect(grantableModulesForRole("Employee").map((m) => m.key)).not.toContain("letters");
  });

  test("getLetterAccess needs the module as well as the permission (matches the backend)", () => {
    expect(getLetterAccess({ role: "HR" })).toEqual({
      canView: true,
      canEdit: true,
      canIssue: true,
      canManageOffers: true,
      canIssueConsultancyAgreement: true,
    });
    const restrictedHr = getLetterAccess({ role: "HR", allowedModules: ["dashboard", "settings", "employees"] });
    expect(restrictedHr).toMatchObject({ canView: false, canEdit: false, canIssue: false, canManageOffers: false });
  });

  test("consultancy managers without Letters may only issue the consultancy agreement", () => {
    saveCatalog({ ConsultLead: { permissions: ["consultancy:manage"] }, Clerk: { permissions: [] } });
    expect(getLetterAccess({ role: "ConsultLead" })).toEqual({
      canView: false,
      canEdit: false,
      canIssue: false,
      canManageOffers: false,
      canIssueConsultancyAgreement: true,
    });
    expect(getLetterAccess({ role: "Clerk" }).canIssueConsultancyAgreement).toBe(false);
    expect(getLetterAccess(null).canView).toBe(false);
  });

  test("consultancy managers without Letters can open /letters (for the consultancy agreement); others cannot", () => {
    saveCatalog({
      ConsultLead: { permissions: ["consultancy:view", "consultancy:manage"] },
      ConsultViewer: { permissions: ["consultancy:view"] },
      Clerk: { permissions: [] },
    });
    expect(canAccessRoute("ConsultLead", "/acme/letters")).toBe(true);
    expect(canAccessRoute("ConsultLead", "/letters", ["dashboard", "settings"])).toBe(true);
    expect(canAccessRoute("ConsultViewer", "/letters")).toBe(false);
    expect(canAccessRoute("Clerk", "/letters")).toBe(false);
  });

  test("/letters route access is exactly 'can view letters or can issue the consultancy agreement'", () => {
    saveCatalog({
      ConsultLead: { permissions: ["consultancy:manage"] },
      Recruiter: { permissions: ["letters:offers"] },
      Clerk: { permissions: [] },
    });
    const cases = [
      ["Admin", undefined],
      ["HR", undefined],
      ["HR", ["dashboard", "settings", "employees"]],
      ["Manager", undefined],
      ["Employee", undefined],
      ["ConsultLead", undefined],
      ["Recruiter", undefined],
      ["Clerk", undefined],
    ];
    for (const [role, allowedModules] of cases) {
      const access = getLetterAccess({ role, allowedModules });
      expect([role, allowedModules, canAccessRoute(role, "/letters", allowedModules)]).toEqual([
        role,
        allowedModules,
        access.canView || access.canIssueConsultancyAgreement,
      ]);
    }
  });

  test("HR has exactly Admin's Letters access even when its role row has no letters permissions", () => {
    saveCatalog({ HR: { permissions: ["employees:view"] } });
    expect(LETTERS_FULL_ACCESS_ROLES).toEqual(["Admin", "HR"]);
    for (const helper of [canViewLetters, canEditLetterTemplates, canIssueLetters, canManageOfferCandidates]) {
      expect([helper.name, helper("HR")]).toEqual([helper.name, helper("Admin")]);
      expect([helper.name, helper("HR")]).toEqual([helper.name, true]);
    }
    expect(getLetterAccess({ role: "HR" })).toEqual(getLetterAccess({ role: "Admin" }));
    expect(getLetterAccess({ role: "HR" })).toEqual({
      canView: true,
      canEdit: true,
      canIssue: true,
      canManageOffers: true,
      canIssueConsultancyAgreement: true,
    });
  });

  test("the Letters module gate applies to HR exactly as to Admin", () => {
    saveCatalog({ HR: { permissions: ["employees:view"] } });
    const withoutLetters = ["dashboard", "settings", "employees"];
    const hr = getLetterAccess({ role: "HR", allowedModules: withoutLetters });
    expect(hr).toEqual(getLetterAccess({ role: "Admin", allowedModules: withoutLetters }));
    expect(hr).toEqual({
      canView: false,
      canEdit: false,
      canIssue: false,
      canManageOffers: false,
      canIssueConsultancyAgreement: true,
    });
    expect(canAccessRoute("HR", "/letters", withoutLetters)).toBe(canAccessRoute("Admin", "/letters", withoutLetters));
  });

  test("custom roles get exactly their letters grants", () => {
    saveCatalog({ Recruiter: { permissions: ["letters:offers"] } });
    expect(getLetterAccess({ role: "Recruiter" })).toMatchObject({ canView: true, canManageOffers: true, canIssue: false, canEdit: false });
  });
});

describe("server reads follow the backend gates (Admin, HR, or the permission)", () => {
  const saveCatalog = (roles) =>
    localStorage.setItem("rbac_roles", JSON.stringify({ __v: RBAC_VERSION, ...roles }));

  beforeEach(() => {
    jest.clearAllMocks();
    saveCatalog({
      ConsultLead: { permissions: ["consultancy:view", "consultancy:manage"] },
      OrgEditor: { permissions: ["settings:org"] },
      RoleAdmin: { permissions: ["roles:manage"] },
    });
  });
  afterEach(() => {
    localStorage.removeItem("rbac_roles");
    localStorage.removeItem("user");
  });

  test("the roles catalog is readable by Admin, HR and roles:manage only", () => {
    expect(["Admin", "HR", "RoleAdmin", "ConsultLead", "Manager", "Employee", undefined].map(canReadRolesCatalog)).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
      false,
    ]);
  });

  test("the organisation profile is readable by Admin, HR and settings:org only", () => {
    expect(["Admin", "HR", "OrgEditor", "ConsultLead", "Employee", undefined].map(canReadOrgProfile)).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
    ]);
  });

  test("a consultancy-only user never requests the full catalog and still refreshes from the session", async () => {
    localStorage.setItem("user", JSON.stringify({ role: "ConsultLead" }));
    roleService.getSession.mockResolvedValue({
      user: { role: "ConsultLead" },
      roleName: "ConsultLead",
      permissions: ["consultancy:view", "consultancy:manage"],
    });
    const merged = await fetchRolesCatalog();
    expect(roleService.getRoles).not.toHaveBeenCalled();
    expect(roleService.getSession).toHaveBeenCalledTimes(1);
    expect(merged.ConsultLead.permissions).toEqual(["consultancy:view", "consultancy:manage"]);
  });

  test("HR still reads the full catalog", async () => {
    localStorage.setItem("user", JSON.stringify({ role: "HR" }));
    roleService.getRoles.mockResolvedValue([{ roleName: "Recruiter", permissions: ["letters:offers"] }]);
    const merged = await fetchRolesCatalog();
    expect(roleService.getRoles).toHaveBeenCalledTimes(1);
    expect(merged.Recruiter.permissions).toEqual(["letters:offers"]);
  });
});

describe("slow session requests (timeout is not 'no permissions')", () => {
  const VIEWER_SESSION = { user: { role: "LetterViewer" }, roleName: "LetterViewer", permissions: ["letters:view"] };
  const flush = () =>
    act(async () => {
      await Promise.resolve();
    });

  beforeEach(() => {
    jest.clearAllMocks();
    resetRoleAccessLoads();
    localStorage.removeItem("rbac_roles");
    localStorage.setItem("user", JSON.stringify({ role: "LetterViewer" }));
  });
  afterEach(() => {
    jest.useRealTimers();
    localStorage.removeItem("rbac_roles");
    localStorage.removeItem("user");
  });

  test("a session that lands after the timeout is still applied, and announces the change", async () => {
    jest.useFakeTimers();
    let resolve;
    roleService.getSession.mockImplementation(() => new Promise((r) => (resolve = r)));
    const updated = jest.fn();
    window.addEventListener("roles-updated", updated);

    const waiting = refreshSessionFromServer();
    await flush();
    jest.advanceTimersByTime(SESSION_REQUEST_TIMEOUT_MS);
    await expect(waiting).resolves.toBeNull();
    expect(canAccessRoute("LetterViewer", "/acme/letters")).toBe(false);

    resolve(VIEWER_SESSION);
    await flush();
    expect(canAccessRoute("LetterViewer", "/acme/letters")).toBe(true);
    expect(updated).toHaveBeenCalled();
    window.removeEventListener("roles-updated", updated);
  });

  test("role access goes loading → failed on timeout → loaded when the late answer arrives", async () => {
    jest.useFakeTimers();
    let resolve;
    roleService.getSession.mockImplementation(() => new Promise((r) => (resolve = r)));
    const seen = [];
    const unsubscribe = subscribeRoleAccess(() => seen.push(getRoleAccessStatus("LetterViewer")));

    expect(getRoleAccessStatus("LetterViewer")).toBe("idle");
    loadRoleAccess("LetterViewer");
    expect(getRoleAccessStatus("LetterViewer")).toBe("loading");
    await flush();
    await act(async () => {
      jest.advanceTimersByTime(SESSION_REQUEST_TIMEOUT_MS);
    });
    expect(getRoleAccessStatus("LetterViewer")).toBe("failed");

    resolve(VIEWER_SESSION);
    await flush();
    expect(getRoleAccessStatus("LetterViewer")).toBe("loaded");
    expect(seen).toEqual(expect.arrayContaining(["failed", "loaded"]));
    unsubscribe();
  });

  test("a failed load is retried by the next request; a successful one is reused", async () => {
    roleService.getSession.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(VIEWER_SESSION);
    await loadRoleAccess("LetterViewer");
    expect(getRoleAccessStatus("LetterViewer")).toBe("failed");
    await loadRoleAccess("LetterViewer");
    expect(getRoleAccessStatus("LetterViewer")).toBe("loaded");
    await loadRoleAccess("LetterViewer");
    expect(roleService.getSession).toHaveBeenCalledTimes(2);
  });

  describe("a late answer never lands on a different user", () => {
    const OTHER_SESSION = {
      user: { _id: "user-a", name: "User A", role: "LetterAdmin", allowedModules: ["letters", "payroll"] },
      roleName: "LetterAdmin",
      permissions: ["letters:view", "letters:manage"],
    };
    afterEach(() => clearAuthData());

    test("token changes while the request is pending: the answer is dropped", async () => {
      setAuthData("token-a", { _id: "user-a", role: "LetterViewer" }, true);
      let resolve;
      roleService.getSession.mockImplementation(() => new Promise((r) => (resolve = r)));
      const pending = refreshSessionFromServer();
      await flush();

      localStorage.setItem("token", "token-b");
      resolve(OTHER_SESSION);
      await expect(pending).resolves.toBeNull();
      expect(getStoredUser()).toEqual({ _id: "user-a", role: "LetterViewer" });
      expect(canAccessRoute("LetterAdmin", "/acme/letters")).toBe(false);
    });

    test("logout then login of another user while A's request is pending", async () => {
      jest.useFakeTimers();
      setAuthData("token-a", { _id: "user-a", role: "LetterAdmin" }, true);
      let resolveA;
      roleService.getSession.mockImplementationOnce(() => new Promise((r) => (resolveA = r)));
      loadRoleAccess("LetterAdmin");
      await flush();
      expect(getRoleAccessStatus("LetterAdmin")).toBe("loading");

      clearAuthData();
      expect(getRoleAccessStatus("LetterAdmin")).toBe("idle");
      setAuthData("token-b", { _id: "user-b", role: "LetterViewer" }, false);
      const viewerB = { user: { _id: "user-b", role: "LetterViewer" }, roleName: "LetterViewer", permissions: ["letters:view"] };
      roleService.getSession.mockResolvedValueOnce(viewerB);
      await act(() => loadRoleAccess("LetterViewer"));
      expect(roleService.getSession).toHaveBeenCalledTimes(2);
      expect(getRoleAccessStatus("LetterViewer")).toBe("loaded");

      resolveA(OTHER_SESSION);
      await flush();
      const storedUsers = [localStorage, sessionStorage].map((storage) => JSON.parse(storage.getItem("user") || "null")).filter(Boolean);
      expect(storedUsers.length).toBeGreaterThan(0);
      storedUsers.forEach((stored) => expect(stored).toEqual({ _id: "user-b", role: "LetterViewer" }));
      expect(getStoredUser()).toEqual({ _id: "user-b", role: "LetterViewer" });
      expect(JSON.parse(localStorage.getItem("rbac_roles") || "{}").LetterAdmin).toBeUndefined();
      expect(getRoleAccessStatus("LetterAdmin")).toBe("idle");
      expect(canAccessRoute("LetterAdmin", "/acme/letters")).toBe(false);
    });

    test("a late answer for the same user is still applied", async () => {
      jest.useFakeTimers();
      setAuthData("token-a", { _id: "user-a", role: "LetterViewer" }, true);
      let resolve;
      roleService.getSession.mockImplementation(() => new Promise((r) => (resolve = r)));
      loadRoleAccess("LetterViewer");
      await flush();
      await act(async () => {
        jest.advanceTimersByTime(SESSION_REQUEST_TIMEOUT_MS);
      });
      expect(getRoleAccessStatus("LetterViewer")).toBe("failed");
      resolve(VIEWER_SESSION);
      await flush();
      expect(getRoleAccessStatus("LetterViewer")).toBe("loaded");
      expect(canAccessRoute("LetterViewer", "/acme/letters")).toBe(true);
    });
  });

  test("a request that never answers does not block a later retry", async () => {
    jest.useFakeTimers();
    roleService.getSession.mockImplementationOnce(() => new Promise(() => {})).mockResolvedValueOnce(VIEWER_SESSION);
    loadRoleAccess("LetterViewer");
    await flush();
    await act(async () => {
      jest.advanceTimersByTime(SESSION_REQUEST_TIMEOUT_MS);
    });
    expect(getRoleAccessStatus("LetterViewer")).toBe("failed");
    await act(() => loadRoleAccess("LetterViewer"));
    expect(roleService.getSession).toHaveBeenCalledTimes(2);
    expect(getRoleAccessStatus("LetterViewer")).toBe("loaded");
  });
});
