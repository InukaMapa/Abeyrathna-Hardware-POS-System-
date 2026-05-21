import React, { useEffect,  useState } from 'react';
import { X, Save, User, Building, Phone, RefreshCw, Bookmark, AlertCircle, Mail, MapPin } from 'lucide-react';
import '../../../styles/menu.css';
import { createSupplier, updateSupplier } from '../../../services/supplierService';

const AddSupplierModal = ({ onClose, onSuccess, initialData }) => {
    const isEditing = !!initialData;
    const [formData, setFormData] = useState(initialData || {
        supplier_id: `SUP-${Math.floor(1000 + Math.random() * 9000).toString()}`, // Auto-generated ID
        supplier_name: '',
        company_name: '',
        phone_number: '',
        email: '',
        address: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

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
            console.error('Error saving supplier:', err);
            setError(err.message || 'Failed to save supplier. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-md">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[24px] shadow-2xl overflow-hidden animate-slide-up relative">

                <div className="p-6 flex justify-between items-center bg-[#C1DFCD] shrink-0 border-b-0">
                    <div className="flex items-center gap-3">
                        <Bookmark className="w-5 h-5 text-green-800" />
                        <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">
                            {isEditing ? 'Update Partner Profile' : 'New Supplier Registration'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-green-700 text-white hover:bg-green-800 rounded-xl transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {error && (
                    <div className="mx-8 mt-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-bold uppercase tracking-tight">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <div className="max-h-[60vh] overflow-y-auto p-8 pt-6 space-y-6 custom-scrollbar">
                    <form id="supplierForm" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Registration ID */}
                            <div className="bg-[#F3F9F5] p-4 rounded-2xl border border-green-200 flex justify-between items-center md:col-span-2">
                                <div>
                                    <label className="text-[9px] font-bold text-green-700 uppercase tracking-widest block mb-1">REGISTRATION ID</label>
                                    <span className="text-sm font-mono text-gray-900 font-bold">{formData.supplier_id}</span>
                                </div>
                                <div className="text-[9px] font-black text-green-700 bg-green-100 px-2 py-1 rounded border border-green-200 uppercase">Immutable Registry</div>
                            </div>

                            {/* Supplier Name */}
                            <div>
                                <label className="text-[11px] font-bold text-green-800 mb-2 block">Representative Name *</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors w-5 h-5" />
                                    <input
                                        type="text"
                                        required
                                        name="supplier_name"
                                        value={formData.supplier_name}
                                        onChange={handleChange}
                                        placeholder="Full Name of Contact"
                                        className="w-full bg-white border border-green-200 rounded-xl pl-12 pr-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            {/* Organization Name */}
                            <div>
                                <label className="text-[11px] font-bold text-green-800 mb-2 block">Company / Brand</label>
                                <div className="relative group">
                                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors w-5 h-5" />
                                    <input
                                        type="text"
                                        name="company_name"
                                        value={formData.company_name}
                                        onChange={handleChange}
                                        placeholder="Business Entity Name"
                                        className="w-full bg-white border border-green-200 rounded-xl pl-12 pr-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            {/* Phone Number */}
                            <div>
                                <label className="text-[11px] font-bold text-green-800 mb-2 block">Phone Number *</label>
                                <div className="relative group">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors w-5 h-5" />
                                    <input
                                        type="tel"
                                        required
                                        name="phone_number"
                                        value={formData.phone_number}
                                        onChange={handleChange}
                                        placeholder="+94 7X XXX XXXX"
                                        className="w-full bg-white border border-green-200 rounded-xl pl-12 pr-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all font-mono font-medium"
                                    />
                                </div>
                            </div>

                            {/* Email Address */}
                            <div>
                                <label className="text-[11px] font-bold text-green-800 mb-2 block">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors w-5 h-5" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="partner@company.com"
                                        className="w-full bg-white border border-green-200 rounded-xl pl-12 pr-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all font-medium"
                                    />
                                </div>
                            </div>

                            {/* Physical Address */}
                            <div className="md:col-span-2">
                                <label className="text-[11px] font-bold text-green-800 mb-2 block">Warehouse / Office Address</label>
                                <div className="relative group">
                                    <MapPin className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-green-600 transition-colors w-5 h-5" />
                                    <textarea
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="Full Physical Location"
                                        rows="2"
                                        className="w-full bg-white border border-green-200 rounded-xl pl-12 pr-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all resize-none font-medium"
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-6 bg-white flex justify-end gap-4 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl border border-gray-300 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all"
                    >
                        Discard
                    </button>
                    <button
                        type="submit"
                        form="supplierForm"
                        disabled={loading}
                        className="px-6 py-3 rounded-xl bg-green-700 text-white font-bold text-sm hover:bg-green-800 transition-all shadow-md flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isEditing ? 'COMMIT UPDATES' : 'FINALISE REGISTRATION'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddSupplierModal;
