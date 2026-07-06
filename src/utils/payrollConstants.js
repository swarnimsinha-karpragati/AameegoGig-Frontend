export const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export const PAYROLL_YEARS = [2024, 2025, 2026, 2027, 2028];

export const MONTH_NAME_TO_NUMBER = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
};

export const MONTH_NUMBER_TO_NAME = {
  1: "January", 2: "February", 3: "March", 4: "April", 5: "May", 6: "June",
  7: "July", 8: "August", 9: "September", 10: "October", 11: "November", 12: "December",
};

export const runStatusClass = (status) =>
  String(status || "draft").toLowerCase().replace(/\s+/g, "");

const PAYROLL_STATUS_LABELS = {
  Draft: "Draft",
  PendingReview: "Pending Review",
  Approved: "Approved",
  Rejected: "Rejected",
  Processed: "Processed",
  Pending: "Pending",
  Failed: "Failed",
};

/** Human-readable label for payroll run / slip status values. */
export const formatStatusLabel = (status) => {
  if (status == null || status === "") return "—";
  const key = String(status).trim();
  if (PAYROLL_STATUS_LABELS[key]) return PAYROLL_STATUS_LABELS[key];
  return key
    .replace(/_/g, " ")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
};

export const formatInr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
