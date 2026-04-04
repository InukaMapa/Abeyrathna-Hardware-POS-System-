import React, { useState } from 'react';
import { API_BASE_URL } from '../../config/api';

const AddMovementModal = ({ isOpen, onClose, shiftId, type, onMovementAdded }) => {
    const [formData, setFormData] = useState({
        amount: '',
        reason: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const title = type === 'cash_in' ? 'Add Cash In' : 'Add Cash Out';
    const buttonLabel = type === 'cash_in' ? 'Record Cash In' : 'Record Cash Out';

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
                body: JSON.stringify({
                    ...formData,
                    type,
                    shift_id: shiftId
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to record movement');

            onMovementAdded(data.movement);
            setFormData({ amount: '', reason: '' });
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content add-movement-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label style={{ color: '#888', display: 'block', marginBottom: '8px' }}>Amount (LKR)</label>
                        <input
                            type="number"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            className="form-control"
                            style={{ background: '#222', border: '1px solid #333', color: '#fff', padding: '10px', width: '100%', borderRadius: '4px' }}
                            placeholder="0.00"
                            required
                            min="0.01"
                            step="0.01"
                            autoFocus
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: '15px' }}>
                        <label style={{ color: '#888', display: 'block', marginBottom: '8px' }}>Reason / Description</label>
                        <textarea
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            className="form-control"
                            style={{ background: '#222', border: '1px solid #333', color: '#fff', padding: '10px', width: '100%', borderRadius: '4px', minHeight: '80px', resize: 'vertical' }}
                            placeholder="e.g. Extra change, Supplier payment..."
                            required
                        />
                    </div>
                    {error && <div className="error-message" style={{ color: 'var(--accent-color)', marginBottom: '15px' }}>{error}</div>}

                    <div className="modal-footer" style={{ borderTop: 'none', padding: '0', marginTop: '10px' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            style={{ marginRight: '10px' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={`btn ${type === 'cash_in' ? 'btn-success' : 'btn-primary'}`}
                            disabled={loading}
                            style={{ flex: 1 }}
                        >
                            {loading ? 'Recording...' : buttonLabel}
                        </button>
                    </div>
                </form>
            </div>

            <style jsx>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2100;
                    backdrop-filter: blur(4px);
                }
                .add-movement-modal {
                    width: 90%;
                    max-width: 400px;
                    background: #1a1a1a;
                    border: 1px solid #333;
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                }
                .modal-header {
                    padding: 20px;
                    border-bottom: 1px solid #333;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .modal-header h2 {
                    margin: 0;
                    font-size: 1.1rem;
                    color: #fff;
                }
                .close-btn {
                    background: none;
                    border: none;
                    color: #888;
                    font-size: 1.5rem;
                    cursor: pointer;
                }
                .modal-body {
                    padding: 20px;
                }
                .btn-success {
                    background: var(--success-color);
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: bold;
                }
                .btn-primary {
                    background: var(--accent-color);
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: bold;
                }
            `}</style>
        </div>
    );
};

export default AddMovementModal;
