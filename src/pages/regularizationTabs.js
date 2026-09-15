import {
  Clock3,
  FileEdit,
  Inbox,
  PlusCircle,
  CheckCircle2,
} from "lucide-react";

export const buildRegularizationTabs = ({
  canRequest,
  canApprove,
  canDirectEdit,
  isAdminOrHr,
}) => {
  const allLabel = isAdminOrHr ? "All requests" : "My requests";
  return [
    ...(canRequest ? [{ id: "request", label: "Request", icon: PlusCircle }] : []),
    { id: "mine", label: allLabel, icon: Clock3 },
    ...(canApprove ? [{ id: "approvals", label: "Pending approvals", icon: Inbox }] : []),
    { id: "approved", label: "Approved this month", icon: CheckCircle2 },
    ...(canDirectEdit ? [{ id: "direct", label: "Direct edit", icon: FileEdit }] : []),
  ];
};
