import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import {sendOtp, updatePassword, verifyOtp} from "../services/authService"; // Example API imports

function ForgotPassword() {
  const navigate = useNavigate();
  
  // Steps: "IDENTIFY" -> "VERIFY_OTP" -> "RESET"
  const [step, setStep] = useState("IDENTIFY"); 
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [passwordData, setPasswordData] = useState({ newPassword: "", confirmPassword: "" });
  
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
        if(!emailOrPhone.length){
            setError("Email or Phone is required")
            return
        }
      await sendOtp({ emailOrPhone });
      setMessage("An OTP has been sent to your registered contact details.");
      setStep("VERIFY_OTP");
    } catch (err) {
        console.log(err.response.data.message)
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
        if(!otp.length){
            setError('OTP is required')
            return
        }
      await verifyOtp({ emailOrPhone, otp });
      setStep("RESET");
      setMessage("");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired OTP.");
    } finally {
      setIsLoading(false);
    }
  };

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
            confirmPassword: passwordData.confirmPassword
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

  return (
    <div className="auth-container">
      {/* LEFT PANEL */}
      <div className="auth-left">
        <div className="branding">
          <img src={logo} alt="Aameego" className="brand-logo" />
          <h1 className="brand-heading">Aameego Gig</h1>
          <p className="brand-subtitle">Smart HRMS for modern workforce</p>
          <p className="brand-company">Powered by Kar Pragati Technologies Private Limited</p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="auth-right">
        <div className="auth-card">
          <h2>Reset Password</h2>
          {message && <p className="success-message" style={{ color: "green", marginBottom: "15px" }}>{message}</p>}

          {/* STEP 1: ENTER EMAIL OR PHONE */}
          {step === "IDENTIFY" && (
            <form onSubmit={handleRequestOtp}>
              <p className="auth-hint">Enter your registered email or mobile number to receive a verification OTP.</p>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Email or Mobile Number"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  required
                />
              </div>
              <button type="submit" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          )}

          {/* STEP 2: VERIFY OTP */}
          {step === "VERIFY_OTP" && (
            <form onSubmit={handleVerifyOtp}>
              <p className="auth-hint">Enter the 6-digit verification code sent to {emailOrPhone}.</p>
              <div className="form-group">
                <input
                  type="text"
                  maxLength="6"
                  placeholder="Enter 6-Digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
              </div>
              <button type="submit" disabled={isLoading}>
                {isLoading ? "Verifying..." : "Verify OTP"}
              </button>
            </form>
          )}

          {/* STEP 3: NEW PASSWORD */}
          {step === "RESET" && (
            <form onSubmit={handleResetPassword}>
              <p className="auth-hint">Please choose a strong, secure password.</p>
              <div className="form-group">
                <input
                  type="password"
                  placeholder="New Password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                />
              </div>
              <button type="submit" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}

          {error && <p className="error">{error}</p>}

          <div className="auth-links">
            <Link to="/login">Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;