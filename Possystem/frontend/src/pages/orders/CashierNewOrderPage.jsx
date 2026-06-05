import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { fetchInventoryCategories, fetchInventoryItems } from '../../services/menuService';
import { createOrder } from '../../services/orderService';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

/* ───────────────────────────── helpers ───────────────────────────── */
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
};

const getPriceTiers = (item) => (
    Array.isArray(item?.priceTiers) && item.priceTiers.length > 0
        ? item.priceTiers
        : [{
            quantity_remaining: item?.quantity || 0,
            selling_price: item?.price || 0,
            buying_price: item?.buyingPrice || 0
        }]
);

const calculateTieredLine = (item, quantity) => {
    let remaining = quantity;
    let total = 0;
    const allocations = [];

    for (const tier of getPriceTiers(item)) {
        if (remaining <= 0) break;
        const available = parseFloat(tier.quantity_remaining || 0);
        if (available <= 0) continue;

        const qty = Math.min(remaining, available);
        const price = parseFloat(tier.selling_price || item.price || 0);
        total += qty * price;
        allocations.push({ quantity: qty, price });
        remaining -= qty;
    }

    if (remaining > 0) {
        const price = parseFloat(item.price || 0);
        total += remaining * price;
        allocations.push({ quantity: remaining, price });
    }

    return { total, allocations };
};

/* ───────────────────────────── component ───────────────────────────── */

const CashierNewOrderPage = ({ onNavigate, editOrder }) => {
    const { user } = useAuth();
    /* ── data state ── */
    const [categories, setCategories] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /* ── ui state ── */
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [cartItems, setCartItems] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [showCart, setShowCart] = useState(false);
    const [customerPhone, setCustomerPhone] = useState(editOrder?.customer_phone || '');
    const [barcodeInput, setBarcodeInput] = useState('');
    const [barcodeError, setBarcodeError] = useState(null);
    const [checkingShift, setCheckingShift] = useState(true);
    const [hasOpenShift, setHasOpenShift] = useState(false);

    // Initialize cart from editOrder if present
    useEffect(() => {
        if (editOrder && editOrder.order_items) {
            const initialCart = editOrder.order_items.map(item => ({
                id: item.item_id,
                name: item.item_name,
                price: parseFloat(item.item_price) || 0,
                buyingPrice: parseFloat(item.buying_price || item.buying_price_at_time || 0),
                // image is not in order_items but will be merged or handled
                quantity: item.quantity
            }));
            setCartItems(initialCart);
        }
    }, [editOrder]);

    /* ── load data on mount ── */
    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                setCheckingShift(true);

                const shiftResponse = await fetch(`${API_BASE_URL}/cash/admin/shifts`, {
                    headers: getAuthHeaders()
                });
                const shiftData = await shiftResponse.json();
                const shifts = Array.isArray(shiftData) ? shiftData : [];
                const cashierName = user?.full_name || user?.name || user?.username;
                const openShift = shifts.find(shift => {
                    const isCurrentCashier = !cashierName || shift.cashier_name === cashierName;
                    return isCurrentCashier && ['OPEN', 'REPORT_SUBMITTED'].includes(shift.status);
                });
                setHasOpenShift(Boolean(openShift));
                setCheckingShift(false);

                if (!openShift) {
                    setLoading(false);
                    return;
                }

                const [cats, items] = await Promise.all([
                    fetchInventoryCategories(),
                    fetchInventoryItems(),
                ]);
                console.log('DEBUG: Fetched Categories:', cats);
                console.log('DEBUG: Fetched Items:', items);
                setCategories(cats);

                // Map inventory items to common format
                const mappedItems = items.map(item => ({
                    id: item.id,
                    name: item.ingredient_name,
                    price: parseFloat(item.fifo_selling_price ?? item.selling_price ?? 0),
                    buyingPrice: parseFloat(item.buying_price || 0),
                    priceTiers: item.stock_price_tiers || [],
                    category: item.category,
                    image: item.image || null,
                    unit: item.unit,
                    quantity: item.quantity,
                    item_code: item.item_code
                }));

                setInventoryItems(mappedItems);
            } catch (err) {
                console.error('Failed to load inventory/categories:', err);
                setError('Failed to load products. Please refresh.');
                setCheckingShift(false);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user?.full_name, user?.name, user?.username]);

    /* ── derived: filtered + searched items ── */
    const filteredItems = useMemo(() => {
        let list = inventoryItems;

        // category filter
        if (selectedCategory !== 'all') {
            list = list.filter(item => {
                return (
                    item.category === selectedCategory ||
                    item.category_name === selectedCategory
                );
            });
        }

        // search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(item =>
                (item.name || '').toLowerCase().includes(q) ||
                (item.description || '').toLowerCase().includes(q) ||
                (item.category || item.category_name || '').toLowerCase().includes(q)
            );
        }

        return list;
    }, [inventoryItems, selectedCategory, searchQuery]);

    /* ── cart helpers ── */
    const addToCart = (item) => {
        setCartItems(prev => {
            const existing = prev.find(c => c.id === item.id);
            if (existing) {
                return prev.map(c =>
                    c.id === item.id
                        ? { ...c, quantity: c.quantity + 1 }
                        : c
                );
            }
            return [...prev, {
                id: item.id,
                name: item.name,
                price: parseFloat(item.price) || 0,
                buyingPrice: parseFloat(item.buyingPrice || 0),
                priceTiers: item.priceTiers || [],
                image: item.image,
                quantity: 1,
            }];
        });
    };

    const changeQty = (id, delta) => {
        setCartItems(prev => {
            const updated = prev.map(c =>
                c.id === id ? { ...c, quantity: c.quantity + delta } : c
            ).filter(c => c.quantity > 0);
            return updated;
        });
    };

    const removeFromCart = (id) =>
        setCartItems(prev => prev.filter(c => c.id !== id));

    const cartTotal = cartItems.reduce((s, c) => s + calculateTieredLine(c, c.quantity).total, 0);
    const cartCount = cartItems.reduce((s, c) => s + c.quantity, 0);

    /* ── barcode scanner handler ── */
    const processBarcode = (inputStr) => {
        setBarcodeError(null);
        const input = inputStr.trim();
        if (!input) return;

        // Search in mapped inventory items locally
        const foundItem = inventoryItems.find(
            item => item.item_code && item.item_code.toLowerCase() === input.toLowerCase()
        );

        if (foundItem) {
            if (foundItem.quantity <= 0) {
                setBarcodeError('Item is out of stock!');
                setTimeout(() => setBarcodeError(null), 3000);
                return;
            }

            addToCart(foundItem);
            setBarcodeInput('');
            setShowCart(true);
        } else {
            setBarcodeError('Barcode ID not found!');
            setTimeout(() => setBarcodeError(null), 3000);
        }
    };

    const handleBarcodeSubmit = (e) => {
        if (e) e.preventDefault();
        processBarcode(barcodeInput);
    };

    // Global listener for barcode scanners
    useEffect(() => {
        let barcodeBuffer = '';
        let lastKeyTime = Date.now();

        const handleKeyDown = (e) => {
            // Ignore if typing in a normal text input (except our search/barcode ones if we want to allow it, but best to just skip if it's not a rapid scanner)
            // Actually, we'll measure the speed. Scanners are very fast (<30ms per char).
            const currentTime = Date.now();
            
            // If more than 50ms since last key, assume human typing and reset
            if (currentTime - lastKeyTime > 50) {
                barcodeBuffer = '';
            }

            if (e.key === 'Enter' && barcodeBuffer.length > 2) { // Barcodes usually have >2 chars
                // If focus is in an input, it might trigger submit anyway, but let's handle it
                e.preventDefault();
                processBarcode(barcodeBuffer);
                barcodeBuffer = '';
            } else if (e.key.length === 1) { // Normal character
                barcodeBuffer += e.key;
            }

            lastKeyTime = currentTime;
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [inventoryItems]); // Need inventoryItems dependency to find the correct item

    // End of barcode handlers

    /* ── submit order ── */
    const handleSubmit = async () => {
        if (!hasOpenShift) {
            setSubmitError('Please start your shift in the Cash Counter before creating orders.');
            return;
        }
        if (cartItems.length === 0) return;
        setSubmitting(true);
        setSubmitError(null);
        try {
            const orderData = {
                table_id: null,
                customer_phone: customerPhone || null,
                items: cartItems.map(c => ({
                    id: c.id,
                    quantity: c.quantity,
                    variants: [],
                })),
            };

            if (editOrder) {
                // Update existing order cart
                const response = await fetch(`${API_BASE_URL}/orders/${editOrder.order_id}/cart`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(orderData)
                });

                if (!response.ok) {
                    const errPayload = await response.json().catch(() => ({}));
                    throw new Error(errPayload.error || 'Failed to update order cart.');
                }

                alert(`✅ Order #${editOrder.order_id} updated successfully!`);
                onNavigate('order-details', { orderId: editOrder.order_id });
            } else {
                // Create new order
                const res = await createOrder(orderData);
                alert(`✅ Order #${res.id || res.orderId || ''} created successfully!`);
                onNavigate('orders');
            }
        } catch (err) {
            console.error('Order logic failed:', err);
            setSubmitError(err.message || 'Failed to process order. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    /* ── category display name helper ── */
    const getCategoryDisplay = (cat) =>
        cat.name || cat.category_name || cat.label || '';

    if (checkingShift || loading) {
        return (
            <DashboardLayout onNavigate={onNavigate} activePage="orders">
                <div className="cashier-new-order-page min-h-screen px-4 py-6 md:px-8">
                    <div className="orders-state-card flex flex-col items-center justify-center py-20">
                        <div className="orders-spinner mb-4"></div>
                        <p>{checkingShift ? 'Checking shift status...' : 'Loading order workspace...'}</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!hasOpenShift) {
        return (
            <DashboardLayout onNavigate={onNavigate} activePage="orders">
                <div className="cashier-new-order-page min-h-screen px-4 py-6 md:px-8">
                    <div className="cashier-shift-block">
                        <div className="cashier-shift-block-icon">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3A9 9 0 113 12a9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <p className="cashier-shift-block-kicker">Cashier shift required</p>
                        <h2>Start your shift first</h2>
                        <span>You cannot create or update orders until an active cash shift is started in the Cash Counter.</span>
                        <div className="cashier-shift-block-actions">
                            <button type="button" onClick={() => onNavigate('cash-counter')}>
                                Start Shift
                            </button>
                            <button type="button" onClick={() => onNavigate('orders')}>
                                Back to Orders
                            </button>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    /* ╔══════════════════════════════════════════════════╗
       ║                    RENDER                        ║
       ╚══════════════════════════════════════════════════╝ */
    return (
        <DashboardLayout onNavigate={onNavigate} activePage="orders">
            <div className="cashier-new-order-page min-h-screen px-4 py-6 md:px-8">

                {/* ── PAGE HEADER ── */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                if (editOrder) {
                                    onNavigate('order-details', { orderId: editOrder.order_id });
                                } else {
                                    onNavigate('orders');
                                }
                            }}
                            className="cashier-order-back-btn"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight m-0">
                                {editOrder ? `Update Order #${editOrder.order_id}` : 'New Order'}
                            </h2>
                            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                                Select items from the menu below
                            </p>
                        </div>
                    </div>

                    {/* Mobile cart toggle */}
                    <button
                        onClick={() => setShowCart(v => !v)}
                        className="relative lg:hidden p-3 bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-600/20 transition-all active:scale-95"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {cartCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-white text-red-600 text-xs font-black rounded-full w-6 h-6 flex items-center justify-center shadow">
                                {cartCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* ── MAIN LAYOUT ── */}
                <div className="flex flex-col lg:flex-row gap-6">

                    {/* ════════════════════ LEFT: MENU AREA ════════════════════ */}
                    <div className="flex-1 space-y-6">

                        {/* Search Bar */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                id="order-search-bar"
                                type="text"
                                placeholder="Search items by name, category…"
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setSelectedCategory('all'); }}
                                className="w-full pl-12 pr-4 py-4 bg-[#1E1E1E] border border-[#333] rounded-2xl text-white placeholder-gray-600 text-sm font-medium focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/30 transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-4 flex items-center text-gray-500 hover:text-white transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Loading / Error */}
                        {loading && (
                            <div className="flex flex-col items-center justify-center py-24 bg-[#1E1E1E] rounded-2xl border border-[#333]">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4" />
                                <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Loading products...</p>
                            </div>
                        )}
                        {!loading && error && (
                            <div className="p-6 bg-red-900/20 border border-red-700/40 rounded-2xl text-red-400 font-semibold">
                                {error}
                            </div>
                        )}

                        {!loading && !error && (
                            <>
                                {/* ── CATEGORIES ── */}
                                {!searchQuery && (
                                    <div className="bg-[#1E1E1E] border border-[#333] rounded-2xl p-6">
                                        <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                                            <span className="w-1 h-4 bg-red-600 rounded-full inline-block" />
                                            Categories
                                        </h2>
                                        <div className="relative">
                                            <select
                                                id="category-select"
                                                value={selectedCategory}
                                                onChange={(e) => setSelectedCategory(e.target.value)}
                                                className="w-full bg-[#252525] text-white text-[10px] font-black uppercase tracking-widest px-4 py-3 rounded-lg border border-[#444] outline-none focus:border-red-600 transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="all">All Items</option>
                                                {categories.map(cat => {
                                                    const display = getCategoryDisplay(cat);
                                                    const catId = cat.id || display;
                                                    return (
                                                        <option key={catId} value={display || catId}>
                                                            {display}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── ITEMS GRID ── */}
                                <div className="bg-[#1E1E1E] border border-[#333] rounded-2xl p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-xs font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                            <span className="w-1 h-4 bg-red-600 rounded-full inline-block" />
                                            {searchQuery
                                                ? `Results for "${searchQuery}"`
                                                : selectedCategory === 'all' ? 'All Items' : selectedCategory}
                                        </h2>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 bg-[#252525] border border-[#444] px-3 py-1 rounded-lg">
                                            {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>

                                    {filteredItems.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 text-center">
                                            <svg className="w-16 h-16 text-gray-800 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            <p className="text-gray-600 font-bold uppercase tracking-widest text-sm">No items found</p>
                                            <p className="text-gray-700 text-xs mt-1">Try a different search or category</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                                            {filteredItems.map(item => {
                                                const inCart = cartItems.find(c => c.id === item.id);
                                                return (
                                                    <div
                                                        key={item.id}
                                                        id={`item-${item.id}`}
                                                        onClick={() => addToCart(item)}
                                                        className={`cashier-order-item-card relative rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200 border ${inCart
                                                            ? 'border-red-600 ring-2 ring-red-600/30 shadow-lg shadow-red-600/10'
                                                            : 'border-[#333] hover:border-red-600/40'
                                                            } bg-[#161616] hover:bg-[#1a1a1a] active:scale-95`}
                                                        style={{
                                                            height: '238px',
                                                            minHeight: '238px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            background: '#FFFFFF',
                                                            borderColor: '#D7E7DC',
                                                            borderRadius: '8px',
                                                            overflow: 'hidden'
                                                        }}
                                                    >
                                                        {/* Image */}
                                                        <div
                                                            className="cashier-order-item-media"
                                                            style={{
                                                                height: '104px',
                                                                minHeight: '104px',
                                                                maxHeight: '104px',
                                                                flex: '0 0 104px',
                                                                background: '#F8FCFA',
                                                                borderBottom: '1px solid #E3ECE6',
                                                                overflow: 'hidden'
                                                            }}
                                                        >
                                                            {item.image ? (
                                                                <img
                                                                    src={item.image}
                                                                    alt={item.name}
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                                    onError={e => {
                                                                        e.target.onerror = null;
                                                                        e.target.style.display = 'none';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-[#252525]">
                                                                    <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                                    </svg>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* In-cart badge */}
                                                        {inCart && (
                                                            <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-black rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                                                                {inCart.quantity}
                                                            </div>
                                                        )}

                                                        {/* Info */}
                                                        <div
                                                            className="cashier-order-item-info p-3"
                                                            style={{
                                                                display: 'flex',
                                                                flex: '1 1 auto',
                                                                flexDirection: 'column',
                                                                justifyContent: 'flex-start',
                                                                minHeight: '134px',
                                                                padding: '14px',
                                                                background: '#FFFFFF',
                                                                color: '#132238',
                                                                position: 'relative',
                                                                zIndex: 2
                                                            }}
                                                        >
                                                            <p
                                                                className="cashier-order-item-name"
                                                                style={{
                                                                    margin: 0,
                                                                    color: '#132238',
                                                                    fontSize: '0.86rem',
                                                                    fontWeight: 500,
                                                                    lineHeight: 1.3,
                                                                    minHeight: '34px',
                                                                    overflow: 'hidden'
                                                                }}
                                                            >
                                                                {item.name || 'Unnamed item'}
                                                            </p>
                                                            {(item.category || item.category_name) && (
                                                                <p
                                                                    className="cashier-order-item-category"
                                                                    style={{
                                                                        margin: '6px 0 0',
                                                                        color: '#64748B',
                                                                        fontSize: '0.72rem',
                                                                        fontWeight: 400,
                                                                        letterSpacing: '0.04em',
                                                                        lineHeight: 1.25,
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        whiteSpace: 'nowrap',
                                                                        textTransform: 'uppercase'
                                                                    }}
                                                                >
                                                                    {item.category || item.category_name}
                                                                </p>
                                                            )}
                                                            <p
                                                                className="cashier-order-item-price"
                                                                style={{
                                                                    margin: 'auto 0 0',
                                                                    color: '#132238',
                                                                    fontSize: '0.92rem',
                                                                    fontWeight: 500,
                                                                    lineHeight: 1.25
                                                                }}
                                                            >
                                                                Rs. {parseFloat(item.price || 0).toFixed(2)}
                                                            </p>
                                                            {getPriceTiers(item).length > 1 && (
                                                                <div style={{
                                                                    marginTop: '4px',
                                                                    color: '#64748B',
                                                                    fontSize: '0.66rem',
                                                                    fontWeight: 600,
                                                                    lineHeight: 1.2
                                                                }}>
                                                                    {getPriceTiers(item).slice(0, 2).map((tier, index) => (
                                                                        <div key={`${tier.selling_price}-${index}`}>
                                                                            {tier.quantity_remaining} {item.unit} @ Rs. {parseFloat(tier.selling_price || 0).toFixed(2)}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Add overlay on hover */}
                                                        <div className="absolute inset-0 flex items-center justify-center bg-red-600/0 group-hover:bg-red-600/5 transition-all pointer-events-none" />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* ════════════════════ RIGHT: CART ════════════════════ */}
                    <div className={`lg:w-80 xl:w-96 ${showCart ? 'block' : 'hidden lg:block'}`}>
                        <div className="bg-[#1E1E1E] border border-[#333] rounded-2xl p-6 lg:sticky lg:top-6">

                            {/* Cart header */}
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#2a2a2a]">
                                <h3 className="font-black uppercase tracking-widest text-sm">
                                    Order Cart
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-red-500 bg-red-600/10 border border-red-600/20 px-3 py-1 rounded-full">
                                        {cartCount} item{cartCount !== 1 ? 's' : ''}
                                    </span>
                                    <button
                                        onClick={() => setShowCart(false)}
                                        className="lg:hidden text-gray-500 hover:text-gray-300 transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Barcode scanner input box */}
                            <div className="mb-6 bg-[#161616] border border-[#2a2a2a] rounded-xl p-3.5 shadow-inner">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[#ffb74d] mb-1.5 flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-[#ffb74d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                    </svg>
                                    Barcode Scanner / ID Input
                                </label>
                                <form onSubmit={handleBarcodeSubmit} className="flex gap-2 items-stretch">
                                    <input
                                        type="text"
                                        value={barcodeInput}
                                        onChange={(e) => setBarcodeInput(e.target.value)}
                                        placeholder="Scan or type barcode..."
                                        className="flex-1 bg-[#0d0d0d] border border-[#333] rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-[#ffb74d] focus:ring-1 focus:ring-[#ffb74d]/30 transition-all font-bold"
                                    />
                                    <button
                                        type="submit"
                                        className="px-3 bg-[#1a1a1a] border border-[#333] hover:border-[#ffb74d] text-gray-500 hover:text-[#ffb74d] rounded-xl transition-all cursor-pointer flex items-center justify-center hover:bg-[#252525] active:scale-95 shadow-md"
                                        title="Add Item"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>
                                </form>
                                {barcodeError && (
                                    <span className="text-[10px] text-red-500 font-bold mt-1.5 block animate-pulse">
                                        ⚠️ {barcodeError}
                                    </span>
                                )}
                            </div>

                            {/* Cart items */}
                            {cartItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-14 text-center">
                                    <svg className="w-14 h-14 text-gray-800 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                                            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    <p className="text-gray-600 font-bold uppercase tracking-widest text-xs">Cart is empty</p>
                                    <p className="text-gray-700 text-xs mt-1">Click items to add them</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1 mb-4 custom-scrollbar">
                                    {cartItems.map(item => {
                                        const tieredLine = calculateTieredLine(item, item.quantity);
                                        return (
                                        <div key={item.id} className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-3 flex gap-3">
                                            {/* Thumbnail */}
                                            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-[#252525]">
                                                {item.image
                                                    ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                    : <div className="w-full h-full flex items-center justify-center">
                                                        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                        </svg>
                                                    </div>
                                                }
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-white text-xs leading-tight truncate mb-1">{item.name}</p>
                                                <p className="text-[10px] text-gray-500 font-medium mb-1">
                                                    Buying price: Rs. {(parseFloat(item.buyingPrice || 0)).toFixed(2)}
                                                </p>
                                                <p className="text-red-500 font-black text-xs mb-2">
                                                    Rs. {tieredLine.total.toFixed(2)}
                                                </p>
                                                {tieredLine.allocations.length > 1 && (
                                                    <div className="text-[10px] text-gray-500 font-semibold mb-2">
                                                        {tieredLine.allocations.map((allocation, index) => (
                                                            <div key={`${allocation.price}-${index}`}>
                                                                {allocation.quantity} @ Rs. {allocation.price.toFixed(2)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Qty controls */}
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1 bg-[#0d0d0d] rounded-lg border border-[#333] p-0.5">
                                                        <button
                                                            onClick={() => changeQty(item.id, -1)}
                                                            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-[#333] transition-all text-sm font-bold"
                                                        >−</button>
                                                        <span className="w-6 text-center text-xs font-black text-white">{item.quantity}</span>
                                                        <button
                                                            onClick={() => changeQty(item.id, +1)}
                                                            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-[#333] transition-all text-sm font-bold"
                                                        >+</button>
                                                    </div>
                                                    <button
                                                        onClick={() => removeFromCart(item.id)}
                                                        className="ml-auto p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white hover:shadow-lg hover:shadow-red-500/30 rounded-lg transition-all active:scale-95"
                                                        title="Remove"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                    })}
                                </div>
                            )}

                            {/* Total + Submit */}
                            {cartItems.length > 0 && (
                                <>
                                    <div className="mb-4">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Customer Mobile (Optional)</label>
                                        <input
                                            type="tel"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            placeholder="e.g. 07XXXXXXXX"
                                            className="w-full bg-[#161616] border border-[#333] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/30 transition-all font-bold"
                                        />
                                    </div>
                                    <div className="border-t border-[#2a2a2a] pt-4 mb-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500 text-xs font-black uppercase tracking-widest">Total</span>
                                            <span className="text-red-500 font-black text-xl tabular-nums">
                                                Rs. {cartTotal.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {submitError && (
                                        <div className="mb-3 p-3 bg-red-900/20 border border-red-700/30 rounded-xl text-red-400 text-xs font-medium">
                                            {submitError}
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <button
                                            id="confirm-order-btn"
                                            onClick={handleSubmit}
                                            disabled={submitting}
                                            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-red-600/20 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {submitting ? (
                                                <>
                                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                    Processing…
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Confirm Order
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setCartItems([])}
                                            className="w-full py-3 bg-red-500/5 hover:bg-red-500/10 text-red-500 hover:text-red-400 font-bold text-xs uppercase tracking-widest rounded-xl border border-red-500/20 hover:border-red-500/40 transition-all active:scale-95"
                                        >
                                            Clear Cart
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
};

export default CashierNewOrderPage;
