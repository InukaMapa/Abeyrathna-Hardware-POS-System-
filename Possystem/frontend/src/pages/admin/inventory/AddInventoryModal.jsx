import React, { useState, useEffect } from 'react';
import { X, Save, ScanLine, Type, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../../config/api';
import '../../../styles/menu.css';
import { getSuppliers } from '../../../services/supplierService';

const AddInventoryModal = ({ onClose, onSuccess, onScanBillClick, categories = [] }) => {
    const [formData, setFormData] = useState({
        ingredient_name: '',
        item_code: '',
        category: categories.length > 0 ? categories[0].name : '', // Default to first category
        quantity: '',
        unit: 'kg',
        supplier_info: '',
        supplier_id: '',
        selling_price: '',
        storage_location: '',
        expiry_date: ''
    });
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(false);

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
                        className="flex-1 py-2 text-sm font-medium rounded-lg bg-[#D32F2F] text-white flex items-center justify-center gap-2"
                    >
                        <Type className="w-4 h-4" /> Manual Entry
                    </button>
                    <button
                        onClick={onScanBillClick}
                        className="flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 bg-[#2F4F4F] text-[#E0E0E0] border border-[#3A6060] hover:bg-[#3A6060]"
                    >
                        <ScanLine className="w-4 h-4" /> Scan Bill (AI)
                    </button>
                </div>

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
                            <div className="form-group">
                                <label>Selling Price (Rs.) *</label>
                                <input
                                    type="number" step="0.01" required name="selling_price"
                                    value={formData.selling_price} onChange={handleChange}
                                    placeholder="0.00"
                                />
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
                                <label>Supplier (Optional)</label>
                                <select
                                    name="supplier_id"
                                    value={formData.supplier_id}
                                    onChange={handleChange}
                                >
                                    <option value="">Select Supplier</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.supplier_name} ({s.company_name || 'N/A'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-2 form-group">
                                <label>Additional Supplier Notes</label>
                                <textarea
                                    name="supplier_info"
                                    value={formData.supplier_info} onChange={handleChange}
                                    rows="1"
                                    placeholder="Any additional details..."
                                ></textarea>
                            </div>
                        </div>
                    </form>
                </div>

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
