import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { PackagePlus, Save, Search, X, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../../config/api';
import '../../../styles/menu.css';

const ReceiveInventoryModal = ({ onClose, onSuccess, batches = [] }) => {
    const [items, setItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItemId, setSelectedItemId] = useState('');
    const [autoSelectedItemName, setAutoSelectedItemName] = useState('');
    const [loadingItems, setLoadingItems] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        batch_id: '',
        quantity: '',
        buying_price: '',
        selling_price: '',
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
        const fetchItems = async () => {
            setLoadingItems(true);
            try {
                const params = {};
                if (searchTerm.trim()) params.search = searchTerm.trim();

                const response = await axios.get(`${API_BASE_URL}/inventory`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                    params
                });

                const inventoryItems = response.data || [];
                setItems(inventoryItems);

                const searchValue = searchTerm.trim().toLowerCase();
                const exactBarcodeMatch = searchValue
                    ? inventoryItems.find(item => String(item.item_code || '').trim().toLowerCase() === searchValue)
                    : null;

                if (exactBarcodeMatch) {
                    setSelectedItemId(exactBarcodeMatch.id);
                    setAutoSelectedItemName(exactBarcodeMatch.ingredient_name || 'Selected item');
                } else if (selectedItemId && !inventoryItems.some(item => item.id === selectedItemId)) {
                    setSelectedItemId('');
                    setAutoSelectedItemName('');
                } else if (!searchValue) {
                    setAutoSelectedItemName('');
                }
            } catch (error) {
                console.error('Error searching inventory:', error);
            } finally {
                setLoadingItems(false);
            }
        };

        const timer = setTimeout(fetchItems, 250);
        return () => clearTimeout(timer);
    }, [searchTerm, selectedItemId]);

    const selectedItem = useMemo(
        () => items.find(item => item.id === selectedItemId) || null,
        [items, selectedItemId]
    );

    useEffect(() => {
        if (!selectedItem) return;

        setFormData(prev => ({
            ...prev,
            buying_price: selectedItem.buying_price || '',
            selling_price: selectedItem.selling_price || '',
            storage_location: selectedItem.storage_location || ''
        }));
    }, [selectedItem]);

    const activeBatches = batches.filter(batch => batch.calc_status !== 'COMPLETED' && batch.status !== 'COMPLETED');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setAutoSelectedItemName('');
    };

    const handleSearchKeyDown = (e) => {
        if (e.key !== 'Enter') return;

        e.preventDefault();
        const searchValue = searchTerm.trim().toLowerCase();
        const exactBarcodeMatch = searchValue
            ? items.find(item => String(item.item_code || '').trim().toLowerCase() === searchValue)
            : null;

        if (exactBarcodeMatch) {
            setSelectedItemId(exactBarcodeMatch.id);
            setAutoSelectedItemName(exactBarcodeMatch.ingredient_name || 'Selected item');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedItem) {
            alert('Please select an inventory item first.');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/inventory/${selectedItem.id}/receive`, {
                ...formData,
                method: 'SUPPLIER',
                admin_name: 'Admin'
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            onSuccess();
        } catch (error) {
            console.error('Error receiving stock:', error);
            alert(error.response?.data?.message || 'Failed to update inventory quantity.');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="add-inventory-overlay">
            <div className="add-inventory-modal animate-slide-up">
                <div className="add-inventory-header">
                    <div>
                        <PackagePlus size={17} />
                        <h2>Update Inventory Stock</h2>
                    </div>
                    <button title="Close" onClick={onClose} className="add-inventory-close">
                        <X size={16} />
                    </button>
                </div>

                <div className="add-inventory-content">
                    <div className="add-inventory-body custom-scrollbar">
                        <form id="receiveInventoryForm" onSubmit={handleSubmit} className="add-inventory-form">
                            <div className="add-inventory-grid">
                                <div className="add-inventory-full">
                                    <label>Search Existing Item *</label>
                                    <div className="add-inventory-input-icon">
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={handleSearchChange}
                                            onKeyDown={handleSearchKeyDown}
                                            placeholder="Search by barcode or item name"
                                        />
                                        <Search size={15} />
                                    </div>
                                    {autoSelectedItemName && (
                                        <p className="barcode-check-note barcode-available">
                                            Barcode matched. Selected item: {autoSelectedItemName}
                                        </p>
                                    )}
                                </div>

                                <div className="add-inventory-full">
                                    <label>Select Inventory Item *</label>
                                    <select
                                        required
                                        value={selectedItemId}
                                        onChange={(e) => setSelectedItemId(e.target.value)}
                                    >
                                        <option value="">{loadingItems ? 'Searching...' : '-- Select item --'}</option>
                                        {items.map(item => (
                                            <option key={item.id} value={item.id}>
                                                {item.ingredient_name} | {item.item_code || 'No barcode'} | {item.quantity} {item.unit}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {selectedItem && (
                                    <div className="add-inventory-full detail-metrics-grid">
                                        <div className="detail-metric">
                                            <div className="detail-metric-label">Available Quantity</div>
                                            <div className="detail-metric-value">{selectedItem.quantity} <span>{selectedItem.unit}</span></div>
                                        </div>
                                        <div className="detail-metric">
                                            <div className="detail-metric-label">Current Selling Price</div>
                                            <div className="detail-metric-value detail-price">
                                                Rs. {parseFloat(selectedItem.selling_price || 0).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="add-inventory-full add-inventory-batch">
                                    <label>Supplier Batch *</label>
                                    <select
                                        name="batch_id"
                                        required
                                        value={formData.batch_id}
                                        onChange={handleChange}
                                    >
                                        <option value="">-- Select supplier batch --</option>
                                        {activeBatches.map(batch => (
                                            <option key={batch.id} value={batch.id}>
                                                {batch.batch_number} | {batch.supplier_name} ({batch.batch_date || batch.date})
                                            </option>
                                        ))}
                                    </select>
                                    <p>Create a supplier batch first if this order is not listed.</p>
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
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label>Unit</label>
                                        <input
                                            type="text"
                                            value={selectedItem?.unit || '-'}
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
                        title="Update Inventory"
                        className="add-inventory-btn"
                    >
                        {loading ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                        Update Inventory
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ReceiveInventoryModal;
