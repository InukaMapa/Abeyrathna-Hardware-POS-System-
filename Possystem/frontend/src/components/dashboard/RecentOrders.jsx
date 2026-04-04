import React from 'react';
import '../../styles/dashboard.css';

const RecentOrders = () => {
    const orders = [
        { staffId: '001', item: 'Chicken Fried Rice', category: 'Rice', price: 'Rs. 1,200.00', status: 'Active' },
        { staffId: '002', item: 'Chicken Kottu', category: 'Kottu', price: 'Rs. 1,000.00', status: 'Active' },
        { staffId: '003', item: 'BBQ Platter', category: 'BBQ', price: 'Rs. 3,500.00', status: 'Leave' }, // "Leave" status from user description example, though "Pending" might be more standard, sticking to user req.
        { staffId: '001', item: 'Mixed Fried Rice', category: 'Rice', price: 'Rs. 1,400.00', status: 'Active' },
        { staffId: '004', item: 'Cheese Kottu', category: 'Kottu', price: 'Rs. 1,300.00', status: 'Active' },
    ];

    return (
        <div className="recent-orders">
            <div className="section-title">Recent Orders</div>
            <table className="orders-table">
                <thead>
                    <tr>
                        <th>Staff ID</th>
                        <th>Item Name</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map((order, index) => (
                        <tr key={index}>
                            <td>{order.staffId}</td>
                            <td>{order.item}</td>
                            <td>{order.category}</td>
                            <td>{order.price}</td>
                            <td>
                                <span className={`status-badge ${order.status === 'Active' ? 'status-active' : 'status-leave'}`}>
                                    {order.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default RecentOrders;
