import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LoginLayout from "../auth/LoginLayout";
import { sendOtp, updatePassword, verifyOtp } from "../services/authService";
import "../auth/LoginScreen.css";
import bgImage from "../assets/background.png";
import helpBtn from '../assets/help.svg';


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
      if (!emailOrPhone.length) {
        setError("Email or Phone is required");
        return;
      }
      await sendOtp({ emailOrPhone });
      setMessage("An OTP has been sent to your registered contact details.");
      setStep("VERIFY_OTP");
    } catch (err) {
      console.log(err.response.data.message);
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
    <div
      className="login-container"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="login-content">

        {/* ================= LEFT HERO SIDE ================= */}
        <LoginLayout />

        {/* ================= RIGHT FORM CARD SIDE ================= */}
        <div className="form-section">
          <div className="help-link">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <img src={helpBtn} alt="Help" width="16" height="16" /> Help
            </span>
          </div>
          <div className="form-card">
            <div className="form-header">
              <h2>Reset Password</h2>
              <p>Recover access to your account by verifying your identity.</p>
            </div>

            {message && (
              <p className="success-message" style={{ color: "green", marginBottom: "15px" }}>
                {message}
              </p>
            )}

            {/* STEP 1: ENTER EMAIL OR PHONE */}
            {step === "IDENTIFY" && (
              <form onSubmit={handleRequestOtp}>
                <div className="input-group">
                  <label>Work Email or Mobile Number</label>
                  <input
                    type="text"
                    placeholder="Enter your work email or mobile number"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    required
                  />
                  <span className="helper-text">
                    Enter your registered email or mobile number to receive a verification OTP
                  </span>
                </div>

                <button type="submit" className="btn-login" disabled={isLoading}>
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
                    Enter the 6-digit verification code sent to {emailOrPhone}
                  </span>
                </div>

                <button type="submit" className="btn-login" disabled={isLoading}>
                  {isLoading ? "Verifying..." : "Verify OTP"}
                </button>
              </form>
            )}

            {/* STEP 3: NEW PASSWORD */}
            {step === "RESET" && (
              <form onSubmit={handleResetPassword}>
                <div className="input-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Re-enter new password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                  />
                  <span className="helper-text">Please choose a strong, secure password</span>
                </div>

                <button type="submit" className="btn-login" disabled={isLoading}>
                  {isLoading ? "Updating..." : "Update Password"}
                </button>
              </form>
            )}

            {error && <p className="error">{error}</p>}

            <div className="auth-links" style={{ textAlign: "center", textDecoration: "none" }}>
              <Link to="/login" style={{ textDecoration: "none", color: "#1E6BD6" }}>
                Back to Login
              </Link>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Powered By text */}
      <footer className="footer-copyright">
        Powered by Kar Pragati Technologies Pvt. Ltd.
      </footer>
    </div>
  );
}

export default ForgotPassword;