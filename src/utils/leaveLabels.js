const LEAVE_LABELS = {
  CL: "Casual Leave (CL)",
  SL: "Sick Leave (SL)",
  EL: "Earned Leave (EL)",
  CO: "Comp Off (CO)",
  WFH: "Work From Home (WFH)",
  LOP: "Loss of Pay (LOP)",
  LWP: "Leave Without Pay (LWP)",
  Present: "Present",
};

export const getLeaveTypeLabel = (type) =>
  LEAVE_LABELS[String(type || "").toUpperCase()] || type || "Leave";

// Day Type is a separate field (never merged into Leave/Request Type).
// Only single-day requests can be half days.
export const DAY_PART_LABELS = {
  full: "Full Day",
  "first-half": "First Half",
  "second-half": "Second Half",
};

export const getDayPartLabel = (dayPart) =>
  DAY_PART_LABELS[dayPart] || DAY_PART_LABELS.full;

export const isHalfDayPart = (dayPart) => dayPart === "first-half" || dayPart === "second-half";

// "2d" for full days, "0.5d · First Half" for halves.
export const formatLeaveDays = (item) => {
  const days = item?.days ?? "—";
  if (!isHalfDayPart(item?.dayPart)) return `${days}d`;
  return `${days}d · ${getDayPartLabel(item.dayPart)}`;
};
