import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ChevronDown, LogOut, Search, Settings, User } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';
import '../../styles/dashboard.css';

const TopBar = ({ onNavigate }) => {
    const { user, logout } = useAuth();
    const [showDropdown, setShowDropdown] = useState(false);

    const checkActiveShift = async () => {
        if (user?.role !== 'CASHIER') return true;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/cash/admin/shifts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            const shifts = Array.isArray(data) ? data : [];
            const activeShift = shifts.find(s => ['OPEN', 'REPORT_SUBMITTED'].includes(s.status));
            return !activeShift;
        } catch (err) {
            console.error('Failed to check shift status', err);
            return true; // Allow logout if API fails to avoid locking user in
        }
    };

    const handleLogout = async () => {
        const canLogout = await checkActiveShift();
        if (!canLogout) {
            alert('Please end your active shift in the Cash Counter before logging out.');
            if (onNavigate) onNavigate('cash-counter');
            return;
        }

        logout();
        if (onNavigate) {
            onNavigate('login');
        }
    };

    return (
        <div className="top-bar">
            <div className="search-bar">
                <Search size={18} />
                <input type="text" placeholder="Search orders, products, customers..." className="search-input" />
            </div>
            <div className="user-actions flex items-center gap-4">
                <div
                    className="user-menu-trigger"
                    onClick={() => setShowDropdown(!showDropdown)}
                    style={{ position: 'relative', zIndex: 100 }}
                >
                    <div className="w-9 h-9 flex-shrink-0 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center overflow-hidden">
                        {user?.profile_image ? (
                            <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-5 h-5 text-[var(--text-secondary)]" />
                        )}
                    </div>

                    <div className="text-left hidden sm:flex sm:flex-col sm:justify-center">
                        <div className="text-sm font-semibold text-[var(--text-primary)] leading-tight m-0 p-0 border-none bg-transparent before:hidden after:hidden">
                            {user?.username || 'User'}
                        </div>
                        <div className="text-[10px] text-[var(--accent-color)] tracking-wider font-bold uppercase mt-0.5 leading-tight m-0 p-0 before:hidden after:hidden">
                            {user?.role || 'Role'}
                        </div>
                    </div>

                    <ChevronDown className="w-4 h-4 flex-shrink-0 text-[var(--text-secondary)]" />

                    {/* Dropdown Menu */}
                    {showDropdown && (
                        <div className="absolute top-12 right-0 mt-2 w-56 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl py-2 z-[1000] animate-fade-in origin-top-right">
                            <div className="px-4 py-3 border-b border-[var(--border-color)] mb-1">
                                <div className="font-semibold text-[var(--text-primary)] truncate">{user?.username}</div>
                                <div className="text-xs text-[var(--text-secondary)] truncate mt-0.5">{user?.email || 'No email provided'}</div>
                            </div>

                            <button
                                title="Edit Profile"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDropdown(false);
                                    if (onNavigate) onNavigate('profile');
                                }}
                                className="profile-menu-action"
                            >
                                <Settings className="w-4 h-4 text-[var(--text-secondary)]" />
                                Edit Profile
                            </button>

                            <button
                                title="Logout"
                                onClick={handleLogout}
                                className="profile-menu-action profile-menu-action-danger"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TopBar;
