import React from 'react';
import '../../styles/dashboard.css';

const KPICard = ({ title, value, subtext }) => {
    return (
        <div className="kpi-card">
            <div className="kpi-label">{title}</div>
            <div className="kpi-value">{value}</div>
            {subtext && <div style={{ fontSize: '0.8rem', color: '#888' }}>{subtext}</div>}
        </div>
    );
};

export default KPICard;
