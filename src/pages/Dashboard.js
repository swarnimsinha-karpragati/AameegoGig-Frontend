import MainLayout from "../layouts/MainLayout";

function Dashboard() {
  return (
    <MainLayout>
      <div className="dashboard-page">

        {/* STATS */}
        <div className="stats-grid">

          <div className="stat-card">
            <div>
              <h4>Total Employees</h4>
              <h2>248</h2>
              <p className="positive">
                ↗ +12% vs last month
              </p>
            </div>

            <div className="stat-icon blue">
              👥
            </div>
          </div>

          <div className="stat-card">
            <div>
              <h4>Present Today</h4>
              <h2>234</h2>
              <p className="positive">
                ↗ 94.4% attendance
              </p>
            </div>

            <div className="stat-icon green">
              ✓
            </div>
          </div>

          <div className="stat-card">
            <div>
              <h4>Pending Leaves</h4>
              <h2>18</h2>
              <p className="negative">
                ↘ -5% vs last month
              </p>
            </div>

            <div className="stat-icon orange">
              📄
            </div>
          </div>

          {/* <div className="stat-card">
            <div>
              <h4>Monthly Payroll</h4>
              <h2>$485K</h2>
              <p className="positive">
                ↗ +8% vs last month
              </p>
            </div>

            <div className="stat-icon purple">
              $
            </div>
          </div> */}
        </div>

        {/* BOTTOM SECTION */}
        <div className="bottom-grid">

          {/* RECENT ACTIVITIES */}
          <div className="activity-card">
            <h3>Recent Activities</h3>

            <div className="activity-item">
              <div className="activity-avatar">
                SJ
              </div>

              <div>
                <h4>
                  Sarah Johnson applied for
                  sick leave
                </h4>

                <p>2 hours ago</p>
              </div>
            </div>

            <div className="activity-item">
              <div className="activity-avatar">
                MC
              </div>

              <div>
                <h4>
                  Michael Chen checked in
                </h4>

                <p>3 hours ago</p>
              </div>
            </div>

            <div className="activity-item">
              <div className="activity-avatar">
                ED
              </div>

              <div>
                <h4>
                  Emily Davis profile updated
                </h4>

                <p>5 hours ago</p>
              </div>
            </div>

          </div>

          {/* LEAVES */}
          <div className="leave-card">
            <h3>Upcoming Leaves</h3>

            <div className="leave-item">
              <h4>Alex Turner</h4>
              <p>Vacation</p>
              <span>Apr 5-10, 2026</span>
            </div>

            <div className="leave-item">
              <h4>Maria Garcia</h4>
              <p>Personal</p>
              <span>Apr 8-9, 2026</span>
            </div>

          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default Dashboard;