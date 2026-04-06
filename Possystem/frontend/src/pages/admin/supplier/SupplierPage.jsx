import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import AddSupplierModal from './AddSupplierModal';
import { Plus, Search, User, Mail, Phone, Building, Trash2, Edit } from 'lucide-react';
import '../../../styles/dashboard.css';

const SupplierPage = ({ onNavigate }) => {
    const [suppliers, setSuppliers] = useState([
        {
            supplier_id: 'SUP-1001',
            supplier_name: 'John Doe',
            company_name: 'DSI Hardware',
            phone_number: '011-222-3333'
        },
        {
            supplier_id: 'SUP-1002',
            supplier_name: 'Jane Smith',
            company_name: 'Tech Solutions',
            phone_number: '011-444-5555'
        }
    ]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setAddModalOpen] = useState(false);

    const filteredSuppliers = suppliers.filter(supplier =>
        supplier.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.supplier_id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddSupplier = (newSupplier) => {
        setSuppliers([...suppliers, newSupplier]);
        setAddModalOpen(false);
    };

    return (
        <DashboardLayout onNavigate={onNavigate} activePage="supplier">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="section-title mb-0">Supplier Management</h2>
                    <p className="text-[#A0A0A0] text-sm ml-3 mt-1">Manage all your hardware suppliers here.</p>
                </div>
                <button
                    onClick={() => setAddModalOpen(true)}
                    className="flex-1 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 bg-[#D32F2F] text-white hover:bg-[#B71C1C]"
                    style={{ maxWidth: '200px' }}
                >
                    <Plus className="w-4 h-4" /> Add New Supplier
                </button>
            </div>

            <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-[#666] w-5 h-5 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search by ID, Name or Company"
                        className="search-input bg-[#1E1E1E] text-white pl-10 pr-4 py-2 rounded-lg border border-[#333] w-full focus:outline-none focus:border-[#D4AF37]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ marginLeft: 0 }}
                    />
                </div>
            </div>

            <div className="recent-orders">
                <table className="orders-table">
                    <thead>
                        <tr>
                            <th>Supplier ID</th>
                            <th>Supplier Name</th>
                            <th>Company Name</th>
                            <th>Phone Number</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSuppliers.length > 0 ? (
                            filteredSuppliers.map((supplier) => (
                                <tr key={supplier.supplier_id}>
                                    <td><span className="text-[#D4AF37] font-medium">{supplier.supplier_id}</span></td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-[#A0A0A0]" />
                                            <span>{supplier.supplier_name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <Building className="w-4 h-4 text-[#A0A0A0]" />
                                            <span>{supplier.company_name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-[#A0A0A0]" />
                                            <span>{supplier.phone_number}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex gap-3">
                                            <button className="text-[#A0A0A0] hover:text-[#D4AF37] transition-colors"><Edit className="w-4 h-4" /></button>
                                            <button className="text-[#A0A0A0] hover:text-[#D32F2F] transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="text-center py-8 text-[#A0A0A0]">No suppliers found matching your search.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isAddModalOpen && (
                <AddSupplierModal
                    onClose={() => setAddModalOpen(false)}
                    onSuccess={handleAddSupplier}
                />
            )}
        </DashboardLayout>
    );
};

export default SupplierPage;
