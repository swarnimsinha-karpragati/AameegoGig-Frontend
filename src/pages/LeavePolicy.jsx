import MainLayout from "../layouts/MainLayout";
import LeavePolicyManager from "../components/LeavePolicyManager";
import Button from "../components/Button";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getStoredUser, roleHasPermission } from "../utils/roles";
import "./LeavePolicy.css";

export default function LeavePolicy() {
  const navigate = useNavigate();
  const user = getStoredUser();

  if (!roleHasPermission(user?.role, "leave:policy")) {
    return (
      <MainLayout>
        <div className="leave-policy-page">
          <p style={{ padding: 32, color: "#64748b" }}>
            You do not have access to this page.
          </p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="leave-policy-page">
        <header className="leave-policy-page-header">
          <Button
            type="button"
            variant="secondary"
            icon={<ChevronLeft size={16} />}
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
        </header>

        <LeavePolicyManager />
      </div>
    </MainLayout>
  );
}
