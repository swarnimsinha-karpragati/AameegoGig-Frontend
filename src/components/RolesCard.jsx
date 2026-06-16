import React from "react";
import { ShieldCheck, Users } from "lucide-react";
import "./RolesCard.css";

export default function RolesCard() {

  function RoleItem({
    title,
    role,
  }) {

    return (
      <div className="role-item">

        <div className="role-item-left">

          <Users
            size={16}
            color="#3b82f6"
          />

          <div>

            <h4 className="role-item-title">
              {title}
            </h4>

            <p className="role-item-subtitle">
              {role}
            </p>

          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="roles-card">

      <div className="roles-header">

        <div className="roles-icon-box">

          <ShieldCheck
            size={18}
            color="#7c3aed"
          />

        </div>

        <div>

          <h3 className="roles-title">
            Roles & Permissions
          </h3>

          <p className="roles-subtitle">
            Access management
          </p>

        </div>

      </div>

      <RoleItem
        title="Admin Access"
        role="Full Control"
      />

      <RoleItem
        title="HR Manager"
        role="Manage Employees"
      />

      <RoleItem
        title="Team Lead"
        role="Limited Access"
      />

      <RoleItem
        title="Employee"
        role="Limited Access"
      />

    </div>
  );
}