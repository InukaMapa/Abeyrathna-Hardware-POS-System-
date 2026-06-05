import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    Clock,
    Package,
    RefreshCw,
    Search,
    Truck
} from 'lucide-react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { API_BASE_URL } from '../../../config/api';
import '../../../styles/dashboard.css';

const currency = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

const formatDate = (value) => {
    if (!value) return 'Not recorded';
    return new Date(value).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

const getPurchaseDate = (batch) => {
    const rawDate = batch.batch_date || batch.created_at;
    if (!rawDate) return null;

    const date = new Date(rawDate);
    return Number.isNaN(date.getTime()) ? null : date;
};

const isSameDay = (date, comparisonDate) => (
    date.getFullYear() === comparisonDate.getFullYear()
    && date.getMonth() === comparisonDate.getMonth()
    && date.getDate() === comparisonDate.getDate()
);

const matchesDateFilter = (date, filter) => {
    if (filter === 'all') return true;
    if (!date) return false;

    const today = new Date();

    if (filter === 'today') {
        return isSameDay(date, today);
    }

    if (filter === 'month') {
        return date.getFullYear() === today.getFullYear()
            && date.getMonth() === today.getMonth();
    }

    if (filter === 'year') {
        return date.getFullYear() === today.getFullYear();
    }

    return true;
};

const getBatchItems = (batch) => {
    const grouped = (batch.inventory_batch_items || []).reduce((acc, item) => {
        const key = item.inventory_id || item.inventory?.ingredient_name || item.id;
        const price = Number(item.buying_price_at_time || 0);

        if (!acc[key]) {
            acc[key] = {
                name: item.inventory?.ingredient_name || 'Unknown item',
                unit: item.inventory?.unit || 'units',
                qty: 0,
                price
            };
        }

        acc[key].qty += Number(item.quantity_added || 0);
        return acc;
    }, {});

    return Object.values(grouped).map((item) => ({
        ...item,
        total: item.qty * item.price
    }));
};

const RecentPurchasesPage = ({ onNavigate }) => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [dateFilter, setDateFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('newest');

    const fetchPurchases = async () => {
        try {
            setLoading(true);
            setError('');
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/inventory/batches`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBatches(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error('Failed to load recent purchases:', err);
            setError('Unable to load purchase records right now.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPurchases();
    }, []);

    const rows = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return batches
            .map((batch) => {
                const netValue = Number(batch.net_value || batch.actual_transaction_value || 0);
                const paidAmount = Number(batch.paid_amount || 0);
                const dueAmount = Math.max(netValue - paidAmount, 0);
                const items = getBatchItems(batch);
                const supplierName = batch.supplier_name || batch.suppliers?.supplier_name || 'Unknown supplier';
                const status = paidAmount >= netValue && netValue > 0 ? 'PAID' : (batch.payment_status || 'PENDING');

                return {
                    ...batch,
                    supplierName,
                    netValue,
                    paidAmount,
                    dueAmount,
                    items,
                    purchaseDate: getPurchaseDate(batch),
                    paymentStatus: status,
                    batchStatus: batch.calc_status || batch.status || 'PENDING'
                };
            })
            .filter((batch) => {
                if (!normalizedSearch) return true;
                const itemText = batch.items.map((item) => item.name).join(' ');
                return [
                    batch.batch_number,
                    batch.supplierName,
                    batch.paymentStatus,
                    batch.batchStatus,
                    itemText
                ].join(' ').toLowerCase().includes(normalizedSearch);
            })
            .filter((batch) => matchesDateFilter(batch.purchaseDate, dateFilter))
            .sort((firstBatch, secondBatch) => {
                const firstDate = firstBatch.purchaseDate?.getTime() || 0;
                const secondDate = secondBatch.purchaseDate?.getTime() || 0;
                return sortOrder === 'oldest' ? firstDate - secondDate : secondDate - firstDate;
            });
    }, [batches, dateFilter, search, sortOrder]);

    const totals = useMemo(() => rows.reduce((acc, batch) => ({
        purchases: acc.purchases + 1,
        totalValue: acc.totalValue + batch.netValue,
        totalDue: acc.totalDue + batch.dueAmount
    }), { purchases: 0, totalValue: 0, totalDue: 0 }), [rows]);

    return (
        <DashboardLayout onNavigate={onNavigate} activePage="supplier">
            <div className="recent-purchases-page">
                <div className="recent-purchases-header">
                    <div>
                        <button className="recent-purchases-link-btn" onClick={() => onNavigate('supplier')}>
                            <ArrowLeft size={16} />
                            Back to Supplier
                        </button>
                        <p className="recent-purchases-eyebrow">Procurement Register</p>
                        <h1>Recent Purchases</h1>
                        <span>Review supplier batches, purchased items, payment status, and settlement balances.</span>
                    </div>
                    <button className="recent-purchases-primary-btn" onClick={fetchPurchases}>
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                </div>

                <div className="recent-purchases-stats">
                    <div>
                        <Package size={20} />
                        <span>Total Purchases</span>
                        <strong>{totals.purchases}</strong>
                    </div>
                    <div>
                        <CheckCircle2 size={20} />
                        <span>Total Value</span>
                        <strong>{currency(totals.totalValue)}</strong>
                    </div>
                    <div>
                        <Clock size={20} />
                        <span>Outstanding</span>
                        <strong>{currency(totals.totalDue)}</strong>
                    </div>
                </div>

                <div className="recent-purchases-panel">
                    <div className="recent-purchases-toolbar">
                        <div>
                            <p>Purchase Details</p>
                            <span>Supplier name and full batch item details are shown below.</span>
                        </div>
                        <div className="recent-purchases-controls">
                            <label className="recent-purchases-select">
                                <CalendarDays size={18} />
                                <select
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    aria-label="Filter purchases by date"
                                >
                                    <option value="all">All time</option>
                                    <option value="today">Today</option>
                                    <option value="month">This month</option>
                                    <option value="year">This year</option>
                                </select>
                            </label>
                            <label className="recent-purchases-select">
                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                    aria-label="Sort purchases"
                                >
                                    <option value="newest">Newest first</option>
                                    <option value="oldest">Oldest first</option>
                                </select>
                            </label>
                            <label className="recent-purchases-search">
                                <Search size={18} />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search supplier, batch, item..."
                                />
                            </label>
                        </div>
                    </div>

                    {error && <div className="recent-purchases-message error">{error}</div>}
                    {loading && <div className="recent-purchases-message">Loading purchase records...</div>}

                    {!loading && !error && (
                        <div className="recent-purchases-table-wrap">
                            <table className="recent-purchases-table">
                                <thead>
                                    <tr>
                                        <th>Batch</th>
                                        <th>Supplier</th>
                                        <th>Purchase Details</th>
                                        <th>Date</th>
                                        <th>Value</th>
                                        <th>Paid</th>
                                        <th>Due</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="recent-purchases-empty">
                                                No purchase records found.
                                            </td>
                                        </tr>
                                    ) : rows.map((batch) => (
                                        <tr key={batch.id || batch.batch_number}>
                                            <td>
                                                <strong>{batch.batch_number || 'No batch number'}</strong>
                                                <span>{batch.batchStatus}</span>
                                            </td>
                                            <td>
                                                <div className="recent-purchases-supplier">
                                                    <Truck size={16} />
                                                    <strong>{batch.supplierName}</strong>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="recent-purchases-items">
                                                    {batch.items.length === 0 ? (
                                                        <span className="recent-purchases-muted">No item rows recorded</span>
                                                    ) : batch.items.map((item) => (
                                                        <div key={`${batch.id}-${item.name}`} className="recent-purchases-item-line">
                                                            <strong>{item.name}</strong>
                                                            <span>
                                                                {item.qty.toLocaleString()} {item.unit} x {currency(item.price)} = {currency(item.total)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="recent-purchases-date">
                                                    <CalendarDays size={15} />
                                                    {formatDate(batch.batch_date || batch.created_at)}
                                                </div>
                                            </td>
                                            <td>{currency(batch.netValue)}</td>
                                            <td>{currency(batch.paidAmount)}</td>
                                            <td className={batch.dueAmount > 0 ? 'recent-purchases-due' : ''}>{currency(batch.dueAmount)}</td>
                                            <td>
                                                <span className={`recent-purchases-status ${batch.paymentStatus === 'PAID' ? 'paid' : 'pending'}`}>
                                                    {batch.paymentStatus === 'PAID' ? 'Paid' : 'Pending'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default RecentPurchasesPage;
