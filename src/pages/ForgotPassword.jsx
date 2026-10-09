import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sendOtp, updatePassword, verifyOtp } from "../services/authService";
import "../auth/LoginScreen.css"; // Reuse the exact same CSS file

// Assets
import bgImage from "../assets/login.jpg";
import logo from "../assets/landing/workza-logo.png";
import usersIcon from "../assets/users.svg";
import attendanceIcon from "../assets/calender.svg";
import payrollIcon from "../assets/mdi_wallet.svg";
import leaveIcon from "../assets/mdi_aeroplane.svg";
import reportsIcon from "../assets/fluent_arrow-growth-20-filled.svg";
import kplogo from '../assets/kpLogo.png';

function ForgotPassword() {
    const navigate = useNavigate();

    // Steps: "IDENTIFY" -> "VERIFY_OTP" -> "RESET"
    const [step, setStep] = useState("IDENTIFY");
    const [emailOrPhone, setEmailOrPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [vendorCode, setVendorCode] = useState("");
    const [passwordData, setPasswordData] = useState({ newPassword: "", confirmPassword: "" });

    // UI States
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 992);
    
    // Password visibility toggles
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 992);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Step 1: Request OTP
    const handleRequestOtp = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        try {
            if (!emailOrPhone.length || !vendorCode) {
                setError("Email/Phone or Organization Code is required");
                return;
            }
            await sendOtp({ emailOrPhone, vendorCode: vendorCode.toUpperCase() });
            setMessage("An OTP has been sent to your registered contact details.");
            setStep("VERIFY_OTP");
        } catch (err) {
            setError(err?.response?.data?.message || "Failed to send OTP. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        try {
            if (!otp.length) {
                setError("OTP is required");
                return;
            }
            await verifyOtp({ emailOrPhone, otp, vendorCode: vendorCode.toUpperCase() });
            setStep("RESET");
            setMessage("");
        } catch (err) {
            setError(err.response?.data?.message || "Invalid or expired OTP.");
        } finally {
            setIsLoading(false);
        }
    };

    // Step 3: Reset Password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setIsLoading(true);
        setError("");
        try {
            const payload = {
                emailOrPhone,
                newPassword: passwordData.newPassword,
                confirmPassword: passwordData.confirmPassword,
                vendorCode: vendorCode.toUpperCase()
            };
            await updatePassword(payload);
            alert("Password updated successfully! Redirecting to login...");
            navigate("/login");
        } catch (err) {
            setError(err.response?.data?.message || "Could not reset password.");
        } finally {
            setIsLoading(false);
        }
    };

    // Reusable eye icon component for clean code
    const EyeIcon = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
    );

    return (
        <div className="login-wrapper">
            
            {/* Top Main Section */}
            <div className="login-main" style={{ backgroundImage: `url(${bgImage})` }}>
                
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
                        
                        <div style={{ marginBottom: "1rem" }}>
                            <Link to="/login" className="forgot-link" style={{ fontSize: "0.875rem", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <span>&larr;</span> Back to Login
                            </Link>
                        </div>

                        <div className="form-header">
                            <h2>Reset Password</h2>
                            <p>Recover access to your account by verifying your identity.</p>
                        </div>

                        {message && (
                            <div style={{ padding: "0.75rem", backgroundColor: "#D1FAE5", color: "#065F46", borderRadius: "8px", fontSize: "0.875rem", marginBottom: "1.5rem", fontWeight: "500" }}>
                                {message}
                            </div>
                        )}

                        {/* STEP 1: ENTER EMAIL OR PHONE */}
                        {step === "IDENTIFY" && (
                            <form onSubmit={handleRequestOtp}>
                                <div className="input-group">
                                    <label>Organization Code</label>
                                    <input
                                        type="text"
                                        placeholder="Enter your organization code"
                                        value={vendorCode}
                                        onChange={(e) => setVendorCode(e.target.value.toUpperCase())}
                                        required
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
                                
                                <div className="input-group">
                                    <label>Work Email or Mobile Number</label>
                                    <input
                                        type="text"
                                        placeholder="Enter your work email or mobile number"
                                        value={emailOrPhone}
                                        onChange={(e) => setEmailOrPhone(e.target.value)}
                                        required
                                    />
                                    <span className="helper-text" style={{marginTop: '0.5rem'}}>Enter your registered email or mobile number to receive a verification OTP</span>
                                </div>

                                {error && <p className="error-message">{error}</p>}

                                <button type="submit" className="btn-login" disabled={isLoading} style={{ marginTop: "1rem" }}>
                                    {isLoading ? "Sending..." : "Send OTP"}
                                </button>
                            </form>
                        )}

                        {/* STEP 2: VERIFY OTP */}
                        {step === "VERIFY_OTP" && (
                            <form onSubmit={handleVerifyOtp}>
                                <div className="input-group">
                                    <label>Verification Code</label>
                                    <input
                                        type="text"
                                        maxLength="6"
                                        placeholder="Enter 6-Digit OTP"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        required
                                    />
                                    <span className="helper-text">
                                        Enter the 6-digit verification code sent to <strong>{emailOrPhone}</strong>
                                    </span>
                                </div>

                                {error && <p className="error-message">{error}</p>}

                                <button type="submit" className="btn-login" disabled={isLoading} style={{ marginTop: "1rem" }}>
                                    {isLoading ? "Verifying..." : "Verify OTP"}
                                </button>
                            </form>
                        )}

                        {/* STEP 3: NEW PASSWORD */}
                        {step === "RESET" && (
                            <form onSubmit={handleResetPassword}>
                                <div className="input-group">
                                    <label>New Password</label>
                                    <div className="password-wrapper">
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            placeholder="Enter new password"
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            required
                                        />
                                        <button type="button" className="toggle-password" onClick={() => setShowNewPassword(!showNewPassword)}>
                                            <EyeIcon />
                                        </button>
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label>Confirm New Password</label>
                                    <div className="password-wrapper">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="Re-enter new password"
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            required
                                        />
                                        <button type="button" className="toggle-password" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                            <EyeIcon />
                                        </button>
                                    </div>
                                    <span className="helper-text">Please choose a strong, secure password</span>
                                </div>

                                {error && <p className="error-message">{error}</p>}

                                <button type="submit" className="btn-login" disabled={isLoading} style={{ marginTop: "1rem" }}>
                                    {isLoading ? "Updating..." : "Update Password"}
                                </button>
                            </form>
                        )}

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
                        <img src={leaveIcon} alt="Claims" />
                        <span>Claims &<br/>Expenses</span>
                    </div>
                    <div className="feature-icon-item">
                        <img src={reportsIcon} alt="Performance" />
                        <span>Performance<br/>& Goals</span>
                    </div>
                    <div className="feature-icon-item">
                        <img src={reportsIcon} alt="Reports" />
                        <span>Reports &<br/>Analytics</span>
                    </div>
                    <div className="feature-icon-item">
                        <img src={usersIcon} alt="Policies" />
                        <span>Policies &<br/>Documents</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ForgotPassword;