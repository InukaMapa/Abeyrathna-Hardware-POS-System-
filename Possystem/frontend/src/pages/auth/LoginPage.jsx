import React, { useState } from 'react';
import AuthLayout from '../../components/layout/AuthLayout';
import InputGroup from '../../components/common/InputGroup';
import { useAuth } from '../../context/AuthContext';

const LoginPage = ({ onNavigate }) => {
    const { login, loading, error: authError } = useAuth();
    const [usernameOrEmail, setUsernameOrEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({ usernameOrEmail: '', password: '' });

    const validateForm = () => {
        let isValid = true;
        const newErrors = { email: '', password: '' };

        if (!usernameOrEmail.trim()) {
            newErrors.usernameOrEmail = 'Username or Email is required';
            isValid = false;
        }

        if (!password.trim()) {
            newErrors.password = 'Password is required';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (validateForm()) {
            console.log('🔐 LoginPage: Submitting login...');
            
            const result = await login(usernameOrEmail, password);
            
            console.log('📊 LoginPage: Login result:', { 
                success: result.success, 
                hasUser: !!result.user,
                role: result.user?.role 
            });
            
            if (result.success) {
                // CRITICAL: Get role ONLY from decoded JWT (result.user)
                const userRole = result.user?.role;
                
                console.log('🎯 LoginPage: Detected role:', userRole, '(type:', typeof userRole, ')');
                
                // Strict case-sensitive role comparison
                if (userRole === 'ADMIN') {
                    console.log('✅ LoginPage: Redirecting ADMIN to dashboard');
                    onNavigate('dashboard');
                } else if (userRole === 'CASHIER') {
                    console.log('✅ LoginPage: Redirecting CASHIER to orders');
                    onNavigate('orders');
                } else {
                    // Role is undefined or invalid
                    console.error('❌ LoginPage: Invalid or missing role:', userRole);
                    alert('Invalid user role. Please contact administrator.');
                    onNavigate('login');
                }
            } else {
                console.error('❌ LoginPage: Login failed:', result.message);
            }
        }
    };

    // SVG Icons
    const userIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
        </svg>
    );

    const lockIcon = (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
    );

    return (
        <AuthLayout>
            <form onSubmit={handleSubmit}>
                {authError && <div className="error-message" style={{ marginBottom: '15px', textAlign: 'center' }}>{authError}</div>}

                <InputGroup
                    type="text"
                    placeholder="USERNAME"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    icon={userIcon}
                    error={errors.usernameOrEmail}
                />

                <InputGroup
                    type="password"
                    placeholder="PASSWORD"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    icon={lockIcon}
                    error={errors.password}
                />

                <button type="submit" className="auth-button" disabled={loading}>
                    {loading ? 'LOGGING IN...' : 'LOGIN'}
                </button>

                <a onClick={() => onNavigate('register')} className="auth-link">
                    Don't have an account? Sign Up
                </a>
                <a onClick={() => onNavigate('forgot-password')} className="auth-link" style={{ marginTop: '10px' }}>
                    Forgot password?
                </a>
            </form>
        </AuthLayout>
    );
};

export default LoginPage;
