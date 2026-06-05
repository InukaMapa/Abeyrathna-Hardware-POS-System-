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
    const [detailModal, setDetailModal] = useState({ isOpen: false, type: null, title: '' });
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailRows, setDetailRows] = useState([]);
    const [expandedDetailOrder, setExpandedDetailOrder] = useState(null);

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

    const openFinancialDetail = async (type, title) => {
        setDetailModal({ isOpen: true, type, title });
        setDetailLoading(true);
        setDetailRows([]);
        setExpandedDetailOrder(null);

        try {
            const token = localStorage.getItem('token');
            let response;
            let data;

            if (type === 'cash_sales') {
                response = await fetch(`${API_BASE_URL}/cash/shift-orders/${shift.shift_id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to fetch cash sales details');
                setDetailRows(Array.isArray(data) ? data : []);
                return;
            }

            if (type === 'cash_in' || type === 'cash_out') {
                response = await fetch(`${API_BASE_URL}/cash/shift-movements/${shift.shift_id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to fetch cash movement details');
                setDetailRows((Array.isArray(data) ? data : []).filter(movement => movement.type === type));
                return;
            }

            response = await fetch(`${API_BASE_URL}/cash/shift-electronic-payments/${shift.shift_id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch payment details');
            const paymentType = type === 'bank' ? 'Bank Transfer' : 'Card';
            setDetailRows((Array.isArray(data.payments) ? data.payments : []).filter(payment => payment.type === paymentType));
        } catch (err) {
            console.error('Failed to fetch report detail data', err);
            setDetailRows([]);
        } finally {
            setDetailLoading(false);
        }
    };

    const closeFinancialDetail = () => {
        setDetailModal({ isOpen: false, type: null, title: '' });
        setDetailRows([]);
        setExpandedDetailOrder(null);
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
    const openingCash = Number(summary?.opening_cash || 0);
    const cashSales = Number(summary?.cash_sales || 0);
    const cashIn = Number(summary?.cash_in || 0);
    const cashOut = Number(summary?.cash_out || 0);
    const bankTransferTotal = Number(summary?.bank_transfer_total || 0);
    const cardPaymentTotal = Number(summary?.card_payment_total || 0);
    const electronicPaymentTotal = bankTransferTotal + cardPaymentTotal;
    const fullReportTotal = Number(summary?.full_total || (openingCash + cashIn + cashSales + electronicPaymentTotal - cashOut));
    const difference = selectedTotal - expectedCash;
    const conclusionText = Math.abs(difference) < 0.01
        ? 'Cash count is balanced with the expected cash amount for this shift.'
        : 'Cash count has a variance and should be reviewed before final approval.';
    const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const getSummaryActionProps = (type, title) => ({
        role: 'button',
        tabIndex: 0,
        onClick: () => openFinancialDetail(type, title),
        onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openFinancialDetail(type, title);
            }
        }
    });

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
                                    <div><span>Opening Cash</span><strong>{formatCurrency(openingCash)}</strong></div>
                                    <div className="official-summary-card is-clickable" {...getSummaryActionProps('cash_sales', 'Shift Cash Sales Details')}>
                                        <span>Cash Sales</span><strong>{formatCurrency(cashSales)}</strong><small>{summary?.cash_sales_count || 0} orders</small>
                                    </div>
                                    <div className="official-summary-card is-clickable" {...getSummaryActionProps('bank', 'Bank Transfer Details')}>
                                        <span>Bank Transfers</span><strong>{formatCurrency(bankTransferTotal)}</strong>
                                    </div>
                                    <div className="official-summary-card is-clickable" {...getSummaryActionProps('card', 'Card Payment Details')}>
                                        <span>Card Payments</span><strong>{formatCurrency(cardPaymentTotal)}</strong>
                                    </div>
                                    <div className="official-summary-card is-clickable" {...getSummaryActionProps('cash_in', 'Cash In Details')}>
                                        <span>Cash In</span><strong>{formatCurrency(cashIn)}</strong>
                                    </div>
                                    <div className="official-summary-card is-clickable" {...getSummaryActionProps('cash_out', 'Cash Out Details')}>
                                        <span>Cash Out</span><strong>{formatCurrency(cashOut)}</strong>
                                    </div>
                                    <div><span>Expected Cash</span><strong>{formatCurrency(expectedCash)}</strong></div>
                                    <div><span>Actual Cash</span><strong>{formatCurrency(selectedTotal)}</strong></div>
                                    <div className="conclusion-card"><span>Difference</span><strong className={Math.abs(difference) < 0.01 ? 'balanced' : 'variance'}>Rs. {difference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                                </div>
                            </section>

                            <section className="official-report-section official-formula-section">
                                <h4 className="report-subtitle">Official Total Calculation</h4>
                                <div className="official-formula-card">
                                    <div className="official-formula-line">
                                        <span>Full Total</span>
                                        <strong>{formatCurrency(fullReportTotal)}</strong>
                                    </div>
                                    <div className="official-formula-expression">
                                        <div>
                                            <span>Opening Balance</span>
                                            <b>{formatCurrency(openingCash)}</b>
                                        </div>
                                        <em>+</em>
                                        <div>
                                            <span>Cash In</span>
                                            <b>{formatCurrency(cashIn)}</b>
                                        </div>
                                        <em>+</em>
                                        <div>
                                            <span>Cash Sales</span>
                                            <b>{formatCurrency(cashSales)}</b>
                                        </div>
                                        <em>+</em>
                                        <div>
                                            <span>Bank & Card Payments</span>
                                            <b>{formatCurrency(electronicPaymentTotal)}</b>
                                        </div>
                                        <em>-</em>
                                        <div>
                                            <span>Cash Out</span>
                                            <b>{formatCurrency(cashOut)}</b>
                                        </div>
                                    </div>
                                    <p>
                                        Full Total = Opening Balance + Cash In + Cash Sales + Bank & Card Payments - Cash Out
                                    </p>
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

                {detailModal.isOpen && (
                    <div className="report-detail-overlay" onClick={closeFinancialDetail}>
                        <div className="report-detail-modal" onClick={e => e.stopPropagation()}>
                            <div className="report-detail-header">
                                <h3>{detailModal.title}</h3>
                                <button type="button" className="report-detail-close" onClick={closeFinancialDetail}>&times;</button>
                            </div>
                            <div className="report-detail-body">
                                {detailLoading ? (
                                    <div className="report-detail-empty">Loading details...</div>
                                ) : detailRows.length === 0 ? (
                                    <div className="report-detail-empty">No records found for this section.</div>
                                ) : detailModal.type === 'cash_sales' ? (
                                    <div className="report-detail-list">
                                        {detailRows.map(order => (
                                            <div key={order.order_id} className={`report-detail-card ${expandedDetailOrder === order.order_id ? 'expanded' : ''}`}>
                                                <div className="report-detail-card-row" onClick={() => setExpandedDetailOrder(expandedDetailOrder === order.order_id ? null : order.order_id)}>
                                                    <div>
                                                        <strong>Order #{order.order_id}</strong>
                                                        <span>
                                                            {order.closed_at ? new Date(order.closed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                            {order.payment_method ? ` · ${order.payment_method}` : ''}
                                                        </span>
                                                    </div>
                                                    <div className="report-detail-amount-group">
                                                        <b>{formatCurrency(order.cash_amount ?? order.total_amount)}</b>
                                                        <em>{expandedDetailOrder === order.order_id ? '-' : '+'}</em>
                                                    </div>
                                                </div>
                                                {expandedDetailOrder === order.order_id && (
                                                    <div className="report-detail-expanded">
                                                        {Number(order.cash_amount) !== Number(order.total_amount) && (
                                                            <p>Invoice total {formatCurrency(order.total_amount)}; cash received {formatCurrency(order.cash_amount)}.</p>
                                                        )}
                                                        <table className="report-detail-table">
                                                            <thead>
                                                                <tr>
                                                                    <th>Item</th>
                                                                    <th>Qty</th>
                                                                    <th>Price</th>
                                                                    <th>Total</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {(order.order_items || []).map(item => (
                                                                    <tr key={item.order_item_id}>
                                                                        <td>{item.item_name}</td>
                                                                        <td>{item.quantity}</td>
                                                                        <td>{Number(item.item_price || 0).toLocaleString()}</td>
                                                                        <td>{Number(item.subtotal || 0).toLocaleString()}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : detailModal.type === 'cash_in' || detailModal.type === 'cash_out' ? (
                                    <div className="report-detail-table-wrap">
                                        <table className="report-detail-table">
                                            <thead>
                                                <tr>
                                                    <th>Time</th>
                                                    <th>Reason</th>
                                                    <th>Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detailRows.map(movement => (
                                                    <tr key={movement.movement_id}>
                                                        <td>{movement.time ? new Date(movement.time).toLocaleString() : '-'}</td>
                                                        <td>{movement.reason || '-'}</td>
                                                        <td className="report-detail-money">{formatCurrency(movement.amount)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="report-detail-table-wrap">
                                        <table className="report-detail-table">
                                            <thead>
                                                <tr>
                                                    <th>Order ID</th>
                                                    <th>Method</th>
                                                    <th>Closed Time</th>
                                                    <th>Order Total</th>
                                                    <th>Payment Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {detailRows.map((payment, index) => (
                                                    <tr key={`${payment.order_id}-${payment.method}-${index}`}>
                                                        <td>#{payment.order_id}</td>
                                                        <td>{payment.method}</td>
                                                        <td>{payment.closed_at ? new Date(payment.closed_at).toLocaleString() : '-'}</td>
                                                        <td>{formatCurrency(payment.order_total)}</td>
                                                        <td className="report-detail-money">{formatCurrency(payment.amount)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                            <div className="report-detail-footer">
                                <button type="button" className="shift-report-action" onClick={closeFinancialDetail}>Close</button>
                            </div>
                        </div>
                    </div>
                )}

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
                .official-report-grid div, .official-summary-cards div, .official-summary-card { border: 1px solid #E2E8F0; border-radius: 12px; padding: 12px; background: #FFFFFF; }
                .official-summary-card {
                    width: 100%;
                    text-align: left;
                    cursor: default;
                    font-family: inherit;
                    color: inherit;
                    min-height: auto;
                    box-shadow: none;
                    appearance: none;
                    -webkit-appearance: none;
                    transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
                }
                .shift-report-modal .official-summary-card,
                .shift-report-modal .official-summary-card:hover,
                .shift-report-modal .official-summary-card:focus,
                .shift-report-modal .official-summary-card:active {
                    background: #FFFFFF !important;
                    color: #102033 !important;
                    border: 1px solid #E2E8F0 !important;
                    border-radius: 12px !important;
                    padding: 12px !important;
                    min-height: 0 !important;
                    font-family: inherit !important;
                    font-size: inherit !important;
                    font-weight: inherit !important;
                    letter-spacing: 0 !important;
                    text-transform: none !important;
                    box-shadow: none !important;
                    transform: none !important;
                }
                .official-summary-card.is-clickable {
                    cursor: pointer;
                }
                .shift-report-modal .official-summary-card.is-clickable:hover,
                .shift-report-modal .official-summary-card.is-clickable:focus-visible {
                    background: #F8FCFA !important;
                    border-color: rgba(22, 163, 74, 0.42) !important;
                    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.045) !important;
                    outline: none;
                }
                .shift-report-modal .official-summary-card span,
                .shift-report-modal .official-summary-card strong,
                .shift-report-modal .official-summary-card small {
                    text-align: left !important;
                    text-transform: none;
                }
                .official-report-grid span, .official-summary-cards span, .official-summary-card span { display: block; color: #64748B; font-size: 0.68rem; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 500; margin-bottom: 6px; }
                .official-report-grid strong, .official-summary-cards strong, .official-summary-card strong { color: #102033; font-size: 0.86rem; font-weight: 400; line-height: 1.35; overflow-wrap: anywhere; }
                .official-summary-cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
                .official-summary-cards small { display: block; margin-top: 4px; color: #64748B; font-size: 0.72rem; }
                .official-summary-cards .conclusion-card { border-color: rgba(22, 163, 74, 0.24); }
                .official-summary-cards strong.balanced { color: #16A34A; font-weight: 500; }
                .official-summary-cards strong.variance { color: #D4A017; font-weight: 500; }
                .official-formula-section {
                    border-color: rgba(22, 163, 74, 0.24);
                    background: #FBFEFC;
                }
                .official-formula-card {
                    display: grid;
                    gap: 16px;
                }
                .official-formula-line {
                    display: flex;
                    justify-content: space-between;
                    align-items: baseline;
                    gap: 16px;
                    padding: 14px 16px;
                    border: 1px solid #D7E7DC;
                    border-radius: 12px;
                    background: #FFFFFF;
                }
                .official-formula-line span {
                    color: #475569;
                    font-size: 0.72rem;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    font-weight: 600;
                }
                .official-formula-line strong {
                    color: #14532D;
                    font-size: 1.14rem;
                    font-weight: 600;
                    white-space: nowrap;
                }
                .official-formula-expression {
                    display: flex;
                    align-items: stretch;
                    gap: 10px;
                }
                .official-formula-expression span,
                .official-formula-expression b {
                    display: block;
                }
                .official-formula-expression span {
                    color: #64748B;
                    font-size: 0.64rem;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    font-weight: 500;
                }
                .official-formula-expression b {
                    margin-top: 6px;
                    color: #102033;
                    font-size: 0.82rem;
                    font-weight: 500;
                }
                .official-formula-expression > div {
                    flex: 1;
                    min-width: 0;
                    min-height: 78px;
                    padding: 12px;
                    border: 1px solid #E2E8F0;
                    border-radius: 12px;
                    background: #FFFFFF;
                }
                .official-formula-expression em {
                    width: 22px;
                    min-width: 22px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    color: #64748B;
                    font-style: normal;
                    font-weight: 600;
                }
                .official-formula-card p {
                    margin: 0;
                    color: #475569;
                    font-size: 0.84rem;
                    line-height: 1.55;
                    font-weight: 500;
                }
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
                .report-detail-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 2300;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 24px;
                    background: rgba(15, 23, 42, 0.42);
                    backdrop-filter: blur(5px);
                }
                .report-detail-modal {
                    width: min(780px, calc(100vw - 32px));
                    max-height: min(78vh, 760px);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    background: #FFFFFF;
                    color: #132238;
                    border: 1px solid #D7E7DC;
                    border-top: 4px solid var(--primary-green);
                    border-radius: 10px;
                    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
                }
                .report-detail-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 18px;
                    padding: 22px 30px 18px;
                    border-bottom: 1px solid #D7E7DC;
                }
                .report-detail-header h3 {
                    margin: 0;
                    color: #132238;
                    font-size: 1rem;
                    font-weight: 600;
                    line-height: 1.2;
                }
                .report-detail-close {
                    width: 38px;
                    height: 38px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    background: #FFFFFF !important;
                    border: 1px solid #D7E7DC !important;
                    border-radius: 8px;
                    color: #334155 !important;
                    font-size: 1.35rem;
                    cursor: pointer;
                    line-height: 1;
                    box-shadow: none !important;
                    min-height: 0 !important;
                    padding: 0 !important;
                    transform: none !important;
                    transition: all 0.2s ease;
                }
                .report-detail-close:hover,
                .report-detail-close:focus-visible {
                    color: var(--primary-green) !important;
                    background: #F8FCFA !important;
                    border-color: rgba(22, 163, 74, 0.4) !important;
                    box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.07) !important;
                    outline: none;
                }
                .report-detail-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 24px 30px;
                    background: #FFFFFF;
                }
                .report-detail-list {
                    display: grid;
                    gap: 12px;
                }
                .report-detail-card {
                    overflow: hidden;
                    background: #FFFFFF;
                    border: 1px solid #D7E7DC;
                    border-radius: 8px;
                    transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
                }
                .report-detail-card:hover {
                    background: #F8FCFA;
                    border-color: rgba(22, 163, 74, 0.35);
                    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.045);
                }
                .report-detail-card-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 18px;
                    padding: 16px 20px;
                    cursor: pointer;
                }
                .report-detail-card-row strong {
                    display: block;
                    color: #132238;
                    font-size: 0.9rem;
                    font-weight: 600;
                }
                .report-detail-card-row span {
                    display: block;
                    margin-top: 4px;
                    color: #64748B;
                    font-size: 0.76rem;
                    font-weight: 400;
                }
                .report-detail-amount-group {
                    display: inline-flex;
                    align-items: center;
                    gap: 15px;
                    white-space: nowrap;
                }
                .report-detail-amount-group b {
                    color: #132238;
                    font-size: 0.9rem;
                    font-weight: 600;
                }
                .report-detail-amount-group em {
                    width: 28px;
                    height: 28px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--primary-green);
                    background: #F0FDF4;
                    border: 1px solid #BBF7D0;
                    border-radius: 999px;
                    font-style: normal;
                    font-size: 1rem;
                    font-weight: 600;
                }
                .report-detail-expanded {
                    padding: 14px 20px 18px;
                    background: #F8FCFA;
                    border-top: 1px solid #D7E7DC;
                }
                .report-detail-expanded p {
                    margin: 0 0 12px;
                    color: #526782;
                    font-size: 0.8rem;
                    line-height: 1.45;
                }
                .report-detail-table-wrap {
                    width: 100%;
                    overflow-x: auto;
                    border: 1px solid #E5EFE9;
                    border-radius: 8px;
                }
                .report-detail-table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 520px;
                }
                .report-detail-table th {
                    text-align: left;
                    color: #526782;
                    background: #F8FCFA;
                    padding: 12px 14px;
                    font-size: 0.68rem;
                    font-weight: 600;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    border-bottom: 1px solid #E5EFE9;
                }
                .report-detail-table td {
                    padding: 13px 14px;
                    color: #132238;
                    border-bottom: 1px solid #EEF4F0;
                    font-size: 0.84rem;
                    font-weight: 400;
                }
                .report-detail-table tr:last-child td {
                    border-bottom: 0;
                }
                .report-detail-money {
                    color: #0F5132 !important;
                    font-weight: 600 !important;
                    text-align: right;
                    white-space: nowrap;
                }
                .report-detail-empty {
                    min-height: 240px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #64748B;
                    background: #F8FCFA;
                    border: 1px dashed rgba(22, 163, 74, 0.28);
                    border-radius: 8px;
                    text-align: center;
                    font-size: 0.88rem;
                    font-weight: 500;
                }
                .report-detail-footer {
                    display: flex;
                    justify-content: flex-end;
                    padding: 16px 30px 22px;
                    border-top: 1px solid #D7E7DC;
                    background: #FFFFFF;
                }
                .report-detail-footer .shift-report-action {
                    background: #FFFFFF !important;
                    color: #334155 !important;
                    border: 1px solid #D7E7DC !important;
                    box-shadow: none !important;
                }
                .report-detail-footer .shift-report-action:hover,
                .report-detail-footer .shift-report-action:focus-visible {
                    color: var(--primary-green) !important;
                    background: #F8FCFA !important;
                    border-color: rgba(22, 163, 74, 0.42) !important;
                    box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.07) !important;
                    outline: none;
                }
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
                    .official-formula-expression {
                        flex-direction: column;
                    }
                    .official-formula-expression em {
                        width: 100%;
                        min-width: 0;
                        min-height: 18px;
                    }
                }
            `}</style>
        </div>
    );
};

export default ShiftReportModal;
