import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import {
    RefreshCcw, ArrowLeft,
    FileText, Calendar, AlertCircle, ArrowRight,
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
        if (returnData?.status !== 'PENDING') {
            alert('This return has already been processed.');
            return;
        }
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

    if (loading) return <div className="h-screen bg-[#F5FAF7] flex items-center justify-center text-sm font-semibold text-gray-700">Loading return details...</div>;
    if (!returnData) return <div className="h-screen bg-[#F5FAF7] flex items-center justify-center text-sm font-semibold text-gray-700">Return not found</div>;

    const isPendingReturn = returnData.status === 'PENDING';
    const statusLabel = isPendingReturn ? 'Pending Approval' : `Already Returned (${returnData.status || 'Processed'})`;

    return (
        <DashboardLayout activePage="supplier-returns" onNavigate={onNavigate}>
            <div className="p-6 max-w-[1320px] mx-auto min-h-screen text-gray-950">
                {/* Top Nav */}
                <button
                    title="Back to returns"
                    onClick={() => onNavigate('supplier-returns')}
                    className="return-management-back-btn mb-5 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Return Registry</span>
                </button>

                <div className="grid grid-cols-12 gap-5">
                    {/* Left: Dossier Overview */}
                    <div className="col-span-4 space-y-5">
                        <div className="p-5 bg-white border border-green-100 rounded-lg shadow-sm relative overflow-hidden group">

                            <div className="flex items-center gap-3 mb-5">
                                <div className="p-2.5 bg-green-50 rounded-lg border border-green-100">
                                    <ShieldCheck className="w-5 h-5 text-green-700" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">Return Record</span>
                                    <p className="text-sm font-bold text-gray-950">{returnData.return_number}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Item & Quantity</p>
                                    <div className="bg-[#F7FBF8] p-4 rounded-lg border border-green-100">
                                        <p className="text-sm font-bold text-gray-950">{returnData.inventory?.ingredient_name}</p>
                                        <p className="text-lg font-bold text-green-700 mt-1">{returnData.quantity} Units</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="p-3 bg-white rounded-lg border border-gray-200">
                                        <p className="text-gray-500 uppercase text-[10px] mb-1 font-bold">Supplier</p>
                                        <p className="text-gray-950 font-semibold">{returnData.suppliers?.supplier_name}</p>
                                    </div>
                                    <div className="p-3 bg-white rounded-lg border border-gray-200">
                                        <p className="text-gray-500 uppercase text-[10px] mb-1 font-bold">Batch Ref</p>
                                        <p className="text-gray-950 font-semibold">{returnData.inventory_batches?.batch_number}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-xs font-semibold">Issue: {returnData.return_type}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 bg-white border border-green-100 rounded-lg shadow-sm space-y-5">
                            <h3 className="text-xs font-bold text-gray-950 border-b border-gray-200 pb-3">Internal Audit Trail</h3>
                            <div className="space-y-5 relative ml-2 border-l border-green-100 pl-5">
                                <div className="relative">
                                    <div className="absolute -left-[25px] top-1 w-2 h-2 bg-green-600 rounded-full ring-4 ring-green-100"></div>
                                    <p className="text-xs font-bold text-gray-950">Created</p>
                                    <p className="text-xs text-gray-600 mt-1">{new Date(returnData.created_at).toLocaleDateString()} @ {new Date(returnData.created_at).toLocaleTimeString()}</p>
                                </div>
                                <div className="relative">
                                    <div className="absolute -left-[25px] top-1 w-2 h-2 bg-amber-500 rounded-full ring-4 ring-amber-100"></div>
                                    <p className="text-xs font-bold text-gray-950">{isPendingReturn ? 'Awaiting Resolution' : 'Return Processed'}</p>
                                    <p className="text-xs text-gray-600 mt-1">{statusLabel}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Resolution Portal */}
                    <div className="col-span-8 space-y-5">
                        <div className="bg-white border border-green-100 rounded-lg p-6 shadow-sm relative overflow-hidden">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-950 mb-1">Resolution Portal</h2>
                                    <p className="text-xs font-medium text-gray-500">
                                        {isPendingReturn ? 'Finalize the supplier return request outcome.' : 'This return has already been processed.'}
                                    </p>
                                </div>
                                <div className="bg-[#F7FBF8] p-3 rounded-lg border border-green-100 flex flex-col items-end">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Estimated Value</p>
                                    <p className="text-lg font-bold text-green-800">Rs. {(parseFloat(returnData.quantity) * parseFloat(returnData.inventory?.buying_price || 0)).toLocaleString()}</p>
                                </div>
                            </div>

                            {!isPendingReturn && (
                                <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                                    <p className="text-sm font-bold text-green-800">Already Returned</p>
                                    <p className="mt-1 text-xs font-medium text-green-700">
                                        This return is no longer pending, so another refund, credit note, or replacement cannot be created from it.
                                    </p>
                                </div>
                            )}

                            {/* Resolution Options */}
                            <div className="grid grid-cols-3 gap-3 mb-6">
                                {[
                                    { id: 'REFUND', label: 'Refund Money', icon: DollarSign, desc: 'Create Cash-In Batch' },
                                    { id: 'CREDIT_NOTE', label: 'Give Credit Note', icon: FileText, desc: 'Add balance to Profile' },
                                    { id: 'REPLACEMENT', label: 'Replace Products', icon: RefreshCcw, desc: 'Restock new batch' }
                                ].map(opt => (
                                    <button
                                        title={opt.label}
                                        key={opt.id}
                                        disabled={!isPendingReturn}
                                        onClick={() => setResolution(opt.id)}
                                        className={`return-resolution-btn ${resolution === opt.id ? 'return-resolution-btn-active' : ''} ${!isPendingReturn ? 'return-resolution-btn-disabled' : ''}`}
                                    >
                                        <div className="return-resolution-icon">
                                            <opt.icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold">{opt.label}</p>
                                            <p className="text-[10px] font-semibold">{opt.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Dynamic Resolution Form */}
                            <div className="p-5 bg-[#F7FBF8] border border-green-100 rounded-lg space-y-5 animate-fade-in">
                                {resolution === 'REFUND' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h4 className="text-sm font-bold text-gray-950">Financial Refund Setup</h4>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 font-semibold">
                                            <div className="space-y-3">
                                                <label className="text-xs text-gray-600 block">Refund Amount (Rs.)</label>
                                                <input
                                                    type="number"
                                                    disabled={!isPendingReturn}
                                                    value={form.refund_amount}
                                                    onChange={(e) => setForm({ ...form, refund_amount: e.target.value })}
                                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-950 focus:outline-none focus:border-green-600"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-xs text-gray-600 block">Batch Authorization</label>
                                                <div className="bg-white border border-gray-200 px-3 py-2.5 rounded-lg flex items-center justify-between">
                                                    <span className="text-gray-700 text-xs font-semibold">RFB-GENERATED</span>
                                                    <span className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-100">AUTO-LINK</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
                                            <p className="text-xs text-green-800 font-medium leading-relaxed">
                                                Once processed, this will create a refund batch for the cashier. Status will become Cash Refunded, Wait for Cashier Approval.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {resolution === 'CREDIT_NOTE' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <FileText className="w-5 h-5 text-blue-500" />
                                            <h4 className="text-sm font-bold text-gray-950">Credit Note Issuance</h4>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 font-semibold">
                                            <div className="space-y-3">
                                                <label className="text-xs text-gray-600 block">Credit Note Number</label>
                                                <input
                                                    type="text"
                                                    value={form.credit_note_number}
                                                    readOnly
                                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-700 focus:outline-none"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-xs text-gray-600 block">Note Validity</label>
                                                <div className="bg-white border border-gray-200 px-3 py-2.5 rounded-lg flex items-center justify-between">
                                                    <span className="text-gray-700 text-xs font-semibold">Indefinite</span>
                                                    <Calendar className="w-4 h-4 text-gray-500" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg font-semibold">
                                            <p className="text-xs text-blue-800 leading-relaxed">
                                                This credit will be stored in the supplier profile and can be used for future procurements.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {resolution === 'REPLACEMENT' && (
                                    <div className="space-y-4 text-center py-5">
                                        <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center mx-auto mb-3 border border-purple-100">
                                            <TrendingDown className="w-6 h-6 text-purple-600" />
                                        </div>
                                        <div className="max-w-md mx-auto">
                                            <h4 className="text-sm font-bold text-gray-950 mb-2">Inventory Restocking Workflow</h4>
                                            <p className="text-xs text-gray-600 leading-relaxed mb-5">
                                                By selecting Replacement, you will approve the return and be redirected to create a new Inventory Batch to represent the incoming replacement items.
                                            </p>
                                            <button
                                                title="Initiate replacement batch"
                                                disabled={!isPendingReturn}
                                                onClick={() => setShowReplacementModal(true)}
                                                className="bg-[#7C3AED] border border-[#7C3AED] px-4 py-2 rounded-lg text-xs font-semibold text-white hover:bg-[#6D28D9] transition-all flex items-center gap-2 mx-auto"
                                            >
                                                Initiate Replacement Batch
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3 pt-5 border-t border-green-100">
                                    <label className="text-xs text-gray-600 block font-semibold">Final Resolution Notes</label>
                                    <textarea
                                        disabled={!isPendingReturn}
                                        className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-950 focus:outline-none focus:border-green-600 min-h-[100px] resize-none placeholder:text-gray-400"
                                        placeholder="Add any specific details about this resolution..."
                                        value={form.notes}
                                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>

                            <div className="mt-5 flex gap-3">
                                <button
                                    title="Cancel and return"
                                    disabled={processing}
                                    onClick={() => onNavigate('supplier-returns')}
                                    className="return-management-secondary-btn"
                                >
                                    Cancel & Stay Pending
                                </button>
                                {isPendingReturn ? (
                                    <button
                                        title="Authorize final resolution"
                                        disabled={processing}
                                        onClick={handleResolve}
                                        className="return-management-primary-btn"
                                    >
                                        {processing ? 'Processing...' : 'Authorize Final Resolution'}
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <button
                                        title="Already returned"
                                        disabled
                                        className="return-management-complete-btn"
                                    >
                                        Already Returned
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Help Desk */}
                        <div className="p-4 bg-white border border-green-100 rounded-lg flex items-center gap-4 shadow-sm">
                            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center border border-green-100">
                                <Info className="w-5 h-5 text-green-700" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-950 mb-1">Standard Operating Procedure</p>
                                <p className="text-xs text-gray-600 font-medium leading-relaxed">
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
        <div className="fixed inset-0 z-[5000] backdrop-blur-sm bg-black/40 p-4 sm:p-0 flex items-center justify-center">
            <div className="bg-white w-full max-w-lg max-h-[90vh] flex flex-col rounded-lg shadow-2xl border border-green-100 overflow-hidden animate-scale-up relative">
                <div className="overflow-y-auto p-6 w-full custom-scrollbar relative z-10 text-gray-950">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-gray-950">Replacement Batch</h2>
                            <p className="text-xs text-gray-500 font-medium mt-1">Authorized restocking session</p>
                        </div>
                    <button title="Close replacement batch" onClick={onClose} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-950 border border-gray-200 transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 relative">
                    <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg flex items-center gap-4">
                        <div className="w-11 h-11 bg-white rounded-lg border border-purple-100 flex items-center justify-center">
                            <RefreshCcw className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">Resolution Item</p>
                            <p className="text-sm font-bold text-gray-950 mt-1">{batchData.item_name}</p>
                            <p className="text-xs font-medium text-gray-600 mt-0.5">{batchData.quantity} Units | {batchData.supplier_name}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group space-y-2">
                            <label className="text-xs font-semibold text-gray-600">Batch Number</label>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-semibold text-gray-950">
                                {batchData.batch_number}
                            </div>
                        </div>
                        <div className="form-group space-y-2">
                            <label className="text-xs font-semibold text-gray-600">Procurement Date</label>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-semibold text-gray-950">
                                {batchData.date}
                            </div>
                        </div>
                    </div>

                    <div className="form-group space-y-2">
                        <label className="text-xs font-semibold text-gray-600">Net Transaction Value</label>
                        <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2.5 text-sm font-bold text-green-800 flex items-center justify-between">
                            <span>Rs. 0.00</span>
                            <span className="text-[10px] font-semibold text-green-700">Non-monetary replacement</span>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-2">
                        <button title="Authorize replacement batch" type="submit" disabled={loading} className="flex-1 py-2.5 bg-[#7C3AED] text-white font-semibold rounded-lg text-xs hover:bg-[#6D28D9] transition-all shadow-sm disabled:opacity-50 active:scale-[0.99]">
                            {loading ? 'Finalizing...' : 'Authorize Replacement Batch'}
                        </button>
                    </div>
                </form>
                </div>
            </div>
        </div>
    );
};

export default ReturnManagementPage;
