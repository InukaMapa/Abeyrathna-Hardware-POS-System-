import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import {
    RefreshCcw, Search, Plus, Filter, Package, Calendar,
    Truck, AlertCircle, CheckCircle2, ChevronRight, X, ArrowUpRight,
    Clock, Archive, ShieldCheck, Download, MoreVertical, Trash2
} from 'lucide-react';
import { API_BASE_URL } from '../../../config/api';

const SupplierReturnsPage = ({ onNavigate }) => {
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
            await axios.post(`${API_BASE_URL}/inventory/returns`, formData, {
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

        if (item && item.batch_id) {
            const batch = batches.find(b => b.id === item.batch_id);
            setSelectedBatchInfo(batch);
            setFormData({
                ...formData,
                item_id: itemId,
                batch_id: batch?.id || '',
                supplier_id: batch?.supplier_id || ''
            });
        } else {
            setFormData({ ...formData, item_id: itemId });
            setSelectedBatchInfo(null);
        }
    };

    const stats = {
        total: returns.length,
        value: returns.reduce((sum, r) => sum + (parseFloat(r.quantity) * parseFloat(r.inventory?.buying_price || 0)), 0),
        pending: returns.filter(r => r.status === 'PENDING').length,
        replacements: returns.filter(r => r.replacement_status === 'PENDING').length
    };

    return (
        <DashboardLayout activePage="supplier-returns" onNavigate={onNavigate}>
            <div className="p-8 max-w-[1600px] mx-auto">
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
                        onClick={() => setShowForm(true)}
                        className="btn-premium-green shadow-lg"
                    >
                        <Plus className="w-5 h-5" />
                        Create Return Items
                    </button>
                </div>

                {/* Stats Widgets */}
                <div className="grid grid-cols-4 gap-6 mb-10">
                    {[
                        { label: 'Total Return Requests', val: stats.total, icon: <RefreshCcw className="text-[#D4AF37]" />, desc: 'All time logs' },
                        { label: 'Returned Items Value', val: `Rs. ${stats.value.toLocaleString()}`, icon: <Package className="text-blue-500" />, desc: 'Physical asset value' },
                        { label: 'Pending Supplier Approvals', val: stats.pending, icon: <Clock className="text-yellow-500" />, desc: 'Awaiting response' },
                        { label: 'Replacement Pending', val: stats.replacements, icon: <ShieldCheck className="text-green-500" />, desc: 'Warranty track' }
                    ].map((stat, i) => (
                        <div key={i} className="p-6 bg-[#111] border border-[#333] rounded-[20px] shadow-lg hover:-translate-y-1 hover:shadow-xl hover:border-[#16A34A]/50 transition-all duration-300 group relative overflow-hidden">
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
                    <div className="relative flex-1 min-w-[300px]">
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
                        className="bg-[#1E1E1E] rounded-2xl py-3 px-4 pr-10 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/50 cursor-pointer transition-all shadow-inner"
                        value={filterSupplier}
                        onChange={(e) => setFilterSupplier(e.target.value)}
                    >
                        <option value="all" className="bg-[#1E1E1E] text-white">All Suppliers</option>
                        {suppliers.map(s => <option key={s.id} value={s.id} className="bg-[#1E1E1E] text-white">{s.supplier_name}</option>)}
                    </select>
                    <select
                        className="bg-[#1E1E1E] rounded-2xl py-3 px-4 pr-10 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/50 cursor-pointer transition-all shadow-inner"
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
                <div className="bg-white/[0.01] border border-white/5 rounded-[40px] overflow-hidden">
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
                                            <div className="flex justify-end gap-2 text-white">
                                                <button
                                                    onClick={() => setSelectedReturnView(ret)}
                                                    className="btn-premium-green-icon"
                                                    title="View Return"
                                                >
                                                    <RefreshCcw className="w-4 h-4" />
                                                </button>
                                                <button className="p-2 hover:bg-white/5 rounded-lg text-white/10 hover:text-white transition-all">
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
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-xl">

                        <div className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[24px] shadow-2xl overflow-hidden animate-slide-up relative">
                            {/* Header */}
                            <div className="p-6 flex justify-between items-center bg-[#C1DFCD] shrink-0 border-b-0">
                                <div className="flex items-center gap-3">
                                    <RefreshCcw className="w-5 h-5 text-green-800" />
                                    <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Create Return Item</h2>
                                </div>
                                <button onClick={() => setShowForm(false)} className="p-2 bg-green-700 text-white hover:bg-green-800 rounded-xl transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="overflow-y-auto p-8 pt-6 space-y-6 custom-scrollbar">
                                <form onSubmit={handleCreateReturn} className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="text-[11px] font-bold text-green-800 mb-2 block">Search & Select Item</label>
                                            <select
                                                value={formData.item_id}
                                                onChange={(e) => handleItemSelect(e.target.value)}
                                                required
                                                className="w-full bg-white border border-green-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                                            >
                                                <option value="">-- Choose Item --</option>
                                                {inventoryItems.map(i => (
                                                    <option key={i.id} value={i.id}>{i.ingredient_name} ({i.item_code}) - Avail: {i.quantity}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-[11px] font-bold text-green-800 mb-2 block">Return Quantity</label>
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                value={formData.quantity}
                                                max={selectedItemInfo?.quantity || 1000}
                                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                                required
                                                className="w-full bg-white border border-green-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                                            />
                                            {selectedItemInfo && (
                                                <p className="text-[10px] text-green-700 font-bold mt-1.5 uppercase">Max Available: {selectedItemInfo.quantity}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Batch Info Box */}
                                    <div className="p-5 bg-[#F3F9F5] border border-green-200 rounded-2xl grid grid-cols-2 gap-y-4">
                                        <div>
                                            <p className="text-[9px] font-bold text-green-700 uppercase tracking-widest">Supplier Source</p>
                                            <p className="text-xs font-bold text-gray-900 mt-1">{selectedBatchInfo?.suppliers?.supplier_name || 'Select Item First'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-green-700 uppercase tracking-widest">Invoice / Batch No</p>
                                            <p className="text-xs font-bold text-gray-900 mt-1">{selectedBatchInfo?.batch_number || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-green-700 uppercase tracking-widest">Purchase Date</p>
                                            <p className="text-xs font-bold text-gray-900 mt-1">{selectedBatchInfo ? new Date(selectedBatchInfo.batch_date).toLocaleDateString() : 'N/A'}</p>
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
                                        <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl border border-gray-300 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all">
                                            Cancel
                                        </button>
                                        <button type="submit" className="px-6 py-3 rounded-xl bg-green-700 text-white font-bold text-sm hover:bg-green-800 transition-all shadow-md">
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
                    <div className="fixed inset-0 z-[2000] backdrop-blur-xl bg-black/70 p-4 sm:p-0 flex items-center justify-center">
                        <div className="bg-[#1E1E1E] border border-white/10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-scale-up relative">
                            <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/[0.01] shrink-0">
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
                                <button onClick={() => setSelectedReturnView(null)} className="p-3 hover:bg-white/5 rounded-full text-white/20 hover:text-white transition-all">
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
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all"
                                        onClick={() => setSelectedReturnView(null)}
                                    >
                                        Close Details
                                    </button>
                                    {selectedReturnView.status === 'PENDING' && (
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
