import React, { useState, useEffect } from 'react';
import { Printer, CheckCircle, RefreshCw, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { getPrinters, initQZ } from '../../utils/qzHelper';
import {
    getSavedBillPrinter,
    getSavedLabelPrinter,
    saveBillPrinter,
    saveLabelPrinter,
    clearBillPrinter,
    clearLabelPrinter
} from '../../utils/printerConfig';

const PrinterSettingsPage = ({ onNavigate }) => {
    const [printers, setPrinters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [qzConnected, setQzConnected] = useState(false);
    const [billPrinter, setBillPrinter] = useState(getSavedBillPrinter() || '');
    const [labelPrinter, setLabelPrinter] = useState(getSavedLabelPrinter() || '');
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    const fetchPrinters = async () => {
        setLoading(true);
        setError('');
        try {
            await initQZ();
            setQzConnected(true);
            const list = await getPrinters();
            setPrinters(list);
        } catch (err) {
            console.error('Failed to load printers:', err);
            if (err.message && err.message.includes('Connection blocked by client')) {
                setError('Connection blocked by QZ Tray. Please open the QZ Tray App (system tray near the clock) -> Advanced -> Site Manager, and remove "localhost" from the Blocked list.');
            } else {
                setError('Could not connect to QZ Tray. Make sure QZ Tray is running on this computer.');
            }
            setQzConnected(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPrinters();
    }, []);

    const handleSave = () => {
        if (billPrinter) saveBillPrinter(billPrinter);
        else clearBillPrinter();

        if (labelPrinter) saveLabelPrinter(labelPrinter);
        else clearLabelPrinter();

        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <DashboardLayout activePage="printer-settings" onNavigate={onNavigate}>
            <div className="printer-settings-page">
                {/* Header */}
                <div className="printer-settings-header">
                    <div className="printer-settings-title-wrap">
                        <div className="printer-settings-icon-circle">
                            <Printer size={26} />
                        </div>
                        <div>
                            <h1 className="printer-settings-title">Printer Settings</h1>
                            <p className="printer-settings-subtitle">
                                Assign your thermal bill printer and barcode label printer for this workstation.
                            </p>
                        </div>
                    </div>

                    {/* QZ Tray Status Badge */}
                    <div className={`printer-qz-badge ${qzConnected ? 'connected' : 'disconnected'}`}>
                        {qzConnected ? (
                            <><Wifi size={14} /> QZ Tray Connected</>
                        ) : (
                            <><WifiOff size={14} /> QZ Tray Disconnected</>
                        )}
                    </div>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="printer-alert-error">
                        <AlertTriangle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Main Card */}
                <div className="printer-settings-card">
                    {/* Refresh Button */}
                    <div className="printer-settings-card-header">
                        <h2 className="printer-settings-card-title">Configure Printers</h2>
                        <button
                            className="printer-refresh-btn"
                            onClick={fetchPrinters}
                            disabled={loading}
                            title="Refresh printer list"
                        >
                            <RefreshCw size={15} className={loading ? 'spin' : ''} />
                            {loading ? 'Refreshing...' : 'Refresh List'}
                        </button>
                    </div>

                    {loading ? (
                        <div className="printer-loading">
                            <div className="printer-spinner" />
                            <span>Connecting to QZ Tray and loading printers...</span>
                        </div>
                    ) : (
                        <div className="printer-select-grid">
                            {/* Bill Printer */}
                            <div className="printer-select-group">
                                <div className="printer-select-label-row">
                                    <div className="printer-type-icon bill">
                                        <Printer size={18} />
                                    </div>
                                    <div>
                                        <label className="printer-select-label">Bill / Receipt Printer</label>
                                        <p className="printer-select-hint">
                                            Thermal printer for customer receipts &amp; cash drawer
                                        </p>
                                    </div>
                                </div>
                                <select
                                    className="printer-select-input"
                                    value={billPrinter}
                                    onChange={e => setBillPrinter(e.target.value)}
                                    disabled={!qzConnected || printers.length === 0}
                                >
                                    <option value="">— Select Bill Printer —</option>
                                    {printers.map((p, i) => (
                                        <option key={i} value={p}>{p}</option>
                                    ))}
                                </select>
                                {billPrinter && (
                                    <div className="printer-selected-badge">
                                        <CheckCircle size={13} /> Currently saved: <strong>{billPrinter}</strong>
                                    </div>
                                )}
                            </div>

                            {/* Divider */}
                            <div className="printer-select-divider" />

                            {/* Label Printer */}
                            <div className="printer-select-group">
                                <div className="printer-select-label-row">
                                    <div className="printer-type-icon label">
                                        <Printer size={18} />
                                    </div>
                                    <div>
                                        <label className="printer-select-label">Label / Barcode Printer</label>
                                        <p className="printer-select-hint">
                                            Label printer for item barcodes (e.g. Zebra, Dymo)
                                        </p>
                                    </div>
                                </div>
                                <select
                                    className="printer-select-input"
                                    value={labelPrinter}
                                    onChange={e => setLabelPrinter(e.target.value)}
                                    disabled={!qzConnected || printers.length === 0}
                                >
                                    <option value="">— Select Label Printer —</option>
                                    {printers.map((p, i) => (
                                        <option key={i} value={p}>{p}</option>
                                    ))}
                                </select>
                                {labelPrinter && (
                                    <div className="printer-selected-badge">
                                        <CheckCircle size={13} /> Currently saved: <strong>{labelPrinter}</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Save Button */}
                    {!loading && qzConnected && (
                        <div className="printer-save-row">
                            <button
                                className={`printer-save-btn ${saved ? 'saved' : ''}`}
                                onClick={handleSave}
                            >
                                {saved ? (
                                    <><CheckCircle size={16} /> Settings Saved!</>
                                ) : (
                                    <><Printer size={16} /> Save Printer Settings</>
                                )}
                            </button>
                            <p className="printer-save-note">
                                Settings are saved locally on this workstation and used automatically when printing.
                            </p>
                        </div>
                    )}
                </div>

                {/* Info Box */}
                <div className="printer-info-box">
                    <h3>How It Works</h3>
                    <ul>
                        <li><strong>Bill Printer</strong> — Used automatically when completing a sale &amp; opening the cash drawer.</li>
                        <li><strong>Label Printer</strong> — Used when printing item barcode labels from the Inventory page.</li>
                        <li>Settings are saved per-browser on this computer. Each workstation can have different printers.</li>
                        <li>QZ Tray must be running in the background for printing to work.</li>
                    </ul>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default PrinterSettingsPage;
