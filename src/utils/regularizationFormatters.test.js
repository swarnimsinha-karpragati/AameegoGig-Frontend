import { formatAttendanceHours } from "./regularizationFormatters";

describe("formatAttendanceHours", () => {
  test("formats same-day durations", () => {
    expect(formatAttendanceHours("09:30", "18:00")).toBe("8h 30m");
  });

  test("shows dash for check-out before check-in on day shift", () => {
    expect(formatAttendanceHours("16:00", "02:00")).toBe("—");
  });

  test("computes overnight duration when the shift is overnight", () => {
    expect(
      formatAttendanceHours("16:00", "02:00", { allowOvernight: true })
    ).toBe("10h 00m");
  });

  test("handles 12-hour display strings for overnight sessions", () => {
    expect(
      formatAttendanceHours("04:00 PM", "02:00 AM", { allowOvernight: true })
    ).toBe("10h 00m");
  });

  test("shows dash when times are missing", () => {
    expect(formatAttendanceHours("", "18:00")).toBe("—");
    expect(formatAttendanceHours("09:00", "")).toBe("—");
  });
});
