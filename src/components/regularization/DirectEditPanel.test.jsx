import {
  buildDirectEditPayload,
  findPendingRegularizationConflict,
  validateDirectEdit,
} from "./DirectEditPanel";

  const presentForm = (overrides = {}) => ({
    employeeId: "employee-1",
    leaveRequestId: "leave-1",
    leaveType: "Present",
    startDate: "2026-09-04",
    endDate: "2026-09-04",
    reason: "Actually worked that day",
    auditNote: "Correcting the leave record",
    checkIn: "10:00",
    checkOut: "19:00",
    ...overrides,
  });

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

  test("leaves shift-duration validation to the backend department shift", () => {
    const errors = validateDirectEdit("attendance", {
      employeeId: "employee-1",
      date: "2026-09-08",
      status: "Present",
      checkIn: "09:00",
      checkOut: "18:01",
      auditNote: "Correcting an attendance record",
    });
    expect(errors.checkOut).toBeUndefined();
  });

  test("allows a full valid shift (e.g. 9.5 hours) without frontend blocking", () => {
    const errors = validateDirectEdit("attendance", {
      employeeId: "employee-1",
      date: "2026-09-08",
      status: "Present",
      checkIn: "10:00",
      checkOut: "19:30",
      auditNote: "Correcting an attendance record",
    });
    expect(errors).toEqual({});
  });

  test("allows weekend Comp-Off corrections without a working-day error", () => {
    const errors = validateDirectEdit("leave", {
      employeeId: "employee-1",
      leaveRequestId: "leave-1",
      leaveType: "CO",
      startDate: "2026-09-05",
      endDate: "2026-09-06",
      reason: "Worked the weekend deployment",
      auditNote: "Correcting the comp-off record",
    });
    expect(errors.endDate).toBeUndefined();
  });

  test("requires times to mark a leave as Present", () => {
    const errors = validateDirectEdit(
      "leave",
      presentForm({ checkIn: "", checkOut: "" })
    );
    expect(errors.checkIn).toMatch(/required/i);
    expect(errors.checkOut).toMatch(/required/i);
  });

  test("rejects check-out before check-in for Present corrections", () => {
    const errors = validateDirectEdit(
      "leave",
      presentForm({ checkIn: "19:00", checkOut: "10:00" })
    );
    expect(errors.checkOut).toMatch(/on or after check-in/i);
  });

  test("allows a weekend leave to be marked Present", () => {
    const errors = validateDirectEdit(
      "leave",
      presentForm({ startDate: "2026-09-05", endDate: "2026-09-06" })
    );
    expect(errors.endDate).toBeUndefined();
    expect(errors).toEqual({});
  });

  test("includes times in the Present direct-edit payload", () => {
    expect(buildDirectEditPayload("leave", presentForm())).toMatchObject({
      leaveType: "Present",
      checkIn: "10:00",
      checkOut: "19:00",
    });
  });

  test("rejects half-day corrections spanning many days", () => {
    const errors = validateDirectEdit("leave", {
      employeeId: "employee-1",
      leaveRequestId: "leave-1",
      leaveType: "CL",
      startDate: "2026-09-08",
      endDate: "2026-09-09",
      reason: "Correcting the leave record",
      auditNote: "Correcting the leave record",
      dayPart: "first-half",
    });
    expect(errors.endDate).toMatch(/single day/i);
  });

  test("accepts a single-day half correction with times for Present", () => {
    const errors = validateDirectEdit("leave", {
      employeeId: "employee-1",
      leaveRequestId: "leave-1",
      leaveType: "Present",
      startDate: "2026-09-08",
      endDate: "2026-09-08",
      reason: "Actually worked that day",
      auditNote: "Correcting the leave record",
      checkIn: "10:00",
      checkOut: "19:00",
      dayPart: "full",
    });
    expect(errors).toEqual({});
  });

  test("still requires a working day for non-CO weekend corrections", () => {
    const errors = validateDirectEdit("leave", {
      employeeId: "employee-1",
      leaveRequestId: "leave-1",
      leaveType: "CL",
      startDate: "2026-09-05",
      endDate: "2026-09-06",
      reason: "Correcting the leave record",
      auditNote: "Correcting the leave record",
    });
    expect(errors.endDate).toMatch(/working day/i);
  });

  test("accepts a valid attendance direct edit with no errors", () => {
    const errors = validateDirectEdit("attendance", {
      employeeId: "employee-1",
      date: "2026-09-08",
      status: "Present",
      checkIn: "09:00",
      checkOut: "18:00",
      auditNote: "Correcting an attendance record",
    });
    expect(errors).toEqual({});
  });

  test("rejects check-out earlier than check-in (10:00 PM to 5:00 PM)", () => {
    const errors = validateDirectEdit("attendance", {
      employeeId: "employee-1",
      date: "2026-09-08",
      status: "Present",
      checkIn: "22:00",
      checkOut: "17:00",
      auditNote: "Correcting an attendance record",
    });
    expect(errors.checkOut).toMatch(/on or after check-in/i);
  });

  test("compares non-padded times numerically, not lexicographically", () => {
    const errors = validateDirectEdit("attendance", {
      employeeId: "employee-1",
      date: "2026-09-08",
      status: "Present",
      checkIn: "10:00",
      checkOut: "9:00",
      auditNote: "Correcting an attendance record",
    });
    expect(errors.checkOut).toMatch(/on or after check-in/i);
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
