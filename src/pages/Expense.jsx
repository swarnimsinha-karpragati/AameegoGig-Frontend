import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Receipt,
  IndianRupee,
  Clock3,
  CheckCircle2,
  Banknote,
  Plus,
  Check,
  X,
  Trash2,
  Send,
  ExternalLink,
  Users,
} from "lucide-react";
import MainLayout from "../layouts/MainLayout";
import ConfirmModal from "../components/ConfirmModal";
import { ToastProvider, useToast } from "../components/Toast";
import {
  getExpenseDashboard,
  getExpenses,
  createExpense,
  submitExpense,
  approveExpense,
  rejectExpense,
  markReimbursed,
  deleteExpense,
  getReceiptUrl,
} from "../services/expenseService";
import { getEmployees } from "../services/employeeService";
import {
  getStoredUser,
  getExpenseViewKey,
  canApproveExpenses,
  canManageExpensePolicy,
  hasLinkedEmployeeProfile,
} from "../utils/roles";
import "./Expense.css";

const CATEGORIES = [
  "Travel",
  "Food",
  "Accommodation",
  "Office Supplies",
  "Communication",
  "Training",
  "Medical",
  "Fuel",
  "Client Entertainment",
  "Other",
];

const STATUS_CLASS = {
  Draft: "expense-status draft",
  Pending: "expense-status pending",
  Approved: "expense-status approved",
  Rejected: "expense-status rejected",
  Reimbursed: "expense-status reimbursed",
};

const ROLE_DESCRIPTIONS = {
  Organization: "Organization-wide expense overview and management",
  HR: "HR expense approvals, policy, and org-wide reporting",
  Manager: "Review and approve expense claims for your team",
  Employee: "Submit expense claims and track reimbursements",
};

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN")}`;

/* ===========================
   SUMMARY CARDS
=========================== */
function ExpenseSummaryCards({ summary, labels = {} }) {
  const cards = [
    {
      key: "claimed",
      icon: Receipt,
      iconClass: "blue",
      value: formatCurrency(summary.totalClaimed),
      label: labels.claimed || "Total Claimed",
    },
    {
      key: "approved",
      icon: CheckCircle2,
      iconClass: "green",
      value: formatCurrency(summary.totalApproved),
      label: labels.approved || "Approved",
    },
    {
      key: "pending",
      icon: Clock3,
      iconClass: "amber",
      value: formatCurrency(summary.totalPending),
      label: labels.pending || "Pending",
    },
    {
      key: "reimbursed",
      icon: Banknote,
      iconClass: "purple",
      value: formatCurrency(summary.totalReimbursed),
      label: labels.reimbursed || "Reimbursed",
    },
  ];

  return (
    <div className="expense-summary-grid">
      {cards.map(({ key, icon: Icon, iconClass, value, label }) => (
        <article key={key} className="expense-summary-card">
          <div className={`expense-icon ${iconClass}`}>
            <Icon size={20} />
          </div>
          <div>
            <h3>{value}</h3>
            <p>{label}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

/* ===========================
   INNER COMPONENT (uses useToast)
=========================== */
function ExpenseInner() {
  const toast = useToast();
  const user = getStoredUser();
  const viewRole = getExpenseViewKey(user?.role);
  const canApprove = canApproveExpenses(user?.role);
  const canApplyForSelf = hasLinkedEmployeeProfile(user);

  /* ── State ── */
  const [dashboard, setDashboard] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  /* ── Confirm modal state ── */
  const [modal, setModal] = useState({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    variant: "danger",
    onConfirm: null,
    // For reject reason input
    withInput: false,
    inputValue: "",
  });

  const closeModal = () =>
    setModal((m) => ({ ...m, open: false, inputValue: "" }));

  const openModal = (config) =>
    setModal({ open: true, inputValue: "", withInput: false, ...config });

  /* ── Form ── */
  const [form, setForm] = useState({
    employeeId: "",
    title: "",
    category: "Other",
    amount: "",
    expenseDate: new Date().toISOString().split("T")[0],
    description: "",
    receipt: null,
    submitDirectly: true,
  });

  const summary = dashboard?.summary || {};
  const pendingExpenses = dashboard?.pendingExpenses || [];
  const categoryBreakdown = dashboard?.categoryBreakdown || [];

  /* ── Helpers ── */
  const matchesUser = useCallback(
    (item) => {
      const empId = item.employeeId?._id || item.employeeId;
      if (user?.employeeId && empId && String(empId) === String(user.employeeId))
        return true;
      const empName = item.employeeId?.name?.toLowerCase?.();
      return empName && empName === user?.name?.toLowerCase?.();
    },
    [user?.employeeId, user?.name]
  );

  const myExpenses = useMemo(
    () => expenses.filter(matchesUser),
    [expenses, matchesUser]
  );

  /* ── Data Loading ── */
  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [dashRes, expRes] = await Promise.all([
        getExpenseDashboard(),
        getExpenses(),
      ]);
      setDashboard(dashRes);
      setExpenses(expRes.expenses || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load expense data");
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    if (!canApprove) return;
    try {
      const res = await getEmployees();
      const list = res.data?.employees || [];
      setEmployees(list);
      if (!form.employeeId && list.length > 0) {
        setForm((prev) => ({ ...prev, employeeId: list[0]._id }));
      }
    } catch {
      // non-blocking
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  /* ── Handlers ── */
  const handleCreate = async (e, forSelf = false) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("category", form.category);
      fd.append("amount", form.amount);
      fd.append("expenseDate", form.expenseDate);
      fd.append("description", form.description);
      if (form.receipt) fd.append("receipt", form.receipt);
      if (form.submitDirectly) fd.append("status", "Pending");
      if (!forSelf && canApprove && form.employeeId) {
        fd.append("employeeId", form.employeeId);
      }

      await createExpense(fd);
      toast.success(
        form.submitDirectly
          ? "Expense submitted for approval"
          : "Expense saved as draft"
      );
      setForm((prev) => ({
        ...prev,
        title: "",
        amount: "",
        description: "",
        receipt: null,
        expenseDate: new Date().toISOString().split("T")[0],
      }));
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit expense");
    }
  };

  const handleSubmitDraft = (id) => {
    openModal({
      title: "Submit Expense",
      message: "Are you sure you want to submit this expense for approval?",
      confirmLabel: "Submit",
      variant: "success",
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await submitExpense(id);
          toast.success("Expense submitted for approval");
          loadData();
        } catch (err) {
          toast.error(err.response?.data?.message || "Submit failed");
        } finally {
          setActionLoading(false);
          closeModal();
        }
      },
    });
  };

  const handleApprove = (id, name) => {
    openModal({
      title: "Approve Expense",
      message: `Are you sure you want to approve${name ? ` the expense by ${name}` : " this expense"}?`,
      confirmLabel: "Approve",
      variant: "success",
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await approveExpense(id);
          toast.success("Expense approved successfully");
          loadData();
        } catch (err) {
          toast.error(err.response?.data?.message || "Approve failed");
        } finally {
          setActionLoading(false);
          closeModal();
        }
      },
    });
  };

  const handleReject = (id, name) => {
    openModal({
      title: "Reject Expense",
      message: `You are about to reject${name ? ` the expense by ${name}` : " this expense"}.`,
      confirmLabel: "Reject",
      variant: "danger",
      withInput: true,
      inputValue: "",
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await rejectExpense(id, modal.inputValue);
          toast.warning("Expense rejected");
          loadData();
        } catch (err) {
          toast.error(err.response?.data?.message || "Reject failed");
        } finally {
          setActionLoading(false);
          closeModal();
        }
      },
    });
  };

  const handleReimburse = (id, name) => {
    openModal({
      title: "Mark as Reimbursed",
      message: `Confirm that${name ? ` ${name}'s` : " this"} expense has been reimbursed. This action cannot be undone.`,
      confirmLabel: "Mark Reimbursed",
      variant: "success",
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await markReimbursed(id);
          toast.success("Expense marked as reimbursed");
          loadData();
        } catch (err) {
          toast.error(err.response?.data?.message || "Reimburse failed");
        } finally {
          setActionLoading(false);
          closeModal();
        }
      },
    });
  };

  const handleDelete = (id) => {
    openModal({
      title: "Delete Draft Expense",
      message: "This expense will be permanently deleted. This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await deleteExpense(id);
          toast.success("Expense deleted");
          loadData();
        } catch (err) {
          toast.error(err.response?.data?.message || "Delete failed");
        } finally {
          setActionLoading(false);
          closeModal();
        }
      },
    });
  };

  /* ===========================
     RENDER: Create Form
  =========================== */
  const renderCreateForm = (showEmployeeSelect = false, forSelf = false) => (
    <section className="expense-card">
      <h3>
        <Plus size={16} /> {forSelf ? "Submit My Expense" : "Submit Expense"}
      </h3>
      <form className="expense-form" onSubmit={(e) => handleCreate(e, forSelf)}>
        {showEmployeeSelect && employees.length > 0 ? (
          <select
            value={form.employeeId}
            onChange={(e) =>
              setForm((p) => ({ ...p, employeeId: e.target.value }))
            }
          >
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.employeeCode} - {emp.name}
              </option>
            ))}
          </select>
        ) : null}

        <input
          type="text"
          placeholder="Expense title (e.g. Client meeting cab)"
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          required
        />

        <div className="expense-form-row">
          <select
            value={form.category}
            onChange={(e) =>
              setForm((p) => ({ ...p, category: e.target.value }))
            }
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Amount (₹)"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) =>
              setForm((p) => ({ ...p, amount: e.target.value }))
            }
            required
          />
        </div>

        <div className="expense-form-row">
          <input
            type="date"
            value={form.expenseDate}
            onChange={(e) =>
              setForm((p) => ({ ...p, expenseDate: e.target.value }))
            }
            required
          />

          <div className="file-input-wrapper">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  receipt: e.target.files?.[0] || null,
                }))
              }
            />
            <small>Receipt (PDF, PNG, JPG — max 10 MB)</small>
          </div>
        </div>

        <textarea
          placeholder="Description (optional)"
          value={form.description}
          onChange={(e) =>
            setForm((p) => ({ ...p, description: e.target.value }))
          }
        />

        <div className="expense-form-row">
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={form.submitDirectly}
              onChange={(e) =>
                setForm((p) => ({ ...p, submitDirectly: e.target.checked }))
              }
              style={{ width: "auto" }}
            />
            Submit for approval immediately
          </label>
        </div>

        <button type="submit">
          {form.submitDirectly ? "Submit Expense" : "Save as Draft"}
        </button>
      </form>
    </section>
  );

  /* ===========================
     RENDER: Category Breakdown
  =========================== */
  const renderCategoryBreakdown = () => (
    <section className="expense-card">
      <h3>
        <IndianRupee size={16} /> Category Breakdown (This Month)
      </h3>
      {categoryBreakdown.length === 0 ? (
        <p className="expense-empty">No expense data this month</p>
      ) : (
        <div className="category-breakdown">
          {categoryBreakdown.map((cat) => (
            <div className="category-item" key={cat._id}>
              <span className="category-name">{cat._id}</span>
              <span>
                <span className="category-amount">
                  {formatCurrency(cat.total)}
                </span>
                <span className="category-count">({cat.count})</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  /* ===========================
     RENDER: Expense Table
  =========================== */
  const renderExpenseTable = ({
    title,
    items,
    showEmployee = false,
    showActions = false,
    actionMode = "owner",
  }) => (
    <section className="expense-card">
      <h3>{title}</h3>
      <div style={{ overflowX: "auto" }}>
        <table className="expense-table">
          <thead>
            <tr>
              {showEmployee ? <th>Employee</th> : null}
              <th>Title</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Receipt</th>
              <th>Status</th>
              {showActions ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    showEmployee
                      ? showActions ? 8 : 7
                      : showActions ? 7 : 6
                  }
                  className="expense-empty"
                >
                  No expenses found
                </td>
              </tr>
            ) : null}
            {items.map((exp) => {
              const empName = exp.employeeId?.name || null;
              return (
                <tr key={exp._id}>
                  {showEmployee ? <td>{empName || "-"}</td> : null}
                  <td>{exp.title}</td>
                  <td>{exp.category}</td>
                  <td className="amount-cell">{formatCurrency(exp.amount)}</td>
                  <td>
                    {new Date(exp.expenseDate).toLocaleDateString("en-IN")}
                  </td>
                  <td>
                    {exp.receiptPath ? (
                      <a
                        href={getReceiptUrl(exp._id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="receipt-link"
                      >
                        <ExternalLink size={12} /> View
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    <span
                      className={STATUS_CLASS[exp.status] || "expense-status"}
                    >
                      {exp.status}
                    </span>
                  </td>
                  {showActions ? (
                    <td>
                      <div className="expense-actions">
                        {/* Owner: Draft actions */}
                        {actionMode === "owner" && exp.status === "Draft" ? (
                          <>
                            <button
                              className="edit-expense-btn"
                              title="Submit for approval"
                              onClick={() => handleSubmitDraft(exp._id)}
                            >
                              <Send size={12} /> Submit
                            </button>
                            <button
                              className="delete-expense-btn"
                              title="Delete draft"
                              onClick={() => handleDelete(exp._id)}
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        ) : null}

                        {actionMode === "owner" && exp.status === "Pending" ? (
                          <span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>
                            Awaiting approval
                          </span>
                        ) : null}

                        {/* Approver: Pending actions */}
                        {actionMode === "approve" && exp.status === "Pending" ? (
                          <>
                            <button
                              className="approve-expense-btn"
                              onClick={() => handleApprove(exp._id, empName)}
                            >
                              <Check size={12} /> Approve
                            </button>
                            <button
                              className="reject-expense-btn"
                              onClick={() => handleReject(exp._id, empName)}
                            >
                              <X size={12} /> Reject
                            </button>
                          </>
                        ) : null}

                        {/* Reimburse only */}
                        {actionMode === "reimburse" && exp.status === "Approved" ? (
                          <button
                            className="reimburse-btn"
                            onClick={() => handleReimburse(exp._id, empName)}
                          >
                            <Banknote size={12} /> Reimburse
                          </button>
                        ) : null}

                        {/* Full: approve + reimburse */}
                        {actionMode === "full" && exp.status === "Pending" ? (
                          <>
                            <button
                              className="approve-expense-btn"
                              onClick={() => handleApprove(exp._id, empName)}
                            >
                              <Check size={12} /> Approve
                            </button>
                            <button
                              className="reject-expense-btn"
                              onClick={() => handleReject(exp._id, empName)}
                            >
                              <X size={12} /> Reject
                            </button>
                          </>
                        ) : null}
                        {actionMode === "full" && exp.status === "Approved" ? (
                          <button
                            className="reimburse-btn"
                            onClick={() => handleReimburse(exp._id, empName)}
                          >
                            <Banknote size={12} /> Reimburse
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );

  /* ===========================
     RENDER: My Expense Section
  =========================== */
  const renderMySection = () => {
    if (!canApplyForSelf) {
      return (
        <section className="expense-card">
          <h3>My Expenses</h3>
          <p className="expense-empty">
            Link your user account to an employee profile to submit expenses.
          </p>
        </section>
      );
    }

    return (
      <section className="expense-self-section">
        <h2 className="expense-section-heading">My Expenses</h2>
        <div className="expense-layout-grid">
          {renderCreateForm(false, true)}
          {renderCategoryBreakdown()}
        </div>
        {renderExpenseTable({
          title: "My Recent Expenses",
          items: myExpenses.slice(0, 10),
          showActions: true,
          actionMode: "owner",
        })}
      </section>
    );
  };

  /* ===========================
     ROLE VIEWS
  =========================== */
  const renderEmployeeView = () => (
    <>
      <ExpenseSummaryCards
        summary={summary}
        labels={{
          claimed: "My Claimed",
          approved: "My Approved",
          pending: "My Pending",
          reimbursed: "My Reimbursed",
        }}
      />
      {renderMySection()}
    </>
  );

  const renderManagerView = () => (
    <>
      {renderMySection()}

      <div className="expense-role-banner manager">
        <Users size={18} />
        <span>
          Team view — managing {employees.length} team member
          {employees.length === 1 ? "" : "s"}
        </span>
      </div>

      <ExpenseSummaryCards
        summary={summary}
        labels={{
          claimed: "Team Claimed",
          approved: "Team Approved",
          pending: "Team Pending",
          reimbursed: "Team Reimbursed",
        }}
      />

      <div className="expense-layout-grid">
        {renderExpenseTable({
          title: "Pending Approvals — My Team",
          items: pendingExpenses,
          showEmployee: true,
          showActions: true,
          actionMode: "approve",
        })}
        {renderCategoryBreakdown()}
      </div>

      {renderExpenseTable({
        title: "All Team Expenses",
        items: expenses,
        showEmployee: true,
      })}
    </>
  );

  const renderHRView = () => (
    <>
      {renderMySection()}

      <ExpenseSummaryCards
        summary={summary}
        labels={{
          claimed: "Org Claimed",
          approved: "Org Approved",
          pending: "Org Pending",
          reimbursed: "Org Reimbursed",
        }}
      />

      <div className="expense-layout-grid">
        {renderCreateForm(true)}
        {renderCategoryBreakdown()}
      </div>

      <div className="expense-layout-grid">
        {renderExpenseTable({
          title: "Pending Approvals — All Employees",
          items: pendingExpenses,
          showEmployee: true,
          showActions: true,
          actionMode: "full",
        })}
        {renderExpenseTable({
          title: "Approved — Awaiting Reimbursement",
          items: expenses.filter((e) => e.status === "Approved"),
          showEmployee: true,
          showActions: true,
          actionMode: "reimburse",
        })}
      </div>

      {renderExpenseTable({
        title: "All Expenses — Organization",
        items: expenses,
        showEmployee: true,
      })}
    </>
  );

  const renderOrganizationView = () => (
    <>
      <ExpenseSummaryCards summary={summary} />

      <div className="expense-layout-grid">
        {renderCreateForm(true)}
        {renderCategoryBreakdown()}
      </div>

      <div className="expense-layout-grid">
        {renderExpenseTable({
          title: "Pending Approvals",
          items: pendingExpenses,
          showEmployee: true,
          showActions: true,
          actionMode: "full",
        })}
        {renderExpenseTable({
          title: "Approved — Awaiting Reimbursement",
          items: expenses.filter((e) => e.status === "Approved"),
          showEmployee: true,
          showActions: true,
          actionMode: "reimburse",
        })}
      </div>

      {renderExpenseTable({
        title: "All Expenses",
        items: expenses,
        showEmployee: true,
      })}
    </>
  );

  const roleViews = {
    Organization: renderOrganizationView,
    HR: renderHRView,
    Manager: renderManagerView,
    Employee: renderEmployeeView,
  };

  /* ===========================
     PAGE RENDER
  =========================== */
  return (
    <MainLayout>
      <div className="expense-page">
        <div className="expense-view-toolbar">
          <div className="expense-view-toolbar-text">
            <h1>Expenses</h1>
            <p>{ROLE_DESCRIPTIONS[viewRole]}</p>
          </div>
        </div>

        {error ? <p className="expense-error">{error}</p> : null}

        {loading && !dashboard ? (
          <p className="expense-empty">Loading expense data...</p>
        ) : (
          roleViews[viewRole]?.()
        )}

        {/* Confirmation Modal */}
        <ConfirmModal
          open={modal.open}
          title={modal.title}
          message={modal.message}
          confirmLabel={modal.confirmLabel}
          variant={modal.variant}
          loading={actionLoading}
          onConfirm={modal.onConfirm}
          onCancel={closeModal}
          /* Rejection reason textarea */
          inputLabel={modal.withInput ? "Reason for rejection (optional)" : undefined}
          inputValue={modal.inputValue}
          onInputChange={(val) => setModal((m) => ({ ...m, inputValue: val }))}
          inputPlaceholder="Enter a reason..."
        />
      </div>
    </MainLayout>
  );
}

/* ===========================
   PAGE EXPORT — wrapped in ToastProvider
=========================== */
function Expense() {
  return (
    <ToastProvider>
      <ExpenseInner />
    </ToastProvider>
  );
}

export default Expense;
