import { useEffect, useState, useMemo } from "react";
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
  FileSignature,
  ClipboardPen,
  ShieldCheck,
  Menu,
  X,
  ChevronsLeft
} from "lucide-react";

import "../pages/Dashboard.css";
import { canAccessRoute, getRoleLabel, getStoredUser, SYSTEM_ROLE_NAMES, fetchRolesCatalog, rolesCatalogKey, syncRolesFromServer, refreshSessionFromServer } from "../utils/roles";
import { loadRoles, saveRoles } from "../utils/permissions";
import { resolveMediaUrl } from "../utils/mediaUrl";
import defaultLogo from "../assets/logo.png";
import { getOrgProfile } from "../services/vendorService";
import { isSiteVendor } from "../utils/vendorIdhelper";
import { clearAuthData } from "../utils/authStorage";
import queryClient from "../queryClient";
import HelpDeskWidget from "../components/HelpDeskWidget";

function MainLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(() => getStoredUser());
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("sidebar-collapsed") === "1"
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 900
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const onChange = (e) => {
      setIsMobile(e.matches);
      if (e.matches) setSidebarCollapsed(false);
      else setMobileNavOpen(false);
    };
    setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  // Mobile drawer khulne par background scroll lock, route badalne par auto-close.
  useEffect(() => {
    document.body.style.overflow = mobileNavOpen && isMobile ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen, isMobile]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Sync state dynamically whenever local storage changes.
  // roles-updated also triggers a (throttled) server re-fetch so a Roles-page
  // save made elsewhere is picked up instead of trusting stale local data.
  useEffect(() => {
    const refreshUser = () => {
      const storedUser = getStoredUser();
      setUser(storedUser);
      setAvatarBroken(false);
    };
    const refreshRoles = () => {
      refreshUser();
      syncRolesFromServer();
    };

    window.addEventListener("storage", refreshRoles);
    window.addEventListener("user-updated", refreshUser);
    window.addEventListener("roles-updated", refreshRoles);
    refreshUser();
    syncRolesFromServer();

    return () => {
      window.removeEventListener("storage", refreshRoles);
      window.removeEventListener("user-updated", refreshUser);
      window.removeEventListener("roles-updated", refreshRoles);
    };
  }, []);

  // Route (component) change → ALWAYS re-fetch roles/permissions from the
  // server and apply when changed, so a newly granted tab/permission shows
  // up immediately without a page refresh. Compare-first keeps this
  // loop-free: an unchanged catalog is never re-saved, so no extra
  // "roles-updated" event fires.
  useEffect(() => {
    let cancelled = false;
    // Live session first: an Administrator role reassignment lands here.
    refreshSessionFromServer().catch(() => { });
    fetchRolesCatalog().then((merged) => {
      if (cancelled || !merged) return;
      if (rolesCatalogKey(merged) !== rolesCatalogKey(loadRoles())) {
        saveRoles(merged); // fires "roles-updated" → refreshUser above re-renders
      } else {
        setUser(getStoredUser());
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Compute fresh Vendor Code slug whenever user vendorName changes
  const vendorCode = useMemo(() => {
    return user?.vendorName?.trim()?.replace(/\//g, "")?.replace(/\s+/g, "-").toLowerCase() || "";
  }, [user?.vendorName]);

  // Dynamic Name Resolution
  const displayName = useMemo(() => {
    if (
      user?.role === "HR" ||
      user?.role === "Employee" ||
      !SYSTEM_ROLE_NAMES.includes(user?.role)
    ) {
      return user?.name || user?.employeeName || user?.vendorName || "User";
    }
    return user?.vendorName || "User";
  }, [user]);

  // Sync URL when vendorCode changes dynamically
  useEffect(() => {
    if (!vendorCode) return;
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const currentVendorInUrl = pathSegments[0];

    // If URL vendorCode doesn't match updated vendorCode state, update URL params
    if (currentVendorInUrl && currentVendorInUrl !== vendorCode) {
      const remainingPath = pathSegments.slice(1).join("/");
      navigate(`/${vendorCode}/${remainingPath}`, { replace: true });
    }
  }, [vendorCode, location.pathname, navigate]);

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
    "/dashboard": { title: "Dashboard", subtitle: "Welcome back! Here's what's happening today" },
    "/sites": { title: "Sites", subtitle: "Manage your organization sites" },
    "/departments": { title: "Departments", subtitle: "Manage your organization departments" },
    "/employees": { title: "Employees", subtitle: "Manage your organization workforce" },
    "/attendance": { title: "Attendance", subtitle: "Track and manage employee attendance" },
    "/leave": { title: "Leave", subtitle: "Review and approve employee leave requests" },
    "/leave/policy": { title: "Leave Policy", subtitle: "Set up how employees earn, use and carry forward leave" },
    "/regularization": {
      title: "Regularization",
      subtitle: "Request and approve attendance and leave corrections",
    },
    "/payroll": { title: "Payroll", subtitle: "Manage salaries and payroll processing" },
    "/expenses": { title: "Expenses", subtitle: "Submit and manage expense claims" },
    "/advance-loan": { title: "Advance Loan", subtitle: "Submit and manage Advance Loan claims" },
    "/resignation": { title: "Resignation", subtitle: "Submit and manage resignation" },
    "/documents": { title: "Documents", subtitle: "Store and manage company documents" },
    "/settings": { title: "Settings", subtitle: "Configure your HRMS preferences" },
    "/roles": { title: "Roles & Access", subtitle: "Manage role-based access control" },
  };

  const currentPage = pageMeta[currentPath] || pageMeta["/dashboard"];

  const menuItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: isSite ? "Sites" : "Departments", path: isSite ? "/sites" : "/departments", icon: Building2 },
    { label: "Employees", path: "/employees", icon: Users },
    { label: "Attendance", path: "/attendance", icon: Clock3 },
    { label: "Leave", path: "/leave", icon: CalendarDays },
    { label: "Regularization", path: "/regularization", icon: ClipboardPen },
    { label: "Payroll", path: "/payroll", icon: Wallet },
    { label: "Expenses", path: "/expenses", icon: ReceiptText },
    { label: "Advance Loan", path: "/advance-loan", icon: Wallet },
    { label: "Documents", path: "/documents", icon: FileText },
    { label: "Resignation", path: "/resignation", icon: FileSignature },
    { label: "Settings", path: "/settings", icon: Settings },
  ].filter((item) => canAccessRoute(user?.role, item.path, user?.allowedModules));

  // Sidebar visibility MUST use the same gate as ProtectedRoute — raw
  // roleHasPermission("roles:manage") is true for stale catalog grants
  // while canAccessRoute("/roles") denies them, leaving a dead menu item
  // that shows but never opens. Single source of truth = canAccessRoute.
  if (canAccessRoute(user?.role, "/roles", user?.allowedModules)) {
    menuItems.push({ label: "Roles & Access", path: "/roles", icon: ShieldCheck });
  }

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
    <div
      className={`dashboard-layout${sidebarCollapsed && !isMobile ? " sidebar-collapsed" : ""}${mobileNavOpen ? " mobile-nav-open" : ""}`}
    >
      {mobileNavOpen && isMobile && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-row">
              <img
                src={logo ? logo : defaultLogo}
                alt="Logo"
                onError={() => setLogo(null)}
                width="60%"
                height="auto"
                style={{ padding: '1rem 0rem' }}
              />
              <div className="sidebar-toggle-wrap">
                {!isMobile && (
                  <button
                    type="button"
                    className="sidebar-toggle-btn"
                    onClick={() => setSidebarCollapsed((v) => !v)}
                    title={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}
                    aria-label={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}
                  >
                    <ChevronsLeft size={18} className={sidebarCollapsed ? "flip" : ""} />
                  </button>
                )}
                {isMobile && (
                  <button
                    type="button"
                    className="sidebar-toggle-btn"
                    onClick={() => setMobileNavOpen(false)}
                    title="Close menu"
                    aria-label="Close menu"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

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
                  title={item.label}
                  onClick={() => {
                    navigate(`/${vendorCode}${item.path}`);
                    if (isMobile) setMobileNavOpen(false);
                  }}
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
              displayName.charAt(0).toUpperCase() || "U"
            )}
          </div>

          <div className="user-meta">
            <h5 className="user-vendor-name" title={displayName}>
              {displayName}
            </h5>
            <p className="user-role-badge">{getRoleLabel(user?.role)}</p>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <div className="topbar">
          <div className="topbar-left">
            {isMobile ? (
              <button
                type="button"
                className="sidebar-toggle-btn hamburger"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
            ) : (
              sidebarCollapsed && (
                <button
                  type="button"
                  className="sidebar-toggle-btn hamburger"
                  onClick={() => setSidebarCollapsed(false)}
                  aria-label="Open sidebar"
                  title="Open sidebar"
                >
                  <Menu size={20} />
                </button>
              )
            )}
            <div>
              <h2>{currentPage.title}</h2>
              <p>{currentPage.subtitle}</p>
            </div>
          </div>

          <button
            type="button"
            className="logout-btn"
            onClick={() => {
              queryClient.clear();
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
