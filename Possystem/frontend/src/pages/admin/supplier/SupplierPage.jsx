import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import AddSupplierModal from './AddSupplierModal';
// import SupplierProfileModal from './SupplierProfileModal'; // To be created
import {
    Plus, Search, User, Mail, Phone, Building, Trash2, Edit,
    FileText, CreditCard, RefreshCcw, LayoutDashboard,
    TrendingUp, AlertCircle, CheckCircle2, MoreHorizontal,
    Eye, Filter, ArrowUpRight, ArrowLeft, ArrowRight, DollarSign, Package, Printer, MapPin, X,
    Receipt, Landmark, Activity, Download
} from 'lucide-react';
import { API_BASE_URL, ENDPOINTS } from '../../../config/api';
import '../../../styles/dashboard.css';
import { deleteSupplier } from '../../../services/supplierService';

const SupplierPage = ({ onNavigate }) => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, ACTIVE, INACTIVE
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [selectedSupplier, setSelectedSupplier] = useState(null); // For Profile Modal
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [sellerNote, setSellerNote] = useState("");
    const [noteDate, setNoteDate] = useState("15 May 24");
    const [activeProfileTab, setActiveProfileTab] = useState('Overview');
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [profileBatches, setProfileBatches] = useState([]);
    const [profileReturns, setProfileReturns] = useState([]);
    const [batchItems, setBatchItems] = useState({});
    const [isGlobalPaymentsOpen, setGlobalPaymentsOpen] = useState(false);

    // Payment Page Filters
    const [supplierPagePaymentSearch, setSupplierPagePaymentSearch] = useState('');
    const [supplierPagePaymentStatus, setSupplierPagePaymentStatus] = useState('PENDING'); // PENDING, PAID, ALL
    const [supplierPagePaymentDate, setSupplierPagePaymentDate] = useState('NEWEST');
    const [supplierPagePaymentSupplier, setSupplierPagePaymentSupplier] = useState('ALL');

    const fetchBatches = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/inventory/batches`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            // Map API response to match existing UI logic
            const formatted = response.data.map(b => {
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

            // Update Global Dashboard Stats
            const active = formatted.filter(b => b.remaining_balance > 0 && b.payment_status !== 'PAID');
            setStats(prev => ({
                ...prev,
                activePOs: active.length,
                pendingPayments: active.reduce((sum, b) => sum + b.remaining_balance, 0)
            }));

            // Update Sidebars
            setRecentPOs(formatted.filter(b => b.remaining_balance > 0 || b.payment_status === 'PAID').slice(0, 3).map(b => ({
                id: b.batch_number,
                supplier: b.suppliers?.supplier_name || 'Unknown',
                amount: b.raw_net_value,
                status: b.payment_status === 'PAID' ? 'COMPLETED' : 'PENDING',
                date: b.date
            })));

            setPendingPayments(active.filter(b => b.remaining_balance > 0).slice(0, 2).map(b => ({
                id: b.batch_number,
                supplier: b.suppliers?.supplier_name || 'Unknown',
                amount: b.remaining_balance,
                dueDate: b.date
            })));
        } catch (error) { console.error('Error fetching batches for profile:', error); }
    };

    const calculateStats = () => {
        const supplierBatches = profileBatches.filter(b => b.supplier_id === selectedSupplier?.id);
        const complete = supplierBatches
            .reduce((sum, b) => sum + (b.raw_paid_amount || 0), 0);
        const outstanding = supplierBatches
            .reduce((sum, b) => sum + (b.remaining_balance || 0), 0);

        return {
            complete: `Rs. ${complete.toLocaleString()}`,
            outstanding: `Rs. ${outstanding.toLocaleString()}`
        };
    };

    const [selectedPaymentProcessing, setSelectedPaymentProcessing] = useState(null);
    const [paymentForm, setPaymentForm] = useState({
        type: 'Full',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        method: 'Cash',
        reference: '',
        notes: ''
    });

    const handleSelectPayment = async (batch) => {
        try {
            const invResponse = await axios.get(`${API_BASE_URL}/inventory`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            const itemsInBatch = invResponse.data
                .filter(item => item.batch_id === batch.id)
                .map(item => ({
                    name: item.ingredient_name,
                    qty: item.quantity,
                    price: parseFloat(item.buying_price || 0).toLocaleString(),
                    total: (parseFloat(item.quantity) * parseFloat(item.buying_price || 0)).toLocaleString()
                }));

            setSelectedPaymentProcessing({ ...batch, lineItems: itemsInBatch });
            setPaymentForm({
                type: 'Full',
                amount: batch.remaining_balance,
                date: new Date().toISOString().split('T')[0],
                method: 'Cash',
                reference: '',
                notes: ''
            });
        } catch (err) { console.error(err); }
    };

    const handleCompletePaymentForm = async () => {
        if (!selectedPaymentProcessing) return;
        try {
            const res = await axios.post(`${API_BASE_URL}/inventory/batches/${selectedPaymentProcessing.id}/pay`, {
                amount: paymentForm.amount,
                method: paymentForm.method,
                reference: paymentForm.reference,
                notes: paymentForm.notes,
                type: paymentForm.type
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            fetchBatches();
            setSelectedPaymentProcessing(null);

            if (res.data.payout_request) {
                alert(`Payment Authorized! Payout Request #${res.data.payout_request.payout_number} created and sent to cashier.`);
            } else {
                alert("Payment Processed Successfully!");
            }
        } catch (error) { alert("Payment Failed"); }
    };


    const handleProcessPayment = async (batchId) => {
        try {
            await axios.post(`${API_BASE_URL}/inventory/batches/${batchId}/pay`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            fetchBatches();
            alert("Payment Processed Successfully!");
        } catch (error) { alert("Payment Failed"); }
    };

    const getLedgerEntries = () => {
        if (!selectedSupplier) return [];
        const supplierBatches = profileBatches.filter(b => b.supplier_id === selectedSupplier.id);
        const entries = [];

        supplierBatches.forEach(batch => {
            // Invoice entry (Purchase)
            entries.push({
                id: batch.id,
                date: batch.batch_date,
                ref: batch.batch_number,
                type: 'INVOICE',
                amount: batch.raw_net_value,
                status: batch.payment_status === 'PAID' ? 'SETTLED' : 'DUE',
                raw_date: new Date(batch.batch_date)
            });

            // Payment entries (Settlements)
            if (batch.supplier_payout_requests) {
                batch.supplier_payout_requests.forEach(p => {
                    entries.push({
                        id: p.id,
                        date: p.authorized_at,
                        ref: p.payout_number,
                        type: 'PAYMENT',
                        amount: p.amount,
                        status: p.status === 'COMPLETED' ? 'ACCEPTED' : 'PENDING',
                        method: p.payment_method,
                        raw_date: new Date(p.authorized_at)
                    });
                });
            }
        });

        return entries.sort((a, b) => b.raw_date - a.raw_date);
    };

    // Fetch batches globally when opening page
    useEffect(() => {
        fetchBatches();
    }, []);

    // Mock Data for Dashboard Features (Since backend tables don't exist yet)
    const [stats, setStats] = useState({
        totalSuppliers: 0,
        activePOs: 0,
        pendingPayments: 0,
        returnsThisMonth: 0
    });

    const [recentPOs, setRecentPOs] = useState([]);
    const [pendingPayments, setPendingPayments] = useState([]);

    const fetchSuppliers = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}${ENDPOINTS.SUPPLIERS}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setSuppliers(data);
                setStats(prev => ({ ...prev, totalSuppliers: data.length }));
            }
        } catch (err) {
            console.error('Failed to fetch suppliers:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchGlobalReturns = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/inventory/returns`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const allReturns = res.data;
            const today = new Date();
            const thisMonthReturns = allReturns.filter(r => {
                const rd = new Date(r.created_at);
                return rd.getMonth() === today.getMonth() && rd.getFullYear() === today.getFullYear();
            });
            setStats(prev => ({ ...prev, returnsThisMonth: thisMonthReturns.length }));
        } catch (error) { console.error('Error fetching global returns:', error); }
    };

    useEffect(() => {
        fetchSuppliers();
        fetchGlobalReturns();
    }, []);

    useEffect(() => {
        if (selectedSupplier) {
            setSellerNote("Key strategic partner for hardware and power tools. High reliability score with consistent inventory fulfillment.");
            setIsEditingNote(false);
            setNoteDate("15 May 24");
            setActiveProfileTab('Overview');
            setSelectedTransaction(null);
            fetchReturnsForSupplier(selectedSupplier.id);
        }
    }, [selectedSupplier]);

    const fetchReturnsForSupplier = async (supplierId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/inventory/returns?supplier_id=${supplierId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProfileReturns(res.data);
        } catch (err) { console.error(err); }
    };

    const filteredSuppliers = suppliers.filter(supplier => {
        const matchesSearch = (supplier.supplier_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (supplier.company_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (supplier.supplier_id?.toLowerCase() || '').includes(searchQuery.toLowerCase());

        return matchesSearch;
    });

    const handleDeleteSupplier = async (id) => {
        if (window.confirm('Are you sure you want to delete this supplier? This will remove all linked data.')) {
            try {
                await deleteSupplier(id);
                fetchSuppliers();
            } catch (err) {
                console.error('Error deleting supplier:', err);
                alert('Failed to delete supplier. Please try again.');
            }
        }
    };

    return (
        <DashboardLayout onNavigate={onNavigate} activePage="supplier">
            {isGlobalPaymentsOpen ? (
                <div className="supplier-dashboard animate-fade-in p-6 h-full overflow-y-auto custom-scrollbar bg-[#1E1E1E] flex flex-col relative text-white">
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                        <div className="flex items-center gap-4">
                            <button onClick={() => {
                                setGlobalPaymentsOpen(false);
                                setSelectedPaymentProcessing(null);
                            }} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
                                <ArrowLeft className="w-5 h-5 text-white/50" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-black text-white uppercase tracking-widest">Supplier Payments</h1>
                                <p className="text-xs font-bold text-white/40 tracking-tight uppercase">Centralized Procurement Settlement</p>
                            </div>
                        </div>
                    </div>

                    {!selectedPaymentProcessing ? (
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                <h4 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Select Batch to Process</h4>

                                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                    <div className="relative flex-1 md:min-w-[400px]">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="Search batches..."
                                            value={supplierPagePaymentSearch}
                                            onChange={e => setSupplierPagePaymentSearch(e.target.value)}
                                            className="w-full bg-[#1E1E1E] text-white pl-9 pr-3 py-2 rounded-lg border border-white/10 focus:border-[#D4AF37]/50 focus:outline-none text-xs"
                                        />
                                    </div>
                                    <select
                                        value={supplierPagePaymentStatus}
                                        onChange={e => setSupplierPagePaymentStatus(e.target.value)}
                                        className="bg-[#1E1E1E] text-white/70 px-3 py-2 rounded-lg border border-white/10 focus:border-[#D4AF37]/50 focus:outline-none text-xs"
                                    >
                                        <option value="ALL">All Status</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="PAID">Complete</option>
                                    </select>
                                    <select
                                        value={supplierPagePaymentDate}
                                        onChange={e => setSupplierPagePaymentDate(e.target.value)}
                                        className="bg-[#1E1E1E] text-white/70 px-3 py-2 rounded-lg border border-white/10 focus:border-[#D4AF37]/50 focus:outline-none text-xs"
                                    >
                                        <option value="NEWEST">Newest</option>
                                        <option value="OLDEST">Oldest</option>
                                        <option value="TODAY">Today</option>
                                        <option value="THIS_WEEK">This Week</option>
                                        <option value="THIS_MONTH">This Month</option>
                                    </select>
                                    <select
                                        value={supplierPagePaymentSupplier}
                                        onChange={e => setSupplierPagePaymentSupplier(e.target.value)}
                                        className="bg-[#1E1E1E] text-white/70 px-3 py-2 rounded-lg border border-white/10 focus:border-[#D4AF37]/50 focus:outline-none text-xs max-w-[150px]"
                                    >
                                        <option value="ALL">All Suppliers</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.supplier_name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {(() => {
                                    let filtered = profileBatches.filter(b => {
                                        // Exclude replacement batches with 0 balance or any batch that doesn't require payment
                                        if (b.remaining_balance <= 0 && b.payment_status !== 'PAID') return false;

                                        if (supplierPagePaymentStatus === 'PENDING' && b.payment_status === 'PAID') return false;
                                        if (supplierPagePaymentStatus === 'PAID' && b.payment_status !== 'PAID') return false;
                                        if (supplierPagePaymentSupplier !== 'ALL' && b.supplier_id !== parseInt(supplierPagePaymentSupplier) && b.supplier_id !== supplierPagePaymentSupplier) return false;

                                        if (supplierPagePaymentSearch) {
                                            const s = suppliers.find(sup => sup.id === b.supplier_id);
                                            const query = supplierPagePaymentSearch.toLowerCase();
                                            const numStr = (b.batch_number || '').toLowerCase();
                                            const supStr = (s?.supplier_name || '').toLowerCase();
                                            if (!numStr.includes(query) && !supStr.includes(query)) return false;
                                        }

                                        if (supplierPagePaymentDate !== 'NEWEST' && supplierPagePaymentDate !== 'OLDEST' && supplierPagePaymentDate !== 'ALL') {
                                            const bd = new Date(b.batch_date || b.created_at || new Date());
                                            const today = new Date();
                                            if (supplierPagePaymentDate === 'TODAY') {
                                                if (bd.toDateString() !== today.toDateString()) return false;
                                            } else if (supplierPagePaymentDate === 'THIS_MONTH') {
                                                if (bd.getMonth() !== today.getMonth() || bd.getFullYear() !== today.getFullYear()) return false;
                                            } else if (supplierPagePaymentDate === 'THIS_WEEK') {
                                                const diff = Math.floor((today - bd) / (1000 * 60 * 60 * 24));
                                                if (diff > 7 || diff < 0) return false;
                                            }
                                        }
                                        return true;
                                    });

                                    filtered.sort((a, b) => {
                                        const da = new Date(a.batch_date || a.created_at || 0).getTime();
                                        const db = new Date(b.batch_date || b.created_at || 0).getTime();
                                        if (supplierPagePaymentDate === 'OLDEST') return da - db;
                                        return db - da;
                                    });

                                    return filtered;
                                })().map((batch, idx) => {
                                    const s = suppliers.find(sup => sup.id === batch.supplier_id);
                                    return (
                                        <div key={idx} onClick={() => handleSelectPayment(batch)} className="p-6 bg-[#121212] border border-white/5 rounded-[24px] cursor-pointer hover:border-green-500/30 hover:bg-white/[0.02] transition-all group overflow-hidden relative">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base font-black text-white">{batch.batch_number}</span>
                                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border ${batch.payment_status === 'PARTIAL' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                        {batch.payment_status === 'PARTIAL' ? 'Partial' : 'Due'}
                                                    </span>
                                                </div>
                                                <div className="p-2 bg-white/5 rounded-lg text-white/40 group-hover:bg-green-500/10 group-hover:text-green-500 transition-all">
                                                    <ArrowRight className="w-4 h-4" />
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1 mb-6">
                                                <span className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider">{s ? s.supplier_name : 'Unknown Supplier'}</span>
                                                <span className="text-[10px] text-white/30 font-medium">{batch.date} • {batch.total_items} items</span>
                                            </div>
                                            <div className="pt-4 border-t border-white/5">
                                                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Settlement Value</p>
                                                <p className="text-xl font-black text-white">Rs. {(batch.remaining_balance || 0).toLocaleString()}</p>
                                            </div>
                                            <div className="absolute right-0 bottom-0 w-24 h-24 bg-green-500/[0.02] rounded-tl-[100px] -z-10 group-hover:bg-green-500/[0.05] transition-all"></div>
                                        </div>
                                    );
                                })}
                                {(() => {
                                    let filtered = profileBatches.filter(b => {
                                        if (b.remaining_balance <= 0 && b.payment_status !== 'PAID') return false;
                                        if (supplierPagePaymentStatus === 'PENDING' && b.payment_status === 'PAID') return false;
                                        if (supplierPagePaymentStatus === 'PAID' && b.payment_status !== 'PAID') return false;
                                        if (supplierPagePaymentSupplier !== 'ALL' && b.supplier_id !== parseInt(supplierPagePaymentSupplier) && b.supplier_id !== supplierPagePaymentSupplier) return false;

                                        if (supplierPagePaymentSearch) {
                                            const s = suppliers.find(sup => sup.id === b.supplier_id);
                                            const query = supplierPagePaymentSearch.toLowerCase();
                                            const numStr = (b.batch_number || '').toLowerCase();
                                            const supStr = (s?.supplier_name || '').toLowerCase();
                                            if (!numStr.includes(query) && !supStr.includes(query)) return false;
                                        }

                                        if (supplierPagePaymentDate !== 'NEWEST' && supplierPagePaymentDate !== 'OLDEST' && supplierPagePaymentDate !== 'ALL') {
                                            const bd = new Date(b.batch_date || b.created_at || new Date());
                                            const today = new Date();
                                            if (supplierPagePaymentDate === 'TODAY') {
                                                if (bd.toDateString() !== today.toDateString()) return false;
                                            } else if (supplierPagePaymentDate === 'THIS_MONTH') {
                                                if (bd.getMonth() !== today.getMonth() || bd.getFullYear() !== today.getFullYear()) return false;
                                            } else if (supplierPagePaymentDate === 'THIS_WEEK') {
                                                const diff = Math.floor((today - bd) / (1000 * 60 * 60 * 24));
                                                if (diff > 7 || diff < 0) return false;
                                            }
                                        }
                                        return true;
                                    });
                                    return filtered.length === 0;
                                })() && (
                                        <div className="col-span-full p-16 text-center border border-dashed border-white/5 rounded-[32px] bg-white/[0.01]">
                                            <div className="w-16 h-16 bg-green-500/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <CheckCircle2 className="w-8 h-8 text-green-500/40" />
                                            </div>
                                            <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-widest">Network Cleared</h3>
                                            <p className="text-xs text-white/30 font-medium max-w-sm mx-auto">All procurement batches across all suppliers have been fully paid and settled.</p>
                                        </div>
                                    )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 h-full min-h-0">
                            {/* LEFT: Details View */}
                            <div className="bg-[#121212] border border-white/5 rounded-[32px] p-8 flex flex-col max-h-[70vh] overflow-hidden">
                                <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-6 border-b border-white/5 pb-4">Transaction Profile</h3>

                                <div className="space-y-6 overflow-y-auto custom-scrollbar pr-4">
                                    <div className="bg-white/5 p-6 rounded-2xl">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">Batch Identifier</p>
                                                <p className="text-2xl font-black text-white">{selectedPaymentProcessing.batch_number}</p>
                                            </div>
                                            <span className="text-[10px] font-bold px-3 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded uppercase tracking-widest">Payment Due</span>
                                        </div>
                                        <div className="flex justify-between items-end border-t border-white/5 pt-4">
                                            <div>
                                                <p className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest mb-0.5">{suppliers.find(s => s.id === selectedPaymentProcessing.supplier_id)?.supplier_name || 'Unknown'}</p>
                                                <p className="text-[9px] text-white/30 uppercase">{selectedPaymentProcessing.date}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Remaining Balance</p>
                                                <p className="text-xl font-black text-[#ff5252]">Rs. {(selectedPaymentProcessing.remaining_balance || 0).toLocaleString()}</p>
                                                <p className="text-[8px] text-white/20 font-bold uppercase mt-1">Total: {selectedPaymentProcessing.net_value}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedPaymentProcessing.raw_paid_amount > 0 && (
                                        <div className="bg-green-500/5 border border-green-500/10 p-5 rounded-2xl animate-fade-in mb-6">
                                            <h4 className="text-[9px] font-bold text-green-500/60 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                                <CheckCircle2 className="w-3 h-3" /> Recent Payment Activity
                                            </h4>
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-xs font-bold text-white/80">Rs. {(selectedPaymentProcessing.raw_paid_amount || 0).toLocaleString()}</p>
                                                    <p className="text-[9px] text-white/30 uppercase mt-0.5">
                                                        {selectedPaymentProcessing.payment_date ? new Date(selectedPaymentProcessing.payment_date).toLocaleString() : 'N/A'}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border ${selectedPaymentProcessing.latest_payout?.status === 'COMPLETED' ? 'bg-green-500/5 text-green-500/50 border-green-500/10' : 'bg-yellow-500/10 text-yellow-500/50 border-yellow-500/10 animate-pulse'}`}>
                                                        {selectedPaymentProcessing.latest_payout
                                                            ? `${selectedPaymentProcessing.latest_payout.payout_number} • ${selectedPaymentProcessing.latest_payout.status === 'PENDING' ? 'WAITING FOR CASHIER' : 'ACCEPTED BY CASHIER'}`
                                                            : `via ${selectedPaymentProcessing.payment_method || 'System'}`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <h4 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] mb-3">Itemized Details</h4>
                                        <div className="border border-white/5 rounded-2xl overflow-hidden bg-white/[0.01]">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-white/5">
                                                        <th className="px-4 py-3 text-[9px] font-bold text-white/20 uppercase tracking-widest">Item</th>
                                                        <th className="px-4 py-3 text-[9px] font-bold text-white/20 uppercase tracking-widest text-center">Qty</th>
                                                        <th className="px-4 py-3 text-[9px] font-bold text-white/20 uppercase tracking-widest text-right">Price</th>
                                                        <th className="px-4 py-3 text-[9px] font-bold text-white/20 uppercase tracking-widest text-right">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-[11px]">
                                                    {selectedPaymentProcessing.lineItems?.map((item, i) => (
                                                        <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                                                            <td className="px-4 py-3 font-medium text-white/70">{item.name}</td>
                                                            <td className="px-4 py-3 text-center text-white/50">{item.qty}</td>
                                                            <td className="px-4 py-3 text-right text-white/50">Rs. {item.price}</td>
                                                            <td className="px-4 py-3 text-right font-bold text-white">Rs. {item.total}</td>
                                                        </tr>
                                                    ))}
                                                    {(!selectedPaymentProcessing.lineItems || selectedPaymentProcessing.lineItems.length === 0) && (
                                                        <tr><td colSpan="4" className="text-center py-8 text-white/40 text-xs">
                                                            <div className="flex flex-col items-center justify-center gap-2">
                                                                <Package className="w-6 h-6 text-white/20 mb-1" />
                                                                <p>Not add items to the system yet. Only create the batch.</p>
                                                            </div>
                                                        </td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Payment Actions Form */}
                            <div className="bg-[#121212] border border-white/5 rounded-[32px] p-8 flex flex-col h-full shadow-[0_0_40px_rgba(76,175,80,0.03)] border-t-[3px] border-t-[#4caf50]">
                                <h3 className="text-xs font-black text-[#4caf50] uppercase tracking-[0.2em] mb-6 border-b border-white/5 pb-4 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" /> Settlement Processor
                                </h3>

                                <div className="space-y-6 flex-1">
                                    <div className="grid grid-cols-3 gap-3">
                                        {['Full', 'Partial', 'Credit'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => {
                                                    setPaymentForm({
                                                        ...paymentForm,
                                                        type: type,
                                                        amount: type === 'Full' ? selectedPaymentProcessing.remaining_balance : ''
                                                    });
                                                }}
                                                className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${paymentForm.type === type ? 'bg-green-500 text-white border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'bg-transparent text-white/40 border-white/10 hover:border-white/30 hover:text-white/60'}`}
                                            >
                                                {type} Payment
                                            </button>
                                        ))}
                                    </div>

                                    <div className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-4 shadow-inner">
                                        <div>
                                            <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-2 block">Settlement Amount (Rs.) {paymentForm.type === 'Partial' && '*'}</label>
                                            <input
                                                type="number"
                                                readOnly={paymentForm.type === 'Full'}
                                                value={paymentForm.amount}
                                                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                                className={`w-full bg-[#1E1E1E] text-xl font-black text-white px-4 py-3 rounded-xl border focus:outline-none transition-all ${paymentForm.type === 'Full' ? 'border-white/5 opacity-50 cursor-not-allowed' : 'border-white/20 focus:border-[#4caf50]/50'}`}
                                                placeholder="Enter amount..."
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest mb-1.5 block">Payment Date</label>
                                            <input
                                                type="date"
                                                value={paymentForm.date}
                                                onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                                                className="w-full bg-white/5 text-xs text-white px-3 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-[#D4AF37]/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest mb-1.5 block">Payment Method</label>
                                            <select
                                                value={paymentForm.method}
                                                onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                                                className="w-full bg-white/5 text-xs text-white px-3 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-[#D4AF37]/50"
                                            >
                                                <option value="Cash" className="bg-[#121212] text-white">Cash Transfer</option>
                                                <option value="Bank" className="bg-[#121212] text-white">Bank Deposit</option>
                                                <option value="Cheque" className="bg-[#121212] text-white">Bank Cheque</option>
                                            </select>
                                        </div>
                                    </div>

                                    {(paymentForm.method === 'Bank' || paymentForm.method === 'Cheque') && (
                                        <div>
                                            <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest mb-1.5 block">Bank Reference / Cheque No.</label>
                                            <input
                                                type="text"
                                                value={paymentForm.reference}
                                                onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                                                className="w-full bg-white/5 text-xs font-bold text-white px-3 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-[#D4AF37]/50"
                                                placeholder="Enter reference number..."
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-[9px] text-white/40 font-bold uppercase tracking-widest mb-1.5 block">Internal Notes (Optional)</label>
                                        <textarea
                                            value={paymentForm.notes}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                            className="w-full bg-white/5 text-xs text-white px-3 py-2.5 rounded-lg border border-white/10 focus:outline-none focus:border-[#D4AF37]/50 custom-scrollbar resize-none"
                                            rows="2"
                                            placeholder="Add remarks..."
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-white/5">
                                    <button
                                        onClick={handleCompletePaymentForm}
                                        disabled={!paymentForm.amount}
                                        className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:bg-white/5 disabled:text-white/20 text-white text-xs font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg active:scale-95"
                                    >
                                        Authorize & Complete Payment
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="supplier-dashboard animate-fade-in p-6 h-full overflow-y-auto custom-scrollbar bg-[#121212]">

                    {/* Top Header Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="bg-[#D4AF37]/20 p-2 rounded-lg">
                                    <Building className="w-5 h-5 text-[#D4AF37]" />
                                </div>
                                <h1 className="text-2xl font-black text-white tracking-tight uppercase">Supplier Hub</h1>
                            </div>
                            <p className="text-[#666] text-xs font-bold uppercase tracking-widest ml-11">Abeyrathna Trade Center / Procurement Control</p>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <button className="flex-1 md:flex-none px-4 py-2.5 bg-[#1E1E1E] text-[#A0A0A0] hover:text-[#D4AF37] border border-[#333] rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2">
                                <Printer className="w-4 h-4" /> Print Ledger
                            </button>
                            <button
                                onClick={() => setAddModalOpen(true)}
                                className="flex-1 md:flex-none px-6 py-2.5 bg-[#D32F2F] text-white hover:bg-[#B71C1C] rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Add New Supplier
                            </button>
                        </div>
                    </div>

                    {/* KPI Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: 'Total Suppliers', value: stats.totalSuppliers, icon: User, color: '#D4AF37' },
                            { label: 'Active POs', value: stats.activePOs, icon: Package, color: '#4caf50' },
                            { label: 'Pending Payments', value: `Rs. ${stats.pendingPayments.toLocaleString()}`, icon: CreditCard, color: '#ff5252' },
                            { label: 'Returns This Month', value: stats.returnsThisMonth, icon: RefreshCcw, color: '#2196f3' }
                        ].map((kpi, i) => (
                            <div key={i} className="bg-[#1E1E1E] p-5 rounded-2xl border border-[#333] shadow-lg relative overflow-hidden group hover:border-[#444] transition-all">
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <p className="text-[#888] text-[10px] font-black uppercase tracking-widest mb-1">{kpi.label}</p>
                                        <h3 className="text-2xl font-black text-white">{kpi.value}</h3>
                                    </div>
                                    <div style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }} className="p-3 rounded-xl">
                                        <kpi.icon className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-2 relative z-10">
                                    <div className="h-1 flex-1 bg-[#121212] rounded-full overflow-hidden">
                                        <div className="h-full bg-[#D4AF37]" style={{ width: '65%', backgroundColor: kpi.color }}></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-[#888]">Target 85%</span>
                                </div>
                                {/* Decorative background shape */}
                                <div className="absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.03] group-hover:scale-110 transition-transform">
                                    <kpi.icon className="w-full h-full" />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* Left/Main Section (Col 8) */}
                        <div className="lg:col-span-8 space-y-8">

                            {/* Search & Filter Bar */}
                            <div className="bg-[#1E1E1E] p-3 rounded-2xl border border-[#333] flex flex-col md:flex-row items-center gap-3 shadow-xl">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#666] w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="SEARCH BY ID, NAME, COMPANY OR CONTACT..."
                                        className="w-full bg-[#121212] text-white pl-12 pr-4 py-3 rounded-xl border border-[#333] focus:outline-none focus:border-[#D4AF37]/50 transition-all text-[11px] font-black tracking-widest uppercase placeholder:text-white/30"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>

                                <div className="flex items-center gap-2 bg-[#121212] p-1.5 rounded-xl border border-[#333] w-full md:w-auto overflow-x-auto no-scrollbar">
                                    {['ALL', 'ACTIVE', 'INACTIVE'].map(status => (
                                        <button
                                            key={status}
                                            onClick={() => setFilterStatus(status)}
                                            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-[11px] font-black transition-all tracking-widest ${filterStatus === status ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.2)] scale-[1.02]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Supplier Table Container */}
                            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm relative">
                                <div className="p-6 bg-green-100 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-6 bg-green-600 rounded-full"></div>
                                        <h3 className="text-sm font-black text-green-900 uppercase tracking-widest">Supplier Directory</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-green-800/80 text-[10px] font-bold uppercase">Sorted By: Recent</span>
                                        <ArrowUpRight className="w-4 h-4 text-green-700" />
                                    </div>
                                </div>

                                <div className="overflow-hidden">
                                    <table className="w-full text-left table-fixed">
                                        <thead>
                                            <tr className="bg-green-50 text-green-900 text-[10px] uppercase font-black tracking-[0.2em]">
                                                <th className="px-6 py-5 w-[25%]">Partner / ID</th>
                                                <th className="px-6 py-5 w-[20%]">Organization</th>
                                                <th className="px-6 py-5 w-[30%]">Communication</th>
                                                <th className="px-6 py-5 w-[25%] text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredSuppliers.length > 0 ? (
                                                filteredSuppliers.map((supplier) => (
                                                    <tr key={supplier.supplier_id} className="hover:bg-green-50 transition-all group">
                                                        <td className="px-6 py-6 overflow-hidden">
                                                            <div className="flex flex-col">
                                                                <span className="text-gray-900 font-black group-hover:text-green-700 transition-colors truncate">{supplier.supplier_name}</span>
                                                                <span className="text-[#D4AF37] text-[9px] font-black mt-1 bg-[#D4AF37]/5 px-2 py-0.5 rounded border border-[#D4AF37]/10 w-max">{supplier.supplier_id}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-6 overflow-hidden">
                                                            <div className="flex items-center gap-2">
                                                                <Building className="w-4 h-4 text-[#666]" />
                                                                <span className="text-[#888] text-xs font-bold uppercase tracking-tight truncate">{supplier.company_name || 'Individual'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-6 overflow-hidden">
                                                            <div className="flex flex-col gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <Phone className="w-3.5 h-3.5 text-[#D4AF37]/50" />
                                                                    <span className="text-[#AAA] text-[11px] font-mono">{supplier.phone_number}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-ellipsis overflow-hidden">
                                                                    <Mail className="w-3.5 h-3.5 text-[#666]" />
                                                                    <span className="text-[#666] text-[10px] font-medium lowercase truncate">{supplier.email || 'N/A'}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-6">
                                                            <div className="flex gap-2 justify-end">
                                                                <button
                                                                    onClick={() => setSelectedSupplier(supplier)}
                                                                    className="p-3 bg-[#121212] text-[#A0A0A0] hover:text-[#D4AF37] hover:border-[#D4AF37] border border-[#333] rounded-xl transition-all shadow-inner group-hover:bg-[#1E1E1E]"
                                                                    title="View Details"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingSupplier(supplier)}
                                                                    className="p-3 bg-[#121212] text-[#A0A0A0] hover:text-white border border-[#333] rounded-xl transition-all group-hover:bg-[#1E1E1E]"
                                                                    title="Edit Profile"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteSupplier(supplier.id)}
                                                                    className="p-3 bg-[#121212] text-[#A0A0A0] hover:text-[#ff5252] border border-[#333] rounded-xl transition-all group-hover:bg-[#1E1E1E]"
                                                                    title="Delete Partner"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="px-8 py-20 text-center">
                                                        <div className="flex flex-col items-center gap-4 opacity-20">
                                                            <LayoutDashboard className="w-16 h-16 text-[#666]" />
                                                            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#666]">Empty Database Registry</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Right/Side Section (Col 4) */}
                        <div className="lg:col-span-4 space-y-8">

                            {/* Operations Control Center */}
                            <div className="bg-[#1E1E1E] rounded-3xl border border-[#333] overflow-hidden shadow-2xl">
                                <div className="p-6 bg-[#D4AF37]/5 border-b border-[#333]">
                                    <h3 className="text-xs font-black text-[#D4AF37] uppercase tracking-[0.2em] flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" /> Quick Actions
                                    </h3>
                                </div>
                                <div className="p-6 grid grid-cols-1 gap-4">
                                    {[
                                        {
                                            label: 'Payments', sub: 'Process settlements', icon: DollarSign, color: '#4caf50', onClick: () => {
                                                setGlobalPaymentsOpen(true);
                                            }
                                        },
                                        { label: 'Return Items', sub: 'Inventory damage', icon: RefreshCcw, color: '#ff5252', onClick: () => onNavigate('supplier-returns') },
                                        { label: 'Ledger Audit', sub: 'Account history', icon: LayoutDashboard, color: '#2196f3', onClick: () => {
                                            if (suppliers.length > 0) {
                                                setSelectedSupplier(suppliers[0]);
                                                setActiveProfileTab('Ledger');
                                                setShowProfile(true);
                                            } else {
                                                alert('No suppliers available to view ledger.');
                                            }
                                        } }
                                    ].map((act, i) => (
                                        <button key={i} onClick={act.onClick} className="w-full text-left p-4 rounded-2xl bg-[#121212] hover:bg-[#222] border border-[#333] hover:border-[#444] transition-all group flex items-center gap-4">
                                            <div style={{ backgroundColor: `rgba(255, 255, 255, 0.1)`, color: 'white' }} className="p-3 rounded-xl transition-all">
                                                <act.icon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-black text-white uppercase tracking-wider">{act.label}</div>
                                                <div className="text-[10px] text-white/70 font-bold uppercase tracking-tight">{act.sub}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Recent Activity: Purchase Orders */}
                            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                                <div className="p-6 bg-green-100 flex justify-between items-center">
                                    <h3 className="text-[10px] font-black text-green-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Package className="w-4 h-4 text-green-700" /> Recent purchases
                                    </h3>
                                    <button className="px-3 py-1 bg-white text-green-700 rounded text-[9px] font-bold uppercase tracking-widest hover:bg-green-50 transition-colors shadow-sm border border-green-200">
                                        Live
                                    </button>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {recentPOs.map(po => (
                                        <div key={po.id} className="p-5 hover:bg-gray-50 transition-all cursor-pointer group">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <span className="text-[10px] font-black text-[#D4AF37] tracking-widest uppercase">{po.id}</span>
                                                    <div className="text-[11px] font-black text-gray-900 mt-1 group-hover:translate-x-1 transition-transform">{po.supplier}</div>
                                                </div>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${po.status === 'COMPLETED' ? 'bg-[#4caf50]/5 text-[#4caf50] border-[#4caf50]/20' :
                                                    po.status === 'PENDING' ? 'bg-[#ff9800]/5 text-[#ff9800] border-[#ff9800]/20' :
                                                        'bg-[#2196f3]/5 text-[#2196f3] border-[#2196f3]/20'
                                                    }`}>{po.status}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] font-bold">
                                                <div className="text-gray-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {po.date}</div>
                                                <div className="text-gray-900">Rs. {po.amount.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button className="w-full py-4 bg-gray-50 text-[10px] font-black text-gray-600 hover:text-green-700 hover:bg-gray-100 transition-all uppercase tracking-widest border-t border-gray-100">
                                    Explore Full Warehouse Log
                                </button>
                            </div>

                            {/* Financial Registry: Unpaid */}
                            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                                <div className="p-6 bg-green-100 flex justify-between items-center">
                                    <h3 className="text-[10px] font-black text-green-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-green-700" /> Pending Settlements
                                    </h3>
                                </div>
                                <div className="p-6 space-y-4">
                                    {pendingPayments.map(payment => (
                                        <div key={payment.id} className="p-4 rounded-2xl bg-[#121212] border border-[#333] hover:border-[#ff5252]/30 transition-all relative group">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[9px] font-black text-[#444] uppercase">{payment.id}</span>
                                                <span className="text-[9px] font-black text-[#ff5252] animate-pulse uppercase">DUE</span>
                                            </div>
                                            <div className="text-xs font-black text-white mb-2 uppercase tracking-tight">{payment.supplier}</div>
                                            <div className="flex justify-between items-end border-t border-[#222] pt-2 mt-2">
                                                <div className="text-[9px] text-[#666] font-bold uppercase">{payment.dueDate}</div>
                                                <div className="text-sm font-black text-white">Rs. {payment.amount.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    ))}
                                    <button className="w-full py-3.5 rounded-2xl bg-[#ff5252] hover:bg-[#d32f2f] text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">
                                        Global Batch Settlement
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* --- Modals Component System --- */}

                        {isAddModalOpen && (
                            <AddSupplierModal
                                onClose={() => setAddModalOpen(false)}
                                onSuccess={() => {
                                    fetchSuppliers();
                                    setAddModalOpen(false);
                                }}
                            />
                        )}

                        {editingSupplier && (
                            <AddSupplierModal
                                initialData={editingSupplier}
                                onClose={() => setEditingSupplier(null)}
                                onSuccess={() => {
                                    fetchSuppliers();
                                    setEditingSupplier(null);
                                }}
                            />
                        )}

                        {/* Professional Enterprise Profile Modal */}
                        {selectedSupplier && (
                            <div className="modal-overlay z-[2000] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
                                <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] border border-gray-200 overflow-hidden animate-scale-up flex flex-col relative">

                                    {/* Compact Refined Header */}
                                    <div className="px-8 py-5 border-b border-gray-200 bg-gray-50/50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 bg-gradient-to-tr from-green-50 to-green-100 rounded-xl flex items-center justify-center border border-gray-200 shadow-lg">
                                                    <User className="w-6 h-6 text-green-700" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="text-[9px] font-bold text-green-700 tracking-[0.2em] px-1.5 py-0.5 bg-green-100 rounded border border-green-200 uppercase">
                                                            {selectedSupplier.supplier_id}
                                                        </span>
                                                        <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest">{selectedSupplier.company_name}</span>
                                                    </div>
                                                    <h2 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">{selectedSupplier.supplier_name}</h2>
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <Phone className="w-3 h-3 text-gray-400" />
                                                            <span className="text-[11px] font-medium text-gray-500">{selectedSupplier.phone_number}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 ml-2 border-l border-gray-300 pl-4">
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Active Inventory Batches:</span>
                                                            <div className="flex gap-2">
                                                                {profileBatches
                                                                    .filter(b => b.supplier_id === selectedSupplier.id && b.calc_status !== 'COMPLETED')
                                                                    .slice(0, 3)
                                                                    .map((batch, idx) => {
                                                                        const isMismatch = Math.abs(parseFloat(batch.net_value) - parseFloat(batch.actual_transaction_value)) > 1;
                                                                        return (
                                                                            <span key={idx} className={`text-[9px] font-bold px-2.5 py-1 rounded border uppercase tracking-tighter flex items-center gap-1.5 ${isMismatch ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-100 text-green-700 border-green-200 animate-pulse'}`}>
                                                                                {batch.batch_number} {isMismatch && <AlertCircle className="w-2.5 h-2.5" />}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                {profileBatches.filter(b => b.supplier_id === selectedSupplier.id && b.calc_status !== 'COMPLETED').length === 0 && (
                                                                    <span className="bg-gray-100 text-gray-400 text-[8px] font-bold px-2 py-1 rounded border border-gray-200 uppercase tracking-tighter">No Active Batches</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 ml-2 border-l border-gray-300 pl-4">
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Available Cash Notes:</span>
                                                            <div className="flex gap-2">
                                                                {profileReturns
                                                                    .filter(r => r.resolution_type === 'CREDIT_NOTE')
                                                                    .slice(0, 2)
                                                                    .map((ret, idx) => (
                                                                        <span key={idx} className="bg-blue-100 text-blue-700 text-[9px] font-bold px-2.5 py-1 rounded border border-blue-200 uppercase tracking-tighter flex items-center gap-1.5">
                                                                            {ret.credit_note_number} (Rs. {parseFloat(ret.refund_amount || 0).toLocaleString()})
                                                                        </span>
                                                                    ))}
                                                                {profileReturns.filter(r => r.resolution_type === 'CREDIT_NOTE').length === 0 && (
                                                                    <span className="bg-gray-100 text-gray-400 text-[8px] font-bold px-2 py-1 rounded border border-gray-200 uppercase tracking-tighter">No Active Notes</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSelectedSupplier(null)}
                                                className="p-2 hover:bg-gray-100 rounded-lg transition-all group"
                                            >
                                                <X className="w-4 h-4 text-gray-400 group-hover:text-gray-900" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Compact Financial Stats */}
                                    <div className="px-8 py-5 grid grid-cols-2 gap-4 bg-white">
                                        {[
                                            { label: 'Complete Purchases', value: calculateStats().complete, icon: Package },
                                            { label: 'Outstanding Balance', value: calculateStats().outstanding, icon: CreditCard, accent: true }
                                        ].map((s, i) => (
                                            <div key={i} className="p-5 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between group relative overflow-hidden">
                                                <div className="relative z-10">
                                                    <div className="flex items-center gap-2 mb-1 text-gray-500 uppercase text-[8px] font-bold tracking-[0.2em]">
                                                        <s.icon className={`w-3 h-3 ${s.accent ? 'text-green-700' : 'text-gray-400'}`} />
                                                        {s.label}
                                                    </div>
                                                    <div className={`text-xl font-bold tracking-tight ${s.accent ? 'text-green-700' : 'text-gray-900'}`}>{s.value}</div>
                                                </div>
                                                <div className="absolute top-0 right-0 w-16 h-16 bg-gray-50 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform"></div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Minimalist Tabs */}
                                    <div className="px-8 flex gap-8 border-b border-gray-200">
                                        {['Overview', 'History', 'Ledger', 'Returns'].map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => {
                                                    setActiveProfileTab(tab);
                                                    setSelectedTransaction(null);
                                                }}
                                                className={`pb-3 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative ${activeProfileTab === tab ? 'text-green-700' : 'text-gray-400 hover:text-gray-500'}`}
                                            >
                                                {tab}
                                                {activeProfileTab === tab && <div className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#D4AF37] rounded-full"></div>}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-8 pt-6 custom-scrollbar bg-white">
                                        {activeProfileTab === 'Overview' && (
                                            <div className="grid grid-cols-3 gap-10 animate-fade-in">
                                                <div className="col-span-2 space-y-10">
                                                    <div className="grid grid-cols-2 gap-10">
                                                        <div className="space-y-4">
                                                            <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                                                Registry Overview
                                                            </h4>
                                                            <div className="space-y-3">
                                                                <div className="flex justify-between items-center text-[11px]">
                                                                    <span className="text-gray-500">ID</span>
                                                                    <span className="font-semibold text-gray-700">{selectedSupplier.supplier_id}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center text-[11px]">
                                                                    <span className="text-gray-500">License</span>
                                                                    <span className="font-semibold text-gray-700">Partner</span>
                                                                </div>
                                                                <div className="flex justify-between items-center text-[11px] border-t border-gray-200 pt-3">
                                                                    <span className="text-gray-500">Status</span>
                                                                    <span className="text-green-700 font-bold uppercase text-[8px] tracking-widest">Active</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                                                Banking Details
                                                            </h4>
                                                            <div className="space-y-3">
                                                                <div className="flex justify-between items-center text-[11px]">
                                                                    <span className="text-gray-500">Bank</span>
                                                                    <span className="font-semibold text-gray-700">BOC / SAMPATH</span>
                                                                </div>
                                                                <div className="flex justify-between items-center text-[11px]">
                                                                    <span className="text-gray-500">Account No</span>
                                                                    <span className="font-semibold text-gray-700 tracking-tighter">882910442302</span>
                                                                </div>
                                                                <div className="flex justify-between items-center text-[11px] border-t border-gray-200 pt-3">
                                                                    <span className="text-gray-500">Branch</span>
                                                                    <span className="font-semibold text-gray-700 uppercase text-[9px]">Colombo Central</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-10">
                                                        <div className="space-y-3 p-6 bg-gray-50 rounded-2xl border border-gray-200">
                                                            <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em]">Corporate Address</h4>
                                                            <p className="text-xs text-gray-500 leading-relaxed font-medium">{selectedSupplier.address || '228/1, Sudarshana Mawatha, Colombo, Sri Lanka'}</p>
                                                        </div>
                                                        <div className="space-y-3 p-6 bg-blue-50 rounded-2xl border border-blue-100">
                                                            <h4 className="text-[9px] font-bold text-blue-600 uppercase tracking-[0.3em] flex items-center gap-2">
                                                                <FileText className="w-3 h-3" /> Financial Refund Notes
                                                            </h4>
                                                            <div className="space-y-2">
                                                                {profileReturns
                                                                    .filter(r => r.resolution_type === 'CREDIT_NOTE')
                                                                    .map((ret, idx) => (
                                                                        <div key={idx} className="flex justify-between items-center text-[10px]">
                                                                            <span className="text-gray-500">{ret.credit_note_number}</span>
                                                                            <span className="font-black text-blue-700/80">Rs. {parseFloat(ret.refund_amount || 0).toLocaleString()}</span>
                                                                        </div>
                                                                    ))}
                                                                {profileReturns.filter(r => r.resolution_type === 'CREDIT_NOTE').length === 0 && (
                                                                    <p className="text-[10px] text-gray-300 italic">No available credit notes (cash notes) recorded.</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="p-6 bg-gradient-to-b from-white/[0.02] to-transparent rounded-2xl border border-gray-200 h-full flex flex-col justify-between">
                                                        <div>
                                                            <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-4">Note about Seller</h4>
                                                            {isEditingNote ? (
                                                                <textarea
                                                                    value={sellerNote}
                                                                    onChange={(e) => setSellerNote(e.target.value)}
                                                                    className="w-full h-24 bg-gray-100 border border-gray-300 rounded-xl p-3 text-[10px] text-gray-600 focus:outline-none focus:border-[#D4AF37]/50 custom-scrollbar resize-none font-medium italic"
                                                                    placeholder="Add a temporary note..."
                                                                />
                                                            ) : (
                                                                <p className="text-[10px] text-gray-500 leading-relaxed italic mb-6 font-medium">
                                                                    "{sellerNote}"
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-4">
                                                            <span className="text-[8px] font-semibold text-gray-300 uppercase tracking-widest">{noteDate}</span>
                                                            {isEditingNote ? (
                                                                <button
                                                                    onClick={() => {
                                                                        setIsEditingNote(false);
                                                                        setNoteDate(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }));
                                                                    }}
                                                                    className="text-[9px] font-bold text-green-700 uppercase tracking-widest hover:text-[#66bb6a]"
                                                                >
                                                                    Save
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setIsEditingNote(true)}
                                                                    className="text-[9px] font-bold text-green-700 uppercase tracking-widest hover:text-[#E5C158]"
                                                                >
                                                                    Edit
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {activeProfileTab === 'History' && !selectedTransaction && (
                                            <div className="space-y-4 animate-fade-in max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">


                                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2 mb-4">
                                                    <span className="w-1 h-3 bg-gray-200 rounded-full"></span>
                                                    Procurement Registry
                                                </h4>
                                                {profileBatches
                                                    .filter(b => b.supplier_id === selectedSupplier.id)
                                                    .map((trx, idx) => (
                                                        <div
                                                            key={idx}
                                                            onClick={() => {
                                                                // Group items by inventory_id to prevent duplicates in the list
                                                                const grouped = (trx.inventory_batch_items || []).reduce((acc, item) => {
                                                                    const id = item.inventory_id;
                                                                    if (!acc[id]) {
                                                                        acc[id] = {
                                                                            name: item.inventory?.ingredient_name || 'Unknown Item',
                                                                            qty: 0,
                                                                            price: item.buying_price_at_time || 0
                                                                        };
                                                                    }
                                                                    acc[id].qty += parseFloat(item.quantity_added || 0);
                                                                    return acc;
                                                                }, {});

                                                                const itemsInBatch = Object.values(grouped).map(item => ({
                                                                    name: item.name,
                                                                    qty: item.qty,
                                                                    price: parseFloat(item.price).toLocaleString(),
                                                                    total: (item.qty * parseFloat(item.price)).toLocaleString()
                                                                }));

                                                                setSelectedTransaction({
                                                                    ...trx,
                                                                    db_id: trx.id,
                                                                    id: trx.batch_number,
                                                                    amount: trx.net_value,
                                                                    actual_amount: itemsInBatch.reduce((sum, i) => sum + (parseFloat(i.qty) * parseFloat(i.price.replace(/,/g, ''))), 0),
                                                                    items: itemsInBatch.length,
                                                                    target_items: trx.total_items,
                                                                    lineItems: itemsInBatch
                                                                });
                                                            }}
                                                            className="group p-5 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between hover:bg-gray-100 hover:border-green-600/30 transition-all cursor-pointer"
                                                        >
                                                            <div className="flex items-center gap-6">
                                                                <div className="p-3 bg-gray-100 rounded-xl text-green-700">
                                                                    <Package className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-[11px] font-bold text-gray-900 tracking-tight">{trx.batch_number}</p>
                                                                    <p className="text-[10px] text-gray-500">{trx.date}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right flex items-center gap-8">
                                                                <div className="text-right">
                                                                    <p className="text-[11px] font-bold text-gray-900">{trx.net_value}</p>
                                                                    <p className="text-[10px] text-gray-500">{batchItems[trx.batch_number]?.length || 0} Batched Items</p>
                                                                </div>
                                                                <span className={`text-[8px] font-bold px-2 py-1 rounded-md tracking-widest ${trx.payment_status === 'PAID' ? 'bg-green-100 text-green-700 translate-x-2' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                                                    {trx.payment_status === 'PAID' ? 'SETTLED' : 'UNPAID'}
                                                                </span>
                                                                <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-green-700 transition-all" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                {profileBatches.filter(b => b.supplier_id === selectedSupplier.id).length === 0 && (
                                                    <div className="p-12 text-center border border-dashed border-gray-200 rounded-3xl">
                                                        <Package className="w-8 h-8 text-gray-900/5 mx-auto mb-3" />
                                                        <p className="text-xs text-gray-400 font-medium">No procurement history recorded for this supplier.</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {activeProfileTab === 'History' && selectedTransaction && (
                                            <div className="animate-fade-in h-full flex flex-col">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <button
                                                        onClick={() => setSelectedTransaction(null)}
                                                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-gray-900 transition-all"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                    <div>
                                                        <h4 className="text-[10px] font-bold text-green-700 uppercase tracking-[0.3em]">Transaction Drill-Down</h4>
                                                        <p className="text-sm font-bold text-gray-900">Details for {selectedTransaction.id}</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-8 mb-8">
                                                    <div className="p-6 bg-gray-50 border border-gray-200 rounded-[24px]">
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4 block">Order Summary</span>
                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-gray-500">Placement Date</span>
                                                                <span className="text-gray-900 font-medium">{selectedTransaction.date}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-gray-500">Total Items Added</span>
                                                                <span className={`font-bold ${selectedTransaction.items >= selectedTransaction.target_items ? 'text-green-700' : 'text-yellow-500'}`}>
                                                                    {selectedTransaction.items} / {selectedTransaction.target_items}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-col gap-2 border-t border-gray-200 pt-4">
                                                                <div className="flex justify-between items-center text-xs">
                                                                    <span className="text-gray-500">Expected Net Value</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-gray-900 font-bold">{selectedTransaction.amount}</span>
                                                                        <button
                                                                            onClick={async () => {
                                                                                const newVal = prompt("Enter Correct Net Transaction Value", selectedTransaction.amount.replace('Rs. ', '').replace(/,/g, ''));
                                                                                if (newVal) {
                                                                                    try {
                                                                                        await axios.put(`${API_BASE_URL}/inventory/batches/${selectedTransaction.db_id}`, { net_value: newVal }, {
                                                                                            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                                                                                        });
                                                                                        fetchBatches();
                                                                                        setSelectedTransaction(null);
                                                                                        alert("Batch Value Updated!");
                                                                                    } catch (e) { alert("Failed to update"); }
                                                                                }
                                                                            }}
                                                                            className="p-1 hover:bg-gray-200 rounded group"
                                                                        >
                                                                            <Edit className="w-3 h-3 text-green-700 group-hover:scale-110 transition-transform" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-between items-center text-xs">
                                                                    <span className="text-gray-500">Actual Item Total</span>
                                                                    <span className="text-gray-900 font-bold">Rs. {selectedTransaction.actual_amount.toLocaleString()}</span>
                                                                </div>
                                                                {Math.abs(parseFloat(selectedTransaction.amount.replace('Rs. ', '').replace(/,/g, '')) - selectedTransaction.actual_amount) > 1 && (
                                                                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 mt-2 animate-pulse">
                                                                        <AlertCircle className="w-3 h-3 text-red-500" />
                                                                        <span className="text-[9px] font-bold text-red-500 uppercase tracking-tighter">Financial Mismatch Detected!</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-6 bg-gray-50 border border-gray-200 rounded-[24px]">
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4 block">Fulfillment Details</span>
                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-gray-500">Warehouse Destination</span>
                                                                <span className="text-gray-900 font-medium">Main Store / A1</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-gray-500">Payment Clearing</span>
                                                                <div className="flex items-center gap-3">
                                                                    <span className={`${selectedTransaction.payment_status === 'PAID' ? 'text-green-700' : 'text-yellow-500'} font-bold tracking-widest text-[10px]`}>
                                                                        {selectedTransaction.payment_status === 'PAID' ? 'SETTLED' : 'PENDING'}
                                                                    </span>
                                                                    {selectedTransaction.payment_status !== 'PAID' && (
                                                                        <button
                                                                            onClick={() => handleProcessPayment(selectedTransaction.db_id)}
                                                                            className="px-3 py-1 bg-green-100 text-green-700 text-[9px] font-bold rounded hover:bg-[#4caf50]/20 transition-all uppercase tracking-widest border border-green-200"
                                                                        >
                                                                            Pay Now
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between items-center text-xs border-t border-gray-200 pt-4">
                                                                <span className="text-gray-500">Payment Mode</span>
                                                                <span className="text-gray-900 font-medium">Direct Bank Transfer</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex-1 space-y-4">
                                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">Itemized Order List</h4>
                                                    <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
                                                        <table className="w-full text-left">
                                                            <thead>
                                                                <tr className="border-b border-gray-200">
                                                                    <th className="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest">Description</th>
                                                                    <th className="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center">Qty</th>
                                                                    <th className="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Unit Price</th>
                                                                    <th className="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Subtotal</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="text-[11px]">
                                                                {(selectedTransaction.lineItems || []).map((item, i) => (
                                                                    <tr key={i} className="border-b border-gray-200 last:border-0 hover:bg-gray-50">
                                                                        <td className="px-6 py-4 font-medium text-gray-700">{item.name}</td>
                                                                        <td className="px-6 py-4 text-center text-gray-500">{item.qty}</td>
                                                                        <td className="px-6 py-4 text-right text-gray-500">Rs. {item.price}</td>
                                                                        <td className="px-6 py-4 text-right font-bold text-gray-900">Rs. {item.total}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {activeProfileTab === 'Ledger' && (
                                            <div className="space-y-8 animate-fade-in pr-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                                                {/* Credit Notes Section */}
                                                {profileReturns.filter(r => r.resolution_type === 'CREDIT_NOTE').length > 0 && (
                                                    <div className="mb-10 space-y-4">
                                                        <h4 className="text-[11px] font-bold text-green-800 uppercase tracking-widest flex items-center gap-2">
                                                            <span className="w-1.5 h-4 bg-green-500 rounded-full"></span>
                                                            Authorized Credit Balances
                                                        </h4>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            {profileReturns.filter(r => r.resolution_type === 'CREDIT_NOTE').map(note => (
                                                                <div key={note.id} className="p-5 bg-[#F3F9F5] border border-green-200 rounded-2xl flex items-center justify-between hover:bg-green-50 transition-all group shadow-sm">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="p-3 bg-green-100 rounded-xl text-green-700 group-hover:scale-110 transition-transform">
                                                                            <FileText className="w-5 h-5" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[12px] font-black text-gray-900 tracking-widest uppercase">{note.credit_note_number}</p>
                                                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Origin: {note.return_number}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-sm font-black text-green-700">Rs. {(parseFloat(note.refund_amount) || 0).toLocaleString()}</p>
                                                                        <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest mt-1">Avail. Credit</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div>
                                                            <h4 className="text-[13px] font-bold text-green-900 uppercase tracking-[0.3em]">Supplier Ledger</h4>
                                                            <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-widest">Statement of all financial dealings</p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button className="p-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl transition-all border border-green-200" title="Download Ledger">
                                                                <Download className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white border border-green-200 rounded-[24px] overflow-hidden shadow-sm">
                                                        <table className="w-full text-left">
                                                            <thead>
                                                                <tr className="bg-[#C1DFCD] border-b border-green-200">
                                                                    <th className="px-6 py-4 text-[10px] font-black text-green-900 uppercase tracking-widest">Date</th>
                                                                    <th className="px-6 py-4 text-[10px] font-black text-green-900 uppercase tracking-widest">Reference No</th>
                                                                    <th className="px-6 py-4 text-[10px] font-black text-green-900 uppercase tracking-widest">Description</th>
                                                                    <th className="px-6 py-4 text-[10px] font-black text-green-900 uppercase tracking-widest text-right">Debit / Credit</th>
                                                                    <th className="px-6 py-4 text-[10px] font-black text-green-900 uppercase tracking-widest text-center">Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                                {getLedgerEntries().map((entry, idx) => (
                                                                    <tr key={idx} className="hover:bg-green-50/50 transition-colors group">
                                                                        <td className="px-6 py-5">
                                                                            <span className="text-[11px] font-bold text-gray-700 tracking-tight">
                                                                                {new Date(entry.date).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-6 py-5">
                                                                            <span className={`text-[11px] font-black tracking-widest ${entry.type === 'PAYMENT' ? 'text-green-600' : 'text-gray-900'}`}>
                                                                                {entry.ref}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-6 py-5">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className={`p-2 rounded-xl ${entry.type === 'PAYMENT' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                                                    {entry.type === 'PAYMENT' ? <CreditCard className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                                                                </div>
                                                                                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">
                                                                                    {entry.type === 'PAYMENT' ? `Settlement via ${entry.method}` : 'Stock Procurement'}
                                                                                </span>
                                                                            </div>
                                                                        </td>
                                                                        <td className={`px-6 py-5 text-right font-black text-sm ${entry.type === 'PAYMENT' ? 'text-green-600' : 'text-gray-800'}`}>
                                                                            {entry.type === 'PAYMENT' ? '-' : '+'} Rs. {entry.amount.toLocaleString()}
                                                                        </td>
                                                                        <td className="px-6 py-5 text-center">
                                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${entry.status === 'ACCEPTED' || entry.status === 'SETTLED' ? 'bg-[#F3F9F5] text-green-700 border-green-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                                                                                {entry.status}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                        {getLedgerEntries().length === 0 && (
                                                            <div className="p-20 text-center">
                                                                <Activity className="w-8 h-8 text-green-200 mx-auto mb-4" />
                                                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">No ledger entries found for this supplier.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {activeProfileTab === 'Returns' && (
                                            <div className="space-y-4 animate-fade-in">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <h4 className="text-[11px] font-bold text-gray-900 uppercase tracking-[0.3em]">Stock Returns</h4>
                                                        <p className="text-[9px] text-gray-400 mt-1 uppercase">History of returned items</p>
                                                    </div>
                                                </div>

                                                <div className="bg-gray-50 border border-gray-200 rounded-3xl overflow-hidden">
                                                    <table className="w-full text-left">
                                                        <thead>
                                                            <tr className="border-b border-gray-200 bg-gray-50">
                                                                <th className="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Return No</th>
                                                                <th className="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Item</th>
                                                                <th className="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Qty</th>
                                                                <th className="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Type</th>
                                                                <th className="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] text-center">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/[0.03]">
                                                            {profileReturns.map((ret, idx) => (
                                                                <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                                                                    <td className="px-6 py-5">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[10px] font-black text-gray-900 tracking-widest uppercase">{ret.return_number}</span>
                                                                            <span className="text-[8px] text-gray-400 font-bold mt-1">{new Date(ret.created_at).toLocaleDateString()}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-5">
                                                                        <span className="text-[10px] font-bold text-gray-700">{ret.inventory?.ingredient_name}</span>
                                                                    </td>
                                                                    <td className="px-6 py-5">
                                                                        <span className="text-xs font-black text-[#ff5252]">{ret.quantity}</span>
                                                                    </td>
                                                                    <td className="px-6 py-5">
                                                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{ret.return_type}</span>
                                                                    </td>
                                                                    <td className="px-6 py-5 text-center">
                                                                        <span className={`text-[8px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded border ${ret.status === 'APPROVED' || ret.status === 'COMPLETED' ? 'bg-green-500/5 text-green-500/60 border-green-500/10' : 'bg-yellow-500/5 text-yellow-500/60 border-yellow-500/10'}`}>
                                                                            {ret.status}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    {profileReturns.length === 0 && (
                                                        <div className="p-20 text-center">
                                                            <Activity className="w-8 h-8 text-gray-900/5 mx-auto mb-4" />
                                                            <p className="text-xs text-gray-400 font-medium">No returns recorded for this supplier.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )
            }
        </DashboardLayout >
    );
};

export default SupplierPage;
