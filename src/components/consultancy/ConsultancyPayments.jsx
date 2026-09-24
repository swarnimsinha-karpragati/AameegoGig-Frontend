import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, RefreshCw, X } from "lucide-react";
import API from "../../services/apiClient";
import Button from "../Button";
import Pagination from "../Pagination";
import "../attendance/RecordEditModal.css";

const monthName = (month) => new Date(2000, month - 1, 1).toLocaleString("en", { month: "long" });

const apiErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data?.error === "string" && data.error.trim()) return data.error;
  return error?.message || fallback;
};

const departmentIdOf = (department) => {
  if (!department) return "";
  if (typeof department === "object") return String(department._id || department.id || "");
  return "";
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

// Mirror of the backend employee-directory status filter (bug 255).
const matchesEmployeeStatus = (employee = {}, statusKey = "") => {
  const key = String(statusKey || "").toLowerCase();
  if (!key) return true;
  if (key === "active") return employee.isActive !== false && !employee.isDeleted;
  if (key === "inactive") return employee.isActive === false && !employee.isDeleted;
  if (key === "exited") return Boolean(employee.isExited) && !employee.isDeleted;
  if (key === "probation") return employee.employmentStatus === "probation" && !employee.isDeleted;
  if (key === "full-time" || key === "fulltime" || key === "confirmed") {
    return employee.employmentStatus === "full-time" && !employee.isDeleted;
  }
  if (key === "deleted" || key === "existed") return Boolean(employee.isDeleted);
  return true;
};

export default function ConsultancyPayments({
  refreshKey = 0,
  search = "",
  departmentFilter = "",
  employeeStatusFilter = "",
  canManage = false,
}) {
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
  // Client-side pagination for the payments table (same control/behaviour
  // as the Employees directory list: 5 rows per page by default).
  const [consultancyPage, setConsultancyPage] = useState(1);
  const [consultancyLimit, setConsultancyLimit] = useState(5);

  // Bug 263: dynamic year window ending at the current year — never a fixed
  // range, and never a future year.
  const yearOptions = useMemo(
    () => Array.from({ length: 16 }, (_, index) => currentYear - index),
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
  // View-only users (consultancy:view without manage) skip init — POST /init
  // needs consultancy:manage, but GET works with view permission.
  useEffect(() => {
    const initializeAndLoad = async () => {
      setLoading(true);
      setError("");
      try {
        if (canManage) {
          try {
            await API.post("/consultancy-payments/init", period);
          } catch (initError) {
            // Init is best-effort: if it fails (e.g. 403), still load via GET
            // so view-only dashboard stats keep showing.
            const status = initError?.response?.status;
            if (status !== 403 && status !== 401) throw initError;
          }
        }
        setData((await API.get("/consultancy-payments", { params: period })).data || { rows: [], summary: {} });
      } catch (requestError) {
        setError(apiErrorMessage(requestError, "Unable to load consultancy payments"));
      } finally {
        setLoading(false);
      }
    };
    initializeAndLoad();
  }, [period, refreshKey, canManage]);

  const onMonthChange = (month) => setPeriod({ ...period, month: Number(month) });

  const onYearChange = (year) => {
    const selectedYear = Number(year);
    // Bug 263: selecting the current year clamps a future month back to now.
    const clampedMonth = selectedYear === currentYear && period.month > currentMonth ? currentMonth : period.month;
    setPeriod({ ...period, year: selectedYear, month: clampedMonth });
  };

  const rows = useMemo(() => {
    const term = String(search || "").trim().toLowerCase();
    let filtered = data.rows || [];
    // Payment status filter (Paid/Pending).
    if (statusFilter !== "all") {
      filtered = filtered.filter((row) => row.payment.status === statusFilter);
    }
    // Bug 255: department + employee-status filters apply here too.
    if (departmentFilter) {
      filtered = filtered.filter((row) => {
        const dept = row.employee?.department;
        if (typeof dept === "object" && dept !== null) {
          if (departmentIdOf(dept) && departmentIdOf(dept) === String(departmentFilter)) return true;
          // Fallback: match by populated name when only names are available.
          return false;
        }
        return String(dept || "") === String(departmentFilter);
      });
    }
    if (employeeStatusFilter) {
      filtered = filtered.filter((row) => matchesEmployeeStatus(row.employee, employeeStatusFilter));
    }
    if (!term) return filtered;
    return filtered.filter((row) => {
      const department = departmentName(row.employee.department);
      const haystack = [
        row.employee.name,
        row.employee.employeeCode,
        row.employee.designation,
        department,
      ].filter(Boolean).join(" ").toLocaleLowerCase();
      return haystack.includes(term);
    });
  }, [data.rows, search, statusFilter, departmentFilter, employeeStatusFilter]);

  // Bug 254: summary cards reflect the same filtered rows as the table.
  const summary = useMemo(() => {
    const result = {
      totalConsultants: 0,
      totalPayable: 0,
      totalTDS: 0,
      totalNetPayable: 0,
      paidAmount: 0,
      pendingAmount: 0,
    };
    rows.forEach((row) => {
      const amount = Number(row.payment.amount) || 0;
      const netAmount = Number(row.payment.netAmount ?? amount - (Number(row.payment.tdsAmount) || 0)) || 0;
      result.totalConsultants += 1;
      result.totalPayable += amount;
      result.totalTDS += Number(row.payment.tdsAmount) || 0;
      result.totalNetPayable += netAmount;
      if (row.payment.status === "Paid") result.paidAmount += netAmount;
      else result.pendingAmount += netAmount;
    });
    return result;
  }, [rows]);

  // Pagination works on the filtered rows; summary cards above always use
  // the full filtered set. Page resets whenever the underlying list changes.
  const consultancyTotalPages = Math.max(1, Math.ceil(rows.length / consultancyLimit));
  const safeConsultancyPage = Math.min(Math.max(1, consultancyPage), consultancyTotalPages);
  const paginatedRows = useMemo(() => {
    const start = (safeConsultancyPage - 1) * consultancyLimit;
    return rows.slice(start, start + consultancyLimit);
  }, [rows, safeConsultancyPage, consultancyLimit]);

  useEffect(() => {
    setConsultancyPage(1);
  }, [search, statusFilter, departmentFilter, employeeStatusFilter, period, data.rows, consultancyLimit]);

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
  // Bug 258: surface invalid pay/TDS in the preview instead of silently clamping.
  const previewAmount = Number(editForm.amount);
  const previewTds = editForm.tdsPercent === "" ? 0 : Number(editForm.tdsPercent);
  const previewInvalid =
    modal && (editForm.amount !== "" && (!Number.isFinite(previewAmount) || previewAmount < 0))
      ? "Consultancy Pay cannot be negative."
      : modal && editForm.tdsPercent !== "" && (!Number.isFinite(previewTds) || previewTds < 0 || previewTds > 100)
        ? "TDS must be between 0% and 100%."
        : "";
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
        <>
          <div className="employee-table-scroll">
            <table className="employee-table">
              <thead><tr><th>Consultant</th><th>Department</th><th>Rate</th><th>TDS %</th><th>Net payable</th><th>Status</th>{canManage ? <th>Action</th> : null}</tr></thead>
              <tbody>
                {paginatedRows.map((row) => {
                const net = Number(row.payment.netAmount) || 0;
                return (
                  <tr key={row.employee._id}>
                    <td>{row.employee.name}<small>{row.employee.employeeCode}{row.converted ? " · Converted to employee — history" : ""}</small></td>
                    <td>{departmentName(row.employee.department)}</td>
                    <td>{money(row.payment.amount)}</td>
                    <td>{Number(row.payment.tdsPercent) || 0}%</td>
                    <td><strong>{money(net)}</strong></td>
                    <td><span className={`status-badge ${row.payment.status === "Paid" ? "active" : "inactive"}`}>{row.payment.status}</span></td>
                    {canManage ? (
                      <td>
                        {row.payment.status === "Paid" || row.converted ? (
                          <span className="consultancy-status-locked">Payment locked</span>
                        ) : (
                          <div className="consultancy-payments-actions">
                            <Button variant="secondary" icon={<Check size={15} />} onClick={() => openModal(row, "pay")}>Mark as paid</Button>
                            <Button variant="secondary" icon={<Pencil size={15} />} onClick={() => openModal(row, "edit")}>Edit</Button>
                          </div>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
              {!rows.length ? <tr><td colSpan={canManage ? "7" : "6"}>No consultancy records found.</td></tr> : null}
            </tbody>
          </table>
        </div>
          {consultancyTotalPages > 1 && (
            <Pagination
              currentPage={safeConsultancyPage}
              totalPages={consultancyTotalPages}
              totalRecords={rows.length}
              limit={consultancyLimit}
              onPageChange={setConsultancyPage}
              showPageSize
              pageSizeOptions={[5, 10, 25, 50, 100]}
              onPageSizeChange={(nextLimit) => {
                setConsultancyLimit(nextLimit);
                setConsultancyPage(1);
              }}
            />
          )}
        </>
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
                  <select
                    value={editForm.paymentMode}
                    onChange={(event) => setEditForm({ ...editForm, paymentMode: event.target.value })}
                    disabled={saving}
                    required={modal.mode === "pay"}
                  >
                    <option value="">Select payment mode</option>
                    <option value="Bank Transfer (NEFT/RTGS/IMPS)">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
              </div>

              <div className="consultancy-modal-breakdown">
                <span>Gross: {money(breakdown.gross)}</span>
                <span>TDS ({breakdown.tds === 0 ? "0" : (Number(editForm.tdsPercent) || 0)}%): −{money(breakdown.tds)}</span>
                <strong>Net payable: {money(breakdown.net)}</strong>
              </div>
              {previewInvalid ? (
                <p className="record-edit-error" role="alert">{previewInvalid}</p>
              ) : null}

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
