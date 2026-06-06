import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';
import { fetchInventoryItems } from '../../services/menuService';

const HardwareOrderDetailModal = ({ isOpen, onClose, order, onRefresh }) => {
    const [loading, setLoading] = useState(false);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [selectedItemId, setSelectedItemId] = useState('');
    const [addQuantity, setAddQuantity] = useState(1);

    useEffect(() => {
        if (isOpen) {
            loadInventory();
        }
    }, [isOpen]);

    const loadInventory = async () => {
        try {
            const items = await fetchInventoryItems();
            setInventoryItems(items);
        } catch (err) {
            console.error('Failed to load inventory for adding items', err);
        }
    };

    if (!isOpen || !order) return null;

    const handleStatusChange = async (newStatus) => {
        setLoading(true);
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
                await onRefresh();
                if (newStatus === 'PAID') {
                    onClose();
                }
            } else {
                alert('Failed to update order status');
            }
        } catch (error) {
            alert('Error updating order status');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelOrder = async () => {
        if (!window.confirm('Are you absolutely sure you want to cancel and delete this order?')) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/orders/${order.order_id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                await onRefresh();
                onClose();
                alert('Order cancelled completely.');
            } else {
                alert('Failed to cancel order.');
            }
        } catch (err) {
            alert('Error cancelling order');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveItem = async (orderItemId) => {
        if (!window.confirm('Remove this item from the order?')) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/orders/items/${orderItemId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                await onRefresh();
            } else {
                alert('Failed to remove item.');
            }
        } catch (err) {
            alert('Error removing item.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async () => {
        if (!selectedItemId) return alert('Please select an item');
        if (addQuantity <= 0) return alert('Quantity must be at least 1');

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/orders/${order.order_id}/items`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    menu_item_id: selectedItemId, // schema references it as menu_item_id in some places
                    quantity: addQuantity,
                    variants: []
                })
            });
            if (response.ok) {
                await onRefresh();
                setSelectedItemId('');
                setAddQuantity(1);
            } else {
                alert('Failed to add item.');
            }
        } catch (err) {
            alert('Error adding item.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 z-[100] ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Slide-over Panel */}
            <div
                className={`fixed right-0 top-0 h-full w-full md:w-[600px] bg-[#121212] border-l border-[#333] shadow-2xl transform transition-transform duration-300 z-[101] flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Header */}
                <div className="bg-[#1E1E1E] border-b border-[#333] px-8 py-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight text-white m-0">
                                Order #{order.order_id}
                            </h2>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                                {new Date(order.created_at).toLocaleString()}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-white hover:bg-gray-800 rounded-full p-2 transition-all active:scale-95"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">

                    {/* Customer & Status Bar */}
                    <div className="flex items-center justify-between bg-[#161616] border border-[#2a2a2a] p-5 rounded-2xl mb-8 shadow-inner">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Customer Mobile</p>
                            <p className="text-sm font-bold text-red-500">{order.customer_phone || <span className="opacity-30">N/A</span>}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Status</p>
                            <span className="text-sm font-black text-white px-3 py-1 bg-[#252525] rounded-lg uppercase tracking-wider">{order.status}</span>
                        </div>
                    </div>

                    {/* Order Items */}
                    <div className="mb-8">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-4 bg-red-600 rounded-full"></span>
                            Order Items
                        </h3>

                        <div className="space-y-3">
                            {order.order_items?.map(item => (
                                <div key={item.order_item_id} className="flex justify-between items-center bg-[#1E1E1E] border border-[#333] rounded-xl p-4 hover:border-red-600/30 transition-colors group">
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-200 text-sm mb-1">{item.item_name}</p>
                                        <p className="text-xs font-black text-red-500">
                                            Rs. {parseFloat(item.item_price).toFixed(2)} <span className="text-gray-600 font-bold px-1">x</span> {item.quantity}
                                        </p>
                                    </div>
                                    <div className="text-right flex items-center gap-4">
                                        <p className="font-black text-white text-sm">
                                            Rs. {parseFloat(item.subtotal).toFixed(2)}
                                        </p>
                                        <button
                                            onClick={() => handleRemoveItem(item.order_item_id)}
                                            disabled={loading}
                                            className="text-gray-600 hover:text-red-500 transition-colors active:scale-90"
                                            title="Remove Item"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {(!order.order_items || order.order_items.length === 0) && (
                                <div className="text-center py-8 text-gray-600 font-bold uppercase tracking-widest text-xs border border-dashed border-[#333] rounded-xl">
                                    No items in this order
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Add Item Section */}
                    {order.status !== 'PAID' && order.status !== 'CLOSED' && (
                        <div className="bg-[#161616] border border-[#333] rounded-2xl p-5 mb-8">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4">Add Item to Order</h4>
                            <div className="flex gap-2">
                                <select
                                    className="flex-1 bg-[#252525] border border-[#444] text-white text-xs font-bold rounded-lg px-3 py-2 outline-none focus:border-red-600"
                                    value={selectedItemId}
                                    onChange={e => setSelectedItemId(e.target.value)}
                                >
                                    <option value="">-- Select Product --</option>
                                    {inventoryItems.map(item => (
                                        <option key={item.id} value={item.id}>
                                            {item.ingredient_name || item.name} (Rs. {parseFloat(item.fifo_selling_price ?? item.selling_price ?? 0).toFixed(2)})
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    min="1"
                                    value={addQuantity}
                                    onChange={e => setAddQuantity(parseInt(e.target.value) || 1)}
                                    className="w-20 bg-[#252525] border border-[#444] text-white text-center text-xs font-black rounded-lg px-2 py-2 outline-none focus:border-red-600"
                                />
                                <button
                                    onClick={handleAddItem}
                                    disabled={loading || !selectedItemId}
                                    className="bg-gray-800 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Total Summary */}
                    <div className="border-t border-[#333] pt-6 mb-8">
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Grand Total</span>
                            <span className="text-3xl font-black text-red-600 tracking-tighter">
                                Rs. {parseFloat(order.total_amount).toFixed(2)}
                            </span>
                        </div>
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="bg-[#1E1E1E] border-t border-[#333] p-6 grid grid-cols-2 gap-4">
                    <button
                        onClick={handleCancelOrder}
                        disabled={loading || order.status === 'PAID' || order.status === 'CLOSED'}
                        className="w-full py-4 bg-transparent border border-gray-600 hover:border-red-500 hover:text-red-500 text-gray-400 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        Cancel Order
                    </button>
                    <button
                        onClick={() => handleStatusChange('BILL_OPEN')}
                        disabled={loading || order.status === 'PAID' || order.status === 'CLOSED'}
                        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        Open Bill
                    </button>
                </div>
            </div>
        </>
    );
};

export default HardwareOrderDetailModal;
