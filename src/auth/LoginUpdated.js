import React, { useState } from 'react';
import './LoginScreen.css';

import bgImage from '../assets/background.png';
import LoginLayout from './LoginLayout';
import helpBtn from '../assets/help.svg';

export default function LoginScreen() {
    const [formData, setFormData] = useState({
        identifier: '', // Handles email or phone
        password: '',
        orgCode: '',
        rememberMe: false
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Logging in with:', formData);
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
                                    />
                                <span className="helper-text">Provided by your HR administrator</span>
                            </div>

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
                                <div className="forgot-links">
                                    <a href="#forgot-org">Forgot Organization Code</a>
                                </div>
                                <div className="forgot-links">
                                    <a href="#forgot-password">Forgot Password?</a>
                                </div>
                            </div>

                            {/* Login Button */}
                            <button type="submit" className="btn-login">
                                Login
                            </button>
                        </form>

                        <div className="form-divider"></div>

                        {/* Action Buttons */}
                        <div className="action-buttons-group">
                            <button className="btn-secondary">Create Organization</button>
                            <button className="btn-secondary">Join Organization</button>
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