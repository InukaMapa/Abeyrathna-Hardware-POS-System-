import React from 'react';
import '../../styles/dashboard.css';

const KPICard = ({ title, value, subtext, icon: Icon, tone = 'green' }) => {
    return (
        <div className={`kpi-card kpi-card-${tone}`}>
            <div className="kpi-card-top">
                <div>
                    <div className="kpi-label">{title}</div>
                    <div className="kpi-value">{value}</div>
                </div>
                {Icon && (
                    <div className="kpi-icon" aria-hidden="true">
                        <Icon size={20} />
                    </div>
                )}
            </div>
            {subtext && <div className="kpi-subtext">{subtext}</div>}
        </div>
    );
};

export default KPICard;
