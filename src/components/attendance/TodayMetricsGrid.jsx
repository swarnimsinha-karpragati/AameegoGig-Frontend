import "./TodayMetricsGrid.css";

function TodayMetricsGrid({ metrics }) {
  return (
    <div className="attendance-metrics-grid">
      {metrics.map(({ key, label, value, icon: Icon, accent }) => (
        <div key={key} className={`attendance-metric-card ${accent}`}>
          <div className="attendance-metric-icon" aria-hidden="true">
            <Icon size={18} strokeWidth={2} />
          </div>
          <div className="attendance-metric-content">
            <span className="attendance-metric-label">{label}</span>
            <strong className="attendance-metric-value">{value}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}

export default TodayMetricsGrid;
