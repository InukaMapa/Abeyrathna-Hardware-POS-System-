import React from 'react';
import '../../styles/dashboard.css';

const LowInventoryTable = ({ items }) => {
    return (
        <div className="recent-orders">
            <div className="section-title section-title-row">
                <span>Low Inventory Alerts</span>
                <span className="status-badge status-leave">
                    {items.length} Items Low
                </span>
            </div>
            <table className="orders-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Current Stock</th>
                        <th>Min. Level</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {items.length === 0 ? (
                        <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                                All inventory levels are healthy.
                            </td>
                        </tr>
                    ) : (
                        items.map((item, index) => (
                            <tr key={index}>
                                <td className="product-cell">{item.ingredient_name}</td>
                                <td className="stock-cell">
                                    {item.quantity} {item.unit}
                                </td>
                                <td>{item.reorder_level} {item.unit}</td>
                                <td>
                                    <span className={`status-badge ${item.quantity === 0 ? 'status-cancelled' : 'status-in-progress'}`}>
                                        {item.quantity === 0 ? 'Out of Stock' : 'Low Stock'}
                                    </span>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default LowInventoryTable;
