import React, { useState } from 'react';
import { X, Plus, Trash2, Tag } from 'lucide-react';
import { Loader } from 'lucide-react';
import axios from 'axios';
import '../../../styles/menu.css'; // Reusing styles

const CategoryManagerModal = ({ isOpen, onClose, categories, onCategoryChange }) => {
    const [newCategory, setNewCategory] = useState('');
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
            await axios.post('http://localhost:5000/api/inventory/categories',
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
            await axios.delete(`http://localhost:5000/api/inventory/categories/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onCategoryChange();
        } catch (err) {
            console.error('Error deleting category:', err);
            setError('Failed to delete category');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ width: '500px' }}>
                <div className="modal-header">
                    <h2>Manage Categories</h2>
                    <button onClick={onClose} className="close-btn"><X className="w-5 h-5" /></button>
                </div>

                <div className="space-y-6">
                    {/* Add Form */}
                    <form onSubmit={handleAdd} className="flex gap-2">
                        <input
                            type="text"
                            placeholder="New Category Name"
                            className="flex-1 bg-[#111] border border-[#333] text-white p-2 rounded-lg focus:outline-none focus:border-[#D32F2F]"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={loading || !newCategory.trim()}
                            className="bg-[#D32F2F] text-white px-4 py-2 rounded-lg hover:bg-[#B71C1C] disabled:opacity-50 transition-colors"
                        >
                            {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        </button>
                    </form>

                    {error && <div className="text-[#ff5252] text-sm bg-[#ff5252]/10 p-2 rounded">{error}</div>}

                    {/* List */}
                    <div className="bg-[#111] rounded-lg border border-[#333] max-h-[300px] overflow-y-auto custom-scrollbar">
                        {categories.length === 0 ? (
                            <div className="p-4 text-center text-[#666] text-sm">No categories found.</div>
                        ) : (
                            <div className="divide-y divide-[#333]">
                                {categories.map(cat => (
                                    <div key={cat.id} className="flex items-center justify-between p-3 hover:bg-[#252525] transition-colors group">
                                        <div className="flex items-center gap-2">
                                            <Tag className="w-4 h-4 text-[#666]" />
                                            <span className="text-[#E0E0E0]">{cat.name}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(cat.id)}
                                            className="text-[#666] hover:text-[#ff5252] opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-actions mt-6 pt-4 border-t border-[#333]">
                    <button onClick={onClose} className="btn-secondary w-full">Close</button>
                </div>
            </div>
        </div>
    );
};

export default CategoryManagerModal;
