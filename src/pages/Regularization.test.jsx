import { buildRegularizationTabs } from "./regularizationTabs";

describe("regularization page helpers", () => {
  test("shows approvals for an employee team lead capability", () => {
    const tabs = buildRegularizationTabs({
      canRequest: true,
      canApprove: true,
      canDirectEdit: false,
    });

    expect(tabs.map((tab) => tab.id)).toContain("approvals");
  });
});
