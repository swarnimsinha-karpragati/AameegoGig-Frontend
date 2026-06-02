import React, { useState } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Play,
  FileText,
  X,
} from "lucide-react";
import axios from "axios";
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

const payrollChartData = [
  {
    month: "Aug",
    earnings: 950000,
    deductions: 100000,
  },
  {
    month: "Sep",
    earnings: 980000,
    deductions: 105000,
  },
  {
    month: "Oct",
    earnings: 1000000,
    deductions: 108000,
  },
  {
    month: "Nov",
    earnings: 1020000,
    deductions: 110000,
  },
  {
    month: "Dec",
    earnings: 1040000,
    deductions: 112000,
  },
  {
    month: "Jan",
    earnings: 1050000,
    deductions: 115000,
  },
];

const payrollHistory = [
  {
    id: "PAY-2025-01",
    month: "January 2025",
    employees: 12,
    gross: "₹1,050,000",
    deductions: "-₹115,000",
    netPay: "₹935,000",
    status: "Processed",
  },
  {
    id: "PAY-2024-12",
    month: "December 2024",
    employees: 12,
    gross: "₹1,040,000",
    deductions: "-₹114,000",
    netPay: "₹926,000",
    status: "Processed",
  },
  {
    id: "PAY-2024-11",
    month: "November 2024",
    employees: 11,
    gross: "₹1,025,000",
    deductions: "-₹113,000",
    netPay: "₹912,000",
    status: "Processed",
  },
];

const mockSalarySlipApi = {
  employeeName: "Rahul Sharma",
  employeeId: "EMP001",
};

export default function Payroll() {

  const [showSalaryPopup, setShowSalaryPopup] =
    useState(false);
  const [showUploadPopup, setShowUploadPopup] =
    useState(false);
  const [uploadFile, setUploadFile] =
    useState(null);

  const handleGenerateSlip = () => {
    const salaryData = mockSalarySlipApi;

    const downloadPdf = async () => {
      try {
        const response = await axios.get(
          "https://pdfobject.com/pdf/sample.pdf",
          {
            responseType: "blob",
          }
        );

        const blob = new Blob(
          [response.data],
          {
            type: "application/pdf",
          }
        );

        const url =
          window.URL.createObjectURL(blob);

        const link =
          document.createElement("a");
        link.href = url;
        link.download = "SalarySlip.pdf";
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error(
          "Download failed",
          error
        );
      }
    };
    downloadPdf();
    console.log(
      "Generate PDF",
      salaryData
    );
  };

  return (
    <MainLayout>

      <main className="payroll-page">

        {/* HEADER */}

        <div className="payroll-header">
          <div>
            <h1 className="payroll-title">
              Payroll
            </h1>
            <p className="payroll-subtitle">
              Manage payroll processing and history
            </p>
          </div>
          <div className="payroll-actions">
            <button
              className="gradient-btn"
              onClick={() =>
                setShowUploadPopup(true)
              }>
              <Play size={15} />
              <span>
                Upload Salary Slip
              </span>
            </button>

            {/* Generate Salary Slip Button */}
            <button
              className="gradient-btn"
              onClick={() =>
                setShowSalaryPopup(true)
              }
            >
              <FileText size={15} />
              <span>
                Generate Salary Slip
              </span>
            </button>
          </div>
        </div>

        {/* CARDS */}

        <div className="payroll-grid">
          <div className="payroll-card">
            <div className="card-content">
              <div className="icon-box indigo">
                <Wallet
                  size={32}
                  color="#4f46e5"
                />
              </div>
              <div>
                <p className="card-label">
                  Total Payroll
                </p>
                <h2 className="card-value">
                  ₹935,000
                </h2>
              </div>
            </div>
          </div>
          <div className="payroll-card">
            <div className="card-content">
              <div className="icon-box green">
                <TrendingUp
                  size={32}
                  color="#059669"
                />
              </div>
              <div>
                <p className="card-label">
                  Earnings
                </p>
                <h2 className="card-value">
                  ₹1,050,000
                </h2>
              </div>
            </div>
          </div>
          <div className="payroll-card">
            <div className="card-content">
              <div className="icon-box red">
                <TrendingDown
                  size={32}
                  color="#dc2626"
                />
              </div>
              <div>
                <p className="card-label">
                  Deductions
                </p>
                <h2 className="card-value">
                  ₹115,000
                </h2>
              </div>
            </div>
          </div>
          <div className="payroll-card">
            <div className="card-content">
              <div className="icon-box amber">
                <DollarSign
                  size={32}
                  color="#d97706"
                />
              </div>
              <div>
                <p className="card-label">
                  Paid
                </p>
                <h2 className="card-value">
                  10 / 12
                </h2>
              </div>
            </div>
          </div>
        </div>

        {/* CHART */}

        <div className="chart-card">
          <h2 className="chart-title" style={{ marginTop: '20px' }}>
            Earnings vs Deductions
          </h2>
          <ResponsiveContainer
            width="100%"
            height={380}
          >
            <BarChart
              data={payrollChartData}
              margin={{
                  top: 25,
                  right: 20,
                  left: 30,
                  bottom: 10,
                   }}
            >
              <CartesianGrid
                strokeDasharray="4 4"
              />
              <XAxis 
              dataKey="month"
              width={80}
              tickMargin={10} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="deductions"
                fill="#ef4444"
                radius={[5, 5, 0, 0]}
              />
              <Bar
                dataKey="earnings"
                fill="#6366f1"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* HISTORY CARD */}
        <div className="history-card">
          <h2 className="history-title">
            Payroll History
          </h2>
          <table className="history-table">
            <thead>
              <tr>
                <th>Payroll ID</th>
                <th>Month</th>
                <th>Employees</th>
                <th>Gross</th>
                <th>Deductions</th>
                <th>Net Pay</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>

              {payrollHistory.map((item) => (
                <tr key={item.id}>
                  <td className="payroll-id">{item.id}</td>
                  <td>{item.month}</td>
                  <td>{item.employees}</td>
                  <td>{item.gross}</td>
                  <td className="deduction">{item.deductions}</td>
                  <td className="netpay">{item.netPay}</td>
                  <td>
                    <span className="status-badge">
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/*Salary POPUP */}

        {showSalaryPopup && (
          <div className="popup-overlay">
            <div className="popup-box">
              <div className="popup-header">
                <div>
                  <h2>
                    Generate Salary Slip
                  </h2>
                  <p>
                    Fill employee details
                  </p>
                </div>

                <button
                  className="close-btn"
                  onClick={() =>
                    setShowSalaryPopup(false)
                  }
                >
                  <X size={18} />
                </button>
              </div>
              <div className="popup-grid">
                <input
                  type="text"
                  placeholder="Employee ID"
                  className="popup-input"
                />
                <input
                  type="month"
                  className="popup-input"
                />
              </div>
              <div className="popup-actions">

                <button
                  className="cancel-btn"
                  onClick={() =>
                    setShowSalaryPopup(false)
                  }
                >
                  Cancel
                </button>

                <button
                  className="gradient-btn"
                  onClick={
                    () => {
                      handleGenerateSlip();
                      setShowSalaryPopup(false);
                    }
                  }
                >
                  Generate Slip
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload POPUP */}
        {
  showUploadPopup && (
    <div className="upload-overlay">

      <div className="upload-modal">

        <button
          className="upload-close"
          onClick={() =>
            setShowUploadPopup(false)
          }
        >
          <X size={18} />
        </button>

        <div className="upload-icon">
          📄
        </div>

        <h2>
          Upload Salary Slip
        </h2>

        <p>
          Drag & drop your salary slip
          or browse file to upload
        </p>

        <label className="upload-dropzone">

          <input
            type="file"
            accept=".pdf,.doc,.docx"
            hidden
            onChange={(e) =>
              setUploadFile(
                e.target.files[0]
              )
            }
          />

          <span>
            {uploadFile
              ? uploadFile.name
              : "Choose File"}
          </span>

        </label>

        <button
          className="upload-submit-btn"
          onClick={() =>
            console.log(
              "Uploaded:",
              uploadFile
            )
          }
        >
          Upload Now
        </button>

      </div>

    </div>
  )
}
      </main>
    </MainLayout>
  );
}