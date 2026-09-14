import * as XLSX from "xlsx";

// Single employee ke login credentials ka Excel download.
// loginInfo: { employeeName, email, phone, role, organizationCode, temporaryPassword }
export const downloadCredentialExcel = (loginInfo = {}) => {
  const rows = [
    {
      "Employee Name": loginInfo.employeeName || "-",
      "Email / Phone Login": loginInfo.email || loginInfo.phone || "-",
      Role: loginInfo.role || "-",
      "Organization Code": loginInfo.organizationCode || "-",
      "Temporary Password": loginInfo.temporaryPassword || "-",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 24 },
    { wch: 32 },
    { wch: 18 },
    { wch: 20 },
    { wch: 24 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Credentials");

  const safeName = String(loginInfo.employeeName || "employee")
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 40);

  XLSX.writeFile(workbook, `Employee_Credentials_${safeName || "employee"}.xlsx`);
};
