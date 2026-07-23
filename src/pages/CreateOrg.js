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

  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // File Change Handler with dynamic validation
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit (~35 KB / 50 KB limit safeguard)
    if (file.size >100 * 100 * 1024) {
      setError("File size is too large. Please upload an image under 10 MB.");
      return;
    }

    // Optional: Validate image dimensions before accepting
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      setError("");
      setLogo(file);
      setLogoPreview(img.src);
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      // Use FormData to support binary file uploads
      const formData = new FormData();
      formData.append("companyName", form.companyName);
      formData.append("email", form.email);
      formData.append("password", form.password);
      if (logo) {
        formData.append("logo", logo);
      }

      // Ensure your backend endpoint in authService accepts FormData
      const res = await createVendor(formData);

      setMessage("Organization created successfully!");

      alert(`Organization Created!\n\nOrg Code: ${res.vendor.code}`);

      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Something went wrong while creating the organization."
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

              {/* ================= LOGO UPLOAD FIELD ================= */}
              <div className="input-group" style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "4px" }}>
                  Company Logo
                </label>
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={handleLogoChange}
                  style={{ fontSize: "0.85rem" }}
                />

                {/* Dimension & Spec Guidelines */}
                <small style={{ display: "block", color: "#666", marginTop: "6px", fontSize: "0.78rem" }}>
                  <strong>Recommended specifications:</strong><br />
                  Aspect Ratio: <strong>16:9</strong><br />
                  Max file size: <strong>~10 MB</strong> (PNG, JPG)
                </small>

                {/* Optional Image Preview */}
                {logoPreview && (
                  <div style={{ marginTop: "10px" }}>
                    <p style={{ fontSize: "0.75rem", margin: "0 0 4px 0", color: "#444" }}>Preview:</p>
                    <img
                      src={logoPreview}
                      alt="Logo Preview"
                      style={{
                        width: "203px",
                        height: "52px",
                        objectFit: "contain",
                        border: "1px dashed #ccc",
                        borderRadius: "4px",
                        padding: "2px"
                      }}
                    />
                  </div>
                )}
              </div>

              <button type="submit" className="btn-login mt-3" disabled={loading}>
                {loading ? "Creating..." : "Create Organization"}
              </button>
            </form>

            {message && (
              <p className="success-message" style={{ color: "green", marginTop: "10px" }}>
                {message}
              </p>
            )}

            {error && <p className="error" style={{ color: "red", marginTop: "10px" }}>{error}</p>}

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
                style={{ textDecoration: "none" }}
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