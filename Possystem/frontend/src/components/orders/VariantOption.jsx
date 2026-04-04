import React from 'react';

/**
 * VariantOption - Renders a single option within a variant group
 * Handles both radio and checkbox types with pricing display
 */
const VariantOption = ({ 
    option, 
    variantType, 
    isSelected, 
    onChange, 
    disabled,
    name // For radio button grouping
}) => {
    const inputId = `option-${option.id}`;

    const handleChange = (e) => {
        if (!disabled) {
            onChange(option, e.target.checked);
        }
    };

    const priceDisplay = option.price > 0 ? `+Rs. ${parseFloat(option.price).toFixed(2)}` : 'No extra charge';

    return (
        <label
            htmlFor={inputId}
            className={`
                flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer
                transition-all duration-200
                ${isSelected 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
        >
            <div className="flex items-center flex-1">
                <input
                    id={inputId}
                    type={variantType === 'radio' ? 'radio' : 'checkbox'}
                    name={name}
                    checked={isSelected}
                    onChange={handleChange}
                    disabled={disabled}
                    className={`
                        w-5 h-5 cursor-pointer
                        ${variantType === 'radio' ? 'accent-blue-600' : 'accent-blue-600'}
                        ${disabled ? 'cursor-not-allowed' : ''}
                    `}
                />
                <span className="ml-3 font-medium text-gray-800">
                    {option.name}
                </span>
            </div>
            <span className={`text-sm font-semibold ${option.price > 0 ? 'text-blue-600' : 'text-gray-500'}`}>
                {priceDisplay}
            </span>
        </label>
    );
};

export default VariantOption;
