import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  UserMinus,
  LogIn,
  LogOut,
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
import { useDashboard, useTodayAttendance } from "../hooks/useDashboard";
import { formatWorkedHours } from "../services/attendanceService";
import { getStoredUser, userHasModule, visibleDashboardStats, roleHasPermission } from "../utils/roles";
import "./Dashboard.css";
import Card from "../components/Card";

const STAT_ICONS = {
  users: Users,
  check: CheckCircle2,
  calendar: CalendarDays,
  receipt: Receipt,
  clock: Clock3,
  "user-minus": UserMinus,
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

function StatCard({ stat, onClick }) {
  const Icon = STAT_ICONS[stat.icon] || Clock3;
  const iconClass = {
    users: "blue",
    check: "green",
    calendar: "orange",
    receipt: "purple",
    clock: "orange",
    "user-minus": "red",
  }[stat.icon] || "blue";

  return (
    <Card icon={<Icon size={26} />} iconClassName={`${iconClass}`} isInteractive={Boolean(onClick)} onClick={onClick}>
      <Card.Header>{stat.label}</Card.Header>
      <Card.Body>{stat.value}</Card.Body>
      <Card.Footer className={stat.trend === "negative" ? "negative" : stat.trend === "positive" ? "positive" : "neutral"}>{stat.subtitle}</Card.Footer>
    </Card>
  )
}

/**
 * Maps the backend's `myAttendance` snapshot to the copy and CTA shown on the
 * dashboard. States: not-marked | checked-in | checked-out | on-leave | wfh.
 */
const buildAttendanceCta = (attendance, workedLabel) => {
  if (!attendance) return null;

  const { state, status, checkIn, checkOut, hasSessions, leave, sessionCount } = attendance;
  const sessionSuffix = sessionCount > 1 ? ` · ${sessionCount} sessions` : "";

  switch (state) {
    case "checked-in":
      return {
        badge: "Checked In",
        title: checkIn ? `Checked in at ${checkIn}` : "You're checked in",
        detail: `${workedLabel} worked today${sessionSuffix}`,
        label: "Check Out",
        action: "checkout",
        secondary: true,
        icon: <LogIn size={22} />,
      };
    case "checked-out":
      if (!hasSessions) {
        return {
          badge: status || "Marked",
          title:
            status === "Absent"
              ? "You're marked absent for today"
              : `You're marked ${String(status || "present").toLowerCase()} for today`,
          detail: "Attendance was updated for you.",
          label: "View Attendance",
          action: null,
          secondary: false,
          icon: <CheckCircle2 size={22} />,
        };
      }
      return {
        badge: status || "Completed",
        title:
          checkOut && checkIn
            ? `Checked in ${checkIn} · Checked out ${checkOut}`
            : `Checked in at ${checkIn}`,
        detail: `${workedLabel} worked today${sessionSuffix}`,
        label: "Check In Again",
        action: "checkin",
        secondary: true,
        icon: <CheckCircle2 size={22} />,
      };
    case "on-leave":
      return {
        badge: "On Leave",
        title: leave?.leaveLabel || leave?.requestType || "Approved leave",
        detail: "You're on approved leave today, so no check-in is needed.",
        label: "View Attendance",
        action: null,
        secondary: false,
        icon: <CalendarDays size={22} />,
      };
    case "wfh":
      return {
        badge: "Work From Home",
        title: "You're working from home today",
        detail: "Your attendance is marked as WFH.",
        label: "View Attendance",
        action: null,
        secondary: false,
        icon: <Clock3 size={22} />,
      };
    default:
      return {
        badge: "Not Marked",
        title: "You haven't checked in today",
        detail: "Mark your attendance to start tracking your day.",
        label: "Mark Attendance",
        action: "checkin",
        secondary: false,
        icon: <Clock3 size={22} />,
      };
  }
};


function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());
  const [now, setNow] = useState(() => Date.now());
  const vendorName = useParams().vendor;

  const { data, isLoading: loading, error: queryError } = useDashboard();
  const error = queryError?.response?.data?.message || (queryError ? "Failed to load dashboard" : "");

  useEffect(() => {
    const refreshUser = () => setUser(getStoredUser());

    window.addEventListener("user-updated", refreshUser);
    window.addEventListener("storage", refreshUser);
    refreshUser();
    return () => {
      window.removeEventListener("user-updated", refreshUser);
      window.removeEventListener("storage", refreshUser);
    };
  }, []);

  const isOrgView = data?.scope === "org";
  const isManager = data?.scope === "team";
  const showApprovals =
    data?.role !== "Employee" &&
    data?.role !== "Intern" &&
    (roleHasPermission(data?.role, "leave:approve-all") ||
      roleHasPermission(data?.role, "expenses:approve") ||
      roleHasPermission(data?.role, "regularization:approve") ||
      roleHasPermission(data?.role, "regularization:view-all") ||
      roleHasPermission(data?.role, "advance-loan:approve") ||
      // No team permission exists: team-scope approvers see it automatically.
      isManager);
  const modules = data?.allowedModules || user?.allowedModules;
  const hasModule = (key) => userHasModule(user, key, modules);
  const showAttendance = hasModule("attendance") && data?.attendanceToday;
  const showLeave = hasModule("leave");
  const showExpenses = hasModule("expenses");
  const showPayroll = hasModule("payroll");
  const showEmployees = hasModule("employees");

  // Own attendance snapshot. The dashboard payload already carries it; the
  // lightweight hook keeps the card fresh (polling) while the page stays open.
  const { data: todayAttendanceData } = useTodayAttendance({
    enabled: !isOrgView && Boolean(showAttendance),
  });
  const myAttendance =
    todayAttendanceData?.myAttendance ?? data?.myAttendance ?? null;

  const myAttendanceLiveMinutes = useMemo(() => {
    const base = myAttendance?.workedMinutes || 0;
    if (!myAttendance?.isCheckedIn || !myAttendance?.activeCheckInAt) return base;

    const startedAt = new Date(myAttendance.activeCheckInAt).getTime();
    if (!Number.isFinite(startedAt)) return base;

    return base + Math.max(0, Math.floor((now - startedAt) / 60000));
  }, [myAttendance, now]);

  useEffect(() => {
    if (!myAttendance?.isCheckedIn) return undefined;

    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [myAttendance?.isCheckedIn, myAttendance?.activeCheckInAt]);

  const attendanceCta = buildAttendanceCta(
    myAttendance,
    formatWorkedHours(myAttendanceLiveMinutes)
  );

  const handleAttendanceCta = () => {
    const action = attendanceCta?.action;
    navigate(
      `/${vendorName}/attendance${action ? `?action=${action}` : ""}`
    );
  };

  const stats = visibleDashboardStats(
    data?.stats,
    user,
    modules,
    {
      leave: data?.pendingLeaveCount,
      expense: data?.pendingExpenseCount,
    }
  );

  // Clicking the employee tiles deep-links into the employee directory with the
  // matching status filter applied (All / Active / Inactive).
  const EMPLOYEE_STAT_STATUS = {
    employees: "all",
    activeEmployees: "active",
    exitEmployees: "exited",
  };
  const personalSummary = [
    showAttendance && "attendance",
    showLeave && "leave",
    showExpenses && "expenses",
  ].filter(Boolean);
  const personalSummaryText =
    personalSummary.length === 0
      ? "Your personal summary"
      : personalSummary.length === 1
        ? `Your personal summary — ${personalSummary[0]}`
        : `Your personal summary — ${personalSummary.slice(0, -1).join(", ")} and ${personalSummary.at(-1)}`;

  return (
    <MainLayout>
      <div className="dashboard-page">
        <div className="dashboard-welcome">
          <div>
            <h3>Hello, {user?.name?.split(" ")[0] || "there"} 👋</h3>
            <p>
              {isOrgView
                ? "Organization overview — workforce, attendance, and pending actions"
                : isManager
                  ? "Team overview — track attendance and pending approvals"
                  : personalSummaryText}
              {" "}
              {/* <span className="role-badge">{getRoleLabel(data?.role || user?.role)}</span> */}
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
            {stats.length > 0 && (
              <div className="stats-grid">
                {stats.map((stat) => {
                  const statusTarget =
                    showEmployees && isOrgView && EMPLOYEE_STAT_STATUS[stat.key]
                      ? EMPLOYEE_STAT_STATUS[stat.key]
                      : null;
                  return (
                    <StatCard
                      key={stat.key}
                      stat={stat}
                      onClick={
                        statusTarget
                          ? () => navigate(`/${vendorName}/employees?status=${statusTarget}`)
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            )}

            {user?.role !== "Admin" && showAttendance && attendanceCta && (
              <div className="attendance-cta-wrapper">
                <div className={`attendance-cta is-${myAttendance?.state || "not-marked"}`}>
                  <div className="attendance-cta-main">
                    <span className="attendance-cta-icon">{attendanceCta.icon}</span>
                    <div className="attendance-cta-copy">
                      <div className="attendance-cta-heading">
                        <h3>Today&apos;s Attendance</h3>
                        <span
                          className={`attendance-cta-badge is-${myAttendance?.state || "not-marked"}`}
                        >
                          {attendanceCta.badge}
                        </span>
                      </div>
                      <p className="attendance-cta-status">{attendanceCta.title}</p>
                      {attendanceCta.detail ? (
                        <p className="attendance-cta-detail">{attendanceCta.detail}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="attendance-cta-actions">
                    {attendanceCta.secondary ? (
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => navigate(`/${vendorName}/attendance`)}
                      >
                        View attendance <ArrowRight size={14} />
                      </button>
                    ) : null}
                    <button type="button" className="primary" onClick={handleAttendanceCta}>
                      {attendanceCta.action === "checkout" ? <LogOut size={16} /> : null}
                      {attendanceCta.action === "checkin" ? <LogIn size={16} /> : null}
                      {attendanceCta.label}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isOrgView && ((showEmployees && data.newJoinersThisMonth > 0) || (showPayroll && data.payrollPending > 0) || (showEmployees && data.exitEmployees > 0)) && (
              <div className="insights-row">
                {showEmployees && data.newJoinersThisMonth > 0 && (
                  <div className="insight-chip">
                    <UserPlus size={16} />
                    <span>{data.newJoinersThisMonth} new joiner{data.newJoinersThisMonth !== 1 ? "s" : ""} this month</span>
                  </div>
                )}
                {showEmployees && data.exitEmployees > 0 && (
                  <Link to={`/${vendorName}/employees?status=exited`} className="insight-chip warning">
                    <UserMinus size={16} />
                    <span>{data.exitEmployees} employee{data.exitEmployees !== 1 ? "s" : ""} exited</span>
                  </Link>
                )}
                {showPayroll && data.payrollPending > 0 && (
                  <Link to={`/${vendorName}/payroll?tab=payroll`} className="insight-chip warning">
                    <Wallet size={16} />
                    <span>{data.payrollPending} payroll record{data.payrollPending !== 1 ? "s" : ""} pending processing</span>
                  </Link>
                )}
              </div>
            )}

            {isOrgView && showAttendance && <div className="dashboard-mid-grid">
              <div className="chart-card">
                <div className="chart-card-head">
                  <div>
                    <h3>
                      <TrendingUp size={18} />
                      Attendance Trend
                    </h3>
                    <p>Last 10 days — Present Count</p>
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
            </div>
            }

            <div className="bottom-grid">
              <div className="activity-card">
                <div className="section-head">
                  <h3>Recent Activity</h3>
                  <span className="section-count">{(data.recentActivity || []).length} events</span>
                </div>

                {(data.recentActivity || []).length === 0 ? (
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

              {showLeave ? (
                <div className="leave-card">
                  <div className="section-head">
                    <h3>Upcoming Leaves</h3>
                    <button type="button" className="link-btn small" onClick={() => navigate("/" + vendorName + "/leave")}>
                      View all
                    </button>
                  </div>

                  {data.upcomingLeaves?.length === 0 ? (
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
              ) : null}

            </div>

            {showLeave && (
              <div className="holiday-card">
                <div className="section-head">
                  <h3>Upcoming Holidays</h3>
                </div>

                {data.upcomingHolidays?.length === 0 ? (
                  <p className="empty-hint">No upcoming holidays.</p>
                ) : (
                  data.upcomingHolidays.map((holiday) => (
                    <div className="holiday-item" key={holiday.id}>
                      <div className="holiday-date-badge">
                        <span className="holiday-date-label">{holiday.dateLabel}</span>
                      </div>
                      <div className="holiday-details">
                        <h4>{holiday.name}</h4>
                        <p>{holiday.type}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {showExpenses && data.expenseSummary ? (
              <div className="summary-card">
                <h3>Expense Summary</h3>
                <p className="summary-period">This month</p>
                <div className="summary-rows">
                  <div className="summary-row">
                    <span>Total Claimed</span>
                    <strong>₹{(data.expenseSummary?.totalClaimed || 0).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Approved</span>
                    <strong className="text-green">₹{(data.expenseSummary?.totalApproved || 0).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Pending</span>
                    <strong className="text-amber">₹{(data.expenseSummary?.totalPending || 0).toLocaleString("en-IN")}</strong>
                  </div>
                </div>
                <button type="button" className="link-btn" onClick={() => navigate("/" + vendorName + "/expenses")}>
                  View expenses <ArrowRight size={14} />
                </button>
              </div>
            ) : null}

            {showApprovals &&
              ((showLeave && data.pendingApprovals?.leave?.length > 0) ||
                (showExpenses && data.pendingApprovals?.expense?.length > 0)) && (
                <div className="approvals-section">
                  <div className="approvals-grid">
                    {showLeave && data.pendingApprovals?.leave?.length > 0 && (
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
                        <button type="button" className="link-btn" onClick={() => navigate("/" + vendorName + "/leave")}>
                          Review leaves <ArrowRight size={14} />
                        </button>
                      </div>
                    )}

                    {showExpenses && data.pendingApprovals?.expense?.length > 0 && (
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
                        <button type="button" className="link-btn" onClick={() => navigate("/" + vendorName + "/expenses")}>
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
