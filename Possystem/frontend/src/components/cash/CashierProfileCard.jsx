import React from 'react';
import { useAuth } from '../../context/AuthContext';

const CashierProfileCard = () => {
    const { user } = useAuth();
    const cashierName = user?.full_name || user?.name || user?.username || 'Cashier';
    const cashierEmail = user?.email || user?.user_email || 'Email not available';
    const cashierRole = user?.role || 'CASHIER';
    const cashierId = user?.id || user?.user_id || user?.sub || 'Session user';

    return (
        <aside className="shift-details-card cashier-profile-card">
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
    );
};

export default CashierProfileCard;
