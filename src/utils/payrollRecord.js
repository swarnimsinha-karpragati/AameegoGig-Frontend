export const payrollHasBreakdown = (record) =>
  Boolean(
    record &&
      ((Array.isArray(record.earnings) && record.earnings.length > 0) ||
        record.calculationBreakdown ||
        Number(record.totalEarnings) > 0 ||
        Number(record.grossSalary) > 0 ||
        Number(record.basicSalary) > 0)
  );

const isMissingMeta = (value) =>
  value == null || value === "" || value === "-";

/** Merge employee profile fields onto a payroll row for breakdown / slip UI. */
export const enrichPayrollRecord = (record, employees = []) => {
  if (!record) return record;

  const emp = employees.find(
    (e) => e.employeeCode === record.employeeCode
  );

  return {
    ...record,
    department: isMissingMeta(record.department)
      ? emp?.department || record.department || ""
      : record.department,
    designation: isMissingMeta(record.designation)
      ? emp?.designation || record.designation || ""
      : record.designation,
  };
};

export const formatPayrollMeta = (value, fallback = "—") => {
  if (isMissingMeta(value)) return fallback;
  return value;
};

/**
 * Days the payroll actually covers. A current-month (or relieving) payroll is
 * cut short, so periodDays / periodEndLabel come from the backend window.
 */
export const getPayrollPeriod = (record) => {
  const breakdown = record?.calculationBreakdown || {};
  const cappedToToday = Boolean(breakdown.cappedToToday);
  const windowDays =
    breakdown.payrollWindow?.windowDays ?? breakdown.salaryEngine?.windowDays;
  const periodDays =
    cappedToToday && windowDays ? windowDays : record?.totalDaysInMonth;
  const endDate = breakdown.payrollWindow?.endDate
    ? new Date(breakdown.payrollWindow.endDate)
    : null;
  const periodEndLabel =
    cappedToToday && endDate && !Number.isNaN(endDate.getTime())
      ? endDate.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        })
      : null;
  return { cappedToToday, periodDays, periodEndLabel };
};
