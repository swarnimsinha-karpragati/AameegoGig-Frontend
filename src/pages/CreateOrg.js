import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createVendor } from "../services/authService";
import LoginLayout from "../auth/LoginLayout";
import "../auth/LoginScreen.css";
import bgImage from "../assets/background.png";
import helpBtn from '../assets/help.svg';


function CreateOrg() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    companyName: "",
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await createVendor(form);

      setMessage("Organization created successfully!");

      alert(
        `Organization Created!\n\nOrg Code: ${res.vendor.code}`
      );

      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Something went wrong"
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
              <h2>Create Organization</h2>
              <p>Set up your workspace and start managing your workforce.</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Company Name</label>
                <input
                  type="text"
                  placeholder="Enter your company name"
                  required
                  value={form.companyName}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      companyName: e.target.value,
                    })
                  }
                />
              </div>

              <div className="input-group">
                <label>Admin Email</label>
                <input
                  type="email"
                  placeholder="Enter admin email"
                  required
                  value={form.email}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email: e.target.value,
                    })
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
                    setForm({
                      ...form,
                      password: e.target.value,
                    })
                  }
                />
              </div>

              <button type="submit" className="btn-login mt-3" disabled={loading}>
                {loading
                  ? "Creating..."
                  : "Create Organization"}
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

export default CreateOrg;