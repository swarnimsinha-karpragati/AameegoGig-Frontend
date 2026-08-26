import { useEffect, useState } from "react";
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
  FileSignature
} from "lucide-react";

import "../pages/Dashboard.css";
import { canAccessRoute, getRoleLabel, getStoredUser } from "../utils/roles";
import { resolveMediaUrl } from "../utils/mediaUrl";
import defaultLogo from "../assets/logo.png";
import { getOrgProfile } from "../services/vendorService";
import { isSiteVendor } from "../utils/vendorIdhelper";
import { clearAuthData } from "../utils/authStorage";
import HelpDeskWidget from "../components/HelpDeskWidget";



function MainLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(() => getStoredUser());
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [vendorCode, setVendorCode] = useState("")

  useEffect(() => {
    const refreshUser = () => {
      const storedUser = getStoredUser();
      setUser(storedUser);
      setAvatarBroken(false);
      const formatName = storedUser?.vendorName?.trim()?.replace(/\//g, "")?.replace(/\s+/g, "-").toLowerCase() || "";
      setVendorCode(formatName);
    };
    window.addEventListener("storage", refreshUser);
    window.addEventListener("user-updated", refreshUser);
    refreshUser();
    return () => {
      window.removeEventListener("storage", refreshUser);
      window.removeEventListener("user-updated", refreshUser);
    };
  }, []);

  const avatarSrc = resolveMediaUrl(user?.photoDisplayUrl, user?.photoUrl);

  const isSite = isSiteVendor();

  const normalizeRoutePath = (pathname) => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 1) {
      return `/${segments.slice(1).join("/")}`;
    }
    return pathname || "/";
  };

  const currentPath = normalizeRoutePath(location.pathname);

  const pageMeta = {
    "/dashboard": {
      title: "Dashboard",
      subtitle: "Welcome back! Here's what's happening today",
    },
    "/sites": {
      title: "Sites",
      subtitle: "Manage your organization sites",
    },
    "/departments": {
      title: "Departments",
      subtitle: "Manage your organization departments",
    },
    "/employees": {
      title: "Employees",
      subtitle: "Manage your organization workforce",
    },
    "/attendance": {
      title: "Attendance",
      subtitle: "Track and manage employee attendance",
    },
    "/leave": {
      title: "Leave",
      subtitle: "Review and approve employee leave requests",
    },
    "/payroll": {
      title: "Payroll",
      subtitle: "Manage salaries and payroll processing",
    },
    "/expenses": {
      title: "Expenses",
      subtitle: "Submit and manage expense claims",
    },
    "/advance-loan": {
      title: "Advance Loan",
      subtitle: "Submit and manage Advance Loan claims",
    },
    "/resignation": {
      title: "Resignation",
      subtitle: "Submit and manage resignation",
    },
    "/documents": {
      title: "Documents",
      subtitle: "Store and manage company documents",
    },
    "/settings": {
      title: "Settings",
      subtitle: "Configure your HRMS preferences",
    },
  };

  const currentPage =
    pageMeta[currentPath] || pageMeta["/dashboard"];

  const menuItems = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: isSite ? "Sites" : "Departments",
      path: isSite ? "/sites" : "/departments",
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
      label: "Advance Loan",
      path: "/advance-loan",
      icon: Wallet,
    },
    {
      label: "Documents",
      path: "/documents",
      icon: FileText,
    },
    {
      label: "Resignation",
      path: "/resignation",
      icon: FileSignature,
    },
    {
      label: "Settings",
      path: "/settings",
      icon: Settings,
    },
  ].filter((item) =>
    canAccessRoute(user?.role, item.path, user?.allowedModules)
  );

  const [logo, setLogo] = useState(() => {
    const storedUser = getStoredUser();
    return resolveMediaUrl(storedUser?.logoDisplayUrl, storedUser?.logoUrl) || null;
  });

  useEffect(() => {
    let isMounted = true;

    const fetchLogo = async () => {
      const userLogo = resolveMediaUrl(user?.logoDisplayUrl, user?.logoUrl);
      if (userLogo) {
        if (isMounted) setLogo(userLogo);
        return;
      }

      try {
        const res = await getOrgProfile();
        const profileData = res.data?.data;
        if (profileData && isMounted) {
          const resolved = resolveMediaUrl(profileData.logoDisplayUrl, profileData.logoUrl);
          if (resolved) {
            setLogo(resolved);
            const storedUser = getStoredUser();
            if (storedUser) {
              storedUser.logoUrl = profileData.logoUrl;
              storedUser.logoDisplayUrl = profileData.logoDisplayUrl;
              localStorage.setItem("user", JSON.stringify(storedUser));
            }
          }
        }
      } catch (err) {
        // Silently catch error if API is inaccessible or fails
      }
    };

    fetchLogo();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line
  }, []);


  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">

            {/* <h1>
              Aameego <span>Gig</span>
            </h1> */}
            <img
              src={logo ? logo : defaultLogo}
              alt="Logo"
              onError={() => setLogo(null)}
              width="60%"
              height="auto"
              style={{ padding: '1rem 0rem' }}
            />

            <p style={{ fontSize: '12px', fontWeight: '700', marginBottom: '5px' }}>
              {isSite ? "We make your lives simpler." : "One Workforce. One Platform."}
            </p>
          </div>

          {/* <div className="client-info">
            {user?.vendorName}
          </div> */}
          <nav className="sidebar-menu">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;

              return (
                <button
                  key={item.path}
                  type="button"
                  className={`menu-item ${isActive ? "active" : ""}`}
                  onClick={() => navigate(`/${vendorCode}${item.path}`)}
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
            {avatarSrc && !avatarBroken ? (
              <img
                src={avatarSrc}
                alt=""
                className="user-avatar-img"
                onError={() => setAvatarBroken(true)}
              />
            ) : (
              user?.name?.charAt(0) || "U"
            )}
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
              clearAuthData();
              navigate("/login");
            }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>

        <main className="page-content">{children}</main>
      </div>

      <HelpDeskWidget />
    </div>
  );
}

export default MainLayout;
