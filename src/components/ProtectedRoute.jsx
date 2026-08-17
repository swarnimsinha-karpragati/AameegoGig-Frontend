import { Navigate, useLocation } from "react-router-dom";
import { canAccessRoute, getStoredUser } from "../utils/roles";

function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!canAccessRoute(user.role, location.pathname) && user && token) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
function UnProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  const user = getStoredUser();
  const vendorname =  user?.vendorName?.trim()?.replace(/\s+/g, "-").toLowerCase() || "";

  if(token && user){
     return <Navigate to={`${vendorname}/dashboard`} replace />;
  }

  return children;
}

export {ProtectedRoute,UnProtectedRoute};
