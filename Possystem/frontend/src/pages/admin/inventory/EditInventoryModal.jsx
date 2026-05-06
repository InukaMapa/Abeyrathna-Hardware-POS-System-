import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../../config/api';
import '../../../styles/menu.css';
import { getSuppliers } from '../../../services/supplierService';

const EditInventoryModal = ({ onClose, onSuccess, categories = [], initialData }) => {
    const [formData, setFormData] = useState({
        ingredient_name: '',
        item_code: '',
        category: '',
        quantity: '',
        unit: 'kg',
        reorder_level: '10',
        supplier_info: '',
        supplier_id: '',
        selling_price: '',
        storage_location: '',
        expiry_date: '',
        batch_code: ''
    });
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(false);

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

    const units = ['kg', 'g', 'pcs', 'liters', 'bottles', 'cans'];

    useEffect(() => {
        if (initialData) {
            setFormData({
                ingredient_name: initialData.ingredient_name || '',
                item_code: initialData.item_code || '',
                category: initialData.category || (categories.length > 0 ? categories[0].name : ''),
                quantity: initialData.quantity || '',
                unit: initialData.unit || 'kg',
                reorder_level: initialData.reorder_level || '10',
                supplier_info: initialData.supplier_info || '',
                supplier_id: initialData.supplier_id || '',
                selling_price: initialData.selling_price || '',
                storage_location: initialData.storage_location || '',
                expiry_date: initialData.expiry_date ? new Date(initialData.expiry_date).toISOString().split('T')[0] : '',
                batch_code: initialData.batch_code || ''
            });
        }
    }, [initialData, categories]);

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
                ingredient_name: formData.ingredient_name,
                item_code: formData.item_code,
                category: formData.category,
                quantity: formData.quantity,
                unit: formData.unit,
                reorder_level: formData.reorder_level,
                supplier_info: formData.supplier_info,
                supplier_id: formData.supplier_id,
                selling_price: formData.selling_price,
                storage_location: formData.storage_location
            };

            await axios.put(`${API_BASE_URL}/inventory/${initialData.id}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            onSuccess();
        } catch (error) {
            console.error('Error updating inventory:', error);
            alert('Failed to update inventory.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ width: '700px', maxWidth: '95%' }}>
                <div className="modal-header">
                    <h2>Edit Inventory Item</h2>
                    <button onClick={onClose} className="close-btn"><X className="w-5 h-5" /></button>
                </div>

                <div className="overflow-y-auto max-h-[70vh] custom-scrollbar pr-2 mt-4">
                    <form id="editInventoryForm" onSubmit={handleSubmit} className="space-y-4">
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
                                <label>Item Code (Barcode)</label>
                                <input
                                    type="text" name="item_code"
                                    value={formData.item_code} onChange={handleChange}
                                    className="font-mono"
                                    placeholder="SCAN-12345"
                                />
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
                                <label>Reorder Level</label>
                                <input
                                    type="number" step="0.01" name="reorder_level"
                                    value={formData.reorder_level} onChange={handleChange}
                                />
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
                            <div className="md:col-span-2 grid grid-cols-2 gap-4 border-t border-[#333] pt-4 mt-2">
                                <div className="form-group">
                                    <label>Batch Code (Optional)</label>
                                    <input
                                        type="text" name="batch_code"
                                        value={formData.batch_code} onChange={handleChange}
                                        placeholder="Auto-generated if empty"
                                    />
                                </div>
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

                <div className="modal-actions mt-6">
                    <button onClick={onClose} className="btn-secondary">
                        Cancel
                    </button>
                    <button
                        type="submit" form="editInventoryForm"
                        disabled={loading}
                        className="btn-primary flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditInventoryModal;
