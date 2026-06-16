import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signupUser } from "../services/authService";
import logo from "../assets/logo.png";

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
            Aameego Gig
          </h1>

          <p className="brand-subtitle">
            Join your organization and manage
            your workforce seamlessly
          </p>

          <p className="brand-company">
            Powered by Kar Pragati Technologies Private Limited
          </p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="auth-right">
        <div className="auth-card">
          <h2>Join Organization</h2>

          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Full Name"
              required
              value={form.name}
              onChange={(e) =>
                handleChange(
                  "name",
                  e.target.value
                )
              }
            />

            <input
              type="text"
              placeholder="Email or Mobile Number"
              required
              value={form.emailOrPhone}
              onChange={(e) =>
                handleChange(
                  "emailOrPhone",
                  e.target.value
                )
              }
            />

            <input
              type="password"
              placeholder="Password"
              required
              value={form.password}
              onChange={(e) =>
                handleChange(
                  "password",
                  e.target.value
                )
              }
            />

            <input
              type="text"
              placeholder="Organization Code"
              required
              value={form.vendorCode}
              onChange={(e) =>
                handleChange(
                  "vendorCode",
                  e.target.value
                )
              }
            />

            <button
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Joining..."
                : "Join Organization"}
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

export default JoinOrg;