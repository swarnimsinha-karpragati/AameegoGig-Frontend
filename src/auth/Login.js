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
  });

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
            <input
              name="emailOrPhone"
              type="text"
              placeholder="Email or Mobile Number"
              value={formData.emailOrPhone}
              onChange={handleChange}
              required
            />

            <input
              name="password"
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />

            <input
              name="vendorCode"
              type="text"
              placeholder="Organization Code"
              value={formData.vendorCode}
              onChange={handleChange}
              required
            />

            <button
              type="submit"
              disabled={isLoading}
            >
              {isLoading
                ? "Logging in..."
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