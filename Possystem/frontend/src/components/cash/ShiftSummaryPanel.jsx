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
        <div className="cash-card shift-summary-card">
            <h3 className="cash-section-title">
                POS Cash Summary
            </h3>
            <div className="cash-summary-grid">
                <div className="cash-summary-tile">
                    <div className="cash-summary-label">Opening Cash</div>
                    <div className="cash-summary-value">Rs. {summary.opening_cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div
                    className="cash-summary-tile is-clickable"
                    onClick={() => setIsOrdersModalOpen(true)}
                    title="Click to view detailed sales"
                >
                    <div className="cash-summary-label">
                        + Cash Sales
                        {summary.cash_sales_count !== undefined && (
                            <span>
                                ({summary.cash_sales_count})
                            </span>
                        )}
                    </div>
                    <div className="cash-summary-value">Rs. {summary.cash_sales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div
                    className="cash-summary-tile"
                >
                    <div className="cash-summary-label with-action">
                        <span
                            onClick={() => setMovementModal({ isOpen: true, type: 'cash_in', mode: 'details' })}
                            className="cash-summary-link"
                            title="Click for details"
                        >
                            + Cash In
                        </span>
                    </div>
                    <div
                        className="cash-summary-value is-clickable-text"
                        onClick={() => setMovementModal({ isOpen: true, type: 'cash_in', mode: 'details' })}
                    >
                        Rs. {summary.cash_in.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
                <div
                    className="cash-summary-tile"
                >
                    <div className="cash-summary-label with-action">
                        <span
                            onClick={() => setMovementModal({ isOpen: true, type: 'cash_out', mode: 'details' })}
                            className="cash-summary-link"
                            title="Click for details"
                        >
                            - Cash Out
                        </span>
                    </div>
                    <div
                        className="cash-summary-value is-clickable-text"
                        onClick={() => setMovementModal({ isOpen: true, type: 'cash_out', mode: 'details' })}
                    >
                        Rs. {summary.cash_out.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            <button
                onClick={fetchSummary}
                className="cash-action-button secondary compact"
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
        </div>
    );
};

export default ShiftSummaryPanel;
