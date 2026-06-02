import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { API_BASE_URL } from '../../config/api';
import { Search, Plus, Edit2, Trash2, Key, ToggleLeft, ToggleRight, X, ChevronLeft, ChevronRight, Eye, Loader } from 'lucide-react';
import '../../styles/menu.css';

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
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Selected Staff State for CRUD
    const [selectedStaff, setSelectedStaff] = useState(null);

    // Form Data State
    const [formData, setFormData] = useState({
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

    const openViewModal = (staff) => {
        setSelectedStaff(staff);
        setIsViewModalOpen(true);
    };

    const openEditModal = (staff) => {
        setSelectedStaff(staff);
        setFormData({
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
                payload.full_name = selectedStaff.full_name || null;
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
            <div className="menu-management-container inventory-page staff-management-page animate-fade-in custom-scrollbar">

                <div className="inventory-sticky-panel sticky top-[-28px] z-[50]">
                    <div className="menu-header inventory-header !mb-6">
                        <div>
                            <h1 className="menu-title inventory-title">Staff Management</h1>
                            <p className="inventory-subtitle">Manage admin and cashier roles, passwords, and security access.</p>
                        </div>
                        <div className="inventory-toolbar">
                            <button
                                title="Add Staff"
                                className="inventory-outline-btn"
                                onClick={openAddModal}
                            >
                                <Plus size={15} />
                                Add Staff
                            </button>
                        </div>
                    </div>

                    <div className="menu-filters-container inventory-filters !mb-0">
                        <div className="menu-top-bar">
                            <div className="search-wrapper inventory-search staff-search">
                                <Search className="search-icon w-4 h-4" />
                                <input
                                    type="text"
                                    className="menu-search-input"
                                    placeholder="Search by full name, username, email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="inventory-filter-group">
                                <select
                                    className="filter-select inventory-select"
                                    value={roleFilter}
                                    onChange={(e) => {
                                        setRoleFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="ALL">All Roles</option>
                                    <option value="ADMIN">Admins</option>
                                    <option value="CASHIER">Cashiers</option>
                                </select>

                                <select
                                    className="filter-select inventory-select"
                                    value={statusFilter}
                                    onChange={(e) => {
                                        setStatusFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="ALL">All Status</option>
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {successMessage && (
                    <div className="staff-alert staff-alert-success">
                        <span></span>
                        {successMessage}
                    </div>
                )}

                {error && (
                    <div className="staff-alert staff-alert-error">
                        <span></span>
                        {error}
                    </div>
                )}

                <div className="inventory-table-card staff-table-card">
                    <div className="overflow-x-auto">
                        <table className="inventory-table staff-table w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="p-4 font-semibold">Username</th>
                                    <th className="p-4 font-semibold">Email</th>
                                    <th className="p-4 font-semibold">Contact Number</th>
                                    <th className="p-4 font-semibold">Role</th>
                                    <th className="p-4 font-semibold">Status</th>
                                    <th className="p-4 font-semibold">Created Date</th>
                                    <th className="p-4 font-semibold text-right staff-actions-heading">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="p-12 text-center text-[#A0A0A0]">
                                            <Loader className="w-6 h-6 animate-spin mx-auto mb-2" />
                                            Loading staff data...
                                        </td>
                                    </tr>
                                ) : staffList.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="p-12 text-center text-[#A0A0A0]">
                                            No staff accounts found matching your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        {staffList.map(staff => (
                                            <tr key={staff.id}>

                                                <td className="p-4">
                                                    <div className="inventory-item-name">@{staff.username}</div>
                                                    <div className="inventory-item-unit">{staff.full_name || 'Staff member'}</div>
                                                </td>
                                                <td className="p-4 inventory-cell-text">{staff.email || <span className="text-[#666] italic">No email</span>}</td>
                                                <td className="p-4 inventory-cell-text">{staff.contact_number || <span className="text-[#666] italic">No contact</span>}</td>
                                                <td className="p-4">
                                                    <span className="inventory-category-pill">
                                                        {staff.role}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`staff-status-pill ${staff.status === 'ACTIVE' ? 'staff-status-active' : 'staff-status-inactive'
                                                        }`}>
                                                        {staff.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 inventory-code">
                                                    {new Date(staff.created_at).toLocaleDateString(undefined, {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </td>
                                                <td className="p-4 text-right staff-actions-cell">
                                                    <div className="staff-table-actions">
                                                        <button
                                                            onClick={() => openViewModal(staff)}
                                                            className="inventory-action-btn"
                                                            title="View Staff Details"
                                                        >
                                                            <Eye />
                                                        </button>

                                                        <button
                                                            onClick={() => openEditModal(staff)}
                                                            className="inventory-action-btn"
                                                            title="Edit Staff Details"
                                                        >
                                                            <Edit2 />
                                                        </button>

                                                        <button
                                                            onClick={() => openPasswordModal(staff)}
                                                            className="inventory-action-btn"
                                                            title="Reset Password"
                                                        >
                                                            <Key />
                                                        </button>

                                                        <button
                                                            onClick={() => handleToggleStatus(staff)}
                                                            className="inventory-action-btn"
                                                            title={staff.status === 'ACTIVE' ? 'Deactivate Account' : 'Activate Account'}
                                                        >
                                                            {staff.status === 'ACTIVE' ? <ToggleRight /> : <ToggleLeft />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="staff-pagination">
                            <span>
                                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults} staff members
                            </span>
                            <div className="staff-pagination-actions">
                                <button
                                    title="Previous Page"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="inventory-action-btn"
                                >
                                    <ChevronLeft />
                                </button>
                                <button
                                    title="Next Page"
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="inventory-action-btn"
                                >
                                    <ChevronRight />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* MODAL 0: VIEW STAFF */}
                {isViewModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                        <div className="bg-white rounded-3xl border border-[#D7E7DC] w-full max-w-md shadow-2xl overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-5 border-b border-[#D7E7DC]">
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                                    Staff Details
                                </h3>
                                <button title="Close" onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                {[
                                    ['Full Name', selectedStaff?.full_name || 'Not provided'],
                                    ['Username', selectedStaff?.username ? `@${selectedStaff.username}` : 'Not provided'],
                                    ['Email', selectedStaff?.email || 'No email'],
                                    ['Contact Number', selectedStaff?.contact_number || 'No contact'],
                                    ['Role', selectedStaff?.role || 'Not assigned'],
                                    ['Status', selectedStaff?.status || 'Unknown'],
                                    ['Created Date', selectedStaff?.created_at ? new Date(selectedStaff.created_at).toLocaleDateString(undefined, {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    }) : 'Not available']
                                ].map(([label, value]) => (
                                    <div key={label} className="flex items-center justify-between gap-4 border-b border-[#EAF1EC] pb-3 last:border-b-0 last:pb-0">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
                                        <span className="text-sm font-semibold text-slate-800 text-right">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL 1: ADD & EDIT STAFF FORM */}
                {isFormModalOpen && (
                    <div className="staff-form-overlay animate-fadeIn">
                        <div className="staff-form-modal">
                            {/* Modal Header */}
                            <div className="staff-form-header">
                                <h3>
                                    {selectedStaff ? 'Edit Staff Account' : 'Add New Staff Account'}
                                </h3>
                                <button title="Close" onClick={() => setIsFormModalOpen(false)} className="staff-form-btn staff-form-icon-btn">
                                    <X />
                                </button>
                            </div>

                            {/* Modal Form */}
                            <form onSubmit={handleFormSubmit} className="staff-form-body">
                                {formErrors.form && (
                                    <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-semibold">
                                        {formErrors.form}
                                    </div>
                                )}

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
                                <div className="staff-form-actions">
                                    <button
                                        type="button"
                                        onClick={() => setIsFormModalOpen(false)}
                                        className="staff-form-btn"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="staff-form-btn"
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
