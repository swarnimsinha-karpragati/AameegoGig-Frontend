import React, { useState, useRef } from "react";
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
import "./ProfileCard.css";
import Webcam from "react-webcam";
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
  const [profileImage, setProfileImage] = useState(null);
  const cameraInputRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);
  const webcamRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [showSavePopup, setShowSavePopup] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log(file);
      setProfileImage(URL.createObjectURL(file));
    }
  };
  const handleRemoveImage = () => {
    setProfileImage(null);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Full Name is required";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Enter a valid email";
    }

    if (!phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(phone)) {
      newErrors.phone = "Phone must be 10 digits";
    }

    if (!location.trim()) {
      newErrors.location = "Location is required";
    }

    if (!department.trim()) {
      newErrors.department = "Department is required";
    }

    if (!role.trim()) {
      newErrors.role = "Role is required";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const validateField = (name, value) => {
    let error = "";

    switch (name) {
      case "fullName":
        if (!value.trim()) {
          error = "Full Name is required";
        }
        break;

      case "email":
        if (!value.trim()) {
          error = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = "Enter a valid email";
        }
        break;

      case "phone":
        if (!value.trim()) {
          error = "Phone number is required";
        } else if (!/^\d{10}$/.test(value)) {
          error = "Phone must be 10 digits";
        }
        break;

      case "location":
        if (!value.trim()) {
          error = "Location is required";
        }
        break;

      case "department":
        if (!value.trim()) {
          error = "Department is required";
        }
        break;

      case "role":
        if (!value.trim()) {
          error = "Role is required";
        }
        break;

      default:
        break;
    }

    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

      setShowSavePopup(true);

    // API call here
  };

  const handleDiscard = () => {
  setFullName("");
  setEmail("");
  setPhone("");
  setLocation("");
  setDepartment("");
  setRole("");
  setProfileImage(null);
  setErrors({});
};
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
        <div className="profile-avatar-section">
          <div className="profile-avatar">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="profile-avatar-img"
              />
            ) : (
              "A"
            )}
          </div>

          <button className="camera-btn" onClick={() => setShowOptions(true)}>
            <Camera size={16} />
          </button>

          {profileImage && (
            <button className="remove-photo-btn" onClick={handleRemoveImage}>
              Remove Photo
            </button>
          )}

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
              validateField("fullName", value);
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
            onChange={(e) => {
              const value = e.target.value;
              setEmail(value);
              validateField("email", value);
            }}
            placeholder="Enter your email"
            error={errors.email}
            isFormDisabled={isFormDisabled}
          />
          {/* {errors.email && <p className="error-text">{errors.email}</p>} */}

          <InputField
            label="Phone"
            icon={<Phone size={15} color="#2563eb" />}
            value={phone}
            onChange={(e) => {
              const value = e.target.value;
              setPhone(value);
              validateField("phone", value);
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
              validateField("location", value);
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
              validateField("department", value);
            }}
            placeholder="Enter department"
            error={errors.department}
            isFormDisabled={isFormDisabled}
          />
          

          <InputField
            label="Role"
            icon={<Briefcase size={15} color="#2563eb" />}
            value={role}
            onChange={(e) => {
              const value = e.target.value;
              setRole(value);
              validateField("role", value);
            }}
            placeholder="Enter role"
            error={errors.role}
            isFormDisabled={isFormDisabled}
          />
       
        </div>
      </div>

      <div className="button-row">
        <button 
        className="discard-btn"
        onClick={handleDiscard}
        >Discard</button>

        <button className="save-btn" onClick={handleSave}>
          Save Changes
        </button>
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
              <button
                className="upload-submit-btn"
                onClick={() => {
                  galleryInputRef.current?.click();
                  setShowOptions(false);
                }}
              >
                Choose From Gallery
              </button>

              <button
                className="upload-submit-btn"
                onClick={() => {
                  setShowCamera(true);
                  setShowOptions(false);
                }}
              >
                Open Camera
              </button>
            </div>
          </div>
        </div>
      )}

      {/* webcam popup */}
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

            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              style={{
                width: "100%",
                borderRadius: "12px",
                marginTop: "10px",
              }}
            />

            <button
              className="upload-submit-btn"
              style={{ marginTop: "16px" }}
              onClick={() => {
                const imageSrc = webcamRef.current.getScreenshot();

                setProfileImage(imageSrc);
                setShowCamera(false);
              }}
            >
              Capture Photo
            </button>
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
