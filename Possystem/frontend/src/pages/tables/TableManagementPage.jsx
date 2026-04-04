import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import TableQuickActions from '../../components/dashboard/create/table/TableQuickActions';

/**
 * TableManagementPage
 * Full-featured table creation and management page for restaurant POS
 * Integrates with backend API: POST/GET /api/tables
 */
const TableManagementPage = ({ onNavigate }) => {
    return (
        <DashboardLayout onNavigate={onNavigate} activePage="table-management">
            
            <TableQuickActions />
        </DashboardLayout>
    );
};

export default TableManagementPage;
