import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/dashboard.css';
import logo from '../../assets/logo.jpeg';
import { API_BASE_URL } from '../../config/api';
import { Banknote, BarChart3, Boxes, LayoutDashboard, RotateCcw, Truck, ClipboardList, Users, Printer, PlusCircle, MinusCircle, CreditCard } from 'lucide-react';
import AddMovementModal from '../cash/AddMovementModal';

const Sidebar = ({ onNavigate, activePage }) => {
    const { userRole } = useAuth();
    const [movementModal, setMovementModal] = useState({ isOpen: false, type: 'cash_in' });

    const handleOpenMovement = (type) => {
        setMovementModal({ isOpen: true, type });
    };

    const adminMenuItems = [
        { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN'] },
        { id: 'supplier', name: 'Supplier', icon: Truck, roles: ['ADMIN'] },
        { id: 'inventory', name: 'Products', icon: Boxes, roles: ['ADMIN'] },
        { id: 'reports', name: 'Reports', icon: BarChart3, roles: ['ADMIN'] },
        { id: 'supplier-returns', name: 'Returns', icon: RotateCcw, roles: ['ADMIN'] },
        { id: 'cash-management', name: 'Cash Counter', icon: Banknote, roles: ['ADMIN'] },
        { id: 'staff-management', name: 'Staff Management', icon: Users, roles: ['ADMIN'] },
        { id: 'printer-settings', name: 'Printer Settings', icon: Printer, roles: ['ADMIN'] },
    ];

    const cashierMenuItems = [
        { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['CASHIER'] },
        { id: 'orders', name: 'Orders', icon: ClipboardList, roles: ['CASHIER'] },
        { id: 'cash-counter', name: 'Cash Counter', icon: Banknote, roles: ['CASHIER'] },
        { id: 'supplier-payments', name: 'Payments', icon: CreditCard, roles: ['CASHIER'] },
        { id: 'printer-settings', name: 'Printer Settings', icon: Printer, roles: ['CASHIER'] },
    ];

    let menuItems = [];
    if (userRole === 'ADMIN') {
        menuItems = adminMenuItems;
    } else if (userRole === 'CASHIER') {
        menuItems = cashierMenuItems;
    }

    if (!userRole || menuItems.length === 0) {
        menuItems = adminMenuItems;
    }

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <img src={logo} alt="Abeyrathna Trade Center POS" />
                </div>
                <div className="sidebar-title">Abeyrathna Trade Center</div>
                <div className="sidebar-subtitle">
                    {userRole === 'ADMIN' ? 'Admin Panel' : userRole === 'CASHIER' ? 'Cashier Panel' : ''}
                </div>
            </div>
            <nav className="sidebar-nav">
                {menuItems.map((item) => {
                    const ItemIcon = item.icon;

                    return (
                        <a
                            key={item.id}
                            href="#"
                            className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                            onClick={(e) => {
                                e.preventDefault();
                                if (onNavigate) onNavigate(item.id);
                            }}
                        >
                            <span className="nav-icon"><ItemIcon size={18} /></span>
                            {item.name}
                        </a>
                    );
                })}
            </nav>

            {userRole === 'CASHIER' && (
                <div className="sidebar-movement-section">
                    <div className="sidebar-movement-title">Cash Movements</div>
                    <button
                        type="button"
                        className="sidebar-movement-btn cash-in"
                        onClick={() => handleOpenMovement('cash_in')}
                    >
                        <PlusCircle size={16} />
                        Record Cash In
                    </button>
                    <button
                        type="button"
                        className="sidebar-movement-btn cash-out"
                        onClick={() => handleOpenMovement('cash_out')}
                    >
                        <MinusCircle size={16} />
                        Record Cash Out
                    </button>
                </div>
            )}

            <AddMovementModal
                isOpen={movementModal.isOpen}
                onClose={() => setMovementModal({ ...movementModal, isOpen: false })}
                type={movementModal.type}
                onMovementAdded={() => {}}
            />
        </div>
    );
};

export default Sidebar;
