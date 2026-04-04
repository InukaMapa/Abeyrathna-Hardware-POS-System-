import React, { useState } from 'react';
import { API_BASE_URL } from '../../config/api';

const MovementForm = ({ shiftId, onMovementAdded }) => {
    const [formData, setFormData] = useState({
        type: 'cash_in',
        amount: '',
        reason: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
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
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="form-control"
                    >
                        <option value="cash_in">Cash In (Add to Drawer)</option>
                        <option value="cash_out">Cash Out (Expense/Refund)</option>
                    </select>
                </div>
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
                {error && <div className="error-message">{error}</div>}
                <button
                    type="submit"
                    className={`movement-btn ${formData.type === 'cash_in' ? 'btn-in' : 'btn-out'}`}
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
