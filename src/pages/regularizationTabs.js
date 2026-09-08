import { Clock3, FileEdit, Inbox, PlusCircle } from "lucide-react";

export const buildRegularizationTabs = ({
  canRequest,
  canApprove,
  canDirectEdit,
}) => [
  ...(canRequest ? [{ id: "request", label: "Request", icon: PlusCircle }] : []),
  { id: "mine", label: "My requests", icon: Clock3 },
  ...(canApprove ? [{ id: "approvals", label: "Approvals", icon: Inbox }] : []),
  ...(canDirectEdit
    ? [{ id: "direct", label: "Direct edit", icon: FileEdit }]
    : []),
];
