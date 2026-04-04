import React, { useState } from 'react';
import { Settings, Plus, RefreshCw, Search } from 'lucide-react'; // Added explicit imports
import CategoryManagerModal from './CategoryManagerModal';
// Since frontend service might not have them yet, we assume they need to be passed or added. 
// Wait, I need to check frontend service first. For now, I will assume props or add logic.
// Actually, better to pass these handlers from parent or implement in service.
// Let's implement basics here and assume parent handles refresh or we add service calls.
// To be safe, I'll stick to props for handlers if possible, but the request implies "working project", so I should probably update the frontend service too.
// Let's check frontend service in next step. For now, I'll structure the UI.

const MenuFilters = ({ filters, onFilterChange, onSearchChange, onRefresh, onAddItem, categories = [], onCategoryChange }) => {
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    // Helper to handle category selection
    const handleCategoryClick = (categoryId) => {
        onFilterChange('category', categoryId);
    };

    return (
        <div className="menu-filters-container">
            {/* Top Bar: Search and Actions */}
            <div className="menu-top-bar">
                <div className="search-wrapper">
                    <Search className="search-icon" size={20} />
                    <input
                        type="text"
                        placeholder="Search menu items..."
                        value={filters.search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="menu-search-input"
                    />
                </div>

                <div className="actions-group">
                    <select
                        value={filters.status}
                        onChange={(e) => onFilterChange('status', e.target.value)}
                        className="filter-select"
                    >
                        <option value="All">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>

                    <button className="btn-icon" onClick={onRefresh} title="Refresh">
                        <RefreshCw size={20} />
                    </button>

                    <button className="btn-primary" onClick={onAddItem}>
                        <Plus size={18} />
                        <span>Add Item</span>
                    </button>
                </div>
            </div>

            {/* Category Scroll Bar */}
            <div className="category-scroll-wrapper">
                <div className="category-header">
                    <span className="text-gray-400 text-sm font-medium uppercase tracking-wider">Categories</span>
                    <button
                        className="category-edit-btn"
                        onClick={() => setIsCategoryModalOpen(true)}
                        title="Manage Categories"
                    >
                        <Settings size={16} />
                        <span>Edit Categories</span>
                    </button>
                </div>

                <div className="category-scroll-container">
                    <button
                        className={`category-pill ${filters.category === 'all' ? 'active' : ''}`}
                        onClick={() => handleCategoryClick('all')}
                    >
                        All
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            className={`category-pill ${filters.category === cat.id ? 'active' : ''}`}
                            onClick={() => handleCategoryClick(cat.id)}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            <CategoryManagerModal
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                categories={categories}
                onAdd={onCategoryChange?.add}
                onEdit={onCategoryChange?.edit}
                onDelete={onCategoryChange?.delete}
            />
        </div>
    );
};

export default MenuFilters;
