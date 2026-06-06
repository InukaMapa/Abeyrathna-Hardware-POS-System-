import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { ArrowLeft, Package, Clock, Calendar, Truck, Layers, Loader, Info, X, Printer } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { API_BASE_URL } from '../../../config/api';
import '../../../styles/menu.css'; // Reusing styles

const InventoryDetailPage = ({ inventoryId, onNavigate }) => {
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showBarcodePopup, setShowBarcodePopup] = useState(false);
    const barcodeRef = useRef(null);
    const printLabelRef = useRef(null);
    const printBarcodeRef = useRef(null);

    useEffect(() => {
        if (showBarcodePopup && item && item.item_code) {
            try {
                if (barcodeRef.current) {
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
                }
                if (printBarcodeRef.current) {
                    JsBarcode(printBarcodeRef.current, item.item_code, {
                        format: 'CODE128',
                        lineColor: '#000000',
                        background: '#FFFFFF',
                        width: 1,
                        height: 42,
                        displayValue: true,
                        fontSize: 9,
                        margin: 0
                    });
                }
            } catch (err) {
                console.error('Error rendering barcode:', err);
            }
        }
    }, [showBarcodePopup, item]);

    const handlePrintBarcode = async () => {
        if (!printLabelRef.current) return;
        try {
            const canvas = await html2canvas(printLabelRef.current, {
                scale: 2, // better quality for printing
                backgroundColor: '#ffffff'
            });
            const base64Image = canvas.toDataURL('image/png');
            
            // Call the QZ Tray helper function to print the image
            await import('../../../utils/qzHelper').then(module => {
                return module.printLabelImage(base64Image);
            });
            
            alert('Label sent to printer!');
        } catch (error) {
            console.error('Failed to print label:', error);
            if (error.message && error.message.includes('Connection blocked by client')) {
                alert('Connection blocked by QZ Tray! Please right-click the QZ Tray icon on your computer\'s taskbar (near the clock), go to Advanced > Site Manager, and remove "localhost" from the Blocked list.');
            } else {
                alert('Failed to print label. Make sure QZ Tray is running.');
            }
        }
    };

    const fetchDetails = useCallback(async () => {
        if (!inventoryId) {
            onNavigate('inventory');
            return;
        }

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
    }, [inventoryId, onNavigate]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    if (loading) return (
        <DashboardLayout activePage="inventory" onNavigate={onNavigate}>
            <div className="flex items-center justify-center h-full text-[#A0A0A0]">
                <Loader className="animate-spin mr-2" /> Loading details...
            </div>
        </DashboardLayout>
    );

    if (!item) return null;

    const supplier = item.supplier_summary || item.suppliers || item.batches?.find(batch => batch.supplier)?.supplier || null;
    const supplierName = supplier?.supplier_name || item.supplier_name || item.supplier_info || '';
    const supplierDetails = [
        supplier?.company_name,
        supplier?.phone_number,
        supplier?.email,
        supplier?.address
    ].filter(Boolean);

    return (
        <DashboardLayout activePage="inventory" onNavigate={onNavigate}>
            <div className="menu-management-container inventory-detail-page animate-fade-in custom-scrollbar">
                <button
                    title="Back to Inventory"
                    onClick={() => onNavigate('inventory')}
                    className="detail-back-btn"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Inventory
                </button>

                <div className="inventory-detail-grid">
                    {/* Main Info Card */}
                    <div className="detail-main-column">
                        <div className="detail-card detail-summary-card">
                            <div className="detail-watermark">
                                <Package className="w-32 h-32 text-white" />
                            </div>
                            
                            {/* Info Button in Right Top Corner */}
                            <div className="absolute top-4 right-4 z-10">
                                <button
                                    title="View Barcode Info"
                                    onClick={() => setShowBarcodePopup(true)}
                                    className="detail-outline-btn"
                                >
                                    <Info className="w-4 h-4" /> Info
                                </button>
                            </div>
                            
                            <h1 className="detail-title">{item.ingredient_name}</h1>

                            <div className="detail-chip-row">
                                <span className="detail-chip">
                                    {item.category}
                                </span>
                                <span className="detail-chip detail-code-chip">
                                    {item.item_code || 'NO CODE'}
                                </span>
                            </div>

                            <div className="detail-metrics-grid">
                                <div className="detail-metric">
                                    <div className="detail-metric-label">Total Stock</div>
                                    <div className="detail-metric-value">{item.quantity} <span>{item.unit}</span></div>
                                </div>
                                <div className="detail-metric">
                                    <div className="detail-metric-label">Reorder Level</div>
                                    <div className="detail-metric-value">{item.reorder_level}</div>
                                </div>
                                <div className="detail-metric">
                                    <div className="detail-metric-label">Latest Buying Price</div>
                                    <div className="detail-metric-value detail-price">Rs. {parseFloat(item.buying_price || 0).toFixed(2)}</div>
                                </div>
                                <div className="detail-metric">
                                    <div className="detail-metric-label">Latest Selling Price</div>
                                    <div className="detail-metric-value detail-price">Rs. {parseFloat(item.selling_price || 0).toFixed(2)}</div>
                                </div>
                                <div className="detail-metric">
                                    <div className="detail-metric-label">Last Updated</div>
                                    <div className="detail-metric-value detail-date">{new Date(item.last_updated).toLocaleDateString()}</div>
                                </div>
                                <div className="detail-metric">
                                    <div className="detail-metric-label">Status</div>
                                    <div className={`detail-status 
                                        ${item.quantity <= 0 ? 'text-[#ff5252]' :
                                            item.quantity <= item.reorder_level ? 'text-[#ffb74d]' :
                                                'text-[#4ade80]'}`}>
                                        {item.quantity <= 0 ? 'Out of Stock' : item.quantity <= item.reorder_level ? 'Low Stock' : 'In Stock'}
                                    </div>
                                </div>
                            </div>

                            <div className="detail-meta-grid">
                                <div className="detail-meta-item">
                                    <Truck className="w-5 h-5 text-[#666] mt-0.5" />
                                    <div>
                                        <div>Supplier Information</div>
                                        {supplierName ? (
                                            <div className="detail-supplier-block">
                                                <p className="detail-supplier-name">{supplierName}</p>
                                                {supplierDetails.length > 0 && (
                                                    <ul>
                                                        {supplierDetails.map((detail, index) => (
                                                            <li key={index}>{detail}</li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        ) : (
                                            <p>No supplier info provided</p>
                                        )}
                                    </div>
                                </div>
                                <div className="detail-meta-item">
                                    <Layers className="w-5 h-5 text-[#666] mt-0.5" />
                                    <div>
                                        <div>Storage Location</div>
                                        <p>{item.storage_location || 'Not specified'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Supplier Order Batches */}
                        <div className="detail-card detail-table-card">
                            <div className="detail-card-header">
                                <h3>
                                    <Calendar className="w-4 h-4 text-[#D32F2F]" /> Supplier Order Batches
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="detail-table w-full text-left text-sm">
                                    <thead>
                                        <tr>
                                            <th className="p-3 font-medium">Batch Code</th>
                                            <th className="p-3 font-medium">Supplier</th>
                                            <th className="p-3 font-medium">Added</th>
                                            <th className="p-3 font-medium">Remaining</th>
                                            <th className="p-3 font-medium">Buying</th>
                                            <th className="p-3 font-medium">Selling</th>
                                            <th className="p-3 font-medium">Location</th>
                                            <th className="p-3 font-medium">Received</th>
                                            <th className="p-3 font-medium">Expiry</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {item.batches?.length > 0 ? item.batches.map(batch => (
                                            <tr key={batch.id}>
                                                <td className="p-3 font-mono text-[#BBB]">{batch.batch_code}</td>
                                                <td className="p-3 text-[#888]">{batch.supplier?.supplier_name || '-'}</td>
                                                <td className="p-3 font-semibold text-[#E0E0E0]">{batch.quantity}</td>
                                                <td className="p-3 font-semibold text-[#E0E0E0]">{batch.quantity_remaining}</td>
                                                <td className="p-3 text-[#888]">Rs. {parseFloat(batch.buying_price || 0).toFixed(2)}</td>
                                                <td className="p-3 text-[#888]">Rs. {parseFloat(batch.selling_price || 0).toFixed(2)}</td>
                                                <td className="p-3 text-[#888]">{batch.storage_location || '-'}</td>
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
                                            <tr><td colSpan="9" className="p-4 text-center text-[#666] italic">No supplier order batch info</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Stock History Sidebar */}
                    <div className="detail-card detail-history-card">
                        <div className="detail-card-header">
                            <h3>
                                <Clock className="w-4 h-4 text-[#ffb74d]" /> Stock History
                            </h3>
                        </div>
                        <div className="detail-history-list custom-scrollbar">
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
                <div className="modal-overlay z-50 detail-barcode-overlay">
                    <div className="detail-barcode-modal animate-scale-up">
                        <div className="detail-barcode-header">
                            <h3>
                                <Package className="w-5 h-5 text-[#ffb74d]" /> Item Barcode Info
                            </h3>
                            <button 
                                title="Close barcode info"
                                onClick={() => setShowBarcodePopup(false)} 
                                className="detail-barcode-close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="detail-barcode-body">
                            <div className="detail-barcode-item">
                                <h4>{item.ingredient_name}</h4>
                                <p>Category: {item.category || 'Uncategorized'}</p>
                            </div>
                            
                            {/* Barcode Rendered Here */}
                            <div className="detail-barcode-preview">
                                <svg ref={barcodeRef}></svg>
                            </div>
                            
                            <div className="detail-barcode-code">
                                <label>Barcode / Item Code</label>
                                <div>
                                    {item.item_code}
                                </div>
                            </div>
                        </div>
                        
                        <div className="detail-barcode-actions">
                            <button
                                title="Print Label"
                                onClick={handlePrintBarcode}
                                className="detail-barcode-btn"
                            >
                                <Printer className="w-4 h-4" /> Print Label
                            </button>
                            <button
                                title="Close"
                                onClick={() => setShowBarcodePopup(false)}
                                className="detail-barcode-btn"
                            >
                                Close
                            </button>
                        </div>

                        {/* Hidden Layout for Printing */}
                        <div 
                            ref={printLabelRef} 
                            style={{ 
                                position: 'absolute', 
                                left: '-9999px', 
                                top: '-9999px', 
                                width: '40mm',
                                height: '30mm',
                                backgroundColor: '#fff', 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                padding: '2mm',
                                boxSizing: 'border-box',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ fontSize: '8px', lineHeight: '1', fontFamily: 'Arial, sans-serif', fontWeight: '700', color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.8mm', maxWidth: '100%' }}>
                                {item.ingredient_name}
                            </div>
                            <div style={{ fontSize: '10px', lineHeight: '1', fontFamily: 'Arial, sans-serif', color: '#000', fontWeight: '700', marginBottom: '1mm' }}>
                                Rs. {parseFloat(item.selling_price || 0).toFixed(2)}
                            </div>
                            <svg ref={printBarcodeRef} style={{ width: '34mm', maxWidth: '100%', height: 'auto' }}></svg>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default InventoryDetailPage;
