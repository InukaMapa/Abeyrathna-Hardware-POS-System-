import React, { useMemo } from 'react';
import VariantOption from './VariantOption';

/**
 * VariantGroup - Renders a variant group with its options
 * Handles radio (single-select) and checkbox (multi-select) groups
 * Enforces min/max selection rules
 */
const VariantGroup = ({ 
    variant, 
    selectedOptions, 
    onSelectionChange,
    error
}) => {
    const { id, name, type, isRequired, minSelections, maxSelections, options } = variant;

    // Map backend type to input type
    const inputType = type === 'SINGLE' ? 'radio' : 'checkbox';

    // Use options directly from backend (already filtered)
    const activeOptions = options || [];

    // Handle option selection for radio (single-select)
    const handleRadioChange = (option, checked) => {
        if (checked) {
            onSelectionChange(id, [option.id]);
        }
    };

    // Handle option selection for checkbox (multi-select)
    const handleCheckboxChange = (option, checked) => {
        let newSelection = [...selectedOptions];
        
        if (checked) {
            // Add option if not at max
            if (!newSelection.includes(option.id)) {
                // Check max selections limit
                if (maxSelections && newSelection.length >= maxSelections) {
                    // Max reached, don't add
                    return;
                }
                newSelection.push(option.id);
            }
        } else {
            // Remove option
            newSelection = newSelection.filter(id => id !== option.id);
        }
        
        onSelectionChange(id, newSelection);
    };

    const handleChange = inputType === 'radio' ? handleRadioChange : handleCheckboxChange;

    // Build requirement text
    const getRequirementText = () => {
        if (inputType === 'radio') {
            return isRequired ? 'Required - Select one' : 'Optional - Select one';
        } else {
            // Checkbox
            const parts = [];
            if (isRequired) parts.push('Required');
            if (minSelections && maxSelections) {
                parts.push(`Select ${minSelections}-${maxSelections}`);
            } else if (minSelections) {
                parts.push(`Minimum ${minSelections}`);
            } else if (maxSelections) {
                parts.push(`Maximum ${maxSelections}`);
            }
            return parts.join(' - ') || 'Optional';
        }
    };

    // Check if we can select more options (for checkbox)
    const canSelectMore = inputType === 'checkbox' && (!maxSelections || selectedOptions.length < maxSelections);

    return (
        <div className="border-b border-gray-200 pb-6 last:border-b-0">
            {/* Variant Header */}
            <div className="mb-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800">
                        {name}
                        {isRequired && <span className="text-red-500 ml-1">*</span>}
                    </h3>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                    {getRequirementText()}
                </p>
                
                {/* Selection counter for multi-select */}
                {inputType === 'checkbox' && maxSelections && (
                    <p className="text-xs text-gray-500 mt-1">
                        Selected: {selectedOptions.length} / {maxSelections}
                    </p>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Options */}
            <div className="space-y-2">
                {activeOptions.map(option => (
                    <VariantOption
                        key={option.id}
                        option={option}
                        variantType={inputType}
                        isSelected={selectedOptions.includes(option.id)}
                        onChange={handleChange}
                        disabled={inputType === 'checkbox' && !selectedOptions.includes(option.id) && !canSelectMore}
                        name={`variant-${id}`} // For radio grouping
                    />
                ))}
            </div>

            {/* No options available */}
            {activeOptions.length === 0 && (
                <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                    No options available for this variant
                </div>
            )}
        </div>
    );
};

export default VariantGroup;
