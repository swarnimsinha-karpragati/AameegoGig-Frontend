import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
<<<<<<< HEAD
=======
import ProtectedRoute from './components/ProtectedRoute';
>>>>>>> origin/main
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
<<<<<<< HEAD
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/employees" element={<Employees />} />
        {/* <Route path="/attendance" element={<div>Attendance Page</div>} />
        <Route path="/leave" element={<div>Leave Page</div>} /> */}
        {/* <Route path="/payroll" element={<div>Payroll Page</div>} /> */}
        <Route path="/documents" element={<Documents />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/login" element={<Login />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/leave" element={<Leave />} />
        {/* <Route path="/payroll" element={<div>Payroll Page</div>} /> */}
        <Route path="/documents" element={<Documents/>} />
=======
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
>>>>>>> origin/main
      </Routes>
    </div>
  );
}

export default App;
