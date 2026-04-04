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
            <div className="dashboard-page">
                <div className="report-header">
                    <h1 className="section-title">Cash Management & Shift History</h1>
                    <button className="btn btn-primary" onClick={fetchShifts}>Refresh Data</button>
                </div>

                <div className="cash-card no-print" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>Filter by Date</label>
                        <input
                            type="date"
                            className="form-control"
                            value={filter.date}
                            onChange={(e) => setFilter({ ...filter, date: e.target.value })}
                        />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label>Filter by Cashier</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Type cashier name..."
                            value={filter.cashier}
                            onChange={(e) => setFilter({ ...filter, cashier: e.target.value })}
                        />
                    </div>
                </div>

                <div className="recent-orders">
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
                                    <td style={{
                                        color: Math.abs(shift.difference) > 500 ? 'var(--accent-color)' : (shift.difference !== null ? 'var(--success-color)' : 'inherit'),
                                        fontWeight: 'bold'
                                    }}>
                                        {shift.difference !== null ? `Rs. ${parseFloat(shift.difference).toLocaleString()}` : '-'}
                                    </td>
                                    <td>
                                        <span className={`status-badge ${shift.status === 'OPEN' ? 'status-leave' :
                                                shift.status === 'PENDING_APPROVAL' ? 'status-in-progress' :
                                                    'status-active'
                                            }`} style={{ background: shift.status === 'PENDING_APPROVAL' ? 'var(--accent-color)' : '' }}>
                                            {shift.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
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
