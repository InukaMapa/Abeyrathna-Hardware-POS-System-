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
        <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl p-6 shadow-xl relative overflow-hidden mb-6">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-500 mb-6 relative z-10 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-red-600 rounded-full"></span>
                POS Cash Summary
            </h3>
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#121212] border border-[#333333] p-3 rounded-xl flex flex-col justify-center">
                    <div className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Opening Cash</div>
                    <div className="text-sm font-black text-gray-300 truncate whitespace-nowrap">Rs. {summary.opening_cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div
                    className="bg-[#121212] border border-[#333333] hover:border-red-600/50 transition-colors p-3 rounded-xl cursor-pointer group flex flex-col justify-center"
                    onClick={() => setIsOrdersModalOpen(true)}
                    title="Click to view detailed sales"
                >
                    <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:text-red-500 mb-1 transition-colors">
                        + Cash Sales
                        {summary.cash_sales_count !== undefined && (
                            <span className="opacity-70 ml-1">
                                ({summary.cash_sales_count})
                            </span>
                        )}
                    </div>
                    <div className="text-sm font-black text-white truncate whitespace-nowrap">Rs. {summary.cash_sales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div
                    className="bg-[#121212] border border-[#333333] hover:border-red-600/50 transition-colors p-3 rounded-xl flex flex-col justify-center"
                >
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
                        <span
                            onClick={() => setMovementModal({ isOpen: true, type: 'cash_in', mode: 'details' })}
                            className="cursor-pointer hover:text-red-500 transition-colors"
                            title="Click for details"
                        >
                            + Cash In
                        </span>
                        <button
                            className="bg-[#252525] border border-[#444] hover:bg-red-600 hover:border-red-600 hover:text-white px-1.5 py-[1px] rounded text-gray-400 transition-colors"
                            onClick={() => setMovementModal({ isOpen: true, type: 'cash_in', mode: 'add' })}
                            title="Add Cash In"
                        >
                            +
                        </button>
                    </div>
                    <div
                        className="text-sm font-black text-white cursor-pointer hover:text-red-500 transition-colors truncate whitespace-nowrap"
                        onClick={() => setMovementModal({ isOpen: true, type: 'cash_in', mode: 'details' })}
                    >
                        Rs. {summary.cash_in.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
                <div
                    className="bg-[#121212] border border-[#333333] hover:border-red-600/50 transition-colors p-3 rounded-xl flex flex-col justify-center"
                >
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
                        <span
                            onClick={() => setMovementModal({ isOpen: true, type: 'cash_out', mode: 'details' })}
                            className="cursor-pointer hover:text-red-500 transition-colors"
                            title="Click for details"
                        >
                            - Cash Out
                        </span>
                        <button
                            className="bg-[#252525] border border-[#444] hover:bg-red-600 hover:border-red-600 hover:text-white px-1.5 py-[1px] rounded text-gray-400 transition-colors"
                            onClick={() => setMovementModal({ isOpen: true, type: 'cash_out', mode: 'add' })}
                            title="Add Cash Out"
                        >
                            +
                        </button>
                    </div>
                    <div
                        className="text-sm font-black text-white cursor-pointer hover:text-red-500 transition-colors truncate whitespace-nowrap"
                        onClick={() => setMovementModal({ isOpen: true, type: 'cash_out', mode: 'details' })}
                    >
                        Rs. {summary.cash_out.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            <button
                onClick={fetchSummary}
                className="w-full mt-6 py-3 bg-[#252525] hover:bg-[#333333] border border-[#444] text-gray-400 font-bold uppercase tracking-widest text-[10px] rounded-xl transition-all"
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
