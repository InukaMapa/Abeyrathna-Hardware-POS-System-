import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PackagePlus, Save, X, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../../config/api';
import '../../../styles/menu.css';

const ReceiveInventoryModal = ({ onClose, onSuccess, initialItem, initialQuantity, isReplacement = false, returnId = null }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        quantity: '',
        buying_price: '',
        selling_price: '',
        payment_for_supplier: '',
        storage_location: '',
        expiry_date: '',
        notes: ''
    });

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    useEffect(() => {
        if (!initialItem) return;

        setFormData(prev => ({
            ...prev,
            quantity: isReplacement ? (initialQuantity || '') : (prev.quantity || ''),
            buying_price: initialItem.buying_price !== undefined && initialItem.buying_price !== null ? initialItem.buying_price : '',
            selling_price: initialItem.selling_price !== undefined && initialItem.selling_price !== null ? initialItem.selling_price : '',
            storage_location: initialItem.storage_location || '',
            payment_for_supplier: isReplacement ? '0' : (prev.payment_for_supplier || '')
        }));
    }, [initialItem, initialQuantity, isReplacement]);

    // Active batches logic removed

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        if (!initialItem) {
            alert('Please select a product first.');
            return;
        }

        setLoading(true);
        try {
            let performedBy = 'Admin';
            try {
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    const parsedUser = JSON.parse(storedUser);
                    performedBy = parsedUser.username || parsedUser.name || (parsedUser.role === 'CASHIER' ? 'Cashier' : 'Admin');
                }
            } catch (e) {}

            const payload = {
                ...formData,
                method: isReplacement ? 'REPLACEMENT' : 'SUPPLIER',
                admin_name: performedBy,
                is_replacement: isReplacement,
                return_id: returnId
            };

            await axios.post(`${API_BASE_URL}/inventory/${initialItem.id}/receive`, payload, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            onSuccess();
        } catch (error) {
            console.error('Error receiving stock:', error);
            alert(error.response?.data?.message || 'Failed to update product quantity.');
        } finally {
            setLoading(false);
        }
    };

    if (!initialItem) return null;

    return createPortal(
        <div className="add-inventory-overlay">
            <div className="add-inventory-modal animate-slide-up">
                <div className="add-inventory-header">
                    <div>
                        <PackagePlus size={17} />
                        <h2>Add Stock: {initialItem.ingredient_name}</h2>
                    </div>
                    <button title="Close" onClick={onClose} className="add-inventory-close">
                        <X size={16} />
                    </button>
                </div>

                <div className="add-inventory-content">
                    <div className="add-inventory-body custom-scrollbar">
                        <form id="receiveInventoryForm" onSubmit={handleSubmit} className="add-inventory-form">
                            <div className="add-inventory-grid">
                                <div className="add-inventory-full detail-metrics-grid">
                                    <div className="detail-metric">
                                        <div className="detail-metric-label">Available Quantity</div>
                                        <div className="detail-metric-value">{initialItem.quantity} <span>{initialItem.unit}</span></div>
                                    </div>
                                    <div className="detail-metric">
                                        <div className="detail-metric-label">Current Selling Price</div>
                                        <div className="detail-metric-value detail-price">
                                            Rs. {parseFloat(initialItem.selling_price || 0).toFixed(2)}
                                        </div>
                                    </div>
                                </div>

                                <div className="add-inventory-split add-inventory-full">
                                    <div>
                                        <label>Quantity to Add *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            required
                                            name="quantity"
                                            value={formData.quantity}
                                            onChange={handleChange}
                                            disabled={isReplacement}
                                            className={isReplacement ? 'bg-gray-100 cursor-not-allowed opacity-80' : ''}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label>Unit</label>
                                        <input
                                            type="text"
                                            value={initialItem.unit || '-'}
                                            disabled
                                        />
                                    </div>
                                </div>

                                <div className="add-inventory-split add-inventory-full">
                                    <div>
                                        <label>Buying Price (Rs.) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            required
                                            name="buying_price"
                                            value={formData.buying_price}
                                            onChange={handleChange}
                                            disabled={isReplacement}
                                            className={isReplacement ? 'bg-gray-100 cursor-not-allowed opacity-80' : ''}
                                            placeholder="Cost for this order"
                                        />
                                    </div>
                                    <div>
                                        <label>Selling Price (Rs.) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            required
                                            name="selling_price"
                                            value={formData.selling_price}
                                            onChange={handleChange}
                                            placeholder="Retail price"
                                        />
                                    </div>
                                </div>

                                <div className="add-inventory-full">
                                    <label>Payment for Supplier (Rs.)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        name="payment_for_supplier"
                                        value={isReplacement ? '' : formData.payment_for_supplier}
                                        onChange={handleChange}
                                        disabled={isReplacement}
                                        className={isReplacement ? 'bg-gray-100 cursor-not-allowed opacity-80' : ''}
                                        placeholder={isReplacement ? 'Disabled for replacement item' : 'First payment for this stock (Optional)'}
                                    />
                                </div>

                                <div>
                                    <label>Storage Location</label>
                                    <input
                                        type="text"
                                        name="storage_location"
                                        value={formData.storage_location}
                                        onChange={handleChange}
                                        placeholder="e.g. Storeroom A"
                                    />
                                </div>

                                <div>
                                    <label>Expiry Date (Optional)</label>
                                    <input
                                        type="date"
                                        name="expiry_date"
                                        value={formData.expiry_date}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div className="add-inventory-full">
                                    <label>Notes</label>
                                    <input
                                        type="text"
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleChange}
                                        placeholder="Invoice number or order note"
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
                    <button
                        type="submit"
                        form="receiveInventoryForm"
                        disabled={loading}
                        title="Add Stock"
                        className="add-inventory-btn"
                    >
                        {loading ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                        Add Stock
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ReceiveInventoryModal;
