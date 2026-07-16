import { useState } from "react";
import { Link } from "react-router-dom";
import LoginLayout from "../auth/LoginLayout";
import { sendOtp, verifyOtpGetCode } from "../services/authService";
import '../auth/LoginScreen.css';
import bgImage from '../assets/background.png';
import helpBtn from '../assets/help.svg';



function ForgotOrgCode() {
  const [step, setStep] = useState("IDENTIFY");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [recoveredCode, setRecoveredCode] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await sendOtp({ emailOrPhone });
      setMessage("Verification code sent successfully.");
      setStep("VERIFY_OTP");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndReveal = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const res = await verifyOtpGetCode({ emailOrPhone, otp });
      setRecoveredCode(res);
      setStep("REVEAL");
      setMessage("");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid verification code.");
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
              <h2>Find Organization Code</h2>
              <p>Recover your organization code using your registered email or mobile number.</p>
            </div>

            {message && (
              <p className="success-message" style={{ color: "green", marginBottom: "15px" }}>
                {message}
              </p>
            )}

            {/* STEP 1: IDENTIFY ACCOUNT */}
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
                    Enter the email or mobile number linked to your workplace profile
                  </span>
                </div>

                <button type="submit" className="btn-login" disabled={isLoading}>
                  {isLoading ? "Sending Code..." : "Send Verification Code"}
                </button>
              </form>
            )}

            {/* STEP 2: VERIFY OTP */}
            {step === "VERIFY_OTP" && (
              <form onSubmit={handleVerifyAndReveal}>
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
                    Please check the code sent to your mobile or email inbox
                  </span>
                </div>

                <button type="submit" className="btn-login" disabled={isLoading}>
                  {isLoading ? "Fetching Code..." : "Verify & Find Code"}
                </button>
              </form>
            )}

            {/* STEP 3: REVEAL CODE */}
            {step === "REVEAL" && (
              <div className="reveal-box" style={{ textAlign: "center", margin: "20px 0" }}>
                <p className="helper-text">Your workspace organization code is:</p>
                <div
                  className="code-display"
                  style={{
                    background: "#f4f5f7",
                    padding: "15px",
                    borderRadius: "6px",
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                    letterSpacing: "2px",
                    color: "#333",
                    border: "1px dashed #ccc",
                    margin: "15px 0"
                  }}
                >
                  {recoveredCode}
                </div>
                <p className="helper-text" style={{ fontSize: "0.85rem" }}>
                  Use this uppercase code in the 'Organization Code' field during login.
                </p>
              </div>
            )}

            {error && <p className="error">{error}</p>}


            <div className="auth-links" style={{ textAlign: "center", }}>
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

export default ForgotOrgCode;