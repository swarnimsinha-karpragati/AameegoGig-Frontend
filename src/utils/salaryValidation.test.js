import {
  validateComponentCode,
  validateComponentName,
  validateMonetaryAmount,
  validateAnnualCtc,
  validateStructureDraft,
  validateLetterSalaryStructure,
  resolveSalaryLineMonthly,
  contributesToGross,
  MAX_MONTHLY_AMOUNT,
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
});
