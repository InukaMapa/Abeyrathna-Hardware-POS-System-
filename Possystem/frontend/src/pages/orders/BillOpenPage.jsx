import React, { useState, useEffect, useMemo, useRef } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { API_BASE_URL } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { fetchOrderById } from '../../services/orderService';
import { fetchInventoryItems } from '../../services/menuService';
import logo from '../../assets/logo.jpeg';
import html2canvas from 'html2canvas';
import { printImageAndOpenDrawer, openCashDrawerOnly, getPrinters } from '../../utils/qzHelper';
import { getSavedBillPrinter } from '../../utils/printerConfig';
import '../../styles/dashboard.css';

/* ───────────────────────────── helpers ───────────────────────────── */
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

/* ───────────────────────────── component ───────────────────────────── */

const BillOpenPage = ({ orderId, onNavigate }) => {
    const [errorMessage, setErrorMessage] = useState('');
    const { user } = useAuth();
    const searchInputRef = useRef(null);

    /* ── data state ── */
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isCompleted, setIsCompleted] = useState(false);

    // Printing
    const [printers, setPrinters] = useState([]);
    const [selectedPrinter, setSelectedPrinter] = useState('');
    const [printing, setPrinting] = useState(false);

    // Order & Customer Data
    const [order, setOrder] = useState(null);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [notes, setNotes] = useState('');

    // Items List
    const [items, setItems] = useState([]);

    // Inventory items for autocomplete search
    const [inventoryItems, setInventoryItems] = useState([]);
    const [loadingInventory, setLoadingInventory] = useState(false);

    /* ── barcode search state ── */
    const [barcodeInput, setBarcodeInput] = useState('');
    const [barcodeError, setBarcodeError] = useState(null);
    const [dropdownIndex, setDropdownIndex] = useState(-1);
    const [showDropdown, setShowDropdown] = useState(false);

    /* ── multiple price modal state ── */
    const [priceModalItem, setPriceModalItem] = useState(null);
    const [selectedTierId, setSelectedTierId] = useState(null);
    const [modalQuantity, setModalQuantity] = useState(1);

    // Pricing Summary
    const [overallDiscountType, setOverallDiscountType] = useState('fixed'); // 'fixed' or 'percent'
    const [overallDiscountValue, setOverallDiscountValue] = useState(0);
    const [otherCharges, setOtherCharges] = useState(0);
    const [otherChargesReason, setOtherChargesReason] = useState('');
    const [otherChargesReasonError, setOtherChargesReasonError] = useState('');

    // Payments
    const [paymentMethods, setPaymentMethods] = useState([
        { id: Date.now(), method: 'Cash', amount: '' }
    ]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!orderId) {
            setErrorMessage('Order ID not found');
            return;
        }
        loadData();
    }, [orderId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const orderData = await fetchOrderById(orderId);
            setOrder(orderData);
            setCustomerPhone(orderData.customer_phone || '');

            // Map items with editable fields
            const mappedItems = (orderData.order_items || []).map(item => ({
                ...item,
                editablePrice: parseFloat(item.item_price) || 0,
                buyingPrice: parseFloat(item.buying_price || item.buying_price_at_time || 0),
                itemDiscount: parseFloat(item.discount || 0) || 0,
                editableQty: item.quantity
            }));
            setItems(mappedItems);

            // Load saved values if present
            if (orderData.customer_name) setCustomerName(orderData.customer_name);
            if (orderData.discount) setOverallDiscountValue(orderData.discount);
            if (orderData.other_charges) setOtherCharges(orderData.other_charges);
            if (orderData.notes) setNotes(orderData.notes);

            // Update status to BILL_OPEN if not already
            if (orderData.status === 'PAID' || orderData.status === 'CLOSED') {
                setIsCompleted(true);
                openCashDrawer();
            } else if (orderData.status !== 'BILL_OPEN') {
                const token = localStorage.getItem('token');
                await fetch(`${API_BASE_URL}/orders/${orderData.order_id}/status`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'BILL_OPEN' })
                });
            }
        } catch (err) {
            console.error('Failed to load order', err);
            setErrorMessage('Failed to load order');
            alert('Failed to load order');
            onNavigate('orders');
        } finally {
            setLoading(false);
        }
    };

    /* ── load products for search dropdown ── */
    useEffect(() => {
        if (isCompleted) return;
        const loadInventory = async () => {
            try {
                setLoadingInventory(true);
                const products = await fetchInventoryItems();
                const mappedItems = products.map(item => ({
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
                console.error('Failed to load inventory in BillOpenPage:', err);
            } finally {
                setLoadingInventory(false);
            }
        };
        loadInventory();
    }, [isCompleted]);

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

    /* ── click outside dropdown listener ── */
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchInputRef.current && !searchInputRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    /* ── add items list state helpers ── */
    const addItemToOrderState = (item, tier, qty = 1) => {
        setItems(prev => {
            const existingIndex = prev.findIndex(c => {
                const batchVariant = Array.isArray(c.selected_variants)
                    ? c.selected_variants.find(v => v.type === 'STOCK_BATCH')
                    : null;
                const batchId = batchVariant?.batch_item_id;
                return c.item_id === item.id && batchId === tier.id;
            });

            if (existingIndex > -1) {
                return prev.map((c, index) =>
                    index === existingIndex
                        ? { ...c, editableQty: (parseInt(c.editableQty) || 0) + qty }
                        : c
                );
            }

            const newItem = {
                order_item_id: 'new_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                item_id: item.id,
                item_name: item.name,
                item_price: parseFloat(tier.selling_price || item.price || 0),
                quantity: qty,
                subtotal: parseFloat(tier.selling_price || item.price || 0) * qty,
                selected_variants: [{
                    type: 'STOCK_BATCH',
                    batch_item_id: tier.id,
                    buying_price: parseFloat(tier.buying_price || item.buyingPrice || 0)
                }],
                buyingPrice: parseFloat(tier.buying_price || item.buyingPrice || 0),
                editablePrice: parseFloat(tier.selling_price || item.price || 0),
                editableQty: qty,
                itemDiscount: 0
            };
            return [...prev, newItem];
        });
    };

    const handleItemClick = (item) => {
        if (item.quantity <= 0) {
            setBarcodeError('Item is out of stock!');
            setTimeout(() => setBarcodeError(null), 3000);
            return;
        }

        const availableTiers = getAvailableTiers(item);
        if (availableTiers.length > 1) {
            setPriceModalItem(item);
            setSelectedTierId(availableTiers[0].id);
            setModalQuantity(1);
        } else if (availableTiers.length === 1) {
            addItemToOrderState(item, availableTiers[0], 1);
        } else {
            const fallbackTier = {
                id: 'tier_init_' + item.id,
                selling_price: item.price,
                buying_price: item.buyingPrice,
                quantity_remaining: 0
            };
            addItemToOrderState(item, fallbackTier, 1);
        }
    };

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

    // Global barcode listener
    useEffect(() => {
        if (isCompleted) return;
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
    }, [inventoryItems, isCompleted]);

    const handleRemoveItem = (index) => {
        if (!window.confirm('Remove this item from the order?')) return;
        setItems(prev => prev.filter((_, idx) => idx !== index));
    };

    // Derived Calculations
    const subtotal = items.reduce((sum, item) => sum + (item.editablePrice * item.editableQty), 0);
    const totalItemDiscounts = items.reduce((sum, item) => sum + (parseFloat(item.itemDiscount) || 0), 0);
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

    // Amount Received
    const totalReceived = paymentMethods.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const balance = totalReceived - grandTotal;
    const totalReceiptQty = items.reduce((sum, item) => sum + (parseInt(item.editableQty, 10) || 0), 0);
    const activePaymentMethods = paymentMethods
        .map((payment) => ({
            method: payment.method,
            amount: parseFloat(payment.amount)
        }))
        .filter((payment) => Number.isFinite(payment.amount) && payment.amount > 0);
    const receiptPaymentRows = activePaymentMethods.length > 0
        ? activePaymentMethods
        : [{ method: 'Cash', amount: grandTotal }];

    useEffect(() => {
        getPrinters().then(printerList => {
            setPrinters(printerList);
            if (printerList && printerList.length > 0) {
                const savedBillPrinter = getSavedBillPrinter();
                if (savedBillPrinter && printerList.includes(savedBillPrinter)) {
                    setSelectedPrinter(savedBillPrinter);
                    return;
                }

                const receiptPrinter = printerList.find(p => p.toLowerCase().includes('thermal') || p.toLowerCase().includes('pos') || p.toLowerCase().includes('receipt'));
                setSelectedPrinter(receiptPrinter || printerList[0]);
            }
        }).catch(err => console.error("Error fetching printers", err));
    }, []);

    const handlePrintBill = async () => {
        setPrinting(true);
        try {
            const receiptElement = document.getElementById('thermal-receipt');
            if (!receiptElement) {
                throw new Error('Receipt element not found');
            }
            
            const originalDisplay = receiptElement.style.display;
            const originalPosition = receiptElement.style.position;
            receiptElement.style.display = 'block';
            receiptElement.style.position = 'relative';

            const canvas = await html2canvas(receiptElement, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            
            receiptElement.style.display = originalDisplay;
            receiptElement.style.position = originalPosition;

            const base64Image = canvas.toDataURL('image/png');
            await printImageAndOpenDrawer(base64Image, selectedPrinter);
        } catch (err) {
            console.error('Print failed:', err);
            if (err.message && err.message.includes('Connection blocked by client')) {
                alert('Connection blocked by QZ Tray! Site Manager localhost warning.');
            } else {
                alert('QZ Tray print failed. Make sure QZ Tray is running.');
            }
        } finally {
            setPrinting(false);
        }
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        let val = parseFloat(value);
        if (isNaN(val) && value !== '') val = 0;

        if (field === 'qty' && value === '') {
            newItems[index].editableQty = '';
        } else if (field === 'qty') {
            newItems[index].editableQty = Math.max(1, parseInt(value) || 1);
        } else if (field === 'price') {
            newItems[index].editablePrice = value === '' ? '' : Math.max(0, val);
        } else if (field === 'discount') {
            newItems[index].itemDiscount = value === '' ? '' : Math.max(0, val);
        }
        setItems(newItems);
    };

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

    const openCashDrawer = async () => {
        try {
            await openCashDrawerOnly(selectedPrinter);
        } catch (err) {
            console.error('Failed to open cash drawer automatically via QZ Tray:', err);
        }
    };

    React.useEffect(() => {
        const handleBeforePrint = () => {
            openCashDrawer();
        };
        window.addEventListener('beforeprint', handleBeforePrint);
        return () => window.removeEventListener('beforeprint', handleBeforePrint);
    }, []);

    const handleCompletePayment = async () => {
        if (hasOtherCharges && !normalizedOtherChargesReason) {
            setOtherChargesReasonError('Reason is required when other charges are added.');
            return;
        }

        if (totalReceived < grandTotal) {
            if (!window.confirm(`Amount received (Rs. ${totalReceived.toFixed(2)}) is less than Grand Total (Rs. ${grandTotal.toFixed(2)}). Continue?`)) {
                return;
            }
        }

        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');

            // 1. Sync local items back to cart DB first
            const cartPayload = {
                customer_phone: customerPhone,
                items: items.map(item => {
                    const batchVariant = Array.isArray(item.selected_variants)
                        ? item.selected_variants.find(v => v.type === 'STOCK_BATCH')
                        : null;
                    return {
                        id: item.item_id || item.id,
                        quantity: parseInt(item.editableQty) || 0,
                        batchId: batchVariant?.batch_item_id || item.batchId
                    };
                })
            };

            const cartResponse = await fetch(`${API_BASE_URL}/orders/${order.order_id}/cart`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(cartPayload)
            });

            if (!cartResponse.ok) {
                const errPayload = await cartResponse.json().catch(() => ({}));
                throw new Error(errPayload.error || 'Failed to sync cart changes.');
            }

            // 2. Call Close Order
            const normalizedPayments = paymentMethods.map((payment) => {
                const enteredAmount = parseFloat(payment.amount);
                const shouldUseFullTotal = paymentMethods.length === 1
                    && payment.method === 'Cash'
                    && !Number.isFinite(enteredAmount);

                return {
                    method: payment.method,
                    amount: shouldUseFullTotal ? grandTotal : (Number.isFinite(enteredAmount) ? enteredAmount : 0)
                };
            });

            const response = await fetch(`${API_BASE_URL}/orders/${order.order_id}/close`, {
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

            if (response.ok) {
                setIsCompleted(true);
                setTimeout(() => {
                    handlePrintBill();
                }, 500);
            } else {
                alert('Failed to complete payment.');
            }
        } catch (err) {
            console.error('Payment error:', err);
            alert('Error completing payment.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSaveBill = async () => {
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const cartPayload = {
                customer_phone: customerPhone,
                items: items.map(item => {
                    const batchVariant = Array.isArray(item.selected_variants)
                        ? item.selected_variants.find(v => v.type === 'STOCK_BATCH')
                        : null;
                    return {
                        id: item.item_id || item.id,
                        quantity: parseInt(item.editableQty) || 0,
                        batchId: batchVariant?.batch_item_id || item.batchId
                    };
                })
            };

            const cartResponse = await fetch(`${API_BASE_URL}/orders/${order.order_id}/cart`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(cartPayload)
            });

            if (!cartResponse.ok) {
                const errPayload = await cartResponse.json().catch(() => ({}));
                throw new Error(errPayload.error || 'Failed to update order items.');
            }

            alert('✅ Bill updated and saved successfully on hold.');
            onNavigate('orders');
        } catch (err) {
            console.error('Save bill failed:', err);
            alert(err.message || 'Failed to save bill changes.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelBill = async () => {
        if (!window.confirm('Cancel this bill? This completely deletes the order.')) return;
        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/orders/${order.order_id}`, {
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
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout onNavigate={onNavigate} activePage="orders">
                <div className="flex items-center justify-center min-h-screen bill-open-page">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
                </div>
            </DashboardLayout>
        );
    }
    if (errorMessage) {
        return (
            <DashboardLayout onNavigate={onNavigate} activePage="orders">
                <div className="flex items-center justify-center min-h-screen bill-open-page">
                    <p className="text-red-500 text-lg">{errorMessage}</p>
                </div>
            </DashboardLayout>
        );
    }

    if (isCompleted) {
        return (
            <DashboardLayout onNavigate={onNavigate} activePage="orders">
                <div className="bill-complete-screen flex items-center justify-center h-full w-full bill-open-page !p-0">
                    <div className="bill-complete-card flex flex-row !max-w-[700px] w-full bg-white border border-[#D7E7DC] rounded-xl shadow-2xl overflow-hidden">
                        
                        {/* LEFT COLUMN: Receipt Preview (Compact, No scroll container wrapper, showing completely) */}
                        <div className="bill-receipt-shell flex-1 !p-3 bg-[#F8FAFC] border-r border-[#E5EEE8] flex items-center justify-center overflow-y-auto">
                            <div id="thermal-receipt" className="thermal-receipt !border-0 !shadow-none !p-2">
                                <div className="thermal-header">
                                    <img src={logo} alt="Abeyrathna Trade Center" className="thermal-logo" />
                                    <h3>ABEYRATHNA TRADE CENTER</h3>
                                    <p>Grocery Items</p>
                                    <p>No. 59, Main Street, Kurunegala</p>
                                    <p>Tel: 037-2223422</p>
                                    <p>Mob: 076-7638894 / 0777-898897</p>
                                </div>

                                <div className="thermal-meta">
                                    <div><span>DATE :</span><strong>{currentTime.toLocaleDateString()}</strong></div>
                                    <div><span>NUMBER:</span><strong>HSL{String(order.order_id).padStart(6, '0')}</strong></div>
                                    <div><span>TIME :</span><strong>{currentTime.toLocaleTimeString()}</strong></div>
                                    <div><span>USER :</span><strong>{user?.username || user?.name || 'CASHIER'}</strong></div>
                                    <div><span>CUS  :</span><strong>{customerName || customerPhone || 'CASH'}</strong></div>
                                    <div><span>INV  :</span><strong>#{order.order_id}</strong></div>
                                </div>

                                <div className="thermal-rule"></div>
                                <div className="thermal-row thermal-table-head">
                                    <span>LN</span>
                                    <span>ITEM</span>
                                    <span>QTY</span>
                                    <span>PRICE</span>
                                    <span>AMOUNT</span>
                                </div>
                                <div className="thermal-rule"></div>

                                <div className="thermal-items">
                                    {items.map((item, index) => {
                                        const lineDiscount = parseFloat(item.itemDiscount) || 0;
                                        const lineAmount = (item.editablePrice * item.editableQty) - lineDiscount;
                                        return (
                                            <div key={item.order_item_id} className="thermal-item">
                                                <div className="thermal-row">
                                                    <span>{index + 1})</span>
                                                    <span>{item.item_name}</span>
                                                    <span>{item.editableQty}</span>
                                                    <span>{Number(item.editablePrice).toFixed(2)}</span>
                                                    <span>{lineAmount.toFixed(2)}</span>
                                                </div>
                                                <div className="thermal-code">SYS-{item.item_id}</div>
                                                {lineDiscount > 0 && (
                                                    <div className="thermal-subnote">Discount: Rs. {lineDiscount.toFixed(2)}</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="thermal-rule"></div>
                                <div className="thermal-total-row"><span>SUB TOTAL</span><strong>{subtotal.toFixed(2)}</strong></div>
                                {overallDiscountAmount > 0 && (
                                    <div className="thermal-total-row"><span>DISCOUNT</span><strong>- {overallDiscountAmount.toFixed(2)}</strong></div>
                                )}
                                {parsedOtherCharges > 0 && (
                                    <>
                                        <div className="thermal-total-row"><span>OTHER CHARGES</span><strong>+ {parsedOtherCharges.toFixed(2)}</strong></div>
                                        <div className="thermal-reason">
                                            <span>Reason:</span>
                                            <strong>{normalizedOtherChargesReason}</strong>
                                        </div>
                                    </>
                                )}
                                <div className="thermal-total-row thermal-net"><span>NET TOTAL</span><strong>{grandTotal.toFixed(2)}</strong></div>
                                {receiptPaymentRows.map((payment, index) => (
                                    <div key={`${payment.method}-${index}`} className="thermal-total-row">
                                        <span>{payment.method.toUpperCase()}</span>
                                        <strong>{payment.amount.toFixed(2)}</strong>
                                    </div>
                                ))}
                                {balance > 0 && (
                                    <div className="thermal-total-row"><span>BALANCE</span><strong>{balance.toFixed(2)}</strong></div>
                                )}

                                <div className="thermal-rule"></div>
                                <div className="thermal-counts">
                                    <span>NO OF ITEMS: {items.length}</span>
                                    <span>NO OF QTY: {totalReceiptQty}</span>
                                </div>
                                <div className="thermal-rule"></div>

                                <div className="thermal-footer">
                                    <p>Thank you for shopping with us!</p>
                                    <p>Return possible within 7 days.</p>
                                    <p>Bills must be produced.</p>
                                    <p>***</p>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Actions & Status */}
                        <div className="w-[300px] flex flex-col justify-between bg-white">
                            
                            {/* Status Header */}
                            <div className="bill-complete-header !py-4 !px-4 text-center flex flex-col items-center border-b border-[#E5EEE8]">
                                <div className="bill-complete-check !w-10 !h-10 !mb-2">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="!w-5 !h-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <h2 className="!text-sm font-black text-emerald-600 uppercase tracking-tight">Invoice #{order?.order_id}</h2>
                                <p className="text-gray-500 !text-[10px] !mt-0.5 uppercase tracking-wider font-bold">Invoice #{order.order_id} Closed</p>
                            </div>

                            {/* Actions Group */}
                            <div className="bill-complete-actions !p-4 flex-1 flex flex-col justify-center gap-3">
                                <div className="flex flex-col gap-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Printer Configuration</span>
                                    {printers.length > 0 && (
                                        <select 
                                            className="w-full bg-[#f8f9fa] border border-gray-300 text-gray-700 text-xs font-bold rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-500"
                                            value={selectedPrinter}
                                            onChange={(e) => setSelectedPrinter(e.target.value)}
                                        >
                                            {printers.map((p, idx) => (
                                                <option key={idx} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    )}
                                    <div className="flex flex-col gap-2 mt-2">
                                        <button 
                                            onClick={handlePrintBill} 
                                            disabled={printing}
                                            className="w-full py-2.5 bg-[#1E1E1E] hover:bg-black text-white font-bold uppercase tracking-widest text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
                                        >
                                            {printing ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                            )}
                                            {printing ? 'Printing...' : 'Print Bill'}
                                        </button>
                                        <button onClick={() => {
                                            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
                                                orderId: order.order_id,
                                                date: currentTime,
                                                items,
                                                otherCharges: parsedOtherCharges,
                                                otherChargesReason: hasOtherCharges ? normalizedOtherChargesReason : null,
                                                grandTotal
                                            }));
                                            const dlAnchorElem = document.createElement('a'); dlAnchorElem.setAttribute("href", dataStr); dlAnchorElem.setAttribute("download", `bill_${order.order_id}.json`); dlAnchorElem.click();
                                        }} className="w-full py-2 bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 font-bold uppercase tracking-widest text-[10px] rounded-lg transition-all flex items-center justify-center gap-1.5">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            Download Logs
                                        </button>
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-3 mt-1">
                                    <button onClick={() => onNavigate('orders')} className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-md active:scale-95">
                                        Return to Orders
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!order) {
        return (
            <DashboardLayout onNavigate={onNavigate} activePage="orders">
                <div className="flex items-center justify-center min-h-screen bill-open-page">
                    <p className="text-gray-500 text-lg">Order data not available.</p>
                </div>
            </DashboardLayout>
        );
    }
    return (
        <DashboardLayout onNavigate={onNavigate} activePage="orders">
            <div className="bill-open-page px-4 py-2 md:px-6 flex flex-col gap-3 font-sans">

                {/* 1. HEADER SECTION (Compact & Top Positioned) */}
                <div className="bg-[#1E1E1E] border border-[#333] rounded-2xl shadow-xl p-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => onNavigate('orders')}
                            className="bill-open-back-btn flex items-center justify-center"
                            title="Back to orders"
                            aria-label="Back to orders"
                            style={{ width: '36px', height: '36px', minWidth: '36px' }}
                        >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h2 className="text-lg font-bold uppercase tracking-tight m-0 text-emerald-500">Invoice #{order.order_id}</h2>
                            <div className="flex items-center gap-3 mt-0.5 font-mono text-gray-400 text-[10px]">
                                <span>{currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-500"></span>
                                <span className="uppercase tracking-wider"><span className="text-gray-500">Cashier:</span> {user?.name || 'Unknown'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 bg-[#161616] p-2 border border-[#2a2a2a] rounded-lg max-w-xl text-xs">
                        <div>
                            <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Customer Name</label>
                            <input
                                type="text"
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                                placeholder="Walk-in Customer"
                                className="bg-[#252525] border border-[#444] rounded px-2 py-1 text-white text-xs outline-none focus:border-emerald-500 transition-colors w-40"
                            />
                        </div>
                        <div>
                            <label className="block text-[8px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Mobile Contact</label>
                            <input
                                type="text"
                                value={customerPhone}
                                onChange={e => setCustomerPhone(e.target.value)}
                                placeholder="Phone number"
                                className="bg-[#252525] border border-[#444] rounded px-2 py-1 text-white text-xs font-mono outline-none focus:border-emerald-500 transition-colors w-32"
                            />
                        </div>
                    </div>
                </div>

                {/* TWO-COLUMN LAYOUT */}
                <div className="flex flex-col lg:flex-row gap-4">

                    {/* LEFT COLUMN: ITEM LIST & SCANNING */}
                    <div className="flex-[2] flex flex-col gap-3 w-full">

                        {/* Barcode scanner / Product Name unified search input (Compact) */}
                        <div className="bg-[#1E1E1E] border border-[#333] rounded-2xl p-3 shadow-xl flex flex-col gap-2 relative">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                    </svg>
                                    Barcode / Item Name Search
                                </label>
                                {barcodeError && (
                                    <span className="text-[10px] text-red-500 font-bold animate-pulse">
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
                                            className="w-full bg-[#161616] border border-[#333] rounded-lg px-3 py-2 pl-9 text-white text-xs outline-none focus:border-emerald-500 transition-colors"
                                        />
                                        <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-gray-400">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        className="px-3 bg-[#252525] border border-[#333] hover:border-emerald-500 text-gray-400 hover:text-white rounded-lg transition-colors flex items-center justify-center"
                                        title="Add Item"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>
                                </form>

                                {/* Dropdown menu overlay */}
                                {showDropdown && searchMatches.length > 0 && (
                                    <div className="absolute z-[100] top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-[#161616] border border-[#333] rounded-lg shadow-xl divide-y divide-[#2a2a2a] custom-scrollbar">
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
                                                    className={`px-3 py-2 cursor-pointer flex items-center justify-between transition-colors ${isSelected ? 'bg-emerald-900/20 text-emerald-300 font-bold border-l-2 border-emerald-500' : 'hover:bg-[#252525]'}`}
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-semibold text-white">{item.name}</span>
                                                        <span className="text-[10px] text-gray-500 font-mono">CODE: {item.item_code || 'N/A'}</span>
                                                    </div>
                                                    <div className="text-right flex flex-col">
                                                        <span className="text-xs font-bold text-emerald-400">Rs. {parseFloat(item.price || 0).toFixed(2)}</span>
                                                        <span className={`text-[9px] font-bold uppercase ${item.quantity > 5 ? 'text-emerald-500' : item.quantity > 0 ? 'text-amber-500' : 'text-red-500'}`}>
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

                        {/* Billed Items table list (Compact) */}
                        <div className="bg-[#1E1E1E] border border-[#333] rounded-2xl shadow-xl flex flex-col overflow-hidden">
                            <div className="px-4 py-2.5 border-b border-[#333] bg-[#161616] flex justify-between items-center">
                                <h3 className="text-xs font-black text-gray-300 uppercase tracking-widest flex items-center gap-1.5">
                                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 114 0z" /></svg>
                                    Billed Items
                                </h3>
                                <span className="bill-active-badge text-[10px] font-bold text-emerald-400 uppercase tracking-widest border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 rounded">Active / Editable</span>
                            </div>
                            <div className="overflow-x-auto flex-1 max-h-[50vh] overflow-y-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-[#121212] border-b border-[#333] uppercase text-[9px] tracking-widest text-gray-500 font-black sticky top-0 z-10">
                                        <tr>
                                            <th className="px-3 py-2">Item details</th>
                                            <th className="px-3 py-2">SKU / Unit</th>
                                            <th className="px-3 py-2 text-center" style={{ width: '90px' }}>Qty</th>
                                            <th className="px-3 py-2 text-right">Unit Price</th>
                                            <th className="px-3 py-2 text-right">Buying Price</th>
                                            <th className="px-3 py-2 text-right" style={{ width: '80px' }}>Discount</th>
                                            <th className="px-3 py-2 text-right border-l border-[#333]">Net Total</th>
                                            <th className="px-3 py-2 text-center" style={{ width: '50px' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, index) => {
                                            const netTotal = (item.editablePrice * item.editableQty) - (parseFloat(item.itemDiscount) || 0);
                                            const batchVariant = Array.isArray(item.selected_variants)
                                                ? item.selected_variants.find(v => v.type === 'STOCK_BATCH')
                                                : null;
                                            return (
                                                <tr key={item.order_item_id || `${item.item_id}-${index}`} className="border-b border-[#333] hover:bg-[#252525] transition-colors group text-xs">
                                                    <td className="px-3 py-2">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-white">{item.item_name}</span>
                                                            {batchVariant && (
                                                                <span className="text-[8px] text-amber-500 font-bold uppercase tracking-wider">
                                                                    Batch: {batchVariant.batch_item_id.startsWith('tier_init_') ? 'Initial Stock' : batchVariant.batch_item_id.slice(-6).toUpperCase()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 font-mono text-gray-500 text-[10px]">SYS-{item.item_id}</td>
                                                    <td className="px-3 py-2 text-center">
                                                        <div className="flex items-center justify-center gap-1 bg-[#161616] border border-[#333] rounded-lg p-0.5 max-w-[80px] mx-auto">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const currentQty = parseInt(item.editableQty) || 1;
                                                                    handleItemChange(index, 'qty', Math.max(1, currentQty - 1));
                                                                }}
                                                                className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-emerald-700 hover:bg-[#252525] transition-colors font-bold text-[10px]"
                                                            >-</button>
                                                            <span className="w-6 text-center text-xs font-bold text-white">{item.editableQty}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const currentQty = parseInt(item.editableQty) || 1;
                                                                    handleItemChange(index, 'qty', currentQty + 1);
                                                                }}
                                                                className="w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-emerald-700 hover:bg-[#252525] transition-colors font-bold text-[10px]"
                                                            >+</button>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <span className="font-mono text-gray-300 font-bold">{parseFloat(item.editablePrice).toFixed(2)}</span>
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <span className="bill-buying-price-label">Rs. {parseFloat(item.buyingPrice || 0).toFixed(2)}</span>
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <input
                                                            type="number"
                                                            min="0" step="0.01"
                                                            className="w-full bg-[#161616] border border-[#444] rounded px-1.5 py-0.5 text-right text-red-400 font-mono font-bold outline-none focus:border-red-500 text-xs"
                                                            value={item.itemDiscount}
                                                            onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-right border-l border-[#333]">
                                                        <span className="font-bold text-white tabular-nums">{netTotal.toFixed(2)}</span>
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        <button
                                                            onClick={() => handleRemoveItem(index)}
                                                            disabled={actionLoading}
                                                            className="p-1 bg-red-600/10 text-red-500 border border-red-500/20 hover:bg-red-600 hover:text-white rounded-md transition-colors"
                                                            title="Remove Item"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {items.length === 0 && (
                                            <tr>
                                                <td colSpan={8} className="text-center py-12 text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                                                    No items in order cart.<br/>
                                                    <span className="text-[9px] text-gray-600 mt-1 block normal-case font-medium">Scan or search products to begin billing.</span>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: SINGLE CONSOLIDATED POS SIDEBAR */}
                    <div className="w-full lg:w-[380px] flex-shrink-0 flex flex-col gap-4">

                        {/* Consolidated POS Billing Sidebar Box */}
                        <div className="bg-[#1E1E1E] border border-[#333] rounded-2xl shadow-xl p-4 flex flex-col gap-3.5 text-xs text-white">

                            {/* SECTION 1: PRICING DETAILS */}
                            <div className="flex flex-col gap-1.5 text-gray-300 font-semibold">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-[#333] pb-2 mb-2 m-0">Pricing Summary</h3>
                                <div className="flex justify-between items-center text-xs">
                                    <span>Subtotal</span>
                                    <span className="font-mono text-white">Rs. {subtotal.toFixed(2)}</span>
                                </div>
                                {totalItemDiscounts > 0 && (
                                    <div className="flex justify-between items-center text-red-400 text-xs">
                                        <span>Item Discounts</span>
                                        <span className="font-mono">- Rs. {totalItemDiscounts.toFixed(2)}</span>
                                    </div>
                                )}
                                
                                <div className="flex justify-between items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Overall Discount</span>
                                        <select
                                            value={overallDiscountType}
                                            onChange={(e) => setOverallDiscountType(e.target.value)}
                                            className="bill-discount-type bg-[#252525] border border-[#444] text-white text-[9px] font-bold uppercase rounded px-1.5 py-0.5 outline-none"
                                        >
                                            <option value="fixed">Rs.</option>
                                            <option value="percent">%</option>
                                        </select>
                                    </div>
                                    <input
                                        type="number" min="0" step="0.01"
                                        className="w-20 bg-[#161616] border border-[#444] rounded px-1.5 py-0.5 text-right text-white font-mono font-bold outline-none text-xs focus:border-red-500"
                                        value={overallDiscountValue}
                                        onChange={(e) => setOverallDiscountValue(e.target.value)}
                                        placeholder="0"
                                    />
                                </div>

                                <div className="flex justify-between items-center gap-4">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Other Charges</span>
                                    <input
                                        type="number" min="0" step="0.01"
                                        className={`w-20 bg-[#161616] border rounded px-1.5 py-0.5 text-right text-emerald-400 font-mono font-bold outline-none text-xs ${otherChargesReasonError ? 'border-red-500' : 'border-[#444]'}`}
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
                                            className={`w-full min-h-[36px] h-9 bg-[#161616] border rounded px-2 py-1 text-white text-xs outline-none focus:border-emerald-500 transition-colors resize-none ${otherChargesReasonError ? 'border-red-500' : 'border-[#444]'}`}
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

                                <div className="flex justify-between items-end border-t border-[#333] pt-2 mt-0.5">
                                    <span className="font-bold text-gray-300 uppercase tracking-wider text-[10px]">Grand Total</span>
                                    <span className="text-xl font-bold text-emerald-500 font-mono">Rs. {grandTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* SECTION 2: PAYMENT REGISTRY */}
                            <div className="border-t border-[#333] pt-3 flex flex-col gap-1.5">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payment Registry</span>
                                <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                                    {paymentMethods.map((pm) => (
                                        <div key={pm.id} className="flex items-center gap-1.5">
                                            {paymentMethods.length > 1 && (
                                                <button onClick={() => removePaymentMethod(pm.id)} className="p-1 bg-red-600/10 text-red-500 rounded hover:bg-red-600 hover:text-white transition-colors">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            )}
                                            <select
                                                className="bg-[#252525] border border-[#444] text-white text-[10px] font-bold uppercase rounded px-1.5 py-1.5 outline-none text-gray-800"
                                                value={pm.method}
                                                onChange={e => updatePaymentMethod(pm.id, 'method', e.target.value)}
                                            >
                                                <option value="Cash">Cash</option>
                                                <option value="Card">Card</option>
                                                <option value="Bank">Bank</option>
                                            </select>
                                            <input
                                                type="number" min="0" step="0.01"
                                                className="flex-1 bg-[#161616] border border-[#444] rounded px-2 py-1 text-right text-white font-mono font-bold outline-none focus:border-emerald-500 text-xs"
                                                value={pm.amount}
                                                onChange={e => updatePaymentMethod(pm.id, 'amount', e.target.value)}
                                                placeholder={`Rs. ${grandTotal.toFixed(2)}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <button onClick={addPaymentMethod} className="w-full py-1 bg-[#252525] border border-dashed border-[#555] text-gray-400 rounded text-[9px] font-bold uppercase tracking-widest hover:text-white hover:border-emerald-500 hover:bg-[#161616] transition-colors">
                                    + Add Split Payment Option
                                </button>
                                <div className="flex justify-between items-baseline pt-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">
                                        {balance >= 0 ? 'Change To Give' : 'Balance Due'}
                                    </span>
                                    <span className={`bill-balance-amount text-sm font-mono font-black ${balance >= 0 ? 'text-emerald-500' : 'text-gray-300'}`}>
                                        Rs. {Math.abs(balance).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            {/* SECTION 3: NOTES & OPERATIONS BUTTONS */}
                            <div className="border-t border-[#333] pt-3 flex flex-col gap-2">
                                <input
                                    type="text"
                                    className="w-full bg-[#161616] border border-[#444] rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-blue-500 transition-colors"
                                    placeholder="Add notes..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                                <div className="flex flex-col gap-2 mt-0.5">
                                    <button
                                        onClick={handleCompletePayment}
                                        disabled={actionLoading || items.length === 0}
                                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs rounded-lg shadow-lg active:scale-95 disabled:opacity-50"
                                    >
                                        COMPLETE PAYMENT
                                    </button>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSaveBill}
                                            disabled={actionLoading || items.length === 0}
                                            className="flex-1 py-1.5 bg-[#252525] border border-[#444] hover:bg-[#333] text-gray-300 font-bold uppercase tracking-widest text-[9px] rounded-lg transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            HOLD BILL
                                        </button>
                                        <button
                                            onClick={handleCancelBill}
                                            disabled={actionLoading}
                                            className="flex-1 py-1.5 bg-transparent border-2 border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white font-bold uppercase tracking-widest text-[9px] rounded-lg transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            CANCEL BILL
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
                                This item has multiple pricing options available in stock. Please select the correct batch to add:
                            </p>

                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                paddingRight: '2px'
                            }}>
                                {getAvailableTiers(priceModalItem).map(tier => {
                                    const isSelected = selectedTierId === tier.id;
                                    return (
                                        <div
                                            key={tier.id}
                                            onClick={() => setSelectedTierId(tier.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '12px 16px',
                                                border: isSelected ? '1px solid #94a3b8' : '1px solid #e2e8f0',
                                                borderRadius: '12px',
                                                cursor: 'pointer',
                                                backgroundColor: isSelected ? '#f8fafc' : '#ffffff',
                                                transition: 'all 0.15s ease',
                                                boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.02)' : 'none'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <div style={{
                                                    width: '16px',
                                                    height: '16px',
                                                    borderRadius: '50%',
                                                    border: '1px solid #cbd5e1',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    marginRight: '12px',
                                                    backgroundColor: '#ffffff'
                                                }}>
                                                    {isSelected && (
                                                        <div style={{
                                                            width: '8px',
                                                            height: '8px',
                                                            borderRadius: '50%',
                                                            backgroundColor: '#475569'
                                                        }} />
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <p style={{
                                                        fontSize: '0.85rem',
                                                        fontWeight: 400,
                                                        color: '#0f172a',
                                                        margin: 0
                                                    }}>
                                                        Rs. {parseFloat(tier.selling_price || 0).toFixed(2)}
                                                    </p>
                                                    <p style={{
                                                        fontSize: '0.7rem',
                                                        color: '#64748b',
                                                        margin: '2px 0 0',
                                                        fontWeight: 400
                                                    }}>
                                                        Buying Price: Rs. {parseFloat(tier.buying_price || 0).toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{
                                                    fontSize: '0.72rem',
                                                    fontWeight: 400,
                                                    color: '#475569',
                                                    backgroundColor: '#f1f5f9',
                                                    border: '1px solid #e2e8f0',
                                                    padding: '3px 8px',
                                                    borderRadius: '9999px'
                                                }}>
                                                    {tier.quantity_remaining} {priceModalItem.unit || 'pcs'} left
                                                </span>
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
                                            const activeTier = getAvailableTiers(priceModalItem).find(t => t.id === selectedTierId);
                                            const maxQty = activeTier ? parseFloat(activeTier.quantity_remaining || 0) : 9999;
                                            setModalQuantity(q => Math.min(maxQty, q + 1));
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
                                        addItemToOrderState(priceModalItem, tier, modalQuantity);
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
        </DashboardLayout>
    );
};

export default BillOpenPage;
