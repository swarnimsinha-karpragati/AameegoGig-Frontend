import React from 'react';
import { Link } from 'react-router-dom';
import './LoginScreen.css';

import teamPhoto from '../assets/auth/team-photo.jpg';
import workzaLogo from '../assets/auth/workza-logo.png';
import karpragatiLogo from '../assets/auth/karpragati-logo.png';
import pulseDot from '../assets/auth/pulse-dot.svg';
import icoUsers from '../assets/auth/ico-users.svg';
import icoCalendar from '../assets/auth/ico-calendar.svg';
import icoWallet from '../assets/auth/ico-wallet.svg';
import icoReceipt from '../assets/auth/ico-receipt.svg';
import icoTarget from '../assets/auth/ico-target.svg';
import icoBarChart from '../assets/auth/ico-bar-chart.svg';
import icoShieldDoc from '../assets/auth/ico-shield-doc.svg';
import benefitUsers from '../assets/auth/benefit-users.svg';
import benefitLock from '../assets/auth/benefit-lock.svg';
import benefitTrending from '../assets/auth/benefit-trending.svg';
import benefitShield from '../assets/auth/benefit-shield.svg';

const FEATURES = [
    [icoUsers, 'HR & Employee', 'Management'],
    [icoCalendar, 'Attendance', '& Leave'],
    [icoWallet, 'Payroll &', 'Salary'],
    [icoReceipt, 'Claims &', 'Expenses'],
    [icoTarget, 'Performance', '& Goals'],
    [icoBarChart, 'Reports &', 'Analytics'],
    [icoShieldDoc, 'Policies &', 'Documents'],
];

const BENEFITS = [
    [benefitUsers, 'People - Centric'],
    [benefitLock, 'Secure & Compliant'],
    [benefitTrending, 'Built for Growth'],
    [benefitShield, 'Trusted by Modern Teams'],
];

/** Workza logo shown at the top of the sign-in card. */
export function AuthLogo() {
    return (
        <Link to="/" className="auth-logo" aria-label="Workza home">
            <img src={workzaLogo} alt="Workza" />
        </Link>
    );
}

/** "← Back to …" row that sits where the logo does on secondary screens. */
export function AuthBackLink({ to = '/login', onClick, children }) {
    return (
        <div className="auth-back">
            <Link to={to} onClick={onClick}>&larr; {children}</Link>
        </div>
    );
}

/** Card heading: title + one-line subtitle. */
export function AuthHeader({ title, subtitle }) {
    return (
        <div className="auth-header">
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
        </div>
    );
}

/** Shared auth shell: brand panel on the left, white card (children) on the right. */
export default function AuthLayout({ children }) {
    return (
        <div className="auth-page" style={{ backgroundImage: `url(${teamPhoto})` }}>
            <section className="auth-hero">
                <div className="auth-hero-intro">
                    <span className="auth-chip">
                        <img src={pulseDot} alt="" width="7" height="7" />
                        HRMS Platform
                    </span>
                    <h1 className="auth-headline">
                        One Platform.<br />
                        <span>One Workforce.</span>
                    </h1>
                    <p className="auth-subtitle">
                        A modern HRMS built for growing organisation's - manage your people with clarity, care, and confidence.
                    </p>
                </div>

                <div className="auth-features-block">
                    <p className="auth-section-label">Everything you need in one place!</p>
                    <ul className="auth-features">
                        {FEATURES.map(([icon, line1, line2]) => (
                            <li key={line1}>
                                <span className="auth-feature-icon">
                                    <img src={icon} alt="" width="26" height="26" />
                                </span>
                                <span>{line1}<br />{line2}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <ul className="auth-benefits">
                    {BENEFITS.map(([icon, label]) => (
                        <li key={label}>
                            <img src={icon} alt="" width="22" height="22" />
                            <span>{label}</span>
                        </li>
                    ))}
                </ul>
            </section>

            <main className="auth-panel-col">
                <div className="auth-panel">
                    {children}
                    <div className="auth-powered">
                        <span>Powered by</span>
                        <img src={karpragatiLogo} alt="KarPragati" width="150" height="41" />
                    </div>
                </div>
            </main>
        </div>
    );
}
