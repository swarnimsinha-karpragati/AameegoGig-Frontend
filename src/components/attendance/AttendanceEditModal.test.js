import { toDateInputValue, toTimeInputValue, employeeIdFromRow } from "./AttendanceEditModal";

test("toDateInputValue formats Date objects as YYYY-MM-DD", () => {
  expect(toDateInputValue(new Date(2026, 8, 8))).toBe("2026-09-08");
});

test("toTimeInputValue converts 12h display to HH:mm", () => {
  expect(toTimeInputValue("11:07 AM")).toBe("11:07");
  expect(toTimeInputValue("1:30 PM")).toBe("13:30");
  expect(toTimeInputValue("—")).toBe("");
});

test("employeeIdFromRow reads nested employee object", () => {
  expect(
    employeeIdFromRow({ employeeId: { _id: "abc123", name: "Niharika" } })
  ).toBe("abc123");
});
