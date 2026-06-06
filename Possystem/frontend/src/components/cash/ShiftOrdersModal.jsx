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
                headers: { Authorization: `Bearer ${token}` }
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
                                                {order.payment_method && ` · ${order.payment_method}`}
                                            </span>
                                        </div>
                                        <div className="order-amount-group">
                                            <span className="order-amount">
                                                Rs. {parseFloat(order.cash_amount ?? order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                            <span className="expand-icon">{expandedOrder === order.order_id ? '-' : '+'}</span>
                                        </div>
                                    </div>

                                    {expandedOrder === order.order_id && (
                                        <div className="order-details-expanded">
                                            {order.cash_amount !== undefined && Number(order.cash_amount) !== Number(order.total_amount) && (
                                                <div className="cash-payment-note">
                                                    Invoice total Rs. {parseFloat(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}; cash received Rs. {parseFloat(order.cash_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}.
                                                </div>
                                            )}
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
                    background: rgba(15, 23, 42, 0.38);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    backdrop-filter: blur(5px);
                }

                .shift-orders-modal {
                    width: 90%;
                    max-width: 680px;
                    max-height: 80vh;
                    background: #FFFFFF;
                    border: 1px solid #D7E7DC;
                    border-top: 4px solid var(--primary-green);
                    border-radius: 10px;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.16);
                    color: #132238;
                    overflow: hidden;
                }

                .modal-header {
                    padding: 20px 24px 16px;
                    border-bottom: 1px solid #D7E7DC;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .modal-header h2 {
                    margin: 0;
                    color: #132238;
                    font-size: 1rem;
                    font-weight: 600;
                    letter-spacing: 0;
                    line-height: 1.2;
                }

                .close-btn {
                    width: 36px;
                    height: 36px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    background: #FFFFFF;
                    border: 1px solid #D7E7DC;
                    border-radius: 8px;
                    color: #64748B;
                    font-size: 1.35rem;
                    cursor: pointer;
                    line-height: 1;
                    transition: all 0.2s ease;
                }

                .close-btn:hover {
                    color: var(--primary-green);
                    background: #F8FCFA;
                    border-color: rgba(22, 163, 74, 0.4);
                }

                .modal-body {
                    padding: 22px 24px;
                    overflow-y: auto;
                    flex: 1;
                    background: #FFFFFF;
                }

                .order-card {
                    background: #FFFFFF;
                    border: 1px solid #D7E7DC;
                    border-radius: 8px;
                    margin-bottom: 12px;
                    overflow: hidden;
                    transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
                }

                .order-card:hover {
                    background: #F8FCFA;
                    border-color: rgba(22, 163, 74, 0.35);
                    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.045);
                }

                .order-summary-row {
                    padding: 14px 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: pointer;
                    gap: 18px;
                }

                .order-info {
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                }

                .order-id {
                    color: #132238;
                    font-size: 0.88rem;
                    font-weight: 500;
                }

                .order-time {
                    color: #64748B;
                    font-size: 0.74rem;
                    font-weight: 400;
                }

                .order-amount-group {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                .order-amount {
                    color: #132238;
                    font-size: 0.88rem;
                    font-weight: 500;
                }

                .expand-icon {
                    width: 28px;
                    height: 28px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--primary-green);
                    background: #F0FDF4;
                    border: 1px solid #BBF7D0;
                    border-radius: 999px;
                    font-size: 1rem;
                    font-weight: 500;
                    text-align: center;
                }

                .order-details-expanded {
                    padding: 14px 16px;
                    background: #F8FCFA;
                    border-top: 1px solid #D7E7DC;
                }

                .cash-payment-note {
                    margin-bottom: 12px;
                    color: #526782;
                    font-size: 0.78rem;
                    line-height: 1.4;
                }

                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.82rem;
                }

                .items-table th {
                    text-align: left;
                    color: #526782;
                    padding: 0 8px 8px 0;
                    font-size: 0.66rem;
                    font-weight: 600;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                }

                .items-table td {
                    padding: 8px 8px 0 0;
                    color: #132238;
                    border-top: 1px solid #E5EFE9;
                    font-weight: 400;
                }

                .modal-footer {
                    padding: 16px 24px 20px;
                    border-top: 1px solid #D7E7DC;
                    display: flex;
                    justify-content: flex-end;
                    background: #FFFFFF;
                }

                .modal-footer .btn {
                    min-height: 38px;
                    padding: 0 20px;
                    border-radius: 8px;
                    font-size: 0.8rem;
                    font-weight: 500;
                }

                .modal-footer .btn-secondary {
                    color: var(--dark-green) !important;
                    background: #FFFFFF !important;
                    border: 1px solid rgba(22, 163, 74, 0.25);
                    box-shadow: none !important;
                }

                .modal-footer .btn-secondary:hover {
                    background: #F8FCFA !important;
                    border-color: rgba(22, 163, 74, 0.42) !important;
                }

                .no-data,
                .loading-spinner {
                    color: #64748B;
                    padding: 46px 0;
                    text-align: center;
                    font-size: 0.86rem;
                    font-weight: 400;
                }

                @media (max-width: 640px) {
                    .shift-orders-modal {
                        width: calc(100% - 32px);
                    }

                    .modal-header,
                    .modal-body,
                    .modal-footer {
                        padding-left: 18px;
                        padding-right: 18px;
                    }

                    .order-summary-row {
                        align-items: flex-start;
                        flex-direction: column;
                    }
                }
            `}</style>
        </div>
    );
};

export default ShiftOrdersModal;
