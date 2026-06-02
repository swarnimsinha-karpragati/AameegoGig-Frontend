import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Clock3,
  Home,
  UserCheck2,
  Check,
  X,
  Plus,
} from "lucide-react";
import MainLayout from "../layouts/MainLayout";
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
import "./Leave.css";

const leaveStatusClass = {
  Approved: "leave-status approved",
  Pending: "leave-status pending",
  Rejected: "leave-status rejected",
  Cancelled: "leave-status cancelled",
};

function Leave() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const role = user?.role === "HR" ? "Manager" : user?.role;
  const isManagerView = role === "Admin" || role === "Manager";

  const [dashboard, setDashboard] = useState(null);
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
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

  const summary = dashboard?.summary || {};
  const upcoming = dashboard?.upcoming || [];
  const pendingApprovals = dashboard?.pendingApprovals || [];

  const recentRequests = useMemo(() => {
    return requests.slice(0, 6);
  }, [requests]);

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
    if (!isManagerView) return;
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
    } catch (err) {
      // non-blocking
    }
  };

  useEffect(() => {
    loadData();
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const selected = balances.find((b) => b.employeeId === selectedBalanceEmployee);
    if (!selected) return;
    const nextForm = {};
    selected.balances.forEach((item) => {
      nextForm[item.type] = {
        total: item.total,
        used: item.used,
      };
    });
    setBalanceForm((prev) => ({ ...prev, ...nextForm }));
  }, [balances, selectedBalanceEmployee]);

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const payload = { ...leaveForm };
      if (!isManagerView) {
        delete payload.employeeId;
      }
      await createLeaveRequest(payload);
      setMessage("Request submitted");
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
      setMessage(err.response?.data?.message || "Failed to submit request");
    }
  };

  const handleDecision = async (id, action) => {
    try {
      if (action === "approve") {
        await approveLeaveRequest(id);
      } else {
        await rejectLeaveRequest(id);
      }
      loadData();
    } catch (err) {
      setMessage(err.response?.data?.message || "Action failed");
    }
  };

  const handleCancel = async (id) => {
    try {
      await cancelLeaveRequest(id);
      loadData();
    } catch (err) {
      setMessage(err.response?.data?.message || "Cancel failed");
    }
  };

  const handleSaveBalances = async (e) => {
    e.preventDefault();
    if (!selectedBalanceEmployee) return;
    try {
      await updateLeaveBalances(selectedBalanceEmployee, {
        CL: { total: Number(balanceForm.CL.total), used: Number(balanceForm.CL.used) },
        SL: { total: Number(balanceForm.SL.total), used: Number(balanceForm.SL.used) },
        EL: { total: Number(balanceForm.EL.total), used: Number(balanceForm.EL.used) },
        CO: { total: Number(balanceForm.CO.total), used: Number(balanceForm.CO.used) },
      });
      setMessage("Balances updated");
      loadData();
    } catch (err) {
      setMessage(err.response?.data?.message || "Unable to save balances");
    }
  };

  return (
    <MainLayout>
      <div className="leave-page">
        {error ? <p className="leave-error">{error}</p> : null}
        {message ? <p className="leave-message">{message}</p> : null}

        <div className="leave-summary-grid">
          <article className="leave-summary-card">
            <div className="leave-icon blue"><Home size={20} /></div>
            <div><h3>{summary.wfhDaysThisMonth || 0}</h3><p>WFH Days (This Month)</p></div>
          </article>
          <article className="leave-summary-card">
            <div className="leave-icon green"><Calendar size={20} /></div>
            <div><h3>{summary.leaveDaysThisMonth || 0}</h3><p>Leave Days (This Month)</p></div>
          </article>
          <article className="leave-summary-card">
            <div className="leave-icon amber"><Clock3 size={20} /></div>
            <div><h3>{summary.pendingRequests || 0}</h3><p>Pending Requests</p></div>
          </article>
          <article className="leave-summary-card">
            <div className="leave-icon purple"><UserCheck2 size={20} /></div>
            <div><h3>{summary.totalBalance || 0}</h3><p>Total Balance</p></div>
          </article>
        </div>

        <div className="leave-layout-grid">
          <section className="leave-card">
            <h3><Plus size={16} /> Create Request</h3>
            <form className="leave-request-form" onSubmit={handleCreateRequest}>
              {isManagerView ? (
                <select
                  value={leaveForm.employeeId}
                  onChange={(e) => setLeaveForm((p) => ({ ...p, employeeId: e.target.value }))}
                >
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.employeeCode} - {emp.name}
                    </option>
                  ))}
                </select>
              ) : null}
              <select
                value={leaveForm.requestType}
                onChange={(e) => setLeaveForm((p) => ({ ...p, requestType: e.target.value }))}
              >
                <option value="Leave">Leave</option>
                <option value="WFH">WFH</option>
              </select>
              <select
                value={leaveForm.leaveType}
                onChange={(e) => setLeaveForm((p) => ({ ...p, leaveType: e.target.value }))}
              >
                <option value="CL">Casual Leave (CL)</option>
                <option value="SL">Sick Leave (SL)</option>
                <option value="EL">Earned Leave (EL)</option>
                <option value="CO">Comp Off (CO)</option>
                <option value="WFH">WFH</option>
              </select>
              <input
                type="date"
                value={leaveForm.startDate}
                onChange={(e) => setLeaveForm((p) => ({ ...p, startDate: e.target.value }))}
                required
              />
              <input
                type="date"
                value={leaveForm.endDate}
                onChange={(e) => setLeaveForm((p) => ({ ...p, endDate: e.target.value }))}
                required
              />
              <input
                type="text"
                placeholder="Reason"
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm((p) => ({ ...p, reason: e.target.value }))}
              />
              <button type="submit">Submit Request</button>
            </form>
          </section>

          <section className="leave-card">
            <h3>Upcoming (Next 7 Days)</h3>
            <div className="leave-list">
              {upcoming.length === 0 ? <p className="leave-empty">No upcoming schedule</p> : null}
              {upcoming.map((item) => (
                <div className="leave-list-item" key={item._id}>
                  <div>
                    <strong>{item.employeeId?.name}</strong>
                    <p>{item.leaveType} • {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}</p>
                  </div>
                  <span className={leaveStatusClass[item.status] || "leave-status"}>{item.status}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="leave-layout-grid">
          <section className="leave-card">
            <h3>{isManagerView ? "Pending Approvals" : "My Recent Requests"}</h3>
            <table className="leave-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Date / Duration</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(isManagerView ? pendingApprovals : recentRequests).map((item) => (
                  <tr key={item._id}>
                    <td>{item.leaveType}</td>
                    <td>{new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()} ({item.days}d)</td>
                    <td>{item.reason || "-"}</td>
                    <td><span className={leaveStatusClass[item.status] || "leave-status"}>{item.status}</span></td>
                    <td>
                      {isManagerView ? (
                        item.status === "Pending" ? (
                          <div className="leave-actions">
                            <button className="approve-btn" onClick={() => handleDecision(item._id, "approve")}><Check size={14} /></button>
                            <button className="reject-btn" onClick={() => handleDecision(item._id, "reject")}><X size={14} /></button>
                          </div>
                        ) : "-"
                      ) : item.status === "Pending" ? (
                        <button className="cancel-btn" onClick={() => handleCancel(item._id)}>Cancel</button>
                      ) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="leave-card">
            <h3>Leave Balances</h3>
            {isManagerView ? (
              <form className="balance-editor" onSubmit={handleSaveBalances}>
                <select
                  value={selectedBalanceEmployee}
                  onChange={(e) => setSelectedBalanceEmployee(e.target.value)}
                >
                  {balances.map((b) => (
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
            ) : (
              <div className="leave-balance-list">
                {(dashboard?.balances || []).map((b) => (
                  <div className="leave-balance-item" key={b.type}>
                    <span>{b.label}</span>
                    <strong>{b.remaining} / {b.total}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="leave-card">
          <h3>All Requests</h3>
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
              {requests.map((item) => (
                <tr key={item._id}>
                  <td>{item.employeeId?.name || "-"}</td>
                  <td>{item.leaveType}</td>
                  <td>{new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}</td>
                  <td>{item.days}</td>
                  <td><span className={leaveStatusClass[item.status] || "leave-status"}>{item.status}</span></td>
                </tr>
              ))}
              {!loading && requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="leave-empty">No requests found</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </div>
    </MainLayout>
  );
}

export default Leave;
