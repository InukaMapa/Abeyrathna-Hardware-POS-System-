import React, { useEffect,  useState } from 'react';
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

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-md">
            <div className="bg-white w-full max-w-lg max-h-[90vh] flex flex-col rounded-[24px] shadow-2xl overflow-hidden animate-slide-up relative">
                
                <div className="p-6 flex justify-between items-center bg-[#C1DFCD] shrink-0 border-b-0">
                    <div className="flex items-center gap-3">
                        <Tag className="w-5 h-5 text-green-800" />
                        <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Manage Categories</h2>
                    </div>
                    <button onClick={onClose} className="p-2 bg-green-700 text-white hover:bg-green-800 rounded-xl transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 pt-6 space-y-6 flex-1 overflow-hidden flex flex-col">
                    {/* Add Form */}
                    <form onSubmit={handleAdd} className="flex gap-3 shrink-0">
                        <input
                            type="text"
                            placeholder="New Category Name"
                            className="flex-1 bg-white border border-green-200 text-gray-800 px-4 py-3 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all font-medium text-sm"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={loading || !newCategory.trim()}
                            className="bg-green-700 text-white px-6 py-3 rounded-xl disabled:opacity-50 hover:bg-green-800 transition-all shadow-md flex items-center justify-center"
                        >
                            {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        </button>
                    </form>

                    {error && <div className="text-red-600 text-xs font-bold uppercase tracking-tight bg-red-50 border border-red-200 p-3 rounded-xl">{error}</div>}

                    {/* List */}
                    <div className="bg-white rounded-2xl border border-green-200 flex-1 overflow-y-auto custom-scrollbar">
                        {categories.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm font-medium">No categories found.</div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {categories.map(cat => (
                                    <div key={cat.id} className="flex items-center justify-between p-4 hover:bg-green-50 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <Tag className="w-4 h-4 text-green-600" />
                                            <span className="text-gray-800 font-bold text-sm">{cat.name}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(cat.id)}
                                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-white flex justify-end border-t border-gray-100 shrink-0">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl border border-gray-300 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all">Close</button>
                </div>
            </div>
        </div>
    );
};

export default CategoryManagerModal;
