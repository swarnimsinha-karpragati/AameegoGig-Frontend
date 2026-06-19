import { Link } from "react-router-dom";

function Sidebar() {
  return (
    <div className="sidebar">
      <h2>Aameego</h2>

      <nav>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="#">Departments</Link>
        <Link to="#">Employees</Link>
        <Link to="#">Attendance</Link>
        <Link to="#">Payroll</Link>
        <Link to="#">Documents</Link>
        <Link to="#">Settings</Link>
      </nav>
    </div>
  );
}

export default Sidebar;