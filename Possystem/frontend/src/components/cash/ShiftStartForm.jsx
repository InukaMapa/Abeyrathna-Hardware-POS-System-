import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

const ShiftStartForm = ({ onShiftStarted }) => {
    const { user } = useAuth();
    const cashierName = user?.full_name || user?.name || user?.username || 'Cashier';
    const cashierEmail = user?.email || user?.user_email || 'Email not available';
    const cashierRole = user?.role || 'CASHIER';
    const cashierId = user?.id || user?.user_id || user?.sub || 'Session user';
    const [formData, setFormData] = useState({
        cashier_name: cashierName,
        counter_number: '1',
        opening_cash: '0'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Sync cashier name if user state loads later
    React.useEffect(() => {
        if (cashierName && formData.cashier_name !== cashierName) {
            setFormData(prev => ({ ...prev, cashier_name: cashierName }));
        }
    }, [cashierName, formData.cashier_name]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/cash/start-shift`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Failed to start shift');

            onShiftStarted(data.shift);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="shift-start-shell">
            <aside className="shift-details-card">
                <div className="shift-details-header">
                    <div className="shift-avatar">
                        {cashierName.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                        <span>Cashier profile</span>
                        <h2>{cashierName}</h2>
                        <p>{cashierRole}</p>
                    </div>
                </div>

                <div className="shift-detail-list">
                    <div className="shift-detail-row">
                        <span>Name</span>
                        <strong>{cashierName}</strong>
                    </div>
                    <div className="shift-detail-row">
                        <span>Email</span>
                        <strong>{cashierEmail}</strong>
                    </div>
                    <div className="shift-detail-row">
                        <span>Role</span>
                        <strong>{cashierRole}</strong>
                    </div>
                    <div className="shift-detail-row">
                        <span>User ID</span>
                        <strong>{cashierId}</strong>
                    </div>
                    <div className="shift-detail-row">
                        <span>Branch</span>
                        <strong>Main Branch</strong>
                    </div>
                </div>
            </aside>

            <section className="shift-start-card">
                <div className="shift-start-header">
                    <div className="shift-start-icon">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <span>Opening cash balance</span>
                        <h2>Initialize Shift</h2>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="shift-start-form">
                    <input type="hidden" name="cashier_name" value={formData.cashier_name} />
                    <div className="shift-start-grid">
                        <div className="shift-field">
                            <label>
                                Counter
                            </label>
                            <select
                                value={formData.counter_number}
                                onChange={(e) => setFormData({ ...formData, counter_number: e.target.value })}
                                className="shift-input"
                            >
                                <option value="1">C-01</option>
                                <option value="2">C-02</option>
                                <option value="3">C-03</option>
                            </select>
                        </div>

                        <div className="shift-field">
                            <label>
                                Time
                            </label>
                            <div className="shift-input is-readonly shift-time">
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>

                    <div className="shift-field">
                        <label>
                            Opening Balance (Rs.)
                        </label>
                        <div className="shift-money-wrap">
                            <span>Rs.</span>
                            <input
                                type="number"
                                step="0.01"
                                required
                                min="0"
                                value={formData.opening_cash}
                                onChange={(e) => setFormData({ ...formData, opening_cash: e.target.value })}
                                className="shift-input money"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="shift-error">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="shift-start-button"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Starting...
                            </span>
                        ) : (
                            'Start New Shift'
                        )}
                    </button>
                </form>
            </section>
        </div>
    );
};

export default ShiftStartForm;
