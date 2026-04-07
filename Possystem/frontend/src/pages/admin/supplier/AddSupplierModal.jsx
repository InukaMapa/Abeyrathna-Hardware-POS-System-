import React, { useState } from 'react';
import { X, Save, User, Building, Phone, RefreshCw } from 'lucide-react';
import '../../../styles/menu.css';
import { createSupplier, updateSupplier } from '../../../services/supplierService';

const AddSupplierModal = ({ onClose, onSuccess, initialData }) => {
    const isEditing = !!initialData;
    const [formData, setFormData] = useState(initialData || {
        supplier_id: `SUP-${Math.floor(1000 + Math.random() * 9000)}`, // Auto-generated ID
        supplier_name: '',
        company_name: '',
        phone_number: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (isEditing) {
                await updateSupplier(initialData.id, formData);
            } else {
                await createSupplier(formData);
            }
            onSuccess();
        } catch (err) {
            setError(err.message || 'Failed to save supplier');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ width: '500px', maxWidth: '95%' }}>
                <div className="modal-header">
                    <h2>{isEditing ? 'Edit Supplier' : 'Add Supplier'}</h2>
                    <button onClick={onClose} className="close-btn"><X className="w-5 h-5" /></button>
                </div>

                {error && (
                    <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-2 rounded-lg mt-4 text-sm">
                        {error}
                    </div>
                )}

                <div className="overflow-y-auto max-h-[60vh] custom-scrollbar pr-2 mt-4">
                    <form id="supplierForm" onSubmit={handleSubmit} className="space-y-4">
                        <div className="form-group">
                            <label>Supplier ID (Auto-generated)</label>
                            <input
                                type="text"
                                name="supplier_id"
                                value={formData.supplier_id}
                                readOnly
                                className="bg-[#1a1a1a] cursor-not-allowed text-[#888]"
                            />
                        </div>

                        <div className="form-group">
                            <label>Supplier Name (Person/Company) *</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    name="supplier_name"
                                    value={formData.supplier_name}
                                    onChange={handleChange}
                                    placeholder="Enter Name"
                                    style={{ paddingLeft: '40px' }}
                                />
                                <User className="absolute left-3 top-2.5 text-[#666] w-4 h-4 pointer-events-none" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Company Name</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="company_name"
                                    value={formData.company_name}
                                    onChange={handleChange}
                                    placeholder="Enter Company Name"
                                    style={{ paddingLeft: '40px' }}
                                />
                                <Building className="absolute left-3 top-2.5 text-[#666] w-4 h-4 pointer-events-none" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Phone Number *</label>
                            <div className="relative">
                                <input
                                    type="tel"
                                    required
                                    name="phone_number"
                                    value={formData.phone_number}
                                    onChange={handleChange}
                                    placeholder="Enter Phone Number"
                                    style={{ paddingLeft: '40px' }}
                                />
                                <Phone className="absolute left-3 top-2.5 text-[#666] w-4 h-4 pointer-events-none" />
                            </div>
                        </div>
                    </form>
                </div>

                <div className="modal-actions mt-6">
                    <button onClick={onClose} className="btn-secondary">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="supplierForm"
                        disabled={loading}
                        className="btn-primary flex items-center gap-2 "
                    >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isEditing ? 'Update Supplier' : 'Save Supplier'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddSupplierModal;
