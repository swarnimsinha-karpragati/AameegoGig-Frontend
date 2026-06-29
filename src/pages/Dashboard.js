import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  CheckCircle2,
  CalendarDays,
  Receipt,
  Clock3,
  TrendingUp,
  AlertCircle,
  Loader2,
  ArrowRight,
  UserPlus,
  Wallet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Link } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { getDashboard } from "../services/dashboardService";
import { getStoredUser, getRoleLabel } from "../utils/roles";
import "./Dashboard.css";

const STAT_ICONS = {
  users: Users,
  check: CheckCircle2,
  calendar: CalendarDays,
  receipt: Receipt,
  clock: Clock3,
};

const ACTIVITY_COLORS = {
  leave: "activity-avatar leave",
  expense: "activity-avatar expense",
  attendance: "activity-avatar attendance",
  employee: "activity-avatar employee",
};

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return "";
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

function StatCard({ stat }) {
  const Icon = STAT_ICONS[stat.icon] || Clock3;
  const iconClass = {
    users: "blue",
    check: "green",
    calendar: "orange",
    receipt: "purple",
    clock: "orange",
  }[stat.icon] || "blue";

  return (
    <div className="stat-card">
      <div>
        <h4>{stat.label}</h4>
        <h2>{stat.value}</h2>
        <p className={stat.trend === "negative" ? "negative" : stat.trend === "positive" ? "positive" : "neutral"}>
          {stat.subtitle}
        </p>
      </div>
      <div className={`stat-icon ${iconClass}`}>
        <Icon size={26} />
      </div>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await getDashboard();
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || "Failed to load dashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  const isOrgView = data?.scope === "org";
  const isManager = data?.scope === "team";
  const showApprovals = data?.role !== "Employee";

  return (
    <MainLayout>
      <div className="dashboard-page">
        <div className="dashboard-welcome">
          <div>
            <h3>Hello, {user?.name?.split(" ")[0] || "there"} 👋</h3>
            <p>
              {isOrgView
                ? "Organization overview — workforce, attendance, and pending actions."
                : isManager
                  ? "Team overview — track attendance and pending approvals."
                  : "Your personal summary — attendance, leave, and expenses."}
              {" "}
              <span className="role-badge">{getRoleLabel(data?.role || user?.role)}</span>
            </p>
          </div>
        </div>

        {loading && (
          <div className="dashboard-loading">
            <Loader2 size={32} className="spin" />
            <p>Loading analytics...</p>
          </div>
        )}

        {error && !loading && (
          <div className="dashboard-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {data && !loading && (
          <>
            <div className="stats-grid">
              {data.stats.map((stat) => (
                <StatCard key={stat.key} stat={stat} />
              ))}
            </div>

            {isOrgView && (data.newJoinersThisMonth > 0 || data.payrollPending > 0) && (
              <div className="insights-row">
                {data.newJoinersThisMonth > 0 && (
                  <div className="insight-chip">
                    <UserPlus size={16} />
                    <span>{data.newJoinersThisMonth} new joiner{data.newJoinersThisMonth !== 1 ? "s" : ""} this month</span>
                  </div>
                )}
                {data.payrollPending > 0 && (
                  <Link to="/payroll?tab=review" className="insight-chip warning">
                    <Wallet size={16} />
                    <span>{data.payrollPending} payroll record{data.payrollPending !== 1 ? "s" : ""} pending processing</span>
                  </Link>
                )}
              </div>
            )}

            <div className="dashboard-mid-grid">
              <div className="chart-card">
                <div className="chart-card-head">
                  <div>
                    <h3>
                      <TrendingUp size={18} />
                      Attendance Trend
                    </h3>
                    <p>Last 7 days — present count</p>
                  </div>
                  <div className="attendance-rate-badge">
                    {data.attendanceToday.rate}% today
                  </div>
                </div>
                {data.attendanceTrend?.length > 0 ? (
                  <div className="dashboard-chart">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={data.attendanceTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                        <Tooltip
                          contentStyle={{
                            background: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "10px",
                            fontSize: "13px",
                          }}
                          formatter={(value, name) => [
                            name === "rate" ? `${value}%` : value,
                            name === "rate" ? "Rate" : "Present",
                          ]}
                        />
                        <Bar dataKey="present" name="Present" fill="#2563eb" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="empty-hint">No attendance data for the last 7 days.</p>
                )}

                <div className="attendance-breakdown">
                  <span className="breakdown-item present">{data.attendanceToday.present} Present</span>
                  <span className="breakdown-item absent">{data.attendanceToday.absent} Absent</span>
                  <span className="breakdown-item late">{data.attendanceToday.late} Late</span>
                  <span className="breakdown-item half">{data.attendanceToday.halfDay} Half Day</span>
                </div>
              </div>

              <div className="summary-card">
                <h3>Expense Summary</h3>
                <p className="summary-period">This month</p>
                <div className="summary-rows">
                  <div className="summary-row">
                    <span>Total Claimed</span>
                    <strong>₹{(data.expenseSummary.totalClaimed || 0).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Approved</span>
                    <strong className="text-green">₹{(data.expenseSummary.totalApproved || 0).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Pending</span>
                    <strong className="text-amber">₹{(data.expenseSummary.totalPending || 0).toLocaleString("en-IN")}</strong>
                  </div>
                </div>
                <button type="button" className="link-btn" onClick={() => navigate("/expenses")}>
                  View expenses <ArrowRight size={14} />
                </button>
              </div>
            </div>

            <div className="bottom-grid">
              <div className="activity-card">
                <div className="section-head">
                  <h3>Recent Activity</h3>
                  <span className="section-count">{data.recentActivity.length} events</span>
                </div>

                {data.recentActivity.length === 0 ? (
                  <p className="empty-hint">No recent activity to show.</p>
                ) : (
                  data.recentActivity.map((item, idx) => (
                    <div className="activity-item" key={`${item.type}-${item.timestamp}-${idx}`}>
                      <div className={ACTIVITY_COLORS[item.type] || "activity-avatar"}>
                        {item.initials}
                      </div>
                      <div className="activity-body">
                        <h4>{item.employeeName}</h4>
                        <p>{item.message}</p>
                        <span className="activity-time">{formatTimeAgo(item.timestamp)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="leave-card">
                <div className="section-head">
                  <h3>Upcoming Leaves</h3>
                  <button type="button" className="link-btn small" onClick={() => navigate("/leave")}>
                    View all
                  </button>
                </div>

                {data.upcomingLeaves.length === 0 ? (
                  <p className="empty-hint">No upcoming leaves in the next 2 weeks.</p>
                ) : (
                  data.upcomingLeaves.map((leave) => (
                    <div className="leave-item" key={leave.id}>
                      <div className="leave-item-top">
                        <div className="leave-avatar">{leave.initials}</div>
                        <div>
                          <h4>{leave.name}</h4>
                          <p>{leave.leaveType} · {leave.days} day{leave.days !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                      <span>{leave.dateLabel}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {showApprovals &&
              (data.pendingApprovals.leave.length > 0 ||
                data.pendingApprovals.expense.length > 0) && (
                <div className="approvals-section">
                  <h3>Pending Approvals</h3>
                  <div className="approvals-grid">
                    {data.pendingApprovals.leave.length > 0 && (
                      <div className="approval-card">
                        <div className="approval-card-head">
                          <CalendarDays size={18} />
                          <span>Leave Requests</span>
                          <span className="approval-count">{data.pendingApprovals.leave.length}</span>
                        </div>
                        {data.pendingApprovals.leave.map((req) => (
                          <div className="approval-item" key={req._id}>
                            <strong>{req.employeeId?.name || "Unknown"}</strong>
                            <span>{req.leaveType} · {req.days} day{req.days !== 1 ? "s" : ""}</span>
                          </div>
                        ))}
                        <button type="button" className="link-btn" onClick={() => navigate("/leave")}>
                          Review leaves <ArrowRight size={14} />
                        </button>
                      </div>
                    )}

                    {data.pendingApprovals.expense.length > 0 && (
                      <div className="approval-card">
                        <div className="approval-card-head">
                          <Receipt size={18} />
                          <span>Expense Claims</span>
                          <span className="approval-count">{data.pendingApprovals.expense.length}</span>
                        </div>
                        {data.pendingApprovals.expense.map((exp) => (
                          <div className="approval-item" key={exp._id}>
                            <strong>{exp.employeeId?.name || "Unknown"}</strong>
                            <span>{exp.title} — ₹{exp.amount?.toLocaleString("en-IN")}</span>
                          </div>
                        ))}
                        <button type="button" className="link-btn" onClick={() => navigate("/expenses")}>
                          Review expenses <ArrowRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
          </>
        )}
      </div>
    </MainLayout>
  );
}

export default Dashboard;
