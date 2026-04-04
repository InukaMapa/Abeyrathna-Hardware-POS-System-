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
            <div className="max-w-4xl mx-auto p-6 md:p-8 animate-fade-in">

                {/* Header Section */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-[#E0E0E0] mb-2 flex items-center gap-3">
                        <User className="text-[#D32F2F] w-8 h-8" />
                        User Profile
                    </h1>
                    <p className="text-[#A0A0A0]">Manage your account settings and preferences.</p>
                </div>

                <div className="bg-[#1A1A1A] border border-[#333] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">

                    {/* Left Sidebar Profile Badge */}
                    <div className="md:w-1/3 bg-[#111] p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-[#333] relative overflow-hidden">
                        {/* Decorative background element */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D32F2F] opacity-10 rounded-bl-full blur-[40px]"></div>

                        <div className="relative group mb-6">
                            <div className="w-40 h-40 rounded-full border-4 border-[#333] overflow-hidden flex items-center justify-center bg-black relative z-10 shadow-lg">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-16 h-16 text-[#666]" />
                                )}

                                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all duration-300">
                                    <Camera className="w-8 h-8 text-white mb-2" />
                                    <span className="text-white text-xs font-semibold tracking-wider uppercase">Change Photo</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                </label>
                            </div>

                            <div className="absolute -bottom-2 -right-2 bg-[#D32F2F] text-white p-2.5 rounded-full shadow-lg border-4 border-[#1A1A1A] z-20">
                                <Shield className="w-5 h-5" />
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-1 tracking-tight text-center">{user?.username}</h2>
                        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                            <p className="text-[#D32F2F] tracking-[0.2em] font-bold text-xs uppercase">{user?.role}</p>
                        </div>
                    </div>

                    {/* Right Side Settings Form */}
                    <div className="md:w-2/3 p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">

                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-white border-b border-[#333] pb-2 flex items-center gap-2">
                                    <User className="w-5 h-5 text-[#A0A0A0]" />
                                    Basic Information
                                </h3>

                                <div className="grid grid-cols-1 gap-6">
                                    <div>
                                        <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Username</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
                                            <input
                                                type="text"
                                                name="username"
                                                value={formData.username}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-[#111] border border-[#333] rounded-xl py-3 pl-12 pr-4 text-[#E0E0E0] focus:ring-2 focus:ring-[#D32F2F]/50 focus:border-[#D32F2F] transition-all outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="w-full bg-[#111] border border-[#333] rounded-xl py-3 pl-12 pr-4 text-[#E0E0E0] focus:ring-2 focus:ring-[#D32F2F]/50 focus:border-[#D32F2F] transition-all outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6 pt-4">
                                <h3 className="text-lg font-semibold text-white border-b border-[#333] pb-2 flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-[#A0A0A0]" />
                                    Change Password
                                </h3>
                                <p className="text-xs text-[#666] mb-4">Leave fields blank if you do not wish to change your password.</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Current Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
                                            <input
                                                type="password"
                                                name="current_password"
                                                value={formData.current_password}
                                                onChange={handleChange}
                                                className="w-full bg-[#111] border border-[#333] rounded-xl py-2.5 pl-12 pr-4 text-sm text-[#E0E0E0] focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">New Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
                                            <input
                                                type="password"
                                                name="new_password"
                                                value={formData.new_password}
                                                onChange={handleChange}
                                                className="w-full bg-[#111] border border-[#333] rounded-xl py-2.5 pl-12 pr-4 text-sm text-[#E0E0E0] focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Confirm New Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]" />
                                            <input
                                                type="password"
                                                name="confirm_password"
                                                value={formData.confirm_password}
                                                onChange={handleChange}
                                                className="w-full bg-[#111] border border-[#333] rounded-xl py-2.5 pl-12 pr-4 text-sm text-[#E0E0E0] focus:ring-1 focus:ring-[#D32F2F] focus:border-[#D32F2F] outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 mt-4 border-t border-[#333] flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-gradient-to-r from-[#D32F2F] to-[#B71C1C] hover:from-[#B71C1C] hover:to-[#9A0007] text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-[#D32F2F]/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
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
