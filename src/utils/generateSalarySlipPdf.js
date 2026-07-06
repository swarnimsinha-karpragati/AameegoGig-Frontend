import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import kpLogo from "../assets/kpLogo.png";
import { previewPayroll, downloadServerPayslip } from "../services/payrollService";
import { resolvePayrollLines, buildPairedPdfRows } from "./payrollLines";
import { convertNumberToWords } from "./currencyWords";
import { MONTH_NAME_TO_NUMBER } from "./payrollConstants";

export function generateSalarySlipPdf(data) {
  const doc = new jsPDF("p", "mm", "a4");
  doc.addImage(kpLogo, "JPEG", 80, 5, 50, 25);

  doc.setFontSize(22);
  doc.setTextColor(30, 107, 214);
  doc.text("SALARY SLIP", 105, 35, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`For the Month of ${data.month}`, 105, 42, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("EMPLOYEE DETAILS", 14, 52);

  autoTable(doc, {
    startY: 55,
    theme: "grid",
    styles: { fontSize: 9 },
    body: [
      ["Employee Name", data.name, "Employee ID", data.empId],
      ["Designation", data.designation, "Department", data.department],
      ["Date of Joining", data.joiningDate, "Location", data.location],
      ["PAN", data.pan, "Bank A/C No.", data.bankAccount],
      ["UAN / PF No.", data.uan, "ESIC No.", data.esic],
    ],
    columnStyles: {
      0: { fillColor: [241, 245, 249], fontStyle: "bold" },
      2: { fillColor: [241, 245, 249], fontStyle: "bold" },
    },
  });

  const attendanceY = doc.lastAutoTable.finalY + 10;
  doc.text("PAY PERIOD & ATTENDANCE", 14, attendanceY);

  autoTable(doc, {
    startY: attendanceY + 3,
    theme: "grid",
    styles: { fontSize: 9 },
    body: [
      ["Total Days", data.totalDays, "Days Worked", data.daysWorked],
      ["Paid Leave", data.paidLeave, "Loss of Pay", data.lop],
    ],
    columnStyles: {
      0: { cellWidth: 55, fillColor: [241, 245, 249], fontStyle: "bold" },
      1: { cellWidth: 45 },
      2: { cellWidth: 45, fillColor: [241, 245, 249], fontStyle: "bold" },
      3: { cellWidth: 35 },
    },
  });

  const earningsY = doc.lastAutoTable.finalY + 10;
  doc.text("EARNINGS & DEDUCTIONS", 14, earningsY);

  autoTable(doc, {
    startY: earningsY + 3,
    theme: "grid",
    head: [["EARNINGS (Rs.)", "Amount", "DEDUCTIONS (Rs.)", "Amount"]],
    headStyles: { fillColor: [30, 107, 214] },
    body: buildPairedPdfRows(data.earnings || [], data.deductions || []),
  });

  const netY = doc.lastAutoTable.finalY + 12;
  doc.setFillColor(30, 107, 214);
  doc.rect(14, netY, 182, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text("NET SALARY PAYABLE", 18, netY + 7);
  doc.text(`Rs. ${data.netSalary.toLocaleString()}`, 185, netY + 7, { align: "right" });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.text(`Amount in Words: ${data.salaryInWords}`, 16, netY + 18);

  const signY = netY + 40;
  doc.line(15, signY, 80, signY);
  doc.line(130, signY, 195, signY);
  doc.text("Employee Signature", 15, signY + 6);
  doc.text("Authorised Signatory", 130, signY + 6);
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text(
    "This is a computer-generated salary slip and does not require a physical signature.",
    105,
    signY + 20,
    { align: "center" }
  );

  doc.save(`${data.empId}-SalarySlip-${data.month.replace(" ", "_")}.pdf`);
}

export async function downloadPayrollPdf(record, { isAdminOrHR = false } = {}) {
  if (record._id && (record.status === "Processed" || isAdminOrHR)) {
    try {
      const res = await downloadServerPayslip(record._id);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${record.employeeCode}-SalarySlip-${record.month}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    } catch {
      // fallback to client PDF
    }
  }

  const monthNum = MONTH_NAME_TO_NUMBER[record.month] || 1;
  const monthStr = `${record.year}-${String(monthNum).padStart(2, "0")}`;
  const previewRes = await previewPayroll({ employeeId: record.employeeCode, month: monthStr });
  const details = previewRes.data.data;
  const { earnings, deductions } = resolvePayrollLines(details);

  generateSalarySlipPdf({
    month: `${details.month} ${details.year}`,
    name: details.employeeName,
    empId: details.employeeCode,
    designation: details.designation,
    department: details.department,
    joiningDate: details.joiningDate,
    location: details.location,
    pan: details.pan,
    bankAccount: details.bankAccount,
    uan: details.uan,
    esic: details.esicNumber,
    totalDays: details.totalDaysInMonth,
    daysWorked: details.presentDays + details.halfDays * 0.5,
    paidLeave: details.paidLeaveDays,
    lop: details.lopDays,
    earnings,
    deductions,
    grossSalary: details.grossSalary + (details.overtimePay || 0),
    totalDeduction: details.totalDeduction,
    netSalary: details.netSalary,
    salaryInWords: `${convertNumberToWords(details.netSalary)} Only`,
  });
}
