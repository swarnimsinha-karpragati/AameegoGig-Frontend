import {
  validateComponentCode,
  validateComponentName,
  validateMonetaryAmount,
  validateAnnualCtc,
  validateStructureDraft,
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
});
