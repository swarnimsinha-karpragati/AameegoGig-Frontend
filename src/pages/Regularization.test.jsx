import { buildRegularizationTabs } from "./regularizationTabs";

describe("regularization page helpers", () => {
  test("shows approvals only when Approve Regularization is granted", () => {
    const tabs = buildRegularizationTabs({
      canRequest: true,
      canApprove: true,
      canDirectEdit: false,
    });

    expect(tabs.map((tab) => tab.id)).toContain("approvals");
  });

  test("team mapping alone does not open the approvals tab", () => {
    const tabs = buildRegularizationTabs({
      canRequest: true,
      canApprove: false,
      canDirectEdit: false,
      hasTeam: true,
    });

    expect(tabs.map((tab) => tab.id)).toContain("team");
    expect(tabs.map((tab) => tab.id)).not.toContain("approvals");
  });
});
