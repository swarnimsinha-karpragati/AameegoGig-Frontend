import {
  buildDirectEditPayload,
  findPendingRegularizationConflict,
  validateDirectEdit,
} from "./DirectEditPanel";

describe("regularization direct edit helpers", () => {
  test("requires an employee, attendance date, and audit note", () => {
    const errors = validateDirectEdit("attendance", {
      employeeId: "",
      date: "",
      status: "Present",
      checkIn: "",
      checkOut: "",
      auditNote: "",
    });

    expect(errors.employeeId).toMatch(/Employee/);
    expect(errors.date).toMatch(/Attendance date/);
    expect(errors.auditNote).toMatch(/Audit note/);
  });

  test("requires times for a worked attendance direct edit", () => {
    const errors = validateDirectEdit("attendance", {
      employeeId: "employee-1",
      date: "2026-06-01",
      status: "Present",
      checkIn: "",
      checkOut: "",
      auditNote: "Correcting an old attendance record",
    });

    expect(errors.checkIn).toMatch(/required/i);
    expect(errors.checkOut).toMatch(/required/i);
  });

  test("strips times for an absent attendance update", () => {
    expect(
      buildDirectEditPayload("attendance", {
        employeeId: "employee-1",
        date: "2026-09-08",
        status: "Absent",
        checkIn: "09:00",
        checkOut: "18:00",
        auditNote: "Correcting the missed attendance import",
      })
    ).toEqual({
      employeeId: "employee-1",
      date: "2026-09-08",
      status: "Absent",
      checkIn: null,
      checkOut: null,
      auditNote: "Correcting the missed attendance import",
    });
  });

  test("forces WFH request mode for WFH leave", () => {
    expect(
      buildDirectEditPayload("leave", {
        leaveRequestId: "leave-1",
        leaveType: "WFH",
        startDate: "2026-09-08",
        endDate: "2026-09-09",
        reason: "Approved remote work",
        auditNote: "Correcting leave type after manager confirmation",
      })
    ).toMatchObject({
      requestType: "WFH",
      leaveType: "WFH",
    });
  });

  test("finds a pending attendance conflict for the same day", () => {
    const conflict = findPendingRegularizationConflict(
      [
        {
          employeeId: "employee-1",
          kind: "attendance",
          requested: { date: "2026-09-08T00:00:00.000Z" },
        },
      ],
      {
        kind: "attendance",
        employeeId: "employee-1",
        date: "2026-09-08",
      }
    );

    expect(conflict).toBeTruthy();
  });

  test("finds a pending leave conflict for the same leave request", () => {
    const conflict = findPendingRegularizationConflict(
      [
        {
          employeeId: "employee-1",
          kind: "leave",
          requested: { leaveRequestId: "leave-1" },
        },
      ],
      {
        kind: "leave",
        employeeId: "employee-1",
        leaveRequestId: "leave-1",
      }
    );

    expect(conflict).toBeTruthy();
  });
});
