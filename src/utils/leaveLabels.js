const LEAVE_LABELS = {
  CL: "Casual Leave (CL)",
  SL: "Sick Leave (SL)",
  EL: "Earned Leave (EL)",
  CO: "Comp Off (CO)",
  WFH: "Work From Home (WFH)",
  LOP: "Loss of Pay (LOP)",
  LWP: "Leave Without Pay (LWP)",
};

export const getLeaveTypeLabel = (type) =>
  LEAVE_LABELS[String(type || "").toUpperCase()] || type || "Leave";
