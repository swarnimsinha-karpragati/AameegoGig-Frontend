import { getMonthMaxDays, validateLimitInput } from "./RegularizationConfigPanel";

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
      expect(result.message).toBe("Please enter a valid monthly attendance limit.");
    });
    const leaveResult = validateLimitInput("29", "leave", 28);
    expect(leaveResult.ok).toBe(false);
    expect(leaveResult.message).toBe("Please enter a valid monthly leave limit.");
  });
});
