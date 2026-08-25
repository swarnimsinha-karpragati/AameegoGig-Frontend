import React from 'react';
import logo from '../assets/worklogo.png';

import usersIcon from '../assets/users.svg';
import attendanceIcon from '../assets/calender.svg';
import payrollIcon from '../assets/mdi_wallet.svg';
import leaveIcon from '../assets/mdi_aeroplane.svg';
import reportsIcon from '../assets/fluent_arrow-growth-20-filled.svg';
import SecureIcon from '../assets/secured.svg';


function LoginLayout() {
    return (
        <div className="hero-section">
            <div className="brand-header">
                <img src={logo} alt="Logo" className="workza-logo"  />
            </div>

            <div className="hero-text-block">
                <h1>
                    One Workforce.<br />One Platform.
                </h1>
                <p className="hero-subtitle">
                    Simplify workforce management with a secure, modern HRMS designed for growing organizations.
                </p>
            </div>

            <div className="features-list">
                <div className="feature-item">
                    <div className="feature-icon">
                        <img src={usersIcon} alt="Employee Management" width="24" height="24" />
                    </div>
                    <div className="feature-info">
                        <h3>Employee Management</h3>
                        <p>Manage employee data and profiles</p>
                    </div>
                </div>

                <div className="feature-item">
                    <div className="feature-icon">
                        <img src={attendanceIcon} alt="Attendance Tracking" width="24" height="24"/>
                    </div>
                    <div className="feature-info">
                        <h3>Attendance Tracking</h3>
                        <p>Track attendance and working hours</p>
                    </div>
                </div>

                <div className="feature-item">
                    <div className="feature-icon">
                        <img src={payrollIcon} alt="Payroll Management" width="24" height="24" />
                    </div>
                    <div className="feature-info">
                        <h3>Payroll Management</h3>
                        <p>Process payroll and manage salaries</p>
                    </div>
                </div>

                <div className="feature-item">
                    <div className="feature-icon">
                        <img src={leaveIcon} alt="Leave Management" width="24" height="24" />
                    </div>
                    <div className="feature-info">
                        <h3>Leave Management</h3>
                        <p>Manage leaves and approvals</p>
                    </div>
                </div>

                <div className="feature-item">
                    <div className="feature-icon">
                        <img src={reportsIcon} alt="Reports & Analytics" width="24" height="24" />
                    </div>
                    <div className="feature-info">
                        <h3>Reports & Analytics</h3>
                        <p>Get insights and make data-driven decisions</p>
                    </div>
                </div>
            </div>

            <div className="security-badge">
                <span className="shield-icon">
                    <img src={SecureIcon} alt="Secure" width="24" height="24" />
                </span>
                <div>
                    <strong>Secure  •  Reliable  •  Scalable</strong>
                    <p>Your data is safe with Workza</p>
                </div>
            </div>

        </div>
    );
}

export default LoginLayout;