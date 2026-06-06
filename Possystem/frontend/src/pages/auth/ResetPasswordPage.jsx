import React, { useState } from 'react';
import AuthLayout from '../../components/layout/AuthLayout';
import InputGroup from '../../components/common/InputGroup';

const ResetPasswordPage = ({ onNavigate }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState({});

    const validateForm = () => {
        let isValid = true;
        const newErrors = {};

        if (!password) {
            newErrors.password = 'Password is required';
            isValid = false;
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
            isValid = false;
        }

        if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            console.log('Resetting password');
            alert('Password reset successful! Please login.');
            onNavigate('login');
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
            <h2 style={{ color: 'white', marginBottom: '20px' }}>Reset Password</h2>

            <form onSubmit={handleSubmit}>
                <InputGroup
                    type="password"
                    placeholder="NEW PASSWORD"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    icon={lockIcon}
                    error={errors.password}
                />

                <InputGroup
                    type="password"
                    placeholder="CONFIRM NEW PASSWORD"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    icon={lockIcon}
                    error={errors.confirmPassword}
                />

                <button type="submit" className="auth-button">
                    RESET PASSWORD
                </button>
            </form>
        </AuthLayout>
    );
};

export default ResetPasswordPage;
