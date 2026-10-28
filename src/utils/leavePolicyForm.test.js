import {
  elAccrualFieldsForSave,
  monthlyCreditExceedsYearlyCapWarning,
  showsMinPaidDaysField,
  showsWorkingDaysField,
} from "./leavePolicyForm";

describe("EL proration and minimum paid days", () => {
  test("prorate by paid days keeps both working days and the paid-day minimum", () => {
    expect(showsMinPaidDaysField("prorate_paid_days")).toBe(true);
    expect(showsWorkingDaysField("prorate_paid_days")).toBe(true);
    expect(showsMinPaidDaysField("full_if_min_present")).toBe(true);
    expect(showsWorkingDaysField("full_if_min_present")).toBe(false);

    const saved = elAccrualFieldsForSave({
      code: "EL",
      accrual: {
        method: "prorate_paid_days",
        monthlyCredit: 1.5,
        yearlyCap: 15,
        standardWorkingDays: 26,
        minPresentDays: 21,
      },
    });
    expect(saved).toEqual({
      method: "prorate_paid_days",
      monthlyCredit: 1.5,
      yearlyCap: 15,
      minPresentDays: 21,
      standardWorkingDays: 26,
    });
  });

  test("fixed monthly does not persist attendance-linked fields", () => {
    const saved = elAccrualFieldsForSave({
      code: "EL",
      accrual: {
        method: "fixed_monthly",
        monthlyCredit: 0.5,
        yearlyCap: 6,
        minPresentDays: 21,
        standardWorkingDays: 26,
      },
    });
    expect(saved.minPresentDays).toBe(0);
    expect(saved.standardWorkingDays).toBe(0);
  });
});

describe("yearly cap warning", () => {
  test("warns when 1.5 × 12 exceeds a 15-day yearly maximum", () => {
    expect(
      monthlyCreditExceedsYearlyCapWarning({ monthlyCredit: 1.5, yearlyCap: 15 })
    ).toMatch(/Annual credit of 18 days \(1\.5 × 12\) exceeds the yearly maximum of 15 days/);
  });

  test("is silent when the projected year stays within the cap", () => {
    expect(
      monthlyCreditExceedsYearlyCapWarning({ monthlyCredit: 1.5, yearlyCap: 18 })
    ).toBeNull();
  });
});
