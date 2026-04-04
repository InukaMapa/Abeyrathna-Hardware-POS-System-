import React, { useState } from 'react';
import { API_BASE_URL } from '../../config/api';

const OrderDetailsDrawer = ({ isOpen, onClose, table, onRefresh }) => {
    const [loading, setLoading] = useState(false);
    const [showAddItem, setShowAddItem] = useState(false);

    if (!isOpen) return null;

    const order = table?.currentOrder;

    const handleStatusChange = async (newStatus) => {
        if (!order) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/orders/${order.id}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                await onRefresh();
                if (newStatus === 'COMPLETED') {
                    onClose();
                }
            } else {
                alert('Failed to update order status');
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            alert('Error updating order status');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseBill = async () => {
        if (!order) return;

        if (!confirm('Are you sure you want to close this bill?')) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/orders/${order.id}/close`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                await onRefresh();
                onClose();
                alert('Bill closed successfully!');
            } else {
                alert('Failed to close bill');
            }
        } catch (error) {
            console.error('Error closing bill:', error);
            alert('Error closing bill');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'PLACED': return 'text-blue-600';
            case 'PREPARING': return 'text-orange-600';
            case 'SERVED': return 'text-green-600';
            case 'BILL_OPEN': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={`fixed right-0 top-0 h-full w-full md:w-[500px] bg-white shadow-2xl transform transition-transform duration-300 z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="bg-blue-600 text-white px-6 py-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold">Table {table?.tableNumber}</h2>
                                <p className="text-blue-100 text-sm">{table?.seats} seats</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-white hover:bg-blue-700 rounded-full p-2 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {!order ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <svg className="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <p className="text-lg font-medium mb-2">No Active Order</p>
                                <p className="text-sm text-center mb-4">This table doesn't have an order yet</p>
                                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                                    Create New Order
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Order Status */}
                                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-gray-600 font-medium">Order Status</span>
                                        <span className={`text-lg font-bold ${getStatusColor(order.status)}`}>
                                            {order.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        Order ID: #{order.id}
                                    </div>
                                </div>

                                {/* Order Items */}
                                <div className="mb-6">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-lg font-bold text-gray-900">Order Items</h3>
                                        <button
                                            onClick={() => setShowAddItem(true)}
                                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                        >
                                            + Add Item
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {order.items?.map((item, index) => (
                                            <div key={index} className="flex justify-between items-start bg-white border border-gray-200 rounded-lg p-3">
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900">{item.name}</p>
                                                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-gray-900">
                                                        Rs. {(item.price * item.quantity).toFixed(2)}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        @ Rs. {item.price.toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {(!order.items || order.items.length === 0) && (
                                        <div className="text-center py-8 text-gray-500">
                                            <p>No items in this order</p>
                                        </div>
                                    )}
                                </div>

                                {/* Order Total */}
                                <div className="bg-gray-100 rounded-lg p-4 mb-6">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Subtotal</span>
                                            <span className="text-gray-900 font-medium">
                                                Rs. {order.subtotal?.toFixed(2) || order.total?.toFixed(2) || '0.00'}
                                            </span>
                                        </div>
                                        {order.tax && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Tax</span>
                                                <span className="text-gray-900 font-medium">
                                                    Rs. {order.tax.toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="border-t border-gray-300 pt-2 flex justify-between">
                                            <span className="text-lg font-bold text-gray-900">Total</span>
                                            <span className="text-lg font-bold text-gray-900">
                                                Rs. {order.total?.toFixed(2) || '0.00'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Status Change Buttons */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-gray-700 uppercase">Change Status</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {order.status !== 'PREPARING' && (
                                            <button
                                                onClick={() => handleStatusChange('PREPARING')}
                                                disabled={loading}
                                                className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                                            >
                                                Mark Preparing
                                            </button>
                                        )}
                                        {order.status !== 'SERVED' && (
                                            <button
                                                onClick={() => handleStatusChange('SERVED')}
                                                disabled={loading}
                                                className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                                            >
                                                Mark Served
                                            </button>
                                        )}
                                        {order.status !== 'BILL_OPEN' && (
                                            <button
                                                onClick={() => handleStatusChange('BILL_OPEN')}
                                                disabled={loading}
                                                className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                                            >
                                                Open Bill
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    {order && (
                        <div className="border-t border-gray-200 p-6 bg-gray-50">
                            <button
                                onClick={handleCloseBill}
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Processing...' : 'Close Bill & Complete Order'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default OrderDetailsDrawer;
