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
        <div className="modal-overlay">
            <div className="modal-content" style={{ width: '700px', maxWidth: '95%' }}>
                <div className="modal-header">
                    <h2>Add Inventory Item</h2>
                    <button onClick={onClose} className="close-btn"><X className="w-5 h-5" /></button>
                </div>

                <div className="flex gap-2 mb-6 border-b border-[#333] pb-4">
                    <button
                        onClick={() => setShowReplacementPicker(false)}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 ${!showReplacementPicker ? 'bg-[#D32F2F] text-white' : 'bg-white/5 text-white/40'}`}
                    >
                        <Type className="w-4 h-4" /> Manual Entry
                    </button>
                    <button
                        onClick={onScanBillClick}
                        className="flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 bg-[#2F4F4F] text-[#E0E0E0] border border-[#3A6060] hover:bg-[#3A6060]"
                    >
                        <ScanLine className="w-4 h-4" /> Scan Bill (AI)
                    </button>
                    <button
                        onClick={() => setShowReplacementPicker(true)}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${showReplacementPicker ? 'bg-purple-600 text-white' : 'bg-[#6A5ACD]/10 text-[#6A5ACD] border border-[#6A5ACD]/20 hover:bg-[#6A5ACD]/20'}`}
                    >
                        <RefreshCw className="w-4 h-4" /> Return Replacement Items
                    </button>
                </div>

                {showReplacementPicker ? (
                    <div className="space-y-4 animate-fade-in pr-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <h3 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] mb-4">Select Authorized Replacement Batch</h3>
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
                                        className="p-5 bg-purple-500/5 border border-purple-500/10 rounded-2xl flex items-center justify-between group hover:bg-purple-500/10 hover:border-purple-500/30 transition-all text-left"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                                                <RefreshCw className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-white tracking-widest uppercase">{b.batch_number}</p>
                                                <p className="text-[11px] font-medium text-white/40 mt-1">{b.supplier_returns?.inventory?.ingredient_name || 'N/A'}</p>
                                                <p className="text-[9px] text-white/20 font-bold uppercase mt-0.5">{b.supplier_name} | {b.date}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-purple-500">{b.supplier_returns?.quantity} UNITS</p>
                                            <p className="text-[9px] font-bold text-white/10 uppercase tracking-widest mt-1">Pending Stocking</p>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="p-10 border border-dashed border-white/5 rounded-3xl text-center">
                                    <RefreshCw className="w-8 h-8 text-white/5 mx-auto mb-3" />
                                    <p className="text-[10px] text-white/20 font-medium uppercase tracking-widest">No pending replacement batches found.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="overflow-y-auto max-h-[60vh] custom-scrollbar pr-2">
                        <form id="inventoryForm" onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label>Item Name *</label>
                                    <input
                                        type="text" required name="ingredient_name"
                                        value={formData.ingredient_name} onChange={handleChange}
                                        placeholder="e.g. Tomatoes"
                                    />
                                </div>
                                <div className="form-group">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="mb-0">Item Code (Barcode)</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const generatedCode = 'HW' + Date.now().toString().slice(-6) + Math.floor(1000 + Math.random() * 9000);
                                                setFormData(prev => ({ ...prev, item_code: generatedCode }));
                                            }}
                                            className="text-xs text-[#ffb74d] hover:text-[#ffa726] flex items-center gap-1 font-medium transition-colors cursor-pointer bg-none border-none p-0"
                                        >
                                            <RefreshCw className="w-3 h-3" /> Auto-Generate
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="text" name="item_code"
                                            value={formData.item_code} onChange={handleChange}
                                            className="font-mono pr-10"
                                            placeholder="Auto-generated if empty"
                                        />
                                        <ScanLine className="absolute right-3 top-2.5 text-[#666] w-4 h-4 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Category</label>
                                    <select
                                        name="category" value={formData.category} onChange={handleChange}
                                    >
                                        <option value="" disabled>Select Category</option>
                                        {categories.length > 0 ? (
                                            categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                                        ) : (
                                            <option value="Uncategorized">Uncategorized</option>
                                        )}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label>Quantity *</label>
                                        <input
                                            type="number" step="0.01" required name="quantity"
                                            value={formData.quantity} onChange={handleChange}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Unit</label>
                                        <select
                                            name="unit" value={formData.unit} onChange={handleChange}
                                        >
                                            {units.map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label>Buying Price (Rs.) *</label>
                                        <input
                                            type="number" step="0.01" required name="buying_price"
                                            value={formData.buying_price} onChange={handleChange}
                                            placeholder="Cost Price"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Selling Price (Rs.) *</label>
                                        <input
                                            type="number" step="0.01" required name="selling_price"
                                            value={formData.selling_price} onChange={handleChange}
                                            placeholder="Retail Price"
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Storage Location</label>
                                    <input
                                        type="text" name="storage_location"
                                        value={formData.storage_location} onChange={handleChange}
                                        placeholder="e.g. Shelf A-1"
                                    />
                                </div>
                                <div className="md:col-span-2 border-t border-[#333] pt-4 mt-2">
                                    <div className="form-group">
                                        <label>Expiry Date (Optional)</label>
                                        <input
                                            type="date" name="expiry_date"
                                            value={formData.expiry_date} onChange={handleChange}
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2 form-group">
                                    <label>Select Inventory Batch *</label>
                                    <select
                                        name="batch_id"
                                        required
                                        value={formData.batch_id}
                                        onChange={handleChange}
                                        className="font-bold border-[#D4AF37]/30"
                                    >
                                        <option value="">-- Select Active Batch --</option>
                                        {batches.map(b => (
                                            <option key={b.id} value={b.id}>
                                                {b.batch_number} {b.batch_type === 'REPLACEMENT' ? '[REPLACEMENT]' : ''} | {b.supplier_name} ({b.date})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-white/20 mt-1.5 ml-1 italic">Items must be linked to a created procurement batch.</p>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                <div className="modal-actions">
                    <button onClick={onClose} className="btn-secondary">
                        Cancel
                    </button>
                    <button
                        type="submit" form="inventoryForm"
                        disabled={loading}
                        className="btn-primary flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Inventory
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddInventoryModal;
