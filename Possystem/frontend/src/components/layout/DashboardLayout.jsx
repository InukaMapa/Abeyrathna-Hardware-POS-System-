import React from 'react';
import Sidebar from '../dashboard/Sidebar';
import TopBar from '../dashboard/TopBar';
import '../../styles/dashboard.css';

const DashboardLayout = ({ children, onNavigate, activePage = 'dashboard' }) => {
    return (
        <div className="dashboard-layout">
            <Sidebar onNavigate={onNavigate} activePage={activePage} />
            <div className="main-content">
                <TopBar onNavigate={onNavigate} />
                <main className="dashboard-page">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
