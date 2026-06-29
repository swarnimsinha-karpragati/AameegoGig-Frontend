import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Clock3,
  Home,
  UserCheck2,
  Check,
  X,
  Plus,
  Download,
  Users,
  ShieldCheck,
} from "lucide-react";
import MainLayout from "../layouts/MainLayout";
import ConfirmModal from "../components/ConfirmModal";
import { ToastProvider, useToast } from "../components/Toast";
import { getEmployees } from "../services/employeeService";
import {
  approveLeaveRequest,
  cancelLeaveRequest,
  createLeaveRequest,
  getLeaveBalances,
  getLeaveDashboard,
  getLeaveRequests,
  rejectLeaveRequest,
  updateLeaveBalances,
} from "../services/leaveService";
import {
  getLeaveViewKey,
  getStoredUser,
  canMarkAttendance as roleCanManageLeaveRequests,
  canEditLeaveBalances,
  hasLinkedEmployeeProfile,
} from "../utils/roles";
import "./Leave.css";

const ROLE_DESCRIPTIONS = {
  Organization: "Organization-wide leave overview and management",
  HR: "HR leave policies, balances, and org-wide approvals",
  Manager: "Review and approve leave requests for your team",
  Employee: "Apply for leave and track your personal balance",
};

const leaveStatusClass = {
  Approved: "leave-status approved",
  Pending: "leave-status pending",
  Rejected: "leave-status rejected",
  Cancelled: "leave-status cancelled",
};

function LeaveSummaryCards({ summary, labels }) {
  const cards = [
    {
      key: "wfh",
      icon: Home,
      iconClass: "blue",
      value: summary.wfhDaysThisMonth || 0,
      label: labels?.wfh || "WFH Days (This Month)",
    },
    {
      key: "leave",
      icon: Calendar,
      iconClass: "green",
      value: summary.leaveDaysThisMonth || 0,
      label: labels?.leave || "Leave Days (This Month)",
    },
    {
      key: "pending",
      icon: Clock3,
      iconClass: "amber",
      value: summary.pendingRequests || 0,
      label: labels?.pending || "Pending Requests",
    },
    {
      key: "balance",
      icon: UserCheck2,
      iconClass: "purple",
      value: summary.totalBalance || 0,
      label: labels?.balance || "Total Balance",
    },
  ];

  return (
    <div className="leave-summary-grid">
      {cards.map(({ key, icon: Icon, iconClass, value, label }) => (
        <article key={key} className="leave-summary-card">
          <div className={`leave-icon ${iconClass}`}>
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
function LeaveInner() {
  const toast = useToast();
  const user = getStoredUser();
  const viewRole = getLeaveViewKey(user?.role);

  const [dashboard, setDashboard] = useState(null);
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedBalanceEmployee, setSelectedBalanceEmployee] = useState("");
  const [balanceForm, setBalanceForm] = useState({
    CL: { total: "", used: "" },
    SL: { total: "", used: "" },
    EL: { total: "", used: "" },
    CO: { total: "", used: "" },
  });

  const [leaveForm, setLeaveForm] = useState({
    employeeId: "",
    leaveType: "CL",
    requestType: "Leave",
    startDate: "",
    endDate: "",
    reason: "",
  });

  /* ── Confirm modal ── */
  const [modal, setModal] = useState({
    open: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    variant: "danger",
    onConfirm: null,
  });

  const closeModal = () => setModal((m) => ({ ...m, open: false }));
  const openModal = (config) => setModal({ open: true, ...config });

  const canManageLeave = roleCanManageLeaveRequests(user?.role);
  const canApprove = canManageLeave;
  const canEditBalances = canEditLeaveBalances(user?.role);
  const canApplyForSelf = hasLinkedEmployeeProfile(user);

  const summary = dashboard?.summary || {};
  const upcoming = useMemo(
    () => dashboard?.upcoming || [],
    [dashboard?.upcoming]
  );
  const pendingApprovals = dashboard?.pendingApprovals || [];

  const matchesUser = useCallback(
    (item) => {
      const itemEmpId = item.employeeId?._id || item.employeeId;
      if (
        user?.employeeId &&
        itemEmpId &&
        String(itemEmpId) === String(user.employeeId)
      ) {
        return true;
      }
      const empName = item.employeeId?.name?.toLowerCase?.();
      return empName && empName === user?.name?.toLowerCase?.();
    },
    [user?.employeeId, user?.name]
  );

  const myRequests = useMemo(() => {
    const filtered = requests.filter(matchesUser);
    return filtered.length > 0 ? filtered : requests.slice(0, 3);
  }, [requests, matchesUser]);

  const myRecentRequests = useMemo(() => myRequests.slice(0, 6), [myRequests]);

  const myUpcoming = useMemo(() => {
    const filtered = upcoming.filter(matchesUser);
    return filtered.length > 0 ? filtered : upcoming.slice(0, 2);
  }, [upcoming, matchesUser]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [dashRes, reqRes, balRes] = await Promise.all([
        getLeaveDashboard(),
        getLeaveRequests(),
        getLeaveBalances(),
      ]);
      setDashboard(dashRes);
      setRequests(reqRes.requests || []);
      setBalances(Array.isArray(balRes.balances) ? balRes.balances : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load leave data");
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    if (!canManageLeave) return;
    try {
      const res = await getEmployees();
      const list = res.data?.employees || [];
      setEmployees(list);
      if (!leaveForm.employeeId && list.length > 0) {
        setLeaveForm((prev) => ({ ...prev, employeeId: list[0]._id }));
      }
      if (!selectedBalanceEmployee && list.length > 0) {
        setSelectedBalanceEmployee(list[0]._id);
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

  useEffect(() => {
    const selected = balances.find(
      (b) => b.employeeId === selectedBalanceEmployee
    );
    if (!selected) return;
    const nextForm = {};
    selected.balances.forEach((item) => {
      nextForm[item.type] = { total: item.total, used: item.used };
    });
    setBalanceForm((prev) => ({ ...prev, ...nextForm }));
  }, [balances, selectedBalanceEmployee]);

  /* ── Handlers ── */
  const handleCreateRequest = async (e, forSelf = false) => {
    e.preventDefault();
    try {
      const payload = { ...leaveForm };
      if (forSelf || !canManageLeave || user?.role === "Employee") {
        delete payload.employeeId;
      }
      await createLeaveRequest(payload);
      toast.success("Leave request submitted successfully");
      setLeaveForm((prev) => ({
        ...prev,
        leaveType: "CL",
        requestType: "Leave",
        startDate: "",
        endDate: "",
        reason: "",
      }));
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit request");
    }
  };

  const handleDecision = (id, action, employeeName) => {
    const isApprove = action === "approve";
    openModal({
      title: isApprove ? "Approve Leave Request" : "Reject Leave Request",
      message: isApprove
        ? `Are you sure you want to approve${employeeName ? ` ${employeeName}'s` : " this"} leave request?`
        : `Are you sure you want to reject${employeeName ? ` ${employeeName}'s` : " this"} leave request?`,
      confirmLabel: isApprove ? "Approve" : "Reject",
      variant: isApprove ? "success" : "danger",
      onConfirm: async () => {
        setActionLoading(true);
        try {
          if (isApprove) {
            await approveLeaveRequest(id);
            toast.success("Leave request approved");
          } else {
            await rejectLeaveRequest(id);
            toast.warning("Leave request rejected");
          }
          loadData();
        } catch (err) {
          toast.error(err.response?.data?.message || "Action failed");
        } finally {
          setActionLoading(false);
          closeModal();
        }
      },
    });
  };

  const handleCancel = (id) => {
    openModal({
      title: "Cancel Leave Request",
      message:
        "Are you sure you want to cancel this leave request? This action cannot be undone.",
      confirmLabel: "Cancel Request",
      variant: "warning",
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await cancelLeaveRequest(id);
          toast.success("Leave request cancelled");
          loadData();
        } catch (err) {
          toast.error(err.response?.data?.message || "Cancel failed");
        } finally {
          setActionLoading(false);
          closeModal();
        }
      },
    });
  };

  const handleSaveBalances = async (e) => {
    e.preventDefault();
    if (!selectedBalanceEmployee) return;
    try {
      await updateLeaveBalances(selectedBalanceEmployee, {
        CL: {
          total: Number(balanceForm.CL.total),
          used: Number(balanceForm.CL.used),
        },
        SL: {
          total: Number(balanceForm.SL.total),
          used: Number(balanceForm.SL.used),
        },
        EL: {
          total: Number(balanceForm.EL.total),
          used: Number(balanceForm.EL.used),
        },
        CO: {
          total: Number(balanceForm.CO.total),
          used: Number(balanceForm.CO.used),
        },
      });
      toast.success("Leave balances updated");
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to save balances");
    }
  };

  /* ── Renders ── */
  const renderCreateRequestForm = (
    employeeList,
    showEmployeeSelect,
    forSelf = false
  ) => (
    <section className="leave-card">
      <h3>
        <Plus size={16} />{" "}
        {forSelf ? "Apply for My Leave" : "Create Request"}
      </h3>
      <form
        className="leave-request-form"
        onSubmit={(e) => handleCreateRequest(e, forSelf)}
      >
        {showEmployeeSelect ? (
          <select
            value={leaveForm.employeeId}
            onChange={(e) =>
              setLeaveForm((p) => ({ ...p, employeeId: e.target.value }))
            }
          >
            {employeeList.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.employeeCode} - {emp.name}
              </option>
            ))}
          </select>
        ) : null}
        <select
          value={leaveForm.requestType}
          onChange={(e) =>
            setLeaveForm((p) => ({ ...p, requestType: e.target.value }))
          }
        >
          <option value="Leave">Leave</option>
          <option value="WFH">WFH</option>
        </select>
        <select
          value={leaveForm.leaveType}
          onChange={(e) =>
            setLeaveForm((p) => ({ ...p, leaveType: e.target.value }))
          }
        >
          <option value="CL">Casual Leave (CL)</option>
          <option value="SL">Sick Leave (SL)</option>
          <option value="EL">Earned Leave (EL)</option>
          <option value="CO">Comp Off (CO)</option>
          <option value="LOP">Loss of Pay (LOP)</option>
          <option value="LWP">Leave Without Pay (LWP)</option>
          <option value="WFH">WFH</option>
        </select>
        <input
          type="date"
          value={leaveForm.startDate}
          onChange={(e) =>
            setLeaveForm((p) => ({ ...p, startDate: e.target.value }))
          }
          required
        />
        <input
          type="date"
          value={leaveForm.endDate}
          onChange={(e) =>
            setLeaveForm((p) => ({ ...p, endDate: e.target.value }))
          }
          required
        />
        <input
          type="text"
          placeholder="Reason"
          value={leaveForm.reason}
          onChange={(e) =>
            setLeaveForm((p) => ({ ...p, reason: e.target.value }))
          }
        />
        <button type="submit">Submit Request</button>
      </form>
    </section>
  );

  const renderUpcomingList = (items, emptyText = "No upcoming schedule") => (
    <section className="leave-card">
      <h3>Upcoming (Next 7 Days)</h3>
      <div className="leave-list">
        {items.length === 0 ? (
          <p className="leave-empty">{emptyText}</p>
        ) : null}
        {items.map((item) => (
          <div className="leave-list-item" key={item._id}>
            <div>
              <strong>{item.employeeId?.name}</strong>
              <p>
                {item.leaveType} •{" "}
                {new Date(item.startDate).toLocaleDateString()} -{" "}
                {new Date(item.endDate).toLocaleDateString()}
              </p>
            </div>
            <span className={leaveStatusClass[item.status] || "leave-status"}>
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );

  const renderRequestsTable = ({ title, items, mode }) => (
    <section className="leave-card">
      <h3>{title}</h3>
      <table className="leave-table">
        <thead>
          <tr>
            {mode === "all" ? <th>Employee</th> : null}
            <th>Type</th>
            <th>Date / Duration</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={mode === "all" ? 6 : 5} className="leave-empty">
                No requests found
              </td>
            </tr>
          ) : null}
          {items.map((item) => {
            const empName = item.employeeId?.name || null;
            return (
              <tr key={item._id}>
                {mode === "all" ? <td>{empName || "-"}</td> : null}
                <td>{item.leaveType}</td>
                <td>
                  {new Date(item.startDate).toLocaleDateString()} -{" "}
                  {new Date(item.endDate).toLocaleDateString()} ({item.days}d)
                </td>
                <td>{item.reason || "-"}</td>
                <td>
                  <span
                    className={leaveStatusClass[item.status] || "leave-status"}
                  >
                    {item.status}
                  </span>
                </td>
                <td>
                  {mode === "approve" &&
                  canApprove &&
                  item.status === "Pending" ? (
                    <div className="leave-actions">
                      <button
                        type="button"
                        className="approve-btn"
                        onClick={() =>
                          handleDecision(item._id, "approve", empName)
                        }
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        className="reject-btn"
                        onClick={() =>
                          handleDecision(item._id, "reject", empName)
                        }
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : mode === "employee" && item.status === "Pending" ? (
                    <button
                      type="button"
                      id='leave-cancel-btn'
                      className="leave-cancel-btn"
                      onClick={() => handleCancel(item._id)}
                    >
                      Cancel
                    </button>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );

  const renderBalanceEditor = (balanceList, readOnly = false) => (
    <section className="leave-card">
      <h3>
        {readOnly || !canEditBalances
          ? "Team Leave Balances"
          : "Manage Leave Balances"}
      </h3>
      {readOnly || !canEditBalances ? (
        <div className="leave-balance-list">
          {balanceList.length === 0 ? (
            <p className="leave-empty">No balance records found</p>
          ) : (
            balanceList.map((b) => (
              <div key={b.employeeId} className="leave-team-balance-group">
                <strong className="leave-team-balance-name">
                  {b.employeeCode} — {b.name}
                </strong>
                {(b.balances || []).map((item) => (
                  <div
                    className="leave-balance-item"
                    key={`${b.employeeId}-${item.type}`}
                  >
                    <span>{item.type}</span>
                    <strong>
                      {item.total - item.used} / {item.total}
                    </strong>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      ) : (
        <form className="balance-editor" onSubmit={handleSaveBalances}>
          <select
            value={selectedBalanceEmployee}
            onChange={(e) => setSelectedBalanceEmployee(e.target.value)}
          >
            {balanceList.map((b) => (
              <option key={b.employeeId} value={b.employeeId}>
                {b.employeeCode} - {b.name}
              </option>
            ))}
          </select>
          {["CL", "SL", "EL", "CO"].map((type) => (
            <div key={type} className="balance-row">
              <label>{type}</label>
              <input
                type="number"
                placeholder="Total"
                value={balanceForm[type]?.total ?? ""}
                onChange={(e) =>
                  setBalanceForm((prev) => ({
                    ...prev,
                    [type]: { ...prev[type], total: e.target.value },
                  }))
                }
              />
              <input
                type="number"
                placeholder="Used"
                value={balanceForm[type]?.used ?? ""}
                onChange={(e) =>
                  setBalanceForm((prev) => ({
                    ...prev,
                    [type]: { ...prev[type], used: e.target.value },
                  }))
                }
              />
            </div>
          ))}
          <button type="submit">Save Balances</button>
        </form>
      )}
    </section>
  );

  const renderPersonalBalances = () => (
    <section className="leave-card">
      <h3>My Leave Balances</h3>
      <div className="leave-balance-list">
        {(dashboard?.balances || []).length === 0 ? (
          <p className="leave-empty">No balance data available</p>
        ) : (
          (dashboard?.balances || []).map((b) => (
            <div className="leave-balance-item" key={b.type}>
              <span>{b.label}</span>
              <strong>
                {b.remaining} / {b.total}
              </strong>
            </div>
          ))
        )}
      </div>
    </section>
  );

  const renderMyLeaveSection = () => {
    if (!canApplyForSelf) {
      return (
        <section className="leave-card leave-self-notice">
          <h3>My Leave</h3>
          <p className="leave-empty">
            Link your user account to an employee profile to apply for leave and
            view your personal balances.
          </p>
        </section>
      );
    }

    return (
      <section className="leave-self-section">
        <h2 className="leave-section-heading">My Leave</h2>
        <div className="leave-layout-grid">
          {renderCreateRequestForm([], false, true)}
          {renderPersonalBalances()}
        </div>
        {renderRequestsTable({
          title: "My Recent Requests",
          items: myRecentRequests,
          mode: "employee",
        })}
        {renderUpcomingList(myUpcoming, "You have no upcoming leave")}
      </section>
    );
  };

  const renderAllRequestsTable = (items, title = "All Requests") => (
    <section className="leave-card">
      <h3>{title}</h3>
      <table className="leave-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Type</th>
            <th>Dates</th>
            <th>Days</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {!loading && items.length === 0 ? (
            <tr>
              <td colSpan={5} className="leave-empty">
                No requests found
              </td>
            </tr>
          ) : null}
          {items.map((item) => (
            <tr key={item._id}>
              <td>{item.employeeId?.name || "-"}</td>
              <td>{item.leaveType}</td>
              <td>
                {new Date(item.startDate).toLocaleDateString()} -{" "}
                {new Date(item.endDate).toLocaleDateString()}
              </td>
              <td>{item.days}</td>
              <td>
                <span
                  className={leaveStatusClass[item.status] || "leave-status"}
                >
                  {item.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );

  /* ── Role views ── */
  const renderOrganizationView = () => (
    <>
      <LeaveSummaryCards summary={summary} />
      <div className="leave-layout-grid">
        {renderCreateRequestForm(employees, true)}
        {renderUpcomingList(upcoming)}
      </div>
      <div className="leave-layout-grid">
        {renderRequestsTable({
          title: "Pending Approvals",
          items: pendingApprovals,
          mode: "approve",
        })}
        {renderBalanceEditor(balances, false)}
      </div>
      {renderAllRequestsTable(requests)}
    </>
  );

  const renderHRView = () => (
    <>
      {renderMyLeaveSection()}
      <div className="leave-hr-actions">
        <button type="button" className="leave-hr-btn">
          <ShieldCheck size={16} />
          Leave Policy Settings
        </button>
        <button type="button" className="leave-hr-btn secondary">
          <Download size={16} />
          Export Leave Report
        </button>
      </div>
      <LeaveSummaryCards
        summary={summary}
        labels={{
          wfh: "WFH Days (Org)",
          leave: "Leave Days (Org)",
          pending: "Pending (Org)",
          balance: "Total Balance (Org)",
        }}
      />
      <div className="leave-layout-grid">
        {renderCreateRequestForm(employees, true)}
        {renderUpcomingList(upcoming, "No org-wide upcoming leave")}
      </div>
      <div className="leave-layout-grid">
        {renderRequestsTable({
          title: "Pending Approvals — All Employees",
          items: pendingApprovals,
          mode: "approve",
        })}
        {renderBalanceEditor(balances, false)}
      </div>
      {renderAllRequestsTable(requests, "All Requests — Organization")}
    </>
  );

  const renderManagerView = () => (
    <>
      {renderMyLeaveSection()}
      <div className="leave-role-banner manager">
        <Users size={18} />
        <span>
          Team view — managing {employees.length} team member
          {employees.length === 1 ? "" : "s"}
        </span>
      </div>
      <LeaveSummaryCards
        summary={summary}
        labels={{
          wfh: "Team WFH Days",
          leave: "Team Leave Days",
          pending: "Team Pending",
          balance: "Team Balance",
        }}
      />
      <div className="leave-layout-grid">
        {renderCreateRequestForm(employees, true)}
        {renderUpcomingList(upcoming, "No upcoming team leave")}
      </div>
      <div className="leave-layout-grid">
        {renderRequestsTable({
          title: "Pending Approvals — My Team",
          items: pendingApprovals,
          mode: "approve",
        })}
        {renderBalanceEditor(balances, true)}
      </div>
      {renderAllRequestsTable(requests, "Team Requests")}
    </>
  );

  const renderEmployeeView = () => (
    <>
      <LeaveSummaryCards
        summary={summary}
        labels={{
          wfh: "My WFH Days",
          leave: "My Leave Days",
          pending: "My Pending",
          balance: "My Balance",
        }}
      />
      {renderMyLeaveSection()}
    </>
  );

  const roleViews = {
    Organization: renderOrganizationView,
    HR: renderHRView,
    Manager: renderManagerView,
    Employee: renderEmployeeView,
  };

  return (
    <MainLayout>
      <div className="leave-page">
        <div className="leave-view-toolbar">
          <div className="leave-view-toolbar-text">
            <h1>Leave</h1>
            <p>{ROLE_DESCRIPTIONS[viewRole]}</p>
          </div>
        </div>

        {error ? <p className="leave-error">{error}</p> : null}

        {roleViews[viewRole]?.()}

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
        />
      </div>
    </MainLayout>
  );
}

/* ===========================
   PAGE EXPORT — wrapped in ToastProvider
=========================== */
function Leave() {
  return (
    <ToastProvider>
      <LeaveInner />
    </ToastProvider>
  );
}

export default Leave;
