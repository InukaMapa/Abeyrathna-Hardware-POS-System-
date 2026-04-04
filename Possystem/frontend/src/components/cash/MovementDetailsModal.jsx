import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';

const MovementDetailsModal = ({ isOpen, onClose, shiftId, type }) => {
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && shiftId) {
            fetchMovements();
        }
    }, [isOpen, shiftId]);

    const fetchMovements = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/cash/shift-movements/${shiftId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            // Filter by type if provided (cash_in or cash_out)
            const filtered = type ? data.filter(m => m.type === type) : data;
            setMovements(filtered);
        } catch (err) {
            console.error('Failed to fetch movements', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const title = type === 'cash_in' ? 'Cash In Details' : 'Cash Out Details';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content movement-details-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    {loading ? (
                        <div className="loading-spinner">Loading...</div>
                    ) : movements.length === 0 ? (
                        <div className="no-data">No records found.</div>
                    ) : (
                        <table className="movements-table">
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Reason</th>
                                    <th style={{ textAlign: 'right' }}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movements.map(m => (
                                    <tr key={m.movement_id}>
                                        <td>{new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td>{m.reason}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                                            Rs. {parseFloat(m.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                )).reverse()}
                            </tbody>
                        </table>
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
                    z-index: 2100;
                    backdrop-filter: blur(4px);
                }
                .movement-details-modal {
                    width: 90%;
                    max-width: 500px;
                    max-height: 70vh;
                    background: #1a1a1a;
                    border: 1px solid #333;
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                }
                .modal-header {
                    padding: 15px 20px;
                    border-bottom: 1px solid #333;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .modal-header h2 {
                    margin: 0;
                    font-size: 1.1rem;
                    color: #fff;
                }
                .close-btn {
                    background: none;
                    border: none;
                    color: #888;
                    font-size: 1.5rem;
                    cursor: pointer;
                }
                .modal-body {
                    padding: 20px;
                    overflow-y: auto;
                    flex: 1;
                }
                .movements-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .movements-table th {
                    text-align: left;
                    color: #888;
                    padding-bottom: 10px;
                    font-size: 0.85rem;
                }
                .movements-table td {
                    padding: 12px 0;
                    color: #ccc;
                    border-bottom: 1px solid #222;
                }
                .no-data {
                    text-align: center;
                    color: #888;
                    padding: 30px 0;
                }
                .modal-footer {
                    padding: 15px 20px;
                    border-top: 1px solid #333;
                    display: flex;
                    justify-content: flex-end;
                }
            `}</style>
        </div>
    );
};

export default MovementDetailsModal;
