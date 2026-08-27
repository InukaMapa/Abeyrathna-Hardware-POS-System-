import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import {
    RefreshCcw, Search, Plus, Filter, Package, Calendar,
    Truck, AlertCircle, CheckCircle2, ChevronRight, X, ArrowUpRight,
    Clock, Archive, ShieldCheck, Download, MoreVertical, Trash2
} from 'lucide-react';
import { API_BASE_URL } from '../../../config/api';
import { useAuth } from '../../../context/AuthContext';

const parseReturnNotes = (notesStr) => {
    try {
        if (notesStr && notesStr.startsWith('{')) {
            return JSON.parse(notesStr);
        }
    } catch (e) {}
    return { notes: notesStr || '', buying_price: null, tier_id: null };
};

const SupplierReturnsPage = ({ onNavigate }) => {
    const { userRole } = useAuth();
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [suppliers, setSuppliers] = useState([]);
    const [batches, setBatches] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (showForm) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showForm]);
    // Filters
    const [filterSupplier, setFilterSupplier] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedReturnView, setSelectedReturnView] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        item_id: '',
        batch_id: '',
        supplier_id: '',
        quantity: '',
        return_type: 'Damaged item return',
        reason: '',
        warehouse_location: 'Main Store',
        notes: ''
    });

    const [selectedBatchInfo, setSelectedBatchInfo] = useState(null);
    const [selectedItemInfo, setSelectedItemInfo] = useState(null);
    const [selectedTierId, setSelectedTierId] = useState('');

    // Searchable dropdown state for Create Return Form
    const [supplierSearchText, setSupplierSearchText] = useState('');
    const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
    const supplierDropdownRef = useRef(null);

    const [itemSearchText, setItemSearchText] = useState('');
    const [isItemDropdownOpen, setIsItemDropdownOpen] = useState(false);
    const itemDropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target)) {
                setIsSupplierDropdownOpen(false);
            }
            if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target)) {
                setIsItemDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const filteredSuppliers = suppliers.filter(s =>
        (s.supplier_name || '').toLowerCase().includes((supplierSearchText || '').toLowerCase()) ||
        (s.company_name || '').toLowerCase().includes((supplierSearchText || '').toLowerCase()) ||
        (s.supplier_id || '').toLowerCase().includes((supplierSearchText || '').toLowerCase())
    );

    const supplierProducts = formData.supplier_id
        ? inventoryItems.filter(i => i.supplier_id === formData.supplier_id)
        : [];

    const filteredItems = supplierProducts.filter(i =>
        (i.ingredient_name || '').toLowerCase().includes((itemSearchText || '').toLowerCase()) ||
        (i.item_code || '').toLowerCase().includes((itemSearchText || '').toLowerCase())
    );

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        setErrorMessage('');
        try {
            const token = localStorage.getItem('token');
            const [returnsRes, suppliersRes, batchesRes, invRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/inventory/returns`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_BASE_URL}/suppliers`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_BASE_URL}/inventory/batches`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API_BASE_URL}/inventory`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setReturns(returnsRes.data);
            setSuppliers(suppliersRes.data);
            setBatches(batchesRes.data);
            setInventoryItems(invRes.data);
        } catch (err) {
            console.error('Error fetching data:', err);
            setErrorMessage('Failed to load data. Please try again later.');
        }
        setLoading(false);
    };

    const handleCreateReturn = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const selectedTier = (selectedItemInfo?.stock_price_tiers || []).find(t => t.id === selectedTierId);
            
            const payload = {
                ...formData,
                notes: JSON.stringify({
                    tier_id: selectedTierId,
                    buying_price: selectedTier ? selectedTier.buying_price : null,
                    notes: formData.notes
                })
            };

            await axios.post(`${API_BASE_URL}/inventory/returns`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowForm(false);
            fetchInitialData();
            alert("Return Recorded Successfully!");
        } catch (err) { alert("Failed to record return: " + (err.response?.data?.message || err.message)); }
    };

    const handleItemSelect = (itemId) => {
        const item = inventoryItems.find(i => i.id === itemId);
        setSelectedItemInfo(item);
        setSelectedTierId('');
        setFormData({ ...formData, item_id: itemId, quantity: '' });
        setSelectedBatchInfo(null);
    };

    const completedReplacementsQty = returns
        .filter(r => (r.resolution_type === 'REPLACEMENT' || r.replacement_status === 'COMPLETED') && (r.status === 'COMPLETED' || r.status === 'APPROVED'))
        .reduce((sum, r) => sum + parseFloat(r.quantity || 0), 0);

    const refundReturnsValue = returns
        .filter(r => r.resolution_type === 'REFUND' || (r.refund_amount !== null && r.refund_amount !== undefined && parseFloat(r.refund_amount) > 0))
        .reduce((sum, r) => {
            if (r.refund_amount !== null && r.refund_amount !== undefined && parseFloat(r.refund_amount) > 0) {
                return sum + parseFloat(r.refund_amount);
            }
            const parsed = parseReturnNotes(r.notes);
            const price = parsed.buying_price !== null && parsed.buying_price !== undefined ? parsed.buying_price : (r.inventory?.buying_price || 0);
            return sum + (parseFloat(r.quantity) * parseFloat(price));
        }, 0);

    const stats = {
        total: returns.length,
        value: refundReturnsValue,
        pending: returns.filter(r => r.status === 'PENDING').length,
        replacements: completedReplacementsQty
    };

    return (
        <DashboardLayout activePage="supplier-returns" onNavigate={onNavigate}>
            <div className="supplier-returns-page p-8 max-w-[1600px] mx-auto">
                {errorMessage && (
                    <div className="mb-4 p-4 bg-[#ff5252]/10 border border-[#ff5252]/20 text-[#ff5252] rounded-xl text-sm font-bold uppercase tracking-tight flex items-center gap-3">
                        <AlertCircle className="w-4 h-4" />
                        {errorMessage}
                    </div>
                )}
                {/* Header Section */}
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-[#D4AF37]/10 rounded-lg">
                                <RefreshCcw className="w-5 h-5 text-[#D4AF37]" />
                            </div>
                            <h1 className="text-3xl font-black text-white tracking-tight uppercase">Supplier Returns</h1>
                        </div>
                        <p className="text-white/40 text-sm font-medium">Manage item returns, warranty claims, and replacements.</p>
                    </div>
                    <button
                        onClick={() => {
                            setFormData({
                                item_id: '',
                                batch_id: '',
                                supplier_id: '',
                                quantity: '',
                                return_type: 'Damaged item return',
                                reason: '',
                                warehouse_location: 'Main Store',
                                notes: ''
                            });
                            setSelectedItemInfo(null);
                            setSelectedBatchInfo(null);
                            setSelectedTierId('');
                            setShowForm(true);
                        }}
                        className="supplier-returns-action-btn"
                    >
                        <Plus className="w-5 h-5" />
                        Create Return Items
                    </button>
                </div>

                {/* Stats Widgets */}
                <div className="grid grid-cols-3 gap-6 mb-10">
                    {[
                        { label: 'Total Return Requests', val: stats.total, icon: <RefreshCcw className="text-[#D4AF37]" />, desc: 'All time logs' },
                        { label: 'Returned Items Value', val: `Rs. ${stats.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: <Package className="text-blue-500" />, desc: 'Refunded cash value' },
                        { label: 'Replacement Items', val: stats.replacements, icon: <ShieldCheck className="text-green-500" />, desc: 'Restocked replacements' }
                    ].map((stat, i) => (
                        <div key={i} className="supplier-returns-stat-card p-6 bg-[#111] border border-[#333] rounded-[20px] shadow-lg hover:-translate-y-1 hover:shadow-xl hover:border-[#16A34A]/50 transition-all duration-300 group relative overflow-hidden">
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-transparent to-[#16A34A]/10 rounded-full blur-xl group-hover:bg-[#16A34A]/20 transition-all"></div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-white/10 transition-all">{stat.icon}</div>
                                <ArrowUpRight className="w-4 h-4 text-white/10 group-hover:text-white/40" />
                            </div>
                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                            <p className="text-2xl font-black text-white tracking-tighter">{stat.val}</p>
                            <p className="text-[9px] text-white/20 uppercase mt-2 font-bold">{stat.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 items-center mb-4">
                    <div className="supplier-returns-search relative flex-1 min-w-[300px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        <input
                            type="text"
                            placeholder="Search return items by name or REF..."
                            className="w-full bg-[#1E1E1E] rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/50 transition-all font-bold placeholder:text-white/30 shadow-inner"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <select
                        className="supplier-returns-filter bg-[#1E1E1E] rounded-2xl py-3 px-4 pr-10 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/50 cursor-pointer transition-all shadow-inner"
                        value={filterSupplier}
                        onChange={(e) => setFilterSupplier(e.target.value)}
                    >
                        <option value="all" className="bg-[#1E1E1E] text-white">All Suppliers</option>
                        {suppliers.map(s => <option key={s.id} value={s.id} className="bg-[#1E1E1E] text-white">{s.supplier_name}</option>)}
                    </select>
                    <select
                        className="supplier-returns-filter bg-[#1E1E1E] rounded-2xl py-3 px-4 pr-10 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/50 cursor-pointer transition-all shadow-inner"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all" className="bg-[#1E1E1E] text-white">All Status</option>
                        <option value="PENDING" className="bg-[#1E1E1E] text-white">Pending</option>
                        <option value="APPROVED" className="bg-[#1E1E1E] text-white">Approved</option>
                        <option value="COMPLETED" className="bg-[#1E1E1E] text-white">Completed</option>
                    </select>
                </div>

                {/* Active Returns Table */}
                <div className="supplier-returns-table-shell bg-white/[0.01] border border-white/5 rounded-[40px] overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-4 py-3 text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Return ID</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Item Details</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Type</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Qty</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Created</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] text-center">Status</th>
                                <th className="px-4 py-3 text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {returns
                                .filter(r => (filterSupplier === 'all' || r.supplier_id === filterSupplier))
                                .filter(r => (filterStatus === 'all' || r.status === filterStatus))
                                .filter(r => r.return_number.toLowerCase().includes(searchQuery.toLowerCase()) || r.inventory?.ingredient_name.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map((ret) => (
                                    <tr key={ret.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-white tracking-widest uppercase">{ret.return_number}</span>
                                                <span className="text-[9px] text-white/20 font-bold mt-1">REF: {ret.inventory_batches?.batch_number || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-white/80">{ret.inventory?.ingredient_name}</span>
                                                <span className="text-[10px] text-white/30 uppercase">{ret.suppliers?.supplier_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{ret.return_type}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm font-black text-white">{ret.quantity}</span>
                                        </td>
                                        <td className="px-4 py-3 text-white/40 text-xs">
                                            {new Date(ret.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-center">
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${ret.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-500/80 border-yellow-500/20 animate-pulse' :
                                                    ret.status === 'APPROVED' ? 'bg-blue-500/10 text-blue-500/80 border-blue-500/20' :
                                                        'bg-[#4caf50]/10 text-[#4caf50]/80 border-[#4caf50]/20'
                                                    }`}>
                                                    {ret.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end text-white">
                                                <button
                                                    onClick={() => onNavigate('return-management', { id: ret.id })}
                                                    className="supplier-returns-row-action"
                                                    title="Manage return resolution"
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                    {returns.length === 0 && (
                        <div className="py-24 text-center">
                            <Archive className="w-12 h-12 text-white/5 mx-auto mb-4" />
                            <p className="text-sm text-white/20 font-medium">No return requests found.</p>
                        </div>
                    )}
                </div>

                {/* Create Return Modal */}
                {showForm && (
                    <div className="supplier-returns-form-overlay fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-xl">

                        <div className="supplier-returns-form-modal bg-white w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[24px] shadow-2xl overflow-hidden animate-slide-up relative">
                            {/* Header */}
                            <div className="supplier-returns-form-header p-6 flex justify-between items-center bg-[#C1DFCD] shrink-0 border-b-0">
                                <div className="flex items-center gap-3">
                                    <RefreshCcw className="w-5 h-5 text-green-800" />
                                    <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Create Return Item</h2>
                                </div>
                                <button onClick={() => setShowForm(false)} className="supplier-returns-form-close p-2 bg-green-700 text-white hover:bg-green-800 rounded-xl transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="supplier-returns-form-content overflow-y-auto p-8 pt-6 space-y-6 custom-scrollbar">
                                <form onSubmit={handleCreateReturn} className="supplier-returns-form-body space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="relative" ref={supplierDropdownRef}>
                            <label className="text-[11px] font-bold text-green-800 mb-2 block">Supplier Name *</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search supplier by name..."
                                    value={isSupplierDropdownOpen ? supplierSearchText : (suppliers.find(s => s.id === formData.supplier_id)?.supplier_name || supplierSearchText)}
                                    onFocus={() => {
                                        setSupplierSearchText('');
                                        setIsSupplierDropdownOpen(true);
                                    }}
                                    onChange={(e) => {
                                        setSupplierSearchText(e.target.value);
                                        setIsSupplierDropdownOpen(true);
                                    }}
                                    className="w-full bg-white border border-green-200 rounded-xl pl-10 pr-10 py-3 text-sm text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                                />
                                <Search className="w-4 h-4 text-green-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                {formData.supplier_id && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFormData({ ...formData, supplier_id: '', item_id: '', batch_id: '', quantity: '' });
                                            setSelectedItemInfo(null);
                                            setSelectedBatchInfo(null);
                                            setSelectedTierId('');
                                            setSupplierSearchText('');
                                            setItemSearchText('');
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {isSupplierDropdownOpen && (
                                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-green-200 rounded-xl shadow-xl z-[10000] max-h-60 overflow-y-auto custom-scrollbar">
                                    {filteredSuppliers.length > 0 ? (
                                        filteredSuppliers.map(s => (
                                            <div
                                                key={s.id}
                                                onClick={() => {
                                                    setFormData({ ...formData, supplier_id: s.id, item_id: '', batch_id: '', quantity: '' });
                                                    setSelectedItemInfo(null);
                                                    setSelectedBatchInfo(null);
                                                    setSelectedTierId('');
                                                    setSupplierSearchText(s.supplier_name);
                                                    setItemSearchText('');
                                                    setIsSupplierDropdownOpen(false);
                                                }}
                                                className={`px-4 py-2.5 hover:bg-green-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0 text-xs flex justify-between items-center ${formData.supplier_id === s.id ? 'bg-green-100/60 font-bold text-green-900' : 'text-gray-800'}`}
                                            >
                                                <div>
                                                    <span className="font-bold block">{s.supplier_name}</span>
                                                    {s.company_name && <span className="text-[10px] text-gray-500">{s.company_name}</span>}
                                                </div>
                                                {s.supplier_id && <span className="text-[9px] font-mono text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">{s.supplier_id}</span>}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-3 text-xs text-gray-500 text-center">No suppliers match "{supplierSearchText}"</div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="relative" ref={itemDropdownRef}>
                            <label className="text-[11px] font-bold text-green-800 mb-2 block">Search &amp; Select Item *</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    disabled={!formData.supplier_id}
                                    placeholder={formData.supplier_id ? "Search item by name or code..." : "Select a supplier first"}
                                    value={isItemDropdownOpen ? itemSearchText : (inventoryItems.find(i => i.id === formData.item_id)?.ingredient_name || itemSearchText)}
                                    onFocus={() => {
                                        if (formData.supplier_id) {
                                            setItemSearchText('');
                                            setIsItemDropdownOpen(true);
                                        }
                                    }}
                                    onChange={(e) => {
                                        if (formData.supplier_id) {
                                            setItemSearchText(e.target.value);
                                            setIsItemDropdownOpen(true);
                                        }
                                    }}
                                    className="w-full bg-white border border-green-200 rounded-xl pl-10 pr-10 py-3 text-sm text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                />
                                <Search className="w-4 h-4 text-green-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                {formData.item_id && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFormData({ ...formData, item_id: '', batch_id: '', quantity: '' });
                                            setSelectedItemInfo(null);
                                            setSelectedBatchInfo(null);
                                            setSelectedTierId('');
                                            setItemSearchText('');
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {isItemDropdownOpen && formData.supplier_id && (
                                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-green-200 rounded-xl shadow-xl z-[10000] max-h-60 overflow-y-auto custom-scrollbar">
                                    {filteredItems.length > 0 ? (
                                        filteredItems.map(i => (
                                            <div
                                                key={i.id}
                                                onClick={() => {
                                                    handleItemSelect(i.id);
                                                    setItemSearchText(i.ingredient_name);
                                                    setIsItemDropdownOpen(false);
                                                }}
                                                className={`px-4 py-2.5 hover:bg-green-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0 text-xs flex justify-between items-center ${formData.item_id === i.id ? 'bg-green-100/60 font-bold text-green-900' : 'text-gray-800'}`}
                                            >
                                                <div>
                                                    <span className="font-bold block">{i.ingredient_name}</span>
                                                    {i.item_code && <span className="text-[10px] font-mono text-gray-500">Code: {i.item_code}</span>}
                                                </div>
                                                <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                                                    Avail: {i.quantity} {i.unit}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-3 text-xs text-gray-500 text-center">
                                            {supplierProducts.length === 0
                                                ? "No products registered for this supplier."
                                                : `No items match "${itemSearchText}"`}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                                        {selectedItemInfo && (selectedItemInfo.stock_price_tiers || []).length > 0 && (
                                            <div>
                                                <label className="text-[11px] font-bold text-green-800 mb-2 block">Select Stock Load (Buying Price)</label>
                                                <select
                                                    value={selectedTierId}
                                                    onChange={(e) => {
                                                        setSelectedTierId(e.target.value);
                                                        setFormData({ ...formData, quantity: '' });
                                                    }}
                                                    required
                                                    className="w-full bg-white border border-green-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                                                >
                                                    <option value="">-- Choose Stock Load --</option>
                                                    {(selectedItemInfo.stock_price_tiers || []).map((tier, idx) => (
                                                        <option key={tier.id} value={tier.id}>
                                                            Load {idx + 1} - Rs. {tier.buying_price} (Avail: {tier.quantity_remaining}) - {new Date(tier.created_at).toLocaleDateString()}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        <div>
                                            <label className="text-[11px] font-bold text-green-800 mb-2 block">Return Quantity</label>
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                value={formData.quantity}
                                                max={
                                                    selectedTierId
                                                        ? (selectedItemInfo?.stock_price_tiers || []).find(t => t.id === selectedTierId)?.quantity_remaining || 0
                                                        : selectedItemInfo?.quantity || 1000
                                                }
                                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                                required
                                                className="w-full bg-white border border-green-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                                            />
                                            {selectedItemInfo && (
                                                <p className="text-[10px] text-green-700 font-bold mt-1.5 uppercase">
                                                    Max Available: {
                                                        selectedTierId
                                                            ? (selectedItemInfo.stock_price_tiers || []).find(t => t.id === selectedTierId)?.quantity_remaining || 0
                                                            : selectedItemInfo.quantity
                                                    }
                                                </p>
                                            )}
                                        </div>
                                    

                                    {/* Batch Info Box */}
                                    <div className="supplier-returns-batch-box p-5 bg-[#F3F9F5] border border-green-200 rounded-2xl grid grid-cols-2 gap-y-4">
                                        <div>
                                            <p className="text-[9px] font-bold text-green-700 uppercase tracking-widest">Supplier Source</p>
                                            <p className="text-xs font-bold text-gray-900 mt-1">{suppliers.find(s => s.id === formData.supplier_id)?.supplier_name || 'Select Item First'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-green-700 uppercase tracking-widest">Load Buying Price</p>
                                            <p className="text-xs font-bold text-gray-900 mt-1">
                                                {selectedTierId && selectedItemInfo
                                                    ? `Rs. ${(selectedItemInfo.stock_price_tiers || []).find(t => t.id === selectedTierId)?.buying_price || 0}`
                                                    : selectedItemInfo ? `Rs. ${selectedItemInfo.buying_price}` : 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-green-700 uppercase tracking-widest">Purchase / Load Date</p>
                                            <p className="text-xs font-bold text-gray-900 mt-1">
                                                {selectedTierId && selectedItemInfo
                                                    ? new Date((selectedItemInfo.stock_price_tiers || []).find(t => t.id === selectedTierId)?.created_at).toLocaleDateString()
                                                    : selectedItemInfo?.last_updated ? new Date(selectedItemInfo.last_updated).toLocaleDateString() : 'N/A'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-green-700 uppercase tracking-widest">Return Making Day</p>
                                            <p className="text-xs font-bold text-[#D4AF37] mt-1">{new Date().toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="text-[11px] font-bold text-green-800 mb-2 block">Return Type</label>
                                            <select
                                                value={formData.return_type}
                                                onChange={(e) => setFormData({ ...formData, return_type: e.target.value })}
                                                className="w-full bg-white border border-green-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                                            >
                                                {['Damaged item return', 'Wrong item return', 'Expired item return', 'Warranty return', 'Overstock return', 'Other'].map(type => (
                                                    <option key={type} value={type}>{type}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold text-green-800 mb-2 block">Warehouse Location</label>
                                            <input
                                                type="text"
                                                value={formData.warehouse_location}
                                                onChange={(e) => setFormData({ ...formData, warehouse_location: e.target.value })}
                                                className="w-full bg-white border border-green-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-bold text-green-800 mb-2 block">Return Reason & Notes</label>
                                        <textarea
                                            placeholder="Detailed reason for return..."
                                            value={formData.reason}
                                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                            className="w-full bg-white border border-green-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all resize-none min-h-[90px]"
                                        ></textarea>
                                    </div>

                                    <div className="flex justify-end gap-4 pt-4">
                                        <button type="button" onClick={() => setShowForm(false)} className="supplier-returns-form-btn px-6 py-3 rounded-xl border border-gray-300 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all">
                                            Cancel
                                        </button>
                                        <button type="submit" className="supplier-returns-form-btn px-6 py-3 rounded-xl bg-green-700 text-white font-bold text-sm hover:bg-green-800 transition-all shadow-md">
                                            Authorize & Create Return
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* View Return Detail Modal */}
                {selectedReturnView && (
                    <div className="supplier-returns-view-overlay fixed inset-0 z-[2000] backdrop-blur-xl bg-black/70 p-4 sm:p-0 flex items-center justify-center">
                        <div className="supplier-returns-view-modal bg-[#1E1E1E] border border-white/10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-scale-up relative">
                            <div className="supplier-returns-view-header p-10 border-b border-white/5 flex justify-between items-center bg-white/[0.01] shrink-0">
                                <div className="flex items-center gap-5">
                                    <div className="p-3 bg-[#D4AF37]/10 rounded-2xl">
                                        <RefreshCcw className="w-6 h-6 text-[#D4AF37]" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Return Request Details</h2>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs font-black text-[#D4AF37] tracking-widest uppercase">{selectedReturnView.return_number}</span>
                                            <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${selectedReturnView.status === 'PENDING' ? 'text-yellow-500' : 'text-green-500'}`}>
                                                {selectedReturnView.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedReturnView(null)} className="supplier-returns-view-close p-3 hover:bg-white/5 rounded-full text-white/20 hover:text-white transition-all">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="overflow-y-auto p-10 pt-6 space-y-8 custom-scrollbar">
                                <div className="grid grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2">Item Information</p>
                                            <div className="bg-white/5 border border-white/5 p-5 rounded-2xl">
                                                <p className="text-sm font-black text-white">{selectedReturnView.inventory?.ingredient_name}</p>
                                                <p className="text-[10px] text-white/30 font-bold mt-1">REF: {selectedReturnView.inventory?.item_code}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                                                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Quantity</p>
                                                <p className="text-lg font-black text-red-500">{selectedReturnView.quantity}</p>
                                            </div>
                                            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                                                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Return Type</p>
                                                <p className="text-[10px] font-black text-white/70 uppercase truncate">{selectedReturnView.return_type}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2">Supplier Source</p>
                                            <div className="bg-white/5 border border-white/5 p-5 rounded-2xl">
                                                <p className="text-sm font-black text-white">{selectedReturnView.suppliers?.supplier_name}</p>
                                                <p className="text-[10px] text-white/30 font-bold mt-1">Batch: {selectedReturnView.inventory_batches?.batch_number}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                                                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Timeline</p>
                                                <p className="text-[10px] font-black text-white/70">{new Date(selectedReturnView.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                                                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Location</p>
                                                <p className="text-[10px] font-black text-white/70 uppercase">{selectedReturnView.warehouse_location}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Reason & Authorization Notes</p>
                                    <div className="bg-white/5 border border-white/5 p-6 rounded-[24px] min-h-[100px]">
                                        <p className="text-xs text-white/50 leading-relaxed italic">
                                            "{selectedReturnView.reason || 'No detailed reason provided.'}"
                                        </p>
                                        {(() => {
                                            const parsed = parseReturnNotes(selectedReturnView.notes);
                                            return (
                                                <>
                                                    {parsed.notes && (
                                                        <p className="text-xs text-white/40 mt-2 font-semibold">
                                                            Notes: {parsed.notes}
                                                        </p>
                                                    )}
                                                    {parsed.buying_price !== null && (
                                                        <p className="text-xs text-white/40 mt-1 font-semibold">
                                                            Returned Set Buying Price: Rs. {parsed.buying_price}
                                                        </p>
                                                    )}
                                                    {parsed.resolution_notes && (
                                                        <p className="text-xs text-[#D4AF37] mt-2 font-bold uppercase tracking-wider">
                                                            Resolution Notes: {parsed.resolution_notes}
                                                        </p>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all"
                                        onClick={() => setSelectedReturnView(null)}
                                    >
                                        Close Details
                                    </button>
                                    {selectedReturnView.status === 'PENDING' && userRole === 'CASHIER' && (
                                        <button
                                            onClick={() => onNavigate('return-management', { id: selectedReturnView.id })}
                                            className="flex-[2] py-4 bg-[#D4AF37] hover:bg-[#E5C158] text-white font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all shadow-lg"
                                        >
                                            Manage Approval Workflow
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default SupplierReturnsPage;
