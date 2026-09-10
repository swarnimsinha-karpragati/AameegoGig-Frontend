import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  ShieldCheck,
} from "lucide-react";
import MainLayout from "../layouts/MainLayout";
import RequestForm, {
  buildApiErrorMessage,
} from "../components/regularization/RequestForm";
import MyRequestsList from "../components/regularization/MyRequestsList";
import ApprovedList from "../components/regularization/ApprovedList";
import ApprovalsList from "../components/regularization/ApprovalsList";
import DirectEditPanel from "../components/regularization/DirectEditPanel";
import { ToastProvider, useToast } from "../components/Toast";
import {
  cancelRegularizationRequest,
  getRegularizationDashboard,
  listRegularizationRequests,
} from "../services/regularizationService";
import { validateField } from "../utils/inputValidation";
import { getStoredUser, hasLinkedEmployeeProfile } from "../utils/roles";
import { buildRegularizationTabs } from "./regularizationTabs";
import "./Regularization.css";

const ROLE_SUBTITLES = {
  Admin: "Correct records, review requests, and keep attendance and leave accurate.",
  HR: "Manage correction requests across your organization in one place.",
  Manager: "Request corrections and keep track of your team’s review queue.",
  Employee: "Fix attendance or leave records and follow every decision.",
};

const apiError = (error, fallback) => buildApiErrorMessage(error, fallback);

function RegularizationInner() {
  const toast = useToast();
  const toastError = toast.error;
  const toastSuccess = toast.success;
  const user = getStoredUser();
  const isAdminOrHr = ["Admin", "HR"].includes(user?.role);
  const canApprove = isAdminOrHr;
  const canDirectEdit = isAdminOrHr;
  const canRequest = hasLinkedEmployeeProfile(user);
  const tabs = useMemo(
    () =>
      buildRegularizationTabs({
        canRequest,
        canApprove,
        canDirectEdit,
        isAdminOrHr,
      }),
    [canApprove, canDirectEdit, canRequest, isAdminOrHr]
  );
  const [activeTab, setActiveTab] = useState(canRequest ? "request" : "mine");
  const [counts, setCounts] = useState({
    myPending: 0,
    awaitingApproval: 0,
    approvedThisMonth: 0,
  });
  const [requests, setRequests] = useState([]);
  const [approved, setApproved] = useState([]);
  const [loading, setLoading] = useState(true);

  const isApprovedThisMonth = (request) => {
    const decided = new Date(request?.decidedAt);
    if (Number.isNaN(decided.getTime())) return false;
    const now = new Date();
    return (
      decided.getFullYear() === now.getFullYear() &&
      decided.getMonth() === now.getMonth()
    );
  };

  const loadData = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setLoading(true);
      const [dashboardResult, requestsResult, approvedResult] =
        await Promise.allSettled([
          getRegularizationDashboard(),
          listRegularizationRequests({
            limit: 100,
            ...(isAdminOrHr ? {} : { mine: 1 }),
          }),
          listRegularizationRequests({ status: "Approved", limit: 100 }),
        ]);
      if (dashboardResult.status === "fulfilled") {
        setCounts(dashboardResult.value?.counts || {});
      } else if (!quiet) {
        toastError(apiError(dashboardResult.reason, "Failed to load regularization summary"));
      }
      if (requestsResult.status === "fulfilled") {
        setRequests(requestsResult.value?.requests || []);
      } else {
        toastError(apiError(requestsResult.reason, "Failed to load requests"));
      }
      if (approvedResult.status === "fulfilled") {
        setApproved(
          (approvedResult.value?.requests || []).filter(isApprovedThisMonth)
        );
      } else if (!quiet) {
        toastError(apiError(approvedResult.reason, "Failed to load approved requests"));
      }
      setLoading(false);
    },
    [isAdminOrHr, toastError]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCancel = async (id, cancelReason) => {
    const cancelError = validateField({
      name: "cancelReason",
      label: "Cancellation reason",
      value: cancelReason,
      kind: "text",
      required: false,
      maxLength: 500,
    });
    if (cancelError) {
      toastError(cancelError);
      return false;
    }
    try {
      const response = await cancelRegularizationRequest(id, cancelReason);
      toastSuccess(response?.message || "Regularization request cancelled");
      await loadData({ quiet: true });
      return true;
    } catch (error) {
      toastError(apiError(error, "Failed to cancel request"));
      return false;
    }
  };

  const stats = isAdminOrHr
    ? [
      {
        label: "All requests",
        value: counts.allRequests || 0,
        icon: ClipboardList,
        tone: "blue",
      },
      {
        label: "All pending",
        value: counts.awaitingApproval || 0,
        icon: Clock3,
        tone: "amber",
      },
      {
        label: "Approved this month",
        value: counts.approvedThisMonth || 0,
        icon: CheckCircle2,
        tone: "green",
      },
    ]
    : [
      {
        label: "My pending",
        value: counts.myPending || 0,
        icon: Clock3,
        tone: "amber",
      },
      {
        label: "Approved this month",
        value: counts.approvedThisMonth || 0,
        icon: CheckCircle2,
        tone: "green",
      },
    ];

  return (
    <div className="regularization-page">
      <header className="regularization-header">
        <div>
          <span className="regularization-eyebrow">Attendance & leave</span>
          <h1>Regularization hub</h1>
          <p>{ROLE_SUBTITLES[user?.role] || ROLE_SUBTITLES.Employee}</p>
        </div>
        <div className="regularization-header__badge">
          <ShieldCheck size={17} />
          <span>{user?.role || "Employee"} workspace</span>
        </div>
      </header>

      <div className="regularization-stats" aria-label="Regularization summary">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <article className="regularization-stat regularization-glass" key={label}>
            <span className={`regularization-stat__icon ${tone}`}>
              <Icon size={20} />
            </span>
            <div>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          </article>
        ))}
      </div>

      <nav className="regularization-tabs" aria-label="Regularization sections">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            className={activeTab === id ? "is-active" : ""}
            onClick={() => setActiveTab(id)}
            aria-current={activeTab === id ? "page" : undefined}
          >
            <Icon size={16} />
            {label}
            {id === "approvals" && counts.awaitingApproval > 0 ? (
              <span className="regularization-tabs__count">{counts.awaitingApproval}</span>
            ) : null}
          </button>
        ))}
      </nav>

      <main className="regularization-content">
        {activeTab === "request" ? (
          <RequestForm toast={toast} onSubmitted={() => loadData({ quiet: true })} />
        ) : null}
        {activeTab === "mine" ? (
          <MyRequestsList
            title={isAdminOrHr ? "All Requests" : "My Requests"}
            eyebrow={isAdminOrHr ? "Organization requests" : "Your history"}
            emptyTitle={
              isAdminOrHr ? "No requests found" : "No requests yet"
            }
            emptyText={
              isAdminOrHr
                ? "Regularization requests submitted by employees will appear here."
                : "Your attendance and leave correction requests will appear here."
            }
            allowCancel={!isAdminOrHr}
            compact
            description={
              isAdminOrHr
                ? "Review organization attendance and leave correction requests."
                : undefined
            }
            requests={requests}
            loading={loading}
            onCancel={handleCancel}
          />
        ) : null}
        {activeTab === "approvals" ? (
          <ApprovalsList
            toast={toast}
            onChanged={() => loadData({ quiet: true })}
          />
        ) : null}
        {activeTab === "approved" ? (
          <ApprovedList
            requests={approved}
            loading={loading}
            emptyText="No regularization requests approved this month."
          />
        ) : null}
        {activeTab === "direct" ? (
          <DirectEditPanel
            toast={toast}
            onChanged={() => loadData({ quiet: true })}
          />
        ) : null}
      </main>
    </div>
  );
}

export default function Regularization() {
  return (
    <MainLayout>
      <ToastProvider>
        <RegularizationInner />
      </ToastProvider>
    </MainLayout>
  );
}
