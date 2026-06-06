import React, { useState, useEffect } from 'react';
import { fetchLiveMenu } from '../../services/liveMenuService';
import { createOrder } from '../../services/orderService';

const CreateOrderModal = ({ table, isOpen, onClose, onSuccess }) => {
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState([]);
    const [customerPhone, setCustomerPhone] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            loadMenuItems();
            // Reset form when modal opens
            setSelectedItems([]);
            setCustomerPhone('');
            setSearchQuery('');
            setSelectedCategory('all');
            setError(null);
        }
    }, [isOpen]);

    const loadMenuItems = async () => {
        try {
            setLoading(true);
            setError(null);
            const items = await fetchLiveMenu();
            setMenuItems(items);
        } catch (err) {
            console.error('Failed to load product items:', err);
            setError('Failed to load product items. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Get unique categories from menu items
    const categories = ['all', ...new Set(menuItems.map(item => item.category).filter(Boolean))];

    // Filter menu items
    const filteredItems = menuItems.filter(item => {
        const matchesSearch = item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Handle item selection
    const handleItemToggle = (item) => {
        const existingIndex = selectedItems.findIndex(i => i.id === item.id);
        
        if (existingIndex > -1) {
            // Remove item
            setSelectedItems(selectedItems.filter(i => i.id !== item.id));
        } else {
            // Add item with quantity 1
            setSelectedItems([...selectedItems, { ...item, quantity: 1 }]);
        }
    };

    // Update quantity
    const handleQuantityChange = (itemId, newQuantity) => {
        if (newQuantity < 1) {
            // Remove item if quantity is 0
            setSelectedItems(selectedItems.filter(i => i.id !== itemId));
        } else {
            setSelectedItems(selectedItems.map(i => 
                i.id === itemId ? { ...i, quantity: newQuantity } : i
            ));
        }
    };

    // Calculate total
    const calculateTotal = () => {
        return selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    // Handle order submission
    const handleSubmit = async () => {
        if (selectedItems.length === 0) {
            setError('Please select at least one item');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);

            const orderData = {
                table_id: table.tableId || table.id,
                items: selectedItems.map(item => ({
                    id: item.id,
                    quantity: item.quantity
                })),
                customer_phone: customerPhone || undefined
            };

            console.log('Creating order:', orderData);
            const response = await createOrder(orderData);
            
            // Call success callback with the order ID
            if (onSuccess) {
                onSuccess(response.id || response.orderId);
            }
        } catch (err) {
            console.error('Failed to create order:', err);
            setError(err.message || 'Failed to create order. Please try again.');
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-4 md:inset-10 bg-white rounded-lg shadow-2xl z-50 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Create Order</h2>
                        <p className="text-gray-600 mt-1">
                            {table.placeName} - {table.tableName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100"
                    >
                        ×
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Menu Selection - Left Side */}
                        <div className="lg:col-span-2 space-y-4">
                            {/* Search and Filter */}
                            <div className="flex gap-4">
                                <input
                                    type="text"
                                    placeholder="Search product items..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>
                                            {cat === 'all' ? 'All Categories' : cat}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Menu Items Grid */}
                            {loading ? (
                                <div className="text-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                                    <p className="text-gray-600 mt-4">Loading products...</p>
                                </div>
                            ) : filteredItems.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    No product items found
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {filteredItems.map(item => {
                                        const isSelected = selectedItems.some(i => i.id === item.id);
                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => handleItemToggle(item)}
                                                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                                    isSelected
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-gray-800">
                                                            {item.name}
                                                        </h3>
                                                        {item.description && (
                                                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                                                {item.description}
                                                            </p>
                                                        )}
                                                        <p className="text-lg font-bold text-blue-600 mt-2">
                                                            Rs. {item.price.toFixed(2)}
                                                        </p>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="ml-4">
                                                            <svg 
                                                                className="w-6 h-6 text-blue-600" 
                                                                fill="currentColor" 
                                                                viewBox="0 0 20 20"
                                                            >
                                                                <path 
                                                                    fillRule="evenodd" 
                                                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                                                                    clipRule="evenodd" 
                                                                />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Order Summary - Right Side */}
                        <div className="lg:col-span-1">
                            <div className="bg-gray-50 rounded-lg p-6 sticky top-0">
                                <h3 className="text-lg font-bold text-gray-800 mb-4">Order Summary</h3>

                                {/* Customer Phone (Optional) */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Customer Phone (Optional)
                                    </label>
                                    <input
                                        type="tel"
                                        placeholder="Enter phone number"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                {/* Selected Items */}
                                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                                    {selectedItems.length === 0 ? (
                                        <p className="text-gray-500 text-center py-8">
                                            No items selected
                                        </p>
                                    ) : (
                                        selectedItems.map(item => (
                                            <div key={item.id} className="bg-white rounded-lg p-3 shadow-sm">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-medium text-gray-800 flex-1">
                                                        {item.name}
                                                    </span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleQuantityChange(item.id, 0);
                                                        }}
                                                        className="text-red-500 hover:text-red-700 ml-2"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleQuantityChange(item.id, item.quantity - 1);
                                                            }}
                                                            className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded text-gray-700 font-bold"
                                                        >
                                                            −
                                                        </button>
                                                        <span className="w-8 text-center font-semibold">
                                                            {item.quantity}
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleQuantityChange(item.id, item.quantity + 1);
                                                            }}
                                                            className="w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded text-gray-700 font-bold"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                    <span className="font-bold text-blue-600">
                                                        Rs. {(item.price * item.quantity).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Total */}
                                {selectedItems.length > 0 && (
                                    <div className="border-t pt-4">
                                        <div className="flex justify-between items-center text-xl font-bold">
                                            <span>Total:</span>
                                            <span className="text-blue-600">
                                                Rs. {calculateTotal().toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t p-6 bg-gray-50 flex justify-end space-x-4">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || selectedItems.length === 0}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Creating Order...' : `Create Order (${selectedItems.length} items)`}
                    </button>
                </div>
            </div>
        </>
    );
};

export default CreateOrderModal;
