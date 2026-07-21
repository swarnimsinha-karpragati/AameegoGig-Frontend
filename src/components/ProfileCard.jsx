import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Camera,
  Mail,
  Phone,
  Briefcase,
  Pencil,
  PencilOff,
  LocateIcon,
  User,
} from "lucide-react";
import useFormValidation from "../hooks/useFormValidation";
import {
  getMyProfile,
  updateMyProfile,
  uploadMyProfilePhoto,
} from "../services/userProfileService";
import { resolveMediaUrl } from "../utils/mediaUrl";
import "./ProfileCard.css";
import Button from "./Button";
function InputField({
  icon,
  label,
  value,
  onChange,
  placeholder,
  isFormDisabled,
  error
}) {
  return (
    <div className="field-container">
      {/* {label && <label className="profile-label">{label}</label>} */}
      
      <div className="label-row">
    {label && (
      <label className="profile-label">
        {label}
      </label>
    )}

    {error && (
      <span className="error-inline">
        {error}
      </span>
    )}
  </div>

      <div className="input-wrapper">
        <div className="input-icon">{icon}</div>

        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={isFormDisabled}
          className={`profile-input 
            ${isFormDisabled ? "input-disabled" : ""}
            ${error ? "input-error" : ""}
            `}
        />
      </div>
    </div>
  );
}

export default function ProfileCard() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");
  const [isFormDisabled, setIsFormDisabled] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const galleryInputRef = useRef(null);
  const [profileImage, setProfileImage] = useState("");
  const cameraInputRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const { errors, validateOne, validateAll, clearAll } = useFormValidation();
  const [showSavePopup, setShowSavePopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const profileFields = (values) => [
    { name: "fullName", label: "Full Name", value: values.fullName, kind: "person_name", required: true },
    { name: "email", label: "Email", value: values.email, inputType: "email", required: true },
    { name: "phone", label: "Phone", value: values.phone, inputType: "tel", required: true },
    { name: "location", label: "Location", value: values.location, required: true },
    { name: "department", label: "Department", value: values.department, required: true },
    { name: "role", label: "Role", value: values.role, required: true },
  ];

  const applyProfileData = (data) => {
    setFullName(data.name || "");
    setEmail(data.email || "");
    setPhone(data.phone || "");
    setLocation(data.location || "");
    setDepartment(data.department || "");
    setRole(data.role || "");
    setProfileImage(resolveMediaUrl(data.photoDisplayUrl, data.photoUrl));
  };

  console.log(profileImage)

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await getMyProfile();
      applyProfileData(res.data?.data || {});
    } catch (err) {
      setLoadError(err.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const validateForm = () => {
    const result = validateAll(
      profileFields({ fullName, email, phone, location, department, role })
    );
    return result.valid;
  };

  const handleFieldChange = (name, label, value, extra = {}) => {
    validateOne({ name, label, value, required: true, ...extra });
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  const startNativeCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => setCameraReady(true));
        };
      }
    } catch {
      // camera permission denied or unavailable
    }
  }, [stopCamera]);

  useEffect(() => {
    if (showCamera) {
      startNativeCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [showCamera, startNativeCamera, stopCamera]);

  const syncStoredUser = useCallback((data) => {
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "null");
      if (!stored) return;
      const next = {
        ...stored,
        name: data.name ?? stored.name,
        phone: data.phone ?? stored.phone,
        photoUrl: data.photoUrl ?? stored.photoUrl,
        photoDisplayUrl: data.photoDisplayUrl ?? stored.photoDisplayUrl,
      };
      localStorage.setItem("user", JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const uploadPhoto = useCallback(async (file) => {
    setUploadingPhoto(true);
    setActionError("");
    try {
      const res = await uploadMyProfilePhoto(file);
      const data = res.data?.data || {};
      setProfileImage(resolveMediaUrl(data.photoDisplayUrl, data.photoUrl));
      syncStoredUser(data);
    } catch (err) {
      setActionError(err.response?.data?.message || "Photo upload failed");
    } finally {
      setUploadingPhoto(false);
    }
  }, [syncStoredUser]);

  const captureNativePhoto = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !cameraReady) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `profile-${Date.now()}.jpg`, { type: "image/jpeg" });
      await uploadPhoto(file);
      setShowCamera(false);
    }, "image/jpeg", 0.9);
  }, [cameraReady, uploadPhoto]);

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadPhoto(file);
    }
    if (e.target) e.target.value = "";
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setActionError("");
    try {
      const res = await updateMyProfile({
        name: fullName,
        phone,
        location,
        department,
      });
      const data = res.data?.data || {};
      applyProfileData(data);
      syncStoredUser(data);
      setIsFormDisabled(true);
      setShowSavePopup(true);
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = async () => {
    clearAll();
    setIsFormDisabled(true);
    await loadProfile();
  };

  const avatarInitial =
    (fullName || email || "U").trim().charAt(0).toUpperCase() || "U";

  if (loading) {
    return (
      <div className="profile-card">
        <div className="profile-card__loading">Loading profile…</div>
      </div>
    );
  }
  return (
    <div className="profile-card">
      <div className="profile-header">
        <div>
          <h2 className="profile-title">Profile Settings</h2>

          <p className="profile-subtitle">Update your personal information</p>
        </div>

        <button
          className="edit-btn"
          onClick={() => setIsFormDisabled((prev) => !prev)}
        >
          {isFormDisabled ? <PencilOff size={16} /> : <Pencil size={16} />}
        </button>
      </div>

      <div className="profile-content">
        {loadError ? <p className="profile-error">{loadError}</p> : null}
        {actionError ? <p className="profile-error">{actionError}</p> : null}

        <div className="profile-avatar-section">
          <div className="profile-avatar">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="profile-avatar-img"
              />
            ) : (
              avatarInitial
            )}
          </div>

          <button
            className="camera-btn"
            onClick={() => setShowOptions(true)}
            disabled={uploadingPhoto}
          >
            <Camera size={16} />
          </button>

          {uploadingPhoto ? (
            <p className="profile-upload-status">Uploading photo…</p>
          ) : null}

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleImageChange}
          />

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            hidden
            onChange={handleImageChange}
          />
        </div>

        <div className="profile-form-grid">
          <InputField
            label="Full Name"
            icon={<User size={15} color="#2563eb" />}
            value={fullName}
            onChange={(e) => {
              const value = e.target.value.replace(/^\s+/, "");;
              setFullName(value);
              handleFieldChange("fullName", "Full Name", value, { kind: "person_name" });
            }}
            placeholder="Enter your full name"
            error={errors.fullName}
            isFormDisabled={isFormDisabled}
          />
          {/* {errors.fullName && <p className="error-text">{errors.fullName}</p>} */}

          <InputField
            label="Email"
            icon={<Mail size={15} color="#2563eb" />}
            value={email}
            onChange={() => {}}
            placeholder="Enter your email"
            error={errors.email}
            isFormDisabled
          />
          {/* {errors.email && <p className="error-text">{errors.email}</p>} */}

          <InputField
            label="Phone"
            icon={<Phone size={15} color="#2563eb" />}
            value={phone}
            onChange={(e) => {
              const value = e.target.value;
              setPhone(value);
              handleFieldChange("phone", "Phone", value, { inputType: "tel" });
            }}
            placeholder="Enter phone number"
            error={errors.phone}
            isFormDisabled={isFormDisabled}
          />
          {/* {errors.phone && <p className="error-text">{errors.phone}</p>} */}

          <InputField
            label="Location"
            icon={<LocateIcon size={15} color="#2563eb" />}
            value={location}
            onChange={(e) => {
              const value = e.target.value;
              setLocation(value);
              handleFieldChange("location", "Location", value);
            }}
            placeholder="Enter location"
            error={errors.location}
            isFormDisabled={isFormDisabled}
          />
          {/* {errors.location && <p className="error-text">{errors.location}</p>} */}

          <InputField
            label="Department"
            icon={<Briefcase size={15} color="#2563eb" />}
            value={department}
            onChange={(e) => {
              const value = e.target.value;
              setDepartment(value);
              handleFieldChange("department", "Department", value);
            }}
            placeholder="Enter department"
            error={errors.department}
            isFormDisabled={isFormDisabled}
          />
          

          <InputField
            label="Role"
            icon={<Briefcase size={15} color="#2563eb" />}
            value={role}
            onChange={() => {}}
            placeholder="Enter role"
            error={errors.role}
            isFormDisabled
          />
       
        </div>
      </div>

      <div className="button-row">
        <Button
          className="secondary-btn"
          onClick={handleDiscard}
          disabled={saving}
        >
          Discard
        </Button>

        <Button onClick={handleSave} disabled={saving || isFormDisabled}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      {/* Popup */}
      {showOptions && (
        <div className="upload-overlay">
          <div className="upload-modal">
            <button
              className="upload-close"
              onClick={() => setShowOptions(false)}
            >
              ✕
            </button>

            <div className="upload-icon">📷</div>

            <h2>Profile Photo</h2>

            <p>Select how you want to upload your profile picture</p>

            <div className="camera-options">
              <Button
                
                onClick={() => {
                  galleryInputRef.current?.click();
                  setShowOptions(false);
                }}
              >
                Choose From Gallery
              </Button>

              <Button
                
                onClick={() => {
                  setShowCamera(true);
                  setShowOptions(false);
                }}
              >
                Open Camera
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* webcam popup — native getUserMedia */}
      {showCamera && (
        <div className="upload-overlay">
          <div className="upload-modal">
            <button
              className="upload-close"
              onClick={() => setShowCamera(false)}
            >
              ✕
            </button>

            <div className="upload-icon">📷</div>

            <h2>Capture Photo</h2>

            <video
              ref={videoRef}
              playsInline
              muted
              style={{ width: "100%", borderRadius: "12px", marginTop: "10px" }}
            />
            {!cameraReady && (
              <p style={{ textAlign: "center", color: "#888", marginTop: 8 }}>Starting camera…</p>
            )}

            <Button
              style={{ marginTop: "16px" }}
              onClick={captureNativePhoto}
              disabled={!cameraReady}
            >
              Capture Photo
            </Button>
          </div>
        </div>
      )}

      {/* save popup */}
      {showSavePopup && (
  <div className="upload-overlay">
    <div className="upload-modal">
      <button
        className="upload-close"
        onClick={() => setShowSavePopup(false)}
      >
        ✕
      </button>

      <div className="upload-icon">✅</div>

      <h2>Profile Saved</h2>

      <p>
        Your profile details have been saved successfully.
      </p>

      <button
        className="upload-submit-btn"
        onClick={() => setShowSavePopup(false)}
      >
        OK
      </button>
    </div>
  </div>
)}
    </div>
  );
}
