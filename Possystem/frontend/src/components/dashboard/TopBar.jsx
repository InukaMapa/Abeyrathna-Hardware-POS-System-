import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, LogOut, Settings } from 'lucide-react';
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
            const activeShift = data.find(s => s.status === 'OPEN' || s.status === 'REPORT_SUBMITTED');
            return !activeShift;
        } catch (err) {
            console.error('Failed to check shift status', err);
            return true; // Allow logout if API fails to avoid locking user in
        }
    };

    const handleLogout = async () => {
        const canLogout = await checkActiveShift();
        if (!canLogout) {
            alert('❌ Please END your shift in the Cash Counter before logging out.');
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input type="text" placeholder="Search orders, inventory, customers..." className="search-input" />
            </div>
            <div className="user-actions flex items-center gap-4">
                <button className="icon-btn text-[#E0E0E0] hover:text-white transition-colors bg-transparent border-none cursor-pointer">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                </button>
                <div
                    className="relative flex items-center gap-3 cursor-pointer pl-4 border-l border-[#333]"
                    onClick={() => setShowDropdown(!showDropdown)}
                    style={{ position: 'relative', zIndex: 100 }}
                >
                    <div className="w-9 h-9 flex-shrink-0 rounded-full bg-[#1E1E1E] border border-[#333] flex items-center justify-center overflow-hidden">
                        {user?.profile_image ? (
                            <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-5 h-5 text-[#A0A0A0]" />
                        )}
                    </div>

                    <div className="text-left hidden sm:flex sm:flex-col sm:justify-center">
                        <div className="text-sm font-semibold text-[#E0E0E0] leading-tight m-0 p-0 border-none bg-transparent before:hidden after:hidden">
                            {user?.username || 'User'}
                        </div>
                        <div className="text-[10px] text-[#D32F2F] tracking-wider font-bold uppercase mt-0.5 leading-tight m-0 p-0 before:hidden after:hidden">
                            {user?.role || 'Role'}
                        </div>
                    </div>

                    <svg className="w-4 h-4 flex-shrink-0 text-[#A0A0A0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>

                    {/* Dropdown Menu */}
                    {showDropdown && (
                        <div className="absolute top-12 right-0 mt-2 w-56 bg-[#1A1A1A] border border-[#333] rounded-xl shadow-2xl py-2 z-[1000] animate-fade-in origin-top-right">
                            <div className="px-4 py-3 border-b border-[#333] mb-1">
                                <div className="font-semibold text-[#E0E0E0] truncate">{user?.username}</div>
                                <div className="text-xs text-[#888] truncate mt-0.5">{user?.email || 'No email provided'}</div>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDropdown(false);
                                    if (onNavigate) onNavigate('profile');
                                }}
                                className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-[#E0E0E0] hover:bg-[#2A2A2A] transition-colors"
                            >
                                <Settings className="w-4 h-4 text-[#A0A0A0]" />
                                Edit Profile
                            </button>

                            <button
                                onClick={handleLogout}
                                className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-[#FF6B6B] hover:bg-[#2A2A2A] transition-colors mt-1 border-t border-[#333]/50"
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
