import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { User, Camera, Save, RefreshCw, Mail, Lock, Shield } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

const ProfilePage = ({ onNavigate }) => {
    const { user, setUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: user?.username || '',
        email: user?.email || '',
        current_password: '',
        new_password: '',
        confirm_password: ''
    });

    const [profileImage, setProfileImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(user?.profile_image || null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.new_password !== formData.confirm_password) {
            alert("New passwords do not match!");
            return;
        }

        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const data = new FormData();

            data.append('username', formData.username);
            data.append('email', formData.email);

            if (formData.new_password) {
                data.append('current_password', formData.current_password);
                data.append('new_password', formData.new_password);
            }
            if (profileImage) {
                data.append('profile_image', profileImage);
            }

            const response = await axios.put(`${API_BASE_URL}/auth/profile`, data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                if (response.data.user) {
                    setUser({ ...user, ...response.data.user });
                }
            }

            alert("Profile updated successfully!");
            // Clear password fields on success
            setFormData(prev => ({ ...prev, current_password: '', new_password: '', confirm_password: '' }));

        } catch (error) {
            console.error("Profile update failed:", error);
            alert(error.response?.data?.message || "Failed to update profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout onNavigate={onNavigate} activePage="profile">
            <div className="profile-page animate-fade-in">

                {/* Header Section */}
                <div className="profile-header">
                    <h1>
                        <span className="profile-header-icon"><User size={18} /></span>
                        User Profile
                    </h1>
                    <p>Manage your account settings and preferences.</p>
                </div>

                <div className="profile-shell">

                    {/* Left Sidebar Profile Badge */}
                    <div className="profile-summary">
                        <div className="profile-avatar-wrap group">
                            <div className="profile-avatar">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Profile" />
                                ) : (
                                    <User size={42} />
                                )}

                                <label className="profile-photo-overlay">
                                    <Camera size={18} />
                                    <span>Change Photo</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                </label>
                            </div>

                            <div className="profile-shield">
                                <Shield size={16} />
                            </div>
                        </div>

                        <h2>{user?.username}</h2>
                        <div className="profile-role-badge">
                            <p>{user?.role}</p>
                        </div>
                    </div>

                    {/* Right Side Settings Form */}
                    <div className="profile-form-panel">
                        <form onSubmit={handleSubmit} className="profile-form">

                            <div className="profile-section">
                                <h3>
                                    <User size={16} />
                                    Basic Information
                                </h3>

                                <div className="profile-field-grid">
                                    <div>
                                        <label className="profile-label">Username</label>
                                        <div className="profile-input-wrap">
                                            <User size={16} />
                                            <input
                                                type="text"
                                                name="username"
                                                value={formData.username}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="profile-label">Email Address</label>
                                        <div className="profile-input-wrap">
                                            <Mail size={16} />
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="profile-section">
                                <h3>
                                    <Lock size={16} />
                                    Change Password
                                </h3>
                                <p className="profile-help">Leave fields blank if you do not wish to change your password.</p>

                                <div className="profile-password-grid">
                                    <div className="profile-field-wide">
                                        <label className="profile-label">Current Password</label>
                                        <div className="profile-input-wrap">
                                            <Lock size={15} />
                                            <input
                                                type="password"
                                                name="current_password"
                                                value={formData.current_password}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="profile-label">New Password</label>
                                        <div className="profile-input-wrap">
                                            <Lock size={15} />
                                            <input
                                                type="password"
                                                name="new_password"
                                                value={formData.new_password}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="profile-label">Confirm New Password</label>
                                        <div className="profile-input-wrap">
                                            <Lock size={15} />
                                            <input
                                                type="password"
                                                name="confirm_password"
                                                value={formData.confirm_password}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="profile-actions">
                                <button
                                    type="submit"
                                    title="Save profile changes"
                                    disabled={loading}
                                    className="profile-save-btn"
                                >
                                    {loading ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
};

export default ProfilePage;
