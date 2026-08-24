import MainLayout from "../layouts/MainLayout";
import LeavePolicyManager from "../components/LeavePolicyManager";
import Button from "../components/Button";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getStoredUser } from "../utils/roles";
import "./LeavePolicy.css";

export default function LeavePolicy() {
  const navigate = useNavigate();
  const user = getStoredUser();

  if (user?.role !== "Admin" && user?.role !== "HR") {
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
          <div>
            <h1>Configure leave policy</h1>
            <p>Set up how employees earn, use and carry forward their leave days.</p>
          </div>
        </header>

        <LeavePolicyManager />
      </div>
    </MainLayout>
  );
}
