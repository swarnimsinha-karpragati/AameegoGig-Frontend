import { buildApiErrorMessage, countWeekdaysInclusive } from "./RequestForm";

describe("regularization request helpers", () => {
  test("counts only weekdays in an inclusive leave range", () => {
    expect(countWeekdaysInclusive("2026-09-04", "2026-09-07")).toBe(2);
  });

  test("returns zero for a weekend-only leave range", () => {
    expect(countWeekdaysInclusive("2026-09-05", "2026-09-06")).toBe(0);
  });

  test("prefers API message and falls back to API error", () => {
    expect(
      buildApiErrorMessage(
        { response: { data: { message: "Specific validation failed", error: "Other" } } },
        "Fallback"
      )
    ).toBe("Specific validation failed");
    expect(
      buildApiErrorMessage(
        { response: { data: { error: "Legacy API error" } } },
        "Fallback"
      )
    ).toBe("Legacy API error");
  });
});
