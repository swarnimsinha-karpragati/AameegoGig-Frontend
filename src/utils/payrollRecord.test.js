import { getPayrollPeriod } from "./payrollRecord";

describe("getPayrollPeriod", () => {
  test("uses the backend window for an in-progress month and labels its last day", () => {
    const period = getPayrollPeriod({
      totalDaysInMonth: 30,
      calculationBreakdown: {
        cappedToToday: true,
        payrollWindow: {
          startDate: "2026-08-31T18:30:00.000Z",
          endDate: "2026-09-28T18:30:00.000Z",
          windowDays: 29,
        },
      },
    });
    expect(period.cappedToToday).toBe(true);
    expect(period.periodDays).toBe(29);
    expect(period.periodEndLabel).toMatch(/29 Sept?/);
  });

  test("falls back to salaryEngine.windowDays when payrollWindow has no count", () => {
    const period = getPayrollPeriod({
      totalDaysInMonth: 30,
      calculationBreakdown: { cappedToToday: true, salaryEngine: { windowDays: 29 } },
    });
    expect(period.periodDays).toBe(29);
    expect(period.periodEndLabel).toBeNull();
  });

  test("uses the full month for a completed month", () => {
    const period = getPayrollPeriod({
      totalDaysInMonth: 31,
      calculationBreakdown: {
        cappedToToday: false,
        payrollWindow: { endDate: "2026-08-31T18:29:59.000Z", windowDays: 31 },
      },
    });
    expect(period).toEqual({ cappedToToday: false, periodDays: 31, periodEndLabel: null });
  });

  test("handles records without a breakdown", () => {
    expect(getPayrollPeriod({ totalDaysInMonth: 30 })).toEqual({
      cappedToToday: false,
      periodDays: 30,
      periodEndLabel: null,
    });
    expect(getPayrollPeriod(undefined).periodDays).toBeUndefined();
  });
});
