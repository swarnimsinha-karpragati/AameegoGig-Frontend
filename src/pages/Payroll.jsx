import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import kpLogo from "../assets/kpLogo.png";
import {
  bulkUploadPayrollEntries,
  previewPayroll,
  calculateSinglePayroll,
  createPayrollRun,
  calculatePayrollRun,
  processPayrollRun,
  getAllPayrollRecords,
  listPayrollRuns,
  getPayrollRun,
  approvePayrollRun,
  rejectPayrollRun,
  sendRunPayslips,
  downloadServerPayslip,
  sendPayslipEmail,
  reopenPayroll,
  getPayments,
  updatePayment,
  addPayrollAdjustment,
  removePayrollAdjustment,
  getPayrollSummary,
  exportPayrollSummary,
} from "../services/payrollService";
import { getEmployees } from "../services/employeeService";
import { getCurrentUser } from "../services/authService";
import { getStoredUser } from "../utils/roles";
import UpdatePayrollModal from "../components/UpdatePayrollModal";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  FileText,
  X,
  Search,
  Eye,
  Download,
  Layers,
  CheckCircle,
  FileSpreadsheet,
  RefreshCw,
  Info,
  Users,
  ShieldCheck,
  XCircle,
  Mail,
  Pencil,
} from "lucide-react";
import "./Payroll.css";
import MainLayout from "../layouts/MainLayout";
import PayrollBreakdown from "../components/PayrollBreakdown";
import { resolvePayrollLines, buildPairedPdfRows } from "../utils/payrollLines";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const MONTHS = [
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

const MONTH_NAME_TO_NUMBER = {
  "January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6,
  "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12
};

const MONTH_NUMBER_TO_NAME = {
  1: "January", 2: "February", 3: "March", 4: "April", 5: "May", 6: "June",
  7: "July", 8: "August", 9: "September", 10: "October", 11: "November", 12: "December"
};

// Helper: Convert number to Indian currency words
function convertNumberToWords(num) {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if ((num = num.toString()).length > 9) return 'overflow';
  let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return ''; 
  let str = '';
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  return str + ' Rupees';
}

export default function Payroll() {
  const user = getStoredUser();
  const isAdminOrHR = user?.role === "Admin" || user?.role === "HR";
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState(
    tabFromUrl || (isAdminOrHR ? "ops" : "my_slips")
  );

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmp, setSelectedEmp] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [employees, setEmployees] = useState([]);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);

  const [, setPayrollRuns] = useState([]);
  const [activeRun, setActiveRun] = useState(null);
  const [, setRunPayrolls] = useState([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState("approve");
  const [approvalComment, setApprovalComment] = useState("");
  const [payrollSummary, setPayrollSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [editingPayment, setEditingPayment] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Loading & Popup states
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });
  
  // Details Modal
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);

  // Upload Popup
  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");

  // 1. Fetch Initial Data
  const loadInitialData = async () => {
    if (!user) return;
    setLoading(true);
    setStatusMessage({ type: "", text: "" });

    try {
      if (isAdminOrHR) {
        const empRes = await getEmployees();
        setEmployees(empRes.data?.employees || []);

        const params = {
          month: MONTH_NUMBER_TO_NAME[selectedMonth],
          year: selectedYear,
        };
        const payrollRes = await getAllPayrollRecords(params);
        setPayrollHistory(payrollRes.data?.data || []);

        const paymentsRes = await getPayments({
          month: MONTH_NUMBER_TO_NAME[selectedMonth],
          year: selectedYear,
        });
        setPaymentHistory(paymentsRes.data?.data || []);

        const runsRes = await listPayrollRuns({ year: selectedYear });
        setPayrollRuns(runsRes.data?.data || []);

        const matchingRun = (runsRes.data?.data || []).find(
          (r) => r.month === MONTH_NUMBER_TO_NAME[selectedMonth] && r.year === selectedYear
        );
        if (matchingRun) {
          const runDetail = await getPayrollRun(matchingRun._id);
          setActiveRun(runDetail.data?.data?.run || matchingRun);
          setRunPayrolls(runDetail.data?.data?.payrolls || []);
        } else {
          setActiveRun(null);
          setRunPayrolls([]);
        }

        try {
          setSummaryLoading(true);
          const summaryRes = await getPayrollSummary({
            month: selectedMonth,
            year: selectedYear,
          });
          setPayrollSummary(summaryRes.data?.data || null);
        } catch {
          setPayrollSummary(null);
        } finally {
          setSummaryLoading(false);
        }
      } else {
        const payrollRes = await getAllPayrollRecords();
        setPayrollHistory(payrollRes.data?.data || []);
      }
    } catch (error) {
      console.error("Error loading payroll dashboard data:", error);
      setStatusMessage({
        type: "error",
        text: "Failed to initialize payroll data dashboard. Please refresh.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      if (!isAdminOrHR) {
        try {
          const me = await getCurrentUser();
          if (me?.user) {
            localStorage.setItem("user", JSON.stringify(me.user));
          }
        } catch {
          // keep stored user if refresh fails
        }
      }
      loadInitialData();
    };
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, user?.vendorId, user?.employeeCode]);

  useEffect(() => {
    if (tabFromUrl && isAdminOrHR) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl, isAdminOrHR]);

  // Handle previewing single employee payroll
  const handlePreview = async () => {
    if (!selectedEmp) {
      setStatusMessage({ type: "error", text: "Please select an employee to preview." });
      return;
    }

    const { code } = JSON.parse(selectedEmp);
    setActionLoading(true);
    setStatusMessage({ type: "", text: "" });

    try {
      const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
      const res = await previewPayroll({
        employeeId: code,
        month: monthStr,
      });

      if (res.data?.success) {
        setSelectedRecord(res.data.data);
        setShowDetailsPopup(true);
      } else {
        throw new Error(res.data?.message || "Failed to generate preview");
      }
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error.response?.data?.message || error.message || "Failed to preview payroll calculation.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Process payroll calculation (single save)
  const handleCalculateSingle = async () => {
    if (!selectedRecord) return;
    setActionLoading(true);
    setStatusMessage({ type: "", text: "" });

    try {
      const res = await calculateSinglePayroll({
        employeeId: selectedRecord.employeeId,
        month: selectedMonth,
        year: selectedYear,
      });

      if (res.data?.success) {
        setStatusMessage({
          type: "success",
          text: `Successfully computed and saved payroll for ${selectedRecord.employeeName}.`,
        });
        if (res.data?.data) {
          setSelectedRecord(res.data.data);
        }
        loadInitialData();
      } else {
        throw new Error(res.data?.message || "Calculation failed");
      }
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error.response?.data?.message || error.message || "Failed to compute single payroll.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Process bulk payroll calculation via approval workflow
  const handleCalculateBulk = async () => {
    if (!window.confirm(`Create payroll run and calculate for ${MONTH_NUMBER_TO_NAME[selectedMonth]} ${selectedYear}?`)) {
      return;
    }

    setActionLoading(true);
    setStatusMessage({ type: "", text: "" });

    try {
      const createRes = await createPayrollRun({ month: selectedMonth, year: selectedYear });
      const runId = createRes.data?.data?._id;
      const calcRes = await calculatePayrollRun(runId);
      setActiveRun(calcRes.data?.data?.run);
      setRunPayrolls(calcRes.data?.data?.results?.success || []);
      setStatusMessage({
        type: "success",
        text: "Bulk payroll calculated. Review and approve in the Payroll Review tab.",
      });
      setActiveTab("review");
      loadInitialData();
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error.response?.data?.message || error.message || "Failed to run bulk payroll calculation.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Original Upload Logic
  const handleBulkUpload = async () => {
    if (!uploadFile) {
      alert("Please select an Excel file");
      return;
    }

    setUploadMessage("");
    try {
      setLoading(true);
      const res = await bulkUploadPayrollEntries(
        uploadFile,
        MONTH_NUMBER_TO_NAME[selectedMonth],
        selectedYear
      );
      setPaymentHistory(res.data.data || []);
      const errorList = res.data.errors || [];
      let message = `Upload Complete: ${res.data.inserted} inserted, ${res.data.skipped} skipped`;
      if (errorList.length > 0) {
        message += "\n\nErrors:\n" + errorList.join("\n");
      }
      setUploadMessage(message);
      setUploadFile(null);
    } catch (error) {
      setUploadMessage(error.response?.data?.message || "Bulk upload failed");
    } finally {
      setLoading(false);
    }
  };

  // PDF Generation Function
  const generateSalarySlip = (data) => {
    const doc = new jsPDF("p", "mm", "a4");

    // Add company logo
    doc.addImage(kpLogo, "JPEG", 80, 5, 50, 25);

    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 107, 214);
    doc.text("SALARY SLIP", 105, 35, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`For the Month of ${data.month}`, 105, 42, { align: "center" });

    // Employee Details Header
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

    // Attendance Period
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

    // Earnings & Deductions
    const earningsY = doc.lastAutoTable.finalY + 10;
    doc.text("EARNINGS & DEDUCTIONS", 14, earningsY);

    autoTable(doc, {
      startY: earningsY + 3,
      theme: "grid",
      head: [["EARNINGS (Rs.)", "Amount", "DEDUCTIONS (Rs.)", "Amount"]],
      headStyles: { fillColor: [30, 107, 214] },
      body: buildPairedPdfRows(
        data.earnings || [],
        data.deductions || []
      ),
    });

    // Net Salary
    const netY = doc.lastAutoTable.finalY + 12;
    doc.setFillColor(30, 107, 214);
    doc.rect(14, netY, 182, 10, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text("NET SALARY PAYABLE", 18, netY + 7);
    doc.text(`Rs. ${data.netSalary.toLocaleString()}`, 185, netY + 7, { align: "right" });

    // Amount in words
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.text(`Amount in Words: ${data.salaryInWords}`, 16, netY + 18);

    // Signatures
    const signY = netY + 40;
    doc.line(15, signY, 80, signY);
    doc.line(130, signY, 195, signY);
    doc.text("Employee Signature", 15, signY + 6);
    doc.text("Authorised Signatory", 130, signY + 6);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text("This is a computer-generated salary slip and does not require a physical signature.", 105, signY + 20, { align: "center" });

    doc.save(`${data.empId}-SalarySlip-${data.month.replace(" ", "_")}.pdf`);
  };

  // Download PDF slip trigger
  const handleDownloadPDF = async (record) => {
    try {
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
      const previewRes = await previewPayroll({
        employeeId: record.employeeCode,
        month: monthStr,
      });

      const details = previewRes.data.data;
      const { earnings, deductions } = resolvePayrollLines(details);
      const pdfData = {
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
        daysWorked: details.presentDays + (details.halfDays * 0.5),
        paidLeave: details.paidLeaveDays,
        lop: details.lopDays,
        earnings,
        deductions,
        grossSalary: details.grossSalary + (details.overtimePay || 0),
        totalDeduction: details.totalDeduction,
        netSalary: details.netSalary,
        salaryInWords: convertNumberToWords(details.netSalary) + "Only",
      };

      generateSalarySlip(pdfData);
    } catch (err) {
      alert("Failed to compile PDF report: " + (err.response?.data?.message || err.message));
    }
  };

  // Open Detailed Audit View Modal
  const handleViewBreakdown = async (record) => {
    try {
      const monthNum = MONTH_NAME_TO_NUMBER[record.month] || 1;
      const monthStr = `${record.year}-${String(monthNum).padStart(2, "0")}`;
      const previewRes = await previewPayroll({
        employeeId: record.employeeCode,
        month: monthStr,
      });

      setSelectedRecord({
        ...previewRes.data.data,
        _id: record._id,
        status: record.status,
        oneOffAdjustments: record.oneOffAdjustments || [],
        payrollCode: record.payrollCode,
      });
      setShowDetailsPopup(true);
    } catch (err) {
      alert("Failed to load slip breakdown: " + (err.response?.data?.message || err.message));
    }
  };

  const handleAddAdjustment = async (payload) => {
    if (!selectedRecord?._id) throw new Error("Save payroll before adding adjustments");
    setActionLoading(true);
    try {
      const res = await addPayrollAdjustment(selectedRecord._id, payload);
      if (res.data?.data) setSelectedRecord(res.data.data);
      loadInitialData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveAdjustment = async (adjId) => {
    if (!selectedRecord?._id) return;
    if (!window.confirm("Remove this one-off adjustment and recalculate?")) return;
    setActionLoading(true);
    try {
      const res = await removePayrollAdjustment(selectedRecord._id, adjId);
      if (res.data?.data) setSelectedRecord(res.data.data);
      loadInitialData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Original Download CSV Logic
  const handleDownloadCSV = () => {
    const headers = [
      "REF NO",
      "BENEFICIARY NAME",
      "AMOUNT",
      "ACCOUNT NUMBER",
      "IFSC",
      "PAYMENT DATE",
      "YEAR",
      "STATUS",
    ];

    const rows = paymentHistory.map((item) => [
      item.refNo || "",
      item.beneficiaryName || "",
      item.amount || "",
      item.beneficiaryAccountNo || "",
      item.ifsc || "",
      item.paymentDate || "",
      item.payrollYear || "",
      item.status || "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Payment_History_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  // Filtered computed history
  const filteredHistory = useMemo(() => {
    return payrollHistory.filter((item) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      return (
        (item.employeeName || "").toLowerCase().includes(query) ||
        (item.employeeCode || "").toLowerCase().includes(query) ||
        (item.payrollCode || "").toLowerCase().includes(query)
      );
    });
  }, [payrollHistory, searchQuery]);

  // Analytics Metrics
  const metrics = useMemo(() => {
    let totalPayroll = 0;
    let earnings = 0;
    let deductions = 0;
    let processed = filteredHistory.length;

    filteredHistory.forEach((item) => {
      totalPayroll += item.netSalary || 0;
      earnings += item.totalEarnings || 0;
      deductions += item.totalDeduction || 0;
    });

    return { totalPayroll, earnings, deductions, processed };
  }, [filteredHistory]);

  // Chart data
  const chartData = useMemo(() => {
    if (isAdminOrHR) {
      // Show payroll breakdown by employee
      return filteredHistory.map((item) => ({
        name: item.employeeName || item.employeeCode,
        earnings: item.totalEarnings,
        deductions: item.totalDeduction,
        netPay: item.netSalary,
      }));
    } else {
      // Show month-over-month trend for the employee
      return filteredHistory.map((item) => ({
        name: `${item.month} ${item.year}`,
        earnings: item.totalEarnings,
        deductions: item.totalDeduction,
        netPay: item.netSalary,
      })).reverse(); // chronological order
    }
  }, [filteredHistory, isAdminOrHR]);

  const handleCreateAndCalculateRun = async () => {
    if (!window.confirm(`Create payroll run for ${MONTH_NUMBER_TO_NAME[selectedMonth]} ${selectedYear}?`)) return;
    setActionLoading(true);
    try {
      const createRes = await createPayrollRun({ month: selectedMonth, year: selectedYear });
      const runId = createRes.data?.data?._id;
      const calcRes = await calculatePayrollRun(runId);
      setActiveRun(calcRes.data?.data?.run);
      setRunPayrolls(calcRes.data?.data?.results?.success || []);
      setStatusMessage({ type: "success", text: "Payroll run calculated. Review exceptions before approving." });
      setActiveTab("review");
      loadInitialData();
    } catch (error) {
      setStatusMessage({ type: "error", text: error.response?.data?.message || error.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprovalSubmit = async () => {
    if (!activeRun) return;
    setActionLoading(true);
    try {
      if (approvalAction === "approve") {
        await approvePayrollRun(activeRun._id, approvalComment);
        setStatusMessage({ type: "success", text: "Payroll run approved." });
      } else {
        await rejectPayrollRun(activeRun._id, approvalComment);
        setStatusMessage({ type: "success", text: "Payroll run rejected." });
      }
      setShowApprovalModal(false);
      setApprovalComment("");
      loadInitialData();
    } catch (error) {
      setStatusMessage({ type: "error", text: error.response?.data?.message || error.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessRun = async () => {
    if (!activeRun) return;
    if (!window.confirm("Generate payslip PDFs and mark this payroll run as processed?")) return;
    setActionLoading(true);
    try {
      const res = await processPayrollRun(activeRun._id);
      setActiveRun(res.data?.data?.run || res.data?.data);
      setStatusMessage({
        type: "success",
        text: `Payroll processed. ${res.data?.data?.payslips?.generated || 0} payslip(s) generated.`,
      });
      loadInitialData();
    } catch (error) {
      setStatusMessage({ type: "error", text: error.response?.data?.message || error.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEmailPayslips = async () => {
    if (!activeRun) return;
    if (!window.confirm("Email payslips to all employees with processed payroll?")) return;
    setActionLoading(true);
    try {
      const res = await sendRunPayslips(activeRun._id);
      setStatusMessage({
        type: "success",
        text: `Emails sent: ${res.data?.data?.sent || 0}, skipped: ${res.data?.data?.skipped || 0}, failed: ${res.data?.data?.failed || 0}`,
      });
      loadInitialData();
    } catch (error) {
      setStatusMessage({ type: "error", text: error.response?.data?.message || error.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendPayslipEmail = async (record) => {
    if (!record?._id) return;
    setActionLoading(true);
    try {
      await sendPayslipEmail(record._id);
      setStatusMessage({ type: "success", text: `Payslip emailed to ${record.employeeName}.` });
      loadInitialData();
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopenPayroll = async (record) => {
    if (!record?._id) return;
    if (!window.confirm(`Reopen processed payroll for ${record.employeeName}?`)) return;
    setActionLoading(true);
    try {
      await reopenPayroll(record._id);
      setStatusMessage({ type: "success", text: `Payroll reopened for ${record.employeeName}.` });
      loadInitialData();
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportSummary = async () => {
    try {
      const res = await exportPayrollSummary({ month: selectedMonth, year: selectedYear });
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payroll-summary-${MONTH_NUMBER_TO_NAME[selectedMonth]}-${selectedYear}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to export summary");
    }
  };

  const handleSavePayment = async (payment) => {
    try {
      await updatePayment(payment._id, {
        refNo: payment.refNo,
        beneficiaryName: payment.beneficiaryName,
        beneficiaryAccountNo: payment.accountNo || payment.beneficiaryAccountNo,
        ifsc: payment.ifsc,
        amount: payment.amount,
        status: payment.status,
        remark: payment.comment,
      });
      loadInitialData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update payment");
    }
  };

  const MonthYearFilter = () => (
    <div className="processor-controls" style={{ marginBottom: "1rem" }}>
      <div className="control-group">
        <label>Year</label>
        <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="control-select">
          {[2024, 2025, 2026, 2027, 2028].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <div className="control-group">
        <label>Month</label>
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="control-select">
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <main className="payroll-page">
        {/* HEADER SECTION */}
        <div className="payroll-header-banner">
          <div>
            <h1 className="payroll-title">Payroll Hub</h1>
            <p className="payroll-subtitle">
              {isAdminOrHR
                ? "Configure, run and reconcile employee payroll disbursements."
                : "View your historical salary payslips and earnings trends."}
            </p>
          </div>

          <div className="payroll-header-actions">
            {isAdminOrHR && (
              <>
                <button
                  className="gradient-btn"
                  onClick={() => setShowUploadPopup(true)}
                >
                  <FileSpreadsheet size={16} />
                  <span>Upload Payments Sheet</span>
                </button>

                <button
                  className="gradient-btn"
                  onClick={() => handleCalculateBulk()}
                  disabled={actionLoading}
                >
                  <RefreshCw size={16} className={actionLoading ? "spin" : ""} />
                  <span>Process Bulk Payroll</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* STATUS MESSAGES */}
        {statusMessage.text && (
          <div className={`status-banner ${statusMessage.type}`}>
            <Info size={18} />
            <span>{statusMessage.text}</span>
            <button
              onClick={() => setStatusMessage({ type: "", text: "" })}
              className="close-status"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* TAB NAVIGATION */}
        <div className="payroll-tabs-bar">
          {isAdminOrHR ? (
            <>
              <button
                className={`tab-btn ${activeTab === "ops" ? "active" : ""}`}
                onClick={() => setActiveTab("ops")}
              >
                <Layers size={16} />
                <span>Payroll Processor</span>
              </button>
              <button
                className={`tab-btn ${activeTab === "review" ? "active" : ""}`}
                onClick={() => setActiveTab("review")}
              >
                <ShieldCheck size={16} />
                <span>Payroll Review</span>
              </button>
              <button
                className={`tab-btn ${activeTab === "slips" ? "active" : ""}`}
                onClick={() => setActiveTab("slips")}
              >
                <FileText size={16} />
                <span>Payslips Database</span>
              </button>
              <button
                className={`tab-btn ${activeTab === "summary" ? "active" : ""}`}
                onClick={() => setActiveTab("summary")}
              >
                <FileSpreadsheet size={16} />
                <span>Payroll Summary</span>
              </button>
              <button
                className={`tab-btn ${activeTab === "analytics" ? "active" : ""}`}
                onClick={() => setActiveTab("analytics")}
              >
                <TrendingUp size={16} />
                <span>Financial Analytics</span>
              </button>
            </>
          ) : (
            <>
              <button
                className={`tab-btn ${activeTab === "my_slips" ? "active" : ""}`}
                onClick={() => setActiveTab("my_slips")}
              >
                <FileText size={16} />
                <span>My Salary Slips</span>
              </button>
              <button
                className={`tab-btn ${activeTab === "my_analytics" ? "active" : ""}`}
                onClick={() => setActiveTab("my_analytics")}
              >
                <TrendingUp size={16} />
                <span>My Pay Analytics</span>
              </button>
            </>
          )}
        </div>

        {/* METRIC CARD DASHBOARDS */}
        <div className="payroll-stats-grid">
          <div className="stat-card glass-morphism">
            <div className="stat-icon-wrapper indigo-bg">
              <Wallet size={24} color="#3b82f6" />
            </div>
            <div>
              <p className="stat-label">Total Outlay</p>
              <h2 className="stat-value">
                ₹{metrics.totalPayroll.toLocaleString("en-IN")}
              </h2>
            </div>
          </div>

          <div className="stat-card glass-morphism">
            <div className="stat-icon-wrapper green-bg">
              <TrendingUp size={24} color="#10b981" />
            </div>
            <div>
              <p className="stat-label">Gross Earnings</p>
              <h2 className="stat-value">
                ₹{metrics.earnings.toLocaleString("en-IN")}
              </h2>
            </div>
          </div>

          <div className="stat-card glass-morphism">
            <div className="stat-icon-wrapper red-bg">
              <TrendingDown size={24} color="#ef4444" />
            </div>
            <div>
              <p className="stat-label">Deductions Clawback</p>
              <h2 className="stat-value">
                ₹{metrics.deductions.toLocaleString("en-IN")}
              </h2>
            </div>
          </div>

          <div className="stat-card glass-morphism">
            <div className="stat-icon-wrapper amber-bg">
              <Users size={24} color="#f59e0b" />
            </div>
            <div>
              <p className="stat-label">Processed Slips</p>
              <h2 className="stat-value">{metrics.processed} Items</h2>
            </div>
          </div>
        </div>

        {/* OPERATIONS PROCESSOR TAB */}
        {isAdminOrHR && activeTab === "ops" && (
          <div className="payroll-processor-card glass-morphism">
            <div className="processor-head">
              <h2>Run Engine Calculation</h2>
              <p>Select time parameters and choose whether to preview a single resource or calculate in bulk.</p>
            </div>

            <div className="processor-controls">
              <div className="control-group">
                <label>Billing Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="control-select"
                >
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                  <option value={2028}>2028</option>
                </select>
              </div>

              <div className="control-group">
                <label>Billing Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="control-select"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="control-group search-group">
                <label>Target Employee</label>
                <select
                  value={selectedEmp}
                  onChange={(e) => setSelectedEmp(e.target.value)}
                  className="control-select"
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map((emp) => (
                    <option
                      key={emp._id}
                      value={JSON.stringify({ id: emp._id, code: emp.employeeCode })}
                    >
                      {emp.employeeCode} - {emp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="processor-actions-footer">
              <button
                className="btn-secondary-custom"
                onClick={handlePreview}
                disabled={actionLoading || !selectedEmp}
              >
                <Eye size={16} />
                <span>Preview Calculation</span>
              </button>

              <button
                className="btn-primary-custom"
                onClick={handleCalculateBulk}
                disabled={actionLoading}
              >
                <RefreshCw size={16} className={actionLoading ? "spin" : ""} />
                <span>Run Bulk Calculation</span>
              </button>
            </div>
          </div>
        )}

        {/* PAYROLL REVIEW TAB */}
        {isAdminOrHR && activeTab === "review" && (
          <div className="payroll-processor-card glass-morphism">
            <div className="processor-head">
              <h2>Payroll Review & Approval</h2>
              <p>Validate payroll run, review exceptions, approve or reject before releasing payslips.</p>
            </div>

            <MonthYearFilter />

            {activeRun ? (
              <>
                <div className="drawer-meta-grid" style={{ marginBottom: "1rem" }}>
                  <div className="meta-item">
                    <span className="meta-lbl">Run Status</span>
                    <strong>{activeRun.status}</strong>
                  </div>
                  <div className="meta-item">
                    <span className="meta-lbl">Employees</span>
                    <strong>{activeRun.processedCount}/{activeRun.totalEmployees}</strong>
                  </div>
                  <div className="meta-item">
                    <span className="meta-lbl">Total Net</span>
                    <strong>₹{(activeRun.totalNet || 0).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="meta-item">
                    <span className="meta-lbl">Validation</span>
                    <strong>
                      {activeRun.validationSummary?.pass || 0} pass / {activeRun.validationSummary?.warn || 0} warn / {activeRun.validationSummary?.fail || 0} fail
                    </strong>
                  </div>
                </div>

                {activeRun.approverComment && (
                  <p className="emp-field-hint">Last comment: {activeRun.approverComment}</p>
                )}

                {(activeRun.exceptions || []).length > 0 && (
                  <div className="history-table-container" style={{ marginBottom: "1rem" }}>
                    <h3>Exceptions</h3>
                    <table className="payroll-custom-table">
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Name</th>
                          <th>Severity</th>
                          <th>Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(activeRun.exceptions || []).map((ex, idx) => (
                          <tr key={idx}>
                            <td>{ex.employeeCode}</td>
                            <td>{ex.employeeName}</td>
                            <td>{ex.severity}</td>
                            <td>{ex.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="processor-actions-footer">
                  {activeRun.status === "PendingReview" && (
                    <>
                      <button
                        className="btn-primary-custom"
                        onClick={() => { setApprovalAction("approve"); setShowApprovalModal(true); }}
                        disabled={actionLoading || (activeRun.validationSummary?.fail || 0) > 0}
                      >
                        <CheckCircle size={16} />
                        <span>Approve Run</span>
                      </button>
                      <button
                        className="btn-secondary-custom"
                        onClick={() => { setApprovalAction("reject"); setShowApprovalModal(true); }}
                        disabled={actionLoading}
                      >
                        <XCircle size={16} />
                        <span>Reject Run</span>
                      </button>
                    </>
                  )}
                  {activeRun.status === "Approved" && (
                    <>
                      <button className="btn-primary-custom" onClick={handleProcessRun} disabled={actionLoading}>
                        <CheckCircle size={16} />
                        <span>Process & Generate Payslips</span>
                      </button>
                      <button className="btn-secondary-custom" onClick={handleEmailPayslips} disabled={actionLoading}>
                        <Mail size={16} />
                        <span>Email Payslips</span>
                      </button>
                    </>
                  )}
                  {activeRun.status === "Processed" && (
                    <button className="btn-primary-custom" onClick={handleEmailPayslips} disabled={actionLoading}>
                      <Mail size={16} />
                      <span>Email Payslips</span>
                    </button>
                  )}
                  {(activeRun.status === "Draft" || activeRun.status === "Rejected") && (
                    <button className="btn-primary-custom" onClick={handleCreateAndCalculateRun} disabled={actionLoading}>
                      <RefreshCw size={16} />
                      <span>Recalculate Run</span>
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="processor-actions-footer">
                <button className="btn-primary-custom" onClick={handleCreateAndCalculateRun} disabled={actionLoading}>
                  <Layers size={16} />
                  <span>Create & Calculate Payroll Run</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* PAYSLIPS DATABASE TAB */}
        {activeTab === (isAdminOrHR ? "slips" : "my_slips") && (
          <div className="history-table-container glass-morphism">
            <div className="table-header-filters">
              <h2>Calculated Monthly Salary slips</h2>

              <div className="filter-actions-row">
                {isAdminOrHR && <MonthYearFilter />}
                <div className="table-search-bar">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search by name, employee code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {isAdminOrHR && (
                  <>
                    <button className="btn-csv" onClick={handleDownloadCSV}>
                      <Download size={15} />
                      <span>Download Transaction CSV</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {isAdminOrHR && paymentHistory.length > 0 && (
              <div style={{ marginBottom: "1.5rem" }}>
                <h3>Payment Records</h3>
                <div className="scrollable-table-wrapper">
                  <table className="payroll-custom-table">
                    <thead>
                      <tr>
                        <th>Ref No</th>
                        <th>Beneficiary</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((p) => (
                        <tr key={p._id}>
                          <td>{p.refNo}</td>
                          <td>{p.beneficiaryName}</td>
                          <td>₹{(p.amount || 0).toLocaleString("en-IN")}</td>
                          <td>{p.status}</td>
                          <td>
                            <button
                              className="action-btn-view"
                              onClick={() => {
                                setEditingPayment({
                                  ...p,
                                  accountNo: p.beneficiaryAccountNo,
                                });
                                setShowPaymentModal(true);
                              }}
                            >
                              <Pencil size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="scrollable-table-wrapper">
              <table className="payroll-custom-table">
                <thead>
                  <tr>
                    <th>PAYROLL ID</th>
                    <th>EMP CODE</th>
                    <th>EMPLOYEE NAME</th>
                    <th>PERIOD</th>
                    <th>DAYS PAYABLE</th>
                    <th>GROSS salary</th>
                    <th>DEDUCTIONS</th>
                    <th>NET PAYOUT</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: "center" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.length > 0 ? (
                    filteredHistory.map((item) => (
                      <tr key={item._id}>
                        <td className="payroll-code-text">{item.payrollCode}</td>
                        <td className="emp-code-cell">{item.employeeCode}</td>
                        <td className="emp-name-cell">{item.employeeName}</td>
                        <td className="period-cell">
                          {item.month} {item.year}
                        </td>
                        <td>{item.payableWorkingDays} / {item.totalDaysInMonth}</td>
                        <td>₹{(item.totalEarnings || 0).toLocaleString("en-IN")}</td>
                        <td className="deduction-val">
                          ₹{(item.totalDeduction || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="net-salary-val">
                          ₹{(item.netSalary || 0).toLocaleString("en-IN")}
                        </td>
                        <td>
                          <span
                            className={`badge-status ${
                              item.status === "Processed" ? "processed" : "pending"
                            }`}
                          >
                            {item.status}
                          </span>
                          {item.calculationBreakdown?.validationIssues?.some(
                            (i) => i.severity === "fail"
                          ) ? (
                            <span className="badge-status fail" style={{ marginLeft: 6 }} title="Validation failed">
                              !
                            </span>
                          ) : item.calculationBreakdown?.validationIssues?.some(
                            (i) => i.severity === "warn"
                          ) ? (
                            <span className="badge-status warn" style={{ marginLeft: 6 }} title="Validation warning">
                              ⚠
                            </span>
                          ) : null}
                        </td>
                        <td>
                          <div className="row-action-buttons">
                            <button
                              className="action-btn-view"
                              onClick={() => handleViewBreakdown(item)}
                              title="View Breakdown"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              className="action-btn-pdf"
                              onClick={() => handleDownloadPDF(item)}
                              title="Download PDF"
                              disabled={!isAdminOrHR && item.status !== "Processed"}
                            >
                              <Download size={15} />
                            </button>
                            {isAdminOrHR && item.status === "Processed" && (
                              <>
                                <button
                                  className="action-btn-view"
                                  onClick={() => handleSendPayslipEmail(item)}
                                  title="Email Payslip"
                                  disabled={actionLoading}
                                >
                                  <Mail size={15} />
                                </button>
                                <button
                                  className="action-btn-view"
                                  onClick={() => handleReopenPayroll(item)}
                                  title="Reopen Payroll"
                                  disabled={actionLoading}
                                >
                                  <RefreshCw size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="empty-table-cell">
                        {isAdminOrHR
                          ? "No payroll documents compiled for this query session."
                          : "No payslips released yet. Approved payslips appear here after HR processes payroll."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PAYROLL SUMMARY REPORT TAB */}
        {activeTab === "summary" && isAdminOrHR && (
          <div className="history-table-container glass-morphism">
            <div className="table-header-filters">
              <div>
                <h2>Payroll Summary Report</h2>
                <p>Organization-wide payroll totals, statutory breakdown, and department analysis.</p>
              </div>
              <div className="filter-actions-row">
                <MonthYearFilter />
                <button className="btn-csv" onClick={handleExportSummary}>
                  <Download size={15} />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {summaryLoading ? (
              <div className="empty-table-cell">Loading summary…</div>
            ) : payrollSummary ? (
              <>
                <div className="payroll-metrics-grid" style={{ marginBottom: "1.5rem" }}>
                  <div className="metric-card">
                    <span>Employees</span>
                    <strong>{payrollSummary.totals.headcount}</strong>
                  </div>
                  <div className="metric-card">
                    <span>Total Net Payout</span>
                    <strong>₹{(payrollSummary.totals.totalNet || 0).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="metric-card">
                    <span>Total Gross</span>
                    <strong>₹{(payrollSummary.totals.totalGross || 0).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="metric-card">
                    <span>Total Deductions</span>
                    <strong>₹{(payrollSummary.totals.totalDeductions || 0).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="metric-card">
                    <span>Employer Contributions</span>
                    <strong>₹{(payrollSummary.totals.totalEmployerContributions || 0).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="metric-card">
                    <span>Processed / Pending</span>
                    <strong>{payrollSummary.totals.processedCount} / {payrollSummary.totals.pendingCount}</strong>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div>
                    <h3>Statutory Deductions</h3>
                    <table className="payroll-custom-table">
                      <tbody>
                        <tr><td>Provident Fund (Employee)</td><td>₹{(payrollSummary.statutory.PF_EE || 0).toLocaleString("en-IN")}</td></tr>
                        <tr><td>ESIC (Employee)</td><td>₹{(payrollSummary.statutory.ESIC_EE || 0).toLocaleString("en-IN")}</td></tr>
                        <tr><td>Professional Tax</td><td>₹{(payrollSummary.statutory.PT || 0).toLocaleString("en-IN")}</td></tr>
                        <tr><td>TDS</td><td>₹{(payrollSummary.statutory.TDS || 0).toLocaleString("en-IN")}</td></tr>
                        <tr><td>Loss of Pay</td><td>₹{(payrollSummary.statutory.LOP || 0).toLocaleString("en-IN")}</td></tr>
                        <tr><td>Other Deductions</td><td>₹{(payrollSummary.statutory.otherDeductions || 0).toLocaleString("en-IN")}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <h3>Employer Contributions</h3>
                    <table className="payroll-custom-table">
                      <tbody>
                        <tr><td>PF (Employer)</td><td>₹{(payrollSummary.employerStatutory.PF_ER || 0).toLocaleString("en-IN")}</td></tr>
                        <tr><td>ESIC (Employer)</td><td>₹{(payrollSummary.employerStatutory.ESIC_ER || 0).toLocaleString("en-IN")}</td></tr>
                      </tbody>
                    </table>
                    <h3 style={{ marginTop: "1rem" }}>By Department</h3>
                    <table className="payroll-custom-table">
                      <thead>
                        <tr><th>Department</th><th>Count</th><th>Net</th></tr>
                      </thead>
                      <tbody>
                        {(payrollSummary.byDepartment || []).map((d) => (
                          <tr key={d.department}>
                            <td>{d.department}</td>
                            <td>{d.headcount}</td>
                            <td>₹{(d.totalNet || 0).toLocaleString("en-IN")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <h3>Employee Breakdown</h3>
                <div className="scrollable-table-wrapper">
                  <table className="payroll-custom-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Department</th>
                        <th>Gross</th>
                        <th>Net</th>
                        <th>PF</th>
                        <th>ESIC</th>
                        <th>PT</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(payrollSummary.employees || []).map((e) => (
                        <tr key={e.payrollId || e.employeeCode}>
                          <td>{e.employeeCode}</td>
                          <td>{e.employeeName}</td>
                          <td>{e.department}</td>
                          <td>₹{(e.totalEarnings || 0).toLocaleString("en-IN")}</td>
                          <td>₹{(e.netSalary || 0).toLocaleString("en-IN")}</td>
                          <td>₹{(e.pfDeduction || 0).toLocaleString("en-IN")}</td>
                          <td>₹{(e.esicDeduction || 0).toLocaleString("en-IN")}</td>
                          <td>₹{(e.professionalTax || 0).toLocaleString("en-IN")}</td>
                          <td>{e.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="empty-table-cell">No payroll data for this period. Run payroll calculation first.</div>
            )}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === (isAdminOrHR ? "analytics" : "my_analytics") && (
          <div className="analytics-card glass-morphism">
            <div className="chart-card-head">
              <h2>Payroll Expense Analysis</h2>
              <p>Visual overview of salary payouts, allowances, and statutory claws.</p>
            </div>

            {chartData.length > 0 ? (
              <div className="recharts-wrapper">
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(15, 23, 42, 0.95)",
                        border: "1px solid #334155",
                        borderRadius: "12px",
                      }}
                      labelStyle={{ color: "#fff", fontWeight: "bold" }}
                    />
                    <Legend />
                    <Bar
                      dataKey="earnings"
                      name="Gross Earnings"
                      fill="#3b82f6"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="deductions"
                      name="Total Deductions"
                      fill="#ef4444"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="netPay"
                      name="Net Salary"
                      fill="#10b981"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="chart-empty">
                <Info size={48} />
                <p>No historical payroll records computed to plot graphs.</p>
              </div>
            )}
          </div>
        )}

        {/* DETAILED AUDIT AND CALCULATION BREAKDOWN MODAL */}
        {showDetailsPopup && selectedRecord && (
          <div className="details-overlay" onClick={() => setShowDetailsPopup(false)}>
            <div className="details-drawer glass-morphism" onClick={(e) => e.stopPropagation()}>
              <div className="drawer-header">
                <div>
                  <h2>Salary Computation Breakdown</h2>
                  <p>Audit trail breakdown calculated by the payroll engine.</p>
                </div>
                <button
                  className="close-drawer-btn"
                  onClick={() => setShowDetailsPopup(false)}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Employee Bio Grid */}
              <div className="drawer-meta-grid">
                <div className="meta-item">
                  <span className="meta-lbl">Employee</span>
                  <strong>{selectedRecord.employeeName}</strong>
                </div>
                <div className="meta-item">
                  <span className="meta-lbl">Code</span>
                  <strong>{selectedRecord.employeeCode}</strong>
                </div>
                <div className="meta-item">
                  <span className="meta-lbl">Department</span>
                  <strong>{selectedRecord.department || "Operations"}</strong>
                </div>
                <div className="meta-item">
                  <span className="meta-lbl">Period</span>
                  <strong>{selectedRecord.month} {selectedRecord.year}</strong>
                </div>
              </div>

              {/* Attendance Details Card */}
              <div className="details-card-block">
                <h3>Attendance Summary</h3>
                <div className="grid-4-cols">
                  <div className="att-box">
                    <span>Total Days</span>
                    <strong>{selectedRecord.totalDaysInMonth}</strong>
                  </div>
                  <div className="att-box present">
                    <span>Present Days</span>
                    <strong>{selectedRecord.presentDays + (selectedRecord.halfDays * 0.5)}</strong>
                  </div>
                  <div className="att-box paid">
                    <span>Paid Leave / Offs</span>
                    <strong>{selectedRecord.paidLeaveDays + selectedRecord.weekOffDays + selectedRecord.holidays}</strong>
                  </div>
                  <div className="att-box absent">
                    <span>Unpaid LOP Days</span>
                    <strong>{selectedRecord.lopDays + selectedRecord.absentDays}</strong>
                  </div>
                </div>
                {selectedRecord.overtimeHours > 0 && (
                  <div className="ot-badge-alert">
                    <span>Overtime Worked: </span>
                    <strong>
                      {selectedRecord.overtimeHours} hours (Payout: ₹
                      {selectedRecord.overtimePay.toLocaleString("en-IN")})
                    </strong>
                  </div>
                )}
              </div>

              {/* Financial Calculations Sheet — dynamic component breakdown */}
              <PayrollBreakdown
                record={selectedRecord}
                adjustmentProps={
                  isAdminOrHR && selectedRecord.status !== "Processed"
                    ? {
                        canEdit: true,
                        onAdd: handleAddAdjustment,
                        onRemove: handleRemoveAdjustment,
                        loading: actionLoading,
                      }
                    : null
                }
              />

              {/* Net Payout Bar */}
              <div className="net-payout-banner">
                <div>
                  <span className="net-lbl">Net Salary Payable</span>
                  <p className="words-lbl">
                    {convertNumberToWords(selectedRecord.netSalary)} Only
                  </p>
                </div>
                <h2 className="net-val">
                  ₹{selectedRecord.netSalary.toLocaleString("en-IN")}
                </h2>
              </div>

              {/* Calculations audit — shown inside PayrollBreakdown */}

              {/* Admin Save Action */}
              {isAdminOrHR && selectedRecord.status === "Pending" && (
                <div className="drawer-commit-row">
                  <button
                    className="btn-cancel"
                    onClick={() => setShowDetailsPopup(false)}
                  >
                    Close Preview
                  </button>

                  <button
                    className="btn-primary-commit"
                    onClick={handleCalculateSingle}
                    disabled={actionLoading}
                  >
                    <CheckCircle size={18} />
                    <span>Confirm & Save Payslip</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* APPROVAL COMMENT MODAL */}
        {showApprovalModal && (
          <div className="upload-overlay" onClick={() => setShowApprovalModal(false)}>
            <div className="upload-modal glass-morphism" onClick={(e) => e.stopPropagation()}>
              <h2>{approvalAction === "approve" ? "Approve Payroll Run" : "Reject Payroll Run"}</h2>
              <textarea
                rows={4}
                placeholder="Add a comment (optional)"
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                style={{ width: "100%", marginBottom: "1rem" }}
              />
              <div className="processor-actions-footer">
                <button className="btn-secondary-custom" onClick={() => setShowApprovalModal(false)}>Cancel</button>
                <button className="btn-primary-custom" onClick={handleApprovalSubmit} disabled={actionLoading}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        <UpdatePayrollModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          itemToEdit={editingPayment}
          onSave={handleSavePayment}
        />

        {/* UPLOAD EXCEL BANK SHEETS POPUP */}
        {showUploadPopup && (
          <div className="upload-overlay" onClick={() => setShowUploadPopup(false)}>
            <div className="upload-modal glass-morphism" onClick={(e) => e.stopPropagation()}>
              <button
                className="upload-close"
                onClick={() => setShowUploadPopup(false)}
              >
                <X size={18} />
              </button>

              <div className="upload-icon">📄</div>
              <h2>Bulk Upload Payments Sheet</h2>
              <p>Drag & drop your generated Excel file containing bank transaction references or browse to upload.</p>

              <label className="upload-dropzone">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  hidden
                  onChange={(e) => setUploadFile(e.target.files[0])}
                />
                <span>{uploadFile ? uploadFile.name : "Choose File"}</span>
              </label>

              <button
                className="upload-submit-btn"
                onClick={handleBulkUpload}
                disabled={loading}
              >
                {loading ? "Reconciling..." : "Upload and Parse Excel"}
              </button>

              {uploadMessage && (
                <div className="upload-results-box">
                  <p className="success-txt">{uploadMessage}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </MainLayout>
  );
}
