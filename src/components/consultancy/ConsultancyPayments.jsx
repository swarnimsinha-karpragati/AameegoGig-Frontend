import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, RefreshCw, X } from "lucide-react";
import API from "../../services/apiClient";
import Button from "../Button";
import "../attendance/RecordEditModal.css";

const monthName = (month) => new Date(2000, month - 1, 1).toLocaleString("en", { month: "long" });

const apiErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data?.error === "string" && data.error.trim()) return data.error;
  return error?.message || fallback;
};

const departmentName = (department) => {
  if (!department) return "-";
  return typeof department === "object" ? department.name || "-" : department;
};

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const netBreakdown = (gross, tdsPercent) => {
  const amount = Number(gross) || 0;
  const rate = Math.min(100, Math.max(0, Number(tdsPercent) || 0));
  const tds = Math.round((amount * rate) / 100);
  return { gross: amount, tds, net: amount - tds };
};

export default function ConsultancyPayments({ refreshKey = 0, search = "" }) {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const [period, setPeriod] = useState({ month: currentMonth, year: currentYear });
  const [statusFilter, setStatusFilter] = useState("all");
  const [data, setData] = useState({ rows: [], summary: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [editForm, setEditForm] = useState({ amount: "", tdsPercent: "", paymentMode: "", transactionReference: "", notes: "" });
  const [confirmPaid, setConfirmPaid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const yearOptions = useMemo(
    () => Array.from({ length: 10 }, (_, index) => currentYear - index),
    [currentYear]
  );

  const load = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError("");
    try {
      const response = await API.get("/consultancy-payments", { params: period });
      setData(response.data || { rows: [], summary: {} });
    } catch (requestError) {
      setError(apiErrorMessage(requestError, "Unable to load consultancy payments"));
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  // On mount and whenever month/year/refresh key changes: materialise the month's
  // records (so every consultant gets an entry to pay against) and then reload.
  useEffect(() => {
    const initializeAndLoad = async () => {
      setLoading(true);
      setError("");
      try {
        await API.post("/consultancy-payments/init", period);
        setData((await API.get("/consultancy-payments", { params: period })).data || { rows: [], summary: {} });
      } catch (requestError) {
        setError(apiErrorMessage(requestError, "Unable to load consultancy payments"));
      } finally {
        setLoading(false);
      }
    };
    initializeAndLoad();
  }, [period, refreshKey]);

  const onMonthChange = (month) => setPeriod({ ...period, month: Number(month) });

  const onYearChange = (year) => {
    const selectedYear = Number(year);
    const clampedMonth = selectedYear === currentYear && period.month > currentMonth ? currentMonth : period.month;
    setPeriod({ ...period, year: selectedYear, month: clampedMonth });
  };

  const rows = useMemo(() => {
    const term = String(search || "").trim().toLowerCase();
    let filtered = data.rows;
    if (statusFilter !== "all") {
      filtered = filtered.filter((row) => row.payment.status === statusFilter);
    }
    if (!term) return filtered;
    return filtered.filter((row) => {
      const department = departmentName(row.employee.department);
      const haystack = [
        row.employee.name,
        row.employee.employeeCode,
        row.employee.designation,
        department,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(term);
    });
  }, [data.rows, search, statusFilter]);

  const openModal = (row, mode) => {
    setModal({ row, mode });
    setEditForm({
      amount: row.payment.amount ?? row.employee.monthlyConsultancyPay ?? "",
      tdsPercent: row.payment.tdsPercent ?? row.employee.tdsPercent ?? "",
      paymentMode: row.payment.paymentMode || "",
      transactionReference: row.payment.transactionReference || "",
      notes: row.payment.notes || "",
    });
    setConfirmPaid(false);
    setEditError("");
  };

  const closeModal = () => {
    if (saving) return;
    setModal(null);
    setConfirmPaid(false);
    setEditForm({ amount: "", tdsPercent: "", paymentMode: "", transactionReference: "", notes: "" });
  };

  const saveModal = async (event) => {
    event.preventDefault();
    const isPayMode = modal.mode === "pay";
    const amount = Number(editForm.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      setEditError("Amount must be a non-negative number");
      return;
    }
    const tdsPercent = Number(editForm.tdsPercent) || 0;
    if (tdsPercent < 0 || tdsPercent > 100) {
      setEditError("TDS percentage must be between 0 and 100");
      return;
    }
    if (isPayMode) {
      if (!editForm.paymentMode.trim() || !editForm.transactionReference.trim()) {
        setEditError("Payment mode and transaction reference are required before marking as paid");
        return;
      }
      if (!confirmPaid) {
        setEditError("Please confirm that the payment has been made");
        return;
      }
    }

    setSaving(true);
    setEditError("");
    try {
      await API.put("/consultancy-payments", {
        employeeId: modal.row.employee._id,
        month: period.month,
        year: period.year,
        amount,
        tdsPercent,
        status: isPayMode ? "Paid" : "Pending",
        paymentMode: editForm.paymentMode,
        transactionReference: editForm.transactionReference,
        notes: editForm.notes,
      });
      closeModal();
      await load();
    } catch (requestError) {
      setEditError(apiErrorMessage(requestError, "Unable to save payment"));
    } finally {
      setSaving(false);
    }
  };

  const breakdown = netBreakdown(editForm.amount, editForm.tdsPercent);
  const summary = data.summary || {};
  return (
    <section className="consultancy-payments-panel">
      <div className="consultancy-payments-head">
        <div>
          <h2>Monthly Consultancy Payments</h2>
          <p>{monthName(period.month)} {period.year}</p>
        </div>
        <div className="consultancy-payments-controls">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status">
            <option value="all">All status</option>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
          </select>
          <select value={period.month} onChange={(event) => onMonthChange(event.target.value)} aria-label="Select month">
            {Array.from({ length: 12 }, (_, index) => {
              const month = index + 1;
              if (period.year === currentYear && month > currentMonth) return null;
              return <option key={month} value={month}>{monthName(month)}</option>;
            })}
          </select>
          <select value={period.year} onChange={(event) => onYearChange(event.target.value)} aria-label="Select year">
            {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
          <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={() => load()}>Refresh</Button>
        </div>
      </div>
      <div className="consultancy-payment-stats">
        <div><span>Consultants</span><strong>{summary.totalConsultants || 0}</strong></div>
        <div><span>Total gross</span><strong>{money(summary.totalPayable)}</strong></div>
        <div><span>TDS deduction</span><strong>{money(summary.totalTDS)}</strong></div>
        <div><span>Net payable</span><strong>{money(summary.totalNetPayable)}</strong></div>
        <div><span>Paid (net)</span><strong>{money(summary.paidAmount)}</strong></div>
        <div><span>Pending (net)</span><strong>{money(summary.pendingAmount)}</strong></div>
      </div>
      {error ? <p className="emp-field-error">{error}</p> : null}
      {loading ? <p>Loading payments...</p> : (
        <div className="employee-table-scroll">
          <table className="employee-table">
            <thead><tr><th>Consultant</th><th>Department</th><th>Rate</th><th>TDS %</th><th>Net payable</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {rows.map((row) => {
                const net = Number(row.payment.netAmount) || 0;
                return (
                  <tr key={row.employee._id}>
                    <td>{row.employee.name}<small>{row.employee.employeeCode}</small></td>
                    <td>{departmentName(row.employee.department)}</td>
                    <td>{money(row.payment.amount)}</td>
                    <td>{Number(row.payment.tdsPercent) || 0}%</td>
                    <td><strong>{money(net)}</strong></td>
                    <td><span className={`status-badge ${row.payment.status === "Paid" ? "active" : "inactive"}`}>{row.payment.status}</span></td>
                    <td>
                      {row.payment.status === "Paid" ? (
                        <span className="consultancy-status-locked">Payment locked</span>
                      ) : (
                        <div className="consultancy-payments-actions">
                          <Button variant="secondary" icon={<Check size={15} />} onClick={() => openModal(row, "pay")}>Mark as paid</Button>
                          <Button variant="secondary" icon={<Pencil size={15} />} onClick={() => openModal(row, "edit")}>Edit</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!rows.length ? <tr><td colSpan="7">No consultancy records found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      )}

      {modal ? (
        <div
          className="record-edit-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="consultancy-edit-title"
          onClick={() => !saving && closeModal()}
        >
          <div
            className="record-edit-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="record-edit-modal__head">
              <div>
                <p className="record-edit-modal__eyebrow">{modal.mode === "pay" ? "Mark as paid" : "Edit consultancy payment"}</p>
                <h2 id="consultancy-edit-title">
                  {modal.row.employee.name} · {monthName(period.month)} {period.year}
                </h2>
              </div>
              <button
                type="button"
                className="record-edit-modal__close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </header>

            <form className="record-edit-modal__body" onSubmit={saveModal}>
              <div className="record-edit-grid">
                <label className="record-edit-field">
                  <span>Amount (₹) *</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editForm.amount}
                    onChange={(event) => setEditForm({ ...editForm, amount: event.target.value })}
                    disabled={saving}
                    required
                  />
                </label>
                <label className="record-edit-field">
                  <span>TDS %</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={editForm.tdsPercent}
                    onChange={(event) => setEditForm({ ...editForm, tdsPercent: event.target.value })}
                    disabled={saving}
                    placeholder="e.g. 10"
                  />
                </label>
                <label className="record-edit-field">
                  <span>Payment mode {modal.mode === "pay" ? "*" : ""}</span>
                  <input
                    type="text"
                    value={editForm.paymentMode}
                    onChange={(event) => setEditForm({ ...editForm, paymentMode: event.target.value })}
                    disabled={saving}
                    placeholder="e.g. Bank transfer"
                    required={modal.mode === "pay"}
                  />
                </label>
              </div>

              <div className="consultancy-modal-breakdown">
                <span>Gross: {money(breakdown.gross)}</span>
                <span>TDS ({breakdown.tds === 0 ? "0" : (Number(editForm.tdsPercent) || 0)}%): −{money(breakdown.tds)}</span>
                <strong>Net payable: {money(breakdown.net)}</strong>
              </div>

              <label className="record-edit-field record-edit-field--full">
                <span>Transaction reference {modal.mode === "pay" ? "*" : ""}</span>
                <input
                  type="text"
                  value={editForm.transactionReference}
                  onChange={(event) => setEditForm({ ...editForm, transactionReference: event.target.value })}
                  disabled={saving}
                  placeholder="UTRN / reference number"
                  required={modal.mode === "pay"}
                />
              </label>

              <label className="record-edit-field record-edit-field--full">
                <span>Notes</span>
                <textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })}
                  disabled={saving}
                  placeholder="Optional notes"
                />
              </label>

              {modal.mode === "pay" ? (
                <label className="consultancy-confirm-field">
                  <input
                    type="checkbox"
                    checked={confirmPaid}
                    onChange={(event) => setConfirmPaid(event.target.checked)}
                    disabled={saving}
                  />
                  <span>I confirm that this payment has been made. This cannot be undone.</span>
                </label>
              ) : null}

              {editError ? (
                <p className="record-edit-error" role="alert">{editError}</p>
              ) : null}

              <div className="record-edit-modal__actions">
                <Button type="button" variant="secondary" onClick={closeModal} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : modal.mode === "pay" ? "Confirm & mark as paid" : "Save payment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}