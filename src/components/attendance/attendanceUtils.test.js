import { attendanceSuccessMessage } from "./attendanceUtils";

describe("attendanceSuccessMessage", () => {
  it("shows only the check-in success sentence, never a URL", () => {
    expect(attendanceSuccessMessage("checkin")).toBe("Check-in successful.");
    expect(attendanceSuccessMessage("checkin")).not.toMatch(/https?:\/\//i);
  });

  it("shows only the check-out success sentence", () => {
    expect(attendanceSuccessMessage("checkout")).toBe("Check-out successful.");
  });
});
