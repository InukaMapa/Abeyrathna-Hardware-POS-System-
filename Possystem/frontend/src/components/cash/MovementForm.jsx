import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';

const MovementForm = ({ shiftId, onMovementAdded }) => {
    const [formData, setFormData] = useState({
        type: 'cash_in',
        amount: '',
        reason: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [payoutRequests, setPayoutRequests] = useState([]);
    const [refundBatches, setRefundBatches] = useState([]);
    const [selectedPayoutId, setSelectedPayoutId] = useState('');
    const [selectedRefundId, setSelectedRefundId] = useState('');

    useEffect(() => {
        fetchPayouts();
        fetchRefunds();
    }, []);

    const fetchPayouts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/inventory/payout-requests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (Array.isArray(data)) setPayoutRequests(data);
        } catch (err) { console.error('Failed to fetch payouts:', err); }
    };

    const fetchRefunds = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/inventory/refund-batches`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (Array.isArray(data)) setRefundBatches(data);
        } catch (err) { console.error('Failed to fetch refunds:', err); }
    };

    const handlePayoutSelect = (e) => {
        const payoutId = e.target.value;
        setSelectedPayoutId(payoutId);

        if (payoutId) {
            const payout = payoutRequests.find(p => p.id === parseInt(payoutId));
            if (payout) {
                setFormData({
                    ...formData,
                    amount: payout.amount,
                    reason: `Supplier Payout: ${payout.suppliers?.supplier_name} (Ref: ${payout.payout_number})`
                });
            }
        } else {
            setFormData({ ...formData, amount: '', reason: '' });
        }
    };

    const handleRefundSelect = (e) => {
        const refundId = e.target.value;
        setSelectedRefundId(refundId);

        if (refundId) {
            const refund = refundBatches.find(r => r.id === parseInt(refundId));
            if (refund) {
                setFormData({
                    ...formData,
                    amount: refund.amount,
                    reason: `Supplier Refund (Cash In): ${refund.suppliers?.supplier_name} (Ref: ${refund.batch_number})`
                });
            }
        } else {
            setFormData({ ...formData, amount: '', reason: '' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');

            // 1. Add standard movement
            const response = await fetch(`${API_BASE_URL}/cash/add-movement`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ...formData, shift_id: shiftId })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to record movement');

            // 2. If it was a payout, mark the payout as completed
            if (formData.type === 'cash_out' && selectedPayoutId) {
                await fetch(`${API_BASE_URL}/inventory/payout-requests/${selectedPayoutId}/complete`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                fetchPayouts(); // Refresh list
                setSelectedPayoutId('');
            }

            // 3. If it was a refund (cash in), mark the refund batch as received
            if (formData.type === 'cash_in' && selectedRefundId) {
                await fetch(`${API_BASE_URL}/inventory/refund-batches/${selectedRefundId}/complete`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                fetchRefunds(); // Refresh list
                setSelectedRefundId('');
            }

            onMovementAdded(data.movement);
            setFormData({ type: 'cash_in', amount: '', reason: '' });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="cash-card">
            <h3 className="section-title">Record Cash Movement</h3>
            <form onSubmit={handleSubmit} className="standard-form">
                <div className="form-group">
                    <label>Movement Type</label>
                    <select
                        value={formData.type}
                        onChange={(e) => {
                            setFormData({ ...formData, type: e.target.value });
                            setSelectedPayoutId('');
                            setSelectedRefundId('');
                        }}
                        className="form-control"
                    >
                        <option value="cash_in">Cash In (Add to Drawer)</option>
                        <option value="cash_out">Cash Out (Expense/Refund)</option>
                    </select>
                </div>

                {formData.type === 'cash_in' && (
                    <div className="form-group animate-fade-in">
                        <label className="text-green-500 font-bold">Authorized Refund Batches (Optional)</label>
                        <select
                            value={selectedRefundId}
                            onChange={handleRefundSelect}
                            className="form-control border-green-500/50"
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

                {formData.type === 'cash_out' && (
                    <div className="form-group animate-fade-in">
                        <label className="text-yellow-500 font-bold">Authorized Supplier Payouts (Optional)</label>
                        <select
                            value={selectedPayoutId}
                            onChange={handlePayoutSelect}
                            className="form-control border-yellow-500/50"
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

                <div className="form-group">
                    <label>Amount (LKR)</label>
                    <input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="form-control"
                        placeholder="0.00"
                        required
                        min="0.01"
                        step="0.01"
                        readOnly={!!selectedPayoutId || !!selectedRefundId}
                    />
                </div>
                <div className="form-group">
                    <label>Reason / Description</label>
                    <input
                        type="text"
                        value={formData.reason}
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        className="form-control"
                        placeholder="e.g. Bought milk, Petty cash"
                        required
                    />
                </div>
                {error && <div className="error-message text-red-500 text-xs mt-2">{error}</div>}
                <button
                    type="submit"
                    className={`movement-btn ${formData.type === 'cash_in' ? 'btn-in' : 'btn-out'} ${loading ? 'opacity-50' : ''}`}
                    style={{ width: '100%', marginTop: '16px' }}
                    disabled={loading}
                >
                    {loading ? 'Recording...' : `Record ${formData.type === 'cash_in' ? 'Cash In' : 'Cash Out'}`}
                </button>
            </form>
        </div>
    );
};

export default MovementForm;
