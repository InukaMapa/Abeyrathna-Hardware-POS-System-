import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { API_BASE_URL, ENDPOINTS } from '../../config/api';
import {
    Search, CreditCard, CheckCircle2, ArrowLeft, ArrowRight,
    DollarSign, Package, Printer, X, Receipt, Landmark
} from 'lucide-react';
import '../../styles/dashboard.css';
import '../../styles/cash.css';

const SupplierPaymentsPage = ({ onNavigate }) => {
    const [profileBatches, setProfileBatches] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPaymentProcessing, setSelectedPaymentProcessing] = useState(null);
    const [paymentForm, setPaymentForm] = useState({
        type: 'Full',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        method: 'Cash',
        reference: '',
        notes: ''
    });

    // Filters
    const [paymentSearch, setPaymentSearch] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('PENDING'); // PENDING, PAID, ALL
    const [paymentDate, setPaymentDate] = useState('NEWEST');
    const [paymentSupplier, setPaymentSupplier] = useState('ALL');

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            
            const [batchesRes, suppliersRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/inventory/batches`, { headers }),
                axios.get(`${API_BASE_URL}${ENDPOINTS.SUPPLIERS}`, { headers })
            ]);

            // Formatter similar to Admin side
            const formatted = batchesRes.data.map(b => {
                const latestPayout = b.supplier_payout_requests?.length > 0
                    ? b.supplier_payout_requests.sort((a, b) => new Date(b.authorized_at) - new Date(a.authorized_at))[0]
                    : null;
                return {
                    ...b,
                    raw_net_value: parseFloat(b.net_value),
                    raw_paid_amount: parseFloat(b.paid_amount || 0),
                    remaining_balance: parseFloat(b.net_value) - parseFloat(b.paid_amount || 0),
                    date: new Date(b.batch_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                    net_value: `Rs. ${parseFloat(b.net_value).toLocaleString()}`,
                    status: b.status || 'SETTLED',
                    latest_payout: latestPayout
                };
            });

            setProfileBatches(formatted);
            setSuppliers(suppliersRes.data);
        } catch (err) {
            console.error('Failed to load payments data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPayment = (batch) => {
        // Parse items in batch from the notes column just like in inventoryController
        const parseNotesToItems = (notesText) => {
            if (!notesText) return [];
            const regex = /(?:Purchased|Added)\s+(\d+(?:\.\d+)?)\s*x\s+(.*?)\s*\(Rs\.\s*(\d+(?:\.\d+)?)\s*each\)/gi;
            const grouped = {};
            let match;
            while ((match = regex.exec(notesText)) !== null) {
                const qty = parseFloat(match[1]);
                const name = match[2].trim();
                const price = parseFloat(match[3]);
                const key = `${name}_${price}`;
                if (!grouped[key]) {
                    grouped[key] = {
                        name,
                        qty: 0,
                        price
                    };
                }
                grouped[key].qty += qty;
            }
            return Object.values(grouped).map(item => ({
                name: item.name,
                qty: item.qty,
                price: item.price.toLocaleString(),
                total: (item.qty * item.price).toLocaleString()
            }));
        };

        const notesToParse = batch.notes || '';
        let displayNotes = notesToParse;
        if (notesToParse.startsWith('{')) {
            try {
                const parsed = JSON.parse(notesToParse);
                displayNotes = parsed.legacy_notes || '';
            } catch (e) {}
        }

        const itemsInBatch = parseNotesToItems(displayNotes);
        setSelectedPaymentProcessing({ ...batch, lineItems: itemsInBatch });
        setPaymentForm({
            type: 'Full',
            amount: batch.remaining_balance,
            date: new Date().toISOString().split('T')[0],
            method: 'Cash',
            reference: '',
            notes: ''
        });
    };

    const handleCompletePaymentForm = async () => {
        if (!selectedPaymentProcessing) return;

        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const res = await axios.post(`${API_BASE_URL}/inventory/batches/${selectedPaymentProcessing.id}/pay`, {
                amount: paymentForm.amount,
                method: paymentForm.method,
                reference: paymentForm.reference,
                notes: paymentForm.notes
            }, { headers });

            alert("Payment Processed Successfully!");
            setSelectedPaymentProcessing(null);
            
            // Dispatch event to refresh Counter drawer active shift summary
            window.dispatchEvent(new CustomEvent('cash-movement-added'));

            fetchInitialData();
        } catch (error) {
            console.error('Payment processing failed:', error);
            alert("Payment Failed: " + (error.response?.data?.message || error.message));
        }
    };

    const filteredBatches = profileBatches.filter(b => {
        // Exclude balance 0 items if unpaid
        if (b.remaining_balance <= 0 && b.payment_status !== 'PAID') return false;

        if (paymentStatus === 'PENDING' && b.payment_status === 'PAID') return false;
        if (paymentStatus === 'PAID' && b.payment_status !== 'PAID') return false;
        if (paymentSupplier !== 'ALL' && b.supplier_id !== parseInt(paymentSupplier) && b.supplier_id !== paymentSupplier) return false;

        if (paymentSearch) {
            const s = suppliers.find(sup => sup.id === b.supplier_id);
            const query = paymentSearch.toLowerCase();
            const numStr = (b.batch_number || '').toLowerCase();
            const supStr = (s?.supplier_name || '').toLowerCase();
            if (!numStr.includes(query) && !supStr.includes(query)) return false;
        }

        if (paymentDate !== 'NEWEST' && paymentDate !== 'OLDEST' && paymentDate !== 'ALL') {
            const bd = new Date(b.batch_date || b.created_at || new Date());
            const today = new Date();
            if (paymentDate === 'TODAY') {
                if (bd.toDateString() !== today.toDateString()) return false;
            } else if (paymentDate === 'THIS_MONTH') {
                if (bd.getMonth() !== today.getMonth() || bd.getFullYear() !== today.getFullYear()) return false;
            } else if (paymentDate === 'THIS_WEEK') {
                const diff = Math.floor((today - bd) / (1000 * 60 * 60 * 24));
                if (diff > 7 || diff < 0) return false;
            }
        }
        return true;
    });

    filteredBatches.sort((a, b) => {
        const da = new Date(a.batch_date || a.created_at || 0).getTime();
        const db = new Date(b.batch_date || b.created_at || 0).getTime();
        if (paymentDate === 'OLDEST') return da - db;
        return db - da;
    });

    return (
        <DashboardLayout onNavigate={onNavigate} activePage="supplier-payments">
            <div className="cash-counter-container" style={{ padding: '30px 44px' }}>
                
                {/* Header */}
                <div className="cash-page-header">
                    <button
                        onClick={() => onNavigate('dashboard')}
                        className="cash-back-button"
                        title="Back to Dashboard"
                        aria-label="Back to Dashboard"
                    >
                        <svg className="cash-back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="cash-page-title-group">
                        <span className="cash-page-kicker">Cashier Desk</span>
                        <h2>Supplier Payments</h2>
                        <p>Settle pending procurement bills and record cash-outs directly</p>
                    </div>
                </div>

                {loading ? (
                    <div className="cash-card">Loading payments registry...</div>
                ) : !selectedPaymentProcessing ? (
                    <div className="cash-card" style={{ padding: '28px' }}>
                        {/* Filters Bar */}
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '12px',
                            marginBottom: '24px',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <h4 style={{
                                color: 'var(--text-secondary)',
                                fontSize: '0.72rem',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                margin: 0
                            }}>Select Payout Bill</h4>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', width: '100%', maxWidth: '900px' }}>
                                <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                                    <Search style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: 'var(--primary-green)',
                                        width: '16px',
                                        height: '16px'
                                    }} />
                                    <input
                                        type="text"
                                        placeholder="Search by batch number or supplier..."
                                        value={paymentSearch}
                                        onChange={e => setPaymentSearch(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px 8px 36px',
                                            borderRadius: '8px',
                                            border: '1.5px solid var(--border-color)',
                                            outline: 'none',
                                            fontSize: '0.85rem'
                                        }}
                                    />
                                </div>
                                <select
                                    value={paymentStatus}
                                    onChange={e => setPaymentStatus(e.target.value)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: '1.5px solid var(--border-color)',
                                        background: '#fff',
                                        outline: 'none',
                                        fontSize: '0.85rem',
                                        minWidth: '130px'
                                    }}
                                >
                                    <option value="ALL">All Status</option>
                                    <option value="PENDING">Pending Payments</option>
                                    <option value="PAID">Fully Completed</option>
                                </select>
                                <select
                                    value={paymentDate}
                                    onChange={e => setPaymentDate(e.target.value)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: '1.5px solid var(--border-color)',
                                        background: '#fff',
                                        outline: 'none',
                                        fontSize: '0.85rem',
                                        minWidth: '130px'
                                    }}
                                >
                                    <option value="NEWEST">Newest First</option>
                                    <option value="OLDEST">Oldest First</option>
                                    <option value="TODAY">Today</option>
                                    <option value="THIS_WEEK">This Week</option>
                                    <option value="THIS_MONTH">This Month</option>
                                </select>
                                <select
                                    value={paymentSupplier}
                                    onChange={e => setPaymentSupplier(e.target.value)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: '1.5px solid var(--border-color)',
                                        background: '#fff',
                                        outline: 'none',
                                        fontSize: '0.85rem',
                                        minWidth: '160px',
                                        maxWidth: '220px'
                                    }}
                                >
                                    <option value="ALL">All Suppliers</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.supplier_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Batches Grid */}
                        {filteredBatches.length === 0 ? (
                            <div style={{
                                padding: '48px',
                                textAlign: 'center',
                                border: '1.5px dashed var(--border-color)',
                                borderRadius: '14px',
                                background: 'rgba(22, 163, 74, 0.02)'
                            }}>
                                <CheckCircle2 size={32} style={{ color: 'var(--primary-green)', opacity: 0.5, marginBottom: '12px' }} />
                                <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)', fontSize: '0.95rem' }}>No Pending Bills</h4>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>All supplier invoice balances are fully settled.</p>
                            </div>
                        ) : (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: '20px'
                            }}>
                                {filteredBatches.map((batch) => {
                                    const s = suppliers.find(sup => sup.id === batch.supplier_id);
                                    return (
                                        <div
                                            key={batch.id}
                                            onClick={() => handleSelectPayment(batch)}
                                            style={{
                                                padding: '20px',
                                                background: '#fff',
                                                border: '1px solid var(--border-color)',
                                                borderTop: '4px solid var(--primary-green)',
                                                borderRadius: '16px',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 12px rgba(22, 101, 52, 0.03)',
                                                transition: 'all 0.2s ease',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}
                                            className="supplier-payment-batch-card-hoverable"
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontWeight: '700', fontSize: '0.92rem', color: 'var(--text-primary)' }}>{batch.batch_number}</span>
                                                    <span style={{
                                                        fontSize: '0.64rem',
                                                        fontWeight: '700',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        textTransform: 'uppercase',
                                                        border: '1px solid',
                                                        backgroundColor: batch.payment_status === 'PARTIAL' ? 'rgba(212, 160, 23, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                        color: batch.payment_status === 'PARTIAL' ? 'var(--accent-color)' : '#dc2626',
                                                        borderColor: batch.payment_status === 'PARTIAL' ? 'rgba(212, 160, 23, 0.2)' : 'rgba(239, 68, 68, 0.2)'
                                                    }}>
                                                        {batch.payment_status === 'PARTIAL' ? 'Partial' : 'Due'}
                                                    </span>
                                                </div>
                                                <ArrowRight size={16} style={{ color: 'var(--primary-green)' }} />
                                            </div>
                                            
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '18px' }}>
                                                <span style={{ fontSize: '0.78rem', color: 'var(--accent-color)', fontWeight: '600', textTransform: 'uppercase' }}>
                                                    {s ? s.supplier_name : 'Unknown Supplier'}
                                                </span>
                                                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                                                    {batch.date}
                                                </span>
                                            </div>

                                            <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                                                <p style={{ margin: '0 0 4px 0', fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Settlement Balance</p>
                                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)' }}>Rs. {batch.remaining_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1.1fr 0.9fr',
                        gap: '24px',
                        alignItems: 'stretch'
                    }}>
                        {/* LEFT: Details View */}
                        <div className="cash-card" style={{ display: 'flex', flexDirection: 'column', margin: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                                <h3 className="cash-section-title" style={{ margin: 0 }}>Transaction Profile</h3>
                                <button
                                    onClick={() => setSelectedPaymentProcessing(null)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '12px',
                                        border: '1.5px solid var(--border-color)',
                                        background: '#fff',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        fontSize: '0.78rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontWeight: '600'
                                    }}
                                >
                                    <ArrowLeft size={14} /> Back
                                </button>
                            </div>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ background: 'var(--bg-mint)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                                        <div>
                                            <p style={{ margin: '0 0 2px 0', fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Batch Identifier</p>
                                            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-primary)' }}>{selectedPaymentProcessing.batch_number}</h2>
                                        </div>
                                        <span style={{
                                            fontSize: '0.64rem',
                                            fontWeight: '700',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            color: '#dc2626',
                                            border: '1px solid rgba(239, 68, 68, 0.15)',
                                            textTransform: 'uppercase'
                                        }}>
                                            Payment Due
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '14px' }}>
                                        <div>
                                            <p style={{ margin: '0 0 2px 0', fontSize: '0.78rem', color: 'var(--accent-color)', fontWeight: '600', textTransform: 'uppercase' }}>
                                                {suppliers.find(s => s.id === selectedPaymentProcessing.supplier_id)?.supplier_name || 'Unknown'}
                                            </p>
                                            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{selectedPaymentProcessing.date}</p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ margin: '0 0 2px 0', fontSize: '0.65rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Remaining Balance</p>
                                            <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#dc2626' }}>Rs. {selectedPaymentProcessing.remaining_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                            <p style={{ margin: '2px 0 0 0', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Total Invoice: {selectedPaymentProcessing.net_value}</p>
                                        </div>
                                    </div>
                                </div>

                                {selectedPaymentProcessing.raw_paid_amount > 0 && (
                                    <div style={{ background: 'rgba(22, 163, 74, 0.05)', border: '1px solid rgba(22, 163, 74, 0.15)', padding: '16px', borderRadius: '16px' }}>
                                        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.72rem', color: 'var(--primary-green)', fontWeight: '600', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <CheckCircle2 size={14} /> Recent Payment Activity
                                        </h4>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>Rs. {selectedPaymentProcessing.raw_paid_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                                <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                                    {selectedPaymentProcessing.payment_date ? new Date(selectedPaymentProcessing.payment_date).toLocaleString() : 'Recorded'}
                                                </p>
                                            </div>
                                            <div>
                                                <span style={{
                                                    fontSize: '0.68rem',
                                                    fontWeight: '700',
                                                    textTransform: 'uppercase',
                                                    padding: '3px 8px',
                                                    borderRadius: '4px',
                                                    background: 'rgba(22, 163, 74, 0.08)',
                                                    color: 'var(--primary-green)',
                                                    border: '1px solid rgba(22, 163, 74, 0.15)'
                                                }}>
                                                    {selectedPaymentProcessing.latest_payout ? selectedPaymentProcessing.latest_payout.payout_number : 'PAID'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', marginTop: 0 }}>Itemized Details</h4>
                                    <div style={{ border: '1.5px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                                            <thead>
                                                <tr style={{ background: 'var(--bg-mint)', borderBottom: '1.5px solid var(--border-color)' }}>
                                                    <th style={{ padding: '10px 14px', fontWeight: '600', color: 'var(--dark-green)' }}>Item</th>
                                                    <th style={{ padding: '10px 14px', fontWeight: '600', color: 'var(--dark-green)', textAlign: 'center' }}>Qty</th>
                                                    <th style={{ padding: '10px 14px', fontWeight: '600', color: 'var(--dark-green)', textAlign: 'right' }}>Price</th>
                                                    <th style={{ padding: '10px 14px', fontWeight: '600', color: 'var(--dark-green)', textAlign: 'right' }}>Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedPaymentProcessing.lineItems?.map((item, i) => (
                                                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                        <td style={{ padding: '10px 14px', color: 'var(--text-primary)' }}>{item.name}</td>
                                                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', textAlign: 'center' }}>{item.qty}</td>
                                                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', textAlign: 'right' }}>Rs. {item.price}</td>
                                                        <td style={{ padding: '10px 14px', color: 'var(--text-primary)', fontWeight: '600', textAlign: 'right' }}>Rs. {item.total}</td>
                                                    </tr>
                                                ))}
                                                {(!selectedPaymentProcessing.lineItems || selectedPaymentProcessing.lineItems.length === 0) && (
                                                    <tr>
                                                        <td colSpan="4" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                                                            No batch items mapped. Raw description only.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Processor Form */}
                        <div className="cash-card" style={{ display: 'flex', flexDirection: 'column', margin: 0, borderTop: '4px solid var(--accent-color)' }}>
                            <h3 className="cash-section-title" style={{ marginBottom: '24px' }}>Settlement Processor</h3>
                            
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    {['Full', 'Partial'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => {
                                                setPaymentForm({
                                                    ...paymentForm,
                                                    type: type,
                                                    amount: type === 'Full' ? selectedPaymentProcessing.remaining_balance : ''
                                                });
                                            }}
                                            style={{
                                                padding: '10px',
                                                borderRadius: '12px',
                                                border: '1.5px solid',
                                                cursor: 'pointer',
                                                fontSize: '0.82rem',
                                                fontWeight: '600',
                                                transition: 'all 0.18s ease',
                                                backgroundColor: paymentForm.type === type ? 'var(--accent-color)' : '#fff',
                                                color: paymentForm.type === type ? '#fff' : 'var(--text-secondary)',
                                                borderColor: paymentForm.type === type ? 'var(--accent-color)' : 'var(--border-color)'
                                            }}
                                        >
                                            {type} Settlement
                                        </button>
                                    ))}
                                </div>

                                <div style={{ background: 'var(--bg-mint)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.04em' }}>Settlement Amount (Rs.)</label>
                                    <input
                                        type="number"
                                        readOnly={paymentForm.type === 'Full'}
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: '1.5px solid var(--border-color)',
                                            background: paymentForm.type === 'Full' ? 'rgba(255,255,255,0.4)' : '#fff',
                                            color: 'var(--text-primary)',
                                            fontSize: '1.15rem',
                                            fontWeight: '700',
                                            outline: 'none'
                                        }}
                                        placeholder="0.00"
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>Payment Date</label>
                                        <input
                                            type="date"
                                            value={paymentForm.date}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                borderRadius: '8px',
                                                border: '1.5px solid var(--border-color)',
                                                background: '#fff',
                                                outline: 'none',
                                                fontSize: '0.84rem'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>Payment Method</label>
                                        <select
                                            value={paymentForm.method}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                borderRadius: '8px',
                                                border: '1.5px solid var(--border-color)',
                                                background: '#fff',
                                                outline: 'none',
                                                fontSize: '0.84rem'
                                            }}
                                        >
                                            <option value="Cash">Cash Transfer</option>
                                            <option value="Bank">Bank Deposit</option>
                                            <option value="Cheque">Bank Cheque</option>
                                        </select>
                                    </div>
                                </div>

                                {(paymentForm.method === 'Bank' || paymentForm.method === 'Cheque') && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>Bank Reference / Cheque No.</label>
                                        <input
                                            type="text"
                                            value={paymentForm.reference}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                borderRadius: '8px',
                                                border: '1.5px solid var(--border-color)',
                                                background: '#fff',
                                                outline: 'none',
                                                fontSize: '0.84rem'
                                            }}
                                            placeholder="Enter reference number..."
                                        />
                                    </div>
                                )}

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>Internal Notes (Optional)</label>
                                    <textarea
                                        value={paymentForm.notes}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: '1.5px solid var(--border-color)',
                                            background: '#fff',
                                            outline: 'none',
                                            fontSize: '0.84rem',
                                            resize: 'none',
                                            minHeight: '60px'
                                        }}
                                        rows="2"
                                        placeholder="Add remarks..."
                                    />
                                </div>
                            </div>

                            <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                                <button
                                    onClick={handleCompletePaymentForm}
                                    disabled={!paymentForm.amount}
                                    className="cash-action-button primary"
                                    style={{
                                        width: '100%',
                                        minHeight: '44px',
                                        fontSize: '0.88rem',
                                        fontWeight: '600',
                                        background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
                                        boxShadow: '0 10px 24px rgba(212, 160, 23, 0.18)'
                                    }}
                                >
                                    Authorize & Complete Payment
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Hover styling rules */}
            <style jsx global>{`
                .supplier-payment-batch-card-hoverable:hover {
                    border-color: var(--primary-green) !important;
                    background-color: var(--bg-mint) !important;
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(22, 101, 52, 0.08) !important;
                }
            `}</style>
        </DashboardLayout>
    );
};

export default SupplierPaymentsPage;
