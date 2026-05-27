import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { API_BASE_URL } from '../../config/api';
import ShiftReportModal from '../../components/cash/ShiftReportModal';

const CashManagementPage = ({ onNavigate }) => {
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ date: '', cashier: '' });
    const [selectedShift, setSelectedShift] = useState(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    const fetchShifts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/cash/admin/shifts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setShifts(data);
        } catch (err) {
            console.error('Failed to fetch shifts', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShifts();
    }, []);

    const filteredShifts = shifts.filter(shift => {
        const matchesDate = !filter.date || shift.start_time.includes(filter.date);
        const matchesCashier = !filter.cashier || shift.cashier_name.toLowerCase().includes(filter.cashier.toLowerCase());
        return matchesDate && matchesCashier;
    });

    return (
        <DashboardLayout onNavigate={onNavigate} activePage="cash-management">
            <div className="dashboard-page cash-management-page">
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="section-title mb-0">Cash Management & Shift History</h1>
                    </div>
                    <button className="inventory-outline-btn cash-management-btn" onClick={fetchShifts}>Refresh Data</button>
                </div>

                <div className="bg-white rounded-2xl border border-[#D7E7DC] shadow-sm px-7 py-7 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[0.9rem] font-medium text-slate-700">Filter by Date</label>
                        <input
                            type="date"
                            className="w-full h-[42px] rounded-xl border border-[#D7E7DC] bg-white px-4 text-[0.9rem] font-normal text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                            value={filter.date}
                            onChange={(e) => setFilter({ ...filter, date: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[0.9rem] font-medium text-slate-700">Filter by Cashier</label>
                        <input
                            type="text"
                            className="w-full h-[42px] rounded-xl border border-[#D7E7DC] bg-white px-4 text-[0.9rem] font-normal text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10"
                            placeholder="Type cashier name..."
                            value={filter.cashier}
                            onChange={(e) => setFilter({ ...filter, cashier: e.target.value })}
                        />
                    </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#D7E7DC] shadow-sm p-7 overflow-hidden">
                    <table className="orders-table">
                        <thead>
                            <tr>
                                <th>Date/Time</th>
                                <th>Cashier</th>
                                <th>Counter</th>
                                <th>Opening</th>
                                <th>Expected</th>
                                <th>Actual</th>
                                <th>Difference</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredShifts.map(shift => (
                                <tr key={shift.shift_id}>
                                    <td>{new Date(shift.start_time).toLocaleString()}</td>
                                    <td>{shift.cashier_name}</td>
                                    <td>{shift.counter_number}</td>
                                    <td>Rs. {parseFloat(shift.opening_cash).toLocaleString()}</td>
                                    <td>Rs. {shift.expected_cash ? parseFloat(shift.expected_cash).toLocaleString() : '-'}</td>
                                    <td>Rs. {shift.actual_cash ? parseFloat(shift.actual_cash).toLocaleString() : '-'}</td>
                                    <td className="text-slate-700 font-medium">
                                        {shift.difference !== null ? `Rs. ${parseFloat(shift.difference).toLocaleString()}` : '-'}
                                    </td>
                                    <td>
                                        <span className={`status-badge cash-management-status ${shift.status === 'OPEN' ? 'status-leave' :
                                                shift.status === 'PENDING_APPROVAL' ? 'status-in-progress' :
                                                    'status-active'
                                            }`} style={{ background: shift.status === 'PENDING_APPROVAL' ? '#FEF3C7' : '' }}>
                                            {shift.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="inventory-outline-btn cash-management-btn"
                                            onClick={() => {
                                                setSelectedShift(shift);
                                                setIsReportModalOpen(true);
                                            }}
                                        >
                                            {shift.status === 'PENDING_APPROVAL' ? 'Review & Approve' : 'View Report'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <ShiftReportModal
                    isOpen={isReportModalOpen}
                    onClose={() => setIsReportModalOpen(false)}
                    shift={selectedShift}
                    onApproved={() => fetchShifts()}
                />
            </div>
        </DashboardLayout>
    );
};

export default CashManagementPage;
