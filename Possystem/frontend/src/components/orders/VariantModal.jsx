import React, { useState, useMemo } from 'react';
import VariantGroup from './VariantGroup';

/**
 * VariantModal - Modal for selecting menu item variants
 * Features:
 * - Real-time price calculation
 * - Validation for required variants and min/max selections
 * - Clear error messages
 * - Quantity selection
 */
const VariantModal = ({ item, onClose, onAddToCart }) => {
    // Debug log
    console.log('VARIANTS RECEIVED:', item.variants);

    // State for selected variants: { variantId: [optionId, ...] }
    const [selectedVariants, setSelectedVariants] = useState({});

    // State for quantity
    const [quantity, setQuantity] = useState(1);

    // State for validation errors: { variantId: errorMessage }
    const [errors, setErrors] = useState({});

    // State for submission
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Handle variant selection change
    const handleSelectionChange = (variantId, optionIds) => {
        setSelectedVariants(prev => ({
            ...prev,
            [variantId]: optionIds
        }));

        // Clear error for this variant
        if (errors[variantId]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[variantId];
                return newErrors;
            });
        }
    };

    // Calculate total price based on selected variants
    const calculatedPrice = useMemo(() => {
        let total = parseFloat(item.price);

        if (!item.variants) return total;

        // Add prices from selected options
        item.variants.forEach(variant => {
            const selectedOptionIds = selectedVariants[variant.id] || [];

            variant.options.forEach(option => {
                if (selectedOptionIds.includes(option.id)) {
                    total += parseFloat(option.price || 0);
                }
            });
        });

        return total;
    }, [item, selectedVariants]);

    // Validate all variants
    const validateSelections = () => {
        const newErrors = {};
        let isValid = true;

        if (!item.variants || item.variants.length === 0) {
            return true;
        }

        item.variants.forEach(variant => {
            const selectedOptions = selectedVariants[variant.id] || [];
            const options = variant.options || [];

            // Skip if no options
            if (options.length === 0) {
                return;
            }

            // Check required variants
            if (variant.isRequired && selectedOptions.length === 0) {
                newErrors[variant.id] = `Please select ${variant.type === 'SINGLE' ? 'an option' : 'at least one option'}`;
                isValid = false;
                return;
            }

            // For checkbox type, check min/max selections
            const inputType = variant.type === 'SINGLE' ? 'radio' : 'checkbox';
            if (inputType === 'checkbox') {
                if (variant.minSelections && selectedOptions.length < variant.minSelections) {
                    newErrors[variant.id] = `Please select at least ${variant.minSelections} option${variant.minSelections > 1 ? 's' : ''}`;
                    isValid = false;
                }

                if (variant.maxSelections && selectedOptions.length > variant.maxSelections) {
                    newErrors[variant.id] = `Maximum ${variant.maxSelections} option${variant.maxSelections > 1 ? 's' : ''} allowed`;
                    isValid = false;
                }
            }

            // FinputTtype, exactly one should be selected if required
            if (variant.type === 'radio' && variant.isRequired && selectedOptions.length === 0) {
                newErrors[variant.id] = 'Please select an option';
                isValid = false;
            }
        });

        setErrors(newErrors);
        return isValid;
    };

    // Handle add to cart
    const handleAddToCart = () => {
        if (!validateSelections()) {
            // Scroll to first error
            const firstErrorElement = document.querySelector('[data-error="true"]');
            if (firstErrorElement) {
                firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        setIsSubmitting(true);

        // Build the cart item with selected variants
        const cartItem = {
            menu_item_id: item.id,
            name: item.name,
            quantity: quantity,
            base_price: parseFloat(item.price),
            variants: [], // Array of { variant_id, option_id, option_name, price }
            total_price: calculatedPrice * quantity,
            image: item.image
        };

        // Add variant details
        if (item.variants) {
            item.variants.forEach(variant => {
                const selectedOptionIds = selectedVariants[variant.id] || [];

                if (selectedOptionIds.length > 0) {
                    // Add each selected option to variants array
                    selectedOptionIds.forEach(optionId => {
                        const option = variant.options.find(opt => opt.id === optionId);
                        if (option) {
                            cartItem.variants.push({
                                variant_id: variant.id,
                                option_id: option.id,
                                option_name: option.name,
                                price: parseFloat(option.price || 0)
                            });
                        }
                    });
                }
            });
        }

        // Call parent handler
        onAddToCart(cartItem);

        setIsSubmitting(false);
        onClose();
    };

    // Handle backdrop click
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={handleBackdropClick}
        >
            <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-hidden flex flex-col scale-in">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-red-600 to-red-800 text-white p-6 flex-shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-xl"></div>
                    <div className="relative z-10 flex justify-between items-start">
                        <div className="flex-1">
                            <h2 className="text-xl font-bold mb-1 uppercase tracking-tight">{item.name}</h2>
                            <p className="text-red-100 text-xs font-semibold uppercase tracking-widest opacity-70">
                                Base Price: Rs. {parseFloat(item.price).toFixed(2)}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-all"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Modal Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {item.variants && item.variants.length > 0 ? (
                        <div className="space-y-6">
                            {item.variants.map(variant => (
                                <div
                                    key={variant.id}
                                    data-error={errors[variant.id] ? 'true' : 'false'}
                                    className="p-5 bg-gray-800/10 border border-[#333333]/50 rounded-xl"
                                >
                                    <VariantGroup
                                        variant={variant}
                                        selectedOptions={selectedVariants[variant.id] || []}
                                        onSelectionChange={handleSelectionChange}
                                        error={errors[variant.id]}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            No variants available for this item
                        </div>
                    )}
                </div>

                {/* Modal Footer - Fixed */}
                <div className="border-t border-[#333333] bg-[#1a1a1a] p-6 flex-shrink-0">
                    {/* Quantity Selector */}
                    <div className="flex items-center justify-between mb-6 px-2">
                        <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Quantity</span>
                        <div className="flex items-center gap-3 bg-gray-800 p-1 rounded-xl border border-[#333333]">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="w-9 h-9 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold text-lg transition-all active:scale-90"
                                disabled={quantity <= 1}
                            >
                                −
                            </button>
                            <span className="w-10 text-center font-bold text-xl text-white">
                                {quantity}
                            </span>
                            <button
                                onClick={() => setQuantity(quantity + 1)}
                                className="w-9 h-9 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold text-lg transition-all active:scale-90"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Price Display */}
                    <div className="bg-red-600/[0.03] rounded-xl p-4 mb-6 border border-red-600/10">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Total Price</span>
                            <div className="text-right">
                                {quantity > 1 && (
                                    <p className="text-[10px] text-red-500/60 font-bold mb-0.5">
                                        Rs. {calculatedPrice.toFixed(2)} × {quantity}
                                    </p>
                                )}
                                <p className="text-xl font-black text-red-600 tracking-tight">
                                    Rs. {(calculatedPrice * quantity).toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-800/50 border border-[#333333] rounded-xl text-gray-500 font-bold text-xs uppercase tracking-widest hover:text-white transition-all"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddToCart}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-600/10"
                        >
                            {isSubmitting ? 'Adding...' : 'Add to Order'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VariantModal;
