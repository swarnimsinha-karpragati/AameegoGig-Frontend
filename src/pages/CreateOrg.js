import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createVendor } from "../services/authService";
import logo from "../assets/logo.png";

function CreateOrg() {
  const navigate = useNavigate();
  const emailRegex =
    /^[A-Za-z0-9]+([._]?[A-Za-z0-9]+)*@[A-Za-z0-9-]+(\.[A-Za-z]{2,})+$/;

  const [form, setForm] = useState({
    companyName: "",
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await createVendor(form);

      setMessage("Organization created successfully!");

      alert(`Organization Created!\n\nOrg Code: ${res.vendor.code}`);

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Email validation while typing
  const handleEmailChange = (e) => {
    const value = e.target.value;

    setForm({
      ...form,
      email: value,
    });

    if (value && !emailRegex.test(value)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

  return (
    <div className="auth-container">
      {/* LEFT SIDE */}
      <div className="auth-left">
        <div className="branding">
          <img src={logo} alt="Aameego" className="brand-logo" />

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
              maxLength={50}
            />

            <input
              type="email"
              placeholder="Admin Email"
              required
              value={form.email}
              onChange={handleEmailChange}
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
              {loading ? "Creating..." : "Create Organization"}
            </button>
          </form>

          {message && <p className="success">{message}</p>}

          {error && <p className="error">{error}</p>}

          {emailError && (
            <p
              style={{
                color: "red",
                fontSize: "12px",
                marginTop: "4px",
              }}
            >
              {emailError}
            </p>
          )}

          <div className="auth-links">
            <Link to="/login">← Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateOrg;
