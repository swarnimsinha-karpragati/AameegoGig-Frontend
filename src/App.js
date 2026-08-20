import { useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
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
import { getCurrentUser } from './services/authService';
import NotFound from './pages/NotFound';

function App() {
  const navigate = useNavigate();

  const { data, isError, isSuccess } = useQuery({
    queryKey: ['auth'],
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  // Handle side-effects safely inside useEffect
  useEffect(() => {
    if (isError) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      navigate('/login');
    }
    if (isSuccess && data?.user) {
      localStorage.setItem("user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("user-updated"));
    }
    // eslint-disable-next-line 
  }, [isError, isSuccess, data]);

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<UnProtectedRoute><Navigate to="/login" replace /></UnProtectedRoute>} />
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
        <Route path=":vendor/expenses" element={<ProtectedRoute><Expense /></ProtectedRoute>} />
        <Route path=":vendor/resignation" element={<ProtectedRoute><Resignations /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;