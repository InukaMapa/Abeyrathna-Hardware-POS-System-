import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import KPICard from '../../components/dashboard/KPICard';
import QuickActions from '../../components/dashboard/QuickActions';
import LowInventoryTable from '../../components/dashboard/LowInventoryTable';
import { API_BASE_URL } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { Activity, AlertCircle, PackageCheck, RefreshCw, UsersRound } from 'lucide-react';
import '../../styles/dashboard.css';

const DashboardPage = ({ onNavigate }) => {
    const { user, userRole, logout } = useAuth();
    const [stats, setStats] = useState({
        salesToday: 0,
        mostOrderedDish: { name: 'None', quantity: 0 },
        onlineCashiers: { count: 0, names: [] },
        lowInventory: [],
        outOfStock: []
    });
    const [hasOpenShift, setHasOpenShift] = useState(true);
    const [shiftNoticeLoading, setShiftNoticeLoading] = useState(false);
    const [, setLoading] = useState(true);

    const fetchStats = async () => {
        if (!['ADMIN', 'CASHIER'].includes(userRole)) {
            setLoading(false);
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const endpoint = userRole === 'ADMIN' ? '/admin/stats' : '/cashier/stats';
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setStats(prev => ({
                    ...prev,
                    ...data,
                    lowInventory: data.lowInventory || [],
                    outOfStock: data.outOfStock || []
                }));
            } else if (response.status === 401) {
                logout();
                onNavigate('login');
            }
        } catch (err) {
            console.error('Failed to fetch dashboard stats', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (['ADMIN', 'CASHIER'].includes(userRole)) {
            fetchStats();
            // Refresh every 2 minutes
            const interval = setInterval(fetchStats, 120000);
            return () => clearInterval(interval);
        } else {
            setLoading(false);
        }
    }, [userRole]);

    useEffect(() => {
        if (userRole !== 'CASHIER') return;

        const fetchCashierShift = async () => {
            try {
                setShiftNoticeLoading(true);
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/cash/admin/shifts`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                const shifts = Array.isArray(data) ? data : [];
                const cashierName = user?.full_name || user?.name || user?.username;
                const activeShift = shifts.find(shift => {
                    const isCurrentCashier = !cashierName || shift.cashier_name === cashierName;
                    return isCurrentCashier && ['OPEN', 'REPORT_SUBMITTED'].includes(shift.status);
                });
                setHasOpenShift(Boolean(activeShift));
            } catch (err) {
                console.error('Failed to fetch cashier shift status', err);
                setHasOpenShift(true);
            } finally {
                setShiftNoticeLoading(false);
            }
        };

        fetchCashierShift();
    }, [userRole, user?.full_name, user?.name, user?.username]);

    return (
        <DashboardLayout onNavigate={onNavigate} activePage="dashboard">
            <div className="dashboard-heading">
                <div>
                    <p className="dashboard-eyebrow">Operations overview</p>
                    <h1>Dashboard</h1>
                </div>
                {userRole === 'ADMIN' && (
                    <button className="dashboard-refresh" type="button" title="Refresh dashboard" onClick={fetchStats}>
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                )}
            </div>

            {userRole === 'ADMIN' ? (
                <>
                    <div className="kpi-grid">
                        <KPICard
                            title="Sales Today"
                            value={`Rs. ${parseFloat(stats.salesToday || 0).toLocaleString()}`}
                            subtext="Closed order income today"
                            icon={Activity}
                            tone="green"
                        />
                        <KPICard
                            title="Most Ordered Item"
                            value={stats.mostOrderedDish.name}
                            subtext={`${stats.mostOrderedDish.quantity} sales this month`}
                            icon={PackageCheck}
                            tone="gold"
                        />
                        <KPICard
                            title="Online Cashiers"
                            value={stats.onlineCashiers.count}
                            subtext={stats.onlineCashiers.names.join(', ') || 'No active shifts'}
                            icon={UsersRound}
                            tone="blue"
                        />
                    </div>

                    <QuickActions onNavigate={onNavigate} />

                    <LowInventoryTable items={stats.lowInventory} outOfStockItems={stats.outOfStock} />
                </>
            ) : (
                <>
                    {!shiftNoticeLoading && !hasOpenShift && (
                        <div className="cashier-shift-notice">
                            <div className="cashier-shift-notice-icon">
                                <AlertCircle size={18} />
                            </div>
                            <div>
                                <h3>Shift not started</h3>
                                <p>Please start your shift before creating cashier orders.</p>
                            </div>
                            <button type="button" onClick={() => onNavigate('cash-counter')}>
                                Start Shift
                            </button>
                        </div>
                    )}

                    <div className="cashier-welcome-card">
                        <div>
                            <h2>
                                Welcome Back, {user?.full_name || user?.username}!
                            </h2>
                            <p>
                                Access cashier operations using the quick actions below. Start a shift in the Cash Counter or create a new sales invoice.
                            </p>
                        </div>
                        <div className="cashier-welcome-actions">
                            <button
                                type="button"
                                onClick={() => onNavigate('cashier-new-order')}
                                className="cashier-welcome-btn"
                            >
                                POS Sales
                            </button>
                            <button
                                type="button"
                                onClick={() => onNavigate('cash-counter')}
                                className="cashier-welcome-btn"
                            >
                                Cash Session
                            </button>
                        </div>
                    </div>

                    <QuickActions onNavigate={onNavigate} />

                    <LowInventoryTable items={stats.lowInventory} outOfStockItems={stats.outOfStock} />
                </>
            )}
        </DashboardLayout>
    );
};

export default DashboardPage;
