import { useEffect, useReducer } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Button, Spinner } from "../design-system";
import {
  canAccessRoute,
  getRoleAccessStatus,
  getStoredUser,
  isRoleCatalogued,
  loadRoleAccess,
  ROLE_ACCESS_STATUS,
  subscribeRoleAccess,
} from "../utils/roles";
import { vendorDashboardPath } from "../utils/vendorPath";

export const ACCESS_CHECK_COPY = Object.freeze({
  failedTitle: "Couldn't check your access",
  failedMessage: "Your connection may be slow or offline. Try again to open this page.",
  retry: "Retry",
});

const CENTERED = { display: "grid", placeItems: "center", minHeight: "60vh" };

/**
 * A custom role missing from the local catalog reads as "no permissions", so a route the
 * cache would refuse waits for the session before deciding. Routes the cache already allows
 * render at once. A failed or timed-out load is not a refusal: it shows Retry, retries on the
 * next navigation, and a late answer still opens the page.
 */
function useRoleAccessGate(role, allowed, pathname) {
  const needsSession = Boolean(role) && !allowed && !isRoleCatalogued(role);
  const [, rerender] = useReducer((count) => count + 1, 0);

  useEffect(() => {
    const unsubscribe = subscribeRoleAccess(rerender);
    window.addEventListener("roles-updated", rerender);
    window.addEventListener("user-updated", rerender);
    return () => {
      unsubscribe();
      window.removeEventListener("roles-updated", rerender);
      window.removeEventListener("user-updated", rerender);
    };
  }, []);

  useEffect(() => {
    if (needsSession) loadRoleAccess(role);
  }, [needsSession, role, pathname]);

  return {
    status: needsSession ? getRoleAccessStatus(role) : ROLE_ACCESS_STATUS.LOADED,
    retry: () => loadRoleAccess(role),
  };
}

function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const user = token ? getStoredUser() : null;
  const allowed = Boolean(user) && canAccessRoute(user.role, location.pathname, user.allowedModules);
  const { status, retry } = useRoleAccessGate(user?.role, allowed, location.pathname);

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowed) return children;

  if (status === ROLE_ACCESS_STATUS.FAILED) {
    return (
      <div className="wz-ds" style={CENTERED}>
        <div role="alert" style={{ display: "grid", gap: 12, justifyItems: "center", textAlign: "center", maxWidth: 360 }}>
          <h2 className="wz-text-h3">{ACCESS_CHECK_COPY.failedTitle}</h2>
          <p style={{ margin: 0 }}>{ACCESS_CHECK_COPY.failedMessage}</p>
          <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={retry}>
            {ACCESS_CHECK_COPY.retry}
          </Button>
        </div>
      </div>
    );
  }

  if (status !== ROLE_ACCESS_STATUS.LOADED) {
    return (
      <div className="wz-ds" style={CENTERED}>
        <Spinner size="lg" />
      </div>
    );
  }

  return <Navigate to={vendorDashboardPath(user)} replace />;
}

function UnProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  const user = getStoredUser();

  if(token && user){
     return <Navigate to={vendorDashboardPath(user)} replace />;
  }

  return children;
}

export { ProtectedRoute, UnProtectedRoute };
