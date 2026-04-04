import { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import UnauthorizedPage from './pages/auth/UnauthorizedPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import MenuManagementPage from './pages/menu/MenuManagementPage';
import InventoryPage from './pages/admin/inventory/InventoryPage';
import InventoryDetailPage from './pages/admin/inventory/InventoryDetailPage';
import ProfilePage from './pages/dashboard/ProfilePage';

import TableManagementPage from './pages/tables/TableManagementPage';
import CashierTableOperationsPage from './pages/tables/CashierTableOperationsPage';
import LiveMenuPage from './pages/live-menu/LiveMenuPage';
import OrdersPage from './pages/orders/OrdersPage';
import CreateOrderPage from './pages/orders/CreateOrderPage';
import CashCounterPage from './pages/dashboard/CashCounterPage';
import CashManagementPage from './pages/admin/CashManagementPage';
import './styles/auth.css';

function AppContent() {
  const [currentPage, setCurrentPage] = useState(() => {
    // Simple routing for Live Menu
    if (window.location.pathname === '/live-menu') return 'live-menu';
    return 'login';
  });

  // State to hold selected inventory item ID for detail view
  const [selectedInventoryId, setSelectedInventoryId] = useState(null);

  const navigateTo = (page, params = {}) => {
    setCurrentPage(page);
    // Optional: update URL
    if (page === 'live-menu') window.history.pushState({}, '', '/live-menu');
    else if (page === 'login') window.history.pushState({}, '', '/');

    // Handle params if needed
    if (page === 'inventory-detail' && params.id) {
      setSelectedInventoryId(params.id);
    }
  };

  return (
    <>
      {/* Public Routes */}
      {currentPage === 'login' && <LoginPage onNavigate={navigateTo} />}
      {currentPage === 'register' && <RegisterPage onNavigate={navigateTo} />}
      {currentPage === 'forgot-password' && <ForgotPasswordPage onNavigate={navigateTo} />}
      {currentPage === 'verify-email' && <VerifyEmailPage onNavigate={navigateTo} />}
      {currentPage === 'reset-password' && <ResetPasswordPage onNavigate={navigateTo} />}
      {currentPage === 'unauthorized' && <UnauthorizedPage onNavigate={navigateTo} />}
      {currentPage === 'live-menu' && <LiveMenuPage />}

      {/* ADMIN Only Routes */}
      {currentPage === 'dashboard' && (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <DashboardPage onNavigate={navigateTo} />
        </ProtectedRoute>
      )}
      {currentPage === 'menu-management' && (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <MenuManagementPage onNavigate={navigateTo} />
        </ProtectedRoute>
      )}
      {currentPage === 'table-management' && (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <TableManagementPage onNavigate={navigateTo} />
        </ProtectedRoute>
      )}
      {currentPage === 'inventory' && (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <InventoryPage onNavigate={navigateTo} />
        </ProtectedRoute>
      )}
      {currentPage === 'inventory-detail' && (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <InventoryDetailPage
            inventoryId={selectedInventoryId}
            onNavigate={navigateTo}
          />
        </ProtectedRoute>
      )}
      {currentPage === 'reports' && (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <div>Reports Page (Coming Soon)</div>
        </ProtectedRoute>
      )}
      {currentPage === 'cash-management' && (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <CashManagementPage onNavigate={navigateTo} />
        </ProtectedRoute>
      )}

      {/* CASHIER & ADMIN Routes */}
      {currentPage === 'table-live-view' && (
        <ProtectedRoute allowedRoles={['CASHIER', 'ADMIN']} onNavigate={navigateTo}>
          <CashierTableOperationsPage onNavigate={navigateTo} />
        </ProtectedRoute>
      )}
      {currentPage === 'create-order' && (
        <ProtectedRoute allowedRoles={['CASHIER']} onNavigate={navigateTo}>
          <CreateOrderPage onNavigate={navigateTo} />
        </ProtectedRoute>
      )}
      {currentPage === 'cash-counter' && (
        <ProtectedRoute allowedRoles={['CASHIER']} onNavigate={navigateTo}>
          <CashCounterPage onNavigate={navigateTo} />
        </ProtectedRoute>
      )}

      {/* Shared Routes (Both ADMIN and CASHIER) */}
      {currentPage === 'profile' && (
        <ProtectedRoute allowedRoles={['ADMIN', 'CASHIER']} onNavigate={navigateTo}>
          <ProfilePage onNavigate={navigateTo} />
        </ProtectedRoute>
      )}
      {currentPage === 'orders' && (
        <ProtectedRoute allowedRoles={['ADMIN', 'CASHIER']} onNavigate={navigateTo}>
          <OrdersPage onNavigate={navigateTo} />
        </ProtectedRoute>
      )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
