import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../services/authService";
import logo from "../assets/logo.png";

function Login() {
  const navigate = useNavigate();
  const regexPhnEmail =
    /^(\+91\s?[6-9]\d{9}|[A-Za-z0-9]+([._]?[A-Za-z0-9]+)*@[A-Za-z0-9-]+(\.[A-Za-z]{2,})+)$/;
  const orgRegex = /^[A-Z]{3}\d{4}$/;

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
      // Allow only letters and numbers
      if (!orgRegex.test(value)) {
        setError((prevMsg) => {
          if (prevMsg == "Please enter a valid organization code") {
            return prevMsg; // no update if the same error is already shown
          }
          return "Please enter a valid organization code";
        });
        // return;
      } else {
        setError((prevMsg) => {
          if (prevMsg == "Please enter a valid organization code") {
            return ""; // clear error if it was the organization code error
          }
          return prevMsg; // no update if it was a different error});
        });
      }
    }
    // Email or Mobile validation while typing
    if (e.target.name === "emailOrPhone") {
      if (!regexPhnEmail.test(value)) {
        setError((prevMsg) => {
          if (prevMsg == "Please enter a valid email or mobile number") {
            return prevMsg; // no update if the same error is already shown
          }
          return "Please enter a valid email or mobile number";
        });
        // return;
      } else {
        setError((prevMsg) => {
          if (prevMsg == "Please enter a valid email or mobile number") {
            return ""; // clear error if it was the email/phone error
          }
          return prevMsg; // no update if it was a different error});
        });
      }
    }

    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const valueEmailPhn = formData.emailOrPhone.trim();
    const valueOrg = formData.vendorCode.trim();

    if (!orgRegex.test(valueOrg)) {
      setError("Please enter a valid organization code");
      return;
    }

    if (!regexPhnEmail.test(valueEmailPhn)) {
      setError("Please enter a valid email or mobile number");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const res = await loginUser(formData);
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
      console.log("Login successful, token stored:", res.user);
      console.log("User data stored:", res.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* LEFT PANEL */}
      <div className="auth-left">
        <div className="branding">
          <img src={logo} alt="Aameego" className="brand-logo" />

          <h1 className="brand-heading">Aameego Gig</h1>

          <p className="brand-subtitle">Smart HRMS for modern workforce</p>

          <p className="brand-company">
            Powered by Kar Pragati Technologies Private Limited
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="auth-right">
        <div className="auth-card">
          <h2>Login</h2>

          <form onSubmit={handleSubmit}>
            <input
              name="emailOrPhone"
              type="text"
              placeholder="Email or Mobile Number"
              value={formData.emailOrPhone}
              onChange={handleChange}
              required
              className={error ? "input-error" : ""}
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
              maxLength={7}
              className={error ? "input-error" : ""}
            />

            <button
              type="submit"
              className="loginSubmitBtn"
              disabled={isLoading || error}
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>

          {error && <p className="error">{error}</p>}

          <div className="auth-links">
            <Link to="/create-org">Create Organization</Link>

            <Link to="/join">Join Organization</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
