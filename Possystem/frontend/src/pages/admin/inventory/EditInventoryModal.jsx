import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../../config/api';
import '../../../styles/menu.css';
import { getSuppliers } from '../../../services/supplierService';

const EditInventoryModal = ({ onClose, onSuccess, categories = [], batches = [], initialData }) => {
    const [formData, setFormData] = useState({
        ingredient_name: '',
        item_code: '',
        category: '',
        quantity: '',
        unit: 'kg',
        reorder_level: '10',
        batch_id: '',
        buying_price: '',
        selling_price: '',
        storage_location: '',
        expiry_date: ''
    });
    const [loading, setLoading] = useState(false);



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
                batch_id: initialData.batch_id || '',
                buying_price: initialData.buying_price || '',
                selling_price: initialData.selling_price || '',
                storage_location: initialData.storage_location || '',
                expiry_date: initialData.expiry_date ? new Date(initialData.expiry_date).toISOString().split('T')[0] : ''
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
                reorder_level: formData.reorder_level,
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

    return createPortal(
        <div className="edit-inventory-overlay">
            <div className="edit-inventory-modal">
                <div className="edit-inventory-header">
                    <h2>Edit Inventory Item</h2>
                    <button title="Close" onClick={onClose} className="edit-inventory-close"><X className="w-5 h-5" /></button>
                </div>

                <div className="edit-inventory-body custom-scrollbar">
                    <form id="editInventoryForm" onSubmit={handleSubmit} className="edit-inventory-form">
                        <div className="edit-inventory-grid">
                            <div className="form-group">
                                <label>Item Name *</label>
                                <input
                                    type="text" required name="ingredient_name"
                                    value={formData.ingredient_name} onChange={handleChange}
                                    placeholder="e.g. Tomatoes"
                                />
                            </div>
                            <div className="form-group">
                                <div className="edit-inventory-label-row">
                                    <label className="mb-0">Item Code (Barcode)</label>
                                    <button
                                        title="Auto-generate item code"
                                        type="button"
                                        onClick={() => {
                                            const generatedCode = 'HW' + Date.now().toString().slice(-6) + Math.floor(1000 + Math.random() * 9000);
                                            setFormData(prev => ({ ...prev, item_code: generatedCode }));
                                        }}
                                        className="edit-inventory-link-btn"
                                    >
                                        <RefreshCw className="w-3 h-3" /> Auto-Generate
                                    </button>
                                </div>
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
                            <div className="edit-inventory-split">
                                <div className="form-group">
                                    <label>Quantity *</label>
                                    <input
                                        type="number" step="0.01" required name="quantity"
                                        value={formData.quantity} onChange={handleChange}
                                        placeholder="0.00"
                                        disabled
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Unit</label>
                                    <select
                                        name="unit" value={formData.unit} onChange={handleChange}
                                        disabled
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
                            <div className="edit-inventory-split">
                                <div className="form-group">
                                    <label>Buying Price (Rs.) *</label>
                                    <input
                                        type="number" step="0.01" required name="buying_price"
                                        value={formData.buying_price} onChange={handleChange}
                                        placeholder="Cost Price"
                                        disabled
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
                            <div className="edit-inventory-full form-group edit-inventory-batch">
                                <label>Select Inventory Batch *</label>
                                <select
                                    name="batch_id"
                                    required
                                    value={formData.batch_id}
                                    onChange={handleChange}
                                    disabled
                                >
                                    <option value="">-- Change Active Batch --</option>
                                    {batches.map(b => (
                                        <option key={b.id} value={b.id}>
                                            {b.batch_number} | {b.supplier_name} ({b.date})
                                        </option>
                                    ))}
                                </select>
                                <p>Supplier identity is derived from the selected procurement batch.</p>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="edit-inventory-actions">
                    <button title="Cancel" onClick={onClose} className="edit-inventory-btn">
                        Cancel
                    </button>
                    <button
                        title="Save Changes"
                        type="submit" form="editInventoryForm"
                        disabled={loading}
                        className="edit-inventory-btn"
                    >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default EditInventoryModal;
