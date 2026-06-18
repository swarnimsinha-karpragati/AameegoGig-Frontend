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

export default function ProfileCard() {

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("");
  const [isFormDisabled, setIsFormDisabled] = useState(true);
  

  function InputField({
    icon,
    label,
    value,
    onChange,
    placeholder
  })
    
  
  {
    return (
      <div>

        {label && (
          <label className="profile-label">
            {label}
          </label>
        )}

        <div className="input-wrapper">

          <div className="input-icon">
            {icon}
          </div>

          <input
            type="text"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={isFormDisabled}
            className={`profile-input ${
              isFormDisabled ? "input-disabled" : ""
            }`}
          />

        </div>

      </div>
    );
  }

  return (
    <div className="profile-card">

      <div className="profile-header">

        <div>
          <h2 className="profile-title">
            Profile Settings
          </h2>

          <p className="profile-subtitle">
            Update your personal information
          </p>
        </div>

        <button
          className="edit-btn"
          onClick={() =>
            setIsFormDisabled((prev) => !prev)
          }
        >
          {isFormDisabled ? (
            <PencilOff size={16} />
          ) : (
            <Pencil size={16} />
          )}
        </button>

      </div>

      <div className="profile-content">

        <div className="profile-avatar-section">

          <div className="profile-avatar">
            A
          </div>

          <button className="camera-btn">
            <Camera size={16} />
          </button>

        </div>

        <div className="profile-form-grid">

          <InputField
            label="Full Name"
            icon={<User size={15} color="#2563eb" />}
            value={fullName}
            onChange={(e) =>
              setFullName(e.target.value)
            }
            placeholder="Enter your full name"
          />

          <InputField
            label="Email"
            icon={<Mail size={15} color="#2563eb" />}
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="Enter your email"
          />

          <InputField
            label="Phone"
            icon={<Phone size={15} color="#2563eb" />}
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value)
            }
            placeholder="Enter phone number"
          />

          <InputField
            label="Location"
            icon={<LocateIcon size={15} color="#2563eb" />}
            value={location}
            onChange={(e) =>
              setLocation(e.target.value)
            }
            placeholder="Enter location"
          />

          <InputField
            label="Department"
            icon={<Briefcase size={15} color="#2563eb" />}
            value={department}
            onChange={(e) =>
              setDepartment(e.target.value)
            }
            placeholder="Enter department"
          />

          <InputField
            label="Role"
            icon={<Briefcase size={15} color="#2563eb" />}
            value={role}
            onChange={(e) =>
              setRole(e.target.value)
            }
            placeholder="Enter role"
          />

        </div>

      </div>

      <div className="button-row">

        <button className="discard-btn">
          Discard
        </button>

        <button className="save-btn">
          Save Changes
        </button>

      </div>

    </div>
  );
}