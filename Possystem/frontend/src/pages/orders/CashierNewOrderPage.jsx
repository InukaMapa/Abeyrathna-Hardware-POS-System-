import React, { useState, useEffect, useMemo, useRef } from 'react';
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

const getPriceTiers = (item) => {
    const tiers = Array.isArray(item?.priceTiers) && item.priceTiers.length > 0
        ? item.priceTiers
        : [{
            id: 'tier_init_' + item?.id,
            quantity_remaining: item?.quantity || 0,
            selling_price: item?.price || 0,
            buying_price: item?.buyingPrice || 0,
            created_at: new Date()
        }];
    
    return tiers.map((t, idx) => ({
        ...t,
        id: t.id || `tier_${idx}_${item?.id}`
    }));
};

const getAvailableTiers = (item) => {
    return getPriceTiers(item).filter(t => parseFloat(t.quantity_remaining || 0) > 0);
};

const calculateTieredLine = (item, quantity) => {
    if (item.batchId) {
        const price = parseFloat(item.price || 0);
        return {
            total: price * quantity,
            allocations: [{ quantity, price }]
        };
    }

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
    const searchInputRef = useRef(null);

    /* ── data state ── */
    const [inventoryItems, setInventoryItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /* ── ui state ── */
    const [cartItems, setCartItems] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [checkingShift, setCheckingShift] = useState(true);
    const [hasOpenShift, setHasOpenShift] = useState(false);

    /* ── barcode search state ── */
    const [barcodeInput, setBarcodeInput] = useState('');
    const [barcodeError, setBarcodeError] = useState(null);
    const [dropdownIndex, setDropdownIndex] = useState(-1);
    const [showDropdown, setShowDropdown] = useState(false);

    /* ── checkout details state ── */
    const [customerName, setCustomerName] = useState(editOrder?.customer_name || '');
    const [customerPhone, setCustomerPhone] = useState(editOrder?.customer_phone || '');
    const [overallDiscountType, setOverallDiscountType] = useState(editOrder?.discount_type || 'fixed'); 
    const [overallDiscountValue, setOverallDiscountValue] = useState(editOrder?.discount || 0);
    const [otherCharges, setOtherCharges] = useState(editOrder?.other_charges || 0);
    const [otherChargesReason, setOtherChargesReason] = useState(editOrder?.other_charges_reason || '');
    const [otherChargesReasonError, setOtherChargesReasonError] = useState('');
    const [notes, setNotes] = useState(editOrder?.notes || '');
    const [paymentMethods, setPaymentMethods] = useState([
        { id: Date.now(), method: 'Cash', amount: '' }
    ]);

    /* ── multiple price modal state ── */
    const [priceModalItem, setPriceModalItem] = useState(null);
    const [selectedTierId, setSelectedTierId] = useState(null);
    const [modalQuantity, setModalQuantity] = useState(1);
    const [overlimitModal, setOverlimitModal] = useState(null);

    // Initialize cart from editOrder if present
    useEffect(() => {
        if (editOrder && editOrder.order_items) {
            const initialCart = editOrder.order_items.map(item => {
                let batchId = null;
                if (Array.isArray(item.selected_variants)) {
                    const batchVariant = item.selected_variants.find(v => v.type === 'STOCK_BATCH');
                    if (batchVariant) {
                        batchId = batchVariant.batch_item_id;
                    }
                }
                return {
                    id: item.item_id,
                    name: item.item_name,
                    price: parseFloat(item.item_price) || 0,
                    buyingPrice: parseFloat(item.buying_price || item.buying_price_at_time || 0),
                    quantity: item.quantity,
                    batchId: batchId,
                    discount: 0
                };
            });
            setCartItems(initialCart);
            setCustomerName(editOrder.customer_name || '');
            setCustomerPhone(editOrder.customer_phone || '');
            setOverallDiscountValue(editOrder.discount || 0);
            setOtherCharges(editOrder.other_charges || 0);
            setOtherChargesReason(editOrder.other_charges_reason || '');
            setNotes(editOrder.notes || '');
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

                const items = await fetchInventoryItems();
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
                console.error('Failed to load inventory:', err);
                setError('Failed to load products. Please refresh.');
                setCheckingShift(false);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user?.full_name, user?.name, user?.username]);

    /* ── search matches computation ── */
    const searchMatches = useMemo(() => {
        const query = barcodeInput.trim().toLowerCase();
        if (!query) return [];
        return inventoryItems.filter(item => 
            (item.name || '').toLowerCase().includes(query) ||
            (item.item_code || '').toLowerCase().includes(query)
        );
    }, [inventoryItems, barcodeInput]);

    useEffect(() => {
        setDropdownIndex(-1);
        if (searchMatches.length > 0) {
            setShowDropdown(true);
        } else {
            setShowDropdown(false);
        }
    }, [searchMatches]);

    /* ── click outside listener for dropdown ── */
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchInputRef.current && !searchInputRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    /* ── cart helpers ── */
    const getAvailableTiersExcludingCart = (item, currentCartItems) => {
        const tiers = getPriceTiers(item);
        return tiers.filter(t => {
            const qtyInCart = (currentCartItems || [])
                .filter(c => c.id === item.id && c.batchId === t.id)
                .reduce((sum, c) => sum + c.quantity, 0);
            const limit = parseFloat(t.quantity_remaining || 0);
            return (limit - qtyInCart) > 0;
        });
    };

    const addToCartWithTier = (item, tier, qty = 1) => {
        const tierLimit = parseFloat(tier.quantity_remaining || 0);
        const currentInCart = cartItems
            .filter(c => c.id === item.id && c.batchId === tier.id)
            .reduce((sum, c) => sum + c.quantity, 0);

        const maxCanAdd = Math.max(0, tierLimit - currentInCart);

        if (maxCanAdd <= 0) {
            const otherTiers = getAvailableTiersExcludingCart(item, cartItems);
            setOverlimitModal({
                show: true,
                item: item,
                currentBatchId: tier.id,
                currentLimit: tierLimit,
                unit: item.unit || 'pcs',
                hasOtherTiers: otherTiers.length > 0,
                otherTiers: otherTiers
            });
            return;
        }

        const actualQtyToAdd = Math.min(qty, maxCanAdd);

        setCartItems(prev => {
            const existingIndex = prev.findIndex(c => c.id === item.id && c.batchId === tier.id);
            if (existingIndex > -1) {
                return prev.map((c, index) =>
                    index === existingIndex
                        ? { ...c, quantity: c.quantity + actualQtyToAdd }
                        : c
                );
            }
            return [...prev, {
                id: item.id,
                name: item.name,
                price: parseFloat(tier.selling_price || item.price || 0),
                buyingPrice: parseFloat(tier.buying_price || item.buyingPrice || 0),
                priceTiers: item.priceTiers || [],
                image: item.image,
                quantity: actualQtyToAdd,
                batchId: tier.id,
                discount: 0
            }];
        });
    };

    const changeQty = (id, batchId, delta) => {
        if (delta <= 0) {
            setCartItems(prev => prev.map(c => {
                if (c.id === id && c.batchId === batchId) {
                    return { ...c, quantity: Math.max(1, c.quantity + delta) };
                }
                return c;
            }));
            return;
        }

        const inventoryItem = inventoryItems.find(i => i.id === id);
        const currentCartItem = cartItems.find(c => c.id === id && c.batchId === batchId);
        if (!inventoryItem || !currentCartItem) return;

        const tiers = getPriceTiers(inventoryItem);
        const currentTier = tiers.find(t => t.id === batchId);
        const tierMaxLimit = currentTier ? parseFloat(currentTier.quantity_remaining || 0) : parseFloat(inventoryItem.quantity || 0);

        const proposedQty = currentCartItem.quantity + delta;

        if (proposedQty > tierMaxLimit) {
            const otherTiers = getAvailableTiersExcludingCart(inventoryItem, cartItems);
            
            setOverlimitModal({
                show: true,
                item: inventoryItem,
                currentBatchId: batchId,
                currentLimit: tierMaxLimit,
                unit: inventoryItem.unit || 'pcs',
                hasOtherTiers: otherTiers.length > 0,
                otherTiers: otherTiers
            });
            return;
        }

        setCartItems(prev => prev.map(c => {
            if (c.id === id && c.batchId === batchId) {
                return { ...c, quantity: c.quantity + delta };
            }
            return c;
        }));
    };

    const handleDirectQtyInput = (id, batchId, rawValue) => {
        const parsed = parseInt(rawValue, 10);
        if (isNaN(parsed) || parsed < 1) {
            setCartItems(prev => prev.map(c => {
                if (c.id === id && c.batchId === batchId) {
                    return { ...c, quantity: 1 };
                }
                return c;
            }));
            return;
        }

        const inventoryItem = inventoryItems.find(i => i.id === id);
        const currentCartItem = cartItems.find(c => c.id === id && c.batchId === batchId);
        if (!inventoryItem || !currentCartItem) return;

        const tiers = getPriceTiers(inventoryItem);
        const currentTier = tiers.find(t => t.id === batchId);
        const tierMaxLimit = currentTier ? parseFloat(currentTier.quantity_remaining || 0) : parseFloat(inventoryItem.quantity || 0);

        if (parsed > tierMaxLimit) {
            setCartItems(prev => prev.map(c => {
                if (c.id === id && c.batchId === batchId) {
                    return { ...c, quantity: Math.max(1, tierMaxLimit) };
                }
                return c;
            }));

            const excessNeeded = Math.max(1, parsed - tierMaxLimit);
            const otherTiers = getAvailableTiersExcludingCart(inventoryItem, cartItems);

            setOverlimitModal({
                show: true,
                item: inventoryItem,
                currentBatchId: batchId,
                currentLimit: tierMaxLimit,
                excessNeeded: excessNeeded,
                unit: inventoryItem.unit || 'pcs',
                hasOtherTiers: otherTiers.length > 0,
                otherTiers: otherTiers
            });
            return;
        }

        setCartItems(prev => prev.map(c => {
            if (c.id === id && c.batchId === batchId) {
                return { ...c, quantity: parsed };
            }
            return c;
        }));
    };

    const removeFromCart = (id, batchId) =>
        setCartItems(prev => prev.filter(c => !(c.id === id && c.batchId === batchId)));

    const handleItemClick = (item) => {
        if (item.quantity <= 0) {
            setBarcodeError('Item is out of stock!');
            setTimeout(() => setBarcodeError(null), 3000);
            return;
        }

        const availableTiers = getAvailableTiersExcludingCart(item, cartItems);
        if (availableTiers.length > 1) {
            setPriceModalItem(item);
            setSelectedTierId(availableTiers[0].id);
            setModalQuantity(1);
        } else if (availableTiers.length === 1) {
            addToCartWithTier(item, availableTiers[0], 1);
        } else {
            setOverlimitModal({
                show: true,
                item: item,
                currentBatchId: null,
                currentLimit: item.quantity || 0,
                unit: item.unit || 'pcs',
                hasOtherTiers: false,
                otherTiers: []
            });
        }
    };

    /* ── barcode scanner handler ── */
    const processBarcode = (inputStr) => {
        setBarcodeError(null);
        const input = inputStr.trim();
        if (!input) return;

        const foundItem = inventoryItems.find(
            item => item.item_code && item.item_code.toLowerCase() === input.toLowerCase()
        );

        if (foundItem) {
            handleItemClick(foundItem);
            setBarcodeInput('');
            setShowDropdown(false);
        } else {
            setBarcodeError('Barcode ID not found!');
            setTimeout(() => setBarcodeError(null), 3000);
        }
    };

    const handleBarcodeSubmit = (e) => {
        if (e) e.preventDefault();
        processBarcode(barcodeInput);
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setDropdownIndex(prev => Math.min(prev + 1, searchMatches.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setDropdownIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (dropdownIndex >= 0 && dropdownIndex < searchMatches.length) {
                handleItemClick(searchMatches[dropdownIndex]);
                setBarcodeInput('');
                setDropdownIndex(-1);
                setShowDropdown(false);
            } else {
                processBarcode(barcodeInput);
            }
        } else if (e.key === 'Escape') {
            setShowDropdown(false);
            setDropdownIndex(-1);
        }
    };

    // Global listener for barcode scanners (rapid character entry)
    useEffect(() => {
        let barcodeBuffer = '';
        let lastKeyTime = Date.now();

        const handleKeyDown = (e) => {
            const currentTime = Date.now();
            if (currentTime - lastKeyTime > 50) {
                barcodeBuffer = '';
            }

            if (e.key === 'Enter' && barcodeBuffer.length > 2) {
                e.preventDefault();
                processBarcode(barcodeBuffer);
                barcodeBuffer = '';
            } else if (e.key.length === 1) {
                barcodeBuffer += e.key;
            }
            lastKeyTime = currentTime;
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [inventoryItems]);

    /* ── derived checkout math ── */
    const subtotal = cartItems.reduce((s, c) => s + calculateTieredLine(c, c.quantity).total, 0);
    const cartCount = cartItems.reduce((s, c) => s + c.quantity, 0);
    const totalItemDiscounts = cartItems.reduce((sum, item) => sum + (parseFloat(item.discount) || 0), 0);
    const priceAfterItemDiscounts = subtotal - totalItemDiscounts;

    let overallDiscountAmount = 0;
    if (overallDiscountType === 'fixed') {
        overallDiscountAmount = parseFloat(overallDiscountValue) || 0;
    } else {
        overallDiscountAmount = priceAfterItemDiscounts * ((parseFloat(overallDiscountValue) || 0) / 100);
    }

    const parsedOtherCharges = parseFloat(otherCharges) || 0;
    const hasOtherCharges = parsedOtherCharges > 0;
    const normalizedOtherChargesReason = otherChargesReason.trim();
    const grandTotal = Math.max(0, priceAfterItemDiscounts - overallDiscountAmount + parsedOtherCharges);

    const totalReceived = paymentMethods.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const balance = totalReceived - grandTotal;

    /* ── payment registry helpers ── */
    const addPaymentMethod = () => {
        setPaymentMethods([...paymentMethods, { id: Date.now(), method: 'Card', amount: '' }]);
    };

    const updatePaymentMethod = (id, field, value) => {
        setPaymentMethods(paymentMethods.map(p =>
            p.id === id ? { ...p, [field]: value } : p
        ));
    };

    const removePaymentMethod = (id) => {
        if (paymentMethods.length > 1) {
            setPaymentMethods(paymentMethods.filter(p => p.id !== id));
        }
    };

    /* ── submit flows ── */
    const handleHoldOrder = async () => {
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
                    batchId: c.batchId,
                    variants: [],
                })),
            };

            if (editOrder) {
                const response = await fetch(`${API_BASE_URL}/orders/${editOrder.order_id}/cart`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(orderData)
                });
                if (!response.ok) {
                    const errPayload = await response.json().catch(() => ({}));
                    throw new Error(errPayload.error || 'Failed to update order cart.');
                }
                alert(`✅ Order #${editOrder.order_id} updated & saved on hold.`);
            } else {
                const res = await createOrder(orderData);
                const orderId = res.id || res.orderId || res.order_id;
                alert(`✅ Order #${orderId || ''} saved on hold.`);
            }
            onNavigate('orders');
        } catch (err) {
            console.error('Hold order failed:', err);
            setSubmitError(err.message || 'Failed to save order. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCompletePayment = async () => {
        if (cartItems.length === 0) return;
        if (hasOtherCharges && !normalizedOtherChargesReason) {
            setOtherChargesReasonError('Reason is required when other charges are added.');
            return;
        }

        if (totalReceived < grandTotal) {
            if (!window.confirm(`Amount received (Rs. ${totalReceived.toFixed(2)}) is less than Grand Total (Rs. ${grandTotal.toFixed(2)}). Continue?`)) {
                return;
            }
        }

        setSubmitting(true);
        setSubmitError(null);

        try {
            const orderData = {
                table_id: null,
                customer_phone: customerPhone || null,
                items: cartItems.map(c => ({
                    id: c.id,
                    quantity: c.quantity,
                    batchId: c.batchId,
                    variants: [],
                })),
            };

            let orderId = editOrder?.order_id;

            if (editOrder) {
                const response = await fetch(`${API_BASE_URL}/orders/${editOrder.order_id}/cart`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(orderData)
                });
                if (!response.ok) {
                    const errPayload = await response.json().catch(() => ({}));
                    throw new Error(errPayload.error || 'Failed to update order.');
                }
            } else {
                const res = await createOrder(orderData);
                orderId = res.id || res.orderId || res.order_id;
            }

            const token = localStorage.getItem('token');
            const normalizedPayments = paymentMethods.map(payment => {
                const enteredAmount = parseFloat(payment.amount);
                const shouldUseFullTotal = paymentMethods.length === 1 && payment.method === 'Cash' && !Number.isFinite(enteredAmount);
                return {
                    method: payment.method,
                    amount: shouldUseFullTotal ? grandTotal : (Number.isFinite(enteredAmount) ? enteredAmount : 0)
                };
            });

            const closeResponse = await fetch(`${API_BASE_URL}/orders/${orderId}/close`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    final_total: grandTotal,
                    customer_phone: customerPhone,
                    customer_name: customerName,
                    discount: overallDiscountAmount,
                    other_charges: parsedOtherCharges,
                    other_charges_reason: hasOtherCharges ? normalizedOtherChargesReason : null,
                    payments: normalizedPayments,
                    notes: notes
                })
            });

            if (!closeResponse.ok) {
                const errPayload = await closeResponse.json().catch(() => ({}));
                throw new Error(errPayload.error || 'Failed to process payment completion.');
            }

            alert(`✅ Order #${orderId} completed successfully!`);
            onNavigate('bill-open', { orderId });
        } catch (err) {
            console.error('Payment flow failed:', err);
            setSubmitError(err.message || 'Error completing payment.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelOrder = async () => {
        if (editOrder) {
            if (!window.confirm('Cancel this bill? This completely deletes the order.')) return;
            setSubmitting(true);
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/orders/${editOrder.order_id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    alert('Order Cancelled.');
                    onNavigate('orders');
                } else {
                    alert('Failed to cancel.');
                }
            } catch (err) {
                alert('Error cancelling order');
            } finally {
                setSubmitting(false);
            }
        } else {
            if (window.confirm('Clear all items and reset order?')) {
                setCartItems([]);
                setCustomerName('');
                setCustomerPhone('');
                setOverallDiscountValue(0);
                setOtherCharges(0);
                setOtherChargesReason('');
                setNotes('');
                setPaymentMethods([{ id: Date.now(), method: 'Cash', amount: '' }]);
            }
        }
    };

    if (checkingShift || loading) {
        return (
            <DashboardLayout onNavigate={onNavigate} activePage="orders">
                <div className="cashier-new-order-page px-4 py-4 md:px-6">
                    <div className="orders-state-card flex flex-col items-center justify-center py-20 bg-white border border-[#D7E7DC] rounded-xl shadow">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4" />
                        <p className="text-gray-600 font-medium">{checkingShift ? 'Checking shift status...' : 'Loading products workspace...'}</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!hasOpenShift) {
        return (
            <DashboardLayout onNavigate={onNavigate} activePage="orders">
                <div className="cashier-new-order-page px-4 py-4 md:px-6">
                    <div className="flex flex-col items-center justify-center text-center py-16 bg-white border border-[#D7E7DC] rounded-xl shadow max-w-lg mx-auto">
                        <div className="text-red-500 mb-4">
                            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Shift Started Required</h2>
                        <p className="text-gray-500 text-sm px-6 mb-6">You cannot create or update orders until an active cash shift is started in the Cash Counter.</p>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => onNavigate('cash-counter')}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition"
                            >
                                Start Shift
                            </button>
                            <button
                                type="button"
                                onClick={() => onNavigate('orders')}
                                className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg font-semibold hover:bg-gray-200 transition"
                            >
                                Back to Orders
                            </button>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout onNavigate={onNavigate} activePage="orders">
            <div className="cashier-new-order-page px-4 py-2 md:px-6 flex flex-col gap-3">

                {/* ── PAGE HEADER (Compact) ── */}
                <div className="bg-white border border-[#D7E7DC] rounded-xl p-3 shadow flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                if (editOrder) {
                                    onNavigate('bill-open', { orderId: editOrder.order_id });
                                } else {
                                    onNavigate('orders');
                                }
                            }}
                            className="cashier-order-back-btn flex items-center justify-center"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 m-0">
                                {editOrder ? `Update Invoice #${editOrder.order_id}` : 'POS Billing Terminal'}
                            </h2>
                            <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mt-0.5">
                                {editOrder ? 'Modify pending transaction' : 'Create new customer transaction'}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[9px] font-bold text-gray-400 block uppercase tracking-wider">Cashier Name</span>
                        <span className="text-xs font-semibold text-gray-700">{user?.full_name || user?.name || user?.username || 'CASHIER'}</span>
                    </div>
                </div>

                {/* ── MAIN WORKSPACE LAYOUT (Compact) ── */}
                <div className="flex flex-col lg:flex-row gap-4 items-start">

                    {/* LEFT COLUMN: TRANSACTION & CART (COMPACT) */}
                    <div className="flex-1 lg:flex-[2] flex flex-col gap-3 w-full">
                        
                        {/* Autocomplete Barcode & Search Input (Compact) */}
                        <div className="bg-white border border-[#D7E7DC] rounded-xl p-3 shadow flex flex-col gap-2 relative">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                    </svg>
                                    Barcode / Item Name Search
                                </label>
                                {barcodeError && (
                                    <span className="text-[10px] text-red-500 font-semibold animate-pulse">
                                        ⚠️ {barcodeError}
                                    </span>
                                )}
                            </div>

                            <div ref={searchInputRef} className="relative w-full">
                                <form onSubmit={handleBarcodeSubmit} className="flex gap-2 items-stretch">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            value={barcodeInput}
                                            onChange={(e) => setBarcodeInput(e.target.value)}
                                            onKeyDown={handleSearchKeyDown}
                                            onFocus={() => { if (searchMatches.length > 0) setShowDropdown(true); }}
                                            placeholder="Type product name or scan item barcode here..."
                                            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-[#D7E7DC] rounded-lg text-gray-800 font-medium focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/30 transition-all text-xs"
                                        />
                                        <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-gray-400">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        className="px-3 bg-[#F8FCFA] border border-[#D7E7DC] hover:border-emerald-600 text-[#166534] hover:bg-emerald-50 rounded-lg transition-all cursor-pointer flex items-center justify-center shadow-sm"
                                    >
                                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>
                                </form>

                                {/* Dropdown menu overlay */}
                                {showDropdown && searchMatches.length > 0 && (
                                    <div className="absolute z-[100] top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-[#D7E7DC] rounded-lg shadow-xl divide-y divide-gray-100 custom-scrollbar">
                                        {searchMatches.map((item, idx) => {
                                            const isSelected = idx === dropdownIndex;
                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => {
                                                        handleItemClick(item);
                                                        setBarcodeInput('');
                                                        setShowDropdown(false);
                                                    }}
                                                    className={`px-3 py-2 cursor-pointer flex items-center justify-between transition-colors ${isSelected ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-gray-50'}`}
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-semibold text-gray-800">{item.name}</span>
                                                        <span className="text-[10px] text-gray-400 font-mono">CODE: {item.item_code || 'N/A'}</span>
                                                    </div>
                                                    <div className="text-right flex flex-col">
                                                        <span className="text-xs font-bold text-gray-700">Rs. {parseFloat(item.price || 0).toFixed(2)}</span>
                                                        <span className={`text-[9px] font-bold uppercase ${item.quantity > 5 ? 'text-emerald-600' : item.quantity > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                                                            {item.quantity > 0 ? `${item.quantity} ${item.unit || 'pcs'} left` : 'Out of stock'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Billed Items Cart Table (Compact) */}
                        <div className="bg-white border border-[#D7E7DC] rounded-xl shadow overflow-hidden flex flex-col">
                            <div className="px-4 py-2.5 border-b border-[#D7E7DC] bg-[#F8FCFA] flex justify-between items-center">
                                <h3 className="text-xs font-semibold text-emerald-800 uppercase tracking-widest flex items-center gap-1.5">
                                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    Billed Items Cart
                                </h3>
                                <span className="text-[10px] font-bold text-emerald-800 bg-[#E3ECE6] px-2 py-0.5 rounded-full">
                                    {cartCount} {cartCount === 1 ? 'item' : 'items'}
                                </span>
                            </div>

                            <div className="overflow-x-auto max-h-[50vh] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-[#FAFCFB] border-b border-[#D7E7DC] uppercase text-[9px] tracking-widest text-emerald-800 font-bold sticky top-0 z-10">
                                        <tr>
                                            <th className="px-3 py-2">Item details</th>
                                            <th className="px-3 py-2">SKU / Code</th>
                                            <th className="px-3 py-2 text-center" style={{ width: '90px' }}>Qty</th>
                                            <th className="px-3 py-2 text-right">Unit Price</th>
                                            <th className="px-3 py-2 text-right">Buying Price</th>
                                            <th className="px-3 py-2 text-right" style={{ width: '80px' }}>Discount</th>
                                            <th className="px-3 py-2 text-right border-l border-[#D7E7DC]">Net Total</th>
                                            <th className="px-3 py-2 text-center" style={{ width: '50px' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#D7E7DC]">
                                        {cartItems.map((item) => {
                                            const tieredLine = calculateTieredLine(item, item.quantity);
                                            const lineDiscount = parseFloat(item.discount) || 0;
                                            const netTotal = Math.max(0, tieredLine.total - lineDiscount);
                                            return (
                                                <tr key={`${item.id}-${item.batchId}`} className="hover:bg-[#FAFCFB] transition-colors text-xs">
                                                    <td className="px-3 py-2">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-gray-800">{item.name}</span>
                                                            {item.batchId && (
                                                                <span className="text-[8px] text-amber-600 font-bold uppercase tracking-wider">
                                                                    Batch: {item.batchId.startsWith('tier_init_') ? 'Initial Stock' : item.batchId.slice(-6).toUpperCase()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 font-mono text-gray-500 text-[10px]">SYS-{item.id}</td>
                                                    <td className="px-3 py-2 text-center">
                                                         <div className="flex items-center justify-center gap-0.5 bg-gray-50 border border-[#D7E7DC] rounded-md p-0.5 max-w-[90px] mx-auto">
                                                             <button
                                                                 type="button"
                                                                 onClick={() => changeQty(item.id, item.batchId, -1)}
                                                                 className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors font-bold text-[10px] shrink-0"
                                                             >-</button>
                                                             <input
                                                                 type="number"
                                                                 min="1"
                                                                 value={item.quantity}
                                                                 onChange={(e) => handleDirectQtyInput(item.id, item.batchId, e.target.value)}
                                                                 className="w-8 text-center text-xs font-bold text-gray-800 bg-transparent outline-none p-0 focus:ring-1 focus:ring-emerald-500 rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                             />
                                                             <button
                                                                 type="button"
                                                                 onClick={() => changeQty(item.id, item.batchId, 1)}
                                                                 className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors font-bold text-[10px] shrink-0"
                                                             >+</button>
                                                         </div>
                                                     </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <span className="font-mono text-gray-700 font-bold">Rs. {parseFloat(item.price).toFixed(2)}</span>
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <span className="font-mono text-gray-400 text-[10px]">Rs. {parseFloat(item.buyingPrice || 0).toFixed(2)}</span>
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            className="w-full bg-gray-50 border border-[#D7E7DC] rounded px-1.5 py-0.5 text-right text-red-500 font-bold outline-none text-xs focus:border-red-500"
                                                            value={item.discount || ''}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value) || 0;
                                                                setCartItems(prev => prev.map(c => 
                                                                    c.id === item.id && c.batchId === item.batchId ? { ...c, discount: val } : c
                                                                ));
                                                            }}
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-right border-l border-[#D7E7DC]">
                                                        <span className="font-bold text-gray-800 tabular-nums">Rs. {netTotal.toFixed(2)}</span>
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        <button
                                                            onClick={() => removeFromCart(item.id, item.batchId)}
                                                            className="p-1 bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white rounded-md transition-colors flex items-center justify-center mx-auto"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {cartItems.length === 0 && (
                                            <tr>
                                                <td colSpan={8} className="text-center py-12 text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                                                    Your transaction billed items list is empty.<br/>
                                                    <span className="text-[9px] text-gray-400 mt-1 block normal-case font-medium">Scan a barcode or use the search bar above to add products.</span>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>

                    {/* ════════════════════ RIGHT: SINGLE CONSOLIDATED POS SIDEBAR ════════════════════ */}
                    <div className="w-full lg:w-[380px] flex-shrink-0 flex flex-col gap-4">
                        
                        {/* Consolidated POS Billing Sidebar Box */}
                        <div className="bg-white border border-[#D7E7DC] rounded-xl p-4 shadow flex flex-col gap-3.5 text-xs">
                            
                            {/* SECTION 1: CUSTOMER DETAILS (COMPACT SIDE-BY-SIDE) */}
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Customer Name</label>
                                    <input
                                        type="text"
                                        value={customerName}
                                        onChange={e => setCustomerName(e.target.value)}
                                        placeholder="Walk-in Customer"
                                        className="w-full px-2 py-1 text-xs bg-gray-50 border border-[#D7E7DC] rounded-md outline-none"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Mobile Contact</label>
                                    <input
                                        type="text"
                                        value={customerPhone}
                                        onChange={e => setCustomerPhone(e.target.value)}
                                        placeholder="Phone number"
                                        className="w-full px-2 py-1 text-xs bg-gray-50 border border-[#D7E7DC] rounded-md outline-none font-mono"
                                    />
                                </div>
                            </div>

                            {/* SECTION 2: PRICING DETAILS */}
                            <div className="border-t border-[#D7E7DC] pt-3 flex flex-col gap-1.5 text-gray-600 font-semibold">
                                <div className="flex justify-between items-center text-xs">
                                    <span>Subtotal</span>
                                    <span className="font-mono text-gray-800">Rs. {subtotal.toFixed(2)}</span>
                                </div>
                                {totalItemDiscounts > 0 && (
                                    <div className="flex justify-between items-center text-red-500 text-xs">
                                        <span>Item Discounts</span>
                                        <span className="font-mono">- Rs. {totalItemDiscounts.toFixed(2)}</span>
                                    </div>
                                )}
                                
                                <div className="flex justify-between items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Overall Discount</span>
                                        <select
                                            value={overallDiscountType}
                                            onChange={(e) => setOverallDiscountType(e.target.value)}
                                            className="bg-gray-50 border border-[#D7E7DC] text-[9px] font-bold rounded px-1 py-0.5 outline-none text-emerald-800"
                                        >
                                            <option value="fixed">Rs.</option>
                                            <option value="percent">%</option>
                                        </select>
                                    </div>
                                    <input
                                        type="number" min="0" step="0.01"
                                        className="w-20 bg-gray-50 border border-[#D7E7DC] rounded px-1.5 py-0.5 text-right text-gray-800 font-mono font-bold outline-none text-xs"
                                        value={overallDiscountValue}
                                        onChange={(e) => setOverallDiscountValue(e.target.value)}
                                        placeholder="0"
                                    />
                                </div>

                                <div className="flex justify-between items-center gap-4">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Other Charges</span>
                                    <input
                                        type="number" min="0" step="0.01"
                                        className={`w-20 bg-gray-50 border rounded px-1.5 py-0.5 text-right text-emerald-600 font-mono font-bold outline-none text-xs ${otherChargesReasonError ? 'border-red-500' : 'border-[#D7E7DC]'}`}
                                        value={otherCharges}
                                        onChange={(e) => {
                                            setOtherCharges(e.target.value);
                                            if ((parseFloat(e.target.value) || 0) <= 0) {
                                                setOtherChargesReasonError('');
                                            }
                                        }}
                                        placeholder="0"
                                    />
                                </div>
                                {hasOtherCharges && (
                                    <div className="flex flex-col gap-1">
                                        <textarea
                                            className={`w-full min-h-[36px] h-9 bg-gray-50 border rounded px-2 py-1 text-gray-700 text-xs outline-none focus:border-emerald-500 transition-colors resize-none ${otherChargesReasonError ? 'border-red-500' : 'border-[#D7E7DC]'}`}
                                            value={otherChargesReason}
                                            onChange={(e) => {
                                                setOtherChargesReason(e.target.value);
                                                if (e.target.value.trim()) {
                                                    setOtherChargesReasonError('');
                                                }
                                            }}
                                            maxLength={120}
                                            placeholder="Reason for charges..."
                                        />
                                        {otherChargesReasonError && (
                                            <p className="text-[9px] font-semibold text-red-500">{otherChargesReasonError}</p>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-between items-end border-t border-[#D7E7DC] pt-2 mt-0.5">
                                    <span className="font-bold text-gray-700 uppercase tracking-wider text-[10px]">Grand Total</span>
                                    <span className="text-lg font-bold text-emerald-600 font-mono">Rs. {grandTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* SECTION 3: PAYMENT REGISTRY */}
                            <div className="border-t border-[#D7E7DC] pt-3 flex flex-col gap-1.5">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payment Registry</span>
                                <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                                    {paymentMethods.map((pm) => (
                                        <div key={pm.id} className="flex items-center gap-1.5">
                                            {paymentMethods.length > 1 && (
                                                <button 
                                                    onClick={() => removePaymentMethod(pm.id)} 
                                                    className="p-1 bg-red-50 border border-red-100 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                            <select
                                                className="bg-gray-50 border border-[#D7E7DC] text-[10px] font-bold uppercase rounded px-1.5 py-1.5 outline-none text-gray-800"
                                                value={pm.method}
                                                onChange={e => updatePaymentMethod(pm.id, 'method', e.target.value)}
                                            >
                                                <option value="Cash">Cash</option>
                                                <option value="Card">Card</option>
                                                <option value="Bank">Bank</option>
                                            </select>
                                            <input
                                                type="number" min="0" step="0.01"
                                                className="flex-1 bg-gray-50 border border-[#D7E7DC] rounded px-2 py-1 text-right text-gray-800 font-mono font-bold outline-none text-xs"
                                                value={pm.amount}
                                                onChange={e => updatePaymentMethod(pm.id, 'amount', e.target.value)}
                                                placeholder={`Rs. ${grandTotal.toFixed(2)}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={addPaymentMethod}
                                    className="w-full py-1 bg-gray-50 border border-dashed border-[#D7E7DC] text-gray-500 rounded text-[9px] font-bold uppercase tracking-widest hover:text-emerald-800 hover:border-emerald-600 transition-colors"
                                >
                                    + Split Payment Option
                                </button>
                                <div className="flex justify-between items-baseline pt-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">
                                        {balance >= 0 ? 'Change To Give' : 'Balance Due'}
                                    </span>
                                    <span className={`font-mono font-bold text-sm ${balance >= 0 ? 'text-emerald-600' : 'text-gray-800'}`}>
                                        Rs. {Math.abs(balance).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* SECTION 4: NOTES & OPERATIONS BUTTONS */}
                            <div className="border-t border-[#D7E7DC] pt-3 flex flex-col gap-2">
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 border border-[#D7E7DC] rounded-lg px-2 py-1.5 text-gray-700 text-xs outline-none focus:border-emerald-500"
                                    placeholder="Add notes..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                                {submitError && (
                                    <div className="p-2 bg-red-50 border border-red-100 rounded text-red-500 text-[10px] font-medium animate-pulse">
                                        {submitError}
                                    </div>
                                )}
                                <div className="flex flex-col gap-2 mt-0.5">
                                    <button
                                        onClick={handleCompletePayment}
                                        disabled={submitting || cartItems.length === 0}
                                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-widest text-xs rounded-lg transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 border-emerald-600"
                                        style={{
                                            backgroundColor: '#16A34A',
                                            color: '#FFFFFF',
                                            borderColor: '#16A34A'
                                        }}
                                    >
                                        {submitting ? 'Processing...' : 'COMPLETE PAYMENT & PRINT'}
                                    </button>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleHoldOrder}
                                            disabled={submitting || cartItems.length === 0}
                                            className="flex-1 py-1.5 bg-gray-50 border border-[#D7E7DC] hover:bg-gray-100 text-gray-700 font-bold uppercase tracking-widest text-[9px] rounded-lg transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            HOLD BILL
                                        </button>
                                        <button
                                            onClick={handleCancelOrder}
                                            disabled={submitting}
                                            className="flex-1 py-1.5 bg-transparent border border-red-200 text-red-500 hover:bg-red-600 hover:text-white hover:border-red-500 font-bold uppercase tracking-widest text-[9px] rounded-lg transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {editOrder ? 'CANCEL BILL' : 'CLEAR CART'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                        </div>

                    </div>

                </div>
            </div>

            {/* Price tier dialog selection */}
            {priceModalItem && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    padding: '16px',
                    backdropFilter: 'blur(3px)',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '20px',
                        width: '100%',
                        maxWidth: '480px',
                        overflow: 'hidden',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '20px 24px',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: '#ffffff'
                        }}>
                            <div>
                                <h3 style={{
                                    margin: 0,
                                    fontSize: '1rem',
                                    fontWeight: 500,
                                    color: '#0f172a',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}>
                                    Select Price Tier
                                </h3>
                                <p style={{
                                    margin: '4px 0 0',
                                    fontSize: '0.75rem',
                                    fontWeight: 400,
                                    color: '#ff9800',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}>
                                    {priceModalItem.name}
                                </p>
                            </div>
                            <button
                                onClick={() => setPriceModalItem(null)}
                                style={{
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '50%',
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: '#ffffff',
                                    color: '#64748b',
                                    padding: 0,
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <p style={{
                                margin: 0,
                                fontSize: '0.78rem',
                                color: '#64748b',
                                lineHeight: 1.5,
                                fontWeight: 400
                            }}>
                                This item has multiple pricing options available in stock. Please select the correct batch to add to cart:
                            </p>

                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                paddingRight: '2px'
                            }}>
                                {getPriceTiers(priceModalItem).map(tier => {
                                    const qtyInCart = cartItems
                                        .filter(c => c.id === priceModalItem.id && c.batchId === tier.id)
                                        .reduce((sum, c) => sum + c.quantity, 0);
                                    const totalLimit = parseFloat(tier.quantity_remaining || 0);
                                    const remainingAvailable = Math.max(0, totalLimit - qtyInCart);
                                    const isDisabled = remainingAvailable <= 0;
                                    const isSelected = selectedTierId === tier.id;

                                    return (
                                        <div
                                            key={tier.id}
                                            onClick={() => {
                                                if (!isDisabled) {
                                                    setSelectedTierId(tier.id);
                                                    setModalQuantity(1);
                                                }
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '12px 16px',
                                                border: isSelected ? '1px solid #166534' : '1px solid #e2e8f0',
                                                borderRadius: '12px',
                                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                backgroundColor: isDisabled ? '#f8fafc' : isSelected ? '#f0fdf4' : '#ffffff',
                                                opacity: isDisabled ? 0.55 : 1,
                                                transition: 'all 0.15s ease',
                                                boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.02)' : 'none'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <div style={{
                                                    width: '16px',
                                                    height: '16px',
                                                    borderRadius: '50%',
                                                    border: isDisabled ? '1px solid #cbd5e1' : isSelected ? '1px solid #166534' : '1px solid #cbd5e1',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    marginRight: '12px',
                                                    backgroundColor: isDisabled ? '#f1f5f9' : '#ffffff'
                                                }}>
                                                    {isSelected && !isDisabled && (
                                                        <div style={{
                                                            width: '8px',
                                                            height: '8px',
                                                            borderRadius: '50%',
                                                            backgroundColor: '#166534'
                                                        }} />
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <p style={{
                                                        fontSize: '0.85rem',
                                                        fontWeight: isSelected ? 600 : 400,
                                                        color: isDisabled ? '#94a3b8' : '#0f172a',
                                                        margin: 0
                                                    }}>
                                                        Rs. {parseFloat(tier.selling_price || 0).toFixed(2)}
                                                    </p>
                                                    <p style={{
                                                        fontSize: '0.7rem',
                                                        color: isDisabled ? '#cbd5e1' : '#64748b',
                                                        margin: '2px 0 0',
                                                        fontWeight: 400
                                                    }}>
                                                        Buying Price: Rs. {parseFloat(tier.buying_price || 0).toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                {isDisabled ? (
                                                    <span style={{
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        color: '#991b1b',
                                                        backgroundColor: '#fee2e2',
                                                        border: '1px solid #fecaca',
                                                        padding: '3px 8px',
                                                        borderRadius: '9999px'
                                                    }}>
                                                        All in Cart ({qtyInCart}/{totalLimit})
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        fontSize: '0.72rem',
                                                        fontWeight: 600,
                                                        color: isSelected ? '#166534' : '#475569',
                                                        backgroundColor: isSelected ? '#dcfce7' : '#f1f5f9',
                                                        border: isSelected ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                                                        padding: '3px 8px',
                                                        borderRadius: '9999px'
                                                    }}>
                                                        {remainingAvailable} {priceModalItem.unit || 'pcs'} left
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Quantity Selector */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 16px',
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                marginTop: '8px'
                            }}>
                                <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 400,
                                    color: '#475569',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}>
                                    Quantity
                                </span>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '10px',
                                    padding: '2px',
                                    backgroundColor: '#ffffff'
                                }}>
                                    <button
                                        type="button"
                                        onClick={() => setModalQuantity(q => Math.max(1, q - 1))}
                                        style={{
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '26px',
                                            height: '26px',
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0',
                                            backgroundColor: '#ffffff',
                                            color: '#64748b',
                                            fontSize: '0.9rem',
                                            padding: 0,
                                            lineHeight: 1
                                        }}
                                    >
                                        −
                                    </button>
                                    <span style={{
                                        width: '28px',
                                        textAlign: 'center',
                                        fontSize: '0.8rem',
                                        fontWeight: 400,
                                        color: '#0f172a'
                                    }}>
                                        {modalQuantity}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const activeTier = getPriceTiers(priceModalItem).find(t => t.id === selectedTierId);
                                            if (activeTier) {
                                                const qtyInCart = cartItems
                                                    .filter(c => c.id === priceModalItem.id && c.batchId === activeTier.id)
                                                    .reduce((sum, c) => sum + c.quantity, 0);
                                                const maxCanAdd = Math.max(0, parseFloat(activeTier.quantity_remaining || 0) - qtyInCart);
                                                setModalQuantity(q => Math.min(maxCanAdd, q + 1));
                                            }
                                        }}
                                        style={{
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '26px',
                                            height: '26px',
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0',
                                            backgroundColor: '#ffffff',
                                            color: '#64748b',
                                            fontSize: '0.9rem',
                                            padding: 0,
                                            lineHeight: 1
                                        }}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '16px 24px',
                            backgroundColor: '#f8fafc',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '10px'
                        }}>
                            <button
                                type="button"
                                onClick={() => setPriceModalItem(null)}
                                style={{
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '8px 16px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    backgroundColor: '#ffffff',
                                    color: '#475569',
                                    fontSize: '0.72rem',
                                    fontWeight: 400,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const tier = getAvailableTiers(priceModalItem).find(t => t.id === selectedTierId);
                                    if (tier) {
                                        addToCartWithTier(priceModalItem, tier, modalQuantity);
                                        setPriceModalItem(null);
                                    }
                                }}
                                style={{
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '8px 16px',
                                    border: '1px solid #94a3b8',
                                    borderRadius: '8px',
                                    backgroundColor: '#ffffff',
                                    color: '#0f172a',
                                    fontSize: '0.72rem',
                                    fontWeight: 400,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    transition: 'all 0.15s ease',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                }}
                            >
                                Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Overlimit Prompt / Confirmation Modal */}
            {overlimitModal && overlimitModal.show && (
                <div className="fixed inset-0 z-[5000] backdrop-blur-md bg-black/40 p-4 flex items-center justify-center animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-[24px] shadow-2xl border border-green-200 overflow-hidden animate-scale-up text-gray-900 flex flex-col">
                        
                        {/* Modal Header matching clean green system design */}
                        <div className="p-6 bg-[#C1DFCD] flex justify-between items-center border-b border-green-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-700">
                                    <svg className="w-6 h-6 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                                        {overlimitModal.hasOtherTiers ? 'Price Level Limit Reached' : 'All Stock Quantities Used'}
                                    </h3>
                                    <p className="text-xs font-black text-green-900 mt-0.5">
                                        {overlimitModal.item.name}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setOverlimitModal(null)}
                                className="p-2 bg-green-700 text-white hover:bg-green-800 rounded-xl transition-all shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            {overlimitModal.hasOtherTiers ? (
                                <div className="p-4 bg-[#F4F9F6] border border-green-200 rounded-2xl text-xs text-gray-800 space-y-2">
                                    <p className="font-semibold leading-relaxed">
                                        This price level has reached its maximum stock limit of <strong className="font-black text-green-900">{overlimitModal.currentLimit} {overlimitModal.unit}</strong> (all {overlimitModal.currentLimit} {overlimitModal.unit} are already added in your cart).
                                    </p>
                                    <p className="font-black text-green-800 pt-1">
                                        You can add more items using another available price level. Would you like to select another price level?
                                    </p>
                                </div>
                            ) : (
                                <div className="p-4 bg-red-50/80 border border-red-200 rounded-2xl text-xs text-red-900 space-y-2">
                                    <p className="font-bold leading-relaxed">
                                        All available stock quantities for this item across all price levels have been added to your cart.
                                    </p>
                                    <p className="text-gray-600 font-medium">
                                        No additional stock is available in any price level.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Modal Actions */}
                        <div className="p-4 bg-[#F4F9F6] border-t border-green-200 flex justify-end gap-3">
                            {overlimitModal.hasOtherTiers ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setOverlimitModal(null)}
                                        className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition-all cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const targetItem = overlimitModal.item;
                                            const remainingTiers = overlimitModal.otherTiers;
                                            const initialQty = overlimitModal.excessNeeded || 1;
                                            setOverlimitModal(null);
                                            if (remainingTiers && remainingTiers.length > 0) {
                                                setPriceModalItem(targetItem);
                                                setSelectedTierId(remainingTiers[0].id);
                                                
                                                const firstRemainingTier = remainingTiers[0];
                                                const qtyInCart = cartItems
                                                    .filter(c => c.id === targetItem.id && c.batchId === firstRemainingTier.id)
                                                    .reduce((sum, c) => sum + c.quantity, 0);
                                                const maxForTier = Math.max(1, parseFloat(firstRemainingTier.quantity_remaining || 0) - qtyInCart);
                                                
                                                setModalQuantity(Math.min(initialQty, maxForTier));
                                            }
                                        }}
                                        className="px-6 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                                    >
                                        Select Another Price Level
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setOverlimitModal(null)}
                                    className="px-6 py-2.5 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                                >
                                    OK / Got It
                                </button>
                            )}
                        </div>

                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default CashierNewOrderPage;
