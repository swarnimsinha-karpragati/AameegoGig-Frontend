import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Clock3,
  CalendarDays,
  Wallet,
  LogOut,
  FileText,
  Settings,
  Building2,
  ReceiptText,
} from "lucide-react";

import "../pages/Dashboard.css";
import { canAccessRoute, getRoleLabel, getStoredUser } from "../utils/roles";



function MainLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const user = getStoredUser();

  const pageMeta = {
    "/dashboard": {
      title: "Dashboard",
      subtitle: "Welcome back! Here's what's happening today.",
    },
    "/departments": {
      title: "Departments",
      subtitle: "Manage your organization departments.",
    },
    "/employees": {
      title: "Employees",
      subtitle: "Manage your organization workforce.",
    },
    "/attendance": {
      title: "Attendance",
      subtitle: "Track and manage employee attendance.",
    },
    "/leave": {
      title: "Leave",
      subtitle: "Review and approve employee leave requests.",
    },
    "/payroll": {
      title: "Payroll",
      subtitle: "Manage salaries and payroll processing.",
    },
    "/expenses": {
      title: "Expenses",
      subtitle: "Submit and manage expense claims.",
    },
    "/documents": {
      title: "Documents",
      subtitle: "Store and manage company documents.",
    },
    "/settings": {
      title: "Settings",
      subtitle: "Configure your HRMS preferences.",
    },
  };

  const currentPage =
    pageMeta[location.pathname] || pageMeta["/dashboard"];

  const menuItems = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Departments",
      path: "/departments",
      icon: Building2,
    },
    {
      label: "Employees",
      path: "/employees",
      icon: Users,
    },
    {
      label: "Attendance",
      path: "/attendance",
      icon: Clock3,
    },
    {
      label: "Leave",
      path: "/leave",
      icon: CalendarDays,
    },
    {
      label: "Payroll",
      path: "/payroll",
      icon: Wallet,
    },
    {
      label: "Expenses",
      path: "/expenses",
      icon: ReceiptText,
    },
    {
      label: "Documents",
      path: "/documents",
      icon: FileText,
    },
    {
      label: "Settings",
      path: "/settings",
      icon: Settings,
    },
  ].filter((item) => canAccessRoute(user?.role, item.path));


  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
          
            <h1>
              Aameego <span>Gig</span>
            </h1>

            <p style={{fontSize:'12px',fontWeight:'700'}}>Human Resource Management System</p>
          </div>

          <div className="client-info">
    {user?.vendorName}
  </div>
          <nav className="sidebar-menu">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <button
                  key={item.path}
                  type="button"
                  className={`menu-item ${isActive ? "active" : ""}`}
                  onClick={() => navigate(item.path)}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.name?.charAt(0) || "U"}
          </div>

          <div className="user-meta">
            <h4>{user?.name || "User"}</h4>
            <p>{getRoleLabel(user?.role)}</p>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <div className="topbar">
          <div>
            <h2>{currentPage.title}</h2>
            <p>{currentPage.subtitle}</p>
          </div>

          <button
            type="button"
            className="logout-btn"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              navigate("/login");
            }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>

        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

export default MainLayout;
