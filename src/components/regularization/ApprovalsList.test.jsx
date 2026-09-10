import {
  approvalPeriod,
  describeApprovalChange,
  formatTime,
} from "./ApprovalsList";

describe("regularization approval helpers", () => {
  test("describes attendance changes with status and time", () => {
    const request = {
      kind: "attendance",
      previous: { status: "Absent", checkIn: null, checkOut: null },
      requested: { date: "2026-09-08", status: "Present", checkIn: "09:30", checkOut: "18:00" },
    };

    expect(describeApprovalChange(request)).toEqual({
      previous: "Absent · — / — · Total —",
      requested: "Present · 09:30 / 18:00 · Total 8h 30m",
    });
    expect(approvalPeriod(request)).toContain("08");
  });

  test("describes a leave date and type change", () => {
    const request = {
      kind: "leave",
      previous: {
        leaveType: "CL",
        startDate: "2026-09-08",
        endDate: "2026-09-08",
      },
      requested: {
        leaveType: "SL",
        startDate: "2026-09-09",
        endDate: "2026-09-10",
      },
    };

    expect(describeApprovalChange(request).previous).toContain("Casual Leave");
    expect(describeApprovalChange(request).requested).toContain("Sick Leave");
    expect(approvalPeriod(request)).toContain("10");
  });

  test("formats stored attendance timestamps as HH:mm", () => {
    expect(formatTime("09:30")).toBe("09:30");
    expect(formatTime("2026-09-08T09:30:00.000Z")).toMatch(/^\d{2}:\d{2}$/);
  });

  test("handles null previous attendance snapshot", () => {
    const request = {
      kind: "attendance",
      previous: null,
      requested: { date: "2026-09-08", status: "Present", checkIn: "09:30", checkOut: "18:00" },
    };
    expect(describeApprovalChange(request)).toEqual({
      previous: "No record · — / — · Total —",
      requested: "Present · 09:30 / 18:00 · Total 8h 30m",
    });
  });
});
