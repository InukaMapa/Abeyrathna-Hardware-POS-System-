import React, { useState } from 'react';
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
        <div className="modal-overlay z-[2000] backdrop-blur-md bg-black/60 p-4 sm:p-0 flex items-center justify-center">
            <div className="bg-[#1E1E1E] w-[800px] max-w-[95%] max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border border-[#333] overflow-hidden animate-scale-up relative">

                {/* Decorative Accent */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#D4AF37] to-[#8c6f1d]"></div>

                <div className="p-8 border-b border-[#333] flex justify-between items-center bg-emerald-800/30">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#D4AF37]/10 p-2 rounded-lg">
                            <Bookmark className="w-5 h-5 text-[#D4AF37]" />
                        </div>
                        <h2 className="text-xl font-black text-white uppercase tracking-wider">
                            {isEditing ? 'Update Partner Profile' : 'New Supplier Registration'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-[#121212] text-[#444] hover:text-white rounded-full border border-[#333] transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {error && (
                    <div className="mx-8 mt-6 bg-[#ff5252]/10 border border-[#ff5252]/20 text-[#ff5252] px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-bold uppercase tracking-tight">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <div className="max-h-[60vh] overflow-y-auto p-8 pt-6 space-y-6 custom-scrollbar">
                    <form id="supplierForm" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Registration ID */}
                            <div className="bg-[#121212] p-4 rounded-2xl border border-[#333] flex justify-between items-center md:col-span-2">
                                <div>
                                    <label className="text-[10px] font-black text-[#444] uppercase tracking-widest block mb-1">REGISTRATION ID</label>
                                    <span className="text-sm font-mono text-[#D4AF37] font-bold">{formData.supplier_id}</span>
                                </div>
                                <div className="text-[9px] font-black text-[#666] bg-[#333]/30 px-2 py-1 rounded border border-[#333] uppercase">Immutable Registry</div>
                            </div>

                            {/* Supplier Name */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[#666] uppercase tracking-[0.2em] ml-1">Representative Name *</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#666] group-focus-within:text-[#D4AF37] transition-colors w-5 h-5" />
                                    <input
                                        type="text"
                                        required
                                        name="supplier_name"
                                        value={formData.supplier_name}
                                        onChange={handleChange}
                                        placeholder="Full Name of Contact"
                                        className="w-full bg-[#121212] text-white pl-12 pr-4 py-4 rounded-2xl border border-[#333] focus:border-[#D4AF37]/50 focus:outline-none transition-all text-sm font-bold placeholder:text-[#666]"
                                    />
                                </div>
                            </div>

                            {/* Organization Name */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[#666] uppercase tracking-[0.2em] ml-1">Company / Brand</label>
                                <div className="relative group">
                                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-[#666] group-focus-within:text-[#D4AF37] transition-colors w-5 h-5" />
                                    <input
                                        type="text"
                                        name="company_name"
                                        value={formData.company_name}
                                        onChange={handleChange}
                                        placeholder="Business Entity Name"
                                        className="w-full bg-[#121212] text-white pl-12 pr-4 py-4 rounded-2xl border border-[#333] focus:border-[#D4AF37]/50 focus:outline-none transition-all text-sm font-bold placeholder:text-[#666]"
                                    />
                                </div>
                            </div>

                            {/* Phone Number */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[#666] uppercase tracking-[0.2em] ml-1">Phone Number *</label>
                                <div className="relative group">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#666] group-focus-within:text-[#D4AF37] transition-colors w-5 h-5" />
                                    <input
                                        type="tel"
                                        required
                                        name="phone_number"
                                        value={formData.phone_number}
                                        onChange={handleChange}
                                        placeholder="+94 7X XXX XXXX"
                                        className="w-full bg-[#121212] text-white pl-12 pr-4 py-4 rounded-2xl border border-[#333] focus:border-[#D4AF37]/50 focus:outline-none transition-all text-sm font-mono font-bold placeholder:text-[#666]"
                                    />
                                </div>
                            </div>

                            {/* Email Address */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-[#666] uppercase tracking-[0.2em] ml-1">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#666] group-focus-within:text-[#D4AF37] transition-colors w-5 h-5" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="partner@company.com"
                                        className="w-full bg-[#121212] text-white pl-12 pr-4 py-4 rounded-2xl border border-[#333] focus:border-[#D4AF37]/50 focus:outline-none transition-all text-sm font-bold placeholder:text-[#666]"
                                    />
                                </div>
                            </div>

                            {/* Physical Address */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[10px] font-black text-[#666] uppercase tracking-[0.2em] ml-1">Warehouse / Office Address</label>
                                <div className="relative group">
                                    <MapPin className="absolute left-4 top-5 text-[#666] group-focus-within:text-[#D4AF37] transition-colors w-5 h-5" />
                                    <textarea
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="Full Physical Location"
                                        rows="2"
                                        className="w-full bg-[#121212] text-white pl-12 pr-4 py-4 rounded-2xl border border-[#333] focus:border-[#D4AF37]/50 focus:outline-none transition-all text-sm font-bold placeholder:text-[#666] resize-none"
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-8 bg-[#121212] flex gap-4 border-t border-[#333]">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 bg-[#1E1E1E] text-white hover:bg-[#333] rounded-2xl text-[10px] font-black uppercase tracking-widest border border-[#333] transition-all"
                    >
                        Discard
                    </button>
                    <button
                        type="submit"
                        form="supplierForm"
                        disabled={loading}
                        className="flex-[2] py-4 bg-[#D4AF37] hover:bg-[#E5C158] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-[#D4AF37]/10 flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
                    >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4 text-white" />}
                        {isEditing ? 'COMMIT UPDATES' : 'FINALISE REGISTRATION'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddSupplierModal;
