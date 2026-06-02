import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  KeyRound,
} from "lucide-react";

import "./SecurityCard.css";

export default function SecurityCard() {

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  function SecurityItem({
    icon,
    title,
    onClick,
  }) {
    return (
      <button
        className="security-item"
        onClick={onClick}
      >
        <div className="security-item-icon">
          {icon}
        </div>

        <span className="security-item-title">
          {title}
        </span>
      </button>
    );
  }

  return (
    <div className="security-card">

      <div className="security-header">

        <div className="security-header-icon">
          <ShieldCheck
            size={18}
            color="#059669"
          />
        </div>

        <div>
          <h3 className="security-title">
            Security
          </h3>

          <p className="security-subtitle">
            Account protection
          </p>
        </div>

      </div>

      <SecurityItem
        icon={<Lock size={15} color="#16a34a" />}
        title="Change Password"
        onClick={() =>
          setShowPasswordModal(true)
        }
      />

      <SecurityItem
        icon={<KeyRound size={15} color="#16a34a" />}
        title="2FA Authentication"
        onClick={() =>
          setShow2FAModal(true)
        }
      />

      {/* PASSWORD MODAL */}

      {showPasswordModal && (
        <div className="modal-overlay">

          <div className="modal-box">

            <div className="modal-header">

              <h2>
                Change Password
              </h2>

              <p>
                Update your account password securely.
              </p>

            </div>

            <div className="modal-form">

              <input
                type="password"
                placeholder="Current Password"
                className="modal-input"
              />

              <input
                type="password"
                placeholder="New Password"
                className="modal-input"
              />

              <input
                type="password"
                placeholder="Confirm Password"
                className="modal-input"
              />

            </div>

            <div className="modal-actions">

              <button
                className="cancel-btn"
                onClick={() =>
                  setShowPasswordModal(false)
                }
              >
                Cancel
              </button>

              <button className="primary-btn">
                Update
              </button>

            </div>

          </div>

        </div>
      )}

      {/* 2FA MODAL */}

      {show2FAModal && (
        <div className="modal-overlay">

          <div className="modal-box">

            <h2>
              Mobile 2FA Verification
            </h2>

            <p className="modal-subtext">
              Secure your account using OTP verification.
            </p>

            <div className="form-group">

              <label>
                Mobile Number
              </label>

              <input
                type="tel"
                value={phone}
                placeholder="+91"

                onChange={(e) => {

                  const value =
                    e.target.value.replace(
                      /[^0-9+]/g,
                      ""
                    );

                  setPhone(value);

                }}

                maxLength={13}
                className="modal-input"
              />

            </div>

            {otpSent && (

              <div className="form-group">

                <label>
                  Enter OTP
                </label>

                <input
                  type="text"
                  value={otp}
                  placeholder="6-digit OTP"

                  onChange={(e) =>
                    setOtp(e.target.value)
                  }

                  maxLength={6}
                  className="modal-input"
                />

              </div>

            )}

            <div className="modal-actions">

              <button
                className="cancel-btn"
                onClick={() =>
                  setShow2FAModal(false)
                }
              >
                Cancel
              </button>

              {!otpSent ? (

                <button
                  className="primary-btn"
                  onClick={() =>
                    setOtpSent(true)
                  }
                >
                  Send OTP
                </button>

              ) : (

                <button className="verify-btn">
                  Verify OTP
                </button>

              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}