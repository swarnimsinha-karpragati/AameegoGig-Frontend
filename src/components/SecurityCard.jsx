import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  KeyRound,
} from "lucide-react";

import "./SecurityCard.css";
import { enable2FA, sendOtp,remove2FA } from "../services/authService";
import { getStoredUser } from "../utils/roles";

export default function SecurityCard() {

  const intialUser = getStoredUser()
  const [user,setUser] = useState(intialUser)

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [message,setMessage] = useState('')

  const reqOtp = async (e) => {
     try{
      e.preventDefault();
      if(!emailOrPhone.trim()){
        alert('Email or phone is required');
        return;
      }
      const res = await sendOtp({emailOrPhone})
      setOtpSent(true)
      setMessage(res.message)

    }catch(err){
      alert(err?.response?.data?.message || "Failed to send OTP. Please try again.")
    }
  }

  const handleEnable2FA = async (e)=>{
    try{
      e.preventDefault();
      if(!otp.trim()){
        alert('Otp is required')
        return
      }
      const data = await enable2FA({emailOrPhone,otp})
      setMessage('')
      setOtpSent(false)
      localStorage.setItem('user', JSON.stringify(data.payload));
      setUser(data.payload);
    }catch(err){
      setMessage('')
      setOtp('')
       alert(err?.response?.data?.message || "Failed to enable 2FA. Please try again.")
    }
  }

  const remove2fa = async(e)=>{
    try{
      e.preventDefault();
      if(!user.email){
        return;
      }
      const data = await remove2FA();
      setMessage(data.message)
      localStorage.setItem('user', JSON.stringify(data.payload));
      setUser(data.payload);
    }catch(err){
      alert(err?.response?.data?.message || "Failed to remove 2FA. Please try again.")
    }
  }

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
              2FA Verification
            </h2>

            <p className="modal-subtext">
              Secure your account using OTP verification.
            </p>
            <br/>
            {message && <p style={{fontSize:'.8rem',color:'green'}}>{message}</p>}
            {user && !user?.isTwoFactor?(
            <div className="form-group">

              <label>
                Email or Mobile Number
              </label>

              <input
                type="tel"
                value={emailOrPhone}
                disabled={otpSent}

                onChange={(e) => {
                  setEmailOrPhone(e.target.value);
                }}
                className="modal-input"
              />

            

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
            </div>):(<p style={{fontSize:'.8rem',color:'green'}}>Two factor authentication is enabled!</p>)}

            <div className="modal-actions">

              <button
                className="cancel-btn"
                onClick={() =>{
                  setShow2FAModal(false);
                  setMessage('');
                  setOtpSent(false)
                  setEmailOrPhone('')
                  setOtp()
                }
                }
              >
                Cancel
              </button>

              {!otpSent ? (
                user && !user?.isTwoFactor ? (
                  <button className="primary-btn" onClick={(e) => reqOtp(e)}>
                    Send OTP
                  </button>

                ) : (
                  <button className="primary-btn" onClick={(e) => remove2fa(e)}>
                    Remove 2FA
                  </button>
                )
              ) : (

                <button className="verify-btn" onClick={handleEnable2FA}>
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