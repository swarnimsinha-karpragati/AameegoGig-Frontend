import React, { useCallback, useEffect, useRef, useState } from "react";
import { Building2, PenLine, Upload } from "lucide-react";
import {
  useOrgProfile,
  useUpdateOrgProfile,
  useUploadOrgBrandingImage,
  useUploadOrgLogo,
} from "../hooks/useVendor";
import { resolveMediaUrl } from "../utils/mediaUrl";
import {
  normalizeEmployeeCodePrefix,
  orgFormToPayload,
  profileToForm,
  validateOrgProfile,
} from "../utils/orgProfileForm";
import "./OrgProfileCard.css";
import Button from "./Button";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export const checkImageFile = (file, { allowWebp = false } = {}) => {
  const types = ["image/png", "image/jpeg", ...(allowWebp ? ["image/webp"] : [])];
  if (!types.includes(file.type)) {
    return allowWebp ? "Choose a PNG, JPG or WEBP image" : "Choose a PNG or JPG image";
  }
  if (file.size > MAX_IMAGE_BYTES) return "Image must be 2 MB or smaller";
  return null;
};

function ImageSlot({ label, hint, src, fallback, uploading, onSelect, accept, buttonLabel }) {
  const inputRef = useRef(null);
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  const showImage = Boolean(src) && !broken;

  return (
    <div className="org-profile-card__logo-row">
      <div className="org-profile-card__logo-preview">
        {showImage ? (
          <img src={src} alt={label} onError={() => setBroken(true)} />
        ) : (
          fallback
        )}
      </div>
      <div>
        <button
          type="button"
          className="org-profile-card__upload-btn"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload size={15} />
          {uploading ? "Uploading…" : buttonLabel}
        </button>
        <p className="org-profile-card__hint">{hint}</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          aria-label={buttonLabel}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) await onSelect(file);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
      </div>
    </div>
  );
}

export default function OrgProfileCard() {
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const { data: profile } = useOrgProfile();
  const updateProfileMutation = useUpdateOrgProfile();
  const uploadLogoMutation = useUploadOrgLogo();
  const uploadBrandingMutation = useUploadOrgBrandingImage();

  // Seed the form once; later refetches (e.g. after an image upload) must not wipe unsaved edits.
  useEffect(() => {
    if (profile && !form) setForm(profileToForm(profile));
  }, [profile, form]);

  useEffect(() => {
    if (profile?.logoUrl || profile?.logoDisplayUrl) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userObj = JSON.parse(storedUser);
        if (userObj.logoUrl !== profile.logoUrl || userObj.logoDisplayUrl !== profile.logoDisplayUrl) {
          userObj.logoUrl = profile.logoUrl;
          userObj.logoDisplayUrl = profile.logoDisplayUrl;
          localStorage.setItem('user', JSON.stringify(userObj));
          window.dispatchEvent(new Event("user-updated"));
        }
      }
    }
  }, [profile?.logoUrl, profile?.logoDisplayUrl]);

  const flash = (text, ms = 3000) => {
    setMessage(text);
    setTimeout(() => setMessage(""), ms);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleBlur = (field) => {
    const { errors: next } = validateOrgProfile(form);
    setErrors((prev) => ({ ...prev, [field]: next[field] }));
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
    setMessage("");
    setError("");
    const result = validateOrgProfile(form);
    setErrors(result.errors);
    if (!result.valid) {
      setError("Fix the highlighted fields before saving.");
      return;
    }
    setSaving(true);
    try {
      const res = await updateProfileMutation.mutateAsync(orgFormToPayload(form));
      const updated = res.data?.data;
      if (updated) {
        syncStoredUser(updated);
        setForm(profileToForm(updated));
      }
      flash("Organization profile saved. New payslips and letters will use these details.");
    } catch (err) {
      const data = err.response?.data;
      if (data?.field) setErrors((prev) => ({ ...prev, [data.field]: data.message }));
      setError(data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file) => {
    setError("");
    setMessage("");
    const invalid = checkImageFile(file, { allowWebp: true });
    if (invalid) {
      setError(invalid);
      return;
    }
    setUploading("logo");
    try {
      const res = await uploadLogoMutation.mutateAsync(file);
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userObj = JSON.parse(storedUser);
        userObj.logoUrl = res.data?.data?.logoUrl;
        userObj.logoDisplayUrl = res.data?.data?.logoDisplayUrl;
        localStorage.setItem('user', JSON.stringify(userObj));
        window.dispatchEvent(new Event("user-updated"));
      }
      flash("Logo uploaded. Re-download payslips to see the new branding.", 3500);
    } catch (err) {
      setError(err.response?.data?.message || "Logo upload failed");
    } finally {
      setUploading("");
    }
  };

  const handleBrandingUpload = (kind, label) => async (file) => {
    setError("");
    setMessage("");
    const invalid = checkImageFile(file);
    if (invalid) {
      setError(`${label}: ${invalid}`);
      return;
    }
    setUploading(kind);
    try {
      await uploadBrandingMutation.mutateAsync({ kind, file });
      flash(`${label} uploaded. Newly issued letters will include it.`, 3500);
    } catch (err) {
      setError(err.response?.data?.message || `${label} upload failed`);
    } finally {
      setUploading("");
    }
  };

  if (!profile || !form) {
    return (
      <div className="org-profile-card">
        <div className="org-profile-card__loading">Loading organization profile…</div>
      </div>
    );
  }

  const initials = (form.name || profile.name || "ORG")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const fieldProps = (name) => ({
    value: form[name],
    onChange: (e) => handleChange(name, e.target.value),
    onBlur: () => handleBlur(name),
    "aria-invalid": errors[name] ? "true" : undefined,
    "aria-describedby": errors[name] ? `org-${name}-error` : undefined,
  });

  const fieldError = (name) =>
    errors[name] ? (
      <small id={`org-${name}-error`} className="org-profile-card__field-error" role="alert">
        {errors[name]}
      </small>
    ) : null;

  const emptySlot = (
    <div className="org-profile-card__image-empty">
      <PenLine size={20} aria-hidden="true" />
    </div>
  );

  return (
    <div className="org-profile-card">
      <div className="org-profile-card__head">
        <Building2 size={20} />
        <div>
          <h3>Organization Profile</h3>
          <p>Company details and logo shown on salary slips and letters.</p>
        </div>
      </div>

      <ImageSlot
        label={`${form.name || profile.name} logo`}
        buttonLabel="Upload Logo"
        hint="PNG, JPG or WEBP, max 2 MB. Used on all payslips and letters for this organization."
        src={resolveMediaUrl(profile.logoDisplayUrl, profile.logoUrl)}
        fallback={<div className="org-profile-card__logo-fallback">{initials}</div>}
        uploading={uploading === "logo"}
        accept="image/png,image/jpeg,image/webp"
        onSelect={handleLogoUpload}
      />

      <div className="org-profile-card__grid">
        <label>
          Organization Name *
          <input {...fieldProps("name")} maxLength={120} />
          {fieldError("name")}
        </label>
        <label>
          Org Code
          <input value={profile.code || ""} disabled />
        </label>
        <label>
          Employee Code Prefix *
          <input
            {...fieldProps("employeeCodePrefix")}
            maxLength={6}
            placeholder="e.g. AMG"
            onChange={(e) => handleChange("employeeCodePrefix", normalizeEmployeeCodePrefix(e.target.value))}
          />
          {fieldError("employeeCodePrefix") || (
            <small className="org-profile-card__field-hint">
              New employees get codes like {form.employeeCodePrefix || "EMP"}-0001.
            </small>
          )}
        </label>
        <label className="full-width">
          Company Address
          <textarea
            rows={2}
            {...fieldProps("companyAddress")}
            maxLength={500}
            placeholder="Registered office address for payslip and letter header"
          />
          {fieldError("companyAddress")}
        </label>
        <label className="full-width">
          HR / Payroll Contact Email
          <input type="email" {...fieldProps("contactEmail")} placeholder="hr@company.com" />
          {fieldError("contactEmail")}
        </label>
      </div>

      <div className="org-profile-card__section">
        <h4>Letter signatory</h4>
        <p>Printed at the end of generated letters. Leave blank to sign letters manually.</p>
      </div>

      <div className="org-profile-card__grid">
        <label>
          Authorised Signatory Name
          <input {...fieldProps("signatoryName")} maxLength={100} placeholder="e.g. Priya Sharma" />
          {fieldError("signatoryName")}
        </label>
        <label>
          Signatory Designation
          <input {...fieldProps("signatoryTitle")} maxLength={100} placeholder="e.g. Head - Human Resources" />
          {fieldError("signatoryTitle")}
        </label>
      </div>

      <div className="org-profile-card__branding">
        <ImageSlot
          label="Signature"
          buttonLabel="Upload Signature"
          hint="PNG or JPG, max 2 MB. A transparent background looks best."
          src={resolveMediaUrl(profile.signatureDisplayUrl, profile.signatureImageUrl)}
          fallback={emptySlot}
          uploading={uploading === "signature"}
          accept="image/png,image/jpeg"
          onSelect={handleBrandingUpload("signature", "Signature")}
        />
        <ImageSlot
          label="Company stamp"
          buttonLabel="Upload Stamp"
          hint="PNG or JPG, max 2 MB. Shown beside the signature."
          src={resolveMediaUrl(profile.stampDisplayUrl, profile.stampImageUrl)}
          fallback={emptySlot}
          uploading={uploading === "stamp"}
          accept="image/png,image/jpeg"
          onSelect={handleBrandingUpload("stamp", "Company stamp")}
        />
      </div>

      <div className="org-profile-card__footer">
        <div aria-live="polite">
          {message ? <p className="org-profile-card__msg success">{message}</p> : null}
          {error ? <p className="org-profile-card__msg error">{error}</p> : null}
        </div>
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Organization Profile"}
        </Button>
      </div>
    </div>
  );
}