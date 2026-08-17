import { UserCheck, UserX, TriangleAlert, Clock} from "lucide-react";
import Card from "../Card";
import "./AttendanceStats.css";

function AttendanceStats({ stats, labels }) {
  const items = [
    { key: "Present", icon: UserCheck, className: "green", label: labels?.Present || "Present" },
    { key: "Absent", icon: UserX, className: "orange", label: labels?.Absent || "Absent" },
    { key: "Half Day", icon: TriangleAlert, className: "blue", label: labels?.["Half Day"] || "Half Day" },
    { key: "Late", icon: Clock, className: "purple", label: labels?.Late || "Late" },
  ];

  return (
    <div className="payroll-stats-grid">
      {items.map(({ key, icon: Icon, className, label }) => (
        <Card key={key} icon={<Icon size={22} strokeWidth={2} />} iconClassName={className}>
          <Card.Header>{label}</Card.Header>
          <Card.Body>{stats[key] || 0}</Card.Body>
        </Card>
      ))}
    </div>
  ); 
}

export default AttendanceStats;
