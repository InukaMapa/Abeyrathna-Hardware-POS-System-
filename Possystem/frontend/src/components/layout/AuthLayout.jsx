import React from 'react';
import '../../styles/auth.css';
import logo from '../../assets/logo.png';

/**
 * AuthLayout Component
 * 
 * Wraps authentication pages with the common layout structure.
 * Includes the logo and container styling.
 * 
 * @param {React.ReactNode} children - The form content
 */
const AuthLayout = ({ children }) => {
    return (
        <div className="auth-container">
            <div className="auth-form-wrapper">
                {/* Logo Section */}
                <div className="logo-section">
                    <img
                        src={logo}
                        alt="Chill Grand Restaurant & Pub Logo"
                        className="logo-image"
                    />
                </div>

                {/* Render form content */}
                {children}
            </div>
        </div>
    );
};

export default AuthLayout;
