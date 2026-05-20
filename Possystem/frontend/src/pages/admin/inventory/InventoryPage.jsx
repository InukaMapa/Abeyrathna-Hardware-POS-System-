import React, { useState, useEffect } from 'react';
import { Search, Plus, Package, Trash2, Edit, FileText, AlertTriangle, AlertCircle, Loader, Settings, ScanLine, X } from 'lucide-react';
import axios from 'axios';
import AddInventoryModal from './AddInventoryModal';
import EditInventoryModal from './EditInventoryModal';
import CategoryManagerModal from './CategoryManagerModal';
import ScanBillModal from './ScanBillModal';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { API_BASE_URL } from '../../../config/api';
import '../../../styles/menu.css';

const InventoryPage = ({ onNavigate }) => {
    const [inventory, setInventory] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showScanModal, setShowScanModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [batches, setBatches] = useState([]);

    const fetchBatches = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/inventory/batches`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setBatches(response.data);
        } catch (error) { console.error('Error fetching batches:', error); }
    };

    useEffect(() => {
        fetchInventory();
        fetchCategories();
        fetchBatches();
    }, []);

    useEffect(() => {
        fetchInventory();
    }, [searchTerm, filterStatus, filterCategory]);

    const fetchCategories = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/inventory/categories`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCategories(response.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = {};
            if (searchTerm) params.search = searchTerm;
            if (filterCategory !== 'All') params.category = filterCategory;
            if (filterStatus !== 'All') params.status = filterStatus;

            const response = await axios.get(`${API_BASE_URL}/inventory`, {
                headers: { Authorization: `Bearer ${token}` },
                params
            });
            setInventory(response.data);
        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_BASE_URL}/inventory/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchInventory();
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('Failed to delete item');
        }
    };

    const handleViewDetails = (id) => {
        onNavigate('inventory-detail', { id });
    };

    const handleEdit = (item) => {
        setEditingItem(item);
    };

    return (
        <DashboardLayout activePage="inventory" onNavigate={onNavigate}>
            <div className="menu-management-container animate-fade-in custom-scrollbar">

                {/* STICKY HEADER & FILTERS */}
                <div className="sticky top-[-28px] z-[50] bg-white/80 backdrop-blur-md pt-7 pb-4 -mx-7 px-7 mb-6 shadow-sm border-b border-[#16A34A]/10">
                    {/* Header */}
                    <div className="menu-header !mb-6">
                        <div>
                            <h1 className="menu-title text-[#166534]">Inventory Management</h1>
                            <p className="text-gray-500 text-sm mt-1">Manage stock, track items, and handle reordering.</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowBatchModal(true)}
                                className="btn-primary flex items-center gap-2 rounded-full text-sm font-bold uppercase tracking-wider"
                            >
                                <Package className="w-4 h-4" /> Create Inventory Batch
                            </button>
                            <button
                                onClick={() => setShowCategoryModal(true)}
                                className="btn-secondary rounded-full flex items-center gap-2 transition-colors text-sm font-medium"
                            >
                                <Settings className="w-4 h-4" /> Manage Categories
                            </button>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="btn-premium-green"
                            >
                                <Plus className="w-5 h-5" />
                                Add Inventory
                            </button>
                        </div>
                    </div>

                    {/* Search & Filters */}
                    <div className="menu-filters-container !mb-0">
                        <div className="menu-top-bar">
                            <div className="search-wrapper">
                                <Search className="search-icon w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search by name or code..."
                                    className="menu-search-input"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-3">
                                <select
                                    className="filter-select"
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                >
                                    <option value="All">All Categories</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>

                                <select
                                    className="filter-select"
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                >
                                    <option value="All">All Status</option>
                                    <option value="In Stock">In Stock</option>
                                    <option value="Low Stock">Low Stock</option>
                                    <option value="Out of Stock">Out of Stock</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Inventory Table */}
                <div className="bg-[#1E1E1E] rounded-xl shadow-lg overflow-hidden border border-[#333]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#111] text-[#A0A0A0] text-xs uppercase tracking-wider border-b border-[#333]">
                                    <th className="p-4 font-semibold">Item Name</th>
                                    <th className="p-4 font-semibold">Code</th>
                                    <th className="p-4 font-semibold">Category</th>
                                    <th className="p-4 font-semibold">Supplier</th>
                                    <th className="p-4 font-semibold">Quantity</th>
                                    <th className="p-4 font-semibold">Status</th>
                                    <th className="p-4 font-semibold text-right">Price</th>
                                    <th className="p-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#333]">
                                {loading ? (
                                    <tr><td colSpan="8" className="p-12 text-center text-[#A0A0A0]"><Loader className="w-6 h-6 animate-spin mx-auto mb-2" />Loading inventory...</td></tr>
                                ) : inventory.length === 0 ? (
                                    <tr><td colSpan="8" className="p-12 text-center text-[#A0A0A0]"><Package className="w-8 h-8 mx-auto mb-2 opacity-50" />No items found.</td></tr>
                                ) : (
                                    inventory.map((item) => (
                                        <tr key={item.id} className="hover:bg-[#252525] transition-colors group">
                                            <td className="p-4">
                                                <div className="font-bold text-[#E0E0E0]">{item.ingredient_name}</div>
                                                <div className="text-xs text-[#A0A0A0]">{item.unit}</div>
                                            </td>
                                            <td className="p-4 text-sm text-[#A0A0A0] font-mono">{item.item_code || '-'}</td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 bg-[#2A2A2A] text-[#E0E0E0] text-xs rounded-md border border-[#333]">
                                                    {item.category || 'Uncategorized'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm text-[#E0E0E0]">
                                                    {item.batch_id ? (
                                                        batches.find(b => b.id === item.batch_id)?.supplier_name || <span className="text-[#666] italic">Unknown (Batch {item.batch_id})</span>
                                                    ) : item.suppliers?.supplier_name || (
                                                        <span className="text-[#666] italic">No Supplier</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-semibold text-[#E0E0E0]">
                                                    {item.quantity} <span className="text-xs font-normal text-[#A0A0A0]">{item.unit}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold border flex items-center w-fit gap-1
                                                    ${item.status === 'Out of Stock' ? 'bg-[#ff5252]/10 text-[#ff5252] border-[#ff5252]/30' :
                                                        item.status === 'Low Stock' ? 'bg-[#ffb74d]/10 text-[#ffb74d] border-[#ffb74d]/30' :
                                                            'bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/30'}`}>
                                                    {item.status === 'Low Stock' && <AlertTriangle className="w-3 h-3" />}
                                                    {item.status === 'Out of Stock' && <AlertCircle className="w-3 h-3" />}
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-black text-red-500">
                                                Rs. {parseFloat(item.selling_price || 0).toFixed(2)}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleViewDetails(item.id)}
                                                        className="btn-premium-green-icon"
                                                        title="View Details"
                                                    >
                                                        <FileText className="w-4.5 h-4.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="btn-premium-green-icon"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4.5 h-4.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="btn-premium-green-icon"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4.5 h-4.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modals */}
                {showScanModal && (
                    <ScanBillModal
                        onClose={() => setShowScanModal(false)}
                        onSuccess={() => {
                            setShowScanModal(false);
                            fetchInventory();
                        }}
                    />
                )}

                {showAddModal && (
                    <AddInventoryModal
                        onClose={() => setShowAddModal(false)}
                        categories={categories}
                        batches={batches.filter(b => b.calc_status !== 'COMPLETED' && b.status !== 'COMPLETED')}
                        onScanBillClick={() => {
                            setShowAddModal(false);
                            setShowScanModal(true);
                        }}
                        onSuccess={() => {
                            setShowAddModal(false);
                            fetchInventory();
                        }}
                    />
                )}

                {showBatchModal && (
                    <div className="modal-overlay z-[3000] backdrop-blur-md bg-black/60">
                        <div className="bg-[#1E1E1E] w-full max-w-lg rounded-[24px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] border border-[#333] p-8 animate-scale-up relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#16A34A] to-[#047857]"></div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-white tracking-tight">Create Inventory Batch</h2>
                                <button onClick={() => setShowBatchModal(false)} className="text-white/20 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>
                            <BatchCreationForm
                                onCancel={() => setShowBatchModal(false)}
                                onSuccess={(newBatch) => {
                                    setBatches(prev => [newBatch, ...prev]);
                                    setShowBatchModal(false);
                                    alert(`Batch Created Successfully: ${newBatch.batch_number}`);
                                }}
                            />
                        </div>
                    </div>
                )}

                {showCategoryModal && (
                    <CategoryManagerModal
                        isOpen={showCategoryModal}
                        onClose={() => setShowCategoryModal(false)}
                        categories={categories}
                        onCategoryChange={fetchCategories}
                    />
                )}

                {editingItem && (
                    <EditInventoryModal
                        initialData={editingItem}
                        onClose={() => setEditingItem(null)}
                        categories={categories}
                        batches={batches}
                        onSuccess={() => {
                            setEditingItem(null);
                            fetchInventory();
                        }}
                    />
                )}
            </div>
        </DashboardLayout>
    );
};

const BatchCreationForm = ({ onCancel, onSuccess }) => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [batchData, setBatchData] = useState({
        supplier_id: '',
        date: new Date().toISOString().split('T')[0],
        net_value: '',
        items: ''
    });

    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/suppliers`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setSuppliers(response.data);
            } catch (error) { console.error(error); }
        };
        fetchSuppliers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                batch_number: 'BAT-' + Math.floor(10000 + Math.random() * 90000),
                supplier_id: batchData.supplier_id,
                batch_date: batchData.date,
                net_value: batchData.net_value,
                total_items: batchData.items
            };

            const response = await axios.post(`${API_BASE_URL}/inventory/batches`, payload, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            onSuccess(response.data);
        } catch (error) {
            console.error('Error creating batch:', error);
            alert('Failed to create batch in database.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
                <div className="form-group flex flex-col justify-end">
                    <label className="text-[11px] font-black text-white/50 uppercase tracking-widest mb-1.5 ml-1 block leading-tight">Select Supplier *</label>
                    <select
                        required
                        className="w-full bg-[#F4FBF7] border-2 border-[#A7F3D0] rounded-xl px-5 py-3.5 text-sm text-[#064E3B] font-bold focus:outline-none focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10 transition-all shadow-sm placeholder:text-[#166534]/40"
                        value={batchData.supplier_id}
                        onChange={(e) => setBatchData({ ...batchData, supplier_id: e.target.value })}
                    >
                        <option value="" className="bg-[#121212]">-- Choose Supplier --</option>
                        {suppliers.map(s => <option key={s.id} value={s.id} className="bg-[#121212]">{s.supplier_name}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div className="form-group flex flex-col justify-end">
                        <label className="text-[11px] font-black text-white/50 uppercase tracking-widest mb-1.5 ml-1 block leading-tight">Procurement Date *</label>
                        <input
                            type="date" required
                            className="w-full bg-[#F4FBF7] border-2 border-[#A7F3D0] rounded-xl px-5 py-3.5 text-sm text-[#064E3B] font-bold focus:outline-none focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10 transition-all shadow-sm placeholder:text-[#166534]/40"
                            value={batchData.date}
                            onChange={(e) => setBatchData({ ...batchData, date: e.target.value })}
                        />
                    </div>
                    <div className="form-group flex flex-col justify-end">
                        <label className="text-[11px] font-black text-white/50 uppercase tracking-widest mb-1.5 ml-1 block leading-tight">Total Items (Line Items) *</label>
                        <input
                            type="number" required placeholder="e.g. 15"
                            className="w-full bg-[#F4FBF7] border-2 border-[#A7F3D0] rounded-xl px-5 py-3.5 text-sm text-[#064E3B] font-bold focus:outline-none focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10 transition-all shadow-sm placeholder:text-[#166534]/40"
                            value={batchData.items}
                            onChange={(e) => setBatchData({ ...batchData, items: e.target.value })}
                        />
                    </div>
                </div>
                <div className="form-group flex flex-col justify-end">
                    <label className="text-[11px] font-black text-white/50 uppercase tracking-widest mb-1.5 ml-1 block leading-tight">Net Transaction Value (Rs.) *</label>
                    <input
                        type="number" step="0.01" required placeholder="0.00"
                        className="w-full bg-[#F4FBF7] border-2 border-[#A7F3D0] rounded-xl px-5 py-3.5 text-sm text-[#064E3B] font-bold focus:outline-none focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10 transition-all shadow-sm placeholder:text-[#166534]/40"
                        value={batchData.net_value}
                        onChange={(e) => setBatchData({ ...batchData, net_value: e.target.value })}
                    />
                </div>
            </div>
            <div className="flex gap-4 pt-6 mt-2">
                <button type="button" onClick={onCancel} className="btn-secondary flex-1 py-4 rounded-full text-xs font-bold uppercase transition-all">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1 py-4 rounded-full text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50">
                    {loading ? 'Processing...' : 'Create Batch'}
                </button>
            </div>
        </form>
    );
};

export default InventoryPage;
