import React, { useState, useEffect } from 'react';
import { fetchLiveMenu, placeOrder } from '../../services/liveMenuService';
import LiveMenuCard from '../../components/live-menu/LiveMenuCard';
import { X, ShoppingBag, ChevronRight } from 'lucide-react';

const VariantModal = ({ item, onClose, onAddToCart }) => {
    // State to track selected options: { [variantId]: [optionId] }
    // For SINGLE type, array has 1 element. For MULTIPLE, multiple.
    const [selections, setSelections] = useState({});

    // Initialize default selections (optional)
    useEffect(() => {
        const initialSelections = {};
        item.variants.forEach(v => {
            if (v.isRequired && v.options.length > 0 && v.type === 'SINGLE') {
                // Pre-select first option for required single choice (UX best practice)
                initialSelections[v.id] = [v.options[0].id];
            } else {
                initialSelections[v.id] = [];
            }
        });
        setSelections(initialSelections);
    }, [item]);

    const handleOptionToggle = (variant, option) => {
        setSelections(prev => {
            const current = prev[variant.id] || [];
            if (variant.type === 'SINGLE') {
                return { ...prev, [variant.id]: [option.id] };
            } else {
                // Multiple choice
                const exists = current.includes(option.id);
                if (exists) {
                    return { ...prev, [variant.id]: current.filter(id => id !== option.id) };
                } else {
                    if (variant.maxSelections && current.length >= variant.maxSelections) return prev; // Max limit
                    return { ...prev, [variant.id]: [...current, option.id] };
                }
            }
        });
    };

    const calculateTotal = () => {
        let total = parseFloat(item.price);
        item.variants.forEach(v => {
            const selectedIds = selections[v.id] || [];
            selectedIds.forEach(optId => {
                const opt = v.options.find(o => o.id === optId);
                if (opt) total += parseFloat(opt.price);
            });
        });
        return total;
    };

    const isValid = () => {
        return item.variants.every(v => {
            if (v.isRequired) {
                const selected = selections[v.id] || [];
                return selected.length >= (v.minSelections || 1);
            }
            return true;
        });
    };

    const handleAdd = () => {
        // Construct detailed variants list for Cart
        const selectedVariants = [];
        item.variants.forEach(v => {
            const selectedIds = selections[v.id] || [];
            selectedIds.forEach(optId => {
                const opt = v.options.find(o => o.id === optId);
                if (opt) {
                    selectedVariants.push({
                        variantId: v.id,
                        variantName: v.name,
                        optionId: opt.id,
                        optionName: opt.name,
                        price: opt.price
                    });
                }
            });
        });

        onAddToCart({
            ...item,
            unitPrice: calculateTotal(),
            selectedVariants
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-gray-900 w-full max-w-md rounded-2xl overflow-hidden border border-gray-800 shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center sticky top-0 bg-gray-900 z-10">
                    <div>
                        <h3 className="text-lg font-bold text-white">{item.name}</h3>
                        <p className="text-red-500 font-semibold">Rs. {calculateTotal().toFixed(2)}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white"><X size={20} /></button>
                </div>

                <div className="p-4 overflow-y-auto custom-scrollbar space-y-6">
                    {item.variants.map(v => (
                        <div key={v.id} className="space-y-3">
                            <div className="flex justify-between">
                                <h4 className="font-semibold text-gray-200">{v.name}</h4>
                                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                                    {v.isRequired ? 'Required' : 'Optional'}
                                    {v.type === 'MULTIPLE' && ` (Max ${v.maxSelections})`}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {v.options.map(opt => {
                                    const isSelected = (selections[v.id] || []).includes(opt.id);
                                    return (
                                        <div
                                            key={opt.id}
                                            onClick={() => handleOptionToggle(v, opt)}
                                            className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-red-500 bg-red-500/10' : 'border-gray-700 hover:bg-gray-800'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-red-500' : 'border-gray-500'}`}>
                                                    {isSelected && <div className="w-2 h-2 rounded-full bg-red-500" />}
                                                </div>
                                                <span className={isSelected ? 'text-white' : 'text-gray-400'}>{opt.name}</span>
                                            </div>
                                            {parseFloat(opt.price) > 0 && <span className="text-sm text-gray-400">+Rs. {opt.price}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-gray-800 bg-gray-900 sticky bottom-0">
                    <button
                        onClick={handleAdd}
                        disabled={!isValid()}
                        className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-900/20"
                    >
                        Add to Order - Rs. {calculateTotal().toFixed(2)}
                    </button>
                </div>
            </div>
        </div>
    );
};

const CartModal = ({ cart, onClose, onUpdateQty, onCheckout }) => {
    const total = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-gray-900 h-full shadow-2xl flex flex-col animate-slide-in-right border-l border-gray-800">
                <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-900">
                    <div className="flex items-center gap-2">
                        <ShoppingBag className="text-red-500" />
                        <h2 className="text-xl font-bold text-white">Your Order</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full text-gray-400"><X size={24} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                            <ShoppingBag size={48} className="mb-2" />
                            <p>Your cart is empty</p>
                        </div>
                    ) : cart.map((item, idx) => (
                        <div key={idx} className="bg-gray-800/40 p-3 rounded-xl border border-gray-700/50">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-semibold text-white">{item.name}</h4>
                                    {item.selectedVariants && item.selectedVariants.length > 0 && (
                                        <p className="text-xs text-gray-400 mt-1">
                                            {item.selectedVariants.map(v => `${v.variantName}: ${v.optionName}`).join(', ')}
                                        </p>
                                    )}
                                </div>
                                <span className="font-bold text-red-500">Rs. {(item.unitPrice * item.quantity).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">Rs. {item.unitPrice.toFixed(2)} each</span>
                                <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-1">
                                    <button onClick={() => onUpdateQty(idx, -1)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white">-</button>
                                    <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                    <button onClick={() => onUpdateQty(idx, 1)} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white">+</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-5 border-t border-gray-800 bg-gray-900">
                    <div className="flex justify-between mb-4 text-gray-300">
                        <span>Total Amount</span>
                        <span className="text-xl font-bold text-white">Rs. {total.toFixed(2)}</span>
                    </div>
                    <button
                        onClick={onCheckout}
                        disabled={cart.length === 0}
                        className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
                    >
                        Checkout <ChevronRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const LiveMenuPage = () => {
    const [menuItems, setMenuItems] = useState([]);
    const [cart, setCart] = useState([]); // Array based cart
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [orderSuccess, setOrderSuccess] = useState(null);

    // Modal States
    const [customizingItem, setCustomizingItem] = useState(null); // Item being customized
    const [showCart, setShowCart] = useState(false);
    const [showPhoneModal, setShowPhoneModal] = useState(false);

    // Order State
    const [customerPhone, setCustomerPhone] = useState('');
    const [placingOrder, setPlacingOrder] = useState(false);

    const getTableId = () => {
        const params = new URLSearchParams(window.location.search);
        return params.get('table') || 'One-WalkIn';
    };
    const tableId = getTableId();

    useEffect(() => {
        loadMenu();
    }, []);

    const loadMenu = async () => {
        try {
            setLoading(true);
            const data = await fetchLiveMenu();
            setMenuItems(data);
        } catch (err) {
            setError('Failed to load menu. Please refresh.');
        } finally {
            setLoading(false);
        }
    };

    // Add Item Logic
    const handleInitialAdd = (item) => {
        if (item.variants && item.variants.length > 0) {
            setCustomizingItem(item);
        } else {
            addToCart({
                ...item,
                unitPrice: parseFloat(item.price),
                selectedVariants: []
            });
        }
    };

    const addToCart = (cartItem) => {
        setCart(prev => {
            // Check if identical item exists (same ID and same variants)
            const existingIndex = prev.findIndex(i =>
                i.id === cartItem.id &&
                JSON.stringify(i.selectedVariants) === JSON.stringify(cartItem.selectedVariants)
            );

            if (existingIndex >= 0) {
                const newCart = [...prev];
                newCart[existingIndex].quantity += 1;
                return newCart;
            }
            return [...prev, { ...cartItem, quantity: 1 }];
        });
        setCustomizingItem(null); // Close modal if open
    };

    const updateCartQty = (index, delta) => {
        setCart(prev => {
            const newCart = [...prev];
            const item = newCart[index];
            item.quantity += delta;
            if (item.quantity <= 0) {
                return prev.filter((_, i) => i !== index);
            }
            return newCart;
        });
    };

    const getTotalAmount = () => {
        return cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    };

    const getTotalItems = () => {
        return cart.reduce((sum, item) => sum + item.quantity, 0);
    };

    const handlePlaceOrder = async () => {
        if (cart.length === 0) return;

        setPlacingOrder(true);
        try {
            const itemsPayload = cart.map(item => ({
                id: item.id,
                quantity: item.quantity,
                variants: item.selectedVariants // Payload for backend
            }));

            const result = await placeOrder({
                table_id: tableId,
                items: itemsPayload,
                customer_phone: customerPhone
            });

            setOrderSuccess(result);
            setCart([]);
            setShowPhoneModal(false);
            setShowCart(false);
        } catch (err) {
            alert('Failed to place order: ' + err.message);
        } finally {
            setPlacingOrder(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center text-white"><Loader className="animate-spin" /> Loading Menu...</div>;
    if (error) return <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center text-red-500">{error}</div>;

    if (orderSuccess) {
        return (
            <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center text-white p-6 text-center animate-fade-in">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 text-green-500 text-4xl">✓</div>
                <h2 className="text-3xl font-bold mb-2">Order Placed!</h2>
                <p className="text-gray-400 mb-6">Table: {tableId}</p>
                <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 mb-8 w-full max-w-sm">
                    <p className="text-sm text-gray-400 mb-1">Total Amount</p>
                    <p className="text-2xl font-bold text-red-500">Rs. {Number(orderSuccess.total_amount).toFixed(2)}</p>
                </div>
                <button
                    onClick={() => setOrderSuccess(null)}
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors shadow-lg shadow-red-900/20"
                >
                    Order More Items
                </button>
            </div>
        );
    }

    const totalItems = getTotalItems();

    return (
        <div className="min-h-screen bg-[#111] pb-24 font-sans text-gray-100">
            {/* Header */}
            <nav className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-gray-800 px-4 py-4 flex justify-between items-center">
                <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Chill Grand</h1>
                <span className="text-xs font-mono text-red-400 border border-red-500/30 bg-red-500/10 px-3 py-1 rounded-full">
                    T-{tableId}
                </span>
            </nav>

            {/* Menu Grid */}
            <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {menuItems.map(item => (
                    <LiveMenuCard
                        key={item.id}
                        item={item}
                        quantity={cart.filter(c => c.id === item.id).reduce((sum, c) => sum + c.quantity, 0)}
                        onAdd={() => handleInitialAdd(item)}
                        // onRemove is handled in cart for complex items, disable inline remove or keep for simple
                        onRemove={() => setShowCart(true)}
                    />
                ))}
            </div>

            {/* Floating Cart Bar */}
            {totalItems > 0 && (
                <div
                    onClick={() => setShowCart(true)}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-red-600 text-white rounded-full p-4 flex justify-between items-center shadow-2xl shadow-red-900/30 z-40 cursor-pointer animate-bounce-subtle hover:scale-105 transition-transform"
                >
                    <div className="flex flex-col leading-tight pl-2">
                        <span className="font-bold">{totalItems} Items</span>
                        <span className="text-xs opacity-90">Rs. {getTotalAmount().toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                        <span className="font-medium text-sm">View Cart</span>
                        <ShoppingBag size={16} />
                    </div>
                </div>
            )}

            {/* Modals */}
            {customizingItem && (
                <VariantModal
                    item={customizingItem}
                    onClose={() => setCustomizingItem(null)}
                    onAddToCart={addToCart}
                />
            )}

            {showCart && (
                <CartModal
                    cart={cart}
                    onClose={() => setShowCart(false)}
                    onUpdateQty={updateCartQty}
                    onCheckout={() => setShowPhoneModal(true)}
                />
            )}

            {showPhoneModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-gray-900 w-full max-w-sm p-6 rounded-2xl border border-gray-800 shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-2 text-center">Checkout</h2>
                        <p className="text-gray-400 text-sm text-center mb-6">Enter your phone number to confirming your order.</p>

                        <input
                            type="tel"
                            placeholder="Phone Number (e.g. 077...)"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className="w-full p-3 bg-black border border-gray-700 rounded-xl text-white mb-6 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowPhoneModal(false)}
                                className="flex-1 py-3 bg-gray-800 text-gray-300 rounded-xl font-medium hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePlaceOrder}
                                disabled={placingOrder || !customerPhone}
                                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {placingOrder ? 'Confirming...' : 'Place Order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Loader import fix */}
        </div>
    );
};

// Mini Loader Component if not imported
const Loader = ({ className }) => (
    <svg className={`w-6 h-6 ${className}`} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export default LiveMenuPage;
