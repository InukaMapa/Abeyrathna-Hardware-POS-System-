import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import '../../styles/dashboard.css';
import logo from '../../assets/logo.jpeg';
import { API_BASE_URL } from '../../config/api';
import { Banknote, BarChart3, Boxes, LayoutDashboard, RotateCcw, Truck, ClipboardList } from 'lucide-react';

const Sidebar = ({ onNavigate, activePage }) => {
    const { userRole } = useAuth();

    // Admin menu items
    const adminMenuItems = [
        { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN'] },
        { id: 'inventory', name: 'Inventory', icon: Boxes, roles: ['ADMIN'] },
        { id: 'supplier', name: 'Supplier', icon: Truck, roles: ['ADMIN'] },
        { id: 'reports', name: 'Reports', icon: BarChart3, roles: ['ADMIN'] },
        { id: 'supplier-returns', name: 'Returns', icon: RotateCcw, roles: ['ADMIN'] },
        { id: 'cash-management', name: 'Cash Counter', icon: Banknote, roles: ['ADMIN'] },
    ];

    // Cashier menu items
    const cashierMenuItems = [
        { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['CASHIER'] },
        { id: 'orders', name: 'Orders', icon: ClipboardList, roles: ['CASHIER'] },
        { id: 'cash-counter', name: 'Cash Counter', icon: Banknote, roles: ['CASHIER'] },
    ];

    // Determine which menu to show based on role
    let menuItems = [];
    if (userRole === 'ADMIN') {
        menuItems = adminMenuItems;
    } else if (userRole === 'CASHIER') {
        menuItems = cashierMenuItems;
    }
    // Fallback: if no role detected or menuItems empty, default to admin menu (includes inventory and supplier)
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
                        onClick={async (e) => {
                            e.preventDefault();

                            // Logout/Exit guard for Cashiers
                            if (userRole === 'CASHIER' && activePage === 'cash-counter' && item.id !== 'cash-counter') {
                                try {
                                    const token = localStorage.getItem('token');
                                    const response = await axios.get(`${API_BASE_URL}/cash/admin/shifts`, {
                                        headers: { Authorization: `Bearer ${token}` }
                                    });
                                    const data = response.data;
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
                        <span className="nav-icon"><ItemIcon size={18} /></span>
                        {item.name}
                    </a>
                    );
                })}
            </nav>
        </div>
    );
};

export default Sidebar;
