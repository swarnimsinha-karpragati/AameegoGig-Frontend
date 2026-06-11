import { Navigate, useLocation } from "react-router-dom";
import { canAccessRoute, getStoredUser } from "../utils/roles";

function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!canAccessRoute(user.role, location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;
