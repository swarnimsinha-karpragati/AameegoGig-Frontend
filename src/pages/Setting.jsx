import React, { useEffect, useState, useRef } from "react";
import "./Settings.css";
import MainLayout from "../layouts/MainLayout";

import ProfileCard from "../components/ProfileCard";
import NotificationsCard from "../components/NotificationsCard";
import SecurityCard from "../components/SecurityCard";
import RoleTabs from "../components/RoleTabs";
import RolesCard from "../components/RolesCard";
import EmployeeProfileCard from "../components/EmployeeProfileCard";
import ShiftManager from "../components/ShiftManager";
import { OverTimePolicy } from "../components/OverTimePolicy";
import { OverTimePolicyList } from "../components/OverTimePolicyList";
import HolidayManager from "../components/HolidayManager";
import WeekOffManager from "../components/WeekOffManager";
import PayrollConfigCard from "../components/PayrollConfigCard";
import SalaryComponentManager from "../components/SalaryComponentManager";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("admin");
  const [user, setUser] = useState(null);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const formRef = useRef(null);

  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (!loggedInUser) return;
    const parsedUser = JSON.parse(loggedInUser);
    setUser(parsedUser);
  }, []);
  console.log(user);

  const handleEditClick = (policy) => {
    setEditingPolicy(policy);
    
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleFormSuccess = () => {
    setEditingPolicy(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCancelEdit = () => {
    setEditingPolicy(null);
  };

  return (
    <MainLayout>
      <main className="settings-container">
        <div className="settings-header">
          <div>
            <h1 className="settings-title">Settings</h1>
            <p className="settings-subtitle">
              Manage account preferences & system settings
            </p>
          </div>
          <RoleTabs activeTab={activeTab} setActiveTab={setActiveTab} role={user?.role} />
        </div>

        {activeTab === "admin" ? (
          <>
            <div className="settings-grid">
              <ProfileCard />
              <div className="settings-notification-section">
                <NotificationsCard />
              </div>
            </div>
          { user?.role === "Admin" || user?.role === "HR" ? (
            <div className="settings-bottom-grid">
              <ShiftManager vendorId={user?.vendorId} />

              <WeekOffManager vendorId={user?.vendorId} />

              <HolidayManager vendorId={user?.vendorId} />

              <PayrollConfigCard />

              <SalaryComponentManager />
              
              <OverTimePolicyList 
                vendorId={user?.vendorId} 
                onEditPolicy={handleEditClick}
                refreshTrigger={refreshTrigger}
              />
              
              <div ref={formRef} className="ot-form-scroll-target">
                <OverTimePolicy 
                  vendorId={user?.vendorId} 
                  editingPolicy={editingPolicy}
                  onSuccess={handleFormSuccess}
                  onCancel={handleCancelEdit}
                />
              </div>

              <RolesCard />
              <SecurityCard />
            </div>
          ):null}
          </>
        ) : (
          <div className="settings-grid">
            <EmployeeProfileCard />
            <div className="settings-notification-section">
              <NotificationsCard />
            </div>
          </div>
        )}
      </main>
    </MainLayout>
  );
}