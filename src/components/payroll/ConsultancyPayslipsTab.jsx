import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { RefreshCw, Eye, Download } from "lucide-react";
import Button from "../Button";
import DocumentPreview from "../DocumentPreview";
import { getMyConsultancyPayments, downloadConsultancyPayslip } from "../../services/payrollService";
import { getDocumentViewUrl } from "../../services/documentService";
import { getAvailableMonths, formatInr } from "../../utils/payrollConstants";
import "./ConsultancyPayslipsTab.css";

const MONTH_LABEL = (month) => new Date(2000, month - 1, 1).toLocaleString("en", { month: "long" });

const apiErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data?.error === "string" && data.error.trim()) return data.error;
  return error?.message || fallback;
};

export default function ConsultancyPayslipsTab() {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const [period, setPeriod] = useState({ month: currentMonth, year: currentYear });
  const [statusFilter, setStatusFilter] = useState("all");
  const [data, setData] = useState({ payments: [], summary: {}, employee: null, isConsultancy: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const yearOptions = useMemo(
    () => Array.from({ length: 16 }, (_, index) => currentYear - index),
    [currentYear]
  );

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getMyConsultancyPayments(period);
      setData(response.data || { payments: [], summary: {}, employee: null, isConsultancy: false });
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to load your consultancy payments"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period.month, period.year]);

  const getPayslipBlob = async (id) => {
    const response = await downloadConsultancyPayslip(id);
    return response.data;
  };

  const handleViewPayslip = async (payment) => {
    setError("");
    if (!payment.payslipDocumentId) {
      setError("Payslip document is not available yet. Please download instead.");
      return;
    }
    setPreviewUrl(getDocumentViewUrl(payment.payslipDocumentId));
    setIsPreviewOpen(true);
  };

  const handleDownloadPayslip = async (payment) => {
    setError("");
    try {
      const blob = await getPayslipBlob(payment._id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Consultancy_Payslip_${MONTH_LABEL(payment.month)}_${payment.year}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to download payslip"));
    }
  };

  const rows = useMemo(() => {
    let filtered = data.payments || [];
    if (statusFilter !== "all") {
      filtered = filtered.filter((payment) => payment.status === statusFilter);
    }
    return filtered;
  }, [data.payments, statusFilter]);

  const summary = useMemo(() => {
    const result = {
      totalPayable: 0,
      totalTDS: 0,
      totalNetPayable: 0,
      paidAmount: 0,
      pendingAmount: 0,
    };
    rows.forEach((payment) => {
      const amount = Number(payment.amount) || 0;
      const netAmount = Number(payment.netAmount ?? amount - (Number(payment.tdsAmount) || 0));
      result.totalPayable += amount;
      result.totalTDS += Number(payment.tdsAmount) || 0;
      result.totalNetPayable += netAmount;
      if (payment.status === "Paid") result.paidAmount += netAmount;
      else result.pendingAmount += netAmount;
    });
    return result;
  }, [rows]);

  const availableMonths = getAvailableMonths(period.year);
  const selectedMonth = period.month > availableMonths[availableMonths.length - 1]?.value
    ? availableMonths[availableMonths.length - 1]?.value
    : period.month;

  return (
    <div className="history-table-container glass-morphism payroll-list-card">
      <div className="payroll-list-card-head">
        <div>
          <h2>Consultancy Payslips</h2>
          <p className="subtitle">Browse and track your monthly consultancy payments and pay status</p>
        </div>
        <div className="consultancy-my-controls">
          <label className="consultancy-my-status">
            Status
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
              <option value="all">All</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
            </select>
          </label>
          <label className="consultancy-my-select">
            Year
            <select value={period.year} onChange={(e) => setPeriod((p) => ({ ...p, year: Number(e.target.value) }))} aria-label="Select year">
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>
          <label className="consultancy-my-select">
            Month
            <select
              value={selectedMonth}
              onChange={(e) => setPeriod((p) => ({ ...p, month: Number(e.target.value) }))}
              aria-label="Select month"
            >
              {availableMonths.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </label>
          <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={load}>Refresh</Button>
        </div>
      </div>

      <div className="consultancy-my-stats">
        <div><span>Gross amount</span><strong>{formatInr(summary.totalPayable)}</strong></div>
        <div><span>TDS deduction</span><strong>{formatInr(summary.totalTDS)}</strong></div>
        <div><span>Net payable</span><strong>{formatInr(summary.totalNetPayable)}</strong></div>
        <div className="paid"><span>Paid (net)</span><strong>{formatInr(summary.paidAmount)}</strong></div>
        <div><span>Pending (net)</span><strong>{formatInr(summary.pendingAmount)}</strong></div>
      </div>

      {error ? <p className="emp-field-error">{error}</p> : null}

      <div className="scrollable-table-wrapper payroll-table-wrap">
        <table className="payroll-custom-table payroll-table-compact">
          <thead>
            <tr>
              <th>Period</th>
              <th className="col-num">Gross</th>
              <th className="col-num">TDS %</th>
              <th className="col-num">TDS Amt</th>
              <th className="col-num">Net Payable</th>
              <th className="col-center">Status</th>
              <th>Paid On</th>
              <th>Payment Mode</th>
              <th>Reference</th>
              <th>Notes</th>
              <th className="col-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="11" className="empty-table-cell">Loading consultancy payslips…</td>
              </tr>
            ) : rows.length > 0 ? (
              rows.map((payment) => {
                const isPaid = payment.status === "Paid";
                return (
                  <tr key={payment._id}>
                    <td>{MONTH_LABEL(payment.month)} {payment.year}</td>
                    <td className="amount-cell col-num">{formatInr(payment.amount)}</td>
                    <td className="col-num">{Number(payment.tdsPercent) || 0}%</td>
                    <td className="amount-cell deduction-val col-num">{formatInr(payment.tdsAmount)}</td>
                    <td className="amount-cell net-salary-val col-num">{formatInr(payment.netAmount)}</td>
                    <td className="col-center">
                      <span className={`badge-status ${isPaid ? "processed" : "pending"}`}>{payment.status}</span>
                    </td>
                    <td>{payment.paidOn ? new Date(payment.paidOn).toLocaleDateString("en-IN") : "—"}</td>
                    <td>{payment.paymentMode || "—"}</td>
                    <td>{payment.transactionReference || "—"}</td>
                    <td>{payment.notes || "—"}</td>
                    <td className="col-center">
                      {isPaid ? (
                        <div className="consultancy-payslip-actions">
                          <button type="button" className="cpp-action-btn" onClick={() => handleViewPayslip(payment)} title="View payslip">
                            <Eye size={14} /> View
                          </button>
                          <button type="button" className="cpp-action-btn cpp-action-btn-download" onClick={() => handleDownloadPayslip(payment)} title="Download payslip">
                            <Download size={14} /> Download
                          </button>
                        </div>
                      ) : (
                        <span className="cpp-action-note">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="11" className="empty-table-cell">
                  {data.isConsultancy === false
                    ? "No consultancy payment records found for your account."
                    : `No consultancy payslips for ${MONTH_LABEL(period.month)} ${period.year}.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {createPortal(
        <DocumentPreview
          url={previewUrl}
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewUrl(null);
          }}
        />,
        document.body
      )}
    </div>
  );
}