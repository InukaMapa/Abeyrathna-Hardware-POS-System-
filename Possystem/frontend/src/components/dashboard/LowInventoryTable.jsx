import React from 'react';
import '../../styles/dashboard.css';

const LowInventoryTable = ({ items = [], outOfStockItems = [] }) => {
    const normalizeItem = (item) => ({
        ...item,
        quantity: Number(item.quantity || 0),
        reorder_level: Number(item.reorder_level || 0)
    });

    const outOfStock = outOfStockItems.map(normalizeItem);
    const lowStock = items
        .map(normalizeItem)
        .filter((item) => item.quantity > 0);

    const alertItems = [...outOfStock, ...lowStock];

    return (
        <div className="recent-orders inventory-alerts-card">
            <div className="section-title section-title-row">
                <span>Low Inventory Alerts</span>
                <div className="inventory-alert-counts">
                    <span className="inventory-alert-count inventory-alert-count-low">{lowStock.length} Low</span>
                    <span className="inventory-alert-count inventory-alert-count-out">{outOfStock.length} Out</span>
                </div>
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
                    {alertItems.length === 0 ? (
                        <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#888' }}>
                                All inventory levels are healthy.
                            </td>
                        </tr>
                    ) : (
                        alertItems.map((item, index) => {
                            const isOutOfStock = item.quantity <= 0;
                            return (
                                <tr key={`${item.id || item.inventory_id || item.ingredient_name}-${index}`} className={isOutOfStock ? 'inventory-alert-row-out' : ''}>
                                    <td className="product-cell">{item.ingredient_name}</td>
                                    <td className={`stock-cell ${isOutOfStock ? 'stock-cell-out' : ''}`}>
                                        {item.quantity} {item.unit}
                                    </td>
                                    <td>{item.reorder_level} {item.unit}</td>
                                    <td>
                                        <span className={`inventory-alert-status ${isOutOfStock ? 'is-out' : 'is-low'}`}>
                                            {isOutOfStock ? 'Out of Stock' : 'Low Stock'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default LowInventoryTable;
