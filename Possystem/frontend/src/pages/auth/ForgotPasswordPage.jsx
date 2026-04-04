import React, { useState } from 'react';
import AuthLayout from '../../components/layout/AuthLayout';
import InputGroup from '../../components/common/InputGroup';
import { useAuth } from '../../context/AuthContext';

const ForgotPasswordPage = ({ onNavigate }) => {
    const [email, setEmail] = useState('');
    const [localError, setLocalError] = useState('');
    const { forgotPassword, loading } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');

        if (!email.trim()) {
            setLocalError('Email is required');
            return;
        }

        const sanitizedEmail = email.trim().toLowerCase();
        console.log('ForgotPasswordPage: Sending OTP to:', sanitizedEmail);

        const result = await forgotPassword(sanitizedEmail);

        if (result.success) {
            // Store email for the next step
            localStorage.setItem('resetEmail', sanitizedEmail);
            onNavigate('verify-email');
        } else {
            setLocalError(result.message);
        }
    };

    const mailIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
        </svg>
    );

    return (
        <AuthLayout>
            <h2 style={{ color: 'white', marginBottom: '20px' }}>Forgot Password</h2>
            <p style={{ color: '#e0e0e0', marginBottom: '30px', fontSize: '0.9rem' }}>
                Enter your email address and we'll send you a code to reset your password.
            </p>

            <form onSubmit={handleSubmit}>
                <InputGroup
                    type="email"
                    placeholder="ENTER YOUR EMAIL"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    icon={mailIcon}
                    error={localError}
                />

                <button type="submit" className="auth-button" disabled={loading}>
                    {loading ? 'SENDING...' : 'SEND OTP CODE'}
                </button>

                <a onClick={() => onNavigate('login')} className="auth-link" style={{ textAlign: 'center', marginTop: '20px' }}>
                    Back to Login
                </a>
            </form>
        </AuthLayout>
    );
};

export default ForgotPasswordPage;
