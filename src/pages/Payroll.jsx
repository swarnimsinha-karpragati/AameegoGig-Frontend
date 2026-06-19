import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import kpLogo from "../assets/kpLogo.png";
// import { createBulkPayrollEntry } from "../services/payrollService";
import { bulkUploadPayrollEntries, getSalarySlip } from "../services/payrollService";
import { getPaymentHistory } from "../services/payrollService";
// import * as XLSX from "xlsx";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Play,
  FileText,
  X,
  IndianRupee,
} from "lucide-react";
// import axios from "axios"; // reserved for future direct API calls
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

export default function Payroll() {
  const [showSalaryPopup, setShowSalaryPopup] = useState(false);
  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [employeeCode, setEmployeeCode] = useState("");
  const [month, setMonth] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [searchEmployee, setSearchEmployee] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [tableData, setTableData] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedFromDate, setAppliedFromDate] = useState("");
  const [appliedToDate, setAppliedToDate] = useState("");

  /*--------- pdf start ---------*/

  const generateSalarySlip = (data) => {
    console.log("data----", data)
    const doc = new jsPDF("p", "mm", "a4");

    doc.addImage(kpLogo, "JPEG", 80, 5, 50, 25);

    // Header
    doc.setFontSize(22);
    doc.setTextColor(33, 103, 197);
    doc.text("SALARY SLIP", 105, 35, {
      align: "center",
    });

    doc.setFontSize(10);
    doc.setTextColor(0, 128, 96);
    doc.text(`For the Month of ${data.month}`, 105, 42, { align: "center" });

    // Employee Details
    doc.setFontSize(12);
    doc.setTextColor(0, 128, 96);
    doc.text("EMPLOYEE DETAILS", 14, 45);

    autoTable(doc, {
      startY: 48,
      theme: "grid",
      styles: {
        fontSize: 9,
      },
      body: [
        ["Employee Name", data.name, "Employee ID", data.empId],
        ["Designation", data.designation, "Department", data.department],
        ["Date of Joining", data.joiningDate, "Location", data.location],
        ["PAN", data.pan, "Bank A/C No.", data.bankAccount],
        ["UAN / PF No.", data.uan, "ESIC No.", data.esic],
      ],
      columnStyles: {
        0: {
          fillColor: [219, 230, 225],
          fontStyle: "bold",
        },
        2: {
          fillColor: [219, 230, 225],
          fontStyle: "bold",
        },
      },
    });

    // Attendance
    const attendanceY = doc.lastAutoTable.finalY + 12;

    doc.setTextColor(0, 128, 96);
    doc.text("PAY PERIOD & ATTENDANCE", 14, attendanceY);

    autoTable(doc, {
      startY: attendanceY + 3,
      theme: "grid",
      styles: {
        fontSize: 9,
      },
      body: [
        ["Total Days", data.totalDays, "Days Worked", data.daysWorked],
        ["Paid Leave", data.paidLeave, "Loss of Pay", data.lop],
      ],
      columnStyles: {
        0: { cellWidth: 55, fillColor: [219, 230, 225], fontStyle: "bold" },
        1: { cellWidth: 45 },
        2: { cellWidth: 45, fillColor: [219, 230, 225], fontStyle: "bold" },
        3: { cellWidth: 35 },
      },
    });

    // Earnings & Deductions
    const earningsY = doc.lastAutoTable.finalY + 12;

    doc.setTextColor(0, 128, 96);
    doc.text("EARNINGS & DEDUCTIONS", 14, earningsY);

    autoTable(doc, {
      startY: earningsY + 3,
      theme: "grid",
      head: [["EARNINGS (Rs.)", "Amount", "DEDUCTIONS (Rs.)", "Amount"]],
      headStyles: {
        fillColor: [0, 128, 96],
      },
      body: [
        ["Basic Salary", data.basicSalary, "Provident Fund", data.pf],
        [
          "House Rent Allowance",
          data.hra,
          "Professional Tax",
          data.professionalTax,
        ],
        ["Conveyance Allowance", data.conveyance, "ESIC", data.esicDeduction],
        [
          "Performance Incentive",
          data.incentive,
          "Loan Recovery",
          data.loanRecovery,
        ],
        [
          "Other Allowance",
          data.otherAllowance,
          "Other Deductions",
          data.otherDeduction,
        ],
        [
          "Gross Earnings",
          data.grossSalary,
          "Total Deductions",
          data.totalDeduction,
        ],
      ],
    });

    // Net Salary
    const netY = doc.lastAutoTable.finalY + 15;

    doc.setFillColor(0, 128, 96);

    doc.rect(14, netY, 182, 10, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);

    doc.text("NET SALARY PAYABLE", 18, netY + 7);

    doc.text(`Rs. ${data.netSalary}`, 185, netY + 7, {
      align: "right",
    });

    // Amount in words
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);

    doc.text(`Amount in Words: ${data.salaryInWords}`, 16, netY + 18);

    // Signatures
    const signY = netY + 45;

    doc.line(15, signY, 80, signY);
    doc.line(130, signY, 195, signY);

    doc.text("Employee Signature", 15, signY + 6);

    doc.text("Authorised Signatory", 130, signY + 6);

    doc.setTextColor(0, 128, 96);
    doc.text("For KarPragati", 150, signY + 12);

    doc.setTextColor(120, 120, 120);
    doc.setFontSize(8);

    doc.text(
      "This is a computer-generated salary slip and does not require a physical signature.",
      105,
      signY + 28,
      { align: "center" },
    );

    doc.save(`${data.empId}-SalarySlip.pdf`);     // comment to stop pdf generation
  };

  /*--------- pdf end ---------*/

  /* ----------Generate Salary Slip calling API-------  */

  const handleGenerateSlip = async () => {
    try {
    
      const response = await getSalarySlip({
        params: {
          employeeId: employeeCode,
          month: month,
          vendorId: '6a2a49e3baf7ebc467381bf3'   // remove later, put dynamic mapping 
          // vendorId: "6a227d6abaf7ebc467381915"
        },
      });

      console.log(response.data);
      console.log("Payroll Data:", response.data.data);
      generateSalarySlip(response.data.data);
    } catch (error) {
      console.error(error);
      console.log(error.response?.data);
      console.log(error.response?.status);
    }
  };

  /* ----------Payroll History -------  */

  const [payrollHistory, setPayrollHistory] = useState([]);

  /* ----------Create Payroll Entry -------  */
  // Reserved for future use — uncomment to enable manual payroll entry creation
  // const createPayrollEntry = async () => {
  //   try {
  //     const res = await axios.post(
  //       "http://localhost:5001/api/payroll/entries",
  //       {
  //         vendorId: "64a26e74b183cf7a61de92758",
  //         employeeCode: "EMP0010",
  //         month: "August",
  //         year: 2026,
  //         grossMonthlySalary: 50000,
  //         paymentDate: "2026-07-01",
  //         status: "Processed",
  //       },
  //     );
  //     console.log("Payroll Entry Created:", res.data);
  //     fetchPayrollHistory();
  //   } catch (error) {
  //     console.log("Error fetching payroll history:", error);
  //   }
  // };

  /* ----------Fetch Payroll History -------  */

  // const fetchPayrollHistory = async () => {
  //   try {
  //     const res = await axios.get("http://localhost:5001/api/payroll/all");

  //     console.log("Payroll History:", res.data);
  //     console.log("FULL RESPONSE:", res);
  //     console.log("DATA ONLY:", res.data);

  //     setPayrollHistory(res.data.data || []);
  //   } catch (error) {
  //     console.log("Fetch Payroll Error:", error);
  //   }
  // };

  //   const fetchPayrollHistory = async () => {
  //   const res = await getPaymentHistory();
  //   setPayrollHistory(res.data.data);
  // };
  const fetchPayrollHistory = async () => {
    try {
      const res = await getPaymentHistory();

      const formatted = (res.data.data || []).map((item) => ({
        refNo: item.refNo,
        beneficiaryName: item.beneficiaryName,
        accountNo: item.beneficiaryAccountNo,
        mobileNo: item.mobile,
        ifsc: item.ifsc,
        amount: item.amount,
        paymentDate: item.paymentDate,
        year: item.paymentDate ? new Date(item.paymentDate).getFullYear() : "-",
        status: "Processed",
      }));

      setPayrollHistory(formatted);
    } catch (error) {
      console.log(error);
    }
  };
  useEffect(() => {
    fetchPayrollHistory();
  }, []);

  /* ---------- Bulk Upload -------  */
  
  const handleBulkUpload = async () => {
    if (!uploadFile) {
      alert("Please select an Excel file");
      return;
    }

    // Clear old message before new upload
    setUploadMessage("");

    try {
      setLoading(true);

      const res = await bulkUploadPayrollEntries(uploadFile);

      setTableData(res.data.data || []);

      const errorList = res.data.errors || [];

      let message = `Upload Complete: ${res.data.inserted} inserted, ${res.data.skipped} skipped`;

      if (errorList.length > 0) {
        message += "\n\nErrors:\n" + errorList.join("\n");
      }

      // Show result in modal
      setUploadMessage(message);
      setShowSuccessPopup(true);

      // Clear selected file
      setUploadFile(null);

      // Refresh table
      // fetchEmployees();

      // modal close mat karo
      // setShowUploadModal(false);
    } catch (error) {
      setLoading(false);
      setUploadMessage(error.response?.data?.message || "Bulk upload failed");
    } finally {
      setLoading(false);
    }
  };

  const columns =
  tableData.length > 0
    ? Object.keys(tableData[0])
    : [];

  console.log("PAYROLL HISTORY STATE:", payrollHistory);

  /* ---------- Prepare Chart Data -------  */

  const hasDeductions = (payrollHistory || []).some(
    (item) => Number(item.deductions || 0) > 0,
  );

  const payrollChartData = (payrollHistory || []).map((item) => ({
    month: item.beneficiaryName || item.refNo,
    empId: item.refNo,
    earnings: Number(item.amount || 0),
    deductions: 0,
  }));

  console.log("CHART DATA:", payrollChartData);

  /*---------- Calculate Total Payroll for Card -------  */
  // const totalPayroll = payrollHistory.reduce((sum, item) => {
  //   return sum + Number(item.amount || 0);
  // }, 0);
  // const earnings = totalPayroll;
  // const deductions = 0;

  /* ---------- Download CSV -------  */
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

    const rows = filteredPayrollHistory.map((item) => [
      item.refNo || "",
      item.beneficiaryName || "",
      item.amount || "",
      item.accountNo || "",
      item.ifsc || "",
      item.paymentDate || "",
      item.year || "",
      item.status || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const today = new Date().toISOString().split("T")[0];

    link.download = `Payroll_History_${today}.csv`;
    link.click();
  };

  /* ---------- Reset Filters -------  */
  const handleResetFilters = () => {
    setSearchEmployee("");
    setSelectedMonth("");
    setJoiningDate("");
    setFromDate("");
  setToDate("");
  setAppliedFromDate("");
  setAppliedToDate("");
  };
  // const totalPayroll = payrollHistory.reduce((sum, item) => {  // reserved for summary card
  //   return sum + Number(item.amount || 0);
  // }, 0);
  // const earnings = totalPayroll;  // reserved for card display — uncomment when earnings card is wired up
  // const deductions = 0;           // reserved for card display — uncomment when deductions are tracked

  /* ---------- Filter Payroll History -------  */
  const filteredPayrollHistory = payrollHistory.filter((item) => {
    const searchValue = searchEmployee.trim().toLowerCase();

    const employeeMatch =
      searchValue === "" ||
      (item.beneficiaryName || "").toLowerCase().includes(searchValue) ||
      (item.refNo || "").toLowerCase().includes(searchValue) ||
      (item.mobileNo || "").toLowerCase().includes(searchValue);

    const joiningMatch =
      !joiningDate || item.dateOfJoining?.split("T")[0] === joiningDate;

    let monthMatch = true;

    if (selectedMonth) {
      const paymentDate = new Date(item.paymentDate);
      const currentDate = new Date();

      const diffMonths =
        (currentDate.getFullYear() - paymentDate.getFullYear()) * 12 +
        (currentDate.getMonth() - paymentDate.getMonth());

      if (selectedMonth === "current") monthMatch = diffMonths === 0;
      else if (selectedMonth === "last1") monthMatch = diffMonths === 1;
      else if (selectedMonth === "last2") monthMatch = diffMonths === 2;
      else if (selectedMonth === "last3") monthMatch = diffMonths === 3;

      else if (
  selectedMonth === "custom" &&
  appliedFromDate &&
  appliedToDate
) {
  const from = new Date(appliedFromDate);
  const to = new Date(appliedToDate);

  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  monthMatch =
    paymentDate >= from &&
    paymentDate <= to;
}
    }
    

    console.log({
      "checking refNo match for": searchValue,
      refNo: item.refNo,
      refMatch: (item.refNo || "").toLowerCase().includes(searchValue),
    });

    return employeeMatch && joiningMatch && monthMatch;
  });

  const handleCustomDateSearch = () => {
  setAppliedFromDate(fromDate);
  setAppliedToDate(toDate);
};

  return (
    <MainLayout>
      <main className="payroll-page">
        {/* HEADER */}

        <div className="payroll-header">
          <div className="header-placeholder"></div>
          {/* <div>
            <h1 className="payroll-title">Payroll</h1>
            <p className="payroll-subtitle">
              Manage payroll processing and history
            </p>
          </div> */}

          <div className="payroll-actions">
            <button
              className="gradient-btn"
              onClick={() => setShowUploadPopup(true)}
            >
              <Play size={15} />
              <span>Upload Salary Slip</span>
            </button>

            {/* Generate Salary Slip Button */}
            <button
              className="gradient-btn"
              onClick={() => setShowSalaryPopup(true)}
            >
              <FileText size={15} />
              <span>Generate Salary Slip</span>
            </button>
          </div>
        </div>

        {/* CARDS */}

        <div className="payroll-grid">
          <div className="payroll-card">
            <div className="card-content">
              <div className="icon-box indigo">
                <Wallet size={32} color="#4f46e5" />
              </div>
              <div>
                <p className="card-label">Total Payroll</p>
                <h2 className="card-value">₹935,000</h2>
              </div>
            </div>
          </div>
          <div className="payroll-card">
            <div className="card-content">
              <div className="icon-box green">
                <TrendingUp size={32} color="#059669" />
              </div>
              <div>
                <p className="card-label">Earnings</p>
                <h2 className="card-value">₹1,050,000</h2>
              </div>
            </div>
          </div>

          {hasDeductions && (
            <div className="payroll-card">
              <div className="card-content">
                <div className="icon-box red">
                  <TrendingDown size={32} color="#dc2626" />
                </div>
                <div>
                  <p className="card-label">Deductions</p>
                  <h2 className="card-value">₹115,000</h2>
                </div>
              </div>
            </div>
          )}

          <div className="payroll-card">
            <div className="card-content">
              <div className="icon-box amber">
                <IndianRupee size={32} color="#d97706" />
              </div>
              <div>
                <p className="card-label">Paid</p>
                <h2 className="card-value">10 / 12</h2>
              </div>
            </div>
          </div>
        </div>

        {/* CHART */}

        <div className="chart-card">
          <h2 className="chart-title" style={{ marginTop: "20px" }}>
            {hasDeductions ? "Earnings vs Deductions" : "Earnings"}
          </h2>
          <ResponsiveContainer
            width="100%"
            // height={380}
            height={Math.max(380, payrollChartData.length * 45)}
          >
            <BarChart
              data={payrollChartData}
              margin={{
                top: 25,
                right: 20,
                left: 30,
                bottom: 10,
              }}
              barCategoryGap="25%"
              barGap={2}
            >
              {/* gradient graph bar */}
              <defs>
                <linearGradient
                  id="earningsGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#1E6BD6" />
                  <stop offset="100%" stopColor="#2BB7DA" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" />
              <XAxis dataKey="month" hide={true} />
              <YAxis
                tickFormatter={(value) =>
                  value >= 1000 ? `${Math.round(value / 1000)}K` : value
                }
              />
              <Tooltip
                labelFormatter={(label, payload) => {
                  const empId = payload?.[0]?.payload?.empId;
                  return `${label} (${empId})`;
                }}
                formatter={(value) => Number(value).toLocaleString("en-IN")}
              />
              <Legend wrapperStyle={{ bottom: -5 }} />

              {hasDeductions && (
                <Bar
                  dataKey="deductions"
                  name="Deductions"
                  fill="#ef4444"
                  radius={[5, 5, 0, 0]}
                  barSize={20}
                />
              )}
              <Bar
                dataKey="earnings"
                name="Earnings"
                fill="url(#earningsGradient)"
                radius={[5, 5, 0, 0]}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* HISTORY CARD */}

        <div className="history-card">
  <div className="history-header">

    <h2 className="history-title">
      Employee Payment Records
    </h2>

    <div className="history-filters">

      {/* Search */}
      <input
        type="text"
        placeholder="Name / Ref No / Mobile"
        value={searchEmployee}
        onChange={(e) => setSearchEmployee(e.target.value)}
        className="filter-input"
      />

      {/* Month / Date Filter */}
      <select
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
        className="filter-select"
      >
        <option value="">All Records</option>
        <option value="current">Current Month</option>
        <option value="last1">Last Month</option>
        <option value="last2">2 Months Ago</option>
        <option value="last3">3 Months Ago</option>
        <option value="custom">Custom Date</option>
      </select>

      {/* Download */}
      <button
        className="gradient-btn"
        onClick={handleDownloadCSV}
        type="button"
      >
        Download CSV
      </button>

      {/* Reset */}
      <button
        className="gradient-btn"
        onClick={handleResetFilters}
        type="button"
      >
        Reset Filters
      </button>

    </div>

    {/* Custom Date Row */}
    {/* {selectedMonth === "custom" && (
      <div className="custom-date-row">

        <div className="date-group">
          <label>From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="date-group">
          <label>To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="filter-input"
          />
        </div>

      </div>
    )} */}

      {selectedMonth === "custom" && (
  <div className="custom-date-row">

    <div className="date-group">
      <label>From</label>
      <input
        type="date"
        value={fromDate}
        onChange={(e) => setFromDate(e.target.value)}
        className="filter-input"
      />
    </div>

    <div className="date-group">
      <label>To</label>
      <input
        type="date"
        value={toDate}
        onChange={(e) => setToDate(e.target.value)}
        className="filter-input"
      />
    </div>

    <button
      className="gradient-btn"
      onClick={handleCustomDateSearch}
      type="button"
      style={{ marginTop: "24px" }}
    >
      Search
    </button>

  </div>
)}
  </div>

  <table className="history-table">
    <thead>
      <tr>
        <th>EMP ID</th>
        <th>BENEFICIARY NAME</th>
        <th>AMOUNT</th>
        <th>ACCOUNT NUMBER</th>
        <th>IFSC</th>
        <th>PAYMENT DATE</th>
        <th>YEAR</th>
        <th>STATUS</th>
      </tr>
    </thead>

    <tbody>
      {filteredPayrollHistory?.length > 0 ? (
        filteredPayrollHistory.map((item) => (
          <tr key={item._id}>
            <td>{item.refNo || "-"}</td>
            <td>{item.beneficiaryName || "-"}</td>
            <td>₹{Number(item.amount ?? 0).toLocaleString("en-IN")}</td>
            <td>{item.accountNo || "-"}</td>
            <td>{item.ifsc || "-"}</td>
            <td>
              {item.paymentDate
                ? new Date(item.paymentDate).toLocaleDateString()
                : "-"}
            </td>
            <td>{item.year || "-"}</td>
            <td>
              <span className="status-badge">{item.status}</span>
            </td>
          </tr>
        ))
      ) : (
        <tr>
          <td colSpan="8" style={{ textAlign: "center" }}>
            No payroll data found
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>

        {tableData.length > 0 && (
  <table className="history-table">
    <thead>
      <tr>
        {columns.map((col) => (
          <th key={col}>{col}</th>
        ))}
      </tr>
    </thead>

    <tbody>
      {tableData.map((row, rowIndex) => (
        <tr key={rowIndex}>
          {columns.map((col) => (
            <td key={`${rowIndex}-${col}`}>
              {row[col] !== undefined && row[col] !== null && row[col] !== ""
                ? String(row[col])
                : "-"}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
)}

        {/*Salary POPUP */}

        {showSalaryPopup && (
          <div className="popup-overlay">
            <div className="popup-box">
              <div className="popup-header">
                <div>
                  <h2>Generate Salary Slip</h2>
                  <p>Fill employee details</p>
                </div>

                <button
                  className="close-btn"
                  onClick={() => setShowSalaryPopup(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="popup-grid">
                <input
                  type="text"
                  placeholder="Employee ID"
                  className="popup-input"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                />
                <input
                  type="month"
                  placeholder="Select Month"
                  className="popup-input"
                  value={month || ""}
                  onChange={(e) => setMonth(e.target.value)}
                  required
                />
              </div>

              <div className="popup-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setShowSalaryPopup(false)}
                >
                  Cancel
                </button>

                <button
                  className="gradient-btn"
                  onClick={() => {
                    handleGenerateSlip();
                    setShowSalaryPopup(false);
                  }}
                >
                  Generate Slip
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload POPUP */}
        {showUploadPopup && (
          <div className="upload-overlay">
            <div className="upload-modal">
              <button
                className="upload-close"
                onClick={() => setShowUploadPopup(false)}
              >
                <X size={18} />
              </button>

              <div className="upload-icon">📄</div>

              <h2>Upload Salary Slip</h2>

              <p>Drag & drop your salary slip or browse file to upload</p>

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
                Upload Now
                {loading ? "Uploading..." : "Upload Excel"}
              </button>

              {/* Upload payroll message */}

              {uploadMessage && <p className="success">{uploadMessage}</p>}
            </div>
          </div>
        )}

        {/* Success Popup */}
        {showSuccessPopup && (
          <div className="popup-overlay">
            <div className="popup-box">
              <div className="popup-header">
                <h2>Upload Successful</h2>
              </div>

              <p style={{ whiteSpace: "pre-line", marginTop: "10px" }}>
                {uploadMessage}
              </p>

              <div className="popup-actions">
                <button
                  className="gradient-btn"
                  onClick={() => setShowSuccessPopup(false)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </MainLayout>
  );
}
