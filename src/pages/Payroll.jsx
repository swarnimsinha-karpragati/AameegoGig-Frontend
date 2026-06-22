import React, { useState, useEffect, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import kpLogo from "../assets/kpLogo.png";
import {
  bulkUploadPayrollEntries,
  previewPayroll,
  calculateSinglePayroll,
  calculateBulkPayroll,
  getAllPayrollRecords,
  getPayrollByEmployee,
} from "../services/payrollService";
import { getEmployees } from "../services/employeeService";
import { getStoredUser, hasLinkedEmployeeProfile } from "../utils/roles";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Play,
  FileText,
  X,
  IndianRupee,
  Search,
  Eye,
  Download,
  Calendar,
  Layers,
  CheckCircle,
  FileSpreadsheet,
  RefreshCw,
  Info,
  Briefcase,
  Users,
  ChevronRight,
} from "lucide-react";
import "./Payroll.css";
import MainLayout from "../layouts/MainLayout";
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
  str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (Number(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  return str + ' Rupees';
}

export default function Payroll() {
  const user = getStoredUser();
  const isAdminOrHR = user?.role === "Admin" || user?.role === "HR";

  // Tab views: 'ops', 'slips', 'upload' for Admin; 'my_slips', 'my_analytics' for Employee
  const [activeTab, setActiveTab] = useState(isAdminOrHR ? "ops" : "my_slips");

  // Filter & Processor states
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmp, setSelectedEmp] = useState(""); // Stores JSON string of employee metadata
  const [searchQuery, setSearchQuery] = useState("");

  // Data states
  const [employees, setEmployees] = useState([]);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]); // original bank upload records
  
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
        // Load all active employees for selection dropdown
        const empRes = await getEmployees();
        setEmployees(empRes.data?.employees || []);

        // Load payroll records for current filter
        const params = {
          vendorId: user.vendorId,
          month: MONTH_NUMBER_TO_NAME[selectedMonth],
          year: selectedYear,
        };
        const payrollRes = await getAllPayrollRecords(params);
        setPayrollHistory(payrollRes.data?.data || []);
      } else {
        // Load personal history by employeeCode
        if (user.employeeCode) {
          const payrollRes = await getPayrollByEmployee(user.employeeCode);
          setPayrollHistory(payrollRes.data?.data || []);
        }
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
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, user?.vendorId, user?.employeeCode]);

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
        vendorId: user.vendorId,
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
        vendorId: user.vendorId,
        month: selectedMonth,
        year: selectedYear,
      });

      if (res.data?.success) {
        setStatusMessage({
          type: "success",
          text: `Successfully computed and saved payroll for ${selectedRecord.employeeName}.`,
        });
        setShowDetailsPopup(false);
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

  // Process bulk payroll calculation
  const handleCalculateBulk = async () => {
    if (!window.confirm(`Are you sure you want to run bulk payroll calculation for ${MONTH_NUMBER_TO_NAME[selectedMonth]} ${selectedYear}?`)) {
      return;
    }

    setActionLoading(true);
    setStatusMessage({ type: "", text: "" });

    try {
      const res = await calculateBulkPayroll({
        vendorId: user.vendorId,
        month: selectedMonth,
        year: selectedYear,
      });

      if (res.data?.success) {
        setStatusMessage({
          type: "success",
          text: res.data.message || `Bulk payroll calculation completed successfully.`,
        });
        loadInitialData();
      } else {
        throw new Error(res.data?.message || "Bulk payroll calculation failed.");
      }
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
      const res = await bulkUploadPayrollEntries(uploadFile);
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
      body: [
        ["Basic Salary", `Rs. ${data.basicSalary.toLocaleString()}`, "Provident Fund", `Rs. ${data.pf.toLocaleString()}`],
        ["House Rent Allowance", `Rs. ${data.hra.toLocaleString()}`, "Professional Tax", `Rs. ${data.professionalTax.toLocaleString()}`],
        ["Conveyance Allowance", `Rs. ${data.conveyance.toLocaleString()}`, "ESIC", `Rs. ${data.esicDeduction.toLocaleString()}`],
        ["Performance Incentive", `Rs. ${data.incentive.toLocaleString()}`, "Loan Recovery/Other", `Rs. ${data.loanRecovery.toLocaleString()}`],
        ["Other Allowance", `Rs. ${data.otherAllowance.toLocaleString()}`, "Other Deductions", `Rs. ${data.otherDeduction.toLocaleString()}`],
        ["Gross Earnings", `Rs. ${data.grossSalary.toLocaleString()}`, "Total Deductions", `Rs. ${data.totalDeduction.toLocaleString()}`],
      ],
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
      const monthNum = MONTH_NAME_TO_NUMBER[record.month] || 1;
      const monthStr = `${record.year}-${String(monthNum).padStart(2, "0")}`;
      const previewRes = await previewPayroll({
        employeeId: record.employeeCode,
        vendorId: record.vendorId,
        month: monthStr,
      });

      const details = previewRes.data.data;
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
        basicSalary: details.basicSalary,
        hra: details.hra,
        conveyance: details.conveyanceAllowance,
        incentive: details.incentive + (details.overtimePay || 0),
        loanRecovery: 0,
        otherAllowance: details.otherAllowance,
        grossSalary: details.grossSalary + (details.overtimePay || 0),
        pf: details.pfDeduction,
        professionalTax: details.professionalTax,
        esicDeduction: details.esicDeduction,
        otherDeduction: details.lopDeduction + details.otherDeduction,
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
        vendorId: record.vendorId,
        month: monthStr,
      });

      setSelectedRecord(previewRes.data.data);
      setShowDetailsPopup(true);
    } catch (err) {
      alert("Failed to load slip breakdown: " + (err.response?.data?.message || err.message));
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
      item.accountNo || "",
      item.ifsc || "",
      item.paymentDate || "",
      item.year || "",
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
                className={`tab-btn ${activeTab === "slips" ? "active" : ""}`}
                onClick={() => setActiveTab("slips")}
              >
                <FileText size={16} />
                <span>Payslips Database</span>
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

        {/* PAYSLIPS DATABASE TAB */}
        {activeTab === (isAdminOrHR ? "slips" : "my_slips") && (
          <div className="history-table-container glass-morphism">
            <div className="table-header-filters">
              <h2>Calculated Monthly Salary slips</h2>

              <div className="filter-actions-row">
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
                            >
                              <Download size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="empty-table-cell">
                        No payroll documents compiled for this query session.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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

              {/* Financial Calculations Sheet */}
              <div className="earnings-deductions-sheet">
                {/* Earnings List */}
                <div className="sheet-column">
                  <h4>Gross Earnings</h4>
                  <div className="item-row">
                    <span>Basic Salary</span>
                    <strong>₹{selectedRecord.basicSalary.toLocaleString()}</strong>
                  </div>
                  <div className="item-row">
                    <span>House Rent Allowance (HRA)</span>
                    <strong>₹{selectedRecord.hra.toLocaleString()}</strong>
                  </div>
                  <div className="item-row">
                    <span>Conveyance Allowance</span>
                    <strong>₹{selectedRecord.conveyanceAllowance.toLocaleString()}</strong>
                  </div>
                  <div className="item-row">
                    <span>Incentive</span>
                    <strong>₹{selectedRecord.incentive.toLocaleString()}</strong>
                  </div>
                  <div className="item-row">
                    <span>Other Allowance</span>
                    <strong>₹{selectedRecord.otherAllowance.toLocaleString()}</strong>
                  </div>
                  {selectedRecord.overtimePay > 0 && (
                    <div className="item-row highlight-green">
                      <span>Overtime Payout</span>
                      <strong>₹{selectedRecord.overtimePay.toLocaleString()}</strong>
                    </div>
                  )}
                  <div className="total-summary-row">
                    <span>Gross Earnings</span>
                    <strong>₹{selectedRecord.totalEarnings.toLocaleString()}</strong>
                  </div>
                </div>

                {/* Deductions List */}
                <div className="sheet-column">
                  <h4>Clawed Deductions</h4>
                  <div className="item-row">
                    <span>Provident Fund (PF)</span>
                    <strong>₹{selectedRecord.pfDeduction.toLocaleString()}</strong>
                  </div>
                  <div className="item-row">
                    <span>ESIC Contribution</span>
                    <strong>₹{selectedRecord.esicDeduction.toLocaleString()}</strong>
                  </div>
                  <div className="item-row">
                    <span>Professional Tax (PT)</span>
                    <strong>₹{selectedRecord.professionalTax.toLocaleString()}</strong>
                  </div>
                  <div className="item-row highlight-red">
                    <span>Loss of Pay (LOP) Deduction</span>
                    <strong>₹{selectedRecord.lopDeduction.toLocaleString()}</strong>
                  </div>
                  <div className="item-row">
                    <span>Other Deduction</span>
                    <strong>₹{selectedRecord.otherDeduction.toLocaleString()}</strong>
                  </div>
                  <div className="total-summary-row red-total">
                    <span>Total Deductions</span>
                    <strong>₹{selectedRecord.totalDeduction.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

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

              {/* Calculations audit info */}
              {selectedRecord.calculationBreakdown?.formula && (
                <div className="formula-audit-card">
                  <div className="formula-head">
                    <Info size={16} />
                    <span>Calculation Formula Audit Trail</span>
                  </div>
                  <div className="formula-body">
                    <p>
                      <strong>Gross Earnings:</strong>{" "}
                      <code>{selectedRecord.calculationBreakdown.formula.totalEarnings}</code>
                    </p>
                    <p>
                      <strong>Total Deductions:</strong>{" "}
                      <code>{selectedRecord.calculationBreakdown.formula.totalDeduction}</code>
                    </p>
                    <p>
                      <strong>Net Payout:</strong>{" "}
                      <code>{selectedRecord.calculationBreakdown.formula.netSalary}</code>
                    </p>
                  </div>
                </div>
              )}

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
