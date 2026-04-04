import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Save, MoreVertical } from 'lucide-react';
import '../../styles/menu.css';

const CategoryManagerModal = ({ isOpen, onClose, categories, onAdd, onEdit, onDelete }) => {
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleAdd = async (e) => {
        e.preventDefault();
        setError('');
        if (!newCategoryName.trim()) return;

        try {
            await onAdd({ name: newCategoryName });
            setNewCategoryName('');
        } catch (err) {
            setError('Failed to add category');
            console.error(err);
        }
    };

    const handleStartEdit = (category) => {
        setEditingId(category.id);
        setEditingName(category.name);
    };

    const handleSaveEdit = async () => {
        if (!editingName.trim()) return;
        try {
            await onEdit(editingId, { name: editingName });
            setEditingId(null);
            setEditingName('');
        } catch (err) {
            setError('Failed to update category');
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this category?')) {
            try {
                await onDelete(id);
            } catch (err) {
                setError('Failed to delete category');
                console.error(err);
            }
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content category-modal animate-fade-in">
                <div className="modal-header">
                    <h2>Manage Categories</h2>
                    <button onClick={onClose} className="close-btn">
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Add New Category */}
                    <form onSubmit={handleAdd} className="add-category-form">
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="New category name..."
                            className="category-input"
                        />
                        <button type="submit" className="btn-primary" disabled={!newCategoryName.trim()}>
                            <Plus size={18} />
                            Add
                        </button>
                    </form>

                    {error && <p className="error-message">{error}</p>}

                    {/* Category List */}
                    <div className="category-list-container">
                        <h3 className="section-title">Existing Categories</h3>
                        <div className="category-list">
                            {categories.map(cat => (
                                <div key={cat.id} className="category-item-row">
                                    {editingId === cat.id ? (
                                        <div className="edit-row">
                                            <input
                                                type="text"
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                className="category-input-small"
                                                autoFocus
                                            />
                                            <div className="actions">
                                                <button onClick={handleSaveEdit} className="btn-icon-success">
                                                    <Save size={18} />
                                                </button>
                                                <button onClick={() => setEditingId(null)} className="btn-icon-danger">
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="category-name">{cat.name}</span>
                                            <div className="actions">
                                                <button onClick={() => handleStartEdit(cat)} className="btn-icon text-blue-400 hover:text-blue-300">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(cat.id)} className="btn-icon text-red-400 hover:text-red-300">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CategoryManagerModal;
