import {
  getMonthMaxDays,
  normalizeIntegerInput,
  validateDaysWindowInput,
  validateLimitInput,
} from "./RegularizationConfigPanel";

describe("regularization configuration helpers", () => {
  test("caps the limit at the calendar month length", () => {
    expect(getMonthMaxDays(new Date(2026, 0, 15))).toBe(31);
    expect(getMonthMaxDays(new Date(2026, 1, 10))).toBe(28);
    expect(getMonthMaxDays(new Date(2024, 1, 10))).toBe(29);
    expect(getMonthMaxDays(new Date(2026, 3, 1))).toBe(30);
  });

  test("treats blank input as unlimited", () => {
    expect(validateLimitInput("", "attendance", 31)).toEqual({ ok: true, value: null });
    expect(validateLimitInput("   ", "leave", 28)).toEqual({ ok: true, value: null });
  });

  test("accepts whole numbers from 1 to the month length", () => {
    expect(validateLimitInput("1", "attendance", 31)).toEqual({ ok: true, value: 1 });
    expect(validateLimitInput("5", "attendance", 31)).toEqual({ ok: true, value: 5 });
    expect(validateLimitInput("28", "leave", 28)).toEqual({ ok: true, value: 28 });
  });

  test("rejects zero, out-of-range and non-integer input with a generic message", () => {
    ["0", "-1", "2.5", "abc", "32"].forEach((raw) => {
      const result = validateLimitInput(raw, "attendance", 31);
      expect(result.ok).toBe(false);
      expect(result.message).toBe(
        "Please enter a valid monthly attendance limit between 1 and 31."
      );
    });
    const leaveResult = validateLimitInput("29", "leave", 28);
    expect(leaveResult.ok).toBe(false);
    expect(leaveResult.message).toBe(
      "Please enter a valid monthly leave limit between 1 and 28."
    );
  });

  test("rejects monthly limits with leading zeros", () => {
    ["01", "05", "0001"].forEach((raw) => {
      const result = validateLimitInput(raw, "attendance", 31);
      expect(result.ok).toBe(false);
      expect(result.message).toBe(
        "Please enter the monthly attendance limit without leading zeros (for example 5, not 05)."
      );
    });
  });

  test("accepts valid submission windows and rejects leading zeros", () => {
    expect(validateDaysWindowInput("15", "attendance")).toEqual({ ok: true, value: 15 });
    expect(validateDaysWindowInput("365", "leave")).toEqual({ ok: true, value: 365 });

    ["01", "015", "0001"].forEach((raw) => {
      const result = validateDaysWindowInput(raw, "attendance");
      expect(result.ok).toBe(false);
      expect(result.message).toBe(
        "Please enter the attendance submission window without leading zeros (for example 15, not 015)."
      );
    });
  });

  test("requires a submission window", () => {
    expect(validateDaysWindowInput("", "leave")).toEqual({
      ok: false,
      message:
        "Submission window for leave is required. Please specify the allowed past days.",
    });
  });

  test("normalizes typed input by removing leading zeros", () => {
    expect(normalizeIntegerInput("01")).toBe("1");
    expect(normalizeIntegerInput("0001")).toBe("1");
    expect(normalizeIntegerInput("0015")).toBe("15");
    expect(normalizeIntegerInput("10")).toBe("10");
    expect(normalizeIntegerInput("0")).toBe("0");
    expect(normalizeIntegerInput("")).toBe("");
    expect(normalizeIntegerInput("1a2")).toBe("12");
  });

  test("strips signs and every non-digit character", () => {
    expect(normalizeIntegerInput("-15")).toBe("15");
    expect(normalizeIntegerInput("+15")).toBe("15");
    expect(normalizeIntegerInput("1.5")).toBe("15");
    expect(normalizeIntegerInput("1e2")).toBe("12");
    expect(normalizeIntegerInput(" 15 ")).toBe("15");
  });
});
