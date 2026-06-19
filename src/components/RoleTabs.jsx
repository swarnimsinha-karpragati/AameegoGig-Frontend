import React from "react";
import { ShieldCheck, Users } from "lucide-react";
import "./RoleTabs.css";

export default function RoleTabs({
  activeTab,
  setActiveTab,
  role
}) {

  return (
    <div className="role-tabs">
      {role === "Admin" || role === "HR" ? (
        <>
          <button
            className={`role-btn ${
              activeTab === "admin"
                ? "active-role"
                : ""
            }`}
            onClick={() =>
              setActiveTab("admin")
            }
          >
            <ShieldCheck size={16} />
            Admin
          </button>

          <button
            className={`role-btn ${
              activeTab === "employee"
                ? "active-role"
                : ""
            }`}
            onClick={() =>
              setActiveTab("employee")
            }
          >
            <Users size={16} />
            Employee
          </button>
        </>
      ) : (
        <button
          className={`role-btn ${
            activeTab === "employee"
              ? "active-role"
              : ""
          }`}
          onClick={() =>
            setActiveTab("employee")
          }
        >
          <Users size={16} />
          Employee
        </button>
      )}
    </div>
  );
}