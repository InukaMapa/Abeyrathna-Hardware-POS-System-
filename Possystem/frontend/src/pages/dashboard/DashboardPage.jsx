import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import KPICard from '../../components/dashboard/KPICard';
import QuickActions from '../../components/dashboard/QuickActions';
import LowInventoryTable from '../../components/dashboard/LowInventoryTable';
import { API_BASE_URL } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { Activity, PackageCheck, RefreshCw, UsersRound } from 'lucide-react';
import '../../styles/dashboard.css';

const DashboardPage = ({ onNavigate }) => {
    const { user, userRole } = useAuth();
    const [stats, setStats] = useState({
        salesToday: 0,
        mostOrderedDish: { name: 'None', quantity: 0 },
        onlineCashiers: { count: 0, names: [] },
        lowInventory: []
    });
    const [, setLoading] = useState(true);

    const fetchStats = async () => {
        if (userRole !== 'ADMIN') {
            setLoading(false);
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/admin/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) setStats(data);
        } catch (err) {
            console.error('Failed to fetch dashboard stats', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userRole === 'ADMIN') {
            fetchStats();
            // Refresh every 2 minutes
            const interval = setInterval(fetchStats, 120000);
            return () => clearInterval(interval);
        } else {
            setLoading(false);
        }
    }, [userRole]);

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

                    <LowInventoryTable items={stats.lowInventory} />
                </>
            ) : (
                <>
                    <div className="bg-white rounded-2xl border border-[#D7E7DC] p-8 mb-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight m-0 mb-2">
                                Welcome Back, {user?.full_name || user?.username}!
                            </h2>
                            <p className="text-slate-600 font-medium m-0">
                                Access cashier operations using the quick actions below. Start a shift in the Cash Counter or create a new sales invoice.
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={() => onNavigate('create-order')}
                                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95 text-sm"
                            >
                                POS Sales
                            </button>
                            <button
                                onClick={() => onNavigate('cash-counter')}
                                className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-800 text-white font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95 text-sm"
                            >
                                Cash Session
                            </button>
                        </div>
                    </div>

                    <QuickActions onNavigate={onNavigate} />
                </>
            )}
        </DashboardLayout>
    );
};

export default DashboardPage;
