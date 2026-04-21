import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import KPICard from '../../components/dashboard/KPICard';
import QuickActions from '../../components/dashboard/QuickActions';
import LowInventoryTable from '../../components/dashboard/LowInventoryTable';
import { API_BASE_URL } from '../../config/api';
import '../../styles/dashboard.css';

const DashboardPage = ({ onNavigate }) => {
    const [stats, setStats] = useState({
        salesToday: 0,
        mostOrderedDish: { name: 'None', quantity: 0 },
        onlineCashiers: { count: 0, names: [] },
        lowInventory: []
    });
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
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
        fetchStats();
        // Refresh every 2 minutes
        const interval = setInterval(fetchStats, 120000);
        return () => clearInterval(interval);
    }, []);

    return (
        <DashboardLayout onNavigate={onNavigate} activePage="dashboard">
            <div className="kpi-grid">
                <KPICard
                    title="Sales Today"
                    value={`Rs. ${parseFloat(stats.salesToday || 0).toLocaleString()}`}
                    subtext="Incl. Orders & Cash In"
                />
                <KPICard
                    title="Most Ordered Item"
                    value={stats.mostOrderedDish.name}
                    subtext={`${stats.mostOrderedDish.quantity} sales this month`}
                />
                <KPICard
                    title="Online Cashiers"
                    value={stats.onlineCashiers.count}
                    subtext={stats.onlineCashiers.names.join(', ') || 'No active shifts'}
                />
            </div>

            <QuickActions onNavigate={onNavigate} />

            <LowInventoryTable items={stats.lowInventory} />
        </DashboardLayout>
    );
};

export default DashboardPage;
