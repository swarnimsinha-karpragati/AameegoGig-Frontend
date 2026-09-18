import { useMemo, useState } from "react";
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
  useRegularizationDashboard,
  useRegularizationRequests,
  useCancelRegularizationRequest,
} from "../hooks/useRegularization";
import { validateField } from "../utils/inputValidation";
import {
  getStoredUser,
  hasLinkedEmployeeProfile,
  canViewAllRegularizations,
  canApproveRegularization,
  canDirectEditRegularization,
} from "../utils/roles";
import { buildRegularizationTabs } from "./regularizationTabs";
import "./Regularization.css";

const apiError = (error, fallback) => buildApiErrorMessage(error, fallback);

function RegularizationInner() {
  const toast = useToast();
  const toastError = toast.error;
  const toastSuccess = toast.success;
  const user = getStoredUser();
  // Org list + stats: view-all (approve / direct-edit imply it).
  // Approvals tab: approve only. Direct tab: approve or direct-edit.
  const canApprove = canApproveRegularization(user?.role);
  const isAdminOrHr = canViewAllRegularizations(user?.role);
  const canDirectEdit = canDirectEditRegularization(user?.role);
  const canRequest = hasLinkedEmployeeProfile(user);
  const dashboardQuery = useRegularizationDashboard();
  const counts = dashboardQuery.data?.counts || {};
  const hasTeam = Boolean(dashboardQuery.data?.hasTeam);
  const teamCount = dashboardQuery.data?.teamCount || 0;
  const teamPending = counts.teamPending || 0;
  const teamApprovedThisMonth = counts.teamApprovedThisMonth || 0;
  const tabs = useMemo(
    () =>
      buildRegularizationTabs({
        canRequest,
        canApprove,
        canDirectEdit,
        isAdminOrHr,
        hasTeam,
      }),
    [canApprove, canDirectEdit, canRequest, isAdminOrHr, hasTeam]
  );
  const [activeTab, setActiveTab] = useState(canRequest ? "request" : "mine");

  const requestsQuery = useRegularizationRequests({
    limit: 100,
    ...(isAdminOrHr ? {} : { mine: 1 }),
  });
  const approvedQuery = useRegularizationRequests({ status: "Approved", limit: 100 });
  const cancelMutation = useCancelRegularizationRequest();

  const requests = requestsQuery.data?.requests || [];
  const loading = dashboardQuery.isLoading || requestsQuery.isLoading;

  const isApprovedThisMonth = (request) => {
    const decided = new Date(request?.decidedAt);
    if (Number.isNaN(decided.getTime())) return false;
    const now = new Date();
    return (
      decided.getFullYear() === now.getFullYear() &&
      decided.getMonth() === now.getMonth()
    );
  };

  const approved = (approvedQuery.data?.requests || []).filter(isApprovedThisMonth);

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
      const response = await cancelMutation.mutateAsync({ id, cancelReason });
      toastSuccess(response?.message || "Regularization request cancelled");
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
          <RequestForm toast={toast} onSubmitted={() => {
            dashboardQuery.refetch();
            requestsQuery.refetch();
            approvedQuery.refetch();
          }} />
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
            showEmployee={isAdminOrHr}
          />
        ) : null}
        {activeTab === "approvals" ? (
          <ApprovalsList
            toast={toast}
            onChanged={() => {
              dashboardQuery.refetch();
              requestsQuery.refetch();
              approvedQuery.refetch();
            }}
          />
        ) : null}
        {activeTab === "team" ? (
          <>
            <div className="regularization-stats" aria-label="Team summary">
              <article className="regularization-stat regularization-glass">
                <span className="regularization-stat__icon amber">
                  <Clock3 size={20} />
                </span>
                <div>
                  <strong>{teamPending}</strong>
                  <span>Team pending</span>
                </div>
              </article>
              <article className="regularization-stat regularization-glass">
                <span className="regularization-stat__icon green">
                  <CheckCircle2 size={20} />
                </span>
                <div>
                  <strong>{teamApprovedThisMonth}</strong>
                  <span>Team approved this month</span>
                </div>
              </article>
              <article className="regularization-stat regularization-glass">
                <span className="regularization-stat__icon blue">
                  <ClipboardList size={20} />
                </span>
                <div>
                  <strong>{teamCount}</strong>
                  <span>Team member{teamCount === 1 ? "" : "s"}</span>
                </div>
              </article>
            </div>
            <ApprovalsList
              toast={toast}
              onChanged={() => {
                dashboardQuery.refetch();
                requestsQuery.refetch();
                approvedQuery.refetch();
              }}
              requestParams={{ team: 1, status: "Pending" }}
              eyebrow={teamCount > 0 ? `My team — ${teamCount} member${teamCount === 1 ? "" : "s"}` : "My team"}
              title="Team requests"
              description="Review your team members' corrections and approve or reject them."
              emptyTitle="No team requests waiting"
              emptyText="Your team members' pending corrections will appear here."
            />
          </>
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
            onChanged={() => {
              dashboardQuery.refetch();
              requestsQuery.refetch();
              approvedQuery.refetch();
            }}
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
