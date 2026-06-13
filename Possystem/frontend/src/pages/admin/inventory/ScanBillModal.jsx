import React, { useState, useRef } from 'react';
import { X, UploadCloud, RefreshCw, CheckCircle, Save, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../../config/api';
import '../../../styles/menu.css'; // Reuse existing modal and styling classes

const ScanBillModal = ({ onClose, onSuccess }) => {
    const [step, setStep] = useState(1); // 1 = Upload, 2 = Processing, 3 = Verification
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [extractedData, setExtractedData] = useState([]);
    const [supplierName, setSupplierName] = useState("");
    const [rawText, setRawText] = useState("");
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
            setError(null);
        }
    };

    const handleProcess = async () => {
        if (!file) return;
        setStep(2); // Processing
        setError(null);

        const formData = new FormData();
        formData.append('billImage', file);

        try {
            const token = localStorage.getItem('token');
            // Call the Node.js API Proxy which hits the FastAPI ML Service
            const response = await axios.post(`${API_BASE_URL}/ocr/upload-bill`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.data.success && response.data.data.success) {
                setExtractedData(response.data.data.items);
                setSupplierName(response.data.data.supplier_name || "Unknown Seller");
                setRawText(response.data.data.raw_text);
                setStep(3); // Verification
            } else {
                throw new Error("Failed to extract data correctly.");
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || "An error occurred during OCR processing.");
            setStep(1); // Back to upload if error
        }
    };

    const handleEditItem = (index, field, value) => {
        const newData = [...extractedData];
        newData[index][field] = value;
        setExtractedData(newData);
    };

    const handleRemoveItem = (index) => {
        const newData = extractedData.filter((_, i) => i !== index);
        setExtractedData(newData);
    };

    const handleConfirmAndUpdate = async () => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const userString = localStorage.getItem('user');
            let admin_id = null;
            let admin_name = 'Admin';

            if (userString && userString !== 'undefined' && userString !== 'null') {
                try {
                    const userData = JSON.parse(userString);
                    admin_id = userData?.id || null;
                    admin_name = userData?.name || 'Admin';
                } catch (e) {
                    console.error("Error parsing user data from localStorage", e);
                }
            }

            // 1. Update Inventory for each verified item
            const updatePromises = extractedData.map(item => {
                return axios.post(`${API_BASE_URL}/inventory`, {
                    ingredient_name: item.name,
                    quantity: item.quantity,
                    unit: item.unit,
                    method: 'SCAN',
                    admin_name: admin_name,
                    category: 'Uncategorized' // Default
                }, { headers: { Authorization: `Bearer ${token}` } });
            });

            await Promise.all(updatePromises);

            // 2. Log Scan History
            await axios.post(`${API_BASE_URL}/ocr/log-scan`, {
                image_url: "local_scan.jpg", // Placeholder until S3 is connected
                ocr_text: rawText,
                admin_id: admin_id
            }, { headers: { Authorization: `Bearer ${token}` } });

            // 3. AI Learning: Save Template for this seller from user corrections
            if (supplierName && supplierName !== "Unknown Seller") {
                await axios.post(`${API_BASE_URL}/ocr/save-template`, {
                    supplier_name: supplierName,
                    items: extractedData,
                    raw_text: rawText
                }, { headers: { Authorization: `Bearer ${token}` } });
                console.log("Seller template updated for:", supplierName);
            }

            alert(`Products updated! AI learned rules for ${supplierName}.`);
            onSuccess();
        } catch (error) {
            console.error("Error saving inventory items:", error);
            alert("Failed to update products. Check console.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ width: step === 3 ? '800px' : '500px', maxWidth: '95%' }}>
                <div className="modal-header">
                    <h2>Scan Supplier Bill (AI Extract)</h2>
                    <button onClick={onClose} className="close-btn" disabled={step === 2 || isSaving}><X className="w-5 h-5" /></button>
                </div>

                {error && (
                    <div className="bg-[#ff5252]/10 border border-[#ff5252]/50 text-[#ff5252] p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> {error}
                    </div>
                )}

                {/* STEP 1: UPLOAD */}
                {step === 1 && (
                    <div className="flex flex-col items-center">
                        <div
                            className="border-2 border-dashed border-[#444] rounded-xl p-8 w-full text-center hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".jpg,.jpeg,.png"
                                onChange={handleFileChange}
                            />
                            {!previewUrl ? (
                                <div className="flex flex-col items-center justify-center">
                                    <UploadCloud className="w-12 h-12 text-[#666] mb-3" />
                                    <p className="text-[#A0A0A0] font-medium">Click to select or drag & drop</p>
                                    <p className="text-[#666] text-xs mt-1">PNG, JPG, JPEG up to 5MB</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center relative">
                                    <img src={previewUrl} alt="Preview" className="max-h-48 object-contain rounded-lg shadow-md" />
                                    <p className="text-[#A0A0A0] text-sm mt-3">Click to change image</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 w-full flex justify-end gap-3">
                            <button onClick={onClose} className="btn-secondary">Cancel</button>
                            <button
                                onClick={handleProcess}
                                disabled={!file}
                                className="btn-primary"
                            >
                                Process Bill
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: PROCESSING */}
                {step === 2 && (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="relative">
                            <RefreshCw className="w-16 h-16 text-[#A0A0A0] animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="bg-[#000] text-xs font-bold text-[#E0E0E0] rounded-full px-1">AI</span>
                            </div>
                        </div>
                        <h3 className="text-lg font-semibold text-[#E0E0E0] mt-6">Extracting Information</h3>
                        <p className="text-[#888] text-sm mt-2 text-center max-w-xs">
                            Running Image Preprocessing, Tesseract OCR, and NLP matching...
                        </p>
                    </div>
                )}

                {/* STEP 3: VERIFICATION */}
                {step === 3 && (
                    <div className="flex flex-col">
                        <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-3 mb-4 flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-[#4ade80]" />
                            <p className="text-sm text-[#E0E0E0]">Extraction complete! Please thoroughly review the parsed data and correct any mistakes.</p>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar border border-[#333] rounded-lg">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#111] text-[#A0A0A0] text-xs uppercase tracking-wider border-b border-[#333] sticky top-0 z-10">
                                        <th className="p-3">Item Name</th>
                                        <th className="p-3 w-32">Quantity</th>
                                        <th className="p-3 w-24">Unit</th>
                                        <th className="p-3 w-32 text-center">Confidence</th>
                                        <th className="p-3 w-16">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#333]">
                                    {extractedData.length === 0 ? (
                                        <tr><td colSpan="5" className="p-6 text-center text-[#888]">No items recognized.</td></tr>
                                    ) : (
                                        extractedData.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-[#202020] transition-colors">
                                                <td className="p-2">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                value={item.name}
                                                                onChange={(e) => handleEditItem(idx, 'name', e.target.value)}
                                                                className="w-full bg-[#111] border border-[#444] rounded px-2 py-1.5 text-sm text-[#E0E0E0] focus:border-[#66A1FF] focus:outline-none"
                                                            />
                                                            {!item.is_existing && (
                                                                <span className="flex-shrink-0 bg-[#ffb74d]/10 border border-[#ffb74d]/30 text-[#ffb74d] text-[10px] font-bold px-1.5 py-0.5 rounded leading-none uppercase">
                                                                    New
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        step="0.01"
                                                        onChange={(e) => handleEditItem(idx, 'quantity', e.target.value)}
                                                        className="w-full bg-[#111] border border-[#444] rounded px-2 py-1.5 text-sm text-[#E0E0E0] outline-none"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="text"
                                                        value={item.unit}
                                                        onChange={(e) => handleEditItem(idx, 'unit', e.target.value)}
                                                        className="w-full bg-[#111] border border-[#444] rounded px-2 py-1.5 text-sm text-[#E0E0E0] outline-none"
                                                    />
                                                </td>
                                                <td className="p-2 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${item.confidence >= 0.8 ? 'bg-[#4ade80]/20 text-[#4ade80]' :
                                                        item.confidence >= 0.5 ? 'bg-[#ffb74d]/20 text-[#ffb74d]' :
                                                            'bg-[#ff5252]/20 text-[#ff5252]'
                                                        }`}>
                                                        {Math.round(item.confidence * 100)}%
                                                    </span>
                                                </td>
                                                <td className="p-2 text-center">
                                                    <button
                                                        onClick={() => handleRemoveItem(idx)}
                                                        className="text-[#888] hover:text-[#ff5252] transition-colors"
                                                        title="Remove Row"
                                                    >
                                                        <X className="w-4 h-4 mx-auto" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-6 w-full flex justify-between items-center gap-3">
                            <button
                                onClick={() => setStep(1)}
                                className="btn-secondary text-sm"
                                disabled={isSaving}
                            >
                                Re-upload Different Bill
                            </button>
                            <div className="flex gap-3">
                                <button onClick={onClose} className="btn-secondary" disabled={isSaving}>Cancel</button>
                                <button
                                    onClick={handleConfirmAndUpdate}
                                    disabled={extractedData.length === 0 || isSaving}
                                    className="btn-primary flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {isSaving ? 'Updating Products...' : 'Confirm & Update'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScanBillModal;
