import {
  buildApiErrorMessage,
  countCalendarDaysInclusive,
  countWeekdaysInclusive,
  expandAttendanceRange,
  formatShiftTime,
  validateAttendanceRequest,
  validateBulkAttendanceRequest,
} from "./RequestForm";

describe("regularization request helpers", () => {
  test("counts only weekdays in an inclusive leave range", () => {
    expect(countWeekdaysInclusive("2026-09-04", "2026-09-07")).toBe(2);
  });

  test("returns zero for a weekend-only leave range", () => {
    expect(countWeekdaysInclusive("2026-09-05", "2026-09-06")).toBe(0);
  });

  test("counts calendar days including weekends for Comp-Off ranges", () => {
    expect(countCalendarDaysInclusive("2026-09-05", "2026-09-06")).toBe(2);
    expect(countCalendarDaysInclusive("2026-09-07", "2026-09-07")).toBe(1);
    expect(countCalendarDaysInclusive("2026-09-07", "2026-09-06")).toBeNull();
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

  test("flags late-night check-in with earlier check-out (10:00 PM to 5:00 PM)", () => {
    const bounds = { min: "2026-07-10", max: "2026-09-08" };
    const errors = validateAttendanceRequest(
      {
        date: "2026-09-08",
        status: "Present",
        checkIn: "22:00",
        checkOut: "17:00",
        reason: "Correcting attendance status",
      },
      bounds
    );
    expect(errors.checkOut).toMatch(/on or after check-in/i);
  });

  test("allows overnight check-out when the shift is overnight", () => {
    const bounds = { min: "2026-07-10", max: "2026-09-08" };
    const errors = validateAttendanceRequest(
      {
        date: "2026-09-08",
        status: "Present",
        checkIn: "16:00",
        checkOut: "02:00",
        reason: "Night shift correction",
      },
      bounds,
      { allowOvernight: true }
    );
    expect(errors.checkOut).toBeUndefined();
  });

  test("formats shift times for display", () => {
    expect(formatShiftTime("16:00")).toBe("04:00 PM");
    expect(formatShiftTime("02:00")).toBe("02:00 AM");
    expect(formatShiftTime("09:30")).toBe("09:30 AM");
  });

  test("expands a multi-day attendance range", () => {
    expect(expandAttendanceRange("2026-09-01", "2026-09-03")).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
    ]);
    expect(expandAttendanceRange("2026-09-03", "2026-09-01")).toBeNull();
  });

  test("validates a multi-day Present range", () => {
    const bounds = { min: "2026-07-10", max: "2026-09-08" };
    const errors = validateBulkAttendanceRequest(
      {
        status: "Present",
        startDate: "2026-09-01",
        endDate: "2026-09-03",
        checkIn: "09:30",
        checkOut: "18:00",
      },
      bounds
    );
    expect(errors).toEqual({});
  });

  test("rejects bulk range for non-Present status", () => {
    const bounds = { min: "2026-07-10", max: "2026-09-08" };
    const errors = validateBulkAttendanceRequest(
      {
        status: "Late",
        startDate: "2026-09-01",
        endDate: "2026-09-03",
        checkIn: "09:30",
        checkOut: "18:00",
      },
      bounds
    );
    expect(errors.status).toMatch(/only for Present/i);
  });

  test("rejects end date before start date in bulk range", () => {
    const bounds = { min: "2026-07-10", max: "2026-09-08" };
    const errors = validateBulkAttendanceRequest(
      {
        status: "Present",
        startDate: "2026-09-03",
        endDate: "2026-09-01",
        checkIn: "09:30",
        checkOut: "18:00",
      },
      bounds
    );
    expect(errors.endDate).toMatch(/on or after start/i);
  });
});
