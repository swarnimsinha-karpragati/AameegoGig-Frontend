import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LoginScreen.css';

import bgImage from '../assets/background.png';
import LoginLayout, { LoginFormLogo } from './LoginLayout';
import helpBtn from '../assets/help.svg';
import { loginUser } from '../services/authService';

export default function LoginScreen() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        identifier: '', // Handles email or phone
        password: '',
        orgCode: '',
        otp: '',
        rememberMe: false
    });

    const [is2FA, setIs2FA] = useState(false);
    const [otpEmail, setOtpEmail] = useState('');
    const [otpSent, setOtpSent] = useState(false);

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        // Organization code always uppercase (same behaviour as functional version)
        const finalValue =
            name === 'orgCode' ? value.toUpperCase() : value;

        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : finalValue
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setIsLoading(true);
        setError('');

        try {
            const res = await loginUser({
                emailOrPhone: formData.identifier,
                password: formData.password,
                vendorCode: formData.orgCode,
                otp: formData.otp
            });

            if (res?.twoFactorRequired) {
                setIs2FA(true);
                setOtpEmail(res.sendTo || '');
                setOtpSent(true);
                return;
            }

            localStorage.setItem('token', res.token);
            localStorage.setItem('user', JSON.stringify(res.user));
            const formatName = res.user.vendorName.trim().replace(/\s+/g, "-").toLowerCase();
            navigate(`/${formatName}/dashboard`);
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="login-container"
            style={{ backgroundImage: `url(${bgImage})` }}
        >
            <div className="login-content">

                {/* ================= LEFT HERO SIDE ================= */}
                <LoginLayout />

                {/* ================= RIGHT FORM CARD SIDE ================= */}
                <div className="form-section">
                    <div className="help-link">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <img src={helpBtn} alt="Help" width="16" height="16" /> Help
                        </span>
                    </div>

                    <div className="form-card">
                        <LoginFormLogo />
                        <div className="form-header">
                            <h2>Welcome to HRMS!</h2>
                            <p>Sign in to access your organization's HRMS workspace.</p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* Email / Mobile Input */}
                            <div className="input-group">
                                <label>Work Email or Mobile Number</label>
                                <input
                                    type="text"
                                    name="identifier"
                                    value={formData.identifier}
                                    onChange={handleChange}
                                    placeholder="Enter your work email or mobile number"
                                    required
                                    disabled={is2FA}
                                />
                            </div>

                            {/* Password Input */}
                            <div className="input-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Enter your password"
                                    required
                                    disabled={is2FA}
                                />
                            </div>

                            {/* Org Code Input */}
                            <div className="input-group">
                                <label>Organization Code</label>
                                <input
                                    type="text"
                                    name="orgCode"
                                    value={formData.orgCode}
                                    onChange={handleChange}
                                    placeholder="Enter your organization code"
                                    required
                                    disabled={is2FA}
                                />
                                <span className="helper-text">Provided by your HR administrator</span>
                            </div>

                            {/* OTP Input (only when 2FA is triggered) */}
                            {is2FA && otpSent && (
                                <div className="input-group">
                                    <label>Verification Code</label>
                                    <input
                                        type="text"
                                        name="otp"
                                        value={formData.otp}
                                        onChange={handleChange}
                                        placeholder="Enter 6-Digit OTP"
                                        maxLength="6"
                                        required
                                    />
                                    <span className="helper-text">
                                        Code sent to: <strong>{otpEmail}</strong>
                                    </span>
                                </div>
                            )}

                            {/* Utility Row (Remember Me & Forgot Passwords) */}
                            <div className="form-utilities">
                                <label className="remember-me">
                                    <input
                                        type="checkbox"
                                        name="rememberMe"
                                        checked={formData.rememberMe}
                                        onChange={handleChange}
                                    />
                                    Remember me
                                </label>
                                {/* <div className="forgot-links">
                                    <Link to="/forgot-org-code" className="forgot-link">
                                        Forgot Organization Code?
                                    </Link>
                                </div> */}
                                <div className="forgot-links">
                                    <Link to="/forgot-password" className="forgot-link">
                                        Forgot Password?
                                    </Link>
                                </div>
                            </div>

                            {/* Error message */}
                            {error && <p className="error">{error}</p>}

                            {/* Login Button */}
                            <button type="submit" className="btn-login" disabled={isLoading}>
                                {isLoading
                                    ? 'Logging in...'
                                    : is2FA
                                        ? 'Verify & Confirm Login'
                                        : 'Login'}
                            </button>
                        </form>

                        <div className="form-divider"></div>

                        <div className="login-home-link">
                            <Link to="/">← Back to home</Link>
                        </div>
                    </div>
                </div>

            </div>

            {/* Footer Powered By text */}
            <footer className="footer-copyright">
                Powered by Kar Pragati Technologies Pvt. Ltd.
            </footer>
        </div>
    );
}