import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';
import ShiftOrdersModal from './ShiftOrdersModal';
import AddMovementModal from './AddMovementModal';
import MovementDetailsModal from './MovementDetailsModal';

const ShiftSummaryPanel = ({ shiftId, onSummaryUpdate }) => {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
    const [movementModal, setMovementModal] = useState({ isOpen: false, type: 'cash_in', mode: 'add' }); // mode: 'add' or 'details'

    const fetchSummary = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/cash/summary/${shiftId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch summary');

            const data = await response.json();
            setSummary(data);
            if (onSummaryUpdate) onSummaryUpdate(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (shiftId) fetchSummary();
    }, [shiftId]);

    // Expose refresh function to parent via ref if needed, or just let it refresh on render
    // For now, we'll just use a manual refresh button UI if needed.

    if (loading) return <div className="cash-card">Loading summary...</div>;
    if (error) return <div className="cash-card error">{error}</div>;

    return (
        <div className="cash-card">
            <h3 className="section-title">POS Cash Summary</h3>
            <div className="summary-grid">
                <div className="summary-item">
                    <div className="summary-label">Opening Cash</div>
                    <div className="summary-value">Rs. {summary.opening_cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div
                    className="summary-item"
                    style={{ color: 'var(--success-color)', cursor: 'pointer' }}
                    onClick={() => setIsOrdersModalOpen(true)}
                    title="Click to view detailed sales"
                >
                    <div className="summary-label">
                        + Cash Sales
                        {summary.cash_sales_count !== undefined && (
                            <span style={{ fontSize: '0.8rem', opacity: 0.8, marginLeft: '5px' }}>
                                ({summary.cash_sales_count} orders)
                            </span>
                        )}
                    </div>
                    <div className="summary-value">Rs. {summary.cash_sales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div
                    className="summary-item"
                    style={{ color: 'var(--success-color)' }}
                >
                    <div className="summary-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span
                            onClick={() => setMovementModal({ isOpen: true, type: 'cash_in', mode: 'details' })}
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title="Click for details"
                        >
                            + Cash In
                        </span>
                        <button
                            className="add-inline-btn"
                            onClick={() => setMovementModal({ isOpen: true, type: 'cash_in', mode: 'add' })}
                            title="Add Cash In"
                        >
                            +
                        </button>
                    </div>
                    <div
                        className="summary-value"
                        onClick={() => setMovementModal({ isOpen: true, type: 'cash_in', mode: 'details' })}
                        style={{ cursor: 'pointer' }}
                    >
                        Rs. {summary.cash_in.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
                <div
                    className="summary-item"
                    style={{ color: 'var(--accent-color)' }}
                >
                    <div className="summary-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span
                            onClick={() => setMovementModal({ isOpen: true, type: 'cash_out', mode: 'details' })}
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title="Click for details"
                        >
                            - Cash Out
                        </span>
                        <button
                            className="add-inline-btn out"
                            onClick={() => setMovementModal({ isOpen: true, type: 'cash_out', mode: 'add' })}
                            title="Add Cash Out"
                        >
                            +
                        </button>
                    </div>
                    <div
                        className="summary-value"
                        onClick={() => setMovementModal({ isOpen: true, type: 'cash_out', mode: 'details' })}
                        style={{ cursor: 'pointer' }}
                    >
                        Rs. {summary.cash_out.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
                <div className="summary-item" style={{ border: '2px solid var(--accent-color)', background: 'transparent' }}>
                    <div className="summary-label">Expected Cash</div>
                    <div className="summary-value" style={{ fontWeight: '800' }}>
                        Rs. {summary.expected_cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
            </div>
            <button
                onClick={fetchSummary}
                className="btn btn-secondary no-print"
                style={{ marginTop: '20px', fontSize: '0.8rem' }}
            >
                Refresh Summary
            </button>

            <ShiftOrdersModal
                isOpen={isOrdersModalOpen}
                onClose={() => setIsOrdersModalOpen(false)}
                shiftId={shiftId}
            />

            <AddMovementModal
                isOpen={movementModal.isOpen && movementModal.mode === 'add'}
                onClose={() => setMovementModal({ ...movementModal, isOpen: false })}
                shiftId={shiftId}
                type={movementModal.type}
                onMovementAdded={() => {
                    fetchSummary();
                }}
            />

            <MovementDetailsModal
                isOpen={movementModal.isOpen && movementModal.mode === 'details'}
                onClose={() => setMovementModal({ ...movementModal, isOpen: false })}
                shiftId={shiftId}
                type={movementModal.type}
            />

            <style jsx>{`
            `}</style>
        </div>
    );
};

export default ShiftSummaryPanel;
