import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import { sendOtp, verifyOtpGetCode} from "../services/authService";
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
    <div className="auth-container">

      <div className="auth-left">
        <div className="branding">
          <img src={logo} alt="Aameego" className="brand-logo" />
          <h1 className="brand-heading">Aameego Gig</h1>
          <p className="brand-subtitle">Smart HRMS for modern workforce</p>
          <p className="brand-company">Powered by Kar Pragati Technologies Private Limited</p>
        </div>
      </div>


      <div className="auth-right">
        <div className="auth-card">
          <h2>Find Org Code</h2>
          {message && <p className="success-message" style={{ color: "green", marginBottom: "15px" }}>{message}</p>}

          {/* STEP 1: IDENTIFY ACCOUNT */}
          {step === "IDENTIFY" && (
            <form onSubmit={handleRequestOtp}>
              <p className="auth-hint">Enter your registered email or mobile number linked to your workplace profile.</p>
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
                {isLoading ? "Sending Code..." : "Send Verification Code"}
              </button>
            </form>
          )}


          {step === "VERIFY_OTP" && (
            <form onSubmit={handleVerifyAndReveal}>
              <p className="auth-hint">Please look for the code sent to your mobile or email inbox.</p>
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
                {isLoading ? "Fetching Code..." : "Verify & Find Code"}
              </button>
            </form>
          )}


          {step === "REVEAL" && (
            <div className="reveal-box" style={{ textAlign: "center", margin: "20px 0" }}>
              <p className="auth-hint">Your workspace organization code is:</p>
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
              <p className="auth-hint" style={{ fontSize: "0.85rem" }}>
                Use this uppercase code in the 'Organization Code' field during login.
              </p>
            </div>
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

export default ForgotOrgCode;