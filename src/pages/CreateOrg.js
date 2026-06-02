import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createVendor } from "../services/authService";
import logo from "../assets/logo.png";

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
    <div className="auth-container">

      {/* LEFT SIDE */}
      <div className="auth-left">
        <div className="branding">

          <img
            src={logo}
            alt="Aameego"
            className="brand-logo"
          />

          <h1 className="brand-heading">
            Aameego <span>Gig</span>
          </h1>

          <p className="brand-subtitle">
            Build and manage your workforce smarter
          </p>

          <p className="brand-company">
            Powered by Kar Pragati Technologies Private Limited
          </p>

        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="auth-right">

        <div className="auth-card">

          <h2>Create Organization</h2>

          <form onSubmit={handleSubmit}>

            <input
              type="text"
              placeholder="Company Name"
              required
              value={form.companyName}
              onChange={(e) =>
                setForm({
                  ...form,
                  companyName: e.target.value,
                })
              }
            />

            <input
              type="email"
              placeholder="Admin Email"
              required
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value,
                })
              }
            />

            <input
              type="password"
              placeholder="Password"
              required
              value={form.password}
              onChange={(e) =>
                setForm({
                  ...form,
                  password: e.target.value,
                })
              }
            />

            <button disabled={loading}>
              {loading
                ? "Creating..."
                : "Create Organization"}
            </button>

          </form>

          {message && (
            <p className="success">{message}</p>
          )}

          {error && (
            <p className="error">{error}</p>
          )}

          <div className="auth-links">
            <Link to="/login">
              ← Back to Login
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

export default CreateOrg;