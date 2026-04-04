import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';

const ShiftOrdersModal = ({ isOpen, onClose, shiftId }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedOrder, setExpandedOrder] = useState(null);

    useEffect(() => {
        if (isOpen && shiftId) {
            fetchOrders();
        }
    }, [isOpen, shiftId]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/cash/shift-orders/${shiftId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setOrders(data);
        } catch (err) {
            console.error('Failed to fetch shift orders', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const toggleOrder = (orderId) => {
        setExpandedOrder(expandedOrder === orderId ? null : orderId);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content shift-orders-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Shift Cash Sales Details</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    {loading ? (
                        <div className="loading-spinner">Loading orders...</div>
                    ) : orders.length === 0 ? (
                        <div className="no-data">No cash sales recorded for this shift yet.</div>
                    ) : (
                        <div className="orders-list">
                            {orders.map(order => (
                                <div key={order.order_id} className={`order-card ${expandedOrder === order.order_id ? 'expanded' : ''}`}>
                                    <div className="order-summary-row" onClick={() => toggleOrder(order.order_id)}>
                                        <div className="order-info">
                                            <span className="order-id">Order #{order.order_id}</span>
                                            <span className="order-time">
                                                {new Date(order.closed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className="order-amount-group">
                                            <span className="order-amount">Rs. {parseFloat(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            <span className="expand-icon">{expandedOrder === order.order_id ? '−' : '+'}</span>
                                        </div>
                                    </div>

                                    {expandedOrder === order.order_id && (
                                        <div className="order-details-expanded">
                                            <table className="items-table">
                                                <thead>
                                                    <tr>
                                                        <th>Item</th>
                                                        <th>Qty</th>
                                                        <th>Price</th>
                                                        <th>Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {order.order_items.map(item => (
                                                        <tr key={item.order_item_id}>
                                                            <td>{item.item_name}</td>
                                                            <td>{item.quantity}</td>
                                                            <td>{parseFloat(item.item_price).toLocaleString()}</td>
                                                            <td>{parseFloat(item.subtotal).toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>

            <style jsx>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    backdrop-filter: blur(4px);
                }
                .shift-orders-modal {
                    width: 90%;
                    max-width: 600px;
                    max-height: 80vh;
                    background: #1a1a1a;
                    border: 1px solid #333;
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
                }
                .modal-header {
                    padding: 20px;
                    border-bottom: 1px solid #333;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .modal-header h2 {
                    margin: 0;
                    font-size: 1.25rem;
                    color: #fff;
                }
                .close-btn {
                    background: none;
                    border: none;
                    color: #888;
                    font-size: 2rem;
                    cursor: pointer;
                    line-height: 1;
                }
                .modal-body {
                    padding: 20px;
                    overflow-y: auto;
                    flex: 1;
                }
                .order-card {
                    background: #2a2a2a;
                    border: 1px solid #333;
                    border-radius: 8px;
                    margin-bottom: 12px;
                    overflow: hidden;
                    transition: all 0.2s;
                }
                .order-card:hover {
                    border-color: var(--accent-color);
                }
                .order-summary-row {
                    padding: 15px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: pointer;
                }
                .order-info {
                    display: flex;
                    flex-direction: column;
                }
                .order-id {
                    font-weight: bold;
                    color: #fff;
                }
                .order-time {
                    font-size: 0.8rem;
                    color: #888;
                }
                .order-amount-group {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                .order-amount {
                    font-weight: bold;
                    color: var(--success-color);
                }
                .expand-icon {
                    color: #888;
                    width: 20px;
                    text-align: center;
                }
                .order-details-expanded {
                    padding: 15px;
                    background: #222;
                    border-top: 1px solid #333;
                }
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.9rem;
                }
                .items-table th {
                    text-align: left;
                    color: #888;
                    padding-bottom: 8px;
                    font-weight: 500;
                }
                .items-table td {
                    padding: 6px 0;
                    color: #ccc;
                }
                .modal-footer {
                    padding: 15px 20px;
                    border-top: 1px solid #333;
                    display: flex;
                    justify-content: flex-end;
                }
                .no-data {
                    text-align: center;
                    color: #888;
                    padding: 40px 0;
                }
            `}</style>
        </div>
    );
};

export default ShiftOrdersModal;
