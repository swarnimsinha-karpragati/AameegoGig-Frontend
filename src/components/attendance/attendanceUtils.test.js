import {
  attendanceSuccessMessage,
  shouldLoadTeamAttendance,
  applyTeamAttendanceListResponse,
} from "./attendanceUtils";

describe("attendanceSuccessMessage", () => {
  it("shows only the check-in success sentence, never a URL", () => {
    expect(attendanceSuccessMessage("checkin")).toBe("Check-in successful.");
    expect(attendanceSuccessMessage("checkin")).not.toMatch(/https?:\/\//i);
  });

  it("shows only the check-out success sentence", () => {
    expect(attendanceSuccessMessage("checkout")).toBe("Check-out successful.");
  });
});

describe("shouldLoadTeamAttendance", () => {
  it("loads for managers and custom roles when backend reports reportees", () => {
    expect(shouldLoadTeamAttendance(true)).toBe(true);
  });

  it("skips the team list when the caller has no reportees", () => {
    expect(shouldLoadTeamAttendance(false)).toBe(false);
    expect(shouldLoadTeamAttendance(undefined)).toBe(false);
  });
});

describe("applyTeamAttendanceListResponse", () => {
  it("maps team list rows and pagination for the My Team table", () => {
    const result = applyTeamAttendanceListResponse({
      rows: [{ name: "Alex", status: "Present" }],
      hasTeam: true,
      pagination: { page: 1, limit: 10, total: 3, pages: 1 },
    });

    expect(result.rows).toEqual([{ name: "Alex", status: "Present" }]);
    expect(result.hasTeam).toBe(true);
    expect(result.pagination).toEqual({ total: 3, pages: 1 });
  });

  it("clears rows when the API returns an empty team list", () => {
    const result = applyTeamAttendanceListResponse({ rows: [], hasTeam: true });
    expect(result.rows).toEqual([]);
    expect(result.hasTeam).toBe(true);
    expect(result.pagination).toBeNull();
  });

  it("tolerates a missing payload without throwing", () => {
    const result = applyTeamAttendanceListResponse();
    expect(result.rows).toEqual([]);
    expect(result.hasTeam).toBeUndefined();
    expect(result.pagination).toBeNull();
  });
});
