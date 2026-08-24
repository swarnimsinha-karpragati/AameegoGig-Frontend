import { useEffect } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import './App.css';

import { ProtectedRoute, UnProtectedRoute } from './components/ProtectedRoute';
import Login from './auth/Login';
import CreateOrg from './pages/CreateOrg';
import JoinOrg from './pages/JoinOrg';
import Dashboard from './pages/Dashboard';
import Employees from "./pages/Employees";
import Documents from "./pages/Documents";
import Settings from "./pages/Setting";
import Payroll from './pages/Payroll';
import Attendance from "./pages/Attendance";
import Leave from "./pages/Leave";
import Departments from './pages/Department';
import Expense from "./pages/Expense";
import ForgotPassword from './pages/ForgotPassword';
// import ForgotOrgCode from './pages/ForgotOrgCode';
import Resignations from './pages/Resignations';
import LeavePolicy from './pages/LeavePolicy';
import { getCurrentUser } from './services/authService';
import NotFound from './pages/NotFound';
import Landing from './pages/Landing';

function App() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const { data, isError, isSuccess } = useQuery({
    queryKey: ['auth'],
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5,
    retry: false,
    enabled: !!token,
  });

  useEffect(() => {
    if (isError) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }
    if (isSuccess && data?.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("user-updated"));
    }

    const path = window.location.pathname;
    const lastPath = path.split("/").filter(Boolean).pop() || "Home";
    const pageName = lastPath
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());

    document.title = `Workza - ${pageName}`;

    // eslint-disable-next-line
  }, [isError, isSuccess, data, navigate]);

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<UnProtectedRoute><Login /></UnProtectedRoute>} />
        <Route path="/create-org" element={<UnProtectedRoute><CreateOrg /></UnProtectedRoute>} />
        <Route path="/join" element={<UnProtectedRoute><JoinOrg /></UnProtectedRoute>} />
        <Route path="/forgot-password" element={<UnProtectedRoute><ForgotPassword /></UnProtectedRoute>} />
        {/* <Route path="/forgot-org-code" element={<ForgotOrgCode />} /> */}

        {/* Protected Vendor Routes */}
        <Route path=":vendor/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path=":vendor/departments" element={<ProtectedRoute><Departments /></ProtectedRoute>} />
        <Route path=":vendor/sites" element={<ProtectedRoute><Departments /></ProtectedRoute>} />
        <Route path=":vendor/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
        <Route path=":vendor/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
        <Route path=":vendor/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path=":vendor/payroll" element={<ProtectedRoute><Payroll /></ProtectedRoute>} />
        <Route path=":vendor/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
        <Route path=":vendor/leave" element={<ProtectedRoute><Leave /></ProtectedRoute>} />
        <Route path=":vendor/leave/policy" element={<ProtectedRoute><LeavePolicy /></ProtectedRoute>} />
        <Route path=":vendor/expenses" element={<ProtectedRoute><Expense /></ProtectedRoute>} />
        <Route path=":vendor/resignation" element={<ProtectedRoute><Resignations /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;