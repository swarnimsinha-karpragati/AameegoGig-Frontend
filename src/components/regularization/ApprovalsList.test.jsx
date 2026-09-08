import {
  approvalPeriod,
  describeApprovalChange,
} from "./ApprovalsList";

describe("regularization approval helpers", () => {
  test("describes attendance changes with status and time", () => {
    const request = {
      kind: "attendance",
      previous: { status: "Absent", checkIn: null, checkOut: null },
      requested: { date: "2026-09-08", status: "Present", checkIn: "09:30", checkOut: "18:00" },
    };

    expect(describeApprovalChange(request)).toEqual({
      previous: "Absent · — / —",
      requested: "Present · 09:30 / 18:00",
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

    expect(describeApprovalChange(request).previous).toContain("CL");
    expect(describeApprovalChange(request).requested).toContain("SL");
    expect(approvalPeriod(request)).toContain("10");
  });
});
