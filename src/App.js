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

function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/create-org" element={<CreateOrg />} />
        <Route path="/join" element={<JoinOrg />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees"
          element={
            <ProtectedRoute>
              <Employees />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <Documents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payroll"
          element={
            <ProtectedRoute>
              <Payroll />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <Attendance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leave"
          element={
            <ProtectedRoute>
              <Leave />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
