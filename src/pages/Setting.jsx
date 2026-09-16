import React, { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import "./Settings.css";
import MainLayout from "../layouts/MainLayout";
import {
  User,
  Building2,
  Clock,
  CalendarDays,
  FileText,
  Wallet,
  Timer,
  Lock,
  UserCheck,
  // ShieldCheck, // Roles tab commented
} from "lucide-react";

import ProfileCard from "../components/ProfileCard";
import NotificationsCard from "../components/NotificationsCard";
import SecurityCard from "../components/SecurityCard";
// import RolesCard from "../components/RolesCard"; // Roles tab commented
import ShiftManager from "../components/ShiftManager";
import { OverTimePolicy } from "../components/OverTimePolicy";
import { OverTimePolicyList } from "../components/OverTimePolicyList";
import HolidayManager from "../components/HolidayManager";
import WeekOffManager from "../components/WeekOffManager";
// import PayrollConfigCard from "../components/PayrollConfigCard";
import LeavePolicyManager from "../components/LeavePolicyManager";
import ProbationPolicyManager from "../components/ProbationPolicyManager";
// import PayrollConfigCard from "../components/PayrollConfigCard";
import OrgProfileCard from "../components/OrgProfileCard";
import SalaryComponentManager from "../components/SalaryComponentManager";
import SalaryStructure from "../components/SalaryStructure";
import { roleHasPermission } from "../utils/roles";

export default function Settings() {

  const [user, setUser] = useState(null);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "profile");

  const formRef = useRef(null);
  const listRef = useRef(null);


  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (!loggedInUser) return;
    const parsedUser = JSON.parse(loggedInUser);
    setUser(parsedUser);
  }, []);

  // Permission-aware tabs — only tabs the user has permission for are shown.
  // Profile (Profile + Notifications beside it) / Security are always visible.
  const tabs = useMemo(() => {
    const role = user?.role;
    const list = [{ id: "profile", label: "Profile", icon: User }];
    if (roleHasPermission(role, "settings:org")) {
      list.push({ id: "organization", label: "Organization", icon: Building2 });
    }
    if (roleHasPermission(role, "settings:shifts")) {
      list.push({ id: "shifts", label: "Shifts & Week Off", icon: Clock });
    }
    if (roleHasPermission(role, "settings:holidays")) {
      list.push({ id: "holidays", label: "Holidays", icon: CalendarDays });
    }
    if (roleHasPermission(role, "settings:leave-policy")) {
      list.push({ id: "leave-policy", label: "Leave Policy", icon: FileText });
    }
    if (
      roleHasPermission(role, "settings:probation") ||
      roleHasPermission(role, "probation:manage")
    ) {
      list.push({ id: "probation", label: "Probation", icon: UserCheck });
    }
    if (
      roleHasPermission(role, "payroll:structure") ||
      roleHasPermission(role, "payroll:components")
    ) {
      list.push({ id: "salary", label: "Salary", icon: Wallet });
    }
    if (roleHasPermission(role, "settings:ot")) {
      list.push({ id: "overtime", label: "Overtime", icon: Timer });
    }
    list.push({ id: "security", label: "Security", icon: Lock });
    // Roles & Permissions tab commented
    // if (roleHasPermission(role, "roles:manage")) {
    //   list.push({ id: "roles", label: "Roles & Access", icon: ShieldCheck });
    // }
    return list;
  }, [user?.role]);

  // Restore the active tab from the URL (?tab=...) — keep the same tab open on refresh.
  // If the URL tab is unavailable due to permissions, go to the first available tab.
  // NOTE: before the user (role) loads, tabs are incomplete (only profile/
  // security), so don't apply fallback/URL-overwrite until then — otherwise refresh
  // would always open profile.
  useEffect(() => {
    if (!user) return;
    if (tabs.length === 0) return;
    if (tabFromUrl && tabs.some((t) => t.id === tabFromUrl)) {
      if (activeTab !== tabFromUrl) setActiveTab(tabFromUrl);
    } else if (!tabs.some((t) => t.id === activeTab)) {
      const fallback = tabs[0]?.id || "profile";
      setActiveTab(fallback);
      setSearchParams({ tab: fallback }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs, tabFromUrl, user]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const handleEditClick = (policy) => {
    setEditingPolicy(policy);
    
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleFormSuccess = () => {
    setEditingPolicy(null);
    setRefreshTrigger(prev => prev + 1);
    if (listRef.current) {
      listRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleCancelEdit = () => {
    setEditingPolicy(null);
    if (listRef.current) {
      listRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <MainLayout>
      <main className="settings-container">
        {/* Top tabs — sab settings ka tab sabse upar */}
        <div className="settings-tabs" role="tablist" aria-label="Settings sections">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              className={`settings-tab ${activeTab === id ? "active" : ""}`}
              onClick={() => handleTabChange(id)}
            >
              {Icon && <Icon size={15} />}
              {label}
            </button>
          ))}
        </div>

        <div className="settings-tab-content">
          {activeTab === "profile" && (
            <div className="settings-grid">
              <ProfileCard />
              <div className="settings-notification-section">
                <NotificationsCard />
              </div>
            </div>
          )}

          {activeTab === "organization" && <OrgProfileCard />}

          {activeTab === "shifts" && (
            <div className="settings-bottom-grid">
              <ShiftManager vendorId={user?.vendorId} />
              <WeekOffManager vendorId={user?.vendorId} />
            </div>
          )}

          {activeTab === "holidays" && (
            <HolidayManager vendorId={user?.vendorId} />
          )}

          {activeTab === "leave-policy" && <LeavePolicyManager />}

          {activeTab === "probation" && <ProbationPolicyManager />}

          {activeTab === "salary" && (
            <div className="settings-bottom-grid">
              {roleHasPermission(user?.role, "payroll:structure") && (
                <SalaryStructure />
              )}
              {roleHasPermission(user?.role, "payroll:components") && (
                <SalaryComponentManager />
              )}
            </div>
          )}

          {activeTab === "overtime" && (
            <div className="settings-bottom-grid">
              <div ref={listRef} className="ot-list-scroll-target">
                <OverTimePolicyList
                  vendorId={user?.vendorId}
                  onEditPolicy={handleEditClick}
                  refreshTrigger={refreshTrigger}
                />
              </div>

              <div ref={formRef} className="ot-form-scroll-target">
                <OverTimePolicy
                  vendorId={user?.vendorId}
                  editingPolicy={editingPolicy}
                  onSuccess={handleFormSuccess}
                  onCancel={handleCancelEdit}
                />
              </div>
            </div>
          )}

          {activeTab === "security" && <SecurityCard />}

          {/* Roles tab commented */}
          {/* {activeTab === "roles" && <RolesCard />} */}
        </div>
      </main>
    </MainLayout>
  );
}