import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.jpeg';

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

    const denominations = [
        { label: 'Rs 5000', key: 'rs5000', value: 5000 },
        { label: 'Rs 2000', key: 'rs2000', value: 2000 },
        { label: 'Rs 1000', key: 'rs1000', value: 1000 },
        { label: 'Rs 500', key: 'rs500', value: 500 },
        { label: 'Rs 100', key: 'rs100', value: 100 },
        { label: 'Rs 50', key: 'rs50', value: 50 },
        { label: 'Rs 20', key: 'rs20', value: 20 },
        { label: 'Rs 10', key: 'rs10', value: 10 },
        { label: 'Rs 5', key: 'rs5', value: 5 },
        { label: 'Rs 2', key: 'rs2', value: 2 },
        { label: 'Rs 1', key: 'rs1', value: 1 }
    ];
    const selectedTotal = Number(selectedCount ? selectedCount.total_cash : (shift.actual_cash || 0));
    const expectedCash = Number(selectedCount?.expected_cash || summary?.expected_cash || 0);
    const difference = selectedTotal - expectedCash;
    const conclusionText = Math.abs(difference) < 0.01
        ? 'Cash count is balanced with the expected cash amount for this shift.'
        : 'Cash count has a variance and should be reviewed before final approval.';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content shift-report-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header report-modal-topbar">
                    <h2>Cash Shift Report</h2>
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
                            <section className="official-report-letterhead">
                                <img src={logo} alt="Abeyrathna Trade Center" />
                                <div>
                                    <p>Abeyrathna Trade Center</p>
                                    <h3>Official Cash Shift Report</h3>
                                    <span>Generated for internal cashier reconciliation and administrative review.</span>
                                </div>
                            </section>

                            <section className="official-report-section">
                                <h4 className="report-subtitle">Cashier Details</h4>
                                <div className="official-report-grid">
                                    <div><span>Cashier Name</span><strong>{shift.cashier_name || 'N/A'}</strong></div>
                                    <div><span>Counter</span><strong>{shift.counter_number || 'N/A'}</strong></div>
                                    <div><span>Shift Status</span><strong>{shift.status || 'N/A'}</strong></div>
                                    <div><span>Report Time</span><strong>{new Date().toLocaleString()}</strong></div>
                                </div>
                            </section>

                            <section className="official-report-section">
                                <h4 className="report-subtitle">Shift Details</h4>
                                <div className="official-report-grid">
                                    <div><span>Shift ID</span><strong>{shift.shift_id}</strong></div>
                                    <div><span>Started</span><strong>{new Date(shift.start_time).toLocaleString()}</strong></div>
                                    <div><span>Ended</span><strong>{shift.end_time ? new Date(shift.end_time).toLocaleString() : 'Running'}</strong></div>
                                    <div><span>Saved Count</span><strong>{selectedCount?.created_at ? new Date(selectedCount.created_at).toLocaleString() : 'Latest available'}</strong></div>
                                </div>
                            </section>

                            <section className="official-report-section">
                                <h4 className="report-subtitle">Financial Summary</h4>
                                <div className="official-summary-cards">
                                    <div><span>Opening Cash</span><strong>Rs. {Number(summary?.opening_cash || 0).toLocaleString()}</strong></div>
                                    <div><span>Cash Sales</span><strong>Rs. {Number(summary?.cash_sales || 0).toLocaleString()}</strong><small>{summary?.cash_sales_count || 0} orders</small></div>
                                    <div><span>Cash In</span><strong>Rs. {Number(summary?.cash_in || 0).toLocaleString()}</strong></div>
                                    <div><span>Cash Out</span><strong>Rs. {Number(summary?.cash_out || 0).toLocaleString()}</strong></div>
                                    <div><span>Expected Cash</span><strong>Rs. {expectedCash.toLocaleString()}</strong></div>
                                    <div><span>Actual Cash</span><strong>Rs. {selectedTotal.toLocaleString()}</strong></div>
                                    <div className="conclusion-card"><span>Difference</span><strong className={Math.abs(difference) < 0.01 ? 'balanced' : 'variance'}>Rs. {difference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                                </div>
                            </section>

                            <section className="official-report-section">
                                <h4 className="report-subtitle">Denomination Breakdown</h4>
                                <div className="official-table-wrap">
                                    <table className="official-report-table">
                                        <thead>
                                            <tr>
                                                <th>Denomination</th>
                                                <th>Quantity</th>
                                                <th>Line Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {denominations.map((den) => {
                                                const qty = Number(counts?.[den.key] || 0);
                                                return (
                                                    <tr key={den.key}>
                                                        <td>{den.label}</td>
                                                        <td>{qty}</td>
                                                        <td>Rs. {(qty * den.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section className="official-report-section">
                                <h4 className="report-subtitle">Conclusion</h4>
                                <div className="official-conclusion">
                                    <p>{conclusionText}</p>
                                    <div className="official-signature-grid">
                                        <div><span>Cashier Signature</span></div>
                                        <div><span>Admin Verification</span></div>
                                    </div>
                                </div>
                            </section>
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
                    width: 95%; max-width: 940px; max-height: 92vh;
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
                .report-content { display: grid; gap: 20px; }
                .official-report-letterhead { display: grid; grid-template-columns: 110px 1fr; gap: 20px; align-items: center; padding: 18px; border: 1px solid #D7E7DC; border-radius: 16px; background: #FFFFFF; }
                .official-report-letterhead img { width: 100px; height: 100px; object-fit: contain; border-radius: 12px; border: 1px solid #E2E8F0; }
                .official-report-letterhead p { margin: 0 0 4px; color: #166534; font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 500; }
                .official-report-letterhead h3 { margin: 0; color: #102033; font-size: 1.22rem; font-weight: 500; }
                .official-report-letterhead span { display: block; margin-top: 8px; color: #64748B; font-size: 0.85rem; line-height: 1.5; }
                .official-report-section { padding: 18px; border: 1px solid #D7E7DC; border-radius: 16px; background: #FFFFFF; }
                .report-subtitle { color: #475569; margin: 0 0 14px; border-bottom: 1px solid #E2E8F0; padding-bottom: 9px; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.14em; font-weight: 500; }
                .official-report-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
                .official-report-grid div, .official-summary-cards div { border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px; background: #FFFFFF; }
                .official-report-grid span, .official-summary-cards span { display: block; color: #64748B; font-size: 0.68rem; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; margin-bottom: 6px; }
                .official-report-grid strong, .official-summary-cards strong { color: #102033; font-size: 0.86rem; font-weight: 400; line-height: 1.35; overflow-wrap: anywhere; }
                .official-summary-cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
                .official-summary-cards small { display: block; margin-top: 4px; color: #64748B; font-size: 0.72rem; }
                .official-summary-cards .conclusion-card { border-color: rgba(22, 163, 74, 0.24); }
                .official-summary-cards strong.balanced { color: #16A34A; font-weight: 500; }
                .official-summary-cards strong.variance { color: #D4A017; font-weight: 500; }
                .official-table-wrap { border: 1px solid #D7E7DC; border-radius: 14px; overflow: hidden; }
                .official-report-table { width: 100%; border-collapse: collapse; }
                .official-report-table th { padding: 12px 14px; background: #FFFFFF; color: #64748B; font-size: 0.68rem; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; text-align: left; border-bottom: 1px solid #D7E7DC; }
                .official-report-table td { padding: 12px 14px; color: #334155; font-size: 0.86rem; font-weight: 400; border-bottom: 1px solid #EEF4F0; }
                .official-report-table tr:last-child td { border-bottom: 0; }
                .official-conclusion p { margin: 0; color: #334155; font-size: 0.88rem; line-height: 1.6; }
                .official-signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 22px; }
                .official-signature-grid div { min-height: 62px; border-top: 1px solid #CBD5E1; display: flex; align-items: flex-end; }
                .official-signature-grid span { color: #64748B; font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase; }
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
                @media (max-width: 760px) {
                    .official-report-letterhead,
                    .official-report-grid,
                    .official-summary-cards,
                    .official-signature-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
};

export default ShiftReportModal;
