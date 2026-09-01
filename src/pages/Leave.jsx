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
  Info
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import ConfirmModal from "../components/ConfirmModal";
import { ToastProvider, useToast } from "../components/Toast";
import { getEmployees } from "../services/employeeService";
import SearchableEmployeeSelectServer from "../components/attendance/SearchableEmployeeSelectServer";
import {
  approveLeaveRequest,
  cancelLeaveRequest,
  createLeaveRequest,
  createLeaveRequestMultipart,
  getLeaveBalances,
  getLeaveDashboard,
  getLeavePolicy,
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
import Button from "../components/Button";
import Card from "../components/Card";

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
      iconClassName: "blue",
      value: summary.wfhDaysThisMonth || 0,
      label: labels?.wfh || "WFH Days (This Month)",
    },
    {
      key: "leave",
      icon: Calendar,
      iconClassName: "green",
      value: summary.leaveDaysThisMonth || 0,
      label: labels?.leave || "Leave Days (This Month)",
    },
    {
      key: "pending",
      icon: Clock3,
      iconClassName: "orange",
      value: summary.pendingRequests || 0,
      label: labels?.pending || "Pending Requests",
    },
    {
      key: "balance",
      icon: UserCheck2,
      iconClassName: "purple",
      value: summary.totalBalance || 0,
      label: labels?.balance || "Total Balance",
    },
  ];

  return (
    <div className="payroll-stats-grid">
      {cards.map(({ key, icon: Icon, iconClassName, value, label }) => (
        <Card
          key={key}
          icon={<Icon size={22} strokeWidth={2} />}
          iconClassName={iconClassName}
          isInteractive
        >
          <Card.Header>{label}</Card.Header>
          <Card.Body>{value}</Card.Body>
        </Card>
      ))}
    </div>
  );
}

/* ===========================
   INNER COMPONENT (uses useToast)
=========================== */
function LeaveInner() {
  const toast = useToast();
  const navigate = useNavigate();
  const { vendor } = useParams();
  const user = getStoredUser();
  const viewRole = getLeaveViewKey(user?.role);

  const [dashboard, setDashboard] = useState(null);
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState([]);
  const [leavePolicy, setLeavePolicy] = useState(null);
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

  const [medicalDocFile, setMedicalDocFile] = useState(null);

  const countWeekdaysInclusiveClient = (startStr, endStr) => {
    if (!startStr || !endStr) return null;
    const start = new Date(`${startStr}T00:00:00`);
    const end = new Date(`${endStr}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    if (end < start) return null;

    let count = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay(); // 0=Sun, 6=Sat
      if (day !== 0 && day !== 6) count += 1;
    }
    return count;
  };

  const slRequiredWhenDaysGt = useMemo(() => {
    const sl = leavePolicy?.types?.find((t) => t?.code === "SL");
    return sl?.documents?.requiredWhenDaysGt ?? null;
  }, [leavePolicy]);

  const computedLeaveDays = useMemo(
    () => countWeekdaysInclusiveClient(leaveForm.startDate, leaveForm.endDate),
    [leaveForm.startDate, leaveForm.endDate]
  );

  const isMedicalDocRequired =
    leaveForm.leaveType === "SL" &&
    slRequiredWhenDaysGt != null &&
    computedLeaveDays != null &&
    computedLeaveDays > slRequiredWhenDaysGt;

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

  const canManageLeave =
    roleCanManageLeaveRequests(user?.role) || dashboard?.scope === "team";
  const canApprove = canManageLeave;
  const canEditBalances = canEditLeaveBalances(user?.role);
  const canApplyForSelf = hasLinkedEmployeeProfile(user);
  const canConfigurePolicy = user?.role === "Admin" || user?.role === "HR";

  const summary = dashboard?.summary || {};
  const selfSummary = dashboard?.selfSummary || summary;
  const teamSummary = dashboard?.teamSummary || summary;
  const orgSummary = dashboard?.orgSummary || summary;
  const upcoming = useMemo(
    () => dashboard?.upcoming || [],
    [dashboard?.upcoming]
  );
  const pendingApprovals = dashboard?.pendingApprovals || [];

  const teamMembers = useMemo(() => {
    if (!user?.employeeId) return employees;
    const userEmpId =
      typeof user?.employeeId === "object"
        ? user?.employeeId?._id
        : user?.employeeId;
    return employees.filter(
      (emp) => String(emp._id) !== String(userEmpId)
    );
  }, [employees, user?.employeeId]);

  const matchesUser = useCallback(
    (item) => {
      const itemEmpId = item.employeeId?._id || item.employeeId;
      const userEmpId =
        typeof user?.employeeId === "object"
          ? user?.employeeId?._id
          : user?.employeeId;

      if (
        userEmpId &&
        itemEmpId &&
        String(itemEmpId) === String(userEmpId)
      ) {
        return true;
      }
      const empName = item.employeeId?.name?.toLowerCase?.();
      return Boolean(
        empName && user?.name && empName === user?.name?.toLowerCase?.()
      );
    },
    [user?.employeeId, user?.name]
  );

  const myRequests = useMemo(() => {
    return requests.filter(matchesUser);
  }, [requests, matchesUser]);

  const teamRequests = useMemo(() => {
    return requests.filter((item) => !matchesUser(item));
  }, [requests, matchesUser]);

  const myRecentRequests = useMemo(() => myRequests.slice(0, 6), [myRequests]);

  const myUpcoming = useMemo(() => {
    return upcoming.filter(matchesUser);
  }, [upcoming, matchesUser]);

  const leaveTypeOptions = useMemo(() => {
    const fallback = [
      { code: "CL", label: "Casual Leave (CL)" },
      { code: "SL", label: "Sick Leave (SL)" },
      { code: "EL", label: "Earned Leave (EL)" },
      { code: "CO", label: "Comp Off (CO)" },
      { code: "LOP", label: "Loss of Pay (LOP)" },
      { code: "LWP", label: "Leave Without Pay (LWP)" },
      { code: "WFH", label: "WFH" },
    ];

    if (!leavePolicy?.types?.length) return fallback;
    const enabled = leavePolicy.types.filter((t) => t?.enabled);
    if (!enabled.length) return fallback;
    return enabled.map((t) => ({
      code: t.code,
      label: t.name || t.code,
    }));
  }, [leavePolicy]);

  const leaveBalanceTypes = useMemo(() => {
    const enabled = leavePolicy?.types
      ?.filter((t) => t?.enabled && t?.hasBalance)
      ?.map((t) => t.code);
    if (!enabled || enabled.length === 0) return ["CL", "SL", "EL", "CO"];
    return enabled;
  }, [leavePolicy]);

  const dateValidationError = useMemo(() => {
    if (!leaveForm.startDate || !leaveForm.endDate) return null;
    if (computedLeaveDays == null) return "End date must be on or after start date";
    return null;
  }, [leaveForm.startDate, leaveForm.endDate, computedLeaveDays]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [dashResult, reqResult, balResult, policyResult] =
        await Promise.allSettled([
          getLeaveDashboard(),
          getLeaveRequests(),
          getLeaveBalances(),
          getLeavePolicy(),
        ]);

      if (dashResult.status === "rejected") {
        throw dashResult.reason;
      }
      if (reqResult.status === "rejected") {
        throw reqResult.reason;
      }

      setDashboard(dashResult.value);
      setRequests(reqResult.value.requests || []);

      if (policyResult.status === "fulfilled") {
        const pol = policyResult.value.policy || policyResult.value;
        setLeavePolicy(pol || null);

        const enabledCodes = (pol?.types || [])
          .filter((t) => t?.enabled)
          .map((t) => t.code);

        const desiredLeaveType = enabledCodes.includes("CL")
          ? "CL"
          : enabledCodes[0] || "CL";

        setLeaveForm((prev) => ({
          ...prev,
          leaveType: desiredLeaveType,
          requestType: desiredLeaveType === "WFH" ? "WFH" : "Leave",
        }));
      }

      if (balResult.status === "fulfilled") {
        const balRes = balResult.value;
        setBalances(Array.isArray(balRes.balances) ? balRes.balances : []);
      } else {
        setBalances([]);
        const balanceMessage =
          balResult.reason?.response?.data?.message ||
          balResult.reason?.message;
        if (balanceMessage && balanceMessage !== "Route not found") {
          console.warn("Leave balances unavailable:", balanceMessage);
        }
      }
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
      if (isMedicalDocRequired && !medicalDocFile) {
        toast.error(
          `Medical document is required for SL when days exceed ${slRequiredWhenDaysGt}`
        );
        return;
      }

      const payload = { ...leaveForm };
      if (forSelf || !canManageLeave || user?.role === "Employee") {
        delete payload.employeeId;
      }

      if (payload.leaveType === "SL" && medicalDocFile) {
        const formData = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (v !== undefined && v !== null) formData.append(k, v);
        });
        formData.append("file", medicalDocFile);
        await createLeaveRequestMultipart(formData);
      } else {
        await createLeaveRequest(payload);
      }

      toast.success("Leave request submitted successfully");
      setLeaveForm((prev) => ({
        ...prev,
        leaveType:
          leavePolicy?.types?.some((t) => t?.enabled && t?.code === "CL") ? "CL" : (leavePolicy?.types || []).find((t) => t?.enabled)?.code || "CL",
        requestType:
          (leavePolicy?.types || []).find((t) => t?.enabled)?.code === "WFH"
            ? "WFH"
            : "Leave",
        startDate: "",
        endDate: "",
        reason: "",
      }));
      setMedicalDocFile(null);
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

  const handleCancel = (item) => {
    let cancelReasonInput = "";

    openModal({
      title: "Cancel Leave Request",
      message: (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <p>
            Are you sure you want to cancel this leave request? This action cannot be undone.
          </p>
          {item.status === "Approved" && (
            <div style={{ marginTop: "10px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>
                Cancellation Reason <span style={{ color: "red" }}>*</span>
              </label>
              <textarea
                className="leave-input"
                rows={3}
                placeholder="Enter reason for cancelling..."
                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
                onChange={(e) => {
                  cancelReasonInput = e.target.value;
                }}
              />
            </div>
          )}
        </div>
      ),
      confirmLabel: "Cancel Request",
      variant: "warning",
      onConfirm: async () => {
        if (item.status === "Approved" && !cancelReasonInput.trim()) {
          toast.error("Please provide a reason for cancelling");
          return;
        }

        setActionLoading(true);
        try {
          await cancelLeaveRequest(item._id, { cancelReason: cancelReasonInput.trim() });
          toast.success("Leave request cancelled successfully");
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
      const payload = {};
      // Backend currently understands legacy keys (CL/SL/EL/CO), but this
      // UI now renders based on enabled policy balance types.
      leaveBalanceTypes.forEach((code) => {
        if (!["CL", "SL", "EL", "CO"].includes(code)) return;
        if (!balanceForm?.[code]) return;
        payload[code] = {
          total: Number(balanceForm[code].total),
          used: Number(balanceForm[code].used),
        };
      });

      await updateLeaveBalances(selectedBalanceEmployee, payload);
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
    <section className="leave-panel leave-glass">
      <header className="leave-panel__head">
        <h3>
          <Plus size={16} />
          {forSelf ? "Apply for My Leave" : "Create Request"}
        </h3>
      </header>
      <form
        className="leave-form-grid"
        onSubmit={(e) => handleCreateRequest(e, forSelf)}
      >
        {showEmployeeSelect ? (
          <div className="leave-field leave-field--wide">
            <label htmlFor="leave-employee">Employee</label>
            <SearchableEmployeeSelectServer
              value={leaveForm.employeeId}
              onChange={(empId) => setLeaveForm((p) => ({ ...p, employeeId: empId }))}
              controlClassName="leave-control"
            />
          </div>
        ) : null}
        <div className="leave-field">
          <label htmlFor="leave-request-type">Request Type</label>
          <select
            id="leave-request-type"
            className="leave-control"
            value={leaveForm.requestType}
            onChange={(e) =>
              setLeaveForm((p) => ({ ...p, requestType: e.target.value }))
            }
          >
            <option value="Leave">Leave</option>
            <option value="WFH">WFH</option>
          </select>
        </div>
        <div className="leave-field">
          <label htmlFor="leave-type">Leave Type</label>
          <select
            id="leave-type"
            className="leave-control"
            value={leaveForm.leaveType}
            onChange={(e) => {
              const next = e.target.value;
              setLeaveForm((p) => ({
                ...p,
                leaveType: next,
                requestType: next === "WFH" ? "WFH" : "Leave",
              }));
              if (next !== "SL") setMedicalDocFile(null);
            }}
          >
            {leaveTypeOptions.map((opt) => (
              <option value={opt.code} key={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {leaveForm.leaveType === "SL" ? (
          <div className="leave-field">
            <label htmlFor="leave-medical-doc">
              Medical Doc (required for SL &gt; 1 day)
            </label>
            <input
              id="leave-medical-doc"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              className="leave-control"
              onChange={(e) => setMedicalDocFile(e.target.files?.[0] || null)}
            />
            {slRequiredWhenDaysGt != null ? (
              <p className="leave-upload-hint">
                Required only when your SL days &gt; {slRequiredWhenDaysGt}.{" "}
                {computedLeaveDays != null ? (
                  <>You selected: <strong>{computedLeaveDays} day(s)</strong>.</>
                ) : null}
              </p>
            ) : null}
            {medicalDocFile ? (
              <p className="leave-upload-hint">
                Selected: <strong>{medicalDocFile.name}</strong>
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="leave-field">
          <label htmlFor="leave-start">Start Date</label>
          <input
            id="leave-start"
            type="date"
            className="leave-control"
            value={leaveForm.startDate}
            onChange={(e) =>
              setLeaveForm((p) => ({ ...p, startDate: e.target.value }))
            }
            required
          />
        </div>
        <div className="leave-field">
          <label htmlFor="leave-end">End Date</label>
          <input
            id="leave-end"
            type="date"
            className="leave-control"
            value={leaveForm.endDate}
            onChange={(e) =>
              setLeaveForm((p) => ({ ...p, endDate: e.target.value }))
            }
            required
          />
        </div>
        <div className="leave-field leave-field--full">
          <label htmlFor="leave-reason">Reason</label>
          <input
            id="leave-reason"
            type="text"
            className="leave-control"
            placeholder="Optional reason for leave"
            value={leaveForm.reason}
            onChange={(e) =>
              setLeaveForm((p) => ({ ...p, reason: e.target.value }))
            }
          />
        </div>
        {dateValidationError ? (
          <p className="leave-upload-hint" style={{ color: "#b42318" }}>
            {dateValidationError}
          </p>
        ) : null}
        <div className="leave-form-actions">
          <Button
            type="submit"
            disabled={Boolean(dateValidationError) || (isMedicalDocRequired && !medicalDocFile)}
          >
            Submit Request
          </Button>
        </div>
      </form>
    </section>
  );

  const renderUpcomingList = (items, emptyText = "No upcoming schedule") => (
    <section className="leave-panel leave-glass">
      <header className="leave-panel__head">
        <h3>Upcoming (Next 7 Days)</h3>
      </header>
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

  const renderRequestsTable = ({ title, items, mode }) => {
    const totalColumns = mode === "all" || mode === "approve" ? 6 : 5;

    return (
      <section className="leave-panel leave-glass">
        <header className="leave-panel__head">
          <h3>{title}</h3>
        </header>
        <div className="leave-table-wrap">
          <table className="leave-table">
            <thead>
              <tr>
                {mode === "all" || mode === "approve" ? <th>Employee</th> : null}
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
                  <td colSpan={totalColumns} className="leave-empty">
                    No requests found
                  </td>
                </tr>
              ) : null}
              {items.map((item) => {
                const empName = item.employeeId?.name || null;
                return (
                  <tr key={item._id}>
                    {mode === "all" || mode === "approve" ? (
                      <td>{empName || "-"}</td>
                    ) : null}
                    <td>{item.leaveType}</td>
                    <td>
                      {new Date(item.startDate).toLocaleDateString()} -{" "}
                      {new Date(item.endDate).toLocaleDateString()} ({item.days}d)
                    </td>
                    <td>{item.reason || "-"}</td>

                    {/* STATUS COLUMN WITH INLINE REASON TOOLTIP */}
                    <td>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <span
                          className={
                            leaveStatusClass[item.status] || "leave-status"
                          }
                        >
                          {item.status}
                        </span>
                        {item.status === "Cancelled" && item.cancelReason && (
                          <span
                            title={`Cancel Reason: ${item.cancelReason}`}
                            style={{
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              color: "#6b7280",
                            }}
                            onClick={() =>
                              openModal({
                                title: "Cancellation Reason",
                                message: item.cancelReason || "No reason specified.",
                                variant: "info",
                                confirmLabel: "Close",
                                cancelLabel: null,
                                showCancel: false,
                              })
                            }
                          >
                            <Info size={15} />
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      {mode === "approve" &&
                        canApprove &&
                        item.status === "Pending" ? (
                        <div className="leave-actions">
                          <Button
                            type="button"
                            className="approve-btn"
                            icon={<Check size={14} />}
                            aria-label="Approve"
                            onClick={() =>
                              handleDecision(item._id, "approve", empName)
                            }
                          />
                          <Button
                            type="button"
                            className="reject-btn"
                            icon={<X size={14} />}
                            aria-label="Reject"
                            onClick={() =>
                              handleDecision(item._id, "reject", empName)
                            }
                          />
                        </div>
                      ) : mode === "employee" &&
                        (item.status === "Pending" ||
                          item.status === "Approved") &&
                        new Date(item.startDate).setHours(0, 0, 0, 0) >=
                        new Date().setHours(0, 0, 0, 0) ? (
                        <Button
                          type="button"
                          id="leave-cancel-btn"
                          className="action-btn-delete"
                          onClick={() => handleCancel(item)}
                        >
                          Cancel
                        </Button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section >
    );
  };

  const renderBalanceEditor = (balanceList, readOnly = false) => (
    <section className="leave-panel leave-glass">
      <header className="leave-panel__head">
        <h3>
          {readOnly || !canEditBalances
            ? "Team Leave Balances"
            : "Manage Leave Balances"}
        </h3>
      </header>
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
          <div className="leave-field">
            <label htmlFor="balance-employee">Employee</label>
            <SearchableEmployeeSelectServer
              value={selectedBalanceEmployee}
              onChange={setSelectedBalanceEmployee}
              controlClassName="leave-control"
            />
          </div>
          <div className="leave-balance-grid">
            {leaveBalanceTypes.map((type) => (
              <div key={type} className="balance-row">
                <span className="balance-row__type">{type}</span>
                <div className="leave-field balance-row__field">
                  <label htmlFor={`balance-${type}-total`}>Total</label>
                  <input
                    id={`balance-${type}-total`}
                    type="number"
                    className="leave-control"
                    placeholder="0"
                    value={balanceForm[type]?.total ?? ""}
                    onChange={(e) =>
                      setBalanceForm((prev) => ({
                        ...prev,
                        [type]: { ...prev[type], total: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="leave-field balance-row__field">
                  <label htmlFor={`balance-${type}-used`}>Used</label>
                  <input
                    id={`balance-${type}-used`}
                    type="number"
                    className="leave-control"
                    placeholder="0"
                    value={balanceForm[type]?.used ?? ""}
                    onChange={(e) =>
                      setBalanceForm((prev) => ({
                        ...prev,
                        [type]: { ...prev[type], used: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="leave-form-actions">
            <Button type="submit">Save Balances</Button>
          </div>
        </form>
      )}
    </section>
  );

  const renderPersonalBalances = () => (
    <section className="leave-panel leave-glass">
      <header className="leave-panel__head">
        <h3>My Leave Balances</h3>
      </header>
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
        <section className="leave-panel leave-glass leave-self-notice">
          <header className="leave-panel__head">
            <h3>My Leave</h3>
          </header>
          <p className="leave-empty leave-empty--inline">
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
    <section className="leave-panel leave-glass leave-panel--wide">
      <header className="leave-panel__head">
        <h3>{title}</h3>
      </header>
      <div className="leave-table-wrap">
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
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <span
                      className={
                        leaveStatusClass[item.status] || "leave-status"
                      }
                    >
                      {item.status}
                    </span>
                    {item.status === "Cancelled" && item.cancelReason && (
                      <span
                        title={`Cancel Reason: ${item.cancelReason}`}
                        style={{
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          color: "#6b7280",
                        }}
                        onClick={() =>
                          openModal({
                            title: "Cancellation Reason",
                            message: item.cancelReason || "No reason specified.",
                            variant: "info",
                            confirmLabel: "Close",
                            cancelLabel: null,
                            showCancel: false,
                          })
                        }
                      >
                        <Info size={15} />
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderOrganizationView = () => (
    <>
      <LeaveSummaryCards summary={orgSummary} />
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
        <Button type="button" className="secondary-btn" icon={<Download size={16} />}>
          Export Leave Report
        </Button>
      </div>
      <LeaveSummaryCards
        summary={orgSummary}
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
      {teamMembers.length > 0 ? (
        <div className="leave-role-banner manager">
          <Users size={18} />
          <span>
            Team view — managing {teamMembers.length} team member
            {teamMembers.length === 1 ? "" : "s"}
          </span>
        </div>
      ) : null}
      <LeaveSummaryCards
        summary={teamSummary}
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
      {renderAllRequestsTable(teamRequests, "Team Requests")}
    </>
  );

  const renderEmployeeView = () => (
    <>
      <LeaveSummaryCards
        summary={selfSummary}
        labels={{
          wfh: "My WFH Days",
          leave: "My Leave Days",
          pending: "My Pending",
          balance: "My Balance",
        }}
      />
      {renderMyLeaveSection()}
      {dashboard?.scope === "team" ? (
        <section className="leave-self-section" style={{ marginTop: "2.5rem" }}>
          <h2 className="leave-section-heading">My Team's Leaves</h2>
          {teamMembers.length > 0 ? (
            <div className="leave-role-banner manager">
              <Users size={18} />
              <span>
                Team view — managing {teamMembers.length} team member
                {teamMembers.length === 1 ? "" : "s"}
              </span>
            </div>
          ) : null}
          <LeaveSummaryCards
            summary={teamSummary}
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
          {renderAllRequestsTable(teamRequests, "Team Requests")}
        </section>
      ) : null}
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
        <div className="leave-header-banner">
          <div>
            <h1 className="leave-title">Leave</h1>
            <p className="leave-subtitle">{ROLE_DESCRIPTIONS[viewRole]}</p>
          </div>
          {canConfigurePolicy ? (
            <Button
              type="button"
              variant="secondary"
              icon={<ShieldCheck size={16} />}
              onClick={() => navigate(`/${vendor}/leave/policy`)}
            >
              Leave policy
            </Button>
          ) : null}
        </div>

        {error ? <p className="leave-alert leave-alert--error">{error}</p> : null}

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
