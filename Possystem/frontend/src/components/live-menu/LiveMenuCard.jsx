import React from 'react';
import '../../styles/menu.css';

const LiveMenuCard = ({ item, quantity, onAdd, onRemove }) => {
    return (
        <div className="menu-card live-mode">
            <div className="card-image-container">
                <img
                    src={item.image || 'https://via.placeholder.com/150'}
                    alt={item.name}
                    className="menu-item-image"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/150' }}
                />
                {(item.isPopular || item.is_popular) && <span className="popular-badge">★ Chef's Special</span>}
            </div>
            <div className="card-details">
                <div className="card-header">
                    <h3 className="item-name">{item.name}</h3>
                </div>
                {item.description && <p className="item-desc-short" style={{ fontSize: '0.8rem', color: '#888', marginBottom: '8px' }}>{item.description}</p>}

                <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <div className="item-price" style={{ fontWeight: 'bold', color: '#e74c3c' }}>
                        {(() => {
                            const sizeVariant = item.variants?.find(v => v.name.toLowerCase() === 'size');
                            if (sizeVariant && sizeVariant.options?.length > 0) {
                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.85rem' }}>
                                        {sizeVariant.options.map(opt => (
                                            <span key={opt.id}>
                                                {opt.name}: Rs. {(Number(item.price) + Number(opt.price || 0)).toFixed(0)}
                                            </span>
                                        ))}
                                    </div>
                                );
                            }
                            return `Rs. ${Number(item.price).toFixed(2)}`;
                        })()}
                    </div>

                    <div className="card-actions">
                        {!item.available ? (
                            <span style={{ color: '#888', fontWeight: 'bold', fontSize: '0.9rem' }}>Sold Out</span>
                        ) : (item.variants && item.variants.length > 0) ? (
                            <button
                                className="btn-action add-cart"
                                onClick={() => onAdd(item)}
                                style={{
                                    backgroundColor: '#e74c3c',
                                    color: 'white',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '0.9rem'
                                }}
                            >
                                Customize
                            </button>
                        ) : quantity > 0 ? (
                            <div className="quantity-controls" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#333', padding: '5px 10px', borderRadius: '20px' }}>
                                <button
                                    onClick={() => onRemove(item)}
                                    style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}
                                >-</button>
                                <span style={{ color: 'white', fontWeight: 'bold' }}>{quantity}</span>
                                <button
                                    onClick={() => onAdd(item)}
                                    style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}
                                >+</button>
                            </div>
                        ) : (
                            <button
                                className="btn-action add-cart"
                                onClick={() => onAdd(item)}
                                style={{
                                    backgroundColor: '#e74c3c',
                                    color: 'white',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                Add +
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveMenuCard;
