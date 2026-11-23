import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { sendOtp, updatePassword, verifyOtp } from "../services/authService";
import AuthLayout, { AuthBackLink, AuthHeader } from "../auth/AuthLayout";
import { EyeIcon, EyeOffIcon } from "../auth/authIcons";

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

    // Resend Timer State
    const [timer, setTimer] = useState(45);

    // Password visibility toggles
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
                    title: "Verification Details!",
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
        <AuthLayout>
            {step === "IDENTIFY" ? (
                <AuthBackLink to="/login">Back to Login</AuthBackLink>
            ) : (
                <AuthBackLink
                    to="#"
                    onClick={(e) => { e.preventDefault(); setStep(step === "VERIFY_OTP" ? "IDENTIFY" : "VERIFY_OTP"); }}
                >
                    Back to details
                </AuthBackLink>
            )}

            <AuthHeader title={headerContent.title} subtitle={headerContent.subtitle} />

            {message && <p className="auth-success">{message}</p>}

            {/* STEP 1: ENTER EMAIL OR PHONE */}
            {step === "IDENTIFY" && (
                <form className="auth-form" onSubmit={handleRequestOtp}>
                    <div className="auth-field">
                        <label htmlFor="fp-org">Organization Code</label>
                        <input
                            id="fp-org"
                            type="text"
                            placeholder="Enter your organisation code"
                            value={vendorCode}
                            onChange={(e) => setVendorCode(e.target.value.toUpperCase())}
                            required
                        />
                        <p className="auth-help">Provided by your HR administrator</p>
                    </div>
                    <div className="auth-field">
                        <label htmlFor="fp-contact">Work Email or Mobile Number</label>
                        <input
                            id="fp-contact"
                            type="text"
                            placeholder="Enter your work email or mobile number"
                            value={emailOrPhone}
                            onChange={(e) => setEmailOrPhone(e.target.value)}
                            required
                        />
                        <p className="auth-help">Enter your registered email or mobile number to receive a verification OTP</p>
                    </div>
                    {error && <p className="auth-error">{error}</p>}
                    <button type="submit" className="auth-submit" disabled={isLoading || !vendorCode.trim() || !emailOrPhone.trim()}>
                        {isLoading ? "Sending..." : "Send OTP"}
                    </button>
                </form>
            )}

            {/* STEP 2: VERIFY OTP */}
            {step === "VERIFY_OTP" && (
                <form className="auth-form" onSubmit={handleVerifyOtp}>
                    <div className="auth-field">
                        <label>Verification Code</label>
                        <div className="auth-otp">
                            {otp.map((data, index) => (
                                <input
                                    key={index}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength="1"
                                    aria-label={`Digit ${index + 1}`}
                                    className={data ? "filled" : undefined}
                                    ref={(el) => (otpRefs.current[index] = el)}
                                    value={data}
                                    onChange={(e) => handleOtpChange(e.target, index)}
                                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                                    required
                                />
                            ))}
                        </div>
                    </div>

                    <div className="auth-resend">
                        <span>Didn't receive the code?</span>
                        {timer > 0 ? (
                            <span>
                                <strong>Resend in</strong>
                                <span className="auth-timer">0:{timer < 10 ? `0${timer}` : timer}</span>
                            </span>
                        ) : (
                            <button type="button" onClick={handleRequestOtp} disabled={isLoading}>
                                Resend OTP
                            </button>
                        )}
                    </div>
                    {error && <p className="auth-error">{error}</p>}

                    <button type="submit" className="auth-submit" disabled={isLoading || otp.join("").length < 6}>
                        {isLoading ? "Verifying..." : "Verify OTP"}
                    </button>
                </form>
            )}

            {/* STEP 3: NEW PASSWORD */}
            {step === "RESET" && (
                <form className="auth-form" onSubmit={handleResetPassword}>
                    <div className="auth-field">
                        <label htmlFor="fp-new">New Password</label>
                        <div className="auth-password">
                            <input
                                id="fp-new"
                                type={showNewPassword ? "text" : "password"}
                                placeholder="Enter your new password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                aria-label={showNewPassword ? "Hide password" : "Show password"}
                            >
                                {showNewPassword ? <EyeIcon /> : <EyeOffIcon />}
                            </button>
                        </div>
                    </div>

                    <div className="auth-field">
                        <label htmlFor="fp-confirm">Confirm New Password</label>
                        <div className="auth-password">
                            <input
                                id="fp-confirm"
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Re-enter your new password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                            >
                                {showConfirmPassword ? <EyeIcon /> : <EyeOffIcon />}
                            </button>
                        </div>
                        <p className="auth-help">Please choose a strong, secure password (minimum 5 characters).</p>
                    </div>
                    {showMismatchHint && <p className="auth-error">Passwords do not match</p>}
                    {error && <p className="auth-error">{error}</p>}
                    <button type="submit" className="auth-submit" disabled={isLoading || !isResetReady}>
                        {isLoading ? "Updating..." : "Reset Password"}
                    </button>
                </form>
            )}
        </AuthLayout>
    );
}
