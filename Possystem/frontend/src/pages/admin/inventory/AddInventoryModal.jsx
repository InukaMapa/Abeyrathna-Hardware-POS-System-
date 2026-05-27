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
        <div className="add-inventory-overlay">
            <div className="add-inventory-modal animate-slide-up">
                
                <div className="add-inventory-header">
                    <div>
                        <Type size={17} />
                        <h2>Add Inventory Item</h2>
                    </div>
                    <button title="Close" onClick={onClose} className="add-inventory-close">
                        <X size={16} />
                    </button>
                </div>

                <div className="add-inventory-content">
                    <div className="add-inventory-tabs">
                        <button
                            title="Manual Entry"
                            onClick={() => setShowReplacementPicker(false)}
                            className={`add-inventory-tab ${!showReplacementPicker ? 'active' : ''}`}
                        >
                            <Type size={15} /> Manual Entry
                        </button>
                        <button
                            title="Scan Bill"
                            onClick={onScanBillClick}
                            className="add-inventory-tab"
                        >
                            <ScanLine size={15} /> Scan Bill (AI)
                        </button>
                        <button
                            title="Replacement Items"
                            onClick={() => setShowReplacementPicker(true)}
                            className={`add-inventory-tab ${showReplacementPicker ? 'active' : ''}`}
                        >
                            <RefreshCw size={15} /> Replacement Items
                        </button>
                    </div>

                    {showReplacementPicker ? (
                        <div className="add-inventory-body animate-fade-in custom-scrollbar">
                            <h3>Select Authorized Replacement Batch</h3>
                            <div className="add-replacement-list">
                                {batches.filter(b => b.batch_type === 'REPLACEMENT' && (b.status !== 'COMPLETED') && (b.calc_status !== 'COMPLETED')).length > 0 ? (
                                    batches.filter(b => b.batch_type === 'REPLACEMENT' && (b.status !== 'COMPLETED') && (b.calc_status !== 'COMPLETED')).map(b => (
                                        <button
                                            title={`Select ${b.batch_number}`}
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
                                            className="add-replacement-card"
                                        >
                                            <div>
                                                <div>
                                                    <RefreshCw size={17} />
                                                </div>
                                                <div>
                                                    <p>{b.batch_number}</p>
                                                    <p>{b.supplier_returns?.inventory?.ingredient_name || 'N/A'}</p>
                                                    <p>{b.supplier_name} | {b.date}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <p>{b.supplier_returns?.quantity} Units</p>
                                                <p>Pending Stocking</p>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="add-replacement-empty">
                                        <RefreshCw size={24} />
                                        <p>No pending replacement batches found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="add-inventory-body custom-scrollbar">
                            <form id="inventoryForm" onSubmit={handleSubmit} className="add-inventory-form">
                                <div className="add-inventory-grid">
                                    <div>
                                        <label>Item Name *</label>
                                        <input
                                            type="text" required name="ingredient_name"
                                            value={formData.ingredient_name} onChange={handleChange}
                                            placeholder="e.g. Tomatoes"
                                        />
                                    </div>
                                    <div>
                                        <div className="add-inventory-label-row">
                                            <label>Item Code (Barcode)</label>
                                            <button
                                                title="Auto-generate item code"
                                                type="button"
                                                onClick={() => {
                                                    const generatedCode = 'HW' + Date.now().toString().slice(-6) + Math.floor(1000 + Math.random() * 9000);
                                                    setFormData(prev => ({ ...prev, item_code: generatedCode }));
                                                }}
                                                className="add-inventory-link-btn"
                                            >
                                                <RefreshCw size={13} /> Auto-Generate
                                            </button>
                                        </div>
                                        <div className="add-inventory-input-icon">
                                            <input
                                                type="text" name="item_code"
                                                value={formData.item_code} onChange={handleChange}
                                                placeholder="Auto-generated if empty"
                                            />
                                            <ScanLine size={15} />
                                        </div>
                                    </div>
                                    <div className="add-inventory-full">
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
                                    <div className="add-inventory-split add-inventory-full">
                                        <div>
                                            <label>Quantity *</label>
                                            <input
                                                type="number" step="0.01" required name="quantity"
                                                value={formData.quantity} onChange={handleChange}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div>
                                            <label>Unit</label>
                                            <select
                                                name="unit" value={formData.unit} onChange={handleChange}
                                            >
                                                {units.map(u => <option key={u} value={u}>{u}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="add-inventory-split add-inventory-full">
                                        <div>
                                            <label>Buying Price (Rs.) *</label>
                                            <input
                                                type="number" step="0.01" required name="buying_price"
                                                value={formData.buying_price} onChange={handleChange}
                                                placeholder="Cost Price"
                                            />
                                        </div>
                                        <div>
                                            <label>Selling Price (Rs.) *</label>
                                            <input
                                                type="number" step="0.01" required name="selling_price"
                                                value={formData.selling_price} onChange={handleChange}
                                                placeholder="Retail Price"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label>Storage Location</label>
                                        <input
                                            type="text" name="storage_location"
                                            value={formData.storage_location} onChange={handleChange}
                                            placeholder="e.g. Shelf A-1"
                                        />
                                    </div>
                                    <div>
                                        <label>Expiry Date (Optional)</label>
                                        <input
                                            type="date" name="expiry_date"
                                            value={formData.expiry_date} onChange={handleChange}
                                        />
                                    </div>
                                    
                                    <div className="add-inventory-full add-inventory-batch">
                                        <label>Select Inventory Batch *</label>
                                        <select
                                            name="batch_id"
                                            required
                                            value={formData.batch_id}
                                            onChange={handleChange}
                                        >
                                            <option value="">-- Select Active Batch --</option>
                                            {batches.map(b => (
                                                <option key={b.id} value={b.id}>
                                                    {b.batch_number} {b.batch_type === 'REPLACEMENT' ? '[REPLACEMENT]' : ''} | {b.supplier_name} ({b.date})
                                                </option>
                                            ))}
                                        </select>
                                        <p>Items must be linked to a created procurement batch.</p>
                                    </div>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                <div className="add-inventory-actions">
                    <button title="Cancel" onClick={onClose} className="add-inventory-btn">
                        Cancel
                    </button>
                    {!showReplacementPicker && (
                        <button
                            type="submit" form="inventoryForm"
                            disabled={loading}
                            title="Save Inventory"
                            className="add-inventory-btn"
                        >
                            {loading ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                            Save Inventory
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddInventoryModal;
