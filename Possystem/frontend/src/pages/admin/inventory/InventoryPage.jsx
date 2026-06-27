import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, PackagePlus, Edit, FileText, AlertTriangle, AlertCircle, Loader, Settings, Package, Trash2, CheckCircle, X } from 'lucide-react';
import axios from 'axios';
import AddInventoryModal from './AddInventoryModal';
import ReceiveInventoryModal from './ReceiveInventoryModal';
import EditInventoryModal from './EditInventoryModal';
import CategoryManagerModal from './CategoryManagerModal';
import ScanBillModal from './ScanBillModal';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { API_BASE_URL } from '../../../config/api';
import '../../../styles/menu.css';

const InventoryPage = ({ onNavigate }) => {
    const [inventory, setInventory] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [receivingItem, setReceivingItem] = useState(null);
    const [showScanModal, setShowScanModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [deleteModal, setDeleteModal] = useState({
        show: false,
        item: null,
        title: '',
        message: '',
        type: 'confirm'
    });
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchCategories = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/inventory/categories`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCategories(response.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    // Initial data fetch
    useEffect(() => {
        fetchInventory();
        fetchCategories();
    }, []);

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = {};
            if (searchTerm) params.search = searchTerm;
            if (filterCategory !== 'All') params.category = filterCategory;
            if (filterStatus !== 'All') params.status = filterStatus;

            const response = await axios.get(`${API_BASE_URL}/inventory`, {
                headers: { Authorization: `Bearer ${token}` },
                params
            });
            setInventory(response.data);
        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = async (item) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/inventory/${item.id}/validate-delete`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const { canDelete, reason } = response.data;
            
            if (canDelete) {
                setDeleteModal({
                    show: true,
                    item,
                    title: 'Delete Product',
                    message: 'Are you sure you want to permanently delete this product? This action cannot be undone.',
                    type: 'confirm'
                });
            } else {
                let message = '';
                let title = '';
                if (reason === 'all_failed') {
                    title = 'Cannot Delete Product';
                    message = 'This product cannot be deleted because inventory is still available, there are outstanding supplier payments, and it has associated supplier returns.';
                } else if (reason === 'both_failed') {
                    title = 'Cannot Delete Product';
                    message = 'This product cannot be deleted because inventory is still available and there are outstanding supplier payments. Set inventory to 0 and clear all payments before deleting.';
                } else if (reason === 'stock_and_returns') {
                    title = 'Cannot Delete Product';
                    message = 'This product cannot be deleted because there is still inventory in stock and it has associated supplier returns.';
                } else if (reason === 'payments_and_returns') {
                    title = 'Cannot Delete Product';
                    message = 'This product cannot be deleted because there are outstanding supplier payments and it has associated supplier returns.';
                } else if (reason === 'stock_exists') {
                    title = 'Stock Exists';
                    message = 'This product cannot be deleted because there is still inventory in stock. Reduce the inventory quantity to 0 before deleting.';
                } else if (reason === 'pending_payments') {
                    title = 'Pending Supplier Payments';
                    message = 'This product cannot be deleted because there are outstanding supplier payments associated with it. Clear all supplier payments before deleting.';
                } else if (reason === 'has_returns') {
                    title = 'Return History Exists';
                    message = 'This product cannot be deleted because it has associated supplier returns. Products with return history cannot be permanently deleted.';
                } else {
                    title = 'Validation Error';
                    message = 'This product cannot be deleted because it does not meet the deletion requirements.';
                }
                
                setDeleteModal({
                    show: true,
                    item: null,
                    title,
                    message,
                    type: 'warning'
                });
            }
        } catch (error) {
            console.error('Error validating delete:', error);
            setDeleteModal({
                show: true,
                item: null,
                title: 'Error',
                message: 'Unable to delete the product. Please try again later.',
                type: 'warning'
            });
        }
    };

    const handleConfirmDelete = async (id) => {
        setDeleteLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_BASE_URL}/inventory/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Remove the product from the list immediately without manual refresh
            setInventory(prev => prev.filter(item => item.id !== id));
            
            setDeleteModal({
                show: true,
                item: null,
                title: 'Success',
                message: 'Product deleted successfully.',
                type: 'success'
            });
        } catch (error) {
            console.error('Error deleting item:', error);
            const errorMsg = error.response?.data?.message || 'Unable to delete the product. Please try again later.';
            setDeleteModal({
                show: true,
                item: null,
                title: 'Error',
                message: errorMsg,
                type: 'warning'
            });
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleViewDetails = (id) => {
        onNavigate('inventory-detail', { id });
    };

    const handleEdit = (item) => {
        setEditingItem(item);
    };

    const renderPriceTiers = (item) => {
        const tiers = item.stock_price_tiers || [];
        if (tiers.length === 0) {
            return (
                <div className="inventory-price-card single">
                    <span>Selling Price</span>
                    <strong>Rs. {parseFloat(item.selling_price || 0).toFixed(2)}</strong>
                </div>
            );
        }

        return (
            <div className="inventory-price-card">
                {tiers.slice(0, 2).map((tier, index) => (
                    <div key={`${tier.selling_price}-${index}`} className="inventory-price-tier">
                        <span>
                            {parseFloat(tier.quantity_remaining || 0).toLocaleString()} {item.unit}
                        </span>
                        <strong>Rs. {parseFloat(tier.selling_price || 0).toFixed(2)}</strong>
                    </div>
                ))}
                {tiers.length > 2 && (
                    <div className="inventory-price-more">+ {tiers.length - 2} more price levels</div>
                )}
            </div>
        );
    };

    return (
        <DashboardLayout activePage="inventory" onNavigate={onNavigate}>
            <div className="menu-management-container inventory-page animate-fade-in custom-scrollbar">

                {/* STICKY HEADER & FILTERS */}
                <div className="inventory-sticky-panel sticky top-[-28px] z-[50]">
                    {/* Header */}
                    <div className="menu-header inventory-header !mb-6">
                        <div>
                            <h1 className="menu-title inventory-title">Products Management</h1>
                            <p className="inventory-subtitle">Manage products, track stock, and handle reordering.</p>
                        </div>
                        <div className="inventory-toolbar">
                            <button
                                title="Manage Categories"
                                onClick={() => setShowCategoryModal(true)}
                                className="inventory-outline-btn"
                            >
                                <Settings size={15} /> Manage Categories
                            </button>
                        </div>
                    </div>

                    {/* Search & Filters */}
                    <div className="menu-filters-container inventory-filters !mb-0">
                        <div className="menu-top-bar">
                            <div className="search-wrapper inventory-search">
                                <Search className="search-icon w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Search by name or code..."
                                    className="menu-search-input"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="inventory-filter-group">
                                <select
                                    className="filter-select inventory-select"
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                >
                                    <option value="All">All Categories</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>

                                <select
                                    className="filter-select inventory-select"
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                >
                                    <option value="All">All Status</option>
                                    <option value="In Stock">In Stock</option>
                                    <option value="Low Stock">Low Stock</option>
                                    <option value="Out of Stock">Out of Stock</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Products Table */}
                <div className="inventory-table-card">
                    <div className="overflow-x-auto">
                        <table className="inventory-table w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="p-4 font-semibold">Supplier</th>
                                    <th className="p-4 font-semibold">Item Name</th>
                                    <th className="p-4 font-semibold">Code</th>
                                    <th className="p-4 font-semibold">Category</th>
                                    <th className="p-4 font-semibold">Quantity</th>
                                    <th className="p-4 font-semibold">Status</th>
                                    <th className="p-4 font-semibold text-right">Price</th>
                                    <th className="p-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="8" className="p-12 text-center text-[#A0A0A0]"><Loader className="w-6 h-6 animate-spin mx-auto mb-2" />Loading products...</td></tr>
                                ) : inventory.length === 0 ? (
                                    <tr><td colSpan="8" className="p-12 text-center text-[#A0A0A0]"><Package className="w-8 h-8 mx-auto mb-2 opacity-50" />No items found.</td></tr>
                                ) : (
                                    inventory.map((item) => (
                                        <tr key={item.id}>
                                            <td className="p-4">
                                                <div className="inventory-cell-text">
                                                    {item.suppliers?.supplier_name || (
                                                        <span className="text-[#666] italic">No Supplier</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="inventory-item-name">{item.ingredient_name}</div>
                                                <div className="inventory-item-unit">{item.unit}</div>
                                            </td>
                                            <td className="p-4 inventory-code">{item.item_code || '-'}</td>
                                            <td className="p-4">
                                                <span className="inventory-category-pill">
                                                    {item.category || 'Uncategorized'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="inventory-quantity">
                                                    {item.quantity} <span>{item.unit}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold border flex items-center w-fit gap-1
                                                    ${item.status === 'Out of Stock' ? 'bg-[#ff5252]/10 text-[#ff5252] border-[#ff5252]/30' :
                                                        item.status === 'Low Stock' ? 'bg-[#ffb74d]/10 text-[#ffb74d] border-[#ffb74d]/30' :
                                                            'bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/30'}`}
                                                >
                                                    {item.status === 'Low Stock' && <AlertTriangle className="w-3 h-3" />}
                                                    {item.status === 'Out of Stock' && <AlertCircle className="w-3 h-3" />}
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right inventory-price">
                                                {renderPriceTiers(item)}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            if (item.supplier_id) {
                                                                onNavigate('supplier', {
                                                                    supplierParams: {
                                                                        supplierId: item.supplier_id,
                                                                        activeTab: 'Products'
                                                                    }
                                                                });
                                                            } else {
                                                                alert('This product does not have an assigned supplier. Please edit the product to assign a supplier first.');
                                                            }
                                                        }}
                                                        className="inventory-action-btn"
                                                        title="Receive Stock"
                                                    >
                                                        <PackagePlus />
                                                    </button>
                                                    <button
                                                        onClick={() => handleViewDetails(item.id)}
                                                        className="inventory-action-btn"
                                                        title="View Details"
                                                    >
                                                        <FileText />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="inventory-action-btn"
                                                        title="Update Product"
                                                    >
                                                        <Edit />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(item)}
                                                        className="inventory-action-btn inventory-action-danger"
                                                        title="Delete Product"
                                                    >
                                                        <Trash2 />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modals */}
                {showAddModal && (
                    <AddInventoryModal
                        onClose={() => setShowAddModal(false)}
                        categories={categories}
                        onSuccess={() => {
                            setShowAddModal(false);
                            fetchInventory();
                        }}
                    />
                )}
                {showScanModal && (
                    <ScanBillModal
                        onClose={() => setShowScanModal(false)}
                        onSuccess={() => {
                            setShowScanModal(false);
                            fetchInventory();
                        }}
                    />
                )}
                {receivingItem && (
                    <ReceiveInventoryModal
                        initialItem={receivingItem}
                        onClose={() => setReceivingItem(null)}
                        onSuccess={() => {
                            setReceivingItem(null);
                            fetchInventory();
                        }}
                    />
                )}
                {showCategoryModal && (
                    <CategoryManagerModal
                        isOpen={showCategoryModal}
                        onClose={() => setShowCategoryModal(false)}
                        categories={categories}
                        onCategoryChange={fetchCategories}
                    />
                )}
                {editingItem && (
                    <EditInventoryModal
                        initialData={editingItem}
                        onClose={() => setEditingItem(null)}
                        categories={categories}
                        onSuccess={() => {
                            setEditingItem(null);
                            fetchInventory();
                        }}
                    />
                )}

                {deleteModal.show && createPortal(
                    <div className="delete-product-overlay">
                        <div className="delete-product-modal">
                            <div className={`delete-product-header ${deleteModal.type}-header`}>
                                <h3 className={deleteModal.type === 'warning' ? 'warning-title' : deleteModal.type === 'success' ? 'success-title' : ''}>
                                    {deleteModal.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                                    {deleteModal.type === 'success' && <CheckCircle className="w-5 h-5" />}
                                    {deleteModal.type === 'confirm' && <Trash2 className="w-5 h-5" />}
                                    {deleteModal.title}
                                </h3>
                                <button 
                                    onClick={() => setDeleteModal({ show: false, item: null })}
                                    className="delete-product-close"
                                    title="Close"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="delete-product-body">
                                <p>{deleteModal.message}</p>
                            </div>
                            <div className="delete-product-actions">
                                {deleteModal.type === 'confirm' ? (
                                    <>
                                        <button 
                                            onClick={() => setDeleteModal({ show: false, item: null })}
                                            className="delete-product-btn cancel"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={() => handleConfirmDelete(deleteModal.item.id)}
                                            className="delete-product-btn confirm-delete"
                                            disabled={deleteLoading}
                                        >
                                            {deleteLoading ? <Loader className="w-4 h-4 animate-spin" /> : 'Delete'}
                                        </button>
                                    </>
                                ) : (
                                    <button 
                                        onClick={() => setDeleteModal({ show: false, item: null })}
                                        className={`delete-product-btn ${deleteModal.type === 'success' ? 'ok-success-btn' : 'ok-btn'}`}
                                    >
                                        OK
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </DashboardLayout>
    );
};

export default InventoryPage;
