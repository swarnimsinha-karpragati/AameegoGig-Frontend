import {
  Clock3,
  FileEdit,
  Inbox,
  PlusCircle,
  CheckCircle2,
  Users,
  Settings2,
} from "lucide-react";

export const buildRegularizationTabs = ({
  canRequest,
  canApprove,
  canDirectEdit,
  isAdminOrHr,
  hasTeam,
  canConfigure = false,
}) => {
  const allLabel = isAdminOrHr ? "All requests" : "My requests";
  return [
    ...(canRequest ? [{ id: "request", label: "Request", icon: PlusCircle }] : []),
    { id: "mine", label: allLabel, icon: Clock3 },
    // Team tab: visible only to users who have a team (reporting managers).
    ...(hasTeam ? [{ id: "team", label: "Team requests", icon: Users }] : []),
    ...(canApprove ? [{ id: "approvals", label: "Pending approvals", icon: Inbox }] : []),
    { id: "approved", label: "Approved this month", icon: CheckCircle2 },
    ...(canDirectEdit ? [{ id: "direct", label: "Direct edit", icon: FileEdit }] : []),
    // Configuration: visible only to Admin/HR (monthly request limits).
    ...(canConfigure ? [{ id: "config", label: "Configuration", icon: Settings2 }] : []),
  ];
};
