import React, { useState, useEffect } from 'react';
import AuthLayout from '../../components/layout/AuthLayout';
import InputGroup from '../../components/common/InputGroup';
import { useAuth } from '../../context/AuthContext';

const VerifyEmailPage = ({ onNavigate }) => {
    const [otp, setOtp] = useState('');
    const [localError, setLocalError] = useState('');
    const [timer, setTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const { verifyOtp, forgotPassword, loading } = useAuth();
    const [email, setEmail] = useState('');

    useEffect(() => {
        const storedEmail = localStorage.getItem('resetEmail');
        if (storedEmail) {
            setEmail(storedEmail);
        } else {
            // If no email found, redirect back to forgot password
            onNavigate('forgot-password');
        }
    }, [onNavigate]);

    useEffect(() => {
        let interval = null;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prevTimer) => prevTimer - 1);
            }, 1000);
        } else {
            setCanResend(true);
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const handleResend = async (e) => {
        e.preventDefault();
        if (canResend && email) {
            const result = await forgotPassword(email);
            if (result.success) {
                setTimer(60);
                setCanResend(false);
                setOtp('');
                setLocalError('');
            } else {
                setLocalError(result.message);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');

        if (!otp.trim()) {
            setLocalError('OTP Code is required');
            return;
        }

        const result = await verifyOtp(email, otp);

        if (result.success) {
            onNavigate('reset-password');
        } else {
            setLocalError(result.message);
        }
    };

    const lockIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
    );

    return (
        <AuthLayout>
            <h2 style={{ color: 'white', marginBottom: '20px' }}>Verify OTP</h2>
            <p style={{ color: '#e0e0e0', marginBottom: '30px', fontSize: '0.9rem' }}>
                Enter the OTP code sent to {email}.
            </p>

            <form onSubmit={handleSubmit}>
                <InputGroup
                    type="text"
                    placeholder="ENTER OTP CODE"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    icon={lockIcon}
                    error={localError}
                />

                <button type="submit" className="auth-button" disabled={loading}>
                    {loading ? 'VERIFYING...' : 'VERIFY & PROCEED'}
                </button>

                <div style={{ fontSize: '0.9rem', textAlign: 'center', marginTop: '15px', color: '#e0e0e0' }}>
                    {canResend ? (
                        <>
                            Did not receive email? <a href="#" onClick={handleResend} style={{ color: 'white', textDecoration: 'underline' }}>Resend</a>
                        </>
                    ) : (
                        <span>Resend code in {formatTime(timer)}</span>
                    )}
                </div>

                <a onClick={() => onNavigate('login')} className="auth-link" style={{ textAlign: 'center', marginTop: '20px' }}>
                    Back to Login
                </a>
            </form>
        </AuthLayout>
    );
};

export default VerifyEmailPage;
