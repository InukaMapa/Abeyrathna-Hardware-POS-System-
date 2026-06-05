import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import MenuList from '../../components/menu/MenuList';
import MenuModal from '../../components/menu/MenuModal';
import MenuFilters from '../../components/menu/MenuFilters';
import MenuStats from '../../components/menu/MenuStats';
import {
    fetchMenuItems,
    fetchMenuStats,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    fetchCategories,
    fetchInventoryItems,
    fetchInventoryCategories,
    createCategory,
    updateCategory,
    deleteCategory
} from '../../services/menuService';
import { AlertCircle, CheckCircle2, Loader } from 'lucide-react';
import '../../styles/menu.css';

const MenuManagementPage = ({ onNavigate }) => {
    // Data State
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [stats, setStats] = useState({
        totalItems: 0,
        active: 0,
        inactive: 0,
        bestSelling: 'N/A'
    });
    const [categories, setCategories] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [inventoryCategories, setInventoryCategories] = useState([]);

    // UI State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('All');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Toast State
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

    // Initial Load & Filter Changes
    useEffect(() => {
        loadData();
    }, [selectedCategory, selectedStatus]);

    // Local Search Logic (runs on top of backend data)
    useEffect(() => {
        let result = items;

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(item =>
                item.name.toLowerCase().includes(lowerQuery) ||
                (item.description && item.description.toLowerCase().includes(lowerQuery))
            );
        }
        setFilteredItems(result);
    }, [items, searchQuery]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Determine if we need to fetch global data separately (if filters are active)
            const isFiltering = selectedCategory !== 'all' || selectedStatus !== 'All';

            const [menuData, statsData, catsData, invData, invCatsData] = await Promise.all([
                fetchMenuItems(selectedCategory, selectedStatus),
                fetchMenuStats(),
                fetchCategories(),
                fetchInventoryItems(),
                fetchInventoryCategories()
            ]);

            // If filters are active, we need to fetch ALL items to calculate global stats
            // If no filters, menuData IS the global data
            let globalItems = menuData || [];
            if (isFiltering) {
                globalItems = await fetchMenuItems('all', 'All');
            }

            console.log("DEBUG: Fetched Product Items:", menuData);
            console.log("DEBUG: Stats calculation base:", globalItems.length, "items");

            // Calculate real stats from global items
            // User requested "Active" and "Inactive" counts
            const calculatedStats = {
                totalItems: globalItems.length,
                active: globalItems.filter(item => item.is_active).length,
                inactive: globalItems.filter(item => !item.is_active).length,
                bestSelling: statsData.bestSelling || 'N/A' // Keep backend value for best selling
            };

            setItems(menuData || []);
            setStats(calculatedStats);
            setCategories(catsData || []);
            setInventory(invData || []);
            setInventoryCategories(invCatsData || []);
        } catch (err) {
            console.error(err);
            setError("Failed to load product data. Please try again.");
            if (err.message.includes('Unauthorized')) {
                // onNavigate('login'); // Optional depending on auth flow
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (formData) => {
        setIsSubmitting(true);
        try {
            await createMenuItem(formData);
            showNotification('Product item created successfully!', 'success');
            setIsModalOpen(false);
            loadData();
        } catch (err) {
            showNotification('Failed to create item: ' + err.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async (formData) => {
        if (!editingItem) return;
        setIsSubmitting(true);
        try {
            await updateMenuItem(editingItem.id, formData);
            showNotification('Product item updated successfully!', 'success');
            setIsModalOpen(false);
            setEditingItem(null);
            loadData();
        } catch (err) {
            showNotification('Failed to update item: ' + err.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this item? This cannot be undone.")) return;

        try {
            await deleteMenuItem(id);
            showNotification('Item deleted successfully', 'success');
            setItems(prev => prev.filter(item => item.id !== id));
        } catch (err) {
            showNotification('Failed to delete item', 'error');
            loadData();
        }
    };

    // --- Category Management Handlers ---
    const handleCategoryCreate = async (data) => {
        try {
            await createCategory(data);
            showNotification('Category added successfully', 'success');
            // Refresh categories
            const cats = await fetchCategories();
            setCategories(cats);
        } catch (err) {
            throw err; // Let modal handle error display
        }
    };

    const handleCategoryUpdate = async (id, data) => {
        try {
            await updateCategory(id, data);
            showNotification('Category updated successfully', 'success');
            // Refresh categories
            const cats = await fetchCategories();
            setCategories(cats);
        } catch (err) {
            throw err;
        }
    };

    const handleCategoryDelete = async (id) => {
        try {
            await deleteCategory(id);
            showNotification('Category deleted successfully', 'success');
            // Refresh categories
            const cats = await fetchCategories();
            setCategories(cats);
        } catch (err) {
            throw err;
        }
    };


    const openEditModal = (item) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const openCreateModal = () => {
        setEditingItem(null);
        setIsModalOpen(true);
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
    };

    return (
        <DashboardLayout activePage="menu-management" onNavigate={onNavigate}>
            <div className="menu-management-container animate-fade-in custom-scrollbar">

                <div className="menu-header">
                    <div>
                        <h1 className="menu-title">Product Management</h1>
                        <p className="text-gray-400 text-sm mt-1">Manage your hardware products and inventory links</p>
                    </div>
                </div>

                {/* Stats */}
                <MenuStats stats={stats} />

                {/* Filters */}
                <MenuFilters
                    filters={{
                        search: searchQuery,
                        category: selectedCategory,
                        status: selectedStatus
                    }}
                    onSearchChange={setSearchQuery}
                    onFilterChange={(key, value) => {
                        if (key === 'category') setSelectedCategory(value);
                        if (key === 'status') setSelectedStatus(value);
                    }}
                    onRefresh={loadData}
                    onAddItem={openCreateModal}
                    categories={categories}
                    onCategoryChange={{
                        add: handleCategoryCreate,
                        edit: handleCategoryUpdate,
                        delete: handleCategoryDelete
                    }}
                />

                {/* Content */}
                {loading && items.length === 0 ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader className="animate-spin text-red-600" size={48} />
                    </div>
                ) : error ? (
                    <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-xl text-center my-4">
                        <AlertCircle className="mx-auto text-red-500 mb-2" size={32} />
                        <h3 className="text-lg font-bold text-red-100 mb-1">Error Loading Data</h3>
                        <p className="text-red-300 mb-4">{error}</p>
                        <button onClick={loadData} className="btn-secondary">Try Again</button>
                    </div>
                ) : (
                    <MenuList
                        items={filteredItems}
                        onEdit={openEditModal}
                        onDelete={handleDelete}
                    />
                )}

                {/* Modal */}
                <MenuModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={editingItem ? handleUpdate : handleCreate}
                    editingItem={editingItem}
                    categories={categories}
                    inventory={inventory}
                    inventoryCategories={inventoryCategories}
                />

                {/* Notification Toast */}
                {notification.show && (
                    <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-slide-in z-50 ${notification.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                        }`}>
                        {notification.type === 'error' ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
                        <span className="font-semibold">{notification.message}</span>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default MenuManagementPage;
