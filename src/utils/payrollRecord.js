export const payrollHasBreakdown = (record) =>
  Boolean(
    record &&
      ((Array.isArray(record.earnings) && record.earnings.length > 0) ||
        record.calculationBreakdown ||
        Number(record.totalEarnings) > 0 ||
        Number(record.grossSalary) > 0 ||
        Number(record.basicSalary) > 0)
  );
