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
  ShieldCheck,
  HeartPulse,
  PhoneCall,
  MapPin,
  Cake,
  CalendarDays,
  Info,
} from "lucide-react";
import useFormValidation from "../hooks/useFormValidation";
import {
  getMyProfile,
  updateMyProfile,
  uploadMyProfilePhoto,
} from "../services/userProfileService";
import { getMyProbationHistory } from "../services/probationService";
import ProbationHistoryModal from "./ProbationHistoryModal";
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
  error,
  type = "text",
  max,
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
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          max={max}
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
  const [reportingManager, setReportingManager] = useState(null);
  const [employmentStatus, setEmploymentStatus] = useState(null);
  const [dateOfJoining, setDateOfJoining] = useState(null);
  const [designation, setDesignation] = useState("");
  // Self-editable personal details
  const [dob, setDob] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  // Identity lock: email/phone editable ONLY when missing (once set, HR only)
  const [emailLocked, setEmailLocked] = useState(true);
  const [phoneLocked, setPhoneLocked] = useState(true);

  const toDateInput = (v) => {
    if (!v) return "";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  };
  const maxDobInput = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().slice(0, 10);
  };
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
  const [showProbHist, setShowProbHist] = useState(false);
  const [probHistData, setProbHistData] = useState(null);
  const [probHistLoading, setProbHistLoading] = useState(false);
  const [probHistError, setProbHistError] = useState("");

  const openProbationHistory = async () => {
    setShowProbHist(true);
    setProbHistLoading(true);
    setProbHistError("");
    try {
      const data = await getMyProbationHistory();
      setProbHistData(data);
    } catch (err) {
      setProbHistError(err.response?.data?.message || "Could not load probation history");
    } finally {
      setProbHistLoading(false);
    }
  };

  const profileFields = (values) => {
    const fields = [
      { name: "fullName", label: "Full Name", value: values.fullName, kind: "person_name", required: true },
      { name: "location", label: "Location", value: values.location, required: true },
    ];
    // Email/phone validate only when the employee is adding a missing one.
    if (!values.emailLocked) {
      fields.push({ name: "email", label: "Email", value: values.email, inputType: "email", required: false });
    }
    if (!values.phoneLocked) {
      fields.push({ name: "phone", label: "Phone", value: values.phone, inputType: "tel", required: false });
    }
    return fields;
  };

  const applyProfileData = (data) => {
    setFullName(data.name || "");
    setEmail(data.email || "");
    setPhone(data.phone || "");
    setLocation(data.location || "");
    setDepartment(data.department || "");
    setRole(data.role || "");
    setDesignation(data.designation || "");
    setReportingManager(data.reportingManager || null);
    setEmploymentStatus(data.employmentStatus || null);
    setDateOfJoining(data.dateOfJoining || null);
    setDob(toDateInput(data.dob));
    setBloodGroup(data.bloodGroup || "");
    setEmergencyContact(data.emergencyContact || "");
    setPermanentAddress(data.permanentAddress || "");
    setEmailLocked(Boolean(String(data.email || "").trim()));
    setPhoneLocked(Boolean(String(data.phone || "").trim()));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const validateForm = () => {
    const result = validateAll(
      profileFields({ fullName, phone, location, email, emailLocked, phoneLocked })
    );
    if (!result.valid) return false;
    // At least one contact must exist when both are being added fresh.
    if (!emailLocked && !phoneLocked && !String(email || "").trim() && !String(phone || "").trim()) {
      validateOne({ name: "phone", label: "Phone", value: phone, inputType: "tel", required: true });
      return false;
    }
    return true;
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
      window.dispatchEvent(new Event("user-updated"));
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
        ...(!emailLocked ? { email } : {}),
        dob: dob || undefined,
        bloodGroup,
        emergencyContact,
        permanentAddress,
      });
      const data = res.data?.data || {};
      applyProfileData(data);
      syncStoredUser(data);
      setIsFormDisabled(true);
      setShowSavePopup(true);
      window.dispatchEvent(new Event("user-updated"));
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

      <div className="profile-info-strip">
        {emailLocked ? (
          <div className="profile-info-item">
            <span className="profile-info-icon profile-info-icon--blue"><Mail size={15} /></span>
            <span className="profile-info-copy">
              <span className="profile-info-label">Email</span>
              <span className="profile-info-value" title={email}>{email || "-"}</span>
            </span>
          </div>
        ) : null}
        {phoneLocked ? (
          <div className="profile-info-item">
            <span className="profile-info-icon profile-info-icon--green"><Phone size={15} /></span>
            <span className="profile-info-copy">
              <span className="profile-info-label">Phone</span>
              <span className="profile-info-value">{phone || "-"}</span>
            </span>
          </div>
        ) : null}
        <div className="profile-info-item">
          <span className="profile-info-icon profile-info-icon--purple"><Briefcase size={15} /></span>
          <span className="profile-info-copy">
            <span className="profile-info-label">Department</span>
            <span className="profile-info-value" title={department}>{department || "-"}</span>
          </span>
        </div>
        <div className="profile-info-item">
          <span className="profile-info-icon profile-info-icon--amber"><ShieldCheck size={15} /></span>
          <span className="profile-info-copy">
            <span className="profile-info-label">Role</span>
            <span className="profile-info-value">{role || "-"}</span>
          </span>
        </div>
        {designation ? (
          <div className="profile-info-item">
            <span className="profile-info-icon profile-info-icon--cyan"><User size={15} /></span>
            <span className="profile-info-copy">
              <span className="profile-info-label">Designation</span>
              <span className="profile-info-value" title={designation}>{designation}</span>
            </span>
          </div>
        ) : null}
        {role !== "Admin" ? (
          <div className="profile-info-item">
            <span className="profile-info-icon profile-info-icon--amber"><CalendarDays size={15} /></span>
            <span className="profile-info-copy">
              <span className="profile-info-label">Date of Joining</span>
              <span className="profile-info-value">
                {dateOfJoining ? new Date(dateOfJoining).toLocaleDateString() : "-"}
              </span>
            </span>
          </div>
        ) : null}
        {employmentStatus ? (
          <div className="profile-info-item">
            <span className="profile-info-icon profile-info-icon--green"><ShieldCheck size={15} /></span>
            <span className="profile-info-copy">
              <span className="profile-info-label">Employment Status</span>
              <span className="profile-info-value">
                {employmentStatus === "probation" ? "Probation" : "Full-time"}
                {employmentStatus === "probation" ? (
                  <button
                    type="button"
                    className="emp-info-btn"
                    title="View probation history"
                    aria-label="View probation history"
                    onClick={openProbationHistory}
                  >
                    <Info size={12} />
                  </button>
                ) : null}
              </span>
            </span>
          </div>
        ) : null}
        {role !== "Admin" ? (
          <div className="profile-info-item">
            <span className="profile-info-icon profile-info-icon--pink"><User size={15} /></span>
            <span className="profile-info-copy">
              <span className="profile-info-label">Reporting Manager</span>
              <span className="profile-info-value">{reportingManager?.name || "Not assigned"}</span>
            </span>
          </div>
        ) : null}
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
                onError={() => setProfileImage("")}
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

          {!emailLocked ? (
            <InputField
              label="Email"
              icon={<Mail size={15} color="#2563eb" />}
              value={email}
              type="email"
              onChange={(e) => {
                const value = e.target.value.replace(/^\s+/, "");
                setEmail(value);
                handleFieldChange("email", "Email", value, { inputType: "email" });
              }}
              placeholder="Enter your email"
              error={errors.email}
              isFormDisabled={isFormDisabled}
            />
          ) : null}

          {!phoneLocked ? (
            <InputField
              label="Phone"
              icon={<Phone size={15} color="#2563eb" />}
              value={phone}
              type="tel"
              onChange={(e) => {
                const value = e.target.value;
                setPhone(value);
                handleFieldChange("phone", "Phone", value, { inputType: "tel" });
              }}
              placeholder="Enter phone number"
              error={errors.phone}
              isFormDisabled={isFormDisabled}
            />
          ) : null}

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
            label="Date of Birth"
            icon={<Cake size={15} color="#2563eb" />}
            value={dob}
            type="date"
            max={maxDobInput()}
            onChange={(e) => setDob(e.target.value)}
            placeholder="Select date of birth"
            isFormDisabled={isFormDisabled}
          />

          <InputField
            label="Blood Group"
            icon={<HeartPulse size={15} color="#2563eb" />}
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value)}
            placeholder="e.g. B+"
            isFormDisabled={isFormDisabled}
          />

          <InputField
            label="Emergency Contact"
            icon={<PhoneCall size={15} color="#2563eb" />}
            value={emergencyContact}
            type="tel"
            onChange={(e) => setEmergencyContact(e.target.value)}
            placeholder="Emergency phone number"
            isFormDisabled={isFormDisabled}
          />

          <InputField
            label="Permanent Address"
            icon={<MapPin size={15} color="#2563eb" />}
            value={permanentAddress}
            onChange={(e) => setPermanentAddress(e.target.value)}
            placeholder="Enter permanent address"
            isFormDisabled={isFormDisabled}
          />

        </div>
      </div>

      {!isFormDisabled ? (
        <div className="button-row">
          <Button
            className="secondary-btn"
            onClick={handleDiscard}
            disabled={saving}
          >
            Discard
          </Button>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      ) : null}

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

      {/* probation history (employee self view) */}
      <ProbationHistoryModal
        open={showProbHist}
        onClose={() => setShowProbHist(false)}
        loading={probHistLoading}
        error={probHistError}
        data={probHistData}
      />
    </div>
  );
}
