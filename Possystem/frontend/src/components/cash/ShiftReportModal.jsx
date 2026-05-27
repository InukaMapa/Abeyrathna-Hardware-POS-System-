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
                    <button className="shift-report-close" onClick={onClose}>&times;</button>
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
                    <button className="shift-report-action" onClick={onClose}>Close</button>
                    {userRole === 'ADMIN' && shift.status === 'PENDING_APPROVAL' && (
                        <button
                            className="shift-report-action"
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
                    background: rgba(15, 23, 42, 0.45);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 2100; backdrop-filter: blur(8px);
                }
                .shift-report-modal {
                    width: 95%; max-width: 800px; max-height: 90vh;
                    background: #FFFFFF; border: 1px solid #D7E7DC; 
                    border-top: 1px solid #D7E7DC; border-radius: 18px;
                    display: flex; flex-direction: column; overflow: hidden;
                    box-shadow: 0 24px 48px rgba(15, 23, 42, 0.16);
                }
                .modal-header { padding: 20px 22px; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; background: #FFFFFF; }
                .modal-header h2 { margin: 0; font-size: 1rem; color: #102033; font-family: inherit; font-weight: 600; line-height: 1.35; }
                .shift-report-close {
                    width: 36px;
                    height: 36px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                    border: 1px solid #D7E7DC;
                    background: #FFFFFF;
                    color: #334155;
                    font-size: 1.35rem;
                    line-height: 1;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .shift-report-close:hover {
                    background: #F8FCFA;
                    border-color: rgba(22, 163, 74, 0.45);
                    box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.07);
                }
                .modal-body { padding: 24px; overflow-y: auto; flex: 1; scrollbar-width: thin; scrollbar-color: #CBD5E1 #FFFFFF; }
                .modal-body::-webkit-scrollbar {
                    width: 10px;
                }
                .modal-body::-webkit-scrollbar-track {
                    background: #FFFFFF;
                    border-radius: 999px;
                }
                .modal-body::-webkit-scrollbar-thumb {
                    background: #CBD5E1;
                    border-radius: 999px;
                    border: 2px solid #FFFFFF;
                }
                .modal-body::-webkit-scrollbar-thumb:hover {
                    background: #B6C4D6;
                }
                .report-section { margin-bottom: 25px; }
                .report-subtitle { color: #475569; margin-bottom: 12px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; text-transform: uppercase; font-size: 0.73rem; letter-spacing: 0.16em; font-weight: 600; }
                .report-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; color: #64748B; font-size: 0.88rem; font-weight: 400; }
                .summary-grid-compact { background: #FFFFFF; padding: 18px; border-radius: 14px; border: 1px solid #D7E7DC; }
                .summary-row { display: flex; justify-content: space-between; padding: 8px 0; color: #334155; font-size: 0.89rem; font-weight: 400; }
                .summary-row.success { color: #334155; font-weight: 400; }
                .summary-row.danger { color: #334155; font-weight: 400; }
                .summary-row.highlight { color: #102033; font-weight: 500; }
                .summary-row.large { font-size: 0.98rem; font-weight: 500; margin-top: 10px; padding-top: 12px; border-top: 1px solid #E2E8F0; color: #102033; }
                .modal-footer { padding: 15px 20px; border-top: 1px solid #E2E8F0; display: flex; justify-content: flex-end; gap: 10px; background: #FFFFFF; }
                .shift-report-action {
                    min-height: 36px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 13px;
                    color: #334155;
                    background: #FFFFFF;
                    border: 1px solid #D7E7DC;
                    border-radius: 8px;
                    box-shadow: none;
                    font-size: 0.8rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .shift-report-action:hover {
                    color: #14532D;
                    background: #F8FCFA;
                    border-color: rgba(22, 163, 74, 0.45);
                    box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.07);
                }
                .shift-report-action:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    box-shadow: none;
                }
                .shift-report-modal .loading-spinner,
                .shift-report-modal .error-message {
                    font-size: 0.9rem;
                    font-weight: 400;
                    color: #64748B;
                }
            `}</style>
        </div>
    );
};

export default ShiftReportModal;
