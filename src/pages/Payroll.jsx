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
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

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
    if (clearMessage) setStatusMessage({ type: "", text: "" });

    try {
      if (isAdminOrHR) {
        const empRes = await getEmployees();
        setEmployees(empRes.data?.employees || []);
      }

      const params = isAdminOrHR
        ? { month: MONTH_NUMBER_TO_NAME[selectedMonth], year: selectedYear }
        : undefined;
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
          const skippedCount = data?.skipped?.length || 0;
          const skipNote = skippedCount > 0 ? `, ${skippedCount} skipped` : "";
          setStatusMessage({
            type: "success",
            text: res.data?.message || `Payroll calculated: ${data?.success?.length || 0} succeeded, ${data?.failed?.length || 0} failed${skipNote}.`,
          });
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

        <PayrollTabs isAdminOrHR={isAdminOrHR} activeTab={activeTab} onTabChange={setActiveTab} />

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
            actionLoading={actionLoading}
            downloadingId={downloadingId}
            onMonthChange={setSelectedMonth}
            onYearChange={handleYearChange}
            onSearchChange={setSearchQuery}
            onDownloadPdf={handleDownloadPDF}
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
            handleCalculateSingle({
              employeeId: selectedRecord.employeeId || selectedRecord.employeeCode,
              month: selectedMonth,
              year: selectedYear,
              payrollType: selectedRecord.payrollType || "monthly",
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
