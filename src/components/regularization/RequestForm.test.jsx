import {
  buildApiErrorMessage,
  countWeekdaysInclusive,
  validateAttendanceRequest,
} from "./RequestForm";

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

  test("requires both times for worked attendance statuses", () => {
    const bounds = { min: "2026-07-10", max: "2026-09-08" };
    const errors = validateAttendanceRequest(
      {
        date: "2026-09-08",
        status: "Present",
        checkIn: "",
        checkOut: "",
        reason: "Missed biometric sync",
      },
      bounds
    );

    expect(errors.checkIn).toMatch(/required/i);
    expect(errors.checkOut).toMatch(/required/i);
  });

  test("allows blank times for absent attendance", () => {
    const bounds = { min: "2026-07-10", max: "2026-09-08" };
    const errors = validateAttendanceRequest(
      {
        date: "2026-09-08",
        status: "Absent",
        checkIn: "",
        checkOut: "",
        reason: "Correcting attendance status",
      },
      bounds
    );

    expect(errors.checkIn).toBeUndefined();
    expect(errors.checkOut).toBeUndefined();
  });

  test("leaves shift-duration validation to the backend department shift", () => {
    const bounds = { min: "2026-07-10", max: "2026-09-08" };
    const errors = validateAttendanceRequest(
      {
        date: "2026-09-08",
        status: "Present",
        checkIn: "09:00",
        checkOut: "18:01",
        reason: "Correcting attendance status",
      },
      bounds
    );
    expect(errors.checkOut).toBeUndefined();
  });

  test("allows an exact nine hour shift", () => {
    const bounds = { min: "2026-07-10", max: "2026-09-08" };
    const errors = validateAttendanceRequest(
      {
        date: "2026-09-08",
        status: "Present",
        checkIn: "09:00",
        checkOut: "18:00",
        reason: "Correcting attendance status",
      },
      bounds
    );
    expect(errors.checkOut).toBeUndefined();
  });

  test("flags check-out before check-in", () => {
    const bounds = { min: "2026-07-10", max: "2026-09-08" };
    const errors = validateAttendanceRequest(
      {
        date: "2026-09-08",
        status: "Present",
        checkIn: "18:00",
        checkOut: "09:30",
        reason: "Correcting attendance status",
      },
      bounds
    );
    expect(errors.checkOut).toMatch(/on or after check-in/i);
  });
});
