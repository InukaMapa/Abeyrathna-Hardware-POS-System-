import React from 'react';

/**
 * InputGroup Component
 * 
 * Renders an input field with an optional icon.
 * 
 * @param {string} type - Input type (text, password, etc.)
 * @param {string} placeholder - Placeholder text
 * @param {string} value - Input value
 * @param {function} onChange - Change handler
 * @param {React.ReactNode} icon - SVG icon component
 * @param {string} error - Error message
 */
const InputGroup = ({ type = 'text', placeholder, value, onChange, icon, error }) => {
    return (
        <div className="form-group">
            <div className="input-wrapper">
                {icon && <div className="input-icon-container">{icon}</div>}
                <input
                    type={type}
                    className="form-input"
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                />
            </div>
            {error && <div className="error-message">{error}</div>}
        </div>
    );
};

export default InputGroup;
