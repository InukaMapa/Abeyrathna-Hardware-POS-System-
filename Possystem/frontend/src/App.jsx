import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import UnauthorizedPage from './pages/auth/UnauthorizedPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import InventoryPage from './pages/admin/inventory/InventoryPage';
import InventoryDetailPage from './pages/admin/inventory/InventoryDetailPage';
import ProfilePage from './pages/dashboard/ProfilePage';

import OrdersPage from './pages/orders/OrdersPage';
import HardwareOrderDetailPage from './pages/orders/HardwareOrderDetailPage';
import BillOpenPage from './pages/orders/BillOpenPage';
import CreateOrderPage from './pages/orders/CreateOrderPage';
import CashierNewOrderPage from './pages/orders/CashierNewOrderPage';
import CashCounterPage from './pages/dashboard/CashCounterPage';
import CashManagementPage from './pages/admin/CashManagementPage';
import SupplierPage from './pages/admin/supplier/SupplierPage';
import SupplierReturnsPage from './pages/admin/supplier/SupplierReturnsPage';
import ReturnManagementPage from './pages/admin/supplier/ReturnManagementPage';
import ReportsPage from './pages/admin/ReportsPage';
import StaffManagementPage from './pages/admin/StaffManagementPage';
import './styles/dashboard.css';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('login');
  const { isAuthenticated, initializing } = useAuth();

  // State to hold selected inventory item ID for detail view
  const [selectedInventoryId, setSelectedInventoryId] = useState(null);

  // State to hold selected order ID for detail view
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // State to hold selected return ID for management
  const [selectedReturnId, setSelectedReturnId] = useState(null);

  // State to hold order object when editing from details
  const [editOrderData, setEditOrderData] = useState(null);
  const [supplierFocusSection, setSupplierFocusSection] = useState(null);

  // Check authentication on mount and stay on dashboard if authenticated
  useEffect(() => {
    if (!initializing && isAuthenticated) {
      setCurrentPage('dashboard');
    }
  }, [isAuthenticated, initializing]);

  // Don't render anything until auth is initialized
  if (initializing) {
    return null;
  }

  const navigateTo = (page, params = {}) => {
    setCurrentPage(page);
    // Optional: update URL
    if (page === 'login') window.history.pushState({}, '', '/');

    // Handle params if needed
    if (page === 'inventory-detail' && params.id) {
      setSelectedInventoryId(params.id);
    }
    if ((page === 'order-details' || page === 'bill-open') && params.orderId) {
      setSelectedOrderId(params.orderId);
    }
    if (page === 'cashier-new-order') {
      setEditOrderData(params.editOrder || null);
    }
    if (page === 'return-management' && params.id) {
      setSelectedReturnId(params.id);
    }
    if (page === 'supplier') {
      setSupplierFocusSection(params.focusSection || null);
    }
  };

  return (
    <>
      {/* Public Routes */}
      {currentPage === 'login' && <LoginPage onNavigate={navigateTo} />}
      {currentPage === 'forgot-password' && <ForgotPasswordPage onNavigate={navigateTo} />}
      {currentPage === 'verify-email' && <VerifyEmailPage onNavigate={navigateTo} />}
      {currentPage === 'reset-password' && <ResetPasswordPage onNavigate={navigateTo} />}
      {currentPage === 'unauthorized' && <UnauthorizedPage onNavigate={navigateTo} />}
      {currentPage === 'dashboard' && (
        <ProtectedRoute allowedRoles={['ADMIN', 'CASHIER']} onNavigate={navigateTo}>
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
          <ReportsPage onNavigate={navigateTo} />
        </ProtectedRoute>
      )}
      {currentPage === 'cash-management' && (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <CashManagementPage onNavigate={navigateTo} />
        </ProtectedRoute>
      )}
      {currentPage === 'supplier' && (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <SupplierPage onNavigate={navigateTo} focusSection={supplierFocusSection} />
        </ProtectedRoute>
      )}
      {currentPage === 'supplier-returns' && (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <SupplierReturnsPage onNavigate={navigateTo} />
        </ProtectedRoute>
      )}
      {currentPage === 'return-management' && (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <ReturnManagementPage onNavigate={navigateTo} returnId={selectedReturnId} />
        </ProtectedRoute>
      )}
      {currentPage === 'staff-management' && (
        <ProtectedRoute allowedRoles={['ADMIN']} onNavigate={navigateTo}>
          <StaffManagementPage onNavigate={navigateTo} />
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
          <CashierNewOrderPage onNavigate={navigateTo} editOrder={editOrderData} />
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
      {currentPage === 'order-details' && (
        <ProtectedRoute allowedRoles={['ADMIN', 'CASHIER']} onNavigate={navigateTo}>
          <HardwareOrderDetailPage onNavigate={navigateTo} orderId={selectedOrderId} />
        </ProtectedRoute>
      )}
      {currentPage === 'bill-open' && (
        <ProtectedRoute allowedRoles={['ADMIN', 'CASHIER']} onNavigate={navigateTo}>
          <BillOpenPage onNavigate={navigateTo} orderId={selectedOrderId} />
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
