import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Banknote, BarChart3, FilePlus2, Truck } from 'lucide-react';
import '../../styles/dashboard.css';

const QuickActions = ({ onNavigate }) => {
    const { userRole } = useAuth();

    const allActions = [
        { name: 'New Order', description: 'Create a customer order', icon: FilePlus2, roles: ['CASHIER'] },
        { name: 'Reports', description: 'Review sales and stock insights', icon: BarChart3, roles: ['ADMIN'] },
        { name: 'Cash Counter', description: 'Manage cash sessions', icon: Banknote, roles: ['CASHIER', 'ADMIN'] },
        { name: 'Supplier', description: 'Open supplier workspace', icon: Truck, roles: ['ADMIN'] },
    ];

    // Filter actions by role
    const actions = allActions.filter(action => action.roles.includes(userRole));

    return (
        <div className="quick-actions">
            <div className="section-title">Quick Actions</div>
            <div className="quick-actions-grid">
                {actions.map((action, index) => {
                    const ActionIcon = action.icon;

                    return (
                        <button
                            type="button"
                            title={action.name}
                            key={index}
                            className="action-card"
                            onClick={() => {
                                if (action.name === 'New Order') onNavigate('create-order');
                                else if (action.name === 'Cash Counter') {
                                    // Specific logic for Cash Counter based on role
                                    if (userRole === 'ADMIN') onNavigate('cash-management');
                                    else onNavigate('cash-counter');
                                }
                                else if (action.name === 'Reports') onNavigate('reports');
                                else if (action.name === 'Supplier') onNavigate('supplier');
                            }}
                        >
                            <span className="action-icon"><ActionIcon size={22} /></span>
                            <span className="action-content">
                                <span className="action-title">{action.name}</span>
                                <span className="action-description">{action.description}</span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default QuickActions;
