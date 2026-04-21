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
import InventoryPage from './pages/admin/inventory/InventoryPage';
import InventoryDetailPage from './pages/admin/inventory/InventoryDetailPage';
import ProfilePage from './pages/dashboard/ProfilePage';

import OrdersPage from './pages/orders/OrdersPage';
import CreateOrderPage from './pages/orders/CreateOrderPage';
import CashierNewOrderPage from './pages/orders/CashierNewOrderPage';
import CashCounterPage from './pages/dashboard/CashCounterPage';
import CashManagementPage from './pages/admin/CashManagementPage';
import SupplierPage from './pages/admin/supplier/SupplierPage';
import './styles/auth.css';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('login');

  // State to hold selected inventory item ID for detail view
  const [selectedInventoryId, setSelectedInventoryId] = useState(null);

  const navigateTo = (page, params = {}) => {
    setCurrentPage(page);
    // Optional: update URL
    if (page === 'login') window.history.pushState({}, '', '/');

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
      {currentPage === 'dashboard' && (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <DashboardPage onNavigate={navigateTo} />
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
      {currentPage === 'supplier' && (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <SupplierPage onNavigate={navigateTo} />
        </ProtectedRoute>
      )}

      {/* CASHIER & ADMIN Routes */}
      {currentPage === 'create-order' && (
        <ProtectedRoute allowedRoles={['CASHIER']} onNavigate={navigateTo}>
          <CreateOrderPage onNavigate={navigateTo} />
        </ProtectedRoute>
      )}
      {currentPage === 'cashier-new-order' && (
        <ProtectedRoute allowedRoles={['CASHIER', 'ADMIN']} onNavigate={navigateTo}>
          <CashierNewOrderPage onNavigate={navigateTo} />
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
