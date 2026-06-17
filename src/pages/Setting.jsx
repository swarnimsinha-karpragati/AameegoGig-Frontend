import React, { useEffect, useState } from "react";
import "./Settings.css";
import MainLayout from "../layouts/MainLayout";

import ProfileCard from "../components/ProfileCard";
import NotificationsCard from "../components/NotificationsCard";
import SecurityCard from "../components/SecurityCard";
import RoleTabs from "../components/RoleTabs";
import RolesCard from "../components/RolesCard";
import EmployeeProfileCard from "../components/EmployeeProfileCard";
import ShiftManager from "../components/ShiftManager";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("admin");
  const [user,setUser] = useState(null);

  useEffect(()=>{
    const loggedInUser = localStorage.getItem('user')
    if(!loggedInUser) return;
    const parsedUser = JSON.parse(loggedInUser);
    setUser(parsedUser);
  },[])

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

        <RoleTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

      </div>

      {activeTab === "admin" ? (
        <>

          <div className="settings-grid">

            <ProfileCard />

            <div className="settings-notification-section">
              <NotificationsCard />
            </div>

          </div>

          <div className="settings-bottom-grid">

            <ShiftManager vendorId={user?.vendorId}/>

            <RolesCard />

            <SecurityCard />

          </div>

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