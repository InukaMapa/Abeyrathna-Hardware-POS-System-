import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { ArrowLeft, Package, Clock, Calendar, Truck, Layers, Loader, Info, X, Printer } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { API_BASE_URL } from '../../../config/api';
import '../../../styles/menu.css'; // Reusing styles

const InventoryDetailPage = ({ inventoryId, onNavigate }) => {
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showBarcodePopup, setShowBarcodePopup] = useState(false);
    const barcodeRef = useRef(null);

    useEffect(() => {
        if (showBarcodePopup && barcodeRef.current && item && item.item_code) {
            try {
                JsBarcode(barcodeRef.current, item.item_code, {
                    format: 'CODE128',
                    lineColor: '#000000',
                    background: '#FFFFFF',
                    width: 2,
                    height: 60,
                    displayValue: true,
                    fontSize: 14,
                    margin: 10
                });
            } catch (err) {
                console.error('Error rendering barcode:', err);
            }
        }
    }, [showBarcodePopup, item]);

    const handlePrintBarcode = () => {
        const printWindow = window.open('', '_blank');
        const svgHtml = barcodeRef.current ? barcodeRef.current.outerHTML : '';
        printWindow.document.write(`
            <html>
            <head>
                <title>Print Barcode - ${item.ingredient_name}</title>
                <style>
                    body {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        font-family: system-ui, -apple-system, sans-serif;
                    }
                    .label {
                        text-align: center;
                        padding: 20px;
                        border: 1px dashed #ccc;
                        border-radius: 8px;
                        background: white;
                    }
                    .title {
                        font-size: 18px;
                        font-weight: bold;
                        margin-bottom: 5px;
                        color: #000;
                    }
                    .subtitle {
                        font-size: 13px;
                        color: #555;
                        margin-bottom: 15px;
                        font-weight: 500;
                    }
                </style>
            </head>
            <body>
                <div class="label">
                    <div class="title">${item.ingredient_name}</div>
                    <div class="subtitle">Rs. ${parseFloat(item.selling_price || 0).toFixed(2)}</div>
                    ${svgHtml}
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        window.close();
                    }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    useEffect(() => {
        if (!inventoryId) {
            onNavigate('inventory');
            return;
        }

        const fetchDetails = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`${API_BASE_URL}/inventory/${inventoryId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setItem(response.data);
            } catch (error) {
                console.error('Error fetching details:', error);
                alert('Failed to load item details');
                onNavigate('inventory');
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [inventoryId, onNavigate]);

    if (loading) return (
        <DashboardLayout activePage="inventory" onNavigate={onNavigate}>
            <div className="flex items-center justify-center h-full text-[#A0A0A0]">
                <Loader className="animate-spin mr-2" /> Loading details...
            </div>
        </DashboardLayout>
    );

    if (!item) return null;

    return (
        <DashboardLayout activePage="inventory" onNavigate={onNavigate}>
            <div className="menu-management-container animate-fade-in custom-scrollbar">
                <button
                    onClick={() => onNavigate('inventory')}
                    className="mb-6 text-[#A0A0A0] hover:text-[#E0E0E0] flex items-center gap-2 text-sm font-medium transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Inventory
                </button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Main Info Card */}
                    <div className="col-span-1 md:col-span-2 space-y-6">
                        <div className="bg-[#1E1E1E] rounded-xl shadow-lg p-6 border border-[#333] relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                <Package className="w-32 h-32 text-white" />
                            </div>
                            
                            {/* Info Button in Right Top Corner */}
                            <div className="absolute top-4 right-4 z-10">
                                <button
                                    onClick={() => setShowBarcodePopup(true)}
                                    className="bg-[#2A2A2A] hover:bg-[#333] text-[#ffb74d] hover:text-[#ffa726] border border-[#ffb74d]/20 hover:border-[#ffb74d]/50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-xs font-semibold shadow-md active:scale-95 cursor-pointer"
                                    title="View Barcode Info"
                                >
                                    <Info className="w-4 h-4" /> Info
                                </button>
                            </div>
                            
                            <h1 className="text-3xl font-bold text-[#E0E0E0] mb-2 pr-16">{item.ingredient_name}</h1>

                            <div className="flex flex-wrap gap-2 mb-6">
                                <span className="px-2 py-1 bg-[#2A2A2A] text-[#E0E0E0] rounded-md text-xs font-medium border border-[#333]">
                                    {item.category}
                                </span>
                                <span className="px-2 py-1 bg-[#111] text-[#A0A0A0] rounded-md text-xs font-mono border border-[#333]">
                                    {item.item_code || 'NO CODE'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-[#111] rounded-lg border border-[#333]">
                                    <div className="text-xs text-[#666] uppercase font-semibold mb-1">Total Stock</div>
                                    <div className="text-2xl font-bold text-[#E0E0E0]">{item.quantity} <span className="text-sm font-normal text-[#888]">{item.unit}</span></div>
                                </div>
                                <div className="p-4 bg-[#111] rounded-lg border border-[#333]">
                                    <div className="text-xs text-[#666] uppercase font-semibold mb-1">Reorder Level</div>
                                    <div className="text-xl font-semibold text-[#BBB]">{item.reorder_level}</div>
                                </div>
                                <div className="p-4 bg-[#111] rounded-lg border border-[#333]">
                                    <div className="text-xs text-[#d32f2f] uppercase font-semibold mb-1">Selling Price</div>
                                    <div className="text-xl font-black text-red-500">Rs. {parseFloat(item.selling_price || 0).toFixed(2)}</div>
                                </div>
                                <div className="p-4 bg-[#111] rounded-lg border border-[#333]">
                                    <div className="text-xs text-[#666] uppercase font-semibold mb-1">Last Updated</div>
                                    <div className="text-sm font-medium text-[#BBB]">{new Date(item.last_updated).toLocaleDateString()}</div>
                                </div>
                                <div className="p-4 bg-[#111] rounded-lg border border-[#333]">
                                    <div className="text-xs text-[#666] uppercase font-semibold mb-1">Status</div>
                                    <div className={`text-sm font-bold 
                                        ${item.quantity <= 0 ? 'text-[#ff5252]' :
                                            item.quantity <= item.reorder_level ? 'text-[#ffb74d]' :
                                                'text-[#4ade80]'}`}>
                                        {item.quantity <= 0 ? 'Out of Stock' : item.quantity <= item.reorder_level ? 'Low Stock' : 'In Stock'}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-[#333] grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-start gap-3">
                                    <Truck className="w-5 h-5 text-[#666] mt-0.5" />
                                    <div>
                                        <div className="text-sm font-semibold text-[#BBB]">Supplier Information</div>
                                        <p className="text-sm text-[#888] mt-1">{item.supplier_info || 'No supplier info provided'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Layers className="w-5 h-5 text-[#666] mt-0.5" />
                                    <div>
                                        <div className="text-sm font-semibold text-[#BBB]">Storage Location</div>
                                        <p className="text-sm text-[#888] mt-1">{item.storage_location || 'Not specified'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stock Batches */}
                        <div className="bg-[#1E1E1E] rounded-xl shadow-lg border border-[#333] overflow-hidden">
                            <div className="p-4 border-b border-[#333] flex items-center justify-between">
                                <h3 className="font-bold text-[#E0E0E0] flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-[#D32F2F]" /> Active Batches
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[#111] text-[#888]">
                                        <tr>
                                            <th className="p-3 font-medium">Batch Code</th>
                                            <th className="p-3 font-medium">Quantity</th>
                                            <th className="p-3 font-medium">Received</th>
                                            <th className="p-3 font-medium">Expiry</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#333]">
                                        {item.batches?.length > 0 ? item.batches.map(batch => (
                                            <tr key={batch.id} className="hover:bg-[#252525]">
                                                <td className="p-3 font-mono text-[#BBB]">{batch.batch_code}</td>
                                                <td className="p-3 font-semibold text-[#E0E0E0]">{batch.quantity}</td>
                                                <td className="p-3 text-[#888]">{new Date(batch.received_date).toLocaleDateString()}</td>
                                                <td className="p-3">
                                                    {batch.expiry_date ? (
                                                        <span className={`px-2 py-0.5 rounded text-xs ${new Date(batch.expiry_date) < new Date() ? 'bg-[#ff5252]/20 text-[#ff5252]' : 'bg-[#4ade80]/20 text-[#4ade80]'}`}>
                                                            {new Date(batch.expiry_date).toLocaleDateString()}
                                                        </span>
                                                    ) : <span className="text-[#666]">-</span>}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="4" className="p-4 text-center text-[#666] italic">No specific batch info</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Stock History Sidebar */}
                    <div className="bg-[#1E1E1E] rounded-xl shadow-lg border border-[#333] flex flex-col h-[calc(100vh-100px)] sticky top-6">
                        <div className="p-4 border-b border-[#333]">
                            <h3 className="font-bold text-[#E0E0E0] flex items-center gap-2">
                                <Clock className="w-4 h-4 text-[#ffb74d]" /> Stock History
                            </h3>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-4 flex-1 custom-scrollbar">
                            {item.history?.length > 0 ? item.history.map(log => (
                                <div key={log.id} className="relative pl-4 border-l-2 border-[#333] pb-4 last:pb-0 last:border-0">
                                    <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-[#1E1E1E]
                                        ${log.action === 'ADDED' ? 'bg-[#4ade80]' : 'bg-[#ff5252]'}`}></div>
                                    <div className="text-xs text-[#666] mb-1">{new Date(log.created_at).toLocaleString()}</div>
                                    <div className="text-sm font-medium text-[#E0E0E0]">
                                        {log.action === 'ADDED' ? 'Added' : 'Removed'} <span className={log.action === 'ADDED' ? 'text-[#4ade80]' : 'text-[#ff5252]'}>{log.quantity}</span>
                                    </div>
                                    <div className="text-xs text-[#888] mt-1 flex items-center gap-1">
                                        <span className="bg-[#333] px-1 rounded">{log.method}</span>
                                        <span>by {log.admin_name}</span>
                                    </div>
                                    {log.notes && <div className="text-xs text-[#666] mt-1 italic">"{log.notes}"</div>}
                                </div>
                            )) : (
                                <div className="text-center text-[#666] py-8">No history logged yet.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Barcode / Info Modal */}
            {showBarcodePopup && (
                <div className="modal-overlay z-50">
                    <div className="modal-content text-center animate-scale-up" style={{ width: '420px', maxWidth: '95%', background: '#1E1E1E', border: '1px solid #333' }}>
                        <div className="modal-header border-b border-[#333] pb-3 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-[#E0E0E0] flex items-center gap-2">
                                <Package className="w-5 h-5 text-[#ffb74d]" /> Item Barcode Info
                            </h3>
                            <button 
                                onClick={() => setShowBarcodePopup(false)} 
                                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="py-6 flex flex-col items-center justify-center space-y-4">
                            <div className="text-left w-full px-2">
                                <h4 className="text-xl font-bold text-white">{item.ingredient_name}</h4>
                                <p className="text-xs text-[#A0A0A0] mt-0.5">Category: {item.category || 'Uncategorized'}</p>
                            </div>
                            
                            {/* Barcode Rendered Here */}
                            <div className="my-2 p-4 bg-white rounded-lg border border-[#333] flex justify-center items-center shadow-inner">
                                <svg ref={barcodeRef}></svg>
                            </div>
                            
                            <div className="w-full text-left">
                                <label className="text-xs text-[#666] font-semibold uppercase tracking-wider block mb-1">Barcode / Item Code</label>
                                <div className="text-center font-mono text-sm text-[#ffb74d] bg-[#111] px-3 py-2 rounded border border-[#333] w-full select-all font-bold">
                                    {item.item_code}
                                </div>
                            </div>
                        </div>
                        
                        <div className="modal-actions border-t border-[#333] pt-3 flex gap-2 justify-end">
                            <button
                                onClick={handlePrintBarcode}
                                className="bg-[#2A2A2A] hover:bg-[#333] text-[#E0E0E0] border border-[#333] hover:border-[#ffb74d]/50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <Printer className="w-4 h-4 text-[#ffb74d]" /> Print Label
                            </button>
                            <button
                                onClick={() => setShowBarcodePopup(false)}
                                className="btn-secondary px-4 py-2 cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default InventoryDetailPage;
