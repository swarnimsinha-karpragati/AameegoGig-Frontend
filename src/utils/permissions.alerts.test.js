import {
  ELEVATED_PERMISSIONS,
  ELEVATED_GROUPS,
  RBAC_VERSION,
} from "./permissions";

const ALERT_MODULES = [
  "leave",
  "regularization",
  "expenses",
  "resignation",
  "advance-loan",
  "probation",
  "payroll",
  "helpdesk",
];

describe("role alert access catalog", () => {
  it("bumps RBAC so browsers reload the new alert permissions", () => {
    expect(RBAC_VERSION).toBeGreaterThanOrEqual(6);
  });

  it("exports email and notification alert keys for every alert module", () => {
    ALERT_MODULES.forEach((mod) => {
      expect(ELEVATED_PERMISSIONS).toContain(`${mod}:alert-email`);
      expect(ELEVATED_PERMISSIONS).toContain(`${mod}:alert-notification`);
    });
  });

  it("shows Email alerts and In-app & push alerts under each module group", () => {
    const groupKeys = {
      leave: "leave",
      regularization: "regularization",
      expenses: "expenses",
      resignation: "resignation",
      advanceLoan: "advance-loan",
      probation: "probation",
      payroll: "payroll",
      helpdesk: "helpdesk",
    };

    Object.entries(groupKeys).forEach(([groupKey, mod]) => {
      const group = ELEVATED_GROUPS.find((g) => g.key === groupKey);
      expect(group).toBeTruthy();
      const labels = group.perms.map((p) => p.label);
      expect(group.perms.some((p) => p.key === `${mod}:alert-email`)).toBe(true);
      expect(group.perms.some((p) => p.key === `${mod}:alert-notification`)).toBe(true);
      expect(labels).toContain("Email alerts");
      expect(labels).toContain("In-app & push alerts");
    });
  });
});
