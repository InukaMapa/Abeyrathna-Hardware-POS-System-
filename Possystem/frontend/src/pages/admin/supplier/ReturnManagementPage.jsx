import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import {
    RefreshCcw, ArrowLeft, CheckCircle2, XCircle, CreditCard,
    FileText, Package, Calendar, Truck, AlertCircle, ArrowRight,
    TrendingDown, Info, ShieldCheck, DollarSign
} from 'lucide-react';
import { API_BASE_URL } from '../../../config/api';

const ReturnManagementPage = ({ onNavigate, returnId }) => {
    const [returnData, setReturnData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [resolution, setResolution] = useState('REFUND'); // REFUND, CREDIT_NOTE, REPLACEMENT
    const [processing, setProcessing] = useState(false);

    const [form, setForm] = useState({
        refund_amount: '',
        credit_note_number: `CRN-${Math.floor(100000 + Math.random() * 900000)}`,
        notes: ''
    });
    const [showReplacementModal, setShowReplacementModal] = useState(false);

    useEffect(() => {
        if (returnId) fetchReturnDetails();
    }, [returnId]);

    const fetchReturnDetails = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/inventory/returns`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const found = res.data.find(r => r.id === parseInt(returnId) || r.id === returnId);
            setReturnData(found);
            if (found) {
                setForm(prev => ({ ...prev, refund_amount: (parseFloat(found.quantity) * parseFloat(found.inventory?.buying_price || 0)).toFixed(2) }));
            }
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const handleResolve = async () => {
        if (!window.confirm(`Are you sure you want to resolve this return as ${resolution}?`)) return;
        setProcessing(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE_URL}/inventory/returns/${returnId}/resolve`, {
                resolution_type: resolution,
                refund_amount: form.refund_amount,
                credit_note_number: form.credit_note_number,
                notes: form.notes
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`Return Resolved Successfully! Status updated to COMPLETED (${resolution}).`);
            onNavigate('supplier-returns');
        } catch (err) {
            alert("Resolution failed: " + (err.response?.data?.message || err.message));
        }
        setProcessing(false);
    };

    if (loading) return <div className="h-screen bg-black flex items-center justify-center text-white/20">Loading Dossier...</div>;
    if (!returnData) return <div className="h-screen bg-black flex items-center justify-center text-white/20 uppercase tracking-widest">Return Not Found</div>;

    return (
        <DashboardLayout activePage="supplier-returns" onNavigate={onNavigate}>
            <div className="p-10 max-w-[1400px] mx-auto min-h-screen">
                {/* Top Nav */}
                <button
                    onClick={() => onNavigate('supplier-returns')}
                    className="flex items-center gap-2 text-white/40 hover:text-white transition-all mb-8 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Back to Return Registry</span>
                </button>

                <div className="grid grid-cols-12 gap-10">
                    {/* Left: Dossier Overview */}
                    <div className="col-span-4 space-y-8">
                        <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[40px] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>

                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-4 bg-[#D4AF37]/10 rounded-2xl">
                                    <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
                                </div>
                                <div>
                                    <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] block mb-1">Return List</span>
                                    <p className="text-[#D4AF37] text-[10px] font-black uppercase tracking-widest">{returnData.return_number}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Item & Quantity</p>
                                    <div className="bg-white/5 p-4 rounded-2xl">
                                        <p className="text-sm font-bold text-white">{returnData.inventory?.ingredient_name}</p>
                                        <p className="text-xl font-black text-red-500 mt-1">{returnData.quantity} Units</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-[11px]">
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <p className="text-white/20 uppercase text-[9px] mb-1 font-bold">Supplier</p>
                                        <p className="text-white font-bold">{returnData.suppliers?.supplier_name}</p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <p className="text-white/20 uppercase text-[9px] mb-1 font-bold">Batch REF</p>
                                        <p className="text-white font-bold">{returnData.inventory_batches?.batch_number}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl text-yellow-500/60">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">Issue: {returnData.return_type}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[40px] space-y-6">
                            <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-widest border-b border-white/5 pb-4">Internal Audit Trail</h3>
                            <div className="space-y-6 relative ml-2 border-l border-white/5 pl-6">
                                <div className="relative">
                                    <div className="absolute -left-[29px] top-0 w-2 h-2 bg-[#D4AF37] rounded-full ring-4 ring-[#D4AF37]/20"></div>
                                    <p className="text-[10px] font-black text-white uppercase">Created</p>
                                    <p className="text-[10px] text-white/30 uppercase mt-1">{new Date(returnData.created_at).toLocaleDateString()} @ {new Date(returnData.created_at).toLocaleTimeString()}</p>
                                </div>
                                <div className="relative">
                                    <div className="absolute -left-[29px] top-0 w-2 h-2 bg-white/20 rounded-full"></div>
                                    <p className="text-[10px] font-black text-white/20 uppercase">Awaiting Resolution</p>
                                    <p className="text-[10px] text-white/10 uppercase mt-1">Pending Approval</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Resolution Portal */}
                    <div className="col-span-8 space-y-8">
                        <div className="bg-[#111] border border-white/10 rounded-[50px] p-12 shadow-2xl relative overflow-hidden">
                            <div className="flex items-center justify-between mb-12">
                                <div>
                                    <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-1">Resolution Portal</h2>
                                    <p className="text-white/20 text-[10px] font-medium uppercase tracking-widest">Finalize return request outcome</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-3xl border border-white/5 flex flex-col items-end">
                                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Total Estimated Value</p>
                                    <p className="text-2xl font-black text-[#D4AF37]">Rs. {(parseFloat(returnData.quantity) * parseFloat(returnData.inventory?.buying_price || 0)).toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Resolution Options */}
                            <div className="grid grid-cols-3 gap-6 mb-12">
                                {[
                                    { id: 'REFUND', label: 'Refund Money', icon: DollarSign, desc: 'Create Cash-In Batch' },
                                    { id: 'CREDIT_NOTE', label: 'Give Credit Note', icon: FileText, desc: 'Add balance to Profile' },
                                    { id: 'REPLACEMENT', label: 'Replace Products', icon: RefreshCcw, desc: 'Restock new batch' }
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setResolution(opt.id)}
                                        className={`p-6 rounded-[34px] border-2 transition-all flex flex-col items-center text-center gap-4 group ${resolution === opt.id
                                            ? 'bg-[#D4AF37]/10 border-[#D4AF37] shadow-[0_0_40px_rgba(212,175,55,0.1)]'
                                            : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                                            }`}
                                    >
                                        <div className={`p-4 rounded-2xl transition-all ${resolution === opt.id ? 'bg-[#D4AF37] text-black scale-110' : 'bg-white/5 text-white/20'
                                            }`}>
                                            <opt.icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className={`text-xs font-black uppercase tracking-widest mb-1 ${resolution === opt.id ? 'text-[#D4AF37]' : 'text-white/40'
                                                }`}>{opt.label}</p>
                                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">{opt.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Dynamic Resolution Form */}
                            <div className="p-8 bg-white/[0.01] border border-white/5 rounded-[40px] space-y-8 animate-fade-in">
                                {resolution === 'REFUND' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h4 className="text-xs font-black text-white/40 uppercase tracking-[0.3em]">Financial Refund Setup</h4>
                                        </div>
                                        <div className="grid grid-cols-2 gap-8 font-bold">
                                            <div className="space-y-3">
                                                <label className="text-[10px] text-white/20 uppercase tracking-[0.2em] block">Refund Amount (Rs.)</label>
                                                <input
                                                    type="number"
                                                    value={form.refund_amount}
                                                    onChange={(e) => setForm({ ...form, refund_amount: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xl font-black text-white focus:outline-none focus:border-[#4caf50]"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] text-white/20 uppercase tracking-[0.2em] block">Batch Authorization</label>
                                                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between">
                                                    <span className="text-white/40 text-[10px]">RFB-GENERATED</span>
                                                    <span className="text-[10px] bg-[#4caf50]/10 text-[#4caf50] px-3 py-1 rounded-full animate-pulse">AUTO-LINK</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-[#4caf50]/5 border border-[#4caf50]/10 rounded-2xl">
                                            <p className="text-[10px] text-[#4caf50]/80 font-medium leading-relaxed italic">
                                                Once processed, this will create a "Refuind Batch" for the cashier. Status will become "Cash Refunded, Wait for Cashier Approval".
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {resolution === 'CREDIT_NOTE' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <FileText className="w-5 h-5 text-blue-500" />
                                            <h4 className="text-sm font-black text-white uppercase tracking-widest">Credit Note Issuance</h4>
                                        </div>
                                        <div className="grid grid-cols-2 gap-8 font-bold">
                                            <div className="space-y-3">
                                                <label className="text-[10px] text-white/20 uppercase tracking-[0.2em] block">Credit Note Number</label>
                                                <input
                                                    type="text"
                                                    value={form.credit_note_number}
                                                    readOnly
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-xl font-black text-white/40 focus:outline-none"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] text-white/20 uppercase tracking-[0.2em] block">Note Validity</label>
                                                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between">
                                                    <span className="text-white/40 text-xs">Indefinite</span>
                                                    <Calendar className="w-4 h-4 text-white/20" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl font-bold">
                                            <p className="text-[10px] text-blue-500/80 leading-relaxed italic uppercase tracking-tighter">
                                                This credit will be stored in the supplier profile and can be used for future procurements.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {resolution === 'REPLACEMENT' && (
                                    <div className="space-y-6 text-center py-10">
                                        <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <TrendingDown className="w-10 h-10 text-purple-500" />
                                        </div>
                                        <div className="max-w-md mx-auto">
                                            <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Inventory Restocking Workflow</h4>
                                            <p className="text-white/30 text-[11px] leading-relaxed mb-8">
                                                By selecting Replacement, you will approve the return and be redirected to create a new Inventory Batch to represent the incoming replacement items.
                                            </p>
                                            <button
                                                onClick={() => setShowReplacementModal(true)}
                                                className="bg-white/5 border border-white/10 px-8 py-4 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-3 mx-auto"
                                            >
                                                Initiate Replacement Batch
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3 pt-6 border-t border-white/5">
                                    <label className="text-[10px] text-white/20 uppercase tracking-[0.2em] block font-bold">Final Resolution Notes</label>
                                    <textarea
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm text-white focus:outline-none min-h-[120px] resize-none"
                                        placeholder="Add any specific details about this resolution..."
                                        value={form.notes}
                                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>

                            <div className="mt-12 flex gap-6">
                                <button
                                    disabled={processing}
                                    onClick={() => onNavigate('supplier-returns')}
                                    className="flex-1 py-6 border border-white/10 rounded-[24px] text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
                                >
                                    Cancel & Stay Pending
                                </button>
                                <button
                                    disabled={processing}
                                    onClick={handleResolve}
                                    className="flex-[2] py-6 bg-[#D4AF37] rounded-[24px] text-white text-[11px] font-black uppercase tracking-[0.3em] hover:bg-[#E5C158] transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(212,175,55,0.15)]"
                                >
                                    {processing ? 'Processing...' : 'Authorize Final Resolution'}
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Help Desk */}
                        <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[40px] flex items-center gap-6">
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                                <Info className="w-6 h-6 text-white/20" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Standard Operating Procedure</p>
                                <p className="text-[10px] text-white/10 font-bold leading-relaxed italic">
                                    Refunds require Cashier confirmation at the till. Credit Notes are immediate balance updates. Replacements create new inventory debt.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {showReplacementModal && (
                <ReplacementBatchModal
                    returnData={returnData}
                    onClose={() => setShowReplacementModal(false)}
                    onSuccess={async (newBatch) => {
                        // Mark return as resolved/completed
                        try {
                            const token = localStorage.getItem('token');
                            await axios.post(`${API_BASE_URL}/inventory/returns/${returnId}/resolve`, {
                                resolution_type: 'REPLACEMENT',
                                notes: `Replacement batch ${newBatch.batch_number} created.`
                            }, { headers: { Authorization: `Bearer ${token}` } });
                            setShowReplacementModal(false);
                            alert(`Replacement Batch ${newBatch.batch_number} created and Return finalized.`);
                            onNavigate('supplier-returns');
                        } catch (err) { alert("Failed to finalize return: " + err.message); }
                    }}
                />
            )}
        </DashboardLayout>
    );
};

const ReplacementBatchModal = ({ returnData, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [batchData] = useState({
        batch_number: 'REP-' + Math.floor(10000 + Math.random() * 90000),
        supplier_id: returnData.supplier_id,
        supplier_name: returnData.suppliers?.supplier_name,
        date: new Date().toISOString().split('T')[0],
        net_value: 0,
        items: 1, // Usually 1 item for replacement or the same line item
        item_name: returnData.inventory?.ingredient_name,
        quantity: returnData.quantity
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                batch_number: batchData.batch_number,
                supplier_id: batchData.supplier_id,
                batch_date: batchData.date,
                net_value: 0,
                total_items: 1,
                batch_type: 'REPLACEMENT',
                return_id: returnData.id
            };

            const response = await axios.post(`${API_BASE_URL}/inventory/batches`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            onSuccess(response.data);
        } catch (error) {
            console.error('Error creating replacement batch:', error);
            alert('Failed to create replacement batch.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay z-[5000]">
            <div className="bg-[#1A1A1A] w-full max-w-lg rounded-[40px] shadow-2xl border border-white/5 p-12 animate-scale-up relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>

                <div className="flex justify-between items-center mb-10 relative">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-widest">Replacement Batch</h2>
                        <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest mt-1">Authorized Restocking Session</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/20 hover:text-white transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8 relative">
                    <div className="p-6 bg-purple-500/5 border border-purple-500/10 rounded-3xl flex items-center gap-6">
                        <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center">
                            <RefreshCcw className="w-7 h-7 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-purple-500/60 uppercase tracking-widest">Resolution Item</p>
                            <p className="text-sm font-black text-white mt-1 uppercase">{batchData.item_name}</p>
                            <p className="text-xs font-bold text-white/30 mt-0.5">{batchData.quantity} Units | {batchData.supplier_name}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="form-group space-y-3">
                            <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">Batch Number</label>
                            <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs font-black text-white/40 tracking-widest">
                                {batchData.batch_number}
                            </div>
                        </div>
                        <div className="form-group space-y-3">
                            <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">Procurement Date</label>
                            <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs font-black text-white tracking-widest">
                                {batchData.date}
                            </div>
                        </div>
                    </div>

                    <div className="form-group space-y-3">
                        <label className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">Net Transaction Value</label>
                        <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xl font-black text-[#4caf50] tracking-tighter flex items-center justify-between">
                            <span>Rs. 0.00</span>
                            <span className="text-[9px] font-bold text-white/10 uppercase tracking-widest">Non-Monetary Replacement</span>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-6">
                        <button type="submit" disabled={loading} className="flex-1 py-5 bg-purple-600 text-white font-black rounded-3xl text-[10px] uppercase tracking-[0.2em] hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 active:scale-95">
                            {loading ? 'Finalizing...' : 'Authorize Replacement Batch'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReturnManagementPage;
