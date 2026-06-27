import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
        buying_price: '',
        selling_price: '',
        storage_location: '',
        expiry_date: ''
    });
    const [loading, setLoading] = useState(false);
    const [priceTiers, setPriceTiers] = useState([]);

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
                buying_price: initialData.buying_price || '',
                selling_price: initialData.selling_price || '',
                storage_location: initialData.storage_location || '',
                expiry_date: initialData.expiry_date ? new Date(initialData.expiry_date).toISOString().split('T')[0] : ''
            });
            setPriceTiers(initialData.stock_price_tiers || []);
        }
    }, [initialData, categories]);

    const handleTierPriceChange = (index, value) => {
        const numericVal = parseFloat(value);
        setPriceTiers(prev => {
            const updated = [...prev];
            updated[index] = {
                ...updated[index],
                selling_price: isNaN(numericVal) ? value : numericVal
            };
            return updated;
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const hasTiers = priceTiers && priceTiers.length > 0;
            const activeTier = hasTiers ? priceTiers.find(t => parseFloat(t.quantity_remaining || 0) > 0) : null;
            const sellingPriceToSave = activeTier ? activeTier.selling_price : formData.selling_price;

            const payload = {
                ingredient_name: formData.ingredient_name,
                item_code: formData.item_code,
                category: formData.category,
                reorder_level: formData.reorder_level,
                selling_price: sellingPriceToSave,
                storage_location: formData.storage_location,
                supplier_info: hasTiers ? JSON.stringify(priceTiers) : null
            };

            await axios.put(`${API_BASE_URL}/inventory/${initialData.id}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            onSuccess();
        } catch (error) {
            console.error('Error updating inventory:', error);
            alert('Failed to update product.');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="edit-inventory-overlay">
            <div className="edit-inventory-modal">
                <div className="edit-inventory-header">
                    <h2>Edit Product</h2>
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
                            {priceTiers && priceTiers.length > 0 ? (
                                <div className="edit-inventory-full form-group" style={{ marginTop: '8px' }}>
                                    <label style={{ fontSize: '0.82rem', color: '#166534', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '12px' }}>
                                        Stock Price Tiers (FIFO Loads)
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {priceTiers.map((tier, idx) => (
                                            <div key={tier.id || idx} style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1.2fr 1fr 1fr 1fr',
                                                gap: '12px',
                                                alignItems: 'center',
                                                padding: '12px 14px',
                                                background: '#F8FCFA',
                                                border: '1px solid #D7E7DC',
                                                borderRadius: '8px'
                                            }}>
                                                <div>
                                                    <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: 500 }}>Load Info</span>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1E293B' }}>
                                                        Load #{idx + 1} ({new Date(tier.created_at).toLocaleDateString()})
                                                    </span>
                                                </div>
                                                <div>
                                                    <span style={{ fontSize: '0.74rem', color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: 500 }}>Remaining Qty</span>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1E293B' }}>
                                                        {tier.quantity_remaining} {formData.unit} <span style={{ fontWeight: 400, color: '#64748B', fontSize: '0.75rem' }}>/ {tier.quantity}</span>
                                                    </span>
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.72rem', color: '#64748B', margin: 0 }}>Buying Price (Rs.)</label>
                                                    <input
                                                        type="number"
                                                        value={tier.buying_price}
                                                        disabled
                                                        style={{
                                                            height: '32px',
                                                            background: '#E2E8F0',
                                                            color: '#475569',
                                                            border: '1px solid #CBD5E1',
                                                            cursor: 'not-allowed',
                                                            marginTop: '4px',
                                                            padding: '0 8px',
                                                            fontSize: '0.8rem',
                                                            width: '100%',
                                                            borderRadius: '8px'
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.72rem', color: '#16A34A', margin: 0, fontWeight: 600 }}>Selling Price (Rs.) *</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        required
                                                        value={tier.selling_price}
                                                        onChange={(e) => handleTierPriceChange(idx, e.target.value)}
                                                        style={{
                                                            height: '32px',
                                                            borderColor: '#16A34A',
                                                            marginTop: '4px',
                                                            padding: '0 8px',
                                                            fontSize: '0.8rem',
                                                            width: '100%',
                                                            borderRadius: '8px'
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="edit-inventory-split edit-inventory-full">
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
                            )}
                            <div className="form-group">
                                <label>Storage Location</label>
                                <input
                                    type="text" name="storage_location"
                                    value={formData.storage_location} onChange={handleChange}
                                    placeholder="e.g. Shelf A-1"
                                />
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
