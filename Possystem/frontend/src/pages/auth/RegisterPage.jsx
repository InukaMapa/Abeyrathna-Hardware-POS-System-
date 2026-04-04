import React, { useState } from 'react';
import AuthLayout from '../../components/layout/AuthLayout';
import InputGroup from '../../components/common/InputGroup';
import { useAuth } from '../../context/AuthContext';

const RegisterPage = ({ onNavigate }) => {
    const { register, loading, error: authError } = useAuth();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState(''); 
    const [errors, setErrors] = useState({});

    const validateForm = () => {
        let isValid = true;
        const newErrors = {};

        if (!username.trim()) {
            newErrors.username = 'Username is required';
            isValid = false;
        }

        if (!email.trim()) {
            newErrors.email = 'Email is required';
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Email is invalid';
            isValid = false;
        }

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (validateForm()) {
            const sanitizedEmail = email.trim().toLowerCase();
            const registrationData = { 
                username, 
                email: sanitizedEmail, 
                password, 
                role 
            };
            
            console.log('RegisterPage: Submitting registration with role:', role);
            console.log('RegisterPage: Full registration data:', registrationData);
            
            const result = await register(registrationData);
            if (result.success) {
                alert(`Registration successful! User registered as ${role}. Please login.`);
                onNavigate('login');
            }
        }
    };

    // Icons
    const userIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
        </svg>
    );

    const mailIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
        </svg>
    );

    const lockIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
    );

    const roleIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
    );

    return (
        <AuthLayout>
            <form onSubmit={handleSubmit}>
                {authError && <div className="error-message" style={{ marginBottom: '15px', textAlign: 'center' }}>{authError}</div>}

                <InputGroup
                    type="text"
                    placeholder="USERNAME"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    icon={userIcon}
                    error={errors.username}
                />

                <InputGroup
                    type="email"
                    placeholder="EMAIL"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    icon={mailIcon}
                    error={errors.email}
                />

                {/* Role Selection */}
                <div className="form-group">
                    <div className="input-wrapper">
                        <div className="input-icon-container">{roleIcon}</div>
                        <select
                            className="form-input"
                            value={role}
                            onChange={(e) => {
                                console.log('Role changed to:', e.target.value);
                                setRole(e.target.value);
                            }}
                            style={{ 
                                appearance: 'none', 
                                cursor: 'pointer',
                                color: role === 'ADMIN' ? '#dc2626' : '#16a34a',
                                fontWeight: '600'
                            }}
                        >
                            <option value="CASHIER" style={{ color: 'black' }}>CASHIER</option>
                            <option value="ADMIN" style={{ color: 'black' }}>ADMIN</option>
                        </select>
                        <div style={{ 
                            position: 'absolute', 
                            right: '15px', 
                            top: '50%', 
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            color: 'var(--accent-color)'
                        }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>
                    </div>
                    <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#666', 
                        marginTop: '5px',
                        marginLeft: '45px'
                    }}>
                        Selected: <strong>{role}</strong>
                    </div>
                </div>

                <InputGroup
                    type="password"
                    placeholder="PASSWORD"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    icon={lockIcon}
                    error={errors.password}
                />

                <InputGroup
                    type="password"
                    placeholder="CONFIRM PASSWORD"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    icon={lockIcon}
                    error={errors.confirmPassword}
                />

                <button type="submit" className="auth-button" disabled={loading}>
                    {loading ? 'SIGNING UP...' : 'SIGN UP'}
                </button>

                <a onClick={() => onNavigate('login')} className="auth-link">
                    Already have an account? Login
                </a>
            </form>
        </AuthLayout>
    );
};

export default RegisterPage;
