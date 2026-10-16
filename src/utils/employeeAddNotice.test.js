import { EMPLOYEE_ADD_COPY, employeeAddedNotice } from "./employeeAddNotice";

describe("employeeAddedNotice", () => {
  it("shows nothing when login credentials are shown instead", () => {
    expect(employeeAddedNotice({ loginInfo: { username: "a" }, message: "Added" }, { createAppLogin: true })).toBeNull();
  });

  it("confirms success with the server message, else a plain default", () => {
    expect(employeeAddedNotice({ message: "Asha added" })).toEqual({ type: "success", message: "Asha added" });
    expect(employeeAddedNotice({})).toEqual({ type: "success", message: EMPLOYEE_ADD_COPY.added });
    expect(employeeAddedNotice()).toEqual({ type: "success", message: EMPLOYEE_ADD_COPY.added });
  });

  it("warns when app login was requested but not created, without developer jargon", () => {
    const notice = employeeAddedNotice({}, { createAppLogin: true });
    expect(notice).toEqual({ type: "warning", message: EMPLOYEE_ADD_COPY.loginNotCreated });
    expect(notice.message).not.toMatch(/\.env|api\.js|backend/i);
  });

  it("says the login was not created even when the server sent a success message", () => {
    const data = { message: "Employee added successfully (no app login — HR will manage this employee)", hasAppLogin: false };
    expect(employeeAddedNotice(data, { createAppLogin: true })).toEqual({
      type: "warning",
      message: EMPLOYEE_ADD_COPY.loginNotCreated,
    });
  });

  it("adds the server's error after the not-created message", () => {
    expect(employeeAddedNotice({ message: "Added", error: "Email already in use" }, { createAppLogin: true })).toEqual({
      type: "warning",
      message: `${EMPLOYEE_ADD_COPY.loginNotCreated} Email already in use`,
    });
    expect(employeeAddedNotice({ error: "   " }, { createAppLogin: true }).message).toBe(EMPLOYEE_ADD_COPY.loginNotCreated);
  });

  it("keeps every add-flow message in one place", () => {
    expect(Object.keys(EMPLOYEE_ADD_COPY).sort()).toEqual(
      ["addFailed", "added", "candidateLoadFailed", "candidateNotLinked", "loginNotCreated", "needContact", "structureNotSaved"].sort()
    );
  });
});
