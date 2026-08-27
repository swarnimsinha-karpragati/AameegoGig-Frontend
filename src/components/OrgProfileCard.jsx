import React, { useCallback, useEffect, useRef, useState } from "react";
import { Building2, Upload } from "lucide-react";
import {
  getOrgProfile,
  updateOrgProfile,
  uploadOrgLogo,
} from "../services/vendorService";
import { resolveMediaUrl } from "../utils/mediaUrl";
import "./OrgProfileCard.css";
import Button from "./Button";

export default function OrgProfileCard() {
  const fileRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [logoBroken, setLogoBroken] = useState(false);

  const loadProfile = () => {
    getOrgProfile()
      .then((res) => {
        const data = res.data?.data || null;
        setProfile(data);
        if (data?.logoUrl || data?.logoDisplayUrl) {
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const userObj = JSON.parse(storedUser);
            if (userObj.logoUrl !== data.logoUrl || userObj.logoDisplayUrl !== data.logoDisplayUrl) {
              userObj.logoUrl = data.logoUrl;
              userObj.logoDisplayUrl = data.logoDisplayUrl;
              localStorage.setItem('user', JSON.stringify(userObj));
              window.dispatchEvent(new Event("user-updated"));
            }
          }
        }
      })
      .catch(() => setError("Failed to load organization profile"));
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const syncStoredUser = useCallback((data) => {
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "null");
      if (!stored) return;
      const next = {
        ...stored,
        vendorName: data.name ?? stored.vendorName,
      };
      localStorage.setItem("user", JSON.stringify(next));
      window.dispatchEvent(new Event("user-updated"));
    } catch {
      // ignore
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await updateOrgProfile({
        name: profile.name,
        companyAddress: profile.companyAddress,
        contactEmail: profile.contactEmail,
        employeeCodePrefix: profile.employeeCodePrefix,
      });
      setProfile(res.data?.data);
      syncStoredUser(res.data?.data)
      setMessage("Organization profile saved. New payslips will use these details.");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const res = await uploadOrgLogo(file);
      const newLogoUrl = res.data?.data?.logoUrl;
      const newLogoDisplayUrl = res.data?.data?.logoDisplayUrl;

      setProfile((prev) => ({
        ...prev,
        logoUrl: newLogoUrl,
        logoDisplayUrl: newLogoDisplayUrl,
      }));

      const storedUser = localStorage.getItem('user');

      if (storedUser) {
        const userObj = JSON.parse(storedUser);
        userObj.logoUrl = newLogoUrl;
        userObj.logoDisplayUrl = newLogoDisplayUrl;
        localStorage.setItem('user', JSON.stringify(userObj));
        window.dispatchEvent(new Event("user-updated"));
      }

      setLogoBroken(false);
      setMessage("Logo uploaded. Re-download payslips to see the new branding.");
      setTimeout(() => setMessage(""), 3500);
    } catch (err) {
      setError(err.response?.data?.message || "Logo upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (!profile) {
    return (
      <div className="org-profile-card">
        <div className="org-profile-card__loading">Loading organization profile…</div>
      </div>
    );
  }

  const logoSrc = resolveMediaUrl(profile.logoDisplayUrl, profile.logoUrl);
  const showLogo = Boolean(logoSrc) && !logoBroken;

  return (
    <div className="org-profile-card">
      <div className="org-profile-card__head">
        <Building2 size={20} />
        <div>
          <h3>Organization Profile</h3>
          <p>Company details and logo shown on salary slips and letters.</p>
        </div>
      </div>

      <div className="org-profile-card__logo-row">
        <div className="org-profile-card__logo-preview">
          {showLogo ? (
            <img
              src={logoSrc}
              alt={`${profile.name} logo`}
              onError={() => setLogoBroken(true)}
            />
          ) : (
            <div className="org-profile-card__logo-fallback">
              {(profile.name || "ORG")
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w[0])
                .join("")
                .toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <button
            type="button"
            className="org-profile-card__upload-btn"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={15} />
            {uploading ? "Uploading…" : "Upload Logo"}
          </button>
          <p className="org-profile-card__hint">
            PNG or JPG, max 2 MB. Used on all payslips for this organization.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={handleLogoUpload}
          />
        </div>
      </div>

      <div className="org-profile-card__grid">
        <label>
          Organization Name
          <input
            value={profile.name || ""}
            onChange={(e) => handleChange("name", e.target.value)}
          />
        </label>
        <label>
          Org Code
          <input value={profile.code || ""} disabled />
        </label>
        <label>
          Employee Code Prefix
          <input
            value={profile.employeeCodePrefix || ""}
            maxLength={6}
            placeholder="e.g. AMG"
            onChange={(e) =>
              handleChange(
                "employeeCodePrefix",
                e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
              )
            }
          />
          <small className="org-profile-card__field-hint">
            New employees get codes like {(profile.employeeCodePrefix || "EMP")}-0001.
          </small>
        </label>
        <label className="full-width">
          Company Address
          <textarea
            rows={2}
            value={profile.companyAddress || ""}
            onChange={(e) => handleChange("companyAddress", e.target.value)}
            placeholder="Registered office address for payslip header"
          />
        </label>
        <label className="full-width">
          HR / Payroll Contact Email
          <input
            type="email"
            value={profile.contactEmail || ""}
            onChange={(e) => handleChange("contactEmail", e.target.value)}
            placeholder="hr@company.com"
          />
        </label>
      </div>

      <div className="org-profile-card__footer">
        <div>
          {message ? <p className="org-profile-card__msg success">{message}</p> : null}
          {error ? <p className="org-profile-card__msg error">{error}</p> : null}
        </div>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Organization Profile"}
        </Button>
      </div>
    </div>
  );
}
