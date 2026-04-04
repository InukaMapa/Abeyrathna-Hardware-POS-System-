import React from 'react';
import '../../styles/menu.css';

const MenuStats = ({ stats }) => {
    return (
        <div className="menu-stats-grid">
            <div className="stat-card">
                <div className="stat-value">{stats.totalItems}</div>
                <div className="stat-label">Total Items</div>
            </div>
            <div className="stat-card available">
                <div className="stat-value">{stats.active}</div>
                <div className="stat-label">Active Items</div>
            </div>
            <div className="stat-card out-of-stock">
                <div className="stat-value">{stats.inactive}</div>
                <div className="stat-label">Inactive Items</div>
            </div>
            <div className="stat-card best-seller">
                <div className="stat-value">{stats.bestSelling}</div>
                <div className="stat-label">Best Selling Item</div>
            </div>
        </div>
    );
};

export default MenuStats;
