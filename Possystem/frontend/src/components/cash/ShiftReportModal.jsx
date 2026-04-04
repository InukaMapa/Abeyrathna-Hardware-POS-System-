import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import DenominationCounter from './DenominationCounter';

const ShiftReportModal = ({ isOpen, onClose, shift, onApproved, selectedCount = null }) => {
    const { userRole } = useAuth();
    const [summary, setSummary] = useState(null);
    const [counts, setCounts] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [approving, setApproving] = useState(false);

    useEffect(() => {
        if (isOpen && shift) {
            fetchReportData();
        }
    }, [isOpen, shift, selectedCount]);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // Always fetch summary (expected cash etc)
            const summaryRes = await fetch(`${API_BASE_URL}/cash/summary/${shift.shift_id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const summaryData = await summaryRes.json();

            if (!summaryRes.ok) {
                throw new Error(summaryData.error || 'Failed to fetch summary');
            }
            setSummary(summaryData);

            if (selectedCount) {
                // Use provided count data
                const { count_id, shift_id, created_at, total_cash, ...denomCounts } = selectedCount;
                setCounts(denomCounts);
            } else {
                // Fetch latest count (default behavior)
                const countRes = await fetch(`${API_BASE_URL}/cash/count/${shift.shift_id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const countData = await countRes.json();
                if (countRes.ok && countData) {
                    const { count_id, shift_id, created_at, total_cash, ...denomCounts } = countData;
                    setCounts(denomCounts);
                }
            }
        } catch (err) {
            console.error('Failed to fetch report data', err);
            setError(err.message || 'Failed to load report data');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        setApproving(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/cash/approve-shift/${shift.shift_id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to approve shift');
            if (onApproved) onApproved();
            onClose();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setApproving(false);
        }
    };

    if (!isOpen || !shift) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content shift-report-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Shift Report - {shift.cashier_name} (Counter {shift.counter_number})</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    {loading ? (
                        <div className="loading-spinner">Loading report details...</div>
                    ) : error ? (
                        <div className="error-message p-4 text-red-500 bg-red-100/10 rounded-lg">{error}</div>
                    ) : !summary ? (
                        <div className="error-message p-4 text-red-500">Report summary data is currently unavailable.</div>
                    ) : (
                        <div className="report-content">
                            <div className="report-section">
                                <h4 className="report-subtitle">Shift Timing</h4>
                                <div className="report-info-grid">
                                    <div>Started: {new Date(shift.start_time).toLocaleString()}</div>
                                    <div>Ended: {shift.end_time ? new Date(shift.end_time).toLocaleString() : 'Running'}</div>
                                </div>
                            </div>

                            <div className="report-section">
                                <h4 className="report-subtitle">Cash Reconcilation</h4>
                                <DenominationCounter
                                    readOnly={true}
                                    initialCounts={counts}
                                    onTotalChange={() => { }}
                                />
                            </div>

                            <div className="report-section">
                                <h4 className="report-subtitle">Financial Summary</h4>
                                <div className="summary-grid-compact">
                                    <div className="summary-row">
                                        <span>Opening Cash:</span>
                                        <span>Rs. {parseFloat(summary?.opening_cash || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="summary-row success">
                                        <span>+ Cash Sales ({summary?.cash_sales_count || 0} orders):</span>
                                        <span>Rs. {(summary?.cash_sales || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="summary-row success">
                                        <span>+ Cash In:</span>
                                        <span>Rs. {(summary?.cash_in || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="summary-row danger">
                                        <span>- Cash Out:</span>
                                        <span>Rs. {(summary?.cash_out || 0).toLocaleString()}</span>
                                    </div>
                                    <hr style={{ border: '0', borderTop: '1px solid #333', margin: '10px 0' }} />
                                    <div className="summary-row highlight">
                                        <span>Expected Cash (Snapshot):</span>
                                        <span>Rs. {parseFloat(selectedCount?.expected_cash || summary?.expected_cash || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="summary-row highlight">
                                        <span>Actual Cash (Counted):</span>
                                        <span>Rs. {parseFloat(selectedCount ? selectedCount.total_cash : (shift.actual_cash || 0)).toLocaleString()}</span>
                                    </div>
                                    <div className={`summary-row large ${(selectedCount ? (selectedCount.total_cash - (selectedCount.expected_cash || summary.expected_cash)) : (shift.difference || 0)) >= 0 ? 'success' : 'danger'}`}>
                                        <span>Difference:</span>
                                        <span>Rs. {parseFloat(selectedCount ? (selectedCount.total_cash - (selectedCount.expected_cash || summary.expected_cash)) : (shift.difference || 0)).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                    {userRole === 'ADMIN' && shift.status === 'PENDING_APPROVAL' && (
                        <button
                            className="btn btn-primary"
                            onClick={handleApprove}
                            disabled={approving}
                        >
                            {approving ? 'Approving...' : 'Approve & Close Shift'}
                        </button>
                    )}
                </div>
            </div>

            <style>{`
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.8);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 2100; backdrop-filter: blur(5px);
                }
                .shift-report-modal {
                    width: 95%; max-width: 800px; max-height: 90vh;
                    background: #121212; border: 1px solid #333; border-radius: 12px;
                    display: flex; flex-direction: column; overflow: hidden;
                }
                .modal-header { padding: 20px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; }
                .modal-header h2 { margin: 0; font-size: 1.2rem; color: #fff; }
                .modal-body { padding: 20px; overflow-y: auto; flex: 1; }
                .report-section { margin-bottom: 25px; }
                .report-subtitle { color: var(--accent-color); margin-bottom: 10px; border-bottom: 1px solid #222; padding-bottom: 5px; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px; }
                .report-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; color: #888; font-size: 0.9rem; }
                .summary-grid-compact { background: #1a1a1a; padding: 15px; border-radius: 8px; border: 1px solid #222; }
                .summary-row { display: flex; justify-content: space-between; padding: 6px 0; color: #ccc; }
                .summary-row.success { color: var(--success-color); }
                .summary-row.danger { color: #e74c3c; }
                .summary-row.highlight { color: #fff; font-weight: bold; }
                .summary-row.large { font-size: 1.2rem; font-weight: 800; margin-top: 10px; padding-top: 10px; border-top: 2px solid #333; }
                .modal-footer { padding: 15px 20px; border-top: 1px solid #333; display: flex; justify-content: flex-end; gap: 10px; }
            `}</style>
        </div>
    );
};

export default ShiftReportModal;
