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
    const [activeCashTab, setActiveCashTab] = useState('counter');
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

    if (loading) return <DashboardLayout onNavigate={onNavigate} activePage="cash-counter"><div className="cash-counter-container"><div className="cash-card">Loading...</div></div></DashboardLayout>;

    return (
        <DashboardLayout onNavigate={onNavigate} activePage="cash-counter">
            <div className="cash-counter-container">
                <div className="cash-page-header">
                    <button
                        onClick={() => onNavigate('dashboard')}
                        className="cash-back-button"
                        title="Back to Dashboard"
                        aria-label="Back to Dashboard"
                    >
                        <svg className="cash-back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="cash-page-title-group">
                        <span className="cash-page-kicker">Cashier workspace</span>
                        <h2>Cash Counter</h2>
                        <p>{currentShift ? `Shift ${currentShift.counter_number} is active` : 'Initialize your drawer for the current shift'}</p>
                    </div>
                </div>

                {!currentShift ? (
                    <ShiftStartForm onShiftStarted={handleShiftStarted} />
                ) : (
                    <>
                        <div className="cash-workspace-tabs">
                            <button
                                type="button"
                                className={`inventory-outline-btn cash-workspace-tab ${activeCashTab === 'counter' ? 'active' : ''}`}
                                onClick={() => setActiveCashTab('counter')}
                            >
                                Cash Denomination Counter
                            </button>
                            <button
                                type="button"
                                className={`inventory-outline-btn cash-workspace-tab ${activeCashTab === 'documents' ? 'active' : ''}`}
                                onClick={() => setActiveCashTab('documents')}
                            >
                                Saved Documents
                                <span>{savedCounts.length}</span>
                            </button>
                        </div>

                        {activeCashTab === 'counter' ? (
                            <div className="active-shift-layout">
                                <div className="denomination-column">
                                    <DenominationCounter
                                        key={`${currentShift.shift_id}-${counterKey}`}
                                        onTotalChange={handleDenominationChange}
                                        initialCounts={initialCounts}
                                        shiftId={currentShift.shift_id}
                                    />
                                    <p className="cash-helper-text">
                                        Update the denomination quantities, then save progress to create a cash count document.
                                    </p>
                                </div>

                                <div className="summary-column">
                                    <ShiftSummaryPanel
                                        shiftId={currentShift.shift_id}
                                        onSummaryUpdate={setSummaryData}
                                        key={currentShift.shift_id}
                                    />
                                    <MovementForm
                                        shiftId={currentShift.shift_id}
                                        availableAfter={currentShift.start_time}
                                        onMovementAdded={() => setSummaryData({ ...summaryData })}
                                    />
                                </div>

                                <div className="action-column">
                                    <div className="cash-card reconciliation-card">
                                        <h3 className="cash-section-title">
                                            Actual vs Expected
                                        </h3>

                                        <div className="reconciliation-list">
                                            <div className="reconciliation-row">
                                                <span>Expected Cash</span>
                                                <strong>Rs. {summaryData?.expected_cash?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                            </div>
                                            <div className="reconciliation-row">
                                                <span>Actual Cash</span>
                                                <strong>Rs. {actualTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                            </div>
                                            <div className={`reconciliation-row difference ${Math.abs(actualTotal - (summaryData?.expected_cash || 0)) > 500 ? 'warning' : 'success'}`}>
                                                <span>Difference</span>
                                                <strong>Rs. {(actualTotal - (summaryData?.expected_cash || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                            </div>
                                        </div>

                                        <div className="cash-action-stack">
                                            <button
                                                className="cash-action-button secondary"
                                                onClick={handleSaveCount}
                                                disabled={savingCount}
                                            >
                                                {savingCount ? 'Saving...' : 'Save Progress'}
                                            </button>
                                            <button
                                                className="cash-action-button primary"
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
                                                className={`cash-action-button ${Math.abs(actualTotal - (summaryData?.expected_cash || 0)) < 0.01 && currentShift.status === 'REPORT_SUBMITTED' ? 'success' : 'disabled'}`}
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
                                </div>
                            </div>
                        ) : (
                            <div className="saved-documents-panel">
                                <div className="saved-documents-header">
                                    <div>
                                        <h3>Saved Cash Count Documents</h3>
                                        <p>Review saved cash count summaries for this active shift. Select a document to open the full report view.</p>
                                    </div>
                                    <span>{savedCounts.length} Documents</span>
                                </div>

                                {savedCounts.length === 0 ? (
                                    <div className="saved-documents-empty">
                                        <h4>No saved documents yet</h4>
                                        <p>Save progress from the denomination counter to create your first cash count document.</p>
                                    </div>
                                ) : (
                                    <div className="saved-documents-table-wrap">
                                        <table className="saved-documents-table">
                                            <thead>
                                                <tr>
                                                    <th>Document</th>
                                                    <th>Saved Time</th>
                                                    <th>Total Cash</th>
                                                    <th>Expected Cash</th>
                                                    <th>Difference</th>
                                                    <th>Status</th>
                                                    <th className="text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {savedCounts.map((c, idx) => {
                                                    const expectedCash = Number(c.expected_cash || summaryData?.expected_cash || 0);
                                                    const totalCash = Number(c.total_cash || 0);
                                                    const difference = totalCash - expectedCash;
                                                    return (
                                                        <tr key={c.count_id}>
                                                            <td>
                                                                <div className="saved-table-document">
                                                                    <span>#{String(idx + 1).padStart(2, '0')}</span>
                                                                    <div>
                                                                        <strong>Cash Count Summary</strong>
                                                                        <p>{idx === 0 ? 'Latest saved report' : 'Saved report'}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>{new Date(c.created_at).toLocaleString()}</td>
                                                            <td>Rs. {totalCash.toLocaleString()}</td>
                                                            <td>Rs. {expectedCash.toLocaleString()}</td>
                                                            <td className={Math.abs(difference) < 0.01 ? 'saved-table-positive' : 'saved-table-attention'}>
                                                                Rs. {difference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </td>
                                                            <td>
                                                                <span className={`saved-table-status ${Math.abs(difference) < 0.01 ? 'balanced' : 'variance'}`}>
                                                                    {Math.abs(difference) < 0.01 ? 'Balanced' : 'Variance'}
                                                                </span>
                                                            </td>
                                                            <td className="text-right">
                                                                <button
                                                                    type="button"
                                                                    className="inventory-outline-btn saved-table-view-btn"
                                                                    onClick={() => handleSelectHistoryCount(c)}
                                                                >
                                                                    View
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
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
                <div className="modal-overlay cash-submit-overlay" onClick={() => setShowSubmitModal(false)}>
                    <div className="modal-content cash-submit-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header cash-submit-header">
                            <h2>Select Report to Submit</h2>
                            <button className="close-btn" onClick={() => setShowSubmitModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body cash-submit-body">
                            <p className="cash-submit-note">
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
                                            <td className="selection-total-cell">
                                                Rs. {parseFloat(c.total_cash).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="modal-footer cash-submit-footer">
                            <button className="inventory-outline-btn cash-submit-cancel" onClick={() => setShowSubmitModal(false)}>Cancel</button>
                            <button
                                className="inventory-outline-btn cash-submit-confirm"
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
