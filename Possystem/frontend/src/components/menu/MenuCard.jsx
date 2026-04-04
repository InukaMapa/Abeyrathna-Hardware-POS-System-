import React from 'react';
import '../../styles/menu.css';

const MenuCard = ({ item, onEdit, onDelete }) => {
    return (
        <div className="menu-card">
            <div className="card-image-container">
                <img src={item.image || 'https://via.placeholder.com/150'} alt={item.name} className="menu-item-image" />
                {item.isPopular && <span className="popular-badge">★ Chef's Special</span>}
            </div>
            <div className="card-details">
                <div className="card-header">
                    <h3 className="item-name">{item.name}</h3>
                    <span className="item-category">{item.category}</span>
                </div>

                {/* Variant Status Display */}
                {item.variants && item.variants.length > 0 ? (
                    <div className="variant-status-list">
                        {item.variants.map(variant => (
                            variant.options.map(opt => (
                                <div key={opt.id} className="variant-status-item">
                                    <span className="variant-name">{opt.name}</span>
                                    <span className="variant-price">Rs. {((item.price || 0) + (opt.priceDelta || 0)).toFixed(0)}</span>

                                </div>
                            ))
                        ))}
                    </div>
                ) : (
                    <div className="item-price">
                        Rs. {item.price.toFixed(2)}

                    </div>
                )}

                <div className="card-actions">
                    <button className="btn-action view" onClick={() => onEdit(item)}>Edit</button>
                    <button className="btn-action delete" onClick={() => onDelete(item.id)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MenuCard;
