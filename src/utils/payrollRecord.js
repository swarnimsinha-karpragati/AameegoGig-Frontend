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
