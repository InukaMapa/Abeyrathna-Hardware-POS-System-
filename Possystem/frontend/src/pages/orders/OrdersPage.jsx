import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { fetchOrders } from '../../services/orderService';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Briefcase, ChevronDown, Plus, RefreshCcw } from 'lucide-react';
import '../../styles/dashboard.css'; // Reuse dashboard styles

const OrdersPage = ({ onNavigate }) => {
    const { userRole } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter State
    const [dateRange, setDateRange] = useState('today'); // today, yesterday, week, month, all, custom
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [customDates, setCustomDates] = useState({ start: '', end: '' });

    const loadOrders = async () => {
        try {
            setLoading(true);
            const filters = {};

            if (statusFilter !== 'ALL') {
                filters.status = statusFilter;
            }

            const now = new Date();
            let start = new Date();
            let end = new Date();

            if (dateRange === 'today') {
                start.setHours(0, 0, 0, 0);
                filters.startDate = start.toISOString();
            } else if (dateRange === 'yesterday') {
                start.setDate(now.getDate() - 1);
                start.setHours(0, 0, 0, 0);
                end.setDate(now.getDate() - 1);
                end.setHours(23, 59, 59, 999);
                filters.startDate = start.toISOString();
                filters.endDate = end.toISOString();
            } else if (dateRange === 'week') {
                start.setDate(now.getDate() - 7);
                start.setHours(0, 0, 0, 0);
                filters.startDate = start.toISOString();
            } else if (dateRange === 'month') {
                start.setMonth(now.getMonth() - 1);
                start.setHours(0, 0, 0, 0);
                filters.startDate = start.toISOString();
            } else if (dateRange === 'custom' && customDates.start) {
                filters.startDate = new Date(customDates.start).toISOString();
                if (customDates.end) {
                    const endCustom = new Date(customDates.end);
                    endCustom.setHours(23, 59, 59, 999);
                    filters.endDate = endCustom.toISOString();
                }
            }
            // 'all' doesn't add date filters

            const data = await fetchOrders(filters);
            setOrders(data);
            setError(null);
        } catch (err) {
            console.error(err);
            setError('Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
        // Auto-refresh every 30 seconds (increased from 15 to reduce load when history is large)
        const interval = setInterval(() => {
            // Only auto-refresh today's orders
            if (dateRange === 'today') {
                loadOrders();
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [dateRange, statusFilter]);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusLabel = (status) => {
        if (status === 'PAID' || status === 'CLOSED') return 'CLOSED / PAID';
        if (status === 'BILL_OPEN') return 'BILL OPEN';
        return status || 'UNKNOWN';
    };

    return (
        <DashboardLayout onNavigate={onNavigate} activePage="orders">
            <div className="orders-page-container p-8 max-w-[1600px] mx-auto">
                <div className="orders-page-header flex justify-between items-end mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => onNavigate('dashboard')}
                            className="orders-page-icon-btn"
                            title="Back to Dashboard"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="orders-page-title m-0 mb-2">Order Management</h2>
                            <p className="orders-page-subtitle m-0">Review cashier orders, payment status, and order history.</p>
                        </div>
                    </div>

                    {userRole === 'CASHIER' && (
                        <button
                            onClick={() => onNavigate('cashier-new-order')}
                            className="orders-page-action-btn orders-page-primary-btn"
                        >
                            <Plus className="w-5 h-5" />
                            Create Order
                        </button>
                    )}
                </div>

                {/* Filters Section */}
                <div className="orders-filter-card mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Date Range Presets */}
                        <div className="md:col-span-2">
                            <label className="orders-page-label">Time Period</label>
                            <div className="relative">
                                <select
                                    value={dateRange}
                                    onChange={(e) => setDateRange(e.target.value)}
                                    className="orders-page-field appearance-none cursor-pointer"
                                >
                                    <option value="today">Today</option>
                                    <option value="yesterday">Yesterday</option>
                                    <option value="week">Last 7 Days</option>
                                    <option value="month">This Month</option>
                                    <option value="all">All History</option>
                                    <option value="custom">Custom</option>
                                </select>
                                <div className="orders-field-chevron">
                                    <ChevronDown className="w-4 h-4" />
                                </div>
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="orders-page-label">Order Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="orders-page-field appearance-none cursor-pointer"
                            >
                                <option value="ALL">ALL STATUSES</option>
                                <option value="PLACED">PLACED</option>
                                <option value="BILL_OPEN">BILL OPEN</option>
                                <option value="PAID">CLOSED / PAID</option>
                            </select>
                        </div>

                        {/* Refresh & Totals Info */}
                        <div className="flex items-end justify-end gap-3">
                            <div className="text-right mr-4">
                                <p className="orders-page-label mb-1">Total Results</p>
                                <p className="orders-total-count">{orders.length}</p>
                            </div>
                            <button
                                onClick={() => loadOrders()}
                                className="orders-page-action-btn orders-page-primary-btn"
                            >
                                <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Custom Date Inputs */}
                    {dateRange === 'custom' && (
                        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-[#D7E7DC]">
                            <div>
                                <label className="orders-page-label">Start Date</label>
                                <input
                                    type="date"
                                    value={customDates.start}
                                    onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })}
                                    className="orders-page-field"
                                />
                            </div>
                            <div>
                                <label className="orders-page-label">End Date (Optional)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        value={customDates.end}
                                        onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })}
                                        className="orders-page-field"
                                    />
                                    <button
                                        onClick={() => loadOrders()}
                                        className="orders-page-action-btn"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {loading && (
                    <div className="orders-state-card flex flex-col items-center justify-center py-20 mb-8">
                        <div className="orders-spinner mb-4"></div>
                        <p>Fetching filtered orders...</p>
                    </div>
                )}
                {error && (
                    <div className="orders-error-card mb-8 flex items-center gap-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {error}
                    </div>
                )}

                {!loading && !error && (
                    <div className="orders-table-shell table-container overflow-hidden">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr>
                                    <th className="p-5">Order ID</th>
                                    <th className="p-5">Customer</th>
                                    <th className="p-5">Items</th>
                                    <th className="p-5">Total Amount</th>
                                    <th className="p-5 text-center">Status</th>
                                    <th className="p-5 text-right">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(order => (
                                    <tr
                                        key={order.order_id}
                                        className="transition-colors group cursor-pointer"
                                        onClick={() => onNavigate('order-details', { orderId: order.order_id })}
                                    >
                                        <td className="p-5 orders-id-cell">#{order.order_id}</td>
                                        <td className="p-5 orders-main-cell">{order.customer_phone || <span className="opacity-40">-</span>}</td>
                                        <td className="p-5">
                                            <div className="flex flex-col gap-1.5">
                                                {order.order_items && order.order_items.map(item => (
                                                    <span key={item.order_item_id} className="orders-item-line">
                                                        <span className="orders-qty-badge">{item.quantity}x</span>
                                                        {item.item_name}
                                                    </span>
                                                ))}
                                                {(!order.order_items || order.order_items.length === 0) && <span className="opacity-30 italic">No items</span>}
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <span className="orders-amount tabular-nums">Rs. {parseFloat(order.total_amount).toFixed(2)}</span>
                                        </td>
                                        <td className="p-5 text-center">
                                            <span className="orders-status-badge">
                                                {getStatusLabel(order.status)}
                                            </span>
                                        </td>
                                        <td className="p-5 text-right orders-time-cell tabular-nums">
                                            {formatDate(order.created_at)}
                                        </td>
                                    </tr>
                                ))}
                                {orders.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-20 text-center">
                                            <div className="flex flex-col items-center">
                                                <Briefcase className="orders-empty-icon mb-4" />
                                                <p className="orders-empty-text">No orders at the moment</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default OrdersPage;
