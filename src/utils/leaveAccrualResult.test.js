import {
  formatLeaveAccrualResultMessage,
  isWholeRunSkipped,
} from "./leaveAccrualResult";

describe("monthly accrual result banner", () => {
  test("summarizes credited, already credited, and skipped employees", () => {
    expect(
      formatLeaveAccrualResultMessage({
        year: 2026,
        month: 9,
        credited: 2,
        alreadyCredited: 1,
        skipped: 3,
      })
    ).toBe(
      "Leave accrual completed for 2026-09. Credited: 2 · Already credited: 1 · Skipped: 3"
    );
  });

  test("does not treat a numeric skipped count as a whole-run skip", () => {
    expect(isWholeRunSkipped({ skipped: 4, credited: 1 })).toBe(false);
    expect(isWholeRunSkipped({ skipped: true })).toBe(true);
    expect(
      formatLeaveAccrualResultMessage({
        skipped: 4,
        credited: 0,
        alreadyCredited: 0,
        year: 2026,
        month: 9,
      })
    ).toMatch(/Skipped: 4/);
  });

  test("keeps a backend message that already includes the counts", () => {
    const message =
      "Leave accrual completed for 2026-09. Credited: 2 · Already credited: 1 · Skipped: 3";
    expect(
      formatLeaveAccrualResultMessage({
        message,
        credited: 2,
        alreadyCredited: 1,
        skipped: 3,
      })
    ).toBe(message);
  });
});
