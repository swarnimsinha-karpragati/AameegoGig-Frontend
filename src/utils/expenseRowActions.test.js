import { expenseRowActions, isViewerExpense } from "./expenseRowActions";

const manager = { name: "Asha", employeeId: "mgr-1" };
const ashaOnTeam = {
  status: "Pending",
  employeeId: { _id: "emp-2", name: "Asha" },
};

describe("isViewerExpense", () => {
  test("matches on employee id, including populated objects", () => {
    expect(isViewerExpense({ employeeId: "emp-1" }, { employeeId: "emp-1" })).toBe(true);
    expect(
      isViewerExpense(
        { employeeId: { _id: "emp-1", name: "Asha" } },
        { employeeId: { _id: "emp-1" } }
      )
    ).toBe(true);
  });

  test("does not treat a teammate as the viewer just because the names match", () => {
    expect(isViewerExpense(ashaOnTeam, manager)).toBe(false);
  });
});

describe("expenseRowActions", () => {
  test("Pending Approvals — My Team shows Approve and Reject on a teammate row", () => {
    expect(
      expenseRowActions({ actionMode: "approve", status: "Pending", isOwn: false })
    ).toEqual(["approve", "reject"]);
  });

  test("never offers approve or reject on the viewer's own expense", () => {
    expect(
      expenseRowActions({ actionMode: "approve", status: "Pending", isOwn: true })
    ).toEqual([]);
    expect(
      expenseRowActions({ actionMode: "full", status: "Pending", isOwn: true })
    ).toEqual([]);
  });

  test("owner rows keep submit, delete, and cancel", () => {
    expect(
      expenseRowActions({ actionMode: "owner", status: "Draft", isOwn: true })
    ).toEqual(["submit", "delete"]);
    expect(
      expenseRowActions({ actionMode: "owner", status: "Pending", isOwn: true })
    ).toEqual(["cancel"]);
  });

  test("org full mode adds reimburse after approval", () => {
    expect(
      expenseRowActions({ actionMode: "full", status: "Pending", isOwn: false })
    ).toEqual(["approve", "reject"]);
    expect(
      expenseRowActions({ actionMode: "full", status: "Approved", isOwn: false })
    ).toEqual(["reimburse"]);
  });
});
