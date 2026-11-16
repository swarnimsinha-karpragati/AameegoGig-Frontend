/**
 * Effective employment status for UI badges/menus.
 * Sticky "probation" becomes full-time once probationEndDate (IST day) has passed.
 * Mirrors AameegoGig-Backend/utils/probationState.js.
 */

const dayKeyIST = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  }
};

export const effectiveEmploymentStatus = (employee, now = new Date()) => {
  if (!employee) return null;
  if (employee.isConsultancy) return employee.employmentStatus || null;
  const status = String(employee.employmentStatus || "").toLowerCase();
  if (status === "full-time" || status === "fulltime" || status === "confirmed") {
    return "full-time";
  }
  if (status !== "probation") return employee.employmentStatus || null;
  const endKey = dayKeyIST(employee.probationEndDate);
  if (!endKey) return "probation";
  const todayKey = dayKeyIST(now);
  if (todayKey && todayKey > endKey) return "full-time";
  return "probation";
};

export const isOnProbation = (employee, now = new Date()) =>
  effectiveEmploymentStatus(employee, now) === "probation";
