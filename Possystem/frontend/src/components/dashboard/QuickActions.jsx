import React from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/dashboard.css';

const QuickActions = ({ onNavigate }) => {
    const { userRole } = useAuth();

    const allActions = [
        { name: 'New Order', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>, roles: ['CASHIER'] },
        { name: 'Table', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v18H3zM3 9h18M9 21V9"></path></svg>, roles: ['CASHIER', 'ADMIN'] },
        { name: 'Reports', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>, roles: ['ADMIN'] },
        { name: 'Event & Booking', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>, roles: ['CASHIER', 'ADMIN'] },
        { name: 'Cash Counter', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>, roles: ['CASHIER', 'ADMIN'] },
        { name: 'Supplier', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>, roles: ['ADMIN'] },
    ];

    // Filter actions by role
    const actions = allActions.filter(action => action.roles.includes(userRole));

    return (
        <div className="quick-actions">
            <div className="section-title">Quick Actions</div>
            <div className="quick-actions-grid">
                {actions.map((action, index) => (
                    <div
                        key={index}
                        className="action-card"
                        onClick={() => {
                            if (action.name === 'New Order') onNavigate('create-order');
                            else if (action.name === 'Table') onNavigate('table-live-view');
                            else if (action.name === 'Cash Counter') {
                                // Specific logic for Cash Counter based on role
                                if (userRole === 'ADMIN') onNavigate('cash-management');
                                else onNavigate('cash-counter');
                            }
                            else if (action.name === 'Reports') onNavigate('reports');
                            else if (action.name === 'Event & Booking') onNavigate('event-management');
                            else if (action.name === 'Supplier') onNavigate('supplier');
                        }}
                    >
                        <div className="action-icon">{action.icon}</div>
                        <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{action.name}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default QuickActions;
