import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ShiftStartForm from '../../components/cash/ShiftStartForm';
import DenominationCounter from '../../components/cash/DenominationCounter';
import MovementForm from '../../components/cash/MovementForm';
import ShiftSummaryPanel from '../../components/cash/ShiftSummaryPanel';
import ShiftReportModal from '../../components/cash/ShiftReportModal';
import { API_BASE_URL } from '../../config/api';
import '../../styles/cash.css';

const CashCounterPage = ({ onNavigate }) => {
    const [currentShift, setCurrentShift] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actualTotal, setActualTotal] = useState(0);
    const [denominations, setDenominations] = useState({});
    const [summaryData, setSummaryData] = useState(null);
    const [endingShift, setEndingShift] = useState(false);
    const [savingCount, setSavingCount] = useState(false);
    const [savedCounts, setSavedCounts] = useState([]);
    const [selectedCountForSubmit, setSelectedCountForSubmit] = useState(null);
    const [showSubmitModal, setShowSubmitModal] = useState(false);

    // For historical report pop-up
    const [historyReportCount, setHistoryReportCount] = useState(null);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // For loading data into child
    const [initialCounts, setInitialCounts] = useState({});
    const [counterKey, setCounterKey] = useState(0);

    // For tracking latest values without triggering prop loops
    const liveCounts = React.useRef({});

    useEffect(() => {
        // Find active shift on mount
        const fetchActiveShift = async () => {
            try {
                const token = localStorage.getItem('token');
                // For simplicity, we get all shifts and filter for OPEN one
                const response = await fetch(`${API_BASE_URL}/cash/admin/shifts`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                const active = data.find(s => s.status === 'OPEN');
                if (active) setCurrentShift(active);
            } catch (err) {
                console.error('Failed to fetch active shift', err);
            } finally {
                setLoading(false);
            }
        };

        fetchActiveShift();
    }, []);

    useEffect(() => {
        if (currentShift && currentShift.status === 'OPEN') {
            fetchLatestCount();
            fetchHistory();
        }
    }, [currentShift]);

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/cash/counts/${currentShift.shift_id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setSavedCounts(data);
        } catch (err) {
            console.error('Failed to fetch history', err);
        }
    };

    const fetchLatestCount = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/cash/count/${currentShift.shift_id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data) {
                // Remove count_id, shift_id, created_at to get just denominations
                const { count_id, shift_id, created_at, total_cash, ...counts } = data;
                setInitialCounts(counts);
                setActualTotal(parseFloat(total_cash));
                setCounterKey(prev => prev + 1);
            }
        } catch (err) {
            console.error('Failed to fetch latest count', err);
        }
    };

    const handleShiftStarted = (shift) => {
        setCurrentShift(shift);
    };

    const handleDenominationChange = (total, counts) => {
        setActualTotal(total);
        liveCounts.current = counts;
    };

    const handleSaveCount = async () => {
        setSavingCount(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/cash/count`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    shift_id: currentShift.shift_id,
                    denominations: liveCounts.current,
                    total_cash: actualTotal,
                    expected_cash: summaryData ? summaryData.expected_cash : 0
                })
            });
            if (!response.ok) throw new Error('Failed to save count');
            fetchHistory(); // Refresh history list
        } catch (err) {
            alert('Error saving count: ' + err.message);
        } finally {
            setSavingCount(false);
        }
    };

    const handleSelectHistoryCount = (count) => {
        setHistoryReportCount(count);
        setShowHistoryModal(true);
    };

    const handleOpenSubmitModal = () => {
        if (!summaryData) return;
        if (savedCounts.length === 0) {
            alert('Please save at least one cash count progress before submitting.');
            return;
        }
        // Default to latest
        setSelectedCountForSubmit(savedCounts[0]);
        setShowSubmitModal(true);
    };

    const handleConfirmSubmit = async () => {
        if (!selectedCountForSubmit) return;

        setSavingCount(true); // Re-use saving state for button loading
        try {
            const token = localStorage.getItem('token');

            // Submit report for review using the selected count's total and expected cash
            const response = await fetch(`${API_BASE_URL}/cash/submit-report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    shift_id: currentShift.shift_id,
                    actual_cash: parseFloat(selectedCountForSubmit.total_cash),
                    expected_cash: parseFloat(selectedCountForSubmit.expected_cash || summaryData.expected_cash)
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to submit report');

            setShowSubmitModal(false);
            setCurrentShift(data.shift); // Update local shift state to 'REPORT_SUBMITTED'
            alert('Report submitted to admin for review. You can now end your shift if the cash is balanced.');
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setSavingCount(false);
        }
    };

    const handleEndShift = async () => {
        if (currentShift.status !== 'REPORT_SUBMITTED') {
            alert('Please submit a report to admin before ending your shift.');
            return;
        }

        const difference = actualTotal - (summaryData?.expected_cash || 0);
        if (Math.abs(difference) > 0.01) {
            alert('Shift cannot be ended unless cash is balanced (Difference must be 0).');
            return;
        }

        if (!window.confirm('Are you sure you want to end your shift? You will be logged out after completion.')) {
            return;
        }

        setEndingShift(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/cash/end-shift`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ shift_id: currentShift.shift_id })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to end shift');

            alert('Shift ended successfully! You will now be logged out.');

            // Trigger logout logic (TopBar/AuthContext will handle the actual redirection)
            // But here we can clear shift and redirect
            setCurrentShift(null);
            localStorage.removeItem('token'); // Forces logout
            window.location.reload();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setEndingShift(false);
        }
    };

    if (loading) return <DashboardLayout onNavigate={onNavigate} activePage="cash-counter"><div>Loading...</div></DashboardLayout>;

    return (
        <DashboardLayout onNavigate={onNavigate} activePage="cash-counter">
            <div className="cash-counter-container p-6 bg-[#121212] min-h-screen text-white">
                <div className="flex items-center gap-4 mb-8 bg-[#1E1E1E] p-6 rounded-2xl border border-[#333333] shadow-xl">
                    <button
                        onClick={() => onNavigate('dashboard')}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-all"
                        title="Back to Dashboard"
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tight m-0">Cash Counter Operations</h1>
                        <p className="text-gray-500 text-sm font-bold uppercase tracking-widest mt-1">Shift Reconciliation & Tracking</p>
                    </div>
                </div>

                {!currentShift ? (
                    <ShiftStartForm onShiftStarted={handleShiftStarted} />
                ) : (
                    <div className="active-shift-layout">
                        {/* Column 1: Denomination Counter */}
                        <div className="denomination-column">
                            <DenominationCounter
                                key={`${currentShift.shift_id}-${counterKey}`}
                                onTotalChange={handleDenominationChange}
                                initialCounts={initialCounts}
                            />
                            <p style={{ marginTop: '10px', fontSize: '0.8rem', color: '#666' }}>
                                * Edit counts above and click "Save Progress" to sync latest counts.
                            </p>
                        </div>

                        {/* Column 2: Shift Summary & Movements */}
                        <div className="summary-column">
                            <ShiftSummaryPanel
                                shiftId={currentShift.shift_id}
                                onSummaryUpdate={setSummaryData}
                                key={currentShift.shift_id}
                            />
                            <MovementForm
                                shiftId={currentShift.shift_id}
                                onMovementAdded={() => setSummaryData({ ...summaryData })}
                            />
                        </div>

                        {/* Column 3: Reconciliation & History */}
                        <div className="action-column">
                            <div className="cash-card reconciliation-card bg-[#1E1E1E] border border-[#333333] rounded-2xl p-6 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-500 mb-6 relative z-10 flex items-center gap-2">
                                    <span className="w-1.5 h-4 bg-red-600 rounded-full"></span>
                                    Actual vs Expected
                                </h3>

                                <div className="space-y-3 mb-6 relative z-10">
                                    <div className="flex justify-between items-center py-1.5 border-b border-[#333333]/30">
                                        <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Expected Cash</span>
                                        <strong className="text-gray-300 font-bold text-sm">Rs. {summaryData?.expected_cash?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                    </div>
                                    <div className="flex justify-between items-center py-1.5 border-b border-[#333333]/30">
                                        <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Actual Cash</span>
                                        <strong className="text-gray-300 font-bold text-sm">Rs. {actualTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                    </div>
                                    <div className={`flex justify-between items-center pt-3 ${Math.abs(actualTotal - (summaryData?.expected_cash || 0)) > 500 ? 'text-red-500' : 'text-green-500'}`}>
                                        <span className="font-black uppercase tracking-[0.2em] text-[10px]">Difference</span>
                                        <strong className="text-xl font-black tracking-tight">Rs. {(actualTotal - (summaryData?.expected_cash || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                    </div>
                                </div>

                                {Math.abs(actualTotal - (summaryData?.expected_cash || 0)) > 500 && (
                                    <div className="flex items-center gap-3 p-4 bg-red-600/10 border border-red-600/20 rounded-xl text-red-500 font-bold mb-6 text-sm animate-pulse">
                                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        Warning: Cash difference exceeds LKR 500.00
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-3 relative z-10">
                                    <button
                                        className="w-full py-3 bg-gray-800/50 hover:bg-gray-800 text-gray-500 font-bold uppercase tracking-widest text-[10px] rounded-xl transition-all border border-[#333333] active:scale-95"
                                        onClick={handleSaveCount}
                                        disabled={savingCount}
                                    >
                                        {savingCount ? 'Saving...' : 'Save Progress'}
                                    </button>
                                    <button
                                        className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest text-[10px] rounded-xl transition-all shadow-lg shadow-red-600/10 active:scale-95 disabled:opacity-50"
                                        onClick={handleOpenSubmitModal}
                                        disabled={savingCount || currentShift.status === 'REPORT_SUBMITTED'}
                                    >
                                        {currentShift.status === 'REPORT_SUBMITTED' ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Report Sent
                                            </span>
                                        ) : 'Submit to Admin'}
                                    </button>
                                    <button
                                        className={`w-full py-3.5 font-bold uppercase tracking-widest text-[10px] rounded-xl transition-all active:scale-95 shadow-lg ${Math.abs(actualTotal - (summaryData?.expected_cash || 0)) < 0.01 && currentShift.status === 'REPORT_SUBMITTED' ? 'bg-green-600/20 text-green-500 border border-green-600/30' : 'bg-gray-900/50 border border-[#333333] text-gray-700 cursor-not-allowed'}`}
                                        onClick={handleEndShift}
                                        disabled={endingShift || currentShift.status !== 'REPORT_SUBMITTED' || Math.abs(actualTotal - (summaryData?.expected_cash || 0)) > 0.01}
                                        title={currentShift.status !== 'REPORT_SUBMITTED' ? 'Submit report first' : Math.abs(actualTotal - (summaryData?.expected_cash || 0)) > 0.01 ? 'Cash must be balanced' : 'Click to end shift'}
                                    >
                                        {endingShift ? 'Ending...' : 'End Shift'}
                                    </button>
                                </div>

                                {currentShift.status === 'REPORT_SUBMITTED' && (
                                    <div className="latest-report-info" style={{ marginTop: '20px', padding: '15px', background: 'rgba(76, 175, 80, 0.1)', borderRadius: '8px', border: '1px solid var(--success-color)' }}>
                                        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--success-color)' }}>Latest Sent Report</h4>
                                        <div style={{ fontSize: '0.85rem' }}>
                                            <div>Actual: Rs. {parseFloat(currentShift.actual_cash).toLocaleString()}</div>
                                            <div>Expected: Rs. {parseFloat(currentShift.expected_cash).toLocaleString()}</div>
                                            <div>Difference: Rs. {parseFloat(currentShift.difference).toLocaleString()}</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="cash-card history-sidebar bg-[#1E1E1E] border border-[#333333] rounded-2xl p-6 shadow-xl">
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-500 mb-6 flex items-center gap-2">
                                    <span className="w-1.5 h-4 bg-red-600 rounded-full"></span>
                                    Saved Summaries
                                </h3>
                                <div className="history-list">
                                    {savedCounts.length === 0 ? (
                                        <p style={{ color: '#666', fontSize: '0.9rem', textAlign: 'center', padding: '20px' }}>No saved counts yet.</p>
                                    ) : (
                                        savedCounts.map((c, idx) => (
                                            <div
                                                key={c.count_id}
                                                className={`history-item ${actualTotal === parseFloat(c.total_cash) ? 'active' : ''}`}
                                                onClick={() => handleSelectHistoryCount(c)}
                                            >
                                                <div className="history-time">
                                                    {idx === 0 && <span className="latest-badge">LATEST</span>}
                                                    {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className="history-actions">
                                                    <span className="history-amount">Rs. {parseFloat(c.total_cash).toLocaleString()}</span>
                                                    <button
                                                        className="btn-text"
                                                        style={{ fontSize: '0.7rem', color: 'var(--accent-color)', marginLeft: '10px' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const { count_id, shift_id, created_at, total_cash, ...denomCounts } = c;
                                                            setInitialCounts(denomCounts);
                                                            setActualTotal(parseFloat(total_cash));
                                                            setCounterKey(prev => prev + 1);
                                                        }}
                                                    >
                                                        Edit
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Historical Report Modal */}
            <ShiftReportModal
                isOpen={showHistoryModal}
                onClose={() => setShowHistoryModal(false)}
                shift={currentShift}
                selectedCount={historyReportCount}
            />

            {/* Submit Selection Modal */}
            {showSubmitModal && (
                <div className="modal-overlay" onClick={() => setShowSubmitModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2>Select Report to Submit</h2>
                            <button className="close-btn" onClick={() => setShowSubmitModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: '15px', color: '#888' }}>
                                Please select the latest saved cash count to send to the admin for approval.
                            </p>
                            <table className="selection-table">
                                <thead>
                                    <tr>
                                        <th className="radio-cell"></th>
                                        <th>Time</th>
                                        <th style={{ textAlign: 'right' }}>Total Cash</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {savedCounts.map((c, idx) => (
                                        <tr
                                            key={c.count_id}
                                            className={`selection-row ${selectedCountForSubmit?.count_id === c.count_id ? 'selected' : ''}`}
                                            onClick={() => setSelectedCountForSubmit(c)}
                                        >
                                            <td className="radio-cell">
                                                <input
                                                    type="radio"
                                                    name="submitCount"
                                                    checked={selectedCountForSubmit?.count_id === c.count_id}
                                                    readOnly
                                                />
                                            </td>
                                            <td>
                                                {idx === 0 && <span className="latest-badge" style={{ marginRight: '8px' }}>LATEST</span>}
                                                {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                                Rs. {parseFloat(c.total_cash).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowSubmitModal(false)}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleConfirmSubmit}
                                disabled={endingShift || !selectedCountForSubmit}
                            >
                                {endingShift ? 'Submitting...' : 'Confirm & Submit to Admin'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default CashCounterPage;
