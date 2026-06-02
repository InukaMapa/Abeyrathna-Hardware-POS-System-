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
                    background: rgba(15, 23, 42, 0.42);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2100;
                    backdrop-filter: blur(5px);
                }
                .movement-details-modal {
                    width: 90%;
                    max-width: 560px;
                    max-height: 70vh;
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
                    line-height: 1.25;
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
                    border-color: rgba(22, 163, 74, 0.36);
                }
                .modal-body {
                    padding: 22px 24px;
                    overflow-y: auto;
                    flex: 1;
                    background: #FFFFFF;
                }
                .movements-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    border: 1px solid #E5EFE9;
                    border-radius: 8px;
                    overflow: hidden;
                }
                .movements-table th {
                    text-align: left;
                    color: #526782;
                    background: #F8FCFA;
                    padding: 12px 14px;
                    font-size: 0.68rem;
                    font-weight: 600;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    border-bottom: 1px solid #E5EFE9;
                }
                .movements-table td {
                    padding: 13px 14px;
                    color: #132238;
                    border-bottom: 1px solid #EEF4F0;
                    font-size: 0.84rem;
                    font-weight: 400;
                }
                .movements-table tr:last-child td {
                    border-bottom: none;
                }
                .movements-table td:last-child {
                    font-weight: 500 !important;
                    color: #0F5132;
                }
                .no-data,
                .loading-spinner {
                    text-align: center;
                    color: #64748B;
                    padding: 46px 0;
                    font-size: 0.86rem;
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
                    border: 1px solid rgba(22, 163, 74, 0.25);
                    color: var(--dark-green) !important;
                    background: #FFFFFF !important;
                    font-size: 0.8rem;
                    font-weight: 500;
                    box-shadow: none !important;
                }
                .modal-footer .btn:hover {
                    background: #F8FCFA !important;
                    border-color: rgba(22, 163, 74, 0.42) !important;
                }
                @media (max-width: 640px) {
                    .movement-details-modal {
                        width: calc(100% - 32px);
                    }
                    .modal-header,
                    .modal-body,
                    .modal-footer {
                        padding-left: 18px;
                        padding-right: 18px;
                    }
                }
            `}</style>
        </div>
    );
};

export default MovementDetailsModal;
