import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { API_BASE_URL } from '../../config/api';
import { fetchInventoryItems } from '../../services/menuService';
import { fetchOrderById } from '../../services/orderService';
import '../../styles/dashboard.css';

const HardwareOrderDetailPage = ({ orderId, onNavigate }) => {
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [order, setOrder] = useState(null);
    const [inventoryItems, setInventoryItems] = useState([]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [orderData, itemsData] = await Promise.all([
                fetchOrderById(orderId),
                fetchInventoryItems()
            ]);
            setOrder(orderData);
            setInventoryItems(itemsData);
        } catch (err) {
            console.error('Failed to load order details', err);
            alert('Failed to load order details');
            onNavigate('orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!orderId) {
            onNavigate('orders');
            return;
        }
        loadData();
    }, [orderId]);

    const handleStatusChange = async (newStatus) => {
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/orders/${order.order_id}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                if (newStatus === 'PAID') {
                    onNavigate('orders');
                } else {
                    await loadData();
                }
            } else {
                alert('Failed to update order status');
            }
        } catch (error) {
            alert('Error updating order status');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelOrder = async () => {
        if (!window.confirm('Are you absolutely sure you want to cancel and delete this order?')) return;
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/orders/${order.order_id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                alert('Order cancelled completely.');
                onNavigate('orders');
            } else {
                alert('Failed to cancel order.');
            }
        } catch (err) {
            alert('Error cancelling order');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemoveItem = async (orderItemId) => {
        if (!window.confirm('Remove this item from the order?')) return;
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/orders/items/${orderItemId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                await loadData();
            } else {
                alert('Failed to remove item.');
            }
        } catch (err) {
            alert('Error removing item.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddItem = async () => {
        if (!selectedItemId) return alert('Please select an item');
        if (addQuantity <= 0) return alert('Quantity must be at least 1');

        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/orders/${order.order_id}/items`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    menu_item_id: selectedItemId,
                    quantity: addQuantity,
                    variants: []
                })
            });
            if (response.ok) {
                await loadData();
                setSelectedItemId('');
                setAddQuantity(1);
            } else {
                alert('Failed to add item.');
            }
        } catch (err) {
            alert('Error adding item.');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout onNavigate={onNavigate} activePage="orders">
                <div className="flex items-center justify-center min-h-screen bg-[#121212]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!order) return null;

    const isClosed = order.status === 'PAID' || order.status === 'CLOSED';

    return (
        <DashboardLayout onNavigate={onNavigate} activePage="orders">
            <div className="p-6 bg-[#121212] min-h-screen text-white font-sans">

                {/* Header Back Button & Title */}
                <div className="max-w-5xl mx-auto flex items-center justify-between bg-[#1E1E1E] p-6 rounded-2xl border border-[#333333] shadow-xl mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => onNavigate('orders')}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-all"
                            title="Back to Orders"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight m-0">Order #{order.order_id}</h2>
                            <p className="text-xs text-gray-500 font-medium mt-1 uppercase tracking-widest">{new Date(order.created_at).toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-sm font-black text-white px-4 py-2 bg-[#0F2D18] border border-[#1A4225] rounded-xl uppercase tracking-widest shadow-inner">{order.status}</span>
                    </div>
                </div>

                <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column (Items) */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Order Items */}
                        <div className="bg-[#1E1E1E] border border-[#333] rounded-2xl shadow-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-[#333] bg-[#252525]">
                                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest">Order Items</h3>
                            </div>

                            <div className="divide-y divide-[#333]">
                                {order.order_items?.map(item => {
                                    const invItem = inventoryItems.find(i => i.id === item.item_id);
                                    let imageSrc = invItem?.image ? `${API_BASE_URL.replace('/api', '')}/uploads/inventory/${invItem.image}` : null;
                                    if (invItem?.image && (invItem.image.startsWith('http') || invItem.image.startsWith('https'))) {
                                        imageSrc = invItem.image;
                                    }

                                    return (
                                        <div key={item.order_item_id} className="p-6 hover:bg-white/5 transition-colors flex justify-between items-center group">
                                            <div className="flex items-center gap-4 flex-1">
                                                {/* Item Image Display */}
                                                <div className="w-16 h-16 bg-[#161616] border border-[#333] rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
                                                    {imageSrc ? (
                                                        <img src={imageSrc} alt={item.item_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-base mb-1">{item.item_name}</p>
                                                    <p className="text-sm font-medium text-gray-400">
                                                        Rs. {parseFloat(item.item_price).toFixed(2)}  <span className="px-2 text-gray-600">x</span>  <span className="text-white font-bold">{item.quantity}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-6">
                                                <p className="font-bold text-white text-lg tabular-nums">
                                                    Rs. {parseFloat(item.subtotal).toFixed(2)}
                                                </p>
                                                {!isClosed && (
                                                    <button
                                                        onClick={() => handleRemoveItem(item.order_item_id)}
                                                        disabled={actionLoading}
                                                        className="p-3 bg-red-600/10 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                                                        title="Remove Item"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                {(!order.order_items || order.order_items.length === 0) && (
                                    <div className="p-10 text-center text-gray-500 font-medium uppercase tracking-widest text-sm">
                                        No items in this order
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Add Item Section */}
                        {!isClosed && (
                            <div className="bg-[#1E1E1E] border border-[#333] rounded-2xl p-6 shadow-xl flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-bold text-white uppercase tracking-widest">Need more items?</h4>
                                    <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Open catalog to browse and add.</p>
                                </div>
                                <button
                                    onClick={() => onNavigate('cashier-new-order', { editOrder: order })}
                                    disabled={actionLoading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                >
                                    OPEN CATALOG TO ADD ITEMS
                                </button>
                            </div>
                        )}

                    </div>

                    {/* Right Column (Summary & Actions) */}
                    <div className="space-y-6">

                        {/* Summary Box */}
                        <div className="bg-[#1E1E1E] border border-[#333] rounded-2xl p-6 shadow-xl pb-8">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-[#333] pb-4">Customer Info</h4>
                            <div className="mb-8">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Mobile Contact</p>
                                <p className="text-lg font-medium text-white">{order.customer_phone || <span className="text-gray-600">N/A</span>}</p>
                            </div>

                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-[#333] pb-4">Billing Summary</h4>
                            <div className="flex justify-between items-end mt-4">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Grand Total</span>
                                <span className="text-xl font-bold text-white tracking-widest tabular-nums font-mono">
                                    Rs. {parseFloat(order.total_amount).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        {!isClosed && (
                            <div className="grid grid-cols-1 gap-4">
                                <button
                                    onClick={() => onNavigate('bill-open', { orderId: order.order_id })}
                                    disabled={actionLoading}
                                    className="w-full py-4 bg-[#2FCC71] hover:bg-[#27AE60] text-white font-black uppercase tracking-widest text-sm rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    OPEN BILL
                                </button>
                                <button
                                    onClick={handleCancelOrder}
                                    disabled={actionLoading}
                                    className="w-full py-4 bg-[#E74C3C] hover:bg-[#C0392B] text-white font-black uppercase tracking-widest text-sm rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    CANCEL ORDER
                                </button>
                            </div>
                        )}

                        {isClosed && (
                            <div className="p-4 bg-zinc-800/50 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs rounded-xl border border-zinc-700">
                                This order is paid and closed
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default HardwareOrderDetailPage;
