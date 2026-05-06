import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { API_BASE_URL } from '../../config/api';
import { fetchOrders } from '../../services/orderService';
import { useAuth } from '../../context/AuthContext';
import '../../styles/dashboard.css'; // Reuse dashboard styles

const OrdersPage = ({ onNavigate }) => {
    const { userRole } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updatingStatusId, setUpdatingStatusId] = useState(null);

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

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            setUpdatingStatusId(orderId);
            const token = localStorage.getItem('token');
            const url = newStatus === 'PAID'
                ? `${API_BASE_URL}/orders/${orderId}/close`
                : `${API_BASE_URL}/orders/${orderId}/status`;

            const method = 'PATCH';
            const body = newStatus === 'PAID' ? {} : { status: newStatus };

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update status');
            }

            // Reload orders to reflect the new state immediately
            await loadOrders();

            // If it was closed/paid, alert success.
            if (newStatus === 'PAID') {
                alert('Order closed and payment received successfully!');
            }
        } catch (err) {
            console.error('Error updating status:', err);
            alert(`Error: ${err.message}`);
        } finally {
            setUpdatingStatusId(null);
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

    const getStatusColor = (status) => {
        switch (status?.toUpperCase()) {
            case 'PLACED': return '#3498db';
            case 'BILL_OPEN': return '#f1c40f';
            case 'PAID':
            case 'CLOSED': return '#95a5a6';
            default: return '#95a5a6';
        }
    };

    return (
        <DashboardLayout onNavigate={onNavigate} activePage="orders">
            <div className="orders-page-container p-6 bg-[#121212] min-h-screen text-white">
                <div className="flex justify-between items-center mb-8 bg-[#1E1E1E] p-6 rounded-2xl border border-[#333333] shadow-xl">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => onNavigate('dashboard')}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-all"
                            title="Back to Dashboard"
                        >
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight m-0">Order Management</h2>
                        </div>
                    </div>

                    {userRole === 'CASHIER' && (
                        <button
                            onClick={() => onNavigate('cashier-new-order')}
                            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-red-600/20 active:scale-95"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create Order
                        </button>
                    )}
                </div>

                {/* Filters Section */}
                <div className="bg-[#1E1E1E] p-6 rounded-2xl border border-[#333333] mb-8 shadow-xl">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Date Range Presets */}
                        <div className="md:col-span-2">
                            <label className="block text-gray-500 text-[10px] font-black uppercase tracking-widest mb-3">Time Period</label>
                            <div className="relative">
                                <select
                                    value={dateRange}
                                    onChange={(e) => setDateRange(e.target.value)}
                                    className="w-full bg-[#252525] text-white text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-lg border border-[#444] outline-none focus:border-red-600 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="today">Today</option>
                                    <option value="yesterday">Yesterday</option>
                                    <option value="week">Last 7 Days</option>
                                    <option value="month">This Month</option>
                                    <option value="all">All History</option>
                                    <option value="custom">Custom</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="block text-gray-500 text-[10px] font-black uppercase tracking-widest mb-3">Order Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full bg-[#252525] text-white text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-lg border border-[#444] outline-none focus:border-red-600 transition-all appearance-none cursor-pointer"
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
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Total Results</p>
                                <p className="text-2xl font-black text-white">{orders.length}</p>
                            </div>
                            <button
                                onClick={() => loadOrders()}
                                className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-red-600/20 active:scale-95"
                            >
                                <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Custom Date Inputs */}
                    {dateRange === 'custom' && (
                        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-[#333]">
                            <div>
                                <label className="block text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">Start Date</label>
                                <input
                                    type="date"
                                    value={customDates.start}
                                    onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })}
                                    className="w-full bg-[#252525] text-white text-xs px-4 py-3 rounded-lg border border-[#444] outline-none focus:border-red-600 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">End Date (Optional)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        value={customDates.end}
                                        onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })}
                                        className="w-full bg-[#252525] text-white text-xs px-4 py-3 rounded-lg border border-[#444] outline-none focus:border-red-600 transition-all"
                                    />
                                    <button
                                        onClick={() => loadOrders()}
                                        className="px-6 bg-[#333] hover:bg-gray-700 text-white font-black uppercase tracking-widest text-[10px] rounded-lg transition-all"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 bg-[#1E1E1E] rounded-2xl border border-[#333333] mb-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
                        <p className="text-gray-500 font-bold uppercase tracking-widest">Fetching filtered orders...</p>
                    </div>
                )}
                {error && (
                    <div className="p-6 bg-red-900/20 border border-red-900/50 rounded-2xl text-red-500 font-bold mb-8 flex items-center gap-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {error}
                    </div>
                )}

                {!loading && !error && (
                    <div className="table-container bg-[#1E1E1E] border border-[#333333] rounded-2xl overflow-hidden shadow-2xl">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="bg-gray-800/50 border-b border-[#333333]">
                                    <th className="p-5 font-bold uppercase tracking-widest text-xs text-gray-400">Order ID</th>
                                    <th className="p-5 font-bold uppercase tracking-widest text-xs text-gray-400">Customer</th>
                                    <th className="p-5 font-bold uppercase tracking-widest text-xs text-gray-400">Items</th>
                                    <th className="p-5 font-bold uppercase tracking-widest text-xs text-gray-400">Total Amount</th>
                                    <th className="p-5 font-bold uppercase tracking-widest text-xs text-gray-400 text-center">Status</th>
                                    <th className="p-5 font-bold uppercase tracking-widest text-xs text-gray-400 text-right">Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#333333]">
                                {orders.map(order => (
                                    <tr
                                        key={order.order_id}
                                        className="hover:bg-white/5 transition-colors group cursor-pointer"
                                        onClick={() => onNavigate('order-details', { orderId: order.order_id })}
                                    >
                                        <td className="p-5 font-bold text-gray-400">#{order.order_id}</td>
                                        <td className="p-5 font-bold text-white">{order.customer_phone || <span className="opacity-20">-</span>}</td>
                                        <td className="p-5">
                                            <div className="flex flex-col gap-1.5">
                                                {order.order_items && order.order_items.map(item => (
                                                    <span key={item.order_item_id} className="text-sm font-medium text-gray-300">
                                                        <span className="text-white bg-[#333333] px-1.5 py-0.5 rounded mr-2 font-bold text-xs">{item.quantity}x</span>
                                                        {item.item_name}
                                                    </span>
                                                ))}
                                                {(!order.order_items || order.order_items.length === 0) && <span className="opacity-30 italic">No items</span>}
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <span className="font-bold text-white text-lg tabular-nums">Rs. {parseFloat(order.total_amount).toFixed(2)}</span>
                                        </td>
                                        <td className="p-5 text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="relative inline-block">
                                                <select
                                                    value={order.status === 'CLOSED' ? 'PAID' : order.status}
                                                    onChange={(e) => handleStatusChange(order.order_id, e.target.value)}
                                                    disabled={updatingStatusId === order.order_id || order.status === 'PAID' || order.status === 'CLOSED'}
                                                    className="appearance-none bg-[#252525] text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border border-[#444] cursor-pointer hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none pr-8"
                                                    style={{ backgroundColor: getStatusColor(order.status) }}
                                                >
                                                    {(order.status === 'PAID' || order.status === 'CLOSED') ? (
                                                        <option value="PAID">CLOSED / PAID</option>
                                                    ) : (
                                                        <>
                                                            <option value="PLACED">PLACED</option>
                                                            <option value="BILL_OPEN">BILL OPEN</option>
                                                            <option value="PAID">CLOSED / PAID</option>
                                                        </>
                                                    )}
                                                </select>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5 text-right font-medium text-gray-500 text-xs tabular-nums">
                                            {formatDate(order.created_at)}
                                        </td>
                                    </tr>
                                ))}
                                {orders.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="p-20 text-center">
                                            <div className="flex flex-col items-center">
                                                <svg className="w-16 h-16 text-gray-800 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                </svg>
                                                <p className="text-gray-600 font-bold uppercase tracking-widest">No orders at the moment</p>
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
