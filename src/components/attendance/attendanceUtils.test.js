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
  it("loads only when both team mapping and view-team permission are present", () => {
    expect(shouldLoadTeamAttendance(true, true)).toBe(true);
  });

  it("skips when the caller has no reportees", () => {
    expect(shouldLoadTeamAttendance(false, true)).toBe(false);
    expect(shouldLoadTeamAttendance(undefined, true)).toBe(false);
  });

  it("skips when team mapping exists but attendance:view-team is missing", () => {
    expect(shouldLoadTeamAttendance(true, false)).toBe(false);
    expect(shouldLoadTeamAttendance(true)).toBe(false);
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
