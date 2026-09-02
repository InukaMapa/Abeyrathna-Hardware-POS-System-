import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import ReceiveInventoryModal from '../inventory/ReceiveInventoryModal';
import {
    RefreshCcw, ArrowLeft,
    FileText, Calendar, AlertCircle, ArrowRight,
    TrendingDown, Info, ShieldCheck, DollarSign
} from 'lucide-react';
import { API_BASE_URL } from '../../../config/api';

const parseReturnNotes = (notesStr) => {
    try {
        if (notesStr && notesStr.startsWith('{')) {
            return JSON.parse(notesStr);
        }
    } catch (e) {}
    return { notes: notesStr || '', buying_price: null, tier_id: null };
};

const ReturnManagementPage = ({ onNavigate, returnId }) => {
    const [returnData, setReturnData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [resolution, setResolution] = useState('REFUND'); // REFUND, REPLACEMENT
    const [processing, setProcessing] = useState(false);

    const [form, setForm] = useState({
        refund_amount: '',
        credit_note_number: `CRN-${Math.floor(100000 + Math.random() * 900000)}`,
        notes: ''
    });
    const [showReplacementModal, setShowReplacementModal] = useState(false);

    useEffect(() => {
        if (returnId) {
            fetchReturnDetails();
        } else {
            setLoading(false);
        }
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
                const parsed = parseReturnNotes(found.notes);
                const price = parsed.buying_price !== null ? parsed.buying_price : (found.inventory?.buying_price || 0);
                setForm(prev => ({ ...prev, refund_amount: (parseFloat(found.quantity) * parseFloat(price)).toFixed(2) }));
            }
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const handleResolve = async () => {
        if (processing) return;
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
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="h-screen bg-[#F5FAF7] flex items-center justify-center text-sm font-semibold text-gray-700">Loading return details...</div>;
    if (!returnData) {
        return (
            <div className="h-screen bg-[#F5FAF7] flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4 animate-pulse" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Return Request Not Found</h2>
                <p className="text-sm text-gray-600 mb-6 max-w-md">
                    The return details could not be loaded. This might happen if the ID is invalid or the return request doesn't exist.
                </p>
                <button
                    onClick={() => onNavigate('supplier-returns')}
                    className="px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Return Registry
                </button>
            </div>
        );
    }

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
                                        {(() => {
                                            const parsed = parseReturnNotes(returnData.notes);
                                            if (parsed.buying_price !== null) {
                                                return (
                                                    <p className="text-xs text-gray-500 mt-1 font-semibold">
                                                        Returned Set Buy Price: Rs. {parsed.buying_price}
                                                    </p>
                                                );
                                            }
                                            return null;
                                        })()}
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
                                    <p className="text-lg font-bold text-green-800">
                                        Rs. {(() => {
                                            const parsed = parseReturnNotes(returnData.notes);
                                            const price = parsed.buying_price !== null ? parsed.buying_price : (returnData.inventory?.buying_price || 0);
                                            return (parseFloat(returnData.quantity) * parseFloat(price)).toLocaleString();
                                        })()}
                                    </p>
                                </div>
                            </div>

                            {!isPendingReturn && (
                                <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                                    <p className="text-sm font-bold text-green-800">Already Returned</p>
                                    <p className="mt-1 text-xs font-medium text-green-700">
                                        This return is no longer pending, so another refund or replacement cannot be created from it.
                                    </p>
                                </div>
                            )}

                            {/* Resolution Options */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {[
                                    { id: 'REFUND', label: 'Refund Money', icon: DollarSign, desc: 'Create Cash-In Batch' },
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

                                {resolution === 'REPLACEMENT' && (
                                    <div className="space-y-4 text-center py-4">
                                        <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mx-auto mb-2 border border-green-100">
                                            <TrendingDown className="w-6 h-6 text-green-700" />
                                        </div>
                                        <div className="max-w-md mx-auto">
                                            <h4 className="text-sm font-bold text-gray-950 mb-1">Inventory Restocking Workflow</h4>
                                            <p className="text-xs text-gray-600 leading-relaxed">
                                                By selecting Replacement, you will restock the replacement item directly into your inventory and finalize the return request.
                                            </p>
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
                                    resolution === 'REFUND' ? (
                                        <button
                                            title="Authorize final resolution"
                                            disabled={processing}
                                            onClick={handleResolve}
                                            className="return-management-primary-btn bg-green-700 hover:bg-green-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                                        >
                                            {processing ? 'Processing...' : 'Authorize Final Resolution'}
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button
                                            title="Confirm replacement item"
                                            disabled={processing}
                                            onClick={() => setShowReplacementModal(true)}
                                            className="return-management-primary-btn bg-green-700 hover:bg-green-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                                        >
                                            Confirm Replacement Item
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    )
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
                                    Refunds require Cashier confirmation at the till. Replacements create new inventory debt.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {(() => {
                if (!showReplacementModal || !returnData) return null;
                const parsedReturn = parseReturnNotes(returnData.notes);
                const returnBuyingPrice = parsedReturn.buying_price !== null && parsedReturn.buying_price !== undefined
                    ? parsedReturn.buying_price
                    : (returnData.inventory?.buying_price || 0);

                const itemForModal = {
                    ...returnData.inventory,
                    id: returnData.item_id || returnData.inventory?.id,
                    ingredient_name: returnData.inventory?.ingredient_name || 'Item',
                    buying_price: returnBuyingPrice,
                    selling_price: returnData.inventory?.selling_price || 0,
                    quantity: returnData.inventory?.quantity || 0,
                    unit: returnData.inventory?.unit || 'pcs',
                    storage_location: returnData.inventory?.storage_location || ''
                };

                return (
                    <ReceiveInventoryModal
                        initialItem={itemForModal}
                        initialQuantity={returnData.quantity}
                        isReplacement={true}
                        returnId={returnData.id}
                        onClose={() => setShowReplacementModal(false)}
                        onSuccess={() => {
                            setShowReplacementModal(false);
                            alert(`Replacement item stock added and Return ${returnData.return_number} finalized!`);
                            onNavigate('supplier-returns');
                        }}
                    />
                );
            })()}
        </DashboardLayout>
    );
};

export default ReturnManagementPage;
