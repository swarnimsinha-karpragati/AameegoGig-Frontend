import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout, { AuthHeader, AuthLogo } from './AuthLayout';
import { EyeIcon, EyeOffIcon } from './authIcons';

import { loginUser } from '../services/authService';
import { vendorDashboardPath } from '../utils/vendorPath';
import { setOrganisations } from '../utils/authStorage';

export default function LoginScreen() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        identifier: '',
        password: '',
        orgCode: '',
        otp: '',
        rememberMe: false
    });

    const [showPassword, setShowPassword] = useState(false);
    const [is2FA, setIs2FA] = useState(false);
    const [otpEmail, setOtpEmail] = useState('');
    const [otpSent, setOtpSent] = useState(false);

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const finalValue = name === 'orgCode' ? value.toUpperCase() : value;

        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : finalValue
        }));
    };

    // Required-field gate: Sign In stays disabled until every visible
    // required field has a value (OTP included once 2FA is triggered).
    const isSignInReady =
        formData.identifier.trim() !== '' &&
        formData.password !== '' &&
        formData.orgCode.trim() !== '' &&
        (!is2FA || formData.otp.trim().length === 6);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isSignInReady) return;
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
            setOrganisations(res.organisations);
            navigate(vendorDashboardPath(res.user));
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout>
            <AuthLogo />
            <AuthHeader title="Welcome to Workza!" subtitle="Sign in to your Workza HRMS account." />

            <form className="auth-form" onSubmit={handleSubmit}>
                <div className="auth-field">
                    <label htmlFor="login-identifier">Work Email or Mobile Number</label>
                    <input
                        id="login-identifier"
                        type="text"
                        name="identifier"
                        value={formData.identifier}
                        onChange={handleChange}
                        placeholder="name@workza.com"
                        required
                        disabled={is2FA}
                    />
                </div>

                <div className="auth-field">
                    <label htmlFor="login-password">Password</label>
                    <div className="auth-password">
                        <input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter your password"
                            required
                            disabled={is2FA}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            aria-pressed={showPassword}
                        >
                            {showPassword ? <EyeIcon /> : <EyeOffIcon />}
                        </button>
                    </div>
                    <Link to="/forgot-password" className="auth-forgot">
                        Forgot Password?
                    </Link>
                </div>

                <div className="auth-field">
                    <label htmlFor="login-org">Organization Code</label>
                    <input
                        id="login-org"
                        type="text"
                        name="orgCode"
                        value={formData.orgCode}
                        onChange={handleChange}
                        placeholder="Enter your organisation code"
                        required
                        disabled={is2FA}
                    />
                    <p className="auth-help">Provided by your HR administrator</p>
                </div>

                {is2FA && otpSent && (
                    <div className="auth-field">
                        <label htmlFor="login-otp">Verification Code</label>
                        <input
                            id="login-otp"
                            type="text"
                            name="otp"
                            value={formData.otp}
                            onChange={handleChange}
                            placeholder="Enter 6-Digit OTP"
                            maxLength="6"
                            required
                        />
                        <p className="auth-help">
                            Code sent to: <strong>{otpEmail}</strong>
                        </p>
                    </div>
                )}

                <label className="auth-remember">
                    <input
                        type="checkbox"
                        name="rememberMe"
                        checked={formData.rememberMe}
                        onChange={handleChange}
                    />
                    Remember me
                </label>

                {error && <p className="auth-error">{error}</p>}

                <button type="submit" className="auth-submit" disabled={isLoading || !isSignInReady}>
                    {isLoading
                        ? 'Logging in...'
                        : is2FA
                            ? 'Verify & Confirm Login'
                            : 'Sign in'}
                </button>
            </form>
        </AuthLayout>
    );
}
