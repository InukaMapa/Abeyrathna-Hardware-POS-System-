import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { API_BASE_URL } from '../../config/api';
import ShiftReportModal from '../../components/cash/ShiftReportModal';
import { Eye, RefreshCw } from 'lucide-react';

const formatCurrency = (value) => {
    const amount = Number.parseFloat(value);
    if (!Number.isFinite(amount)) return '-';
    return `Rs. ${amount.toLocaleString()}`;
};

const formatStatus = (status = '') => status.replace(/_/g, ' ');

const getStatusClass = (status) => {
    if (status === 'PENDING_APPROVAL') return 'pending';
    if (status === 'OPEN' || status === 'REPORT_SUBMITTED') return 'open';
    if (status === 'CLOSED') return 'closed';
    return 'default';
};

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
        const cashierName = shift.cashier_name || '';
        const matchesCashier = !filter.cashier || cashierName.toLowerCase().includes(filter.cashier.toLowerCase());
        return matchesDate && matchesCashier;
    });

    return (
        <DashboardLayout onNavigate={onNavigate} activePage="cash-management">
            <div className="dashboard-page cash-management-page">
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="section-title mb-0">Cash Management & Shift History</h1>
                    </div>
                    <button className="inventory-outline-btn cash-management-btn cash-management-refresh" onClick={fetchShifts} disabled={loading}>
                        <RefreshCw size={16} />
                        {loading ? 'Refreshing' : 'Refresh Data'}
                    </button>
                </div>

                <div className="cash-management-filter-card">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="cash-management-field">
                            <label>Filter by Date</label>
                            <input
                                type="date"
                                value={filter.date}
                                onChange={(e) => setFilter({ ...filter, date: e.target.value })}
                            />
                        </div>
                        <div className="cash-management-field">
                            <label>Filter by Cashier</label>
                            <input
                                type="text"
                                placeholder="Type cashier name..."
                                value={filter.cashier}
                                onChange={(e) => setFilter({ ...filter, cashier: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="cash-management-table-card">
                    <div className="cash-management-table-wrap">
                        <table className="orders-table cash-management-table">
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
                                    <th className="cash-management-actions-heading">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="9" className="cash-management-empty-cell">Loading shift history...</td>
                                    </tr>
                                ) : filteredShifts.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="cash-management-empty-cell">No shift records match the selected filters.</td>
                                    </tr>
                                ) : filteredShifts.map(shift => (
                                    <tr key={shift.shift_id}>
                                        <td className="cash-management-date-cell">{new Date(shift.start_time).toLocaleString()}</td>
                                        <td className="cash-management-cashier-cell">{shift.cashier_name || '-'}</td>
                                        <td>{shift.counter_number || '-'}</td>
                                        <td className="cash-management-money-cell">{formatCurrency(shift.opening_cash)}</td>
                                        <td className="cash-management-money-cell">{formatCurrency(shift.expected_cash)}</td>
                                        <td className="cash-management-money-cell">{formatCurrency(shift.actual_cash)}</td>
                                        <td className="cash-management-money-cell">{formatCurrency(shift.difference)}</td>
                                        <td>
                                            <span className={`cash-management-status ${getStatusClass(shift.status)}`}>
                                                {formatStatus(shift.status)}
                                            </span>
                                        </td>
                                        <td className="cash-management-actions-cell">
                                            <button
                                                className="inventory-outline-btn cash-management-btn cash-management-review-btn"
                                                onClick={() => {
                                                    setSelectedShift(shift);
                                                    setIsReportModalOpen(true);
                                                }}
                                                aria-label={shift.status === 'PENDING_APPROVAL' ? 'Review and approve shift report' : 'View shift report'}
                                                title={shift.status === 'PENDING_APPROVAL' ? 'Review and approve shift report' : 'View shift report'}
                                            >
                                                <Eye size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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
