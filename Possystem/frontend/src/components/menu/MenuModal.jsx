import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Loader, Image as ImageIcon } from 'lucide-react';
import { uploadImage } from '../../services/menuService';

const MenuModal = ({ isOpen, onClose, onSubmit, editingItem, categories, inventory, inventoryCategories = [] }) => {
    const [activeTab, setActiveTab] = useState('general'); // general, variants, recipe
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        categoryId: '',
        description: '',
        image: '',
        inventory: [], // [{ id, quantity }]
        variants: [] // [{ name, type, isRequired, minSelections, maxSelections, options: [{ name, priceDelta }] }]
    });

    const [selectedIngredient, setSelectedIngredient] = useState('');
    const [ingredientQty, setIngredientQty] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    useEffect(() => {
        if (editingItem) {
            setFormData({
                name: editingItem.name || '',
                price: editingItem.price || '',
                categoryId: editingItem.category_id || editingItem.categoryId || '',
                description: editingItem.description || '',
                image: editingItem.image || '',
                inventory: editingItem.ingredients ? editingItem.ingredients.map(ing => ({
                    id: ing.inventory_id || ing.id,
                    quantity: ing.quantity
                })) : [],
                variants: editingItem.variants ? editingItem.variants.map(v => ({
                    ...v,
                    options: v.options.map(o => ({
                        ...o,
                        priceDelta: o.priceDelta || o.price || 0
                    }))
                })) : []
            });
        } else {
            // Reset for new item
            setFormData({
                name: '',
                price: '',
                categoryId: categories.length > 0 ? categories[0].id : '',
                description: '',
                image: '',
                inventory: [],
                variants: [
                    {
                        name: 'Size',
                        type: 'SINGLE',
                        isRequired: true,
                        minSelections: 1,
                        maxSelections: 1,
                        options: [
                            { name: 'Small', priceDelta: 0 },
                            { name: 'Large', priceDelta: 0 }
                        ]
                    }
                ]
            });
        }
    }, [editingItem, isOpen, categories]);

    // Handle form field changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Add ingredient to list
    const handleAddIngredient = () => {
        if (!selectedIngredient || !ingredientQty) return;

        const ingredientToAdd = inventory.find(i => i.id === selectedIngredient);
        if (!ingredientToAdd) return;

        setFormData(prev => {
            const existingIndex = prev.inventory.findIndex(i => i.id === selectedIngredient);
            if (existingIndex >= 0) {
                const updated = [...prev.inventory];
                updated[existingIndex].quantity = parseFloat(ingredientQty);
                return { ...prev, inventory: updated };
            }
            return {
                ...prev,
                inventory: [...prev.inventory, { id: selectedIngredient, quantity: parseFloat(ingredientQty) }]
            };
        });

        setSelectedIngredient('');
        setIngredientQty('');
    };

    const handleRemoveIngredient = (id) => {
        setFormData(prev => ({
            ...prev,
            inventory: prev.inventory.filter(i => i.id !== id)
        }));
    };

    // Variant Management
    const handleAddVariant = () => {
        setFormData(prev => ({
            ...prev,
            variants: [...prev.variants, {
                name: '',
                type: 'SINGLE',
                isRequired: true,
                minSelections: 1,
                maxSelections: 1,
                options: []
            }]
        }));
    };

    const handleRemoveVariant = (index) => {
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.filter((_, i) => i !== index)
        }));
    };

    const updateVariant = (index, field, value) => {
        setFormData(prev => {
            const newVariants = [...prev.variants];
            newVariants[index] = { ...newVariants[index], [field]: value };
            return { ...prev, variants: newVariants };
        });
    };

    const handleAddOption = (variantIndex) => {
        setFormData(prev => {
            const newVariants = [...prev.variants];
            newVariants[variantIndex].options.push({ name: '', priceDelta: 0 });
            return { ...prev, variants: newVariants };
        });
    };

    const updateOption = (variantIndex, optionIndex, field, value) => {
        setFormData(prev => {
            const newVariants = [...prev.variants];
            const newOptions = [...newVariants[variantIndex].options];
            newOptions[optionIndex] = { ...newOptions[optionIndex], [field]: value };
            newVariants[variantIndex].options = newOptions;
            return { ...prev, variants: newVariants };
        });
    };

    const removeOption = (variantIndex, optionIndex) => {
        setFormData(prev => {
            const newVariants = [...prev.variants];
            newVariants[variantIndex].options = newVariants[variantIndex].options.filter((_, i) => i !== optionIndex);
            return { ...prev, variants: newVariants };
        });
    };

    // Variant Ingredient Management
    const addOptionIngredient = (variantIndex, optionIndex, ingredientId, quantity) => {
        setFormData(prev => {
            const newVariants = [...prev.variants];
            const newOptions = [...newVariants[variantIndex].options];
            const currentOption = newOptions[optionIndex];

            // Initialize ingredients array if missing
            const optionIngredients = currentOption.ingredients ? [...currentOption.ingredients] : [];

            // Check if exists
            const existingIndex = optionIngredients.findIndex(i => i.id === ingredientId);
            if (existingIndex >= 0) {
                optionIngredients[existingIndex].quantity = parseFloat(quantity);
            } else {
                optionIngredients.push({ id: ingredientId, quantity: parseFloat(quantity) });
            }

            newOptions[optionIndex] = { ...currentOption, ingredients: optionIngredients };
            newVariants[variantIndex].options = newOptions;

            return { ...prev, variants: newVariants };
        });
    };

    const removeOptionIngredient = (variantIndex, optionIndex, ingredientIndex) => {
        setFormData(prev => {
            const newVariants = [...prev.variants];
            const newOptions = [...newVariants[variantIndex].options];
            const currentOption = newOptions[optionIndex];

            const optionIngredients = currentOption.ingredients.filter((_, i) => i !== ingredientIndex);

            newOptions[optionIndex] = { ...currentOption, ingredients: optionIngredients };
            newVariants[variantIndex].options = newOptions;

            return { ...prev, variants: newVariants };
        });
    };

    // Image Upload
    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadError(null);
        setIsUploading(true);

        try {
            const response = await uploadImage(file);
            setFormData(prev => ({ ...prev, image: response.imageUrl }));
        } catch (err) {
            console.error("Upload failed:", err);
            setUploadError("Failed to upload image. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    if (!isOpen) return null;

    const TabButton = ({ id, label }) => (
        <button
            type="button"
            onClick={() => setActiveTab(id)}
            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === id
                ? 'border-red-600 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
        >
            {label}
        </button>
    );

    // -------------------------------------------------------------
    // Helper Component for Option Ingredient Selection (to handle local state for category filter)
    // -------------------------------------------------------------
    const OptionIngredientSelector = ({ variantIndex, optionIndex, inventory, inventoryCategories, onAdd }) => {
        const [selectedCat, setSelectedCat] = useState('');
        const [selectedIng, setSelectedIng] = useState('');
        const [qty, setQty] = useState('');

        const filteredInventory = selectedCat
            ? inventory.filter(i => i.category === selectedCat)
            : [];

        return (
            <div className="flex flex-col gap-2 mt-2 bg-gray-900/30 p-2 rounded">
                <div className="flex gap-2">
                    <select
                        className="flex-1 bg-gray-900 border border-gray-700 rounded p-1 text-xs text-gray-300 focus:border-red-500 outline-none"
                        value={selectedCat}
                        onChange={(e) => {
                            setSelectedCat(e.target.value);
                            setSelectedIng(''); // Reset item select
                        }}
                    >
                        <option value="">1. Select Category</option>
                        {inventoryCategories.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex gap-2">
                    <select
                        className="flex-1 bg-gray-900 border border-gray-700 rounded p-1 text-xs text-gray-300 focus:border-red-500 outline-none"
                        value={selectedIng}
                        onChange={(e) => setSelectedIng(e.target.value)}
                        disabled={!selectedCat}
                    >
                        <option value="">2. Select Ingredient</option>
                        {filteredInventory.map(item => (
                            <option key={item.id} value={item.id}>{item.ingredient_name} ({item.unit})</option>
                        ))}
                    </select>
                    <input
                        type="number"
                        placeholder="Qty"
                        className="w-16 bg-gray-900 border border-gray-700 rounded p-1 text-xs text-gray-300 focus:border-red-500 outline-none"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={() => {
                            if (selectedIng && qty) {
                                onAdd(selectedIng, qty);
                                setSelectedIng('');
                                setQty('');
                            }
                        }}
                        className="bg-gray-700 hover:bg-gray-600 text-white rounded px-2 py-1 text-xs whitespace-nowrap"
                        disabled={!selectedIng || !qty}
                    >
                        Add
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-[#1a1a1a] w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] border border-gray-800">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-800">
                    <h2 className="text-2xl font-bold text-white">{editingItem ? 'Edit Product Item' : 'New Product Item'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-800 px-6 bg-gray-900/50">
                    <TabButton id="general" label="General Info" />
                    <TabButton id="variants" label="Variants & Options" />
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 custom-scrollbar">

                    {/* --- GENERAL TAB --- */}
                    {activeTab === 'general' && (
                        <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Item Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="e.g. Hammer, Paint Brush, PVC Pipe"
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Price (Rs.)</label>
                                    <input
                                        type="number"
                                        name="price"
                                        value={formData.price}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        step="0.01"
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
                                    <select
                                        name="categoryId"
                                        value={formData.categoryId}
                                        onChange={handleChange}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all appearance-none"
                                        required
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows="4"
                                        placeholder="Describe the item..."
                                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Item Image</label>
                                <div
                                    onClick={() => !isUploading && document.getElementById('imageUpload').click()}
                                    className="border-2 border-dashed border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center gap-4 hover:border-red-500/50 hover:bg-gray-900/50 cursor-pointer transition-all group"
                                >
                                    <input id="imageUpload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" disabled={isUploading} />

                                    {isUploading ? (
                                        <Loader className="animate-spin text-red-600" size={32} />
                                    ) : formData.image ? (
                                        <div className="relative w-full h-48">
                                            <img src={formData.image} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                                <span className="text-white font-medium">Change Image</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="p-4 bg-gray-800 rounded-full group-hover:scale-110 transition-transform">
                                                <ImageIcon size={32} className="text-gray-400 group-hover:text-white" />
                                            </div>
                                            <div className="text-center">
                                                <p className="text-gray-300 font-medium">Click to upload image</p>
                                                <p className="text-gray-500 text-sm">PNG, JPG up to 5MB</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                                {uploadError && <p className="text-sm text-red-500 mt-2">{uploadError}</p>}
                            </div>
                        </div>
                    )}

                    {/* --- VARIANTS TAB --- */}
                    {activeTab === 'variants' && (
                        <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
                            <div className="flex justify-between items-center bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                                <div>
                                    <h3 className="text-lg font-bold text-white">Variant Groups</h3>
                                    <p className="text-gray-400 text-sm">Manage sizes, add-ons, and customizations.</p>
                                </div>
                                <button type="button" onClick={handleAddVariant} className="flex items-center gap-2 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white px-4 py-2 rounded-lg transition-colors font-medium">
                                    <Plus size={18} /> Add Group
                                </button>
                            </div>

                            {formData.variants.length === 0 ? (
                                <div className="text-center py-12 bg-gray-900/30 rounded-xl border border-dashed border-gray-800">
                                    <p className="text-gray-500">No variants added yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {formData.variants.map((variant, vIndex) => (
                                        <div key={vIndex} className="bg-gray-800/30 rounded-xl border border-gray-700 overflow-hidden">
                                            {/* Variant Header */}
                                            <div className="p-4 bg-gray-800/50 border-b border-gray-700 flex items-start gap-4">
                                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs text-gray-500 block mb-1">Group Name</label>
                                                        <input
                                                            type="text"
                                                            value={variant.name}
                                                            onChange={(e) => updateVariant(vIndex, 'name', e.target.value)}
                                                            placeholder="e.g. Size"
                                                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-red-500 outline-none"
                                                        />
                                                    </div>
                                                    <div className="flex gap-4">
                                                        <div className="flex-1">
                                                            <label className="text-xs text-gray-500 block mb-1">Type</label>
                                                            <select
                                                                value={variant.type}
                                                                onChange={(e) => updateVariant(vIndex, 'type', e.target.value)}
                                                                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-red-500 outline-none"
                                                            >
                                                                <option value="SINGLE">One Choice (Radio)</option>
                                                                <option value="MULTIPLE">Multiple (Checkbox)</option>
                                                            </select>
                                                        </div>
                                                        <div className="flex items-end pb-2">
                                                            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={variant.isRequired}
                                                                    onChange={(e) => updateVariant(vIndex, 'isRequired', e.target.checked)}
                                                                    className="w-4 h-4 rounded border-gray-600 text-red-600 focus:ring-red-500 bg-gray-900"
                                                                />
                                                                Required
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleRemoveVariant(vIndex)} className="text-gray-500 hover:text-red-500 p-1">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>

                                            {/* Options List */}
                                            <div className="p-4 bg-gray-900/30">
                                                <div className="space-y-4">
                                                    {variant.options.map((option, oIndex) => (
                                                        <div key={oIndex} className="bg-gray-800/40 rounded-lg p-3 border border-gray-700/50">
                                                            <div className="flex gap-3 items-center mb-2">
                                                                <div className="flex-1">
                                                                    <input
                                                                        type="text"
                                                                        value={option.name}
                                                                        onChange={(e) => updateOption(vIndex, oIndex, 'name', e.target.value)}
                                                                        placeholder="Option Value (e.g. Large)"
                                                                        className="w-full bg-gray-900 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white focus:border-red-500 outline-none"
                                                                    />
                                                                </div>
                                                                <div className="w-32 active:w-32">
                                                                    <div className="relative">
                                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">+Rs.</span>
                                                                        <input
                                                                            type="number"
                                                                            value={option.priceDelta}
                                                                            onChange={(e) => updateOption(vIndex, oIndex, 'priceDelta', parseFloat(e.target.value))}
                                                                            placeholder="0"
                                                                            className="w-full bg-gray-900 border border-gray-700/50 rounded-lg pl-10 pr-3 py-2 text-sm text-white focus:border-red-500 outline-none"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <button onClick={() => removeOption(vIndex, oIndex)} className="text-gray-600 hover:text-red-500">
                                                                    <X size={16} />
                                                                </button>
                                                            </div>

                                                            {/* Nested Ingredient Management */}
                                                            <div className="pl-2 border-l-2 border-gray-700/50">
                                                                <p className="text-xs text-gray-500 mb-2">Inventory for this option:</p>
                                                                <div className="space-y-2">
                                                                    {option.ingredients && option.ingredients.map((ing, iIndex) => {
                                                                        const item = inventory.find(i => i.id === ing.id);
                                                                        return (
                                                                            <div key={iIndex} className="flex justify-between items-center bg-gray-900/50 p-2 rounded text-xs">
                                                                                <span className="text-gray-300">{item?.ingredient_name || item?.name}</span>
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-red-400 font-mono">{ing.quantity} {item?.unit}</span>
                                                                                    <button type="button" onClick={() => removeOptionIngredient(vIndex, oIndex, iIndex)} className="text-gray-600 hover:text-red-500">
                                                                                        <X size={12} />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>

                                                                {/* New Helper for adding ingredients using categories */}
                                                                <OptionIngredientSelector
                                                                    variantIndex={vIndex}
                                                                    optionIndex={oIndex}
                                                                    inventory={inventory}
                                                                    inventoryCategories={inventoryCategories}
                                                                    onAdd={(ingId, qty) => addOptionIngredient(vIndex, oIndex, ingId, qty)}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddOption(vIndex)}
                                                    className="mt-3 text-sm text-red-500 hover:text-red-400 font-medium flex items-center gap-1"
                                                >
                                                    <Plus size={16} /> Add Option
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </form>

                {/* Footer */}
                <div className="p-6 border-t border-gray-800 bg-gray-900 flex justify-end gap-3 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-6 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 font-bold flex items-center gap-2 shadow-lg shadow-red-900/20 transition-all hover:scale-[1.02]"
                    >
                        <Save size={18} /> {editingItem ? 'Save Changes' : 'Create Item'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MenuModal;
