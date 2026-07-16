import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signupUser } from "../services/authService";
import LoginLayout from "../auth/LoginLayout";
import "../auth/LoginScreen.css";
import bgImage from "../assets/background.png";
import helpBtn from '../assets/help.svg';


function JoinOrg() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    emailOrPhone: "",
    password: "",
    vendorCode: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]:
        field === "vendorCode"
          ? value.toUpperCase()
          : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      await signupUser(form);

      setMessage("Joined successfully!");

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Signup failed"
      );
    } finally {
      setLoading(false);
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
              <h2>Join Organization</h2>
              <p>Join your organization and manage your workforce seamlessly.</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  required
                  value={form.name}
                  onChange={(e) =>
                    handleChange("name", e.target.value)
                  }
                />
              </div>

              <div className="input-group">
                <label>Work Email or Mobile Number</label>
                <input
                  type="text"
                  placeholder="Enter your work email or mobile number"
                  required
                  value={form.emailOrPhone}
                  onChange={(e) =>
                    handleChange("emailOrPhone", e.target.value)
                  }
                />
              </div>

              <div className="input-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Create a password"
                  required
                  value={form.password}
                  onChange={(e) =>
                    handleChange("password", e.target.value)
                  }
                />
              </div>

              <div className="input-group">
                <label>Organization Code</label>
                <input
                  type="text"
                  placeholder="Enter your organization code"
                  required
                  value={form.vendorCode}
                  onChange={(e) =>
                    handleChange("vendorCode", e.target.value)
                  }
                />
                <span className="helper-text">Provided by your HR administrator</span>
              </div>

              <button type="submit" className="btn-login" disabled={loading}>
                {loading
                  ? "Joining..."
                  : "Join Organization"}
              </button>
            </form>

            {message && (
              <p className="success-message" style={{ color: "green", marginTop: "10px" }}>
                {message}
              </p>
            )}

            {error && <p className="error">{error}</p>}

            <div
              className="auth-links"
              style={{
                display: "flex",
                justifyContent: "flex-start",
                alignItems: "center",
                gap: "5px",
                marginTop: "20px",
              }}
            >
              <span>Already have an organization?</span>

              <Link
                to="/login"
                style={{
                  textDecoration: "none",
                }}
              >
                Sign In
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

export default JoinOrg;