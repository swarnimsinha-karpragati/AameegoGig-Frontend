import {
  validateComponentCode,
  validateComponentName,
  validateMonetaryAmount,
  validateAnnualCtc,
  validateStructureDraft,
  validateComponentsMatchCtc,
  validateLetterSalaryStructure,
  resolveSalaryLineMonthly,
  sumLetterMonthlyGross,
  isMonthlyGrossWithinCtc,
  contributesToGross,
  MAX_MONTHLY_AMOUNT,
  MIN_ANNUAL_CTC,
} from "./salaryValidation";

describe("salaryValidation (frontend)", () => {
  test("rejects invalid component codes with special characters", () => {
    expect(validateComponentCode("FOO-BAR")).toMatch(/only A-Z/i);
    expect(validateComponentCode("VALID_CODE")).toBeNull();
  });

  test("rejects unsafe display names", () => {
    expect(validateComponentName("<img onerror=alert(1)>")).toMatch(/unsafe/i);
  });

  test("enforces monthly amount ceiling", () => {
    expect(validateMonetaryAmount(MAX_MONTHLY_AMOUNT + 1, "Amount")).toMatch(/cannot exceed/i);
  });

  test("validates annual CTC cap", () => {
    expect(validateAnnualCtc(50_000_000)).toBeNull();
    expect(validateAnnualCtc(200_000_000)).toMatch(/Annual CTC/i);
  });

  test("requires annual CTC of at least ₹12", () => {
    expect(MIN_ANNUAL_CTC).toBe(12);
    expect(validateAnnualCtc("")).toMatch(/required/i);
    expect(validateAnnualCtc(0)).toMatch(/cannot be less than/i);
    expect(validateAnnualCtc(11)).toMatch(/cannot be less than/i);
    expect(validateAnnualCtc(12)).toBeNull();
    expect(validateAnnualCtc(600000)).toBeNull();
  });

  test("rejects structure draft when gross exceeds monthly CTC", () => {
    const errors = validateStructureDraft({
      ctcAnnual: 600000,
      components: [
        { code: "BASIC", name: "Basic", category: "Earning", monthlyAmount: 60000, enabled: true },
      ],
    });
    expect(errors.some((e) => /cannot exceed monthly CTC/i.test(e))).toBe(true);
  });

  test("accepts CTC split totals when annual CTC is not divisible by 12", () => {
    const errors = validateStructureDraft({
      ctcAnnual: 500001,
      components: [
        { code: "BASIC", name: "Basic", category: "Earning", monthlyAmount: 41667, enabled: true },
      ],
    });
    expect(errors).toEqual([]);
  });

  test("validateLetterSalaryStructure uses only appointment letter earning lines", () => {
    const errors = validateLetterSalaryStructure({
      annualCTC: 500001,
      salaryComponents: [
        { code: "BASIC", componentName: "Basic", monthly: 20000, annual: 240000 },
        { code: "SPECIAL", componentName: "Special", monthly: 21667, annual: 260004 },
      ],
    });
    expect(errors).toEqual([]);
  });

  test("validateLetterSalaryStructure resolves monthly from annual column", () => {
    const errors = validateLetterSalaryStructure({
      annualCTC: 600000,
      salaryComponents: [{ code: "BASIC", componentName: "Basic", monthly: "", annual: 600000 }],
    });
    expect(errors).toEqual([]);
  });

  test("excludes percent-based earnings from gross cap", () => {
    const errors = validateStructureDraft({
      ctcAnnual: 600000,
      components: [
        { code: "BASIC", category: "Earning", monthlyAmount: 50000, enabled: true, calculationType: "FixedMonthly" },
        {
          code: "HRA",
          category: "Earning",
          monthlyAmount: 8000,
          enabled: true,
          calculationType: "PercentOfComponent",
        },
      ],
    });
    expect(errors).toEqual([]);
  });

  test("sumLetterMonthlyGross resolves from annual when monthly is empty", () => {
    const lines = [{ code: "BASIC", monthly: "", annual: 600000 }];
    expect(sumLetterMonthlyGross(lines)).toBe(50000);
  });

  test("allows small rounding buffer per earning line", () => {
    expect(isMonthlyGrossWithinCtc(41669, 500001, { lineCount: 4 })).toBe(true);
    expect(isMonthlyGrossWithinCtc(50000, 480000, { lineCount: 4 })).toBe(false);
  });

  test("validateComponentsMatchCtc passes when earnings + employer contributions × 12 equal the annual CTC", () => {
    const err = validateComponentsMatchCtc({
      ctcAnnual: 600000,
      components: [
        { code: "BASIC", category: "Earning", monthlyAmount: 25000, enabled: true },
        { code: "HRA", category: "Earning", monthlyAmount: 12500, enabled: true },
        { code: "SPECIAL", category: "Earning", monthlyAmount: 11500, enabled: true },
        { code: "PF_ER", category: "Deduction", isEmployerContribution: true, monthlyAmount: 1000, enabled: true },
      ],
    });
    expect(err).toBe("");
  });

  test("validateComponentsMatchCtc blocks when earnings + employer × 12 is less than CTC", () => {
    const err = validateComponentsMatchCtc({
      ctcAnnual: 600000,
      components: [
        { code: "BASIC", category: "Earning", monthlyAmount: 20000, enabled: true },
      ],
    });
    expect(err).toMatch(/Total Earnings \+ Employer Contributions \(₹2,40,000\) is ₹3,60,000 less than Annual CTC \(₹6,00,000\)/i);
  });

  test("validateComponentsMatchCtc blocks when earnings + employer × 12 exceeds CTC", () => {
    const err = validateComponentsMatchCtc({
      ctcAnnual: 12,
      components: [
        { code: "BASIC", category: "Earning", monthlyAmount: 2, enabled: true },
        { code: "PF_ER", category: "Deduction", isEmployerContribution: true, monthlyAmount: 2, enabled: true },
      ],
    });
    expect(err).toMatch(/Total Earnings \+ Employer Contributions \(₹48\) exceeds Annual CTC \(₹12\) by ₹36/i);
  });

  test("validateComponentsMatchCtc tolerates CTC not divisible by 12", () => {
    const err = validateComponentsMatchCtc({
      ctcAnnual: 500001,
      components: [
        { code: "BASIC", category: "Earning", monthlyAmount: 41667, enabled: true },
      ],
    });
    expect(err).toBe("");
  });

  test("validateComponentsMatchCtc counts employer contributions but ignores disabled lines and employee deductions", () => {
    expect(
      validateComponentsMatchCtc({
        ctcAnnual: 600000,
        components: [
          { code: "BASIC", category: "Earning", monthlyAmount: 40000, enabled: true },
          { code: "SPECIAL", category: "Earning", monthlyAmount: 9000, enabled: true },
          { code: "PF_ER", category: "Deduction", isEmployerContribution: true, monthlyAmount: 1000, enabled: true },
          { code: "PF_EE", category: "Deduction", monthlyAmount: 1000, enabled: true },
          { code: "LTA", category: "Earning", monthlyAmount: 99999, enabled: false },
        ],
      })
    ).toBe("");
  });

  test("validateComponentsMatchCtc skips validation without CTC or components", () => {
    expect(validateComponentsMatchCtc({ ctcAnnual: 0, components: [] })).toBe("");
    expect(validateComponentsMatchCtc({ ctcAnnual: 600000, components: [] })).toBe("");
  });
});
