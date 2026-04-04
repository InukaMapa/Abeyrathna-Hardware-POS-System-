import React, { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { API_BASE_URL, ENDPOINTS } from '../config/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Decode JWT and get user info
    const decodeToken = (token) => {
        try {
            if (!token || typeof token !== 'string') {
                console.error('❌ Invalid token format:', typeof token);
                return null;
            }

            const decoded = jwtDecode(token);

            // Validate decoded token structure
            if (!decoded || typeof decoded !== 'object') {
                console.error('❌ Decoded token is not an object');
                return null;
            }

            // Check token expiration
            if (decoded.exp && decoded.exp * 1000 < Date.now()) {
                console.warn('⚠️ Token has expired');
                return null;
            }

            return decoded;
        } catch (error) {
            console.error('❌ Error decoding token:', error.message);
            return null;
        }
    };

    // Check if user is authenticated on mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const decoded = decodeToken(token);
            if (decoded) {
                setUser(decoded);
            } else {
                localStorage.removeItem('token');
            }
        }
    }, []);

    const login = async (username, password) => {
        setLoading(true);
        setError(null);

        // CRITICAL: Clear any existing token first
        localStorage.removeItem('token');
        setUser(null);

        try {
            console.log('🔐 AuthContext: Starting login process...');

            const response = await fetch(`${API_BASE_URL}${ENDPOINTS.LOGIN}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            // Protect against non-JSON responses (e.g., HTML error page)
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                const text = await response.text();
                console.error('❌ AuthContext: Expected JSON but received:', text.slice(0, 1000));
                throw new Error(`Expected JSON response but received HTML/text (first 200 chars): ${text.slice(0, 200)}`);
            }

            const data = await response.json();
            console.log('📡 AuthContext: Login response received:', { success: response.ok, hasToken: !!data.token });

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            // Validate token exists
            if (!data.token) {
                throw new Error('No token received from server');
            }

            // Decode token FIRST before storing
            const decoded = decodeToken(data.token);
            console.log('🔓 AuthContext: Token decoded:', {
                hasDecoded: !!decoded,
                role: decoded?.role,
                username: decoded?.username
            });

            if (!decoded) {
                throw new Error('Failed to decode token - invalid format');
            }

            // Validate role exists and is valid
            if (!decoded.role) {
                throw new Error('Token does not contain role information');
            }

            const validRoles = ['ADMIN', 'CASHIER'];
            if (!validRoles.includes(decoded.role)) {
                console.warn('⚠️ AuthContext: Unknown role detected:', decoded.role);
            }

            // Store token AFTER successful decode
            localStorage.setItem('token', data.token);
            setUser(decoded);

            console.log('✅ AuthContext: Login successful. Role:', decoded.role);
            return { success: true, user: decoded, role: decoded.role };

        } catch (err) {
            console.error('❌ AuthContext: Login failed:', err.message);
            // Clean up on error
            localStorage.removeItem('token');
            setUser(null);
            setError(err.message);
            return { success: false, message: err.message };
        } finally {
            setLoading(false);
        }
    };

    const register = async (userData) => {
        setLoading(true);
        setError(null);
        try {
            console.log('AuthContext: Sending registration data:', userData);

            const response = await fetch(`${API_BASE_URL}${ENDPOINTS.REGISTER}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            const data = await response.json();
            console.log('AuthContext: Registration response:', data);

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            return { success: true };
        } catch (err) {
            setError(err.message);
            return { success: false, message: err.message };
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('token');
    };

    const forgotPassword = async (email) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}${ENDPOINTS.FORGOT_PASSWORD}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();
            console.log('AuthContext: forgotPassword response:', data);

            if (!response.ok) {
                throw new Error(data.message || 'Failed to send OTP');
            }

            return { success: true, message: data.message };
        } catch (err) {
            setError(err.message);
            return { success: false, message: err.message };
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async (email, otp) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}${ENDPOINTS.VERIFY_OTP}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, otp }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'OTP verification failed');
            }

            return { success: true, message: data.message };
        } catch (err) {
            setError(err.message);
            return { success: false, message: err.message };
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            setUser,
            loading,
            error,
            login,
            register,
            logout,
            forgotPassword,
            verifyOtp,
            decodeToken,
            isAuthenticated: !!user,
            userRole: user?.role || null
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
