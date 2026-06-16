import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../services/authService";
import logo from "../assets/logo.png";

function Login() {
  const navigate = useNavigate();
<<<<<<< HEAD
  const regexPhnEmail =
    /^(\+91\s?[6-9]\d{9}|[A-Za-z0-9]+([._]?[A-Za-z0-9]+)*@[A-Za-z0-9-]+(\.[A-Za-z]{2,})+)$/;
  const orgRegex = /^[A-Z]{3}\d{4}$/;
=======
>>>>>>> origin/main

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
<<<<<<< HEAD
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
=======
>>>>>>> origin/main
    }

    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

<<<<<<< HEAD
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
=======
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
>>>>>>> origin/main
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* LEFT PANEL */}
      <div className="auth-left">
        <div className="branding">
<<<<<<< HEAD
          <img src={logo} alt="Aameego" className="brand-logo" />

          <h1 className="brand-heading">Aameego Gig</h1>

          <p className="brand-subtitle">Smart HRMS for modern workforce</p>
=======
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
>>>>>>> origin/main

          <p className="brand-company">
            Powered by Kar Pragati Technologies Private Limited
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="auth-right">
        <div className="auth-card">
          <h2>Login</h2>

<<<<<<< HEAD
=======
          <p className="auth-hint">
            Employees: use the email and temporary password shared by HR, plus
            your organization code.
          </p>

>>>>>>> origin/main
          <form onSubmit={handleSubmit}>
            <input
              name="emailOrPhone"
              type="text"
              placeholder="Email or Mobile Number"
              value={formData.emailOrPhone}
              onChange={handleChange}
              required
<<<<<<< HEAD
              className={error ? "input-error" : ""}
=======
>>>>>>> origin/main
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
<<<<<<< HEAD
              maxLength={7}
              className={error ? "input-error" : ""}
=======
>>>>>>> origin/main
            />

            <button
              type="submit"
<<<<<<< HEAD
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
=======
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
>>>>>>> origin/main
          </div>
        </div>
      </div>
    </div>
  );
}

<<<<<<< HEAD
export default Login;
=======
export default Login;
>>>>>>> origin/main
