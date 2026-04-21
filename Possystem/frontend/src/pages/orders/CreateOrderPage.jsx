import React, { useState, useEffect, useMemo } from 'react';
import { fetchLiveMenu } from '../../services/liveMenuService';
import { createOrder } from '../../services/orderService';
import DashboardLayout from '../../components/layout/DashboardLayout';
import CategoryGrid from '../../components/orders/CategoryGrid';
import MenuItemGrid from '../../components/orders/MenuItemGrid';
import VariantModal from '../../components/orders/VariantModal';

const CreateOrderPage = ({ onNavigate, tableData }) => {
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState([]);
    const [customerPhone, setCustomerPhone] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [showCart, setShowCart] = useState(false);

    // Variant modal state
    const [variantModalItem, setVariantModalItem] = useState(null);

    useEffect(() => {
        loadMenuItems();
    }, []);

    const loadMenuItems = async () => {
        try {
            setLoading(true);
            setError(null);
            const items = await fetchLiveMenu();
            setMenuItems(items);
        } catch (err) {
            console.error('Failed to load menu items:', err);
            setError('Failed to load menu items. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Extract unique categories with images
    const categories = useMemo(() => {
        const categoryMap = new Map();

        menuItems.forEach(item => {
            if (item.category) {
                if (!categoryMap.has(item.category)) {
                    categoryMap.set(item.category, {
                        name: item.category,
                        image: item.image,
                        count: 1
                    });
                } else {
                    const cat = categoryMap.get(item.category);
                    cat.count++;
                    // Use first item with image
                    if (!cat.image && item.image) {
                        cat.image = item.image;
                    }
                }
            }
        });

        return Array.from(categoryMap.values()).sort((a, b) =>
            a.name.localeCompare(b.name)
        );
    }, [menuItems]);

    // Filter menu items by selected category
    const filteredItems = useMemo(() => {
        if (selectedCategory === 'all') {
            return menuItems;
        }
        return menuItems.filter(item => item.category === selectedCategory);
    }, [menuItems, selectedCategory]);

    // Helper: Check if item has real variant choices requiring modal
    const hasRealVariantChoices = (item) => {
        if (!item.variants || item.variants.length === 0) return false;

        return item.variants.some(variant => {
            // Multi-select always needs modal
            if (variant.type !== "SINGLE") return true;

            // Multiple options need modal
            if (variant.options.length > 1) return true;

            // Single option with price needs modal (affects total)
            if (variant.options.length === 1 && variant.options[0].price > 0) return true;

            // No real choice
            return false;
        });
    };

    // Handle menu item click - Smart routing to cart or modal
    const handleMenuItemClick = (item) => {
        // Debug log
        console.log("Clicked item variants:", item.variants);

        // Check if item has real variant choices
        if (!hasRealVariantChoices(item)) {
            // No real choices - auto-select and add directly
            const autoSelectedVariants = item.variants?.map(variant => ({
                variant_id: variant.id,
                option_id: variant.options[0]?.id,
                option_name: variant.options[0]?.name,
                price: parseFloat(variant.options[0]?.price || 0)
            })) || [];

            const totalPrice = parseFloat(item.price) +
                autoSelectedVariants.reduce((sum, v) => sum + v.price, 0);

            addItemToCart({
                menu_item_id: item.id,
                name: item.name,
                quantity: 1,
                base_price: parseFloat(item.price),
                variants: autoSelectedVariants,
                total_price: totalPrice,
                image: item.image
            });
        } else {
            // Real choices exist - open variant modal
            setVariantModalItem(item);
        }
    };

    // Add item to cart (called directly or from variant modal)
    const addItemToCart = (cartItem) => {
        // Generate unique key for cart item
        // Items with different variant selections are separate line items
        const variantKey = cartItem.variants.length > 0
            ? JSON.stringify(cartItem.variants.map(v => ({ vid: v.variant_id, oid: v.option_id })))
            : 'no-variants';

        const itemKey = `${cartItem.menu_item_id}-${variantKey}`;

        const existingIndex = selectedItems.findIndex(i => i.uniqueKey === itemKey);

        if (existingIndex > -1) {
            // Increment quantity of existing item with same variants
            const newItems = [...selectedItems];
            newItems[existingIndex].quantity += cartItem.quantity;
            newItems[existingIndex].total_price =
                (newItems[existingIndex].base_price +
                    newItems[existingIndex].variants.reduce((sum, v) => sum + v.price, 0)) *
                newItems[existingIndex].quantity;
            setSelectedItems(newItems);
        } else {
            // Add new item with unique key
            setSelectedItems([...selectedItems, { ...cartItem, uniqueKey: itemKey }]);
        }

        // Show cart briefly on mobile when item is added
        if (window.innerWidth < 1024) {
            setShowCart(true);
            setTimeout(() => setShowCart(false), 1500);
        }
    };

    // Update quantity
    const handleQuantityChange = (itemIndex, newQuantity) => {
        if (newQuantity < 1) {
            // Remove item if quantity is 0
            setSelectedItems(selectedItems.filter((_, index) => index !== itemIndex));
        } else {
            setSelectedItems(selectedItems.map((item, index) => {
                if (index === itemIndex) {
                    // Recalculate total_price based on new quantity
                    const unitPrice = item.base_price + item.variants.reduce((sum, v) => sum + v.price, 0);
                    return {
                        ...item,
                        quantity: newQuantity,
                        total_price: unitPrice * newQuantity
                    };
                }
                return item;
            }));
        }
    };

    // Calculate total
    const calculateTotal = () => {
        return selectedItems.reduce((sum, item) => sum + item.total_price, 0);
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
                table_id: 1, // Defaulting to 1 for hardware POS (Assumes a default sales counter exists)
                items: selectedItems.map(item => ({
                    id: item.menu_item_id,
                    quantity: item.quantity,
                    variants: item.variants // Array of { variant_id, option_id }
                })),
                customer_phone: customerPhone || undefined
            };

            console.log('Creating order:', orderData);
            const response = await createOrder(orderData);

            // Show success message and navigate back
            alert(`Order #${response.id || response.orderId} created successfully!`);
            onNavigate('dashboard');
        } catch (err) {
            console.error('Failed to create order:', err);
            setError(err.message || 'Failed to create order. Please try again.');
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        if (selectedItems.length > 0) {
            if (!confirm('Are you sure you want to cancel? All selected items will be lost.')) {
                return;
            }
        }
        onNavigate('dashboard');
    };

    return (
        <DashboardLayout onNavigate={onNavigate}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl shadow-xl p-6 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-4">
                                {/* Back button already added above */}
                                <button
                                    onClick={handleCancel}
                                    disabled={submitting}
                                    className="p-2 mr-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full transition-all disabled:opacity-50"
                                    title="Go Back"
                                >
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <div>
                                    <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Create New Sale</h1>
                                    <p className="text-gray-400 mt-1 font-medium flex items-center gap-2">
                                        <span className="text-red-500">•</span> Direct Sale Counter
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Cart Toggle */}
                        <button
                            onClick={() => setShowCart(!showCart)}
                            className="lg:hidden relative p-3 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-lg"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {selectedItems.length > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                                    {selectedItems.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                            {error}
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Menu Selection - Left Side */}
                    <div className="lg:col-span-2">
                        {loading ? (
                            <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl shadow-xl p-16 text-center">
                                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-6"></div>
                                <p className="text-gray-400 text-lg font-bold uppercase tracking-widest">Loading menu items...</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Category Grid */}
                                <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl shadow-xl p-8">
                                    <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-3">
                                        <span className="w-1.5 h-6 bg-red-600 rounded-full"></span>
                                        Select Category
                                    </h2>
                                    <CategoryGrid
                                        categories={categories}
                                        selectedCategory={selectedCategory}
                                        onSelectCategory={setSelectedCategory}
                                    />
                                </div>

                                {/* Menu Items Grid */}
                                <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl shadow-xl p-8">
                                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#333333]">
                                        <h2 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
                                            <span className="w-1.5 h-6 bg-red-600 rounded-full"></span>
                                            {selectedCategory === 'all' ? 'All Menu Items' : selectedCategory}
                                        </h2>
                                        <span className="text-sm font-bold text-gray-400 bg-gray-800 px-4 py-2 rounded-xl border border-[#333333]">
                                            {filteredItems.length} items
                                        </span>
                                    </div>
                                    <MenuItemGrid
                                        items={filteredItems}
                                        orderItems={selectedItems}
                                        onAddItem={handleMenuItemClick}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Order Summary - Right Side */}
                    <div className={`lg:col-span-1 ${showCart ? 'block' : 'hidden lg:block'}`}>
                        <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl shadow-xl p-8 lg:sticky lg:top-6">
                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#333333]">
                                <h3 className="text-xl font-bold text-white uppercase tracking-wider">Order Summary</h3>
                                <button
                                    onClick={() => setShowCart(false)}
                                    className="lg:hidden text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Customer Phone */}
                            <div className="mb-8">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                                    Customer Phone (Optional)
                                </label>
                                <input
                                    type="tel"
                                    placeholder="Enter phone number"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-800 border border-[#333333] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600 transition-all font-medium"
                                />
                            </div>

                            {/* Selected Items */}
                            <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                                {selectedItems.length === 0 ? (
                                    <div className="text-center py-12">
                                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        <p className="text-gray-500">No items selected</p>
                                        <p className="text-sm text-gray-400 mt-1">Tap menu items to add</p>
                                    </div>
                                ) : (
                                    selectedItems.map((item, index) => (
                                        <div key={item.uniqueKey} className="bg-gray-800/20 border border-[#333333] rounded-xl p-3.5 shadow-inner">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1">
                                                    <span className="font-bold text-white block text-sm leading-tight">
                                                        {item.name}
                                                    </span>
                                                    {/* Display selected variants */}
                                                    {item.variants && item.variants.length > 0 && (
                                                        <div className="text-[10px] text-gray-400 mt-1.5 space-y-1 opacity-80">
                                                            {item.variants.map((variant, idx) => (
                                                                <div key={idx} className="flex items-center gap-1.5">
                                                                    <span className="w-1 h-1 bg-red-600/60 rounded-full"></span>
                                                                    <span className="font-medium">{variant.option_name}</span>
                                                                    {variant.price > 0 && (
                                                                        <span className="text-red-500/80 font-bold">
                                                                            (+Rs. {variant.price.toFixed(2)})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {/* Show unit price */}
                                                    <div className="text-[10px] font-bold text-gray-500 mt-2 uppercase tracking-widest opacity-60">
                                                        Rs. {(item.total_price / item.quantity).toFixed(2)} × {item.quantity}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleQuantityChange(index, 0);
                                                    }}
                                                    className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between mt-1 pt-3 border-t border-[#333333]/30">
                                                <div className="flex items-center gap-1.5 bg-gray-900/40 p-1 rounded-lg border border-[#333333]/50">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleQuantityChange(index, item.quantity - 1);
                                                        }}
                                                        className="w-7 h-7 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-all font-bold text-sm"
                                                    >
                                                        −
                                                    </button>
                                                    <span className="w-6 text-center font-bold text-white text-xs">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleQuantityChange(index, item.quantity + 1);
                                                        }}
                                                        className="w-7 h-7 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-all font-bold text-sm"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <span className="font-black text-red-500 text-base tabular-nums">
                                                    Rs. {item.total_price.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Total */}
                            {selectedItems.length > 0 && (
                                <>
                                    <div className="border-t border-[#333333] pt-5 mb-6">
                                        <div className="flex justify-between items-center text-xl font-bold">
                                            <span className="text-gray-400 uppercase tracking-widest text-xs">Grand Total</span>
                                            <span className="text-red-600 text-2xl font-black tracking-tight">
                                                Rs. {calculateTotal().toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-3">
                                        <button
                                            onClick={handleSubmit}
                                            disabled={submitting || selectedItems.length === 0}
                                            className="w-full py-4 bg-red-600 text-white rounded-xl hover:bg-red-700 font-bold text-sm uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-600/10 active:scale-95 transform"
                                        >
                                            {submitting ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Processing...
                                                </span>
                                            ) : (
                                                'Confirm Order'
                                            )}
                                        </button>
                                        <button
                                            onClick={handleCancel}
                                            className="w-full py-3 bg-gray-800/40 text-gray-500 border border-[#333] rounded-xl hover:text-white hover:bg-gray-800 transition-all text-xs font-bold uppercase tracking-widest"
                                        >
                                            Discard Order
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Variant Modal */}
                {variantModalItem && (
                    <VariantModal
                        item={variantModalItem}
                        onClose={() => setVariantModalItem(null)}
                        onAddToCart={addItemToCart}
                    />
                )}
            </div>
        </DashboardLayout>
    );
};

export default CreateOrderPage;
