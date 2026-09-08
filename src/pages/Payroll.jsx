import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  previewPayroll,
  calculateSinglePayroll,
  calculateBulkPayroll,
  getAllPayrollRecords,
  approvePayrollEntry,
  deletePayrollEntry,
  bulkApprovePayrolls,
  sendPayslipEmail,
  reopenPayroll,
  releasePayroll,
  addPayrollAdjustment,
  removePayrollAdjustment,
  downloadWageSheet,
} from "../services/payrollService";
import { getEmployees } from "../services/employeeService";
import { getCurrentUser } from "../services/authService";
import { getStoredUser } from "../utils/roles";
import { MONTH_NUMBER_TO_NAME, MONTH_NAME_TO_NUMBER, getAvailableMonths } from "../utils/payrollConstants";
import { payrollHasBreakdown, enrichPayrollRecord } from "../utils/payrollRecord";
import { downloadPayrollPdf } from "../utils/generateSalarySlipPdf";
import PayrollManager from "../components/payroll/PayrollManager";
import PayslipsTab from "../components/payroll/PayslipsTab";
import PayrollTabs from "../components/payroll/PayrollTabs";
import PayrollBreakdownDrawer from "../components/PayrollBreakdownDrawer";
import PayrollStatusBanner from "../components/payroll/PayrollStatusBanner";
import "./Payroll.css";
import MainLayout from "../layouts/MainLayout";

export default function Payroll() {
  const user = getStoredUser();
  const isAdminOrHR = user?.role === "Admin" || user?.role === "HR";
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState(tabFromUrl || (isAdminOrHR ? "payroll" : "payslips"));
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState("");

  const [employees, setEmployees] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [reviewPayrolls, setReviewPayrolls] = useState([]);
  const [notLinkedToEmployee, setNotLinkedToEmployee] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadingWageSheet, setDownloadingWageSheet] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });
  const [bulkResult, setBulkResult] = useState(null);
  const [showAllSkipped, setShowAllSkipped] = useState(false);

  const [confirmModal, setConfirmModal] = useState({ open: false, title: "", message: "", onConfirm: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, payrollId: null });

  const handleYearChange = (newYear) => {
    setSelectedYear(newYear);
    const available = getAvailableMonths(newYear);
    setSelectedMonth((prev) => {
      const maxMonth = available[available.length - 1]?.value || 12;
      return prev > maxMonth ? maxMonth : prev;
    });
  };

  const closeDetailsPopup = () => {
    setShowDetailsPopup(false);
    setBreakdownLoading(false);
  };

  const loadData = async (clearMessage = true) => {
    if (!user) return;
    if (clearMessage) {
      setStatusMessage({ type: "", text: "" });
      setBulkResult(null);
    }

    try {
      if (isAdminOrHR) {
        const empRes = await getEmployees();
        setEmployees(empRes.data?.employees || []);
      }

      // Employees get the same period filter as admins; the backend scopes the
      // result to the logged-in employee's own released records.
      const params = { month: MONTH_NUMBER_TO_NAME[selectedMonth], year: selectedYear };
      const payrollRes = await getAllPayrollRecords(params);
      setPayrolls(payrollRes.data?.data || []);
      setNotLinkedToEmployee(Boolean(payrollRes.data?.notLinked));

      if (isAdminOrHR) {
        const reviewRes = await getAllPayrollRecords();
        setReviewPayrolls(reviewRes.data?.data || []);
      }
    } catch (error) {
      console.error("Error loading payroll data:", error);
      setStatusMessage({ type: "error", text: "Failed to load payroll data. Please refresh." });
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
      loadData();
    };
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, user?.vendorId, user?.employeeCode]);

  useEffect(() => {
    if (tabFromUrl && isAdminOrHR) setActiveTab(tabFromUrl);
  }, [tabFromUrl, isAdminOrHR]);

  // Clear banners when switching tabs (Payroll ↔ Payslips etc.)
  useEffect(() => {
    setStatusMessage({ type: "", text: "" });
    setBulkResult(null);
    setShowAllSkipped(false);
  }, [activeTab]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setStatusMessage({ type: "", text: "" });
    setBulkResult(null);
    setShowAllSkipped(false);
  };

  const handlePreview = async (params) => {
    setActionLoading(true);
    setStatusMessage({ type: "", text: "" });
    try {
      const emp = employees.find((e) => e.employeeCode === params.employeeId);
      setSelectedRecord(
        enrichPayrollRecord(
          {
            employeeCode: params.employeeId,
            employeeName: emp?.name || params.employeeId,
            month: MONTH_NUMBER_TO_NAME[selectedMonth],
            year: selectedYear,
          },
          employees
        )
      );
      setShowDetailsPopup(true);
      setBreakdownLoading(true);

      const monthStr = `${params.year}-${String(params.month).padStart(2, "0")}`;
      const res = await previewPayroll({
        employeeId: params.employeeId,
        month: monthStr,
        payrollType: params.payrollType,
        payrollDate: params.payrollDate,
      });
      if (res.data?.success) {
        setSelectedRecord(enrichPayrollRecord(res.data.data, employees));
      } else {
        throw new Error(res.data?.message || "Failed to generate preview");
      }
    } catch (error) {
      closeDetailsPopup();
      setStatusMessage({
        type: "error",
        text: error.response?.data?.message || error.message || "Failed to preview payroll.",
      });
    } finally {
      setBreakdownLoading(false);
      setActionLoading(false);
    }
  };

  const handleCalculateSingle = async (params) => {
    setActionLoading(true);
    setStatusMessage({ type: "", text: "" });
    try {
      const res = await calculateSinglePayroll(params);
      if (res.data?.success) {
        setStatusMessage({
          type: "success",
          text: `Payroll calculated for ${params.employeeId}. Review and approve.`,
        });
        loadData();
      } else {
        throw new Error(res.data?.message || "Calculation failed");
      }
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error.response?.data?.message || error.message || "Failed to calculate payroll.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkCalculate = async (params) => {
    const empCount = params.employeeIds ? params.employeeIds.length : "all";
    setConfirmModal({
      open: true,
      title: "Bulk Calculate",
      message: `Calculate payroll for ${empCount} employees? This will overwrite any existing calculations for this period.`,
      onConfirm: async () => {
        setConfirmModal({ open: false, title: "", message: "", onConfirm: null });
        setActionLoading(true);
        setStatusMessage({ type: "", text: "" });
        try {
          const res = await calculateBulkPayroll({
            month: params.month,
            year: params.year,
            employeeIds: params.employeeIds,
            payrollType: params.payrollType,
            payrollDate: params.payrollDate,
          });
          const data = res.data?.data;
          const skipped = data?.skipped || [];
          const skippedCount = skipped.length;
          const successCount = data?.success?.length || 0;
          const failedCount = data?.failed?.length || 0;
          const skipNote = skippedCount > 0 ? `, ${skippedCount} skipped` : "";
          let messageText = res.data?.message || `Payroll calculated: ${successCount} succeeded, ${failedCount} failed${skipNote}.`;
          const missingCTC = skipped.filter((s) => /CTC\/Salary Structure|salary structure/i.test(s.reason || ""));
          const otherSkipped = skipped.filter((s) => !/CTC\/Salary Structure|salary structure/i.test(s.reason || ""));
          // Short status message — detailed list shown in formatted panel below
          if (skippedCount > 0 && missingCTC.length > 0) {
            messageText = `Payroll calculated: ${successCount} succeeded, ${failedCount} failed, ${skippedCount} skipped. CTC/Salary Structure not assigned for ${missingCTC.length} employee(s) — details below.`;
          } else if (skippedCount > 0) {
            messageText = `Payroll calculated: ${successCount} succeeded, ${failedCount} failed, ${skippedCount} skipped — details below.`;
          }
          const hasOnlySkipped = successCount === 0 && failedCount === 0 && skippedCount > 0;
          const msgType = hasOnlySkipped || (missingCTC.length > 0 && successCount === 0) ? "error" : "success";
          setStatusMessage({ type: msgType, text: messageText });
          // Store structured result for formatted display (only after bulk calculate)
          setBulkResult({
            successCount,
            failedCount,
            skippedCount,
            missingCTC,
            otherSkipped,
            skipped,
            success: data?.success || [],
            failed: data?.failed || [],
            period: { month: params.month, year: params.year, payrollType: params.payrollType },
          });
          setShowAllSkipped(false);
          loadData(false);
        } catch (error) {
          setStatusMessage({
            type: "error",
            text: error.response?.data?.message || error.message || "Failed to run bulk calculation.",
          });
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleApproveSingle = async (payrollId) => {
    setActionLoading(true);
    try {
      await approvePayrollEntry(payrollId);
      setStatusMessage({ type: "success", text: "Payroll approved." });
      loadData();
    } catch (error) {
      setStatusMessage({ type: "error", text: error.response?.data?.message || error.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSingle = async (payrollId) => {
    setDeleteModal({ open: true, payrollId });
  };

  const handleDeleteConfirm = async () => {
    const { payrollId } = deleteModal;
    setDeleteModal({ open: false, payrollId: null });
    setActionLoading(true);
    try {
      await deletePayrollEntry(payrollId);
      setStatusMessage({ type: "success", text: "Payroll deleted." });
      loadData();
    } catch (error) {
      setStatusMessage({ type: "error", text: error.response?.data?.message || error.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkApprove = async (payrollIds, comment) => {
    setConfirmModal({
      open: true,
      title: "Bulk Approve",
      message: `Approve ${payrollIds.length} payroll record(s)? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmModal({ open: false, title: "", message: "", onConfirm: null });
        setActionLoading(true);
        try {
          const res = await bulkApprovePayrolls(payrollIds, comment);
          const data = res.data?.data;
          setStatusMessage({
            type: "success",
            text: `Bulk approve: ${data?.approved || 0} approved, ${data?.failed || 0} failed.`,
          });
          loadData();
        } catch (error) {
          setStatusMessage({ type: "error", text: error.response?.data?.message || error.message });
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleViewBreakdown = async (record) => {
    const enriched = enrichPayrollRecord(record, employees);
    setSelectedRecord(enriched);
    setShowDetailsPopup(true);
    if (payrollHasBreakdown(enriched)) return;

    setBreakdownLoading(true);
    try {
      const monthNum = MONTH_NAME_TO_NUMBER[record.month] || 1;
      const monthStr = `${record.year}-${String(monthNum).padStart(2, "0")}`;
      const previewRes = await previewPayroll({ employeeId: record.employeeCode, month: monthStr });
      setSelectedRecord(
        enrichPayrollRecord(
          {
            ...previewRes.data.data,
            _id: record._id,
            status: record.status,
            approvalStatus: record.approvalStatus,
            oneOffAdjustments: record.oneOffAdjustments || [],
            payrollCode: record.payrollCode,
          },
          employees
        )
      );
    } catch (err) {
      setStatusMessage({ type: "error", text: err.response?.data?.message || err.message || "Failed to load breakdown." });
    } finally {
      setBreakdownLoading(false);
    }
  };

  const handleDownloadPDF = async (record) => {
    setDownloadingId(record._id);
    try {
      await downloadPayrollPdf(record, { isAdminOrHR });
    } catch (err) {
      setStatusMessage({ type: "error", text: "Failed to compile PDF: " + (err.response?.data?.message || err.message) });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadWageSheet = async () => {
    const monthName = MONTH_NUMBER_TO_NAME[selectedMonth];
    // Frontend guard: disable/toast when payroll is Pending or Gross/Net is ₹0
    const hasProcessedPayroll = payrolls.some(
      (p) => (p.status === "Processed" || p.approvalStatus === "Approved") && (Number(p.netSalary) > 0 || Number(p.totalEarnings) > 0)
    );
    const hasAnyPayroll = payrolls.length > 0 && payrolls.some((p) => Number(p.netSalary) > 0 || Number(p.totalEarnings) > 0);
    if (!payrolls.length || !hasAnyPayroll || !hasProcessedPayroll) {
      setStatusMessage({
        type: "error",
        text: `Payroll for ${monthName} ${selectedYear} is not yet processed. Cannot download Wage Sheet.`,
      });
      return;
    }
    setDownloadingWageSheet(true);
    try {
      const res = await downloadWageSheet(selectedMonth, selectedYear);
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Wage Sheet ${MONTH_NUMBER_TO_NAME[selectedMonth].slice(0, 3)} ${selectedYear}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      setStatusMessage({
        type: "success",
        text: `Wage sheet for ${MONTH_NUMBER_TO_NAME[selectedMonth]} ${selectedYear} downloaded.`,
      });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text:
          err.response?.data?.message ||
          err.message ||
          "Failed to download wage sheet.",
      });
    } finally {
      setDownloadingWageSheet(false);
    }
  };

  const handleSendPayslipEmail = async (record) => {
    if (!record?._id) return;
    setActionLoading(true);
    try {
      await sendPayslipEmail(record._id);
      setStatusMessage({ type: "success", text: `Payslip emailed to ${record.employeeName}.` });
      loadData();
    } catch (error) {
      setStatusMessage({ type: "error", text: error.response?.data?.message || error.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopenPayroll = async (record) => {
    if (!record?._id) return;
    setConfirmModal({
      open: true,
      title: "Reopen Payroll",
      message: `Reopen payslip for ${record.employeeName}? This will reset the approval status.`,
      onConfirm: async () => {
        setConfirmModal({ open: false, title: "", message: "", onConfirm: null });
        setActionLoading(true);
        try {
          const res = await reopenPayroll(record._id);
          setStatusMessage({ type: "success", text: res.data?.message || `Payslip reopened for ${record.employeeName}.` });
          loadData();
        } catch (error) {
          setStatusMessage({ type: "error", text: error.response?.data?.message || error.message });
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleReleasePayroll = async (record) => {
    if (!record?._id) return;
    setActionLoading(true);
    try {
      const res = await releasePayroll(record._id);
      setStatusMessage({ type: "success", text: res.data?.message || `Payslip released for ${record.employeeName}.` });
      loadData();
    } catch (error) {
      setStatusMessage({ type: "error", text: error.response?.data?.message || error.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddAdjustment = async (payload) => {
    if (!selectedRecord?._id) throw new Error("Save payroll before adding adjustments");
    setActionLoading(true);
    try {
      const res = await addPayrollAdjustment(selectedRecord._id, payload);
      if (res.data?.data) setSelectedRecord(enrichPayrollRecord(res.data.data, employees));
      loadData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveAdjustment = async (adjId) => {
    if (!selectedRecord?._id) return;
    setConfirmModal({
      open: true,
      title: "Remove Adjustment",
      message: "Remove this adjustment?",
      onConfirm: async () => {
        setConfirmModal({ open: false, title: "", message: "", onConfirm: null });
        setActionLoading(true);
        try {
          const res = await removePayrollAdjustment(selectedRecord._id, adjId);
          if (res.data?.data) setSelectedRecord(enrichPayrollRecord(res.data.data, employees));
          loadData();
        } catch (err) {
          setStatusMessage({ type: "error", text: err.response?.data?.message || err.message });
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const filteredHistory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return payrolls;
    return payrolls.filter(
      (item) =>
        (item.employeeName || "").toLowerCase().includes(query) ||
        (item.employeeCode || "").toLowerCase().includes(query)
    );
  }, [payrolls, searchQuery]);

  // const metrics = useMemo(() => {
  //   let totalPayroll = 0, earnings = 0, deductions = 0;
  //   filteredHistory.forEach((item) => {
  //     totalPayroll += item.netSalary || 0;
  //     earnings += item.totalEarnings || 0;
  //     deductions += item.totalDeduction || 0;
  //   });
  //   return { totalPayroll, earnings, deductions, processed: filteredHistory.length };
  // }, [filteredHistory]);

  return (
    <MainLayout>
      <main className="payroll-page">
        <div className="payroll-header-banner">
          <div>
            <h1 className="payroll-title">Payroll</h1>
            <p className="payroll-subtitle">
              {isAdminOrHR
                ? "Calculate, approve and release employee payroll"
                : "View your payslips and earnings"}
            </p>
          </div>
        </div>

        <PayrollStatusBanner
          message={statusMessage}
          onDismiss={() => setStatusMessage({ type: "", text: "" })}
        />

        {bulkResult && (
          <div className="bulk-result-panel glass-morphism">
            <div className="bulk-result-header">
              <div>
                <h3 className="bulk-result-title">
                  Bulk Calculation Result — {MONTH_NUMBER_TO_NAME[bulkResult.period.month]} {bulkResult.period.year}
                  <span className="bulk-result-type"> {bulkResult.period.payrollType === "daily" ? "Daily" : "Monthly"}</span>
                </h3>
                <p className="bulk-result-subtitle">
                  {bulkResult.successCount} succeeded · {bulkResult.failedCount} failed · {bulkResult.skippedCount} skipped out of{" "}
                  {bulkResult.successCount + bulkResult.failedCount + bulkResult.skippedCount} employees
                </p>
              </div>
              <button className="bulk-result-close" onClick={() => setBulkResult(null)} type="button" aria-label="Close">
                ×
              </button>
            </div>

            <div className="bulk-result-stats">
              <span className="bulk-stat bulk-stat--success">
                <strong>{bulkResult.successCount}</strong> Succeeded
              </span>
              <span className="bulk-stat bulk-stat--failed">
                <strong>{bulkResult.failedCount}</strong> Failed
              </span>
              <span className="bulk-stat bulk-stat--skipped">
                <strong>{bulkResult.skippedCount}</strong> Skipped
              </span>
            </div>

            {bulkResult.missingCTC.length > 0 && (
              <div className="bulk-result-section">
                <h4 className="bulk-result-section-title">
                  CTC/Salary Structure not assigned <span className="bulk-result-count">({bulkResult.missingCTC.length})</span>
                </h4>
                <p className="bulk-result-hint">
                  These employees were skipped. Please assign their salary structure before payroll calculation.
                </p>
                <div className="bulk-skipped-list">
                  {(showAllSkipped ? bulkResult.missingCTC : bulkResult.missingCTC.slice(0, 20)).map((s) => (
                    <span key={s.employeeCode} className="bulk-skipped-chip" title={`${s.name} (${s.employeeCode}) — ${s.reason}`}>
                      {s.name} <em>({s.employeeCode})</em>
                    </span>
                  ))}
                </div>
                {bulkResult.missingCTC.length > 20 && (
                  <button
                    className="bulk-result-toggle"
                    onClick={() => setShowAllSkipped((v) => !v)}
                    type="button"
                  >
                    {showAllSkipped ? "Show less" : `Show all ${bulkResult.missingCTC.length} employees`}
                  </button>
                )}
              </div>
            )}

            {bulkResult.otherSkipped.length > 0 && (
              <div className="bulk-result-section">
                <h4 className="bulk-result-section-title">
                  Other skipped <span className="bulk-result-count">({bulkResult.otherSkipped.length})</span>
                </h4>
                <div className="bulk-skipped-list">
                  {(showAllSkipped ? bulkResult.otherSkipped : bulkResult.otherSkipped.slice(0, 20)).map((s) => (
                    <span key={s.employeeCode} className="bulk-skipped-chip" title={`${s.reason}`}>
                      {s.name} ({s.employeeCode}) — {s.reason}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {bulkResult.failed.length > 0 && (
              <div className="bulk-result-section">
                <h4 className="bulk-result-section-title">
                  Failed <span className="bulk-result-count">({bulkResult.failed.length})</span>
                </h4>
                <div className="bulk-skipped-list">
                  {bulkResult.failed.map((f) => (
                    <span key={f.employeeCode} className="bulk-skipped-chip bulk-skipped-chip--failed" title={f.error}>
                      {f.name} ({f.employeeCode}) — {f.error}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <PayrollTabs isAdminOrHR={isAdminOrHR} activeTab={activeTab} onTabChange={handleTabChange} />

        {isAdminOrHR && activeTab === "payroll" && (
          <PayrollManager
            employees={employees}
            payrolls={payrolls}
            reviewPayrolls={reviewPayrolls}
            actionLoading={actionLoading}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={handleYearChange}
            onPreview={handlePreview}
            onCalculateSingle={handleCalculateSingle}
            onBulkCalculate={handleBulkCalculate}
            onApproveSingle={handleApproveSingle}
            onDeleteSingle={handleDeleteSingle}
            onBulkApprove={handleBulkApprove}
            onViewBreakdown={handleViewBreakdown}
            statusMessage={statusMessage}
          />
        )}

        {activeTab === "payslips" && (
          <PayslipsTab
            isAdminOrHR={isAdminOrHR}
            notLinkedToEmployee={notLinkedToEmployee}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            searchQuery={searchQuery}
            filteredHistory={filteredHistory}
            payrolls={payrolls}
            actionLoading={actionLoading}
            downloadingId={downloadingId}
            onMonthChange={setSelectedMonth}
            onYearChange={handleYearChange}
            onSearchChange={setSearchQuery}
            onDownloadPdf={handleDownloadPDF}
            onDownloadWageSheet={handleDownloadWageSheet}
            downloadingWageSheet={downloadingWageSheet}
            onEmailPayslip={handleSendPayslipEmail}
            onReopenPayroll={handleReopenPayroll}
            onReleasePayroll={handleReleasePayroll}
            onViewBreakdown={handleViewBreakdown}
          />
        )}

        <PayrollBreakdownDrawer
          open={showDetailsPopup}
          record={selectedRecord}
          loading={breakdownLoading}
          onClose={closeDetailsPopup}
          isAdminOrHR={isAdminOrHR}
          actionLoading={actionLoading}
          onConfirmSave={() => {
            if (!selectedRecord) return;
            // Recalculate the record's own period, not the page-level filter.
            const recordMonth =
              MONTH_NAME_TO_NUMBER[selectedRecord.month] || selectedMonth;
            const isDailyRecord =
              (selectedRecord.payrollType || "monthly") === "daily";
            handleCalculateSingle({
              employeeId: selectedRecord.employeeId || selectedRecord.employeeCode,
              month: recordMonth,
              year: selectedRecord.year || selectedYear,
              payrollType: selectedRecord.payrollType || "monthly",
              payrollDate: isDailyRecord ? selectedRecord.payrollDate : undefined,
            });
          }}
          onAddAdjustment={handleAddAdjustment}
          onRemoveAdjustment={handleRemoveAdjustment}
        />

        {confirmModal.open && (
          <div className="upload-overlay" onClick={() => setConfirmModal({ open: false, title: "", message: "", onConfirm: null })}>
            <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
              <h2>{confirmModal.title}</h2>
              <p>{confirmModal.message}</p>
              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button className="btn-cancel" onClick={() => setConfirmModal({ open: false, title: "", message: "", onConfirm: null })} type="button">
                  Cancel
                </button>
                <button className="btn-primary-commit" onClick={confirmModal.onConfirm} type="button">
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteModal.open && (
          <div className="upload-overlay" onClick={() => setDeleteModal({ open: false, payrollId: null })}>
            <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
              <h2>Delete Payroll</h2>
              <p>Are you sure you want to delete this payroll record? This action cannot be undone.</p>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setDeleteModal({ open: false, payrollId: null })} type="button">
                  Cancel
                </button>
                <button className="btn-primary-commit" onClick={handleDeleteConfirm} style={{ background: "#ef4444" }} type="button">
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </MainLayout>
  );
}
