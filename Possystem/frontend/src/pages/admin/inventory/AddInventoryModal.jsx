import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, ScanLine, Type, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../../config/api';
import '../../../styles/menu.css';
import { getSuppliers } from '../../../services/supplierService';

const AddInventoryModal = ({ onClose, onSuccess, onScanBillClick, categories = [], initialSupplierId }) => {
    const [formData, setFormData] = useState({
        ingredient_name: '',
        item_code: '',
        category: categories.length > 0 ? categories[0].name : '', // Default to first category
        quantity: '',
        unit: 'kg',
        reorder_level: '10',
        batch_id: '',
        buying_price: '',
        selling_price: '',
        payment_for_supplier: '',
        storage_location: '',
        expiry_date: '',
        supplier_id: initialSupplierId || ''
    });
    const [suppliers, setSuppliers] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const [barcodeCheck, setBarcodeCheck] = useState({
        loading: false,
        existingItem: null,
        message: ''
    });

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
        const fetchAllProducts = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API_BASE_URL}/inventory`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setAllProducts(response.data || []);
            } catch (error) {
                console.error('Error fetching inventory products:', error);
            }
        };
        fetchAllProducts();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (categories.length > 0 && !formData.category) {
            setFormData(prev => ({ ...prev, category: categories[0].name }));
        }
    }, [categories]);

    useEffect(() => {
        const barcode = String(formData.item_code || '').trim();

        if (!barcode) {
            setBarcodeCheck({ loading: false, existingItem: null, message: '' });
            return undefined;
        }

        setBarcodeCheck(prev => ({ ...prev, loading: true, message: '' }));

        const timeoutId = setTimeout(async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API_BASE_URL}/inventory`, {
                    params: { search: barcode },
                    headers: { Authorization: `Bearer ${token}` }
                });
                const existingItem = (response.data || []).find(item =>
                    String(item.item_code || '').trim().toLowerCase() === barcode.toLowerCase()
                );

                setBarcodeCheck({
                    loading: false,
                    existingItem: existingItem || null,
                    message: existingItem
                        ? `This barcode is already assigned to ${existingItem.ingredient_name}.`
                        : 'Barcode is available.'
                });
            } catch (error) {
                console.error('Barcode duplicate check failed:', error);
                setBarcodeCheck({
                    loading: false,
                    existingItem: null,
                    message: 'Could not verify barcode right now.'
                });
            }
        }, 350);

        return () => clearTimeout(timeoutId);
    }, [formData.item_code]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSupplierChange = (e) => {
        const selectedId = e.target.value;
        setFormData(prev => ({
            ...prev,
            supplier_id: selectedId,
            batch_id: '' // Reset selected batch
        }));
        
        setIsOpen(false);
        
        const matchingProducts = allProducts.filter(p => p.supplier_id === selectedId);
        if (matchingProducts.length === 1) {
            const p = matchingProducts[0];
            setFormData(prev => ({
                ...prev,
                ingredient_name: p.ingredient_name || '',
                item_code: p.item_code || '',
                category: p.category || (categories.length > 0 ? categories[0].name : ''),
                unit: p.unit || 'kg',
                reorder_level: p.reorder_level || '10',
                buying_price: p.buying_price || '',
                selling_price: p.selling_price || '',
                storage_location: p.storage_location || ''
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                ingredient_name: '',
                item_code: '',
                category: categories.length > 0 ? categories[0].name : '',
                unit: 'kg',
                reorder_level: '10',
                buying_price: '',
                selling_price: '',
                storage_location: '',
                expiry_date: ''
            }));
        }
    };

    const supplierProducts = formData.supplier_id
        ? allProducts.filter(p => p.supplier_id === formData.supplier_id)
        : [];
        
    const filteredProducts = supplierProducts.filter(p =>
        p.ingredient_name.toLowerCase().includes((formData.ingredient_name || '').toLowerCase()) ||
        (p.item_code && p.item_code.toLowerCase().includes((formData.ingredient_name || '').toLowerCase()))
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        if (barcodeCheck.existingItem) {
            alert(`This barcode already exists for ${barcodeCheck.existingItem.ingredient_name}. Please use a different barcode or receive stock for the existing item.`);
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const { batch_id, supplier_info, expiry_date, ...rest } = formData;
            const payload = {
                ...rest,
                method: 'MANUAL',
                admin_name: 'Admin'
            };

            await axios.post(`${API_BASE_URL}/inventory`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            onSuccess();
        } catch (error) {
            console.error('Error adding inventory:', error);
            const errMsg = error?.response?.data?.message || 'Failed to add product. Code or Name might already exist.';
            alert(errMsg);
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="add-inventory-overlay">
            <div className="add-inventory-modal animate-slide-up">
                
                <div className="add-inventory-header">
                    <div>
                        <Type size={17} />
                        <h2>Add Product</h2>
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
                            className="add-inventory-tab active"
                        >
                            <Type size={15} /> Manual Entry
                        </button>
                        {onScanBillClick && (
                            <button
                                title="Scan Bill"
                                onClick={onScanBillClick}
                                className="add-inventory-tab"
                            >
                                <ScanLine size={15} /> Scan Bill (AI)
                            </button>
                        )}
                        
                    </div>

                        <div className="add-inventory-body custom-scrollbar">
                            <form id="inventoryForm" onSubmit={handleSubmit} className="add-inventory-form">
                                <div className="add-inventory-grid">
                                    <div>
                                        <label>Supplier Name *</label>
                                        <select
                                            name="supplier_id"
                                            required
                                            disabled={!!initialSupplierId}
                                            value={formData.supplier_id}
                                            onChange={handleSupplierChange}
                                        >
                                            <option value="">-- Select Supplier --</option>
                                            {suppliers.map(s => (
                                                <option key={s.id} value={s.id}>
                                                    {s.supplier_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div ref={dropdownRef} className="supplier-product-container" style={{ position: 'relative' }}>
                                        <label>Item Name *</label>
                                        <input
                                            type="text"
                                            required
                                            name="ingredient_name"
                                            value={formData.ingredient_name}
                                            onChange={(e) => {
                                                handleChange(e);
                                                if (formData.supplier_id) {
                                                    setIsOpen(true);
                                                }
                                            }}
                                            onFocus={() => {
                                                if (formData.supplier_id) {
                                                    setIsOpen(true);
                                                }
                                            }}
                                            placeholder={
                                                !formData.supplier_id
                                                    ? "Item Name"
                                                    : supplierProducts.length === 0
                                                        ? "No products available for this supplier"
                                                        : "Item Name"
                                            }
                                        />
                                        {isOpen && formData.supplier_id && supplierProducts.length > 0 && (
                                            <div className="custom-dropdown-list animate-fade-in" style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                right: 0,
                                                backgroundColor: '#ffffff',
                                                border: '1px solid #D7E7DC',
                                                borderRadius: '8px',
                                                maxHeight: '200px',
                                                overflowY: 'auto',
                                                zIndex: 1000,
                                                boxShadow: '0 8px 24px rgba(22, 101, 52, 0.08)'
                                            }}>
                                                {filteredProducts.map(p => (
                                                    <div
                                                        key={p.id}
                                                        className="dropdown-item"
                                                        style={{
                                                            padding: '10px 12px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.84rem',
                                                            borderBottom: '1px solid #EBF5EE',
                                                            color: '#1E293B'
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#F0FDF4'}
                                                        onMouseLeave={(e) => e.target.style.backgroundColor = '#ffffff'}
                                                        onClick={() => {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                ingredient_name: p.ingredient_name || '',
                                                                item_code: p.item_code || '',
                                                                category: p.category || (categories.length > 0 ? categories[0].name : ''),
                                                                unit: p.unit || 'kg',
                                                                reorder_level: p.reorder_level || '10',
                                                                buying_price: p.buying_price || '',
                                                                selling_price: p.selling_price || '',
                                                                storage_location: p.storage_location || ''
                                                            }));
                                                            setIsOpen(false);
                                                        }}
                                                    >
                                                        {p.ingredient_name} {p.item_code ? `(${p.item_code})` : ''}
                                                    </div>
                                                ))}
                                                {filteredProducts.length === 0 && (
                                                    <div style={{ padding: '10px 12px', color: '#64748B', fontSize: '0.84rem', fontStyle: 'italic' }}>
                                                        No matching products.
                                                    </div>
                                                )}
                                            </div>
                                        )}
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
                                                className={barcodeCheck.existingItem ? 'barcode-duplicate-input' : ''}
                                            />
                                            <ScanLine size={15} />
                                        </div>
                                        {formData.item_code && (
                                            <div className={`barcode-check-note ${barcodeCheck.existingItem ? 'duplicate' : barcodeCheck.message ? 'available' : ''}`}>
                                                {barcodeCheck.loading ? (
                                                    <span>Checking barcode...</span>
                                                ) : barcodeCheck.existingItem ? (
                                                    <>
                                                        <strong>Already have this barcode</strong>
                                                        <span>
                                                            {barcodeCheck.existingItem.ingredient_name}
                                                            {barcodeCheck.existingItem.storage_location ? ` | Location: ${barcodeCheck.existingItem.storage_location}` : ''}
                                                            {barcodeCheck.existingItem.quantity !== undefined ? ` | Stock: ${barcodeCheck.existingItem.quantity} ${barcodeCheck.existingItem.unit || ''}` : ''}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span>{barcodeCheck.message}</span>
                                                )}
                                            </div>
                                        )}
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
                                    <div>
                                        <label>Low Product Level</label>
                                        <input
                                            type="number" step="0.01" min="0" name="reorder_level"
                                            value={formData.reorder_level} onChange={handleChange}
                                            placeholder="Low Product Level"
                                        />
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
                                    <div className="add-inventory-full">
                                        <label>Payment for Supplier (Rs.)</label>
                                        <input
                                            type="number" step="0.01" min="0" name="payment_for_supplier"
                                            value={formData.payment_for_supplier} onChange={handleChange}
                                            placeholder="First payment for this product (Optional)"
                                        />
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
                                    
                                    
                                </div>
                            </form>
                        </div>
                </div>

                <div className="add-inventory-actions">
                    <button title="Cancel" onClick={onClose} className="add-inventory-btn">
                        Cancel
                    </button>
                    {!showReplacementPicker && (
                        <button
                            type="submit" form="inventoryForm"
                            disabled={loading || Boolean(barcodeCheck.existingItem)}
                            title="Save Product"
                            className="add-inventory-btn"
                        >
                            {loading ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                            Save Product
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AddInventoryModal;
