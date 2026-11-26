import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signupUser } from "../services/authService";
import AuthLayout, { AuthHeader, AuthLogo } from "../auth/AuthLayout";


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
    <AuthLayout>
      <AuthLogo />
      <AuthHeader
        title="Join Organization"
        subtitle="Join your organization and manage your workforce seamlessly."
      />

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="jo-name">Full Name</label>
          <input
            id="jo-name"
            type="text"
            placeholder="Enter your full name"
            required
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
          />
        </div>

        <div className="auth-field">
          <label htmlFor="jo-contact">Work Email or Mobile Number</label>
          <input
            id="jo-contact"
            type="text"
            placeholder="Enter your work email or mobile number"
            required
            value={form.emailOrPhone}
            onChange={(e) => handleChange("emailOrPhone", e.target.value)}
          />
        </div>

        <div className="auth-field">
          <label htmlFor="jo-password">Password</label>
          <input
            id="jo-password"
            type="password"
            placeholder="Create a password"
            required
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
          />
        </div>

        <div className="auth-field">
          <label htmlFor="jo-org">Organization Code</label>
          <input
            id="jo-org"
            type="text"
            placeholder="Enter your organisation code"
            required
            value={form.vendorCode}
            onChange={(e) => handleChange("vendorCode", e.target.value)}
          />
          <p className="auth-help">Provided by your HR administrator</p>
        </div>

        {message && <p className="auth-success">{message}</p>}
        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? "Joining..." : "Join Organization"}
        </button>

        <p className="auth-alt">
          Already have an organization? <Link to="/login">Sign In</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export default JoinOrg;
