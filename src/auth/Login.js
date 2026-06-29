import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../services/authService";
import logo from "../assets/logo.png";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    emailOrPhone: "",
    password: "",
    vendorCode: "",
    otp:""
  });

  const [is2FA, setIs2FA] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    let value = e.target.value;

    // Organization code always uppercase
    if (e.target.name === "vendorCode") {
      value = value.toUpperCase();
    }

    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsLoading(true);
    setError("");

    try {
      const res = await loginUser(formData);
      if (res?.twoFactorRequired ) {
          setIs2FA(true);
          setOtpEmail(res.sendTo || "");
          setOtpSent(true)
          return
      }

      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));

      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message || "Login failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* LEFT PANEL */}
      <div className="auth-left">
        <div className="branding">
          <img
            src={logo}
            alt="Aameego"
            className="brand-logo"
          />

          <h1 className="brand-heading">
            Aameego Gig
          </h1>

          <p className="brand-subtitle">
            Smart HRMS for modern workforce
          </p>

          <p className="brand-company">
            Powered by Kar Pragati Technologies Private Limited
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="auth-right">
        <div className="auth-card">
          <h2>Login</h2>

          <p className="auth-hint">
            Employees: use the email and temporary password shared by HR, plus
            your organization code.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                name="emailOrPhone"
                type="text"
                placeholder="Email or Mobile Number"
                value={formData.emailOrPhone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <input
                name="password"
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <input
                name="vendorCode"
                type="text"
                placeholder="Organization Code"
                value={formData.vendorCode}
                onChange={handleChange}
                required
              />
              <div className="field-helper">
                <Link to="/forgot-password" className="forgot-link">
                  Forgot Password?
                </Link>
                <Link to="/forgot-org-code" className="forgot-link">
                  Forgot Organization Code?
                </Link>
              </div>
            </div>

            {is2FA && otpSent &&(
              <div className="form-group 2fa-otp-section" style={{ marginTop: "1rem" }}>
                
                <p className="auth-hint" style={{ color: "#2563eb", padding: 0, marginBottom: "0.5rem" }}>
                  🔐 Verification Code sent to:<strong>{otpEmail}</strong>
                </p>
                
                <input
                  name="otp"
                  type="text"
                  placeholder="Enter 6-Digit OTP"
                  maxLength="6"
                  value={formData?.otp}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
            >
              {isLoading
                ? "Logging in..."
                : is2FA 
                  ? "Verify & Confirm Login" 
                  : "Login"}
            </button>
          </form>

          {error && (
            <p className="error">{error}</p>
          )}

          <div className="auth-links">
            <Link to="/create-org">
              Create Organization
            </Link>

            <Link to="/join">
              Join Organization
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;