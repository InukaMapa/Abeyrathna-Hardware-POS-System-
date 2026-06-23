import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';
import { X } from 'lucide-react';

const AddMovementModal = ({ isOpen, onClose, shiftId, type, onMovementAdded }) => {
    const [formData, setFormData] = useState({
        amount: '',
        reason: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [activeShift, setActiveShift] = useState(null);
    const [loadingShift, setLoadingShift] = useState(false);
    const [shiftError, setShiftError] = useState(null);

    const [payoutRequests, setPayoutRequests] = useState([]);
    const [refundBatches, setRefundBatches] = useState([]);
    const [selectedPayoutId, setSelectedPayoutId] = useState('');
    const [selectedRefundId, setSelectedRefundId] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchActiveShiftAndDetails();
            setFormData({ amount: '', reason: '' });
            setSelectedPayoutId('');
            setSelectedRefundId('');
        }
    }, [isOpen, shiftId, type]);

    const extractMovementRefs = (movements) => new Set(
        movements
            .map(movement => String(movement.reason || '').match(/\b(PAY-\d+|RFB-\d+)\b/i)?.[1]?.toUpperCase())
            .filter(Boolean)
    );

    const fetchUsedMovementRefs = async (activeShiftId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/cash/shift-movements/${activeShiftId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            return Array.isArray(data) ? extractMovementRefs(data) : new Set();
        } catch (err) {
            console.error('Failed to fetch shift movements:', err);
            return new Set();
        }
    };

    const fetchRefunds = async (activeShiftId, activeStartTime, usedRefs) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/inventory/refund-batches`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (Array.isArray(data)) {
                const onlyPending = (items) => items.filter(item => String(item.status || 'PENDING').toUpperCase() === 'PENDING');
                const isAfterAvailableTime = (item) => {
                    if (!activeStartTime) return true;
                    const itemTime = item.authorized_at || item.created_at || item.requested_at || item.received_at;
                    if (!itemTime) return false;
                    return new Date(itemTime).getTime() >= new Date(activeStartTime).getTime();
                };
                setRefundBatches(
                    onlyPending(data)
                        .filter(isAfterAvailableTime)
                        .filter(r => !usedRefs.has(String(r.batch_number || '').toUpperCase()))
                );
            }
        } catch (err) {
            console.error('Failed to fetch refunds:', err);
        }
    };

    const fetchPayouts = async (activeShiftId, activeStartTime, usedRefs) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/inventory/payout-requests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (Array.isArray(data)) {
                const onlyPending = (items) => items.filter(item => String(item.status || 'PENDING').toUpperCase() === 'PENDING');
                const isAfterAvailableTime = (item) => {
                    if (!activeStartTime) return true;
                    const itemTime = item.authorized_at || item.created_at || item.requested_at || item.received_at;
                    if (!itemTime) return false;
                    return new Date(itemTime).getTime() >= new Date(activeStartTime).getTime();
                };
                setPayoutRequests(
                    onlyPending(data)
                        .filter(isAfterAvailableTime)
                        .filter(p => !usedRefs.has(String(p.payout_number || '').toUpperCase()))
                );
            }
        } catch (err) {
            console.error('Failed to fetch payouts:', err);
        }
    };

    const fetchActiveShiftAndDetails = async () => {
        setLoadingShift(true);
        setShiftError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/cash/admin/shifts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            const shifts = Array.isArray(data) ? data : [];
            
            // Find active shift
            let active = null;
            if (shiftId) {
                active = shifts.find(s => String(s.shift_id) === String(shiftId));
            } else {
                active = shifts.find(s => ['OPEN', 'REPORT_SUBMITTED'].includes(s.status));
            }

            if (!active) {
                throw new Error('No active cash shift found. Please start a shift first.');
            }

            setActiveShift(active);

            // Now fetch details (refund batches/supplier payouts)
            const activeShiftId = active.shift_id;
            const activeStartTime = active.start_time;

            const usedRefs = await fetchUsedMovementRefs(activeShiftId);

            if (type === 'cash_in') {
                await fetchRefunds(activeShiftId, activeStartTime, usedRefs);
            } else {
                await fetchPayouts(activeShiftId, activeStartTime, usedRefs);
            }
        } catch (err) {
            setShiftError(err.message);
        } finally {
            setLoadingShift(false);
        }
    };

    if (!isOpen) return null;

    const title = type === 'cash_in' ? 'Record Cash In' : 'Record Cash Out';
    const buttonLabel = type === 'cash_in' ? 'Record Cash In' : 'Record Cash Out';

    const handlePayoutSelect = (e) => {
        const payoutId = e.target.value;
        setSelectedPayoutId(payoutId);

        if (payoutId) {
            const payout = payoutRequests.find(p => p.id === parseInt(payoutId));
            if (payout) {
                setFormData({
                    amount: payout.amount,
                    reason: `Supplier Payout: ${payout.suppliers?.supplier_name} (Ref: ${payout.payout_number})`
                });
            }
        } else {
            setFormData({ amount: '', reason: '' });
        }
    };

    const handleRefundSelect = (e) => {
        const refundId = e.target.value;
        setSelectedRefundId(refundId);

        if (refundId) {
            const refund = refundBatches.find(r => r.id === parseInt(refundId));
            if (refund) {
                setFormData({
                    amount: refund.amount,
                    reason: `Supplier Refund (Cash In): ${refund.suppliers?.supplier_name} (Ref: ${refund.batch_number})`
                });
            }
        } else {
            setFormData({ amount: '', reason: '' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const currentShiftId = activeShift?.shift_id;
        if (!currentShiftId) {
            setError('No active shift ID available.');
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');

            // 1. Add standard movement
            const response = await fetch(`${API_BASE_URL}/cash/add-movement`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    type,
                    amount: formData.amount,
                    reason: formData.reason,
                    shift_id: currentShiftId
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to record movement');

            // 2. If it was a payout, mark the payout as completed
            if (type === 'cash_out' && selectedPayoutId) {
                const completeResponse = await fetch(`${API_BASE_URL}/inventory/payout-requests/${selectedPayoutId}/complete`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const completeData = await completeResponse.json().catch(() => ({}));
                if (!completeResponse.ok) throw new Error(completeData.message || 'Failed to complete payout batch');
            }

            // 3. If it was a refund, mark the refund batch as received
            if (type === 'cash_in' && selectedRefundId) {
                const completeResponse = await fetch(`${API_BASE_URL}/inventory/refund-batches/${selectedRefundId}/complete`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const completeData = await completeResponse.json().catch(() => ({}));
                if (!completeResponse.ok) throw new Error(completeData.message || 'Failed to complete refund batch');
            }

            // Dispatch global event to sync active components
            window.dispatchEvent(new CustomEvent('cash-movement-added', { detail: data.movement }));

            if (onMovementAdded) onMovementAdded(data.movement);
            setFormData({ amount: '', reason: '' });
            setSelectedPayoutId('');
            setSelectedRefundId('');
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 12000,
            padding: '24px'
        }} onClick={onClose}>
            <div className="modal-content" style={{
                background: '#ffffff',
                borderRadius: '18px',
                border: '1px solid var(--border-color)',
                borderTop: `4px solid ${type === 'cash_in' ? 'var(--primary-green)' : 'var(--accent-color)'}`,
                boxShadow: '0 28px 80px rgba(15, 23, 42, 0.22)',
                width: 'min(420px, calc(100vw - 32px))',
                maxHeight: 'calc(100dvh - 48px)',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column'
            }} onClick={e => e.stopPropagation()}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '22px 24px',
                    borderBottom: '1px solid var(--border-color)'
                }}>
                    <h2 style={{
                        margin: 0,
                        fontSize: '1.15rem',
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        textTransform: 'uppercase'
                    }}>{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="close-btn"
                        style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            background: '#ffffff',
                            color: '#000000',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.18s ease'
                        }}
                    >
                        <X size={18} color="#000000" />
                    </button>
                </div>

                {loadingShift ? (
                    <div style={{ padding: '36px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Checking active shift...
                    </div>
                ) : shiftError ? (
                    <div style={{ padding: '28px 24px', textAlign: 'center' }}>
                        <div style={{ color: '#ef4444', marginBottom: '20px', fontWeight: '500', fontSize: '0.9rem', lineHeight: '1.5' }}>
                            {shiftError}
                        </div>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '1.5px solid var(--border-color)',
                                borderRadius: '20px',
                                background: '#fff',
                                color: 'var(--text-primary)',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '0.88rem'
                            }}
                        >
                            Close
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
                        {type === 'cash_in' && (
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '0.72rem',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    color: 'var(--text-secondary)',
                                    letterSpacing: '0.05em'
                                }}>
                                    Authorized Refund Batches (Optional)
                                </label>
                                <select
                                    value={selectedRefundId}
                                    onChange={handleRefundSelect}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: '1.5px solid var(--border-color)',
                                        background: '#fff',
                                        color: 'var(--text-primary)',
                                        outline: 'none',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    <option value="">-- General Cash In --</option>
                                    {refundBatches.map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.batch_number} - {r.suppliers?.supplier_name} (Rs. {parseFloat(r.amount).toLocaleString()})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {type === 'cash_out' && (
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '0.72rem',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    color: 'var(--text-secondary)',
                                    letterSpacing: '0.05em'
                                }}>
                                    Authorized Supplier Payouts (Optional)
                                </label>
                                <select
                                    value={selectedPayoutId}
                                    onChange={handlePayoutSelect}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: '1.5px solid var(--border-color)',
                                        background: '#fff',
                                        color: 'var(--text-primary)',
                                        outline: 'none',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    <option value="">-- General Expense --</option>
                                    {payoutRequests.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.payout_number} - {p.suppliers?.supplier_name} (Rs. {parseFloat(p.amount).toLocaleString()})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '0.72rem',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                color: 'var(--text-secondary)',
                                letterSpacing: '0.05em'
                            }}>
                                Amount (LKR)
                            </label>
                            <input
                                type="number"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: '1.5px solid var(--border-color)',
                                    background: '#fff',
                                    color: 'var(--text-primary)',
                                    outline: 'none',
                                    fontSize: '0.9rem'
                                }}
                                placeholder="0.00"
                                required
                                min="0.01"
                                step="0.01"
                                readOnly={!!selectedPayoutId || !!selectedRefundId}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '24px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '0.72rem',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                color: 'var(--text-secondary)',
                                letterSpacing: '0.05em'
                            }}>
                                Reason / Description
                            </label>
                            <input
                                type="text"
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: '1.5px solid var(--border-color)',
                                    background: '#fff',
                                    color: 'var(--text-primary)',
                                    outline: 'none',
                                    fontSize: '0.9rem'
                                }}
                                placeholder="e.g. Bought milk, Petty cash"
                                required
                            />
                        </div>

                        {error && (
                            <div style={{
                                color: '#ef4444',
                                fontSize: '0.82rem',
                                marginBottom: '16px',
                                fontWeight: '500'
                            }}>
                                {error}
                            </div>
                        )}

                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            marginTop: '24px'
                        }}>
                            <button
                                type="button"
                                onClick={onClose}
                                className="movement-cancel-btn"
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`movement-btn ${type === 'cash_in' ? 'btn-in' : 'btn-out'}`}
                                style={{
                                    flex: 1,
                                    opacity: loading ? 0.6 : 1
                                }}
                            >
                                {loading ? 'Recording...' : buttonLabel}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default AddMovementModal;
