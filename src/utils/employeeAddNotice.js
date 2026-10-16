export const EMPLOYEE_ADD_COPY = Object.freeze({
  needContact: "Please enter either an email or a phone number.",
  added: "Employee added successfully",
  loginNotCreated:
    "The employee was saved, but their app login was not created. Check their email or phone and turn on app login from the employee's menu.",
  structureNotSaved: "The employee was created, but the salary structure could not be saved. Edit the employee to set salary.",
  candidateNotLinked:
    "The employee was created, but the offer candidate could not be marked as joined. Mark it from Letters > Offer candidates.",
  candidateLoadFailed: "Could not load the offer candidate for conversion.",
  addFailed: "Failed to add employee",
});

/** Toast after an employee is added; null when the login-credentials dialog takes its place. */
export function employeeAddedNotice(data = {}, { createAppLogin = false } = {}) {
  const result = data || {};
  if (result.loginInfo) return null;
  if (createAppLogin) {
    const reason = typeof result.error === "string" ? result.error.trim() : "";
    return { type: "warning", message: [EMPLOYEE_ADD_COPY.loginNotCreated, reason].filter(Boolean).join(" ") };
  }
  return { type: "success", message: result.message || EMPLOYEE_ADD_COPY.added };
}
