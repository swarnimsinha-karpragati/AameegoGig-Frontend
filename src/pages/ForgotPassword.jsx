import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sendOtp, updatePassword, verifyOtp } from "../services/authService";
import "../auth/LoginScreen.css";

// Assets aligned with LoginScreen
import bgImage from "../assets/login.png";
import mobileBgImage from '../assets/mobile_login.png';
import logo from "../assets/landing/workza-logo.png";
import usersIcon from '../assets/user.png';
import attendanceIcon from '../assets/attendance.png';
import payrollIcon from '../assets/payroll.png';
import expenseIcon from '../assets/expense.png';
import performanceIcon from '../assets/performance.png';
import policyIcon  from '../assets/policy.png';
import reportsIcon from '../assets/document.png';
import kplogo from '../assets/kpLogo.png';

export default function ForgotPassword() {
    const navigate = useNavigate();

    // Steps: "IDENTIFY" -> "VERIFY_OTP" -> "RESET"
    const [step, setStep] = useState("IDENTIFY");
    const [emailOrPhone, setEmailOrPhone] = useState("");
    
    // OTP state for 6 separate inputs
    const [otp, setOtp] = useState(new Array(6).fill(""));
    const otpRefs = useRef([]);

    const [vendorCode, setVendorCode] = useState("");
    const [passwordData, setPasswordData] = useState({ newPassword: "", confirmPassword: "" });

    // UI States
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 992);
    
    // Resend Timer State
    const [timer, setTimer] = useState(45);

    // Password visibility toggles
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 992);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Timer logic for OTP Resend
    useEffect(() => {
        let interval;
        if (step === "VERIFY_OTP" && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [step, timer]);

    // Handle single OTP input change
    const handleOtpChange = (element, index) => {
        if (isNaN(element.value)) return false;
        const newOtp = [...otp];
        newOtp[index] = element.value;
        setOtp(newOtp);

        // Focus next input
        if (element.value !== "" && index < 5) {
            otpRefs.current[index + 1].focus();
        }
    };

    // Handle backspace to focus previous input
    const handleOtpKeyDown = (e, index) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            otpRefs.current[index - 1].focus();
        }
    };

    // Complete org codes look like AMG8548 (letters + digits) — a bare
    // prefix such as "AMG" must be rejected before any OTP is requested.
    const ORG_CODE_PATTERN = /^[A-Z]{2,10}-?[0-9]{3,8}$/;
    const isValidEmailFormat = (value) => /\S+@\S+\.\S+/.test(String(value || "").trim());

    // Step 1: Request OTP
    const handleRequestOtp = async (e) => {
        if(e) e.preventDefault();
        setError("");
        const code = String(vendorCode || "").trim().toUpperCase();
        const contact = String(emailOrPhone || "").trim();
        if (!contact || !code) {
            setError("Email/Phone or Organization Code is required");
            return;
        }
        if (contact.includes("@") && !isValidEmailFormat(contact)) {
            setError("Please enter a valid registered email ID");
            return;
        }
        if (!ORG_CODE_PATTERN.test(code)) {
            setError("Please enter a complete, valid Organization Code");
            return;
        }
        setIsLoading(true);
        try {
            await sendOtp({ emailOrPhone: contact, vendorCode: code });
            setMessage(""); // Clear any generic message to match design
            setTimer(45);   // Reset timer
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
        const otpString = otp.join("");
        
        try {
            if (otpString.length < 6) {
                setError("Please enter the complete 6-digit OTP");
                return;
            }
            await verifyOtp({ emailOrPhone, otp: otpString, vendorCode: vendorCode.toUpperCase() });
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

    const EyeIcon = () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
    );

    // Reset-step gate (mirrors the server rule): both fields present, at
    // least 5 characters, and matching — otherwise Update stays disabled.
    const isResetReady =
        passwordData.newPassword.length >= 5 &&
        passwordData.confirmPassword.length >= 5 &&
        passwordData.newPassword === passwordData.confirmPassword;
    const showMismatchHint =
        passwordData.newPassword.length > 0 &&
        passwordData.confirmPassword.length > 0 &&
        passwordData.newPassword !== passwordData.confirmPassword;

    // Dynamic Header Content
    const getHeaderContent = () => {
        switch (step) {
            case "VERIFY_OTP":
                return {
                    title: "Enter Verification Details!",
                    subtitle: `Enter 6-digit code sent to ${emailOrPhone.includes('@') ? 
                        emailOrPhone.replace(/(.{1}).*(@.*)/, '$1***e$2') : 
                        `+91 ${emailOrPhone.replace(/.(?=.{4})/g, '*')}`}`
                };
            case "RESET":
                return {
                    title: "Reset Password!",
                    subtitle: "Change your password by entering your new details."
                };
            default:
                return {
                    title: "Forgot Password!",
                    subtitle: "Recover access to your account by verifying your identity."
                };
        }
    };

    const headerContent = getHeaderContent();

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
                        
                        {/* Dynamic Back Navigation */}
                        <div style={{ marginBottom: "1rem" }}>
                            {step === "IDENTIFY" ? (
                                <Link to="/login" className="forgot-link" >
                                    <span>&larr;</span> Back to Login
                                </Link>
                            ) : (
                                <Link
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); setStep(step === "VERIFY_OTP" ? "IDENTIFY" : "VERIFY_OTP"); }}
                                    className="forgot-link"
                                >
                                    <span>&larr;</span> Back to details
                                </Link>
                            )}
                        </div>

                        <div className="form-header">
                            <h2 >{headerContent.title}</h2>
                            <p >{headerContent.subtitle}</p>
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
                                </div>
                                <p style={{fontSize:'12px', fontWeight:'400', color:'#6C757D'}}>Enter your registered email or mobile number to receive a verification OTP.</p>
                                {error && <p className="error-message">{error}</p>}
                                <button type="submit" className="btn-login" disabled={isLoading || !vendorCode.trim() || !emailOrPhone.trim()} style={{ marginTop: "1rem" }}>
                                    {isLoading ? "Sending..." : "Send OTP"}
                                </button>
                            </form>
                        )}

                        {/* STEP 2: VERIFY OTP */}
                        {step === "VERIFY_OTP" && (
                            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '300px' }}>
                                
                                <div style={{ flex: 1 }}>
                                    <div className="input-group">
                                        <label style={{ marginBottom: "0.75rem", display: 'block', fontWeight: '500' }}>Verification Code</label>
                                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                                            {otp.map((data, index) => (
                                                <input
                                                    key={index}
                                                    type="text"
                                                    maxLength="1"
                                                    ref={(el) => (otpRefs.current[index] = el)}
                                                    value={data}
                                                    onChange={(e) => handleOtpChange(e.target, index)}
                                                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                                                    style={{
                                                        width: '45px',
                                                        height: '50px',
                                                        fontSize: '1.25rem',
                                                        textAlign: 'center',
                                                        padding: '0',             
                                                        boxSizing: 'border-box',
                                                        borderRadius: '8px',
                                                        border: data ? '2px solid #111827' : '1px solid #D1D5DB',
                                                        fontWeight: '600'
                                                    }}
                                                    required
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                                        <span style={{ color: '#6B7280' }}>Didn't receive the code?</span>
                                        {timer > 0 ? (
                                            <span style={{ color: '#6B7280', fontWeight: '500' }}>
                                                Resend in <span style={{ color: '#3B82F6', backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: '4px' }}>0:{timer < 10 ? `0${timer}` : timer}</span>
                                            </span>
                                        ) : (
                                            <button 
                                                type="button" 
                                                onClick={handleRequestOtp} 
                                                disabled={isLoading}
                                                style={{ background: 'none', border: 'none', color: '#3B82F6', fontWeight: '600', cursor: 'pointer', padding: 0 }}>
                                                Resend OTP
                                            </button>
                                        )}
                                    </div>
                                    {error && <p className="error-message" style={{ marginTop: '1rem' }}>{error}</p>}
                                </div>

                                <button type="submit" className="btn-login" disabled={isLoading || otp.join("").length < 6} style={{ marginTop: 'auto' }}>
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
                                </div>
                                <p style={{fontSize:'12px', fontWeight:'400', color:'#6C757D'}}>Please choose a strong, secure password (minimum 5 characters).</p>
                                {showMismatchHint && <p className="error-message">Passwords do not match</p>}
                                {error && <p className="error-message">{error}</p>}
                                <button type="submit" className="btn-login" disabled={isLoading || !isResetReady} style={{ marginTop: "1rem" }}>
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