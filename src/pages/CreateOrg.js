import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createVendor } from "../services/authService";
import AuthLayout, { AuthHeader, AuthLogo } from "../auth/AuthLayout";

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
    <AuthLayout>
      <AuthLogo />
      <AuthHeader
        title="Create Organization"
        subtitle="Set up your workspace and start managing your workforce."
      />

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="co-name">Company Name</label>
          <input
            id="co-name"
            type="text"
            placeholder="Enter your company name"
            required
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
          />
        </div>

        <div className="auth-field">
          <label htmlFor="co-email">Admin Email</label>
          <input
            id="co-email"
            type="email"
            placeholder="Enter admin email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        <div className="auth-field">
          <label htmlFor="co-password">Password</label>
          <input
            id="co-password"
            type="password"
            placeholder="Create a password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        <div className="auth-field">
          <label htmlFor="co-logo">Company Logo</label>
          <input
            id="co-logo"
            type="file"
            accept="image/png, image/jpeg"
            onChange={handleLogoChange}
            style={{ fontSize: "13px" }}
          />
          <p className="auth-help">
            Recommended: 16:9 aspect ratio, PNG or JPG, up to ~10 MB.
          </p>
          {logoPreview && (
            <img
              src={logoPreview}
              alt="Logo Preview"
              style={{
                width: "203px",
                height: "52px",
                objectFit: "contain",
                border: "1px dashed #dee2e6",
                borderRadius: "8px",
                padding: "2px",
              }}
            />
          )}
        </div>

        {message && <p className="auth-success">{message}</p>}
        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? "Creating..." : "Create Organization"}
        </button>

        <p className="auth-alt">
          Already have an organization? <Link to="/login">Sign In</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export default CreateOrg;
