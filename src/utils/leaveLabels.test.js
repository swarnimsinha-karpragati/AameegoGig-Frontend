import {
  formatLeaveDays,
  getDayPartLabel,
  isHalfDayPart,
} from "./leaveLabels";

describe("leave day-type labels", () => {
  test("labels full and half day parts", () => {
    expect(getDayPartLabel("full")).toBe("Full Day");
    expect(getDayPartLabel("first-half")).toBe("First Half");
    expect(getDayPartLabel("second-half")).toBe("Second Half");
    expect(getDayPartLabel(undefined)).toBe("Full Day");
  });

  test("detects half day parts", () => {
    expect(isHalfDayPart("first-half")).toBe(true);
    expect(isHalfDayPart("second-half")).toBe(true);
    expect(isHalfDayPart("full")).toBe(false);
    expect(isHalfDayPart(undefined)).toBe(false);
  });

  test("formats durations with half suffix", () => {
    expect(formatLeaveDays({ days: 2 })).toBe("2d");
    expect(formatLeaveDays({ days: 0.5, dayPart: "first-half" })).toBe(
      "0.5d · First Half"
    );
    expect(formatLeaveDays({ days: 0.5, dayPart: "second-half" })).toBe(
      "0.5d · Second Half"
    );
  });
});
