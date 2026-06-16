import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createVendor } from "../services/authService";
import logo from "../assets/logo.png";

function CreateOrg() {
  const navigate = useNavigate();
<<<<<<< HEAD
  const emailRegex =
    /^[A-Za-z0-9]+([._]?[A-Za-z0-9]+)*@[A-Za-z0-9-]+(\.[A-Za-z]{2,})+$/;
=======
>>>>>>> origin/main

  const [form, setForm] = useState({
    companyName: "",
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
<<<<<<< HEAD
  const [emailError, setEmailError] = useState("");
=======
>>>>>>> origin/main

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await createVendor(form);

      setMessage("Organization created successfully!");

<<<<<<< HEAD
      alert(`Organization Created!\n\nOrg Code: ${res.vendor.code}`);
=======
      alert(
        `Organization Created!\n\nOrg Code: ${res.vendor.code}`
      );
>>>>>>> origin/main

      setTimeout(() => {
        navigate("/login");
      }, 2000);
<<<<<<< HEAD
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
=======

    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong"
      );
>>>>>>> origin/main
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
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
=======
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
>>>>>>> origin/main

          <h1 className="brand-heading">
            Aameego <span>Gig</span>
          </h1>

          <p className="brand-subtitle">
            Build and manage your workforce smarter
          </p>

          <p className="brand-company">
            Powered by Kar Pragati Technologies Private Limited
          </p>
<<<<<<< HEAD
=======

>>>>>>> origin/main
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="auth-right">
<<<<<<< HEAD
        <div className="auth-card">
          <h2>Create Organization</h2>

          <form onSubmit={handleSubmit}>
=======

        <div className="auth-card">

          <h2>Create Organization</h2>

          <form onSubmit={handleSubmit}>

>>>>>>> origin/main
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
<<<<<<< HEAD
              maxLength={50}
=======
>>>>>>> origin/main
            />

            <input
              type="email"
              placeholder="Admin Email"
              required
              value={form.email}
<<<<<<< HEAD
              onChange={handleEmailChange}
=======
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value,
                })
              }
>>>>>>> origin/main
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
<<<<<<< HEAD
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
=======
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

>>>>>>> origin/main
        </div>
      </div>
    </div>
  );
}

<<<<<<< HEAD
export default CreateOrg;
=======
export default CreateOrg;
>>>>>>> origin/main
