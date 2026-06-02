import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { API_BASE_URL } from '../../config/api';
import { Search, Plus, Edit2, Trash2, Key, ToggleLeft, ToggleRight, X, ChevronLeft, ChevronRight } from 'lucide-react';

const StaffManagementPage = ({ onNavigate }) => {
    // State Variables
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Filter & Search & Pagination State
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const itemsPerPage = 10;

    // Modals State
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Selected Staff State for CRUD
    const [selectedStaff, setSelectedStaff] = useState(null);

    // Form Data State
    const [formData, setFormData] = useState({
        full_name: '',
        username: '',
        email: '',
        contact_number: '',
        role: 'CASHIER',
        status: 'ACTIVE',
        password: ''
    });

    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    const [formErrors, setFormErrors] = useState({});

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1);
        }, 4000); // 400ms debounce
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch Staff List
    const fetchStaff = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const params = new URLSearchParams({
                page: currentPage,
                limit: itemsPerPage,
                search: debouncedSearch,
                role: roleFilter,
                status: statusFilter
            });

            const response = await fetch(`${API_BASE_URL}/staff?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch staff data');
            }

            setStaffList(data.staff || []);
            setTotalPages(data.pages || 1);
            setTotalResults(data.total || 0);
            setError(null);
        } catch (err) {
            console.error('Fetch staff error:', err);
            setError(err.message || 'Failed to retrieve staff members');
        } finally {
            setLoading(false);
        }
    }, [currentPage, debouncedSearch, roleFilter, statusFilter]);

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    // Auto-dismiss alert notifications
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    // Input handlers
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    // Open Modals
    const openAddModal = () => {
        setSelectedStaff(null);
        setFormData({
            full_name: '',
            username: '',
            email: '',
            contact_number: '',
            role: 'CASHIER',
            status: 'ACTIVE',
            password: ''
        });
        setFormErrors({});
        setIsFormModalOpen(true);
    };

    const openEditModal = (staff) => {
        setSelectedStaff(staff);
        setFormData({
            full_name: staff.full_name || '',
            username: staff.username || '',
            email: staff.email || '',
            contact_number: staff.contact_number || '',
            role: staff.role || 'CASHIER',
            status: staff.status || 'ACTIVE',
            password: '' // empty for edit
        });
        setFormErrors({});
        setIsFormModalOpen(true);
    };

    const openPasswordModal = (staff) => {
        setSelectedStaff(staff);
        setPasswordData({
            newPassword: '',
            confirmPassword: ''
        });
        setFormErrors({});
        setIsPasswordModalOpen(true);
    };

    const openDeleteModal = (staff) => {
        setSelectedStaff(staff);
        setIsDeleteModalOpen(true);
    };

    // Form validations
    const validateForm = () => {
        const errors = {};
        if (!formData.full_name.trim()) errors.full_name = 'Full name is required';
        if (!formData.username.trim()) errors.username = 'Username is required';
        else if (/\s/.test(formData.username)) errors.username = 'Username cannot contain spaces';

        if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
            errors.email = 'Invalid email address';
        }

        if (!selectedStaff && (!formData.password || formData.password.length < 6)) {
            errors.password = 'Password must be at least 6 characters';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validatePasswordForm = () => {
        const errors = {};
        if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
            errors.newPassword = 'Password must be at least 6 characters';
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Actions implementation
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            const token = localStorage.getItem('token');
            const url = selectedStaff
                ? `${API_BASE_URL}/staff/${selectedStaff.id}`
                : `${API_BASE_URL}/staff`;

            const method = selectedStaff ? 'PUT' : 'POST';

            const payload = { ...formData };
            if (selectedStaff) {
                delete payload.password; // Do not send password on edit
                delete payload.status; // Status handled by separate endpoint
            }

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to save staff record');
            }

            setSuccessMessage(selectedStaff ? 'Staff details updated successfully' : 'New staff account created successfully');
            setIsFormModalOpen(false);
            fetchStaff();
        } catch (err) {
            console.error('Form submit error:', err);
            setFormErrors({ form: err.message });
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (!validatePasswordForm()) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/staff/${selectedStaff.id}/reset-password`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newPassword: passwordData.newPassword })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to reset password');
            }

            setSuccessMessage('Password reset successfully');
            setIsPasswordModalOpen(false);
        } catch (err) {
            console.error('Password reset error:', err);
            setFormErrors({ passwordForm: err.message });
        }
    };

    const handleToggleStatus = async (staff) => {
        try {
            const token = localStorage.getItem('token');
            const newStatus = staff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

            const response = await fetch(`${API_BASE_URL}/staff/${staff.id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to toggle account status');
            }

            setSuccessMessage(`Account status changed to ${newStatus}`);
            fetchStaff();
        } catch (err) {
            console.error('Toggle status error:', err);
            alert(`Error: ${err.message}`);
        }
    };

    const handleDeleteStaff = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/staff/${selectedStaff.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to delete staff account');
            }

            setSuccessMessage('Staff account deleted successfully');
            setIsDeleteModalOpen(false);
            fetchStaff();
        } catch (err) {
            console.error('Delete staff error:', err);
            alert(`Error: ${err.message}`);
        }
    };

    return (
        <DashboardLayout onNavigate={onNavigate} activePage="staff-management">
            <div className="dashboard-page staff-management-page p-6 text-xs">

                {/* Heading Area */}
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="section-title mb-0">Staff Management</h1>
                        <p className="text-sm text-slate-500 font-medium mt-1">Manage admin and cashier roles, passwords, and security access.</p>
                    </div>
                    <button
                        className="flex items-center gap-2 px-5 h-[42px] bg-white text-slate-700 border border-white hover:bg-gray-100 rounded-xl transition-all shadow-md active:scale-95 text-sm"
                        onClick={openAddModal}
                    >
                        <Plus size={16} />
                        Add New Staff
                    </button>
                </div>

                {/* Notifications */}
                {successMessage && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        {successMessage}
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        {error}
                    </div>
                )}

                {/* Filters Board */}
                <div className="bg-white rounded-2xl border border-[#D7E7DC] shadow-sm px-6 py-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Search Input */}
                        <div className="relative md:col-span-2">
                            <label className="block text-[0.8rem] font-bold text-slate-500 uppercase tracking-wider mb-2">Search Staff</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className="w-full h-[42px] rounded-xl border border-[#D7E7DC] bg-white pl-10 pr-4 text-[0.9rem] font-normal text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                                    placeholder="Search by full name, username, email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>

                        {/* Role Filter */}
                        <div>
                            <label className="block text-[0.8rem] font-bold text-slate-500 uppercase tracking-wider mb-2">Filter by Role</label>
                            <select
                                className="w-full h-[42px] rounded-xl border border-[#D7E7DC] bg-white px-4 text-[0.9rem] font-medium text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 cursor-pointer"
                                value={roleFilter}
                                onChange={(e) => {
                                    setRoleFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="ALL">ALL ROLES</option>
                                <option value="ADMIN">ADMINS Only</option>
                                <option value="CASHIER">CASHIERS Only</option>
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="block text-[0.8rem] font-bold text-slate-500 uppercase tracking-wider mb-2">Filter by Status</label>
                            <select
                                className="w-full h-[42px] rounded-xl border border-[#D7E7DC] bg-white px-4 text-[0.9rem] font-medium text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 cursor-pointer"
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="ALL">ALL STATUSES</option>
                                <option value="ACTIVE">ACTIVE Only</option>
                                <option value="INACTIVE">INACTIVE Only</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table Area */}
                <div className="bg-white rounded-2xl border border-[#D7E7DC] shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-4"></div>
                            <p className="text-slate-500 font-semibold uppercase tracking-wider text-xs">Loading staff data...</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-hidden">
                                <table className="orders-table w-full text-left">
                                    <thead>
                                        <tr>

                                            <th>Username</th>
                                            <th>Email</th>
                                            <th>Contact Number</th>
                                            <th>Role</th>
                                            <th>Status</th>
                                            <th>Created Date</th>
                                            <th className="text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {staffList.map(staff => (
                                            <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">

                                                <td className="font-semibold text-slate-700">@{staff.username}</td>
                                                <td className="text-slate-600">{staff.email || <span className="text-slate-400 italic">No email</span>}</td>
                                                <td className="text-slate-600">{staff.contact_number || <span className="text-slate-400 italic">No contact</span>}</td>
                                                <td>
                                                    <span className={`status-badge px-2.5 py-1 text-xs font-bold rounded-lg ${staff.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                        }`}>
                                                        {staff.role}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`status-badge px-2.5 py-1 text-xs font-bold rounded-lg ${staff.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                        }`}>
                                                        {staff.status}
                                                    </span>
                                                </td>
                                                <td className="text-slate-500 text-xs font-medium">
                                                    {new Date(staff.created_at).toLocaleDateString(undefined, {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </td>
                                                <td>
                                                    <div className="flex items-center justify-end gap-2.5">
                                                        {/* Edit details */}
                                                        <button
                                                            onClick={() => openEditModal(staff)}
                                                            className="p-0.5 bg-white text-black border border-white hover:bg-gray-100 hover:shadow-md rounded-lg transition-all"
                                                            title="Edit Staff Details"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>

                                                        {/* Toggle status (Activate/Deactivate) */}
                                                        <button
                                                            onClick={() => handleToggleStatus(staff)}
                                                            className={`p-0.5 bg-white text-black border border-white hover:bg-gray-100 hover:shadow-md rounded-lg transition-all`}
                                                            title={staff.status === 'ACTIVE' ? 'Deactivate Account' : 'Activate Account'}
                                                        >
                                                            {staff.status === 'ACTIVE' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                                        </button>

                                                        {/* Reset password */}
                                                        <button
                                                            onClick={() => openPasswordModal(staff)}
                                                            className="p-0.5 bg-white text-black border border-white hover:bg-gray-100 hover:shadow-md rounded-lg transition-all"
                                                            title="Reset Password"
                                                        >
                                                            <Key size={16} />
                                                        </button>

                                                        {/* Delete */}
                                                        <button
                                                            onClick={() => openDeleteModal(staff)}
                                                            className="p-0.5 bg-white text-black border border-white hover:bg-gray-100 hover:shadow-md rounded-lg transition-all"
                                                            title="Delete Staff Account"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}

                                        {staffList.length === 0 && (
                                            <tr>
                                                <td colSpan="7" className="text-center py-16 text-slate-400 font-medium">
                                                    No staff accounts found matching your filters.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-6 py-4 border-t border-[#D7E7DC] bg-slate-50/50">
                                    <span className="text-xs font-semibold text-slate-500">
                                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults} staff members
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="p-2 border border-[#D7E7DC] rounded-xl hover:bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="p-2 border border-[#D7E7DC] rounded-xl hover:bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* MODAL 1: ADD & EDIT STAFF FORM */}
                {isFormModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                        <div className="bg-white rounded-3xl border border-[#D7E7DC] w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-6 py-5 border-b border-[#D7E7DC]">
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                                    {selectedStaff ? 'Edit Staff Account' : 'Add New Staff Account'}
                                </h3>
                                <button onClick={() => setIsFormModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Form */}
                            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                                {formErrors.form && (
                                    <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-semibold">
                                        {formErrors.form}
                                    </div>
                                )}

                                {/* Full Name */}
                                <div className="space-y-1.5">
                                    <label className="block text-[0.8rem] font-bold text-slate-600 uppercase tracking-wider">Full Name</label>
                                    <input
                                        type="text"
                                        name="full_name"
                                        className={`w-full h-[40px] rounded-xl border ${formErrors.full_name ? 'border-rose-400 focus:ring-rose-500/10' : 'border-[#D7E7DC] focus:border-emerald-400 focus:ring-emerald-500/10'} bg-white px-4 text-[0.9rem] text-slate-700 outline-none transition-all focus:ring-4`}
                                        placeholder="John Doe"
                                        value={formData.full_name}
                                        onChange={handleFormChange}
                                    />
                                    {formErrors.full_name && <span className="text-[11px] font-bold text-rose-600">{formErrors.full_name}</span>}
                                </div>

                                {/* Username */}
                                <div className="space-y-1.5">
                                    <label className="block text-[0.8rem] font-bold text-slate-600 uppercase tracking-wider">Username</label>
                                    <input
                                        type="text"
                                        name="username"
                                        className={`w-full h-[40px] rounded-xl border ${formErrors.username ? 'border-rose-400 focus:ring-rose-500/10' : 'border-[#D7E7DC] focus:border-emerald-400 focus:ring-emerald-500/10'} bg-white px-4 text-[0.9rem] text-slate-700 outline-none transition-all focus:ring-4`}
                                        placeholder="johndoe"
                                        value={formData.username}
                                        onChange={handleFormChange}
                                    />
                                    {formErrors.username && <span className="text-[11px] font-bold text-rose-600">{formErrors.username}</span>}
                                </div>

                                {/* Email */}
                                <div className="space-y-1.5">
                                    <label className="block text-[0.8rem] font-bold text-slate-600 uppercase tracking-wider">Email Address (Optional)</label>
                                    <input
                                        type="email"
                                        name="email"
                                        className={`w-full h-[40px] rounded-xl border ${formErrors.email ? 'border-rose-400 focus:ring-rose-500/10' : 'border-[#D7E7DC] focus:border-emerald-400 focus:ring-emerald-500/10'} bg-white px-4 text-[0.9rem] text-slate-700 outline-none transition-all focus:ring-4`}
                                        placeholder="johndoe@example.com"
                                        value={formData.email}
                                        onChange={handleFormChange}
                                    />
                                    {formErrors.email && <span className="text-[11px] font-bold text-rose-600">{formErrors.email}</span>}
                                </div>

                                {/* Contact Number */}
                                <div className="space-y-1.5">
                                    <label className="block text-[0.8rem] font-bold text-slate-600 uppercase tracking-wider">Contact Number (Optional)</label>
                                    <input
                                        type="text"
                                        name="contact_number"
                                        className="w-full h-[40px] rounded-xl border border-[#D7E7DC] bg-white px-4 text-[0.9rem] text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                                        placeholder="0771234567"
                                        value={formData.contact_number}
                                        onChange={handleFormChange}
                                    />
                                </div>

                                {/* Role */}
                                <div className="space-y-1.5">
                                    <label className="block text-[0.8rem] font-bold text-slate-600 uppercase tracking-wider">System Role</label>
                                    <select
                                        name="role"
                                        className="w-full h-[40px] rounded-xl border border-[#D7E7DC] bg-white px-4 text-[0.9rem] font-medium text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 cursor-pointer"
                                        value={formData.role}
                                        onChange={handleFormChange}
                                    >
                                        <option value="CASHIER">CASHIER (Standard POS access)</option>
                                        <option value="ADMIN">ADMIN (Full database & reports access)</option>
                                    </select>
                                </div>

                                {/* Password (for adding new staff only) */}
                                {!selectedStaff && (
                                    <div className="space-y-1.5 pb-2">
                                        <label className="block text-[0.8rem] font-bold text-slate-600 uppercase tracking-wider">Login Password</label>
                                        <input
                                            type="password"
                                            name="password"
                                            className={`w-full h-[40px] rounded-xl border ${formErrors.password ? 'border-rose-400 focus:ring-rose-500/10' : 'border-[#D7E7DC] focus:border-emerald-400 focus:ring-emerald-500/10'} bg-white px-4 text-[0.9rem] text-slate-700 outline-none transition-all focus:ring-4`}
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={handleFormChange}
                                        />
                                        {formErrors.password && <span className="text-[11px] font-bold text-rose-600">{formErrors.password}</span>}
                                    </div>
                                )}

                                {/* Form Action Buttons */}
                                <div className="flex justify-end gap-3 pt-4 border-t border-[#D7E7DC] !mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsFormModalOpen(false)}
                                        className="px-5 h-[42px] border border-[#D7E7DC] hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-all text-sm active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 h-[42px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-md active:scale-95 text-sm"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL 2: RESET PASSWORD */}
                {isPasswordModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                        <div className="bg-white rounded-3xl border border-[#D7E7DC] w-full max-w-md shadow-2xl overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-5 border-b border-[#D7E7DC]">
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                                    Reset Password for @{selectedStaff?.username}
                                </h3>
                                <button onClick={() => setIsPasswordModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handlePasswordReset} className="p-6 space-y-4">
                                {formErrors.passwordForm && (
                                    <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-semibold">
                                        {formErrors.passwordForm}
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="block text-[0.8rem] font-bold text-slate-600 uppercase tracking-wider">New Password</label>
                                    <input
                                        type="password"
                                        name="newPassword"
                                        className={`w-full h-[40px] rounded-xl border ${formErrors.newPassword ? 'border-rose-400 focus:ring-rose-500/10' : 'border-[#D7E7DC] focus:border-emerald-400 focus:ring-emerald-500/10'} bg-white px-4 text-[0.9rem] text-slate-700 outline-none transition-all focus:ring-4`}
                                        placeholder="••••••••"
                                        value={passwordData.newPassword}
                                        onChange={handlePasswordChange}
                                    />
                                    {formErrors.newPassword && <span className="text-[11px] font-bold text-rose-600">{formErrors.newPassword}</span>}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[0.8rem] font-bold text-slate-600 uppercase tracking-wider">Confirm New Password</label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        className={`w-full h-[40px] rounded-xl border ${formErrors.confirmPassword ? 'border-rose-400 focus:ring-rose-500/10' : 'border-[#D7E7DC] focus:border-emerald-400 focus:ring-emerald-500/10'} bg-white px-4 text-[0.9rem] text-slate-700 outline-none transition-all focus:ring-4`}
                                        placeholder="••••••••"
                                        value={passwordData.confirmPassword}
                                        onChange={handlePasswordChange}
                                    />
                                    {formErrors.confirmPassword && <span className="text-[11px] font-bold text-rose-600">{formErrors.confirmPassword}</span>}
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-[#D7E7DC] !mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsPasswordModalOpen(false)}
                                        className="px-5 h-[42px] border border-[#D7E7DC] hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-all text-sm active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 h-[42px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-md active:scale-95 text-sm"
                                    >
                                        Reset Password
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL 3: DELETE CONFIRMATION */}
                {isDeleteModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                        <div className="bg-white rounded-3xl border border-[#D7E7DC] w-full max-w-md shadow-2xl overflow-hidden p-6 text-center">
                            <div className="mx-auto w-12 h-12 bg-rose-50 border border-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
                                <Trash2 size={22} />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">
                                Delete Staff Account?
                            </h3>
                            <p className="text-slate-500 font-medium text-sm mb-6">
                                Are you sure you want to permanently delete the account for <strong className="text-slate-700">@{selectedStaff?.username}</strong>? This action cannot be undone.
                            </p>

                            <div className="flex justify-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="px-6 h-[42px] border border-[#D7E7DC] hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-all text-sm active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteStaff}
                                    className="px-6 h-[42px] bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl transition-all shadow-md active:scale-95 text-sm"
                                >
                                    Delete Account
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </DashboardLayout>
    );
};

export default StaffManagementPage;
