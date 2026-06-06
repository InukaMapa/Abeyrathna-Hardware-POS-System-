import React, { useEffect,  useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Tag } from 'lucide-react';
import { Loader } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../../config/api';
import '../../../styles/menu.css'; // Reusing styles

const CategoryManagerModal = ({ isOpen, onClose, categories, onCategoryChange }) => {
    const [newCategory, setNewCategory] = useState('');

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newCategory.trim()) return;

        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE_URL}/inventory/categories`,
                { name: newCategory },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setNewCategory('');
            onCategoryChange(); // Refresh parent
        } catch (err) {
            console.error('Error adding category:', err);
            setError(err.response?.data?.message || 'Failed to add category');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this category?')) return;

        // Optimistic update prevention usually requires checking usage, but for now simple delete
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_BASE_URL}/inventory/categories/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onCategoryChange();
        } catch (err) {
            console.error('Error deleting category:', err);
            setError('Failed to delete category');
        }
    };

    return createPortal((
        <div className="inventory-category-overlay">
            <div className="inventory-category-modal animate-slide-up">
                
                <div className="inventory-category-header">
                    <div>
                        <Tag size={17} />
                        <h2>Manage Categories</h2>
                    </div>
                    <button title="Close" onClick={onClose} className="inventory-category-close">
                        <X size={16} />
                    </button>
                </div>

                <div className="inventory-category-body">
                    {/* Add Form */}
                    <form onSubmit={handleAdd} className="inventory-category-form">
                        <input
                            type="text"
                            placeholder="New Category Name"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                        />
                        <button
                            title="Add Category"
                            type="submit"
                            disabled={loading || !newCategory.trim()}
                            className="inventory-category-add"
                        >
                            {loading ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
                        </button>
                    </form>

                    {error && <div className="inventory-category-error">{error}</div>}

                    {/* List */}
                    <div className="inventory-category-list custom-scrollbar">
                        {categories.length === 0 ? (
                            <div className="inventory-category-empty">No categories found.</div>
                        ) : (
                            <div>
                                {categories.map(cat => (
                                    <div key={cat.id} className="inventory-category-row">
                                        <div>
                                            <Tag size={15} />
                                            <span>{cat.name}</span>
                                        </div>
                                        <button
                                            title={`Delete ${cat.name}`}
                                            onClick={() => handleDelete(cat.id)}
                                            className="inventory-category-delete"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="inventory-category-actions">
                    <button title="Close" onClick={onClose} className="inventory-category-btn">Close</button>
                </div>
            </div>
        </div>
    ), document.body);
};

export default CategoryManagerModal;
