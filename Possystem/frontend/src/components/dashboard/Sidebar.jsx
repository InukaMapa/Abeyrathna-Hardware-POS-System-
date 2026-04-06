import React from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/dashboard.css';
import logo from '../../assets/logo.jpeg';

const Sidebar = ({ onNavigate, activePage }) => {
    const { userRole } = useAuth();

    // Admin menu items
    const adminMenuItems = [
        { id: 'dashboard', name: 'Dashboard', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>, roles: ['ADMIN'] },
        { id: 'table-live-view', name: 'Table View (Live)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v18H3zM3 9h18M9 21V9"></path></svg>, roles: ['ADMIN'] },
        { id: 'table-management', name: 'Table Management', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 11.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5V13h1.5a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5H13v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5V16H8.5a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 1 .5-.5H10v-1.5z" /><path d="M3 14s0-2 1-2h12c1 0 1 2 1 2v4c0 1-1 1-1 1H4c-1 0-1-1-1-1v-4z" /><path d="M5 2h10a2 2 0 0 1 2 2v2H3V4a2 2 0 0 1 2-2z" /></svg>, roles: ['ADMIN'] },
        { id: 'menu-management', name: 'Menu', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>, roles: ['ADMIN'] },
        { id: 'inventory', name: 'Inventory', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>, roles: ['ADMIN'] },
        { id: 'supplier', name: 'Supplier', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>, roles: ['ADMIN'] },
        { id: 'reports', name: 'Reports', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>, roles: ['ADMIN'] },
        { id: 'cash-management', name: 'Cash Counter', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>, roles: ['ADMIN'] },
    ];

    // Cashier menu items
    const cashierMenuItems = [
        { id: 'orders', name: 'Orders', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>, roles: ['CASHIER'] },
        { id: 'table-live-view', name: 'Tables (Live)', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h18v18H3zM3 9h18M9 21V9"></path></svg>, roles: ['CASHIER'] },
        { id: 'cash-counter', name: 'Cash Counter', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>, roles: ['CASHIER'] },
    ];

    // Determine which menu to show based on role
    let menuItems = [];
    if (userRole === 'ADMIN') {
        menuItems = adminMenuItems;
    } else if (userRole === 'CASHIER') {
        menuItems = cashierMenuItems;
    }

    return (
        <div className="sidebar">
            <div className="sidebar-header" style={{ flexDirection: 'column', gap: '10px' }}>
                <div className="sidebar-logo">
                    <img src={logo} alt="Abeyrathna Trade Center POS" style={{ maxWidth: '100%', height: 'auto', maxHeight: '80px' }} />
                </div>
                <div style={{ color: '#C9C9C9', fontWeight: 'bold', textAlign: 'center' }}>Abeyrathna Trade Center</div>
                <div style={{ color: '#9CA3AF', fontSize: '12px', textAlign: 'center', marginTop: '-5px' }}>
                    {userRole === 'ADMIN' ? 'Admin Panel' : userRole === 'CASHIER' ? 'Cashier Panel' : ''}
                </div>
            </div>
            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <a
                        key={item.id}
                        href="#"
                        className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                        onClick={async (e) => {
                            e.preventDefault();

                            // Logout/Exit guard for Cashiers
                            if (userRole === 'CASHIER' && activePage === 'cash-counter' && item.id !== 'cash-counter') {
                                try {
                                    const token = localStorage.getItem('token');
                                    const response = await fetch(`${API_BASE_URL}/cash/admin/shifts`, {
                                        headers: { 'Authorization': `Bearer ${token}` }
                                    });
                                    const data = await response.json();
                                    const activeShift = data.find(s => s.status === 'OPEN' || s.status === 'REPORT_SUBMITTED');

                                    if (activeShift) {
                                        alert('❌ You have an active shift. Please "End Shift" in the Cash Counter before navigating away or logging out.');
                                        return;
                                    }
                                } catch (err) {
                                    console.error('Shift check failed', err);
                                }
                            }

                            if (onNavigate) onNavigate(item.id);
                        }}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {item.name}
                    </a>
                ))}
            </nav>
        </div>
    );
};

export default Sidebar;
