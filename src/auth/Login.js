import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LoginScreen.css';

// Original imports (Make sure paths match your project structure)
import bgImage from '../assets/login.jpg';
import logo from '../assets/landing/workza-logo.png';
import usersIcon from '../assets/user.png';
import attendanceIcon from '../assets/attendance.png';
import payrollIcon from '../assets/payroll.png';
import expenseIcon from '../assets/expense.png';
import performanceIcon from '../assets/performance.png';
import policyIcon  from '../assets/policy.png';
import reportsIcon from '../assets/document.png';
import kplogo from '../assets/kpLogo.png';
import mobileBgImage from '../assets/mobile-login.jpg'

import { loginUser } from '../services/authService';
import { vendorDashboardPath } from '../utils/vendorPath';

export default function LoginScreen() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        identifier: '',
        password: '',
        orgCode: '',
        otp: '',
        rememberMe: false
    });

    const [showPassword, setShowPassword] = useState(false);
    const [is2FA, setIs2FA] = useState(false);
    const [otpEmail, setOtpEmail] = useState('');
    const [otpSent, setOtpSent] = useState(false);

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 992);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 992);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const finalValue = name === 'orgCode' ? value.toUpperCase() : value;

        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : finalValue
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const res = await loginUser({
                emailOrPhone: formData.identifier,
                password: formData.password,
                vendorCode: formData.orgCode,
                otp: formData.otp
            });

            if (res?.twoFactorRequired) {
                setIs2FA(true);
                setOtpEmail(res.sendTo || '');
                setOtpSent(true);
                return;
            }

            localStorage.setItem('token', res.token);
            localStorage.setItem('user', JSON.stringify(res.user));
            navigate(vendorDashboardPath(res.user));
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-wrapper">
            
            {/* Top Main Section */}
            <div className="login-main" style={{ backgroundImage: `url(${isMobile ? mobileBgImage : bgImage})` }}>
                
                {/* Overlay (Tint) placed correctly to cover image but sit behind text/form */}
                <div className="login-overlay"></div>

                {/* Left Hero Side */}
                <div className="login-left">
                    
                    {/* Floating Blue Collar Pill */}
                    <div className="floating-pill blue-collar">
                        <div className="pill-icon blue-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path>
                                <path d="M17 18h1"></path><path d="M13 18h1"></path><path d="M9 18h1"></path>
                            </svg>
                        </div>
                        <div className="pill-text">
                            <span className="pill-title">Blue Collar</span>
                            <span className="pill-subtitle">Factory | Plant | Field</span>
                        </div>
                    </div>

                    {/* Floating White Collar Pill */}
                    <div className="floating-pill white-collar">
                        <div className="pill-icon green-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                            </svg>
                        </div>
                        <div className="pill-text">
                            <span className="pill-title">White Collar</span>
                            <span className="pill-subtitle">Office | Remote | Hybrid</span>
                        </div>
                    </div>

                    <Link to="/" className="brand-logo" aria-label="Workza home">
                        <img src={logo} alt="Workza" />
                    </Link>

                    <div className="hrms-pill">
                        <span className="dot"></span> HRMS PLATFORM
                    </div>

                    <h1 className="hero-title">
                        One Workforce.<br />
                        <span className="text-green">One Platform.</span>
                    </h1>

                    <p className="hero-subtitle">
                        {isMobile 
                            ? "From factory floors to office desks, Workza keeps every team moving."
                            : "A modern HRMS built for growing organisations - manage your people with clarity, care, and confidence."}
                    </p>
                </div>

                {/* Right Form Card Side */}
                <div className="login-right">
                    <div className="form-card">
                        <div className="form-header">
                            <h2>Welcome to Workza! 👋</h2>
                            <p>Sign in to your Workza HRMS account.</p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* Email / Mobile Input */}
                            <div className="input-group">
                                <label>Work Email or Mobile Number</label>
                                <input
                                    type="text"
                                    name="identifier"
                                    value={formData.identifier}
                                    onChange={handleChange}
                                    placeholder="name@workza.com"
                                    required
                                    disabled={is2FA}
                                />
                            </div>

                            {/* Password Input */}
                            <div className="input-group">
                                <label>Password</label>
                                <div className="password-wrapper">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Enter your password"
                                        required
                                        disabled={is2FA}
                                    />
                                    <button 
                                        type="button" 
                                        className="toggle-password" 
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                            <line x1="1" y1="1" x2="23" y2="23"></line>
                                        </svg>
                                    </button>
                                </div>
                                <div className="forgot-links">
                                    <Link to="/forgot-password" className="forgot-link">
                                        Forgot Password?
                                    </Link>
                                </div>
                            </div>

                            {/* Org Code Input */}
                            <div className="input-group">
                                <label>Organization Code</label>
                                <input
                                    type="text"
                                    name="orgCode"
                                    value={formData.orgCode}
                                    onChange={handleChange}
                                    placeholder="Enter your organisation code"
                                    required
                                    disabled={is2FA}
                                />
                                <span className="helper-text">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                    </svg>
                                    Provided by your HR administrator
                                </span>
                            </div>

                            {/* OTP Input */}
                            {is2FA && otpSent && (
                                <div className="input-group">
                                    <label>Verification Code</label>
                                    <input
                                        type="text"
                                        name="otp"
                                        value={formData.otp}
                                        onChange={handleChange}
                                        placeholder="Enter 6-Digit OTP"
                                        maxLength="6"
                                        required
                                    />
                                    <span className="helper-text">
                                        Code sent to: <strong>{otpEmail}</strong>
                                    </span>
                                </div>
                            )}

                            {/* Remember Me */}
                            <label className="remember-me">
                                <input
                                    type="checkbox"
                                    name="rememberMe"
                                    checked={formData.rememberMe}
                                    onChange={handleChange}
                                />
                                Remember me
                            </label>

                            {/* Error message */}
                            {error && <p className="error-message">{error}</p>}

                            {/* Login Button */}
                            <button type="submit" className="btn-login" disabled={isLoading}>
                                {isLoading
                                    ? 'Logging in...'
                                    : is2FA
                                        ? 'Verify & Confirm Login'
                                        : isMobile ? 'Sign In →' : 'Sign in'}
                            </button>
                        </form>

                        <div className="form-footer">
                            <div className="kp-logo-wrapper">
                                <p>Powered by</p>
                                <img src={kplogo} alt='logo'/>
                            </div>
                            <span className="footer-tagline">Blue-collar · White-collar · One Workforce</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Features Strip (Hidden on Mobile) */}
            <div className="bottom-features">
                <div className="feature-heading">
                    Everything you need,<br />in one place.
                </div>
                <div className="feature-icons-list">
                    <div className="feature-icon-item">
                        <img src={usersIcon} alt="HR" />
                        <span>HR & Employee<br/>Management</span>
                    </div>
                    <div className="feature-icon-item">
                        <img src={attendanceIcon} alt="Attendance" />
                        <span>Attendance<br/>& Leave</span>
                    </div>
                    <div className="feature-icon-item">
                        <img src={payrollIcon} alt="Payroll" />
                        <span>Payroll &<br/>Salary</span>
                    </div>
                    <div className="feature-icon-item">
                        <img src={expenseIcon} alt="Claims" />
                        <span>Claims &<br/>Expenses</span>
                    </div>
                    <div className="feature-icon-item">
                        <img src={performanceIcon} alt="Performance" />
                        <span>Performance<br/>& Goals</span>
                    </div>
                    <div className="feature-icon-item">
                        <img src={reportsIcon} alt="Reports" />
                        <span>Reports &<br/>Analytics</span>
                    </div>
                    <div className="feature-icon-item">
                        <img src={policyIcon} alt="Policies" />
                        <span>Policies &<br/>Documents</span>
                    </div>
                </div>
            </div>
        </div>
    );
}