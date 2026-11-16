import {
  countLeaveWorkingDays,
  holidayKeysFromApiList,
  monthsSpannedByRange,
  toOrgDateKey,
} from "./leaveWorkingDays";

describe("leaveWorkingDays", () => {
  test("toOrgDateKey maps IST midnight UTC instants to the IST calendar day", () => {
    // 2026-11-08T18:30:00.000Z == 2026-11-09 00:00 IST (Deepawali in prod)
    expect(toOrgDateKey("2026-11-08T18:30:00.000Z")).toBe("2026-11-09");
    expect(toOrgDateKey("2026-11-09")).toBe("2026-11-09");
  });

  test("monthsSpannedByRange covers each month in the selection", () => {
    expect(monthsSpannedByRange("2026-10-28", "2026-11-10")).toEqual([
      { year: 2026, month: 10 },
      { year: 2026, month: 11 },
    ]);
  });

  test("Nov 2–10 with Sat/Sun off and Deepawali Mon 9 is 6 working days", () => {
    // Weekdays: 2,3,4,5,6,9,10 = 7; exclude Deepawali 9 => 6
    expect(
      countLeaveWorkingDays({
        startDate: "2026-11-02",
        endDate: "2026-11-10",
        weekOffDays: ["Saturday", "Sunday"],
        holidayDateKeys: ["2026-11-08", "2026-11-09"],
      })
    ).toBe(6);
  });

  test("Nov 2–10 without holiday keys still counts 7 (weekends only)", () => {
    expect(
      countLeaveWorkingDays({
        startDate: "2026-11-02",
        endDate: "2026-11-10",
        weekOffDays: ["Saturday", "Sunday"],
      })
    ).toBe(7);
  });

  test("Nov 2–9 with Deepawali Mon 9 is 5 working days", () => {
    expect(
      countLeaveWorkingDays({
        startDate: "2026-11-02",
        endDate: "2026-11-09",
        weekOffDays: ["Saturday", "Sunday"],
        holidayDateKeys: ["2026-11-09"],
      })
    ).toBe(5);
  });

  test("CO credit includes weekends and holidays (calendar days)", () => {
    expect(
      countLeaveWorkingDays({
        startDate: "2026-11-07",
        endDate: "2026-11-09",
        includeOffDays: true,
        holidayDateKeys: ["2026-11-09"],
      })
    ).toBe(3);
  });

  test("holidayKeysFromApiList normalizes API dates and skips inactive", () => {
    expect(
      holidayKeysFromApiList([
        { date: "2026-11-08T18:30:00.000Z", isActive: true },
        { date: "2026-11-10T18:30:00.000Z", isActive: false },
        { date: "2026-11-09" },
      ])
    ).toEqual(["2026-11-09", "2026-11-09"]);
  });

  test("holiday-only weekday range yields 0 working days", () => {
    expect(
      countLeaveWorkingDays({
        startDate: "2026-11-09",
        endDate: "2026-11-09",
        weekOffDays: ["Saturday", "Sunday"],
        holidayDateKeys: ["2026-11-09"],
      })
    ).toBe(0);
  });
});
