import React, { useState, useEffect } from 'react';
import { X, Save, ScanLine, Type, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../../config/api';
import '../../../styles/menu.css';
import { getSuppliers } from '../../../services/supplierService';

const AddInventoryModal = ({ onClose, onSuccess, onScanBillClick, categories = [], batches = [] }) => {
    const [formData, setFormData] = useState({
        ingredient_name: '',
        item_code: '',
        category: categories.length > 0 ? categories[0].name : '', // Default to first category
        quantity: '',
        unit: 'kg',
        batch_id: '',
        buying_price: '',
        selling_price: '',
        storage_location: '',
        expiry_date: ''
    });
    const [suppliers, setSuppliers] = useState([]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const [loading, setLoading] = useState(false);
    const [showReplacementPicker, setShowReplacementPicker] = useState(false);

    const units = ['kg', 'g', 'pcs', 'liters', 'bottles', 'cans'];

    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const data = await getSuppliers();
                setSuppliers(data);
            } catch (error) {
                console.error('Error fetching suppliers:', error);
            }
        };
        fetchSuppliers();
    }, []);

    useEffect(() => {
        if (categories.length > 0 && !formData.category) {
            setFormData(prev => ({ ...prev, category: categories[0].name }));
        }
    }, [categories]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                ...formData,
                method: 'MANUAL',
                admin_name: 'Admin'
            };

            await axios.post(`${API_BASE_URL}/inventory`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            onSuccess();
        } catch (error) {
            console.error('Error adding inventory:', error);
            alert('Failed to add inventory. Code or Name might already exist.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-md">
            <div className="bg-white w-full max-w-3xl max-h-[90vh] flex flex-col rounded-[24px] shadow-2xl overflow-hidden animate-slide-up relative">
                
                <div className="p-6 flex justify-between items-center bg-[#C1DFCD] shrink-0 border-b-0">
                    <div className="flex items-center gap-3">
                        <Type className="w-5 h-5 text-green-800" />
                        <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Add Inventory Item</h2>
                    </div>
                    <button onClick={onClose} className="p-2 bg-green-700 text-white hover:bg-green-800 rounded-xl transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 pt-6 space-y-6 flex-1 overflow-hidden flex flex-col">
                    <div className="flex gap-2 shrink-0 border-b border-gray-100 pb-4">
                        <button
                            onClick={() => setShowReplacementPicker(false)}
                            className={`flex-1 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${!showReplacementPicker ? 'bg-green-700 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                        >
                            <Type className="w-4 h-4" /> Manual Entry
                        </button>
                        <button
                            onClick={onScanBillClick}
                            className="flex-1 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                        >
                            <ScanLine className="w-4 h-4" /> Scan Bill (AI)
                        </button>
                        <button
                            onClick={() => setShowReplacementPicker(true)}
                            className={`flex-1 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${showReplacementPicker ? 'bg-purple-600 text-white shadow-md' : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'}`}
                        >
                            <RefreshCw className="w-4 h-4" /> Replacement Items
                        </button>
                    </div>

                    {showReplacementPicker ? (
                        <div className="space-y-4 animate-fade-in flex-1 overflow-y-auto custom-scrollbar">
                            <h3 className="text-[11px] font-bold text-purple-800 uppercase tracking-widest mb-4">Select Authorized Replacement Batch</h3>
                            <div className="grid grid-cols-1 gap-3">
                                {batches.filter(b => b.batch_type === 'REPLACEMENT' && (b.status !== 'COMPLETED') && (b.calc_status !== 'COMPLETED')).length > 0 ? (
                                    batches.filter(b => b.batch_type === 'REPLACEMENT' && (b.status !== 'COMPLETED') && (b.calc_status !== 'COMPLETED')).map(b => (
                                        <button
                                            key={b.id}
                                            onClick={() => {
                                                const ret = b.supplier_returns;
                                                const inv = ret?.inventory;
                                                setFormData({
                                                    ingredient_name: inv?.ingredient_name || '',
                                                    item_code: inv?.item_code || '',
                                                    category: inv?.category || categories[0]?.name || '',
                                                    quantity: ret?.quantity || '',
                                                    unit: inv?.unit || 'kg',
                                                    batch_id: b.id,
                                                    buying_price: inv?.buying_price || '',
                                                    selling_price: inv?.selling_price || '',
                                                    storage_location: '',
                                                    expiry_date: ''
                                                });
                                                setShowReplacementPicker(false);
                                            }}
                                            className="p-5 bg-white border border-purple-200 rounded-2xl flex items-center justify-between group hover:bg-purple-50 hover:border-purple-300 transition-all text-left shadow-sm"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-purple-100 rounded-xl text-purple-600">
                                                    <RefreshCw className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black text-gray-900 tracking-widest uppercase">{b.batch_number}</p>
                                                    <p className="text-[12px] font-bold text-gray-600 mt-1">{b.supplier_returns?.inventory?.ingredient_name || 'N/A'}</p>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">{b.supplier_name} | {b.date}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-purple-700">{b.supplier_returns?.quantity} UNITS</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Pending Stocking</p>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-10 border-2 border-dashed border-gray-200 rounded-3xl text-center bg-gray-50">
                                        <RefreshCw className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">No pending replacement batches found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            <form id="inventoryForm" onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="text-[11px] font-bold text-green-800 mb-2 block">Item Name *</label>
                                        <input
                                            type="text" required name="ingredient_name"
                                            value={formData.ingredient_name} onChange={handleChange}
                                            placeholder="e.g. Tomatoes"
                                            className="w-full bg-white border border-green-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all font-medium"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-[11px] font-bold text-green-800 block">Item Code (Barcode)</label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const generatedCode = 'HW' + Date.now().toString().slice(-6) + Math.floor(1000 + Math.random() * 9000);
                                                    setFormData(prev => ({ ...prev, item_code: generatedCode }));
                                                }}
                                                className="text-[10px] text-orange-500 hover:text-orange-600 flex items-center gap-1 font-bold uppercase tracking-widest transition-colors cursor-pointer bg-none border-none p-0"
                                            >
                                                <RefreshCw className="w-3 h-3" /> Auto-Generate
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text" name="item_code"
                                                value={formData.item_code} onChange={handleChange}
                                                className="w-full bg-white border border-green-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all font-medium"
                                                placeholder="Auto-generated if empty"
                                            />
                                            <ScanLine className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-[11px] font-bold text-green-800 mb-2 block">Category</label>
                                        <select
                                            name="category" value={formData.category} onChange={handleChange}
                                            className="w-full bg-white border border-green-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all font-medium"
                                        >
                                            <option value="" disabled>Select Category</option>
                                            {categories.length > 0 ? (
                                                categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                                            ) : (
                                                <option value="Uncategorized">Uncategorized</option>
                                            )}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-5 md:col-span-2">
                                        <div>
                                            <label className="text-[11px] font-bold text-green-800 mb-2 block">Quantity *</label>
                                            <input
                                                type="number" step="0.01" required name="quantity"
                                                value={formData.quantity} onChange={handleChange}
                                                placeholder="0.00"
                                                className="w-full bg-white border border-green-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all font-medium"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold text-green-800 mb-2 block">Unit</label>
                                            <select
                                                name="unit" value={formData.unit} onChange={handleChange}
                                                className="w-full bg-white border border-green-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all font-medium"
                                            >
                                                {units.map(u => <option key={u} value={u}>{u}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-5 md:col-span-2">
                                        <div>
                                            <label className="text-[11px] font-bold text-green-800 mb-2 block">Buying Price (Rs.) *</label>
                                            <input
                                                type="number" step="0.01" required name="buying_price"
                                                value={formData.buying_price} onChange={handleChange}
                                                placeholder="Cost Price"
                                                className="w-full bg-white border border-green-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all font-medium"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-bold text-green-800 mb-2 block">Selling Price (Rs.) *</label>
                                            <input
                                                type="number" step="0.01" required name="selling_price"
                                                value={formData.selling_price} onChange={handleChange}
                                                placeholder="Retail Price"
                                                className="w-full bg-white border border-green-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-green-800 mb-2 block">Storage Location</label>
                                        <input
                                            type="text" name="storage_location"
                                            value={formData.storage_location} onChange={handleChange}
                                            placeholder="e.g. Shelf A-1"
                                            className="w-full bg-white border border-green-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-green-800 mb-2 block">Expiry Date (Optional)</label>
                                        <input
                                            type="date" name="expiry_date"
                                            value={formData.expiry_date} onChange={handleChange}
                                            className="w-full bg-white border border-green-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all font-medium"
                                        />
                                    </div>
                                    
                                    <div className="md:col-span-2 p-5 bg-[#F3F9F5] border border-green-200 rounded-2xl">
                                        <label className="text-[11px] font-bold text-green-800 mb-2 block">Select Inventory Batch *</label>
                                        <select
                                            name="batch_id"
                                            required
                                            value={formData.batch_id}
                                            onChange={handleChange}
                                            className="w-full bg-white border border-green-300 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all font-medium"
                                        >
                                            <option value="">-- Select Active Batch --</option>
                                            {batches.map(b => (
                                                <option key={b.id} value={b.id}>
                                                    {b.batch_number} {b.batch_type === 'REPLACEMENT' ? '[REPLACEMENT]' : ''} | {b.supplier_name} ({b.date})
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-green-700 font-bold mt-2 uppercase tracking-wide">Items must be linked to a created procurement batch.</p>
                                    </div>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-white flex justify-end gap-4 border-t border-gray-100 shrink-0">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl border border-gray-300 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all">
                        Cancel
                    </button>
                    {!showReplacementPicker && (
                        <button
                            type="submit" form="inventoryForm"
                            disabled={loading}
                            className="px-6 py-3 rounded-xl bg-green-700 text-white font-bold text-sm hover:bg-green-800 transition-all shadow-md flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Inventory
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddInventoryModal;
