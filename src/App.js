import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import ProtectedRoute from './components/ProtectedRoute';
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
import ForgotOrgCode from './pages/ForgotOrgCode';
import Resignations from './pages/Resignations';

function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/create-org" element={<CreateOrg />} />
        <Route path="/join" element={<JoinOrg />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/forgot-org-code" element={<ForgotOrgCode />} />
        <Route
          path=":vendor/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path=":vendor/departments"
          element={
            <ProtectedRoute>
              <Departments />
            </ProtectedRoute>
          }
        />
        <Route
          path=":vendor/sites"
          element={
            <ProtectedRoute>
              <Departments />
            </ProtectedRoute>
          }
        />
        <Route
          path=":vendor/employees"
          element={
            <ProtectedRoute>
              <Employees />
            </ProtectedRoute>
          }
        />
        <Route
          path=":vendor/documents"
          element={
            <ProtectedRoute>
              <Documents />
            </ProtectedRoute>
          }
        />
        <Route
          path=":vendor/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path=":vendor/payroll"
          element={
            <ProtectedRoute>
              <Payroll />
            </ProtectedRoute>
          }
        />
        <Route
          path=":vendor/attendance"
          element={
            <ProtectedRoute>
              <Attendance />
            </ProtectedRoute>
          }
        />
        <Route
          path=":vendor/leave"
          element={
            <ProtectedRoute>
              <Leave />
            </ProtectedRoute>
          }
        />
        <Route
          path=":vendor/expenses"
          element={
            <ProtectedRoute>
              <Expense />
            </ProtectedRoute>
          }
        />
        <Route
          path=":vendor/resignation"
          element={
            <ProtectedRoute>
              <Resignations />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
