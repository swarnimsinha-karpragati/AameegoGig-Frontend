import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
import { MONTH_NUMBER_TO_NAME, MONTH_NAME_TO_NUMBER } from "../utils/payrollConstants";
import { payrollHasBreakdown } from "../utils/payrollRecord";
import { downloadPayrollPdf } from "../utils/generateSalarySlipPdf";
import UpdatePayrollModal from "../components/UpdatePayrollModal";
import PayrollBreakdownDrawer from "../components/PayrollBreakdownDrawer";
import PayrollHeader from "../components/payroll/PayrollHeader";
import PayrollStatusBanner from "../components/payroll/PayrollStatusBanner";
import PayrollTabs from "../components/payroll/PayrollTabs";
import PayrollStatsGrid from "../components/payroll/PayrollStatsGrid";
import PayrollProcessorTab from "../components/payroll/PayrollProcessorTab";
import PayrollReviewTab from "../components/payroll/PayrollReviewTab";
import PayrollSlipsTab from "../components/payroll/PayrollSlipsTab";
import PayrollSummaryTab from "../components/payroll/PayrollSummaryTab";
import PayrollAnalyticsTab from "../components/payroll/PayrollAnalyticsTab";
import PayrollApprovalModal from "../components/payroll/PayrollApprovalModal";
import PayrollUploadModal from "../components/payroll/PayrollUploadModal";
import "./Payroll.css";
import MainLayout from "../layouts/MainLayout";

export default function Payroll() {
  const user = getStoredUser();
  const isAdminOrHR = user?.role === "Admin" || user?.role === "HR";
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState(tabFromUrl || (isAdminOrHR ? "ops" : "my_slips"));
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedEmp, setSelectedEmp] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [employees, setEmployees] = useState([]);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [activeRun, setActiveRun] = useState(null);
  const [runPayrolls, setRunPayrolls] = useState([]);

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState("approve");
  const [approvalComment, setApprovalComment] = useState("");
  const [payrollSummary, setPayrollSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [editingPayment, setEditingPayment] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");

  const closeDetailsPopup = () => {
    setShowDetailsPopup(false);
    setBreakdownLoading(false);
  };

  const loadInitialData = async () => {
    if (!user) return;
    setLoading(true);
    setStatusMessage({ type: "", text: "" });

    try {
      if (isAdminOrHR) {
        const empRes = await getEmployees();
        setEmployees(empRes.data?.employees || []);

        const params = { month: MONTH_NUMBER_TO_NAME[selectedMonth], year: selectedYear };
        const payrollRes = await getAllPayrollRecords(params);
        setPayrollHistory(payrollRes.data?.data || []);

        const paymentsRes = await getPayments(params);
        setPaymentHistory(paymentsRes.data?.data || []);

        const runsRes = await listPayrollRuns({ year: selectedYear });
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
          const summaryRes = await getPayrollSummary({ month: selectedMonth, year: selectedYear });
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
      setStatusMessage({ type: "error", text: "Failed to initialize payroll data dashboard. Please refresh." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      if (!isAdminOrHR) {
        try {
          const me = await getCurrentUser();
          if (me?.user) localStorage.setItem("user", JSON.stringify(me.user));
        } catch {
          // keep stored user
        }
      }
      loadInitialData();
    };
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, user?.vendorId, user?.employeeCode]);

  useEffect(() => {
    if (tabFromUrl && isAdminOrHR) setActiveTab(tabFromUrl);
  }, [tabFromUrl, isAdminOrHR]);

  const handlePreview = async () => {
    if (!selectedEmp) {
      setStatusMessage({ type: "error", text: "Please select an employee to preview." });
      return;
    }
    const { code } = JSON.parse(selectedEmp);
    const emp = employees.find((e) => e.employeeCode === code);
    setSelectedRecord({
      employeeCode: code,
      employeeName: emp?.name || code,
      month: MONTH_NUMBER_TO_NAME[selectedMonth],
      year: selectedYear,
      department: emp?.department,
    });
    setShowDetailsPopup(true);
    setBreakdownLoading(true);
    setActionLoading(true);
    setStatusMessage({ type: "", text: "" });

    try {
      const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
      const res = await previewPayroll({ employeeId: code, month: monthStr });
      if (res.data?.success) setSelectedRecord(res.data.data);
      else throw new Error(res.data?.message || "Failed to generate preview");
    } catch (error) {
      closeDetailsPopup();
      setStatusMessage({
        type: "error",
        text: error.response?.data?.message || error.message || "Failed to preview payroll calculation.",
      });
    } finally {
      setBreakdownLoading(false);
      setActionLoading(false);
    }
  };

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
        setStatusMessage({ type: "success", text: `Successfully computed and saved payroll for ${selectedRecord.employeeName}.` });
        if (res.data?.data) setSelectedRecord(res.data.data);
        loadInitialData();
      } else throw new Error(res.data?.message || "Calculation failed");
    } catch (error) {
      setStatusMessage({ type: "error", text: error.response?.data?.message || error.message || "Failed to compute single payroll." });
    } finally {
      setActionLoading(false);
    }
  };

  const runBulkCalculation = async (switchToReview = true) => {
    if (!window.confirm(`Create payroll run and calculate for ${MONTH_NUMBER_TO_NAME[selectedMonth]} ${selectedYear}?`)) return;
    setActionLoading(true);
    setStatusMessage({ type: "", text: "" });
    try {
      const createRes = await createPayrollRun({ month: selectedMonth, year: selectedYear });
      const calcRes = await calculatePayrollRun(createRes.data?.data?._id);
      setActiveRun(calcRes.data?.data?.run);
      setRunPayrolls(calcRes.data?.data?.results?.success || []);
      setStatusMessage({
        type: "success",
        text: switchToReview ? "Bulk payroll calculated. Review and approve in the Payroll Review tab." : "Payroll run calculated. Review exceptions before approving.",
      });
      if (switchToReview) setActiveTab("review");
      loadInitialData();
    } catch (error) {
      setStatusMessage({ type: "error", text: error.response?.data?.message || error.message || "Failed to run bulk payroll calculation." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!uploadFile) {
      alert("Please select an Excel file");
      return;
    }
    setUploadMessage("");
    try {
      setLoading(true);
      const res = await bulkUploadPayrollEntries(uploadFile, MONTH_NUMBER_TO_NAME[selectedMonth], selectedYear);
      setPaymentHistory(res.data.data || []);
      const errorList = res.data.errors || [];
      let message = `Upload Complete: ${res.data.inserted} inserted, ${res.data.skipped} skipped`;
      if (errorList.length > 0) message += "\n\nErrors:\n" + errorList.join("\n");
      setUploadMessage(message);
      setUploadFile(null);
    } catch (error) {
      setUploadMessage(error.response?.data?.message || "Bulk upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (record) => {
    try {
      await downloadPayrollPdf(record, { isAdminOrHR });
    } catch (err) {
      alert("Failed to compile PDF report: " + (err.response?.data?.message || err.message));
    }
  };

  const handleViewBreakdown = async (record) => {
    setSelectedRecord(record);
    setShowDetailsPopup(true);
    if (payrollHasBreakdown(record)) return;

    setBreakdownLoading(true);
    try {
      const monthNum = MONTH_NAME_TO_NUMBER[record.month] || 1;
      const monthStr = `${record.year}-${String(monthNum).padStart(2, "0")}`;
      const previewRes = await previewPayroll({ employeeId: record.employeeCode, month: monthStr });
      setSelectedRecord({
        ...previewRes.data.data,
        _id: record._id,
        status: record.status,
        oneOffAdjustments: record.oneOffAdjustments || [],
        payrollCode: record.payrollCode,
      });
    } catch (err) {
      setStatusMessage({ type: "error", text: err.response?.data?.message || err.message || "Failed to load slip breakdown." });
    } finally {
      setBreakdownLoading(false);
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

  const handleDownloadCSV = () => {
    const headers = ["REF NO", "BENEFICIARY NAME", "AMOUNT", "ACCOUNT NUMBER", "IFSC", "PAYMENT DATE", "YEAR", "STATUS"];
    const rows = paymentHistory.map((item) => [
      item.refNo || "", item.beneficiaryName || "", item.amount || "",
      item.beneficiaryAccountNo || "", item.ifsc || "", item.paymentDate || "",
      item.payrollYear || "", item.status || "",
    ]);
    const blob = new Blob([[headers.join(","), ...rows.map((r) => r.join(","))].join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Payment_History_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const filteredHistory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return payrollHistory;
    return payrollHistory.filter(
      (item) =>
        (item.employeeName || "").toLowerCase().includes(query) ||
        (item.employeeCode || "").toLowerCase().includes(query) ||
        (item.payrollCode || "").toLowerCase().includes(query)
    );
  }, [payrollHistory, searchQuery]);

  const metrics = useMemo(() => {
    let totalPayroll = 0, earnings = 0, deductions = 0;
    filteredHistory.forEach((item) => {
      totalPayroll += item.netSalary || 0;
      earnings += item.totalEarnings || 0;
      deductions += item.totalDeduction || 0;
    });
    return { totalPayroll, earnings, deductions, processed: filteredHistory.length };
  }, [filteredHistory]);

  const chartData = useMemo(() => {
    const mapItem = (item) => ({
      name: item.employeeName || item.employeeCode || `${item.month} ${item.year}`,
      earnings: item.totalEarnings,
      deductions: item.totalDeduction,
      netPay: item.netSalary,
    });
    if (isAdminOrHR) return filteredHistory.map(mapItem);
    return filteredHistory.map(mapItem).reverse();
  }, [filteredHistory, isAdminOrHR]);

  const reviewPayrolls = useMemo(
    () => (runPayrolls.length > 0 ? runPayrolls : filteredHistory),
    [runPayrolls, filteredHistory]
  );

  const showTopStats = isAdminOrHR
    ? ["ops", "slips", "analytics"].includes(activeTab)
    : ["my_slips", "my_analytics"].includes(activeTab);

  const handleApprovalSubmit = async () => {
    if (!activeRun) return;
    setActionLoading(true);
    try {
      if (approvalAction === "approve") await approvePayrollRun(activeRun._id, approvalComment);
      else await rejectPayrollRun(activeRun._id, approvalComment);
      setStatusMessage({ type: "success", text: approvalAction === "approve" ? "Payroll run approved." : "Payroll run rejected." });
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
    if (!activeRun || !window.confirm("Generate payslip PDFs and mark this payroll run as processed?")) return;
    setActionLoading(true);
    try {
      const res = await processPayrollRun(activeRun._id);
      setActiveRun(res.data?.data?.run || res.data?.data);
      setStatusMessage({ type: "success", text: `Payroll processed. ${res.data?.data?.payslips?.generated || 0} payslip(s) generated.` });
      loadInitialData();
    } catch (error) {
      setStatusMessage({ type: "error", text: error.response?.data?.message || error.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEmailPayslips = async () => {
    if (!activeRun || !window.confirm("Email payslips to all employees with processed payroll?")) return;
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
    if (!record?._id || !window.confirm(`Reopen processed payroll for ${record.employeeName}?`)) return;
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
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
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

  return (
    <MainLayout>
      <main className="payroll-page">
        <PayrollHeader
          isAdminOrHR={isAdminOrHR}
          actionLoading={actionLoading}
          onUploadClick={() => setShowUploadPopup(true)}
          onBulkProcess={() => runBulkCalculation(true)}
        />

        <PayrollStatusBanner
          message={statusMessage}
          onDismiss={() => setStatusMessage({ type: "", text: "" })}
        />

        <PayrollTabs isAdminOrHR={isAdminOrHR} activeTab={activeTab} onTabChange={setActiveTab} />

        {showTopStats && <PayrollStatsGrid metrics={metrics} />}

        {isAdminOrHR && activeTab === "ops" && (
          <PayrollProcessorTab
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            selectedEmp={selectedEmp}
            employees={employees}
            actionLoading={actionLoading}
            onYearChange={setSelectedYear}
            onMonthChange={setSelectedMonth}
            onEmployeeChange={setSelectedEmp}
            onPreview={handlePreview}
            onBulkCalculate={() => runBulkCalculation(true)}
          />
        )}

        {isAdminOrHR && activeTab === "review" && (
          <PayrollReviewTab
            activeRun={activeRun}
            reviewPayrolls={reviewPayrolls}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            actionLoading={actionLoading}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            onViewBreakdown={handleViewBreakdown}
            onOpenApproval={(action) => { setApprovalAction(action); setShowApprovalModal(true); }}
            onProcessRun={handleProcessRun}
            onEmailPayslips={handleEmailPayslips}
            onCreateRun={() => runBulkCalculation(false)}
          />
        )}

        {activeTab === (isAdminOrHR ? "slips" : "my_slips") && (
          <PayrollSlipsTab
            isAdminOrHR={isAdminOrHR}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            searchQuery={searchQuery}
            paymentHistory={paymentHistory}
            filteredHistory={filteredHistory}
            actionLoading={actionLoading}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            onSearchChange={setSearchQuery}
            onDownloadCsv={handleDownloadCSV}
            onEditPayment={(p) => { setEditingPayment({ ...p, accountNo: p.beneficiaryAccountNo }); setShowPaymentModal(true); }}
            onViewBreakdown={handleViewBreakdown}
            onDownloadPdf={handleDownloadPDF}
            onEmailPayslip={handleSendPayslipEmail}
            onReopenPayroll={handleReopenPayroll}
          />
        )}

        {activeTab === "summary" && isAdminOrHR && (
          <PayrollSummaryTab
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            summaryLoading={summaryLoading}
            payrollSummary={payrollSummary}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            onExport={handleExportSummary}
          />
        )}

        {activeTab === (isAdminOrHR ? "analytics" : "my_analytics") && (
          <PayrollAnalyticsTab chartData={chartData} />
        )}

        <PayrollBreakdownDrawer
          open={showDetailsPopup}
          record={selectedRecord}
          loading={breakdownLoading}
          onClose={closeDetailsPopup}
          isAdminOrHR={isAdminOrHR}
          actionLoading={actionLoading}
          onConfirmSave={handleCalculateSingle}
          onAddAdjustment={handleAddAdjustment}
          onRemoveAdjustment={handleRemoveAdjustment}
        />

        <PayrollApprovalModal
          open={showApprovalModal}
          action={approvalAction}
          comment={approvalComment}
          actionLoading={actionLoading}
          onClose={() => setShowApprovalModal(false)}
          onCommentChange={setApprovalComment}
          onSubmit={handleApprovalSubmit}
        />

        <UpdatePayrollModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          itemToEdit={editingPayment}
          onSave={handleSavePayment}
        />

        <PayrollUploadModal
          open={showUploadPopup}
          uploadFile={uploadFile}
          uploadMessage={uploadMessage}
          loading={loading}
          onClose={() => setShowUploadPopup(false)}
          onFileChange={setUploadFile}
          onUpload={handleBulkUpload}
        />
      </main>
    </MainLayout>
  );
}
