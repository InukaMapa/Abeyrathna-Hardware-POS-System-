import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { API_BASE_URL } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { fetchOrderById } from '../../services/orderService';
import '../../styles/dashboard.css';

const BillOpenPage = ({ orderId, onNavigate }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Order & Customer Data
    const [order, setOrder] = useState(null);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [notes, setNotes] = useState('');

    // Items List
    const [items, setItems] = useState([]);

    // Pricing Summary
    const [overallDiscountType, setOverallDiscountType] = useState('fixed'); // 'fixed' or 'percent'
    const [overallDiscountValue, setOverallDiscountValue] = useState(0);
    const [otherCharges, setOtherCharges] = useState(0);

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
            onNavigate('orders');
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
                itemDiscount: 0,
                editableQty: item.quantity
            }));
            setItems(mappedItems);

            // Update status to BILL_OPEN if not already
            if (orderData.status !== 'BILL_OPEN') {
                const token = localStorage.getItem('token');
                await fetch(`${API_BASE_URL}/orders/${orderData.order_id}/status`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'BILL_OPEN' })
                });
            }
        } catch (err) {
            console.error('Failed to load order', err);
            alert('Failed to load order');
            onNavigate('orders');
        } finally {
            setLoading(false);
        }
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
    const grandTotal = priceAfterItemDiscounts - overallDiscountAmount + parsedOtherCharges;

    // Amount Received
    const totalReceived = paymentMethods.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const balance = totalReceived - grandTotal;

    // Handlers
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

    const [isCompleted, setIsCompleted] = useState(false);

    const handleCompletePayment = async () => {
        if (totalReceived < grandTotal) {
            if (!window.confirm(`Amount received (Rs. ${totalReceived.toFixed(2)}) is less than Grand Total (Rs. ${grandTotal.toFixed(2)}). Continue?`)) {
                return;
            }
        }

        setActionLoading(true);
        try {
            const token = localStorage.getItem('token');
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
                    payments: normalizedPayments,
                    notes: notes
                })
            });

            if (response.ok) {
                // Trigger the receipt view
                setIsCompleted(true);
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

    const handleSaveBill = () => {
        // Technically just navigating back keeps it in BILL_OPEN
        alert('Bill placed on hold / saved.');
        onNavigate('orders');
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

    if (loading || !order) {
        return (
            <DashboardLayout onNavigate={onNavigate} activePage="orders">
                <div className="flex items-center justify-center min-h-screen bill-open-page">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (isCompleted) {
        return (
            <DashboardLayout onNavigate={onNavigate} activePage="orders">
                <div className="flex items-center justify-center min-h-screen bill-open-page p-6">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-3 bg-emerald-500"></div>
                        <div className="p-8 text-center border-b border-gray-100">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Payment Complete</h2>
                            <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest font-bold">Invoice #{order.order_id} Closed</p>
                        </div>

                        <div className="p-8 bg-gray-50">
                            <div className="bg-white border text-black border-dashed border-gray-300 rounded-xl p-6 shadow-sm font-mono text-sm relative print:shadow-none print:border-none print:p-0">
                                <div className="text-center mb-6 border-b border-dashed border-gray-300 pb-4">
                                    <h3 className="font-black text-xl uppercase tracking-widest">Abeyrathna Hardware</h3>
                                    <p className="text-xs text-gray-500 mt-1">Receipt for #{order.order_id}</p>
                                    <p className="text-xs text-gray-500">{currentTime.toLocaleString()}</p>
                                </div>
                                <div className="space-y-3 mb-6">
                                    {items.map(item => (
                                        <div key={item.order_item_id} className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold">{item.item_name}</p>
                                                <p className="text-xs text-gray-500">{item.editableQty} x {item.editablePrice.toFixed(2)}</p>
                                            </div>
                                            <span className="font-bold">Rs. {((item.editablePrice * item.editableQty) - (parseFloat(item.itemDiscount) || 0)).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-dashed border-gray-300 pt-4 space-y-2 text-xs uppercase tracking-widest font-bold text-gray-500">
                                    <div className="flex justify-between"><span>Subtotal:</span> <span>Rs. {subtotal.toFixed(2)}</span></div>
                                    {overallDiscountAmount > 0 && <div className="flex justify-between text-red-500"><span>Discount:</span> <span>- Rs. {overallDiscountAmount.toFixed(2)}</span></div>}
                                    {parsedOtherCharges > 0 && <div className="flex justify-between"><span>Other Charges:</span> <span>+ Rs. {parsedOtherCharges.toFixed(2)}</span></div>}
                                </div>
                                <div className="mt-4 pt-4 border-t-2 border-gray-800 flex justify-between items-center text-lg">
                                    <span className="font-black uppercase tracking-widest text-gray-900">Total</span>
                                    <span className="font-black text-gray-900">Rs. {grandTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-white gap-3 flex flex-col font-sans">
                            <div className="flex gap-3">
                                <button onClick={() => window.print()} className="flex-1 py-3 bg-[#1E1E1E] hover:bg-black text-white font-bold uppercase tracking-widest text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                    Print Bill
                                </button>
                                <button onClick={() => {
                                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ orderId: order.order_id, date: currentTime, items, grandTotal }));
                                    const dlAnchorElem = document.createElement('a'); dlAnchorElem.setAttribute("href", dataStr); dlAnchorElem.setAttribute("download", `bill_${order.order_id}.json`); dlAnchorElem.click();
                                }} className="flex-1 py-3 bg-white border-2 border-gray-200 text-gray-800 hover:bg-gray-50 font-bold uppercase tracking-widest text-xs rounded-xl transition-all flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    Download
                                </button>
                            </div>
                            <button onClick={() => onNavigate('orders')} className="w-full py-4 mt-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-sm rounded-xl transition-all shadow-lg active:scale-95">
                                Return to Orders
                            </button>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout onNavigate={onNavigate} activePage="orders">
            <div className="bill-open-page p-4 md:p-6 min-h-screen font-sans flex flex-col gap-6">

                {/* 1. HEADER SECTION */}
                <div className="bg-[#1E1E1E] border border-[#333] rounded-2xl shadow-xl p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => onNavigate('order-details', { orderId })} className="bill-open-back-btn p-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight m-0 text-emerald-500">Invoice #{order.order_id}</h2>
                            <div className="flex items-center gap-4 mt-2 font-mono text-gray-400 text-xs">
                                <span>{currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                                <span className="uppercase tracking-widest"><span className="text-gray-500">Cashier:</span> {user?.name || 'Unknown'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto bg-[#161616] p-4 border border-[#2a2a2a] rounded-xl flex-1 max-w-2xl">
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Customer Name</label>
                            <input
                                type="text"
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                                placeholder="Walk-in Customer"
                                className="w-full bg-[#252525] border border-[#444] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500 transition-colors"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Mobile Contact</label>
                            <input
                                type="text"
                                value={customerPhone}
                                onChange={e => setCustomerPhone(e.target.value)}
                                placeholder="Phone number"
                                className="w-full bg-[#252525] border border-[#444] rounded-lg px-3 py-2 text-white text-sm font-mono outline-none focus:border-emerald-500 transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* TWO-COLUMN LAYOUT */}
                <div className="flex flex-col lg:flex-row gap-6">

                    {/* LEFT COLUMN: 2. ITEM LIST */}
                    <div className="flex-[2] bg-[#1E1E1E] border border-[#333] rounded-2xl shadow-xl flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-[#333] bg-[#161616] flex justify-between items-center">
                            <h3 className="text-xs font-black text-gray-300 uppercase tracking-widest flex items-center gap-2">
                                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                Billed Items
                            </h3>
                            <span className="bill-readonly-badge text-[10px] font-bold text-red-400 uppercase tracking-widest border border-red-500/20 bg-red-500/10 px-2 py-1 rounded">Read-Only</span>
                        </div>
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[#121212] border-b border-[#333] uppercase text-[10px] tracking-widest text-gray-500 font-black">
                                    <tr>
                                        <th className="px-4 py-3">Item details</th>
                                        <th className="px-4 py-3">SKU / Unit</th>
                                        <th className="px-4 py-3 text-center">Qty</th>
                                        <th className="px-4 py-3 text-right">Unit Price</th>
                                        <th className="px-4 py-3 text-right">Discount</th>
                                        <th className="px-4 py-3 text-right border-l border-[#333]">Net Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => {
                                        const netTotal = (item.editablePrice * item.editableQty) - (parseFloat(item.itemDiscount) || 0);
                                        return (
                                            <tr key={item.order_item_id} className="border-b border-[#333] hover:bg-[#252525] transition-colors group">
                                                <td className="px-4 py-3">
                                                    <span className="font-bold text-white text-sm">{item.item_name}</span>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-gray-500 text-xs">SYS-{item.item_id}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="font-bold text-white text-base bg-[#252525] px-3 py-1 rounded">{item.editableQty}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="font-mono text-gray-300 font-bold">{parseFloat(item.editablePrice).toFixed(2)}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <input
                                                        type="number"
                                                        min="0" step="0.01"
                                                        className="w-16 bg-transparent border-b border-dashed border-[#555] px-1 py-1 text-right text-red-400 font-mono font-bold outline-none focus:border-red-500"
                                                        value={item.itemDiscount}
                                                        onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right border-l border-[#333]">
                                                    <span className="font-extrabold text-white text-base tabular-nums">{netTotal.toFixed(2)}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {items.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="text-center py-12 text-gray-600 font-bold uppercase tracking-widest text-xs">No items in the cart</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: SUMMARY, PAYMENT & ACTIONS */}
                    <div className="flex-[1] flex flex-col gap-6">

                        {/* 3. PRICING SUMMARY PANEL */}
                        <div className="bg-[#1E1E1E] border border-[#333] rounded-2xl shadow-xl overflow-hidden p-6 pb-2">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-[#333] pb-4 mb-4">Pricing Summary</h3>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-gray-300 font-bold text-sm">
                                    <span>Subtotal</span>
                                    <span className="tabular-nums font-mono">Rs. {subtotal.toFixed(2)}</span>
                                </div>

                                {totalItemDiscounts > 0 && (
                                    <div className="flex justify-between items-center text-red-400 font-bold text-sm">
                                        <span>Total Item Discounts</span>
                                        <span className="tabular-nums font-mono">- Rs. {totalItemDiscounts.toFixed(2)}</span>
                                    </div>
                                )}

                                <div className="pt-2 border-t border-[#333]">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Overall Discount</span>
                                        <select
                                            value={overallDiscountType}
                                            onChange={(e) => setOverallDiscountType(e.target.value)}
                                            className="bill-discount-type bg-[#252525] border border-[#444] text-white text-[10px] font-bold uppercase rounded px-2 py-1 outline-none"
                                        >
                                            <option value="fixed">Fixed (Rs.)</option>
                                            <option value="percent">Percentage (%)</option>
                                        </select>
                                    </div>
                                    <input
                                        type="number" min="0" step="0.01"
                                        className="w-full bg-[#161616] border border-[#444] rounded-lg px-3 py-2 text-right text-white font-mono font-bold outline-none focus:border-red-500"
                                        value={overallDiscountValue}
                                        onChange={(e) => setOverallDiscountValue(e.target.value)}
                                        placeholder="0"
                                    />
                                </div>

                                <div className="pt-2">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Other Charges</span>
                                    <input
                                        type="number" min="0" step="0.01"
                                        className="w-full bg-[#161616] border border-[#444] rounded-lg px-3 py-2 text-right text-emerald-400 font-mono font-bold outline-none focus:border-emerald-500"
                                        value={otherCharges}
                                        onChange={(e) => setOtherCharges(e.target.value)}
                                        placeholder="0"
                                    />
                                </div>

                                <div className="bill-grand-total pt-6 mt-4 border-t border-[#333] flex justify-between items-end pb-4">
                                    <span className="text-sm font-black text-gray-300 uppercase tracking-widest">Grand Total</span>
                                    <span className="text-4xl font-black text-emerald-500 tracking-tight tabular-nums font-mono">
                                        Rs. {grandTotal.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 4. PAYMENT SECTION */}
                        <div className="bg-[#1E1E1E] border border-[#333] rounded-2xl shadow-xl overflow-hidden p-6">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-[#333] pb-4 mb-4">Payment Registry</h3>

                            <div className="space-y-3 mb-4">
                                {paymentMethods.map((pm, idx) => (
                                    <div key={pm.id} className="flex items-center gap-2">
                                        {paymentMethods.length > 1 && (
                                            <button onClick={() => removePaymentMethod(pm.id)} className="p-2 bg-red-600/10 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-colors">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        )}
                                        <select
                                            className="bg-[#252525] border border-[#444] text-white text-xs font-bold uppercase tracking-widest rounded-lg px-3 py-3 outline-none focus:border-emerald-500"
                                            value={pm.method}
                                            onChange={e => updatePaymentMethod(pm.id, 'method', e.target.value)}
                                        >
                                            <option value="Cash">Cash</option>
                                            <option value="Card">Card</option>
                                            <option value="Bank">Bank Transfer</option>
                                        </select>
                                        <input
                                            type="number" min="0" step="0.01"
                                            className="flex-1 bg-[#161616] border border-[#444] rounded-lg px-3 py-3 text-right text-white font-mono font-bold outline-none focus:border-emerald-500"
                                            value={pm.amount}
                                            onChange={e => updatePaymentMethod(pm.id, 'amount', e.target.value)}
                                            placeholder={`Rs. ${grandTotal.toFixed(2)}`}
                                        />
                                    </div>
                                ))}
                                <button onClick={addPaymentMethod} className="w-full py-2 bg-[#252525] border border-dashed border-[#555] text-gray-400 rounded-lg text-xs font-bold uppercase tracking-widest hover:text-white hover:border-emerald-500 hover:bg-[#161616] transition-colors">
                                    + Add Split Payment Option
                                </button>
                            </div>

                            {/* Balance block */}
                            <div className={`p-4 rounded-xl border ${balance >= 0 ? 'bg-emerald-900/10 border-emerald-500/20 text-emerald-400' : 'bg-red-900/10 border-red-500/20 text-red-400'}`}>
                                <div className="flex justify-between items-center text-sm font-bold uppercase tracking-widest">
                                    <span>{balance >= 0 ? 'Change To Give' : 'Balance Due'}</span>
                                    <span className="text-xl tabular-nums font-mono">Rs. {Math.abs(balance).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* 5. ACTION BUTTONS & NOTES */}
                        <div className="bg-[#1E1E1E] border border-[#333] rounded-2xl shadow-xl overflow-hidden p-6">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-[#333] pb-4 mb-4">Operations</h3>

                            <textarea
                                className="w-full h-20 bg-[#161616] border border-[#444] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-blue-500 transition-colors mb-4 resize-none"
                                placeholder="Add optional notes here..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            ></textarea>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleCompletePayment}
                                    disabled={actionLoading}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-lg rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all active:scale-95 disabled:opacity-50"
                                >
                                    COMPLETE PAYMENT
                                </button>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleSaveBill}
                                        disabled={actionLoading}
                                        className="flex-1 py-3 bg-[#252525] border border-[#444] hover:bg-[#333] text-gray-300 font-bold uppercase tracking-widest text-xs rounded-xl transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        HOLD/SAVE BILL
                                    </button>
                                    <button
                                        onClick={handleCancelBill}
                                        disabled={actionLoading}
                                        className="flex-1 py-3 bg-transparent border-2 border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white font-bold uppercase tracking-widest text-xs rounded-xl transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        CANCEL BILL
                                    </button>
                                </div>
                            </div>

                        </div>

                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default BillOpenPage;
