import React, { useState, useEffect, useCallback } from 'react';
import {
    TrendingUp, TrendingDown, DollarSign,
    PieChart, Package, AlertTriangle,
    Calendar, Filter, Search, Download, Printer, Mail,
    FileText, BarChart2, Briefcase, Truck, User, ArrowRight,
    ChevronDown, X, RefreshCw, ChevronUp
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, LineChart, Line, Cell, PieChart as RePieChart, Pie, Legend
} from 'recharts';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { API_BASE_URL } from '../../config/api';
import axios from 'axios';
import '../../styles/dashboard.css';

// Mock data for trends
const salesData = [
    { name: 'Mon', value: 4000 },
    { name: 'Tue', value: 3000 },
    { name: 'Wed', value: 2000 },
    { name: 'Thu', value: 2780 },
    { name: 'Fri', value: 1890 },
    { name: 'Sat', value: 2390 },
    { name: 'Sun', value: 3490 },
];

const ReportsPage = ({ onNavigate }) => {
    const [activeTab, setActiveTab] = useState('sales');
    const [dateRange, setDateRange] = useState('Today');
    const [showFilters, setShowFilters] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState(null);
    const [, setLoading] = useState(true);
    const [salesTrendData, setSalesTrendData] = useState([]);
    const [salesTrendTotal, setSalesTrendTotal] = useState(0);
    const [salesTrendLoading, setSalesTrendLoading] = useState(false);
    const [salesReportLoading, setSalesReportLoading] = useState(false);
    const [salesCategoryData, setSalesCategoryData] = useState([]);
    const [salesOrders, setSalesOrders] = useState([]);
    const [selectedSale, setSelectedSale] = useState(null);
    const [productReportLoading, setProductReportLoading] = useState(false);
    const [productReport, setProductReport] = useState({
        products: [],
        bestSellingItems: [],
        summary: { soldQty: 0, revenue: 0, profit: 0, returnsQty: 0, productCount: 0 }
    });
    const [inventoryReportLoading, setInventoryReportLoading] = useState(false);
    const [inventoryReport, setInventoryReport] = useState({
        summary: { totalItems: 0, totalStockQty: 0, lowStockCount: 0, outOfStockCount: 0, stockValue: 0 },
        statusBreakdown: [],
        locationStock: [],
        lowStockItems: [],
        outOfStockItems: [],
        items: []
    });
    const [supplierReportLoading, setSupplierReportLoading] = useState(false);
    const [supplierReport, setSupplierReport] = useState({
        suppliers: [],
        summary: { totalSuppliers: 0, activeSuppliers: 0, totalPurchases: 0, duePayments: 0, returnValue: 0 }
    });
    const [cashierStaff, setCashierStaff] = useState([]);
    const [selectedSupplierReport, setSelectedSupplierReport] = useState(null);
    const [selectedBranch, setSelectedBranch] = useState('Main Branch');
    const [selectedCashier, setSelectedCashier] = useState('All Cashiers');
    const [appliedFilters, setAppliedFilters] = useState({
        branch: 'Main Branch',
        cashier: 'All Cashiers'
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/admin/stats`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setStats(response.data);
            } catch (err) {
                console.error('Failed to fetch stats', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    useEffect(() => {
        const fetchCashierStaff = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/staff`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                    params: {
                        role: 'CASHIER',
                        status: 'ACTIVE',
                        limit: 100
                    }
                });
                setCashierStaff(response.data?.staff || []);
            } catch (err) {
                console.error('Failed to fetch cashier staff', err);
                setCashierStaff([]);
            }
        };

        fetchCashierStaff();
    }, []);

    const fetchSalesTrend = useCallback(async () => {
        setSalesTrendLoading(true);
        try {
            const params = new URLSearchParams({
                dateRange,
                branch: appliedFilters.branch,
                cashier: appliedFilters.cashier
            });
            const response = await axios.get(`${API_BASE_URL}/admin/reports/sales-trend?${params.toString()}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setSalesTrendData(response.data.data || []);
            setSalesTrendTotal(Number(response.data.total || 0));
        } catch (err) {
            console.error('Failed to fetch sales trend', err);
            setSalesTrendData([]);
            setSalesTrendTotal(0);
        } finally {
            setSalesTrendLoading(false);
        }
    }, [dateRange, appliedFilters]);

    useEffect(() => {
        fetchSalesTrend();
    }, [fetchSalesTrend]);

    const fetchSalesReport = useCallback(async () => {
        setSalesReportLoading(true);
        try {
            const params = new URLSearchParams({
                dateRange,
                branch: appliedFilters.branch,
                cashier: appliedFilters.cashier
            });
            const response = await axios.get(`${API_BASE_URL}/admin/reports/sales?${params.toString()}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setSalesCategoryData(response.data.categorySales || []);
            setSalesOrders(response.data.orders || []);
        } catch (err) {
            console.error('Failed to fetch sales report', err);
            setSalesCategoryData([]);
            setSalesOrders([]);
        } finally {
            setSalesReportLoading(false);
        }
    }, [dateRange, appliedFilters]);

    useEffect(() => {
        fetchSalesReport();
    }, [fetchSalesReport]);

    const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;
    const formatDateTime = (value) => value ? new Date(value).toLocaleString() : 'N/A';
    const getSaleItemSubtotal = (sale) => (sale?.order_items || []).reduce((sum, item) => (
        sum + Number(item.subtotal || (Number(item.quantity || 0) * Number(item.item_price || 0)))
    ), 0);
    const getSalePaymentRows = (sale) => {
        if (Array.isArray(sale?.payment_details) && sale.payment_details.length > 0) {
            return sale.payment_details
                .map(payment => ({
                    method: String(payment?.method || '').trim(),
                    amount: Number(payment?.amount || 0)
                }))
                .filter(payment => payment.method && payment.amount > 0);
        }

        const method = String(sale?.payment_method || '').trim();
        const cashAmount = Number(sale?.cash_amount || 0);
        const totalAmount = Number(sale?.total_amount || 0);

        if (method) {
            return [{ method, amount: cashAmount || totalAmount }];
        }

        return totalAmount > 0 ? [{ method: 'Cash', amount: totalAmount }] : [];
    };

    const fetchProductReport = useCallback(async () => {
        setProductReportLoading(true);
        try {
            const params = new URLSearchParams({
                dateRange,
                branch: appliedFilters.branch,
                cashier: appliedFilters.cashier
            });
            const response = await axios.get(`${API_BASE_URL}/admin/reports/products?${params.toString()}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setProductReport({
                products: response.data.products || [],
                bestSellingItems: response.data.bestSellingItems || [],
                summary: response.data.summary || { soldQty: 0, revenue: 0, profit: 0, returnsQty: 0, productCount: 0 }
            });
        } catch (err) {
            console.error('Failed to fetch product report', err);
            setProductReport({
                products: [],
                bestSellingItems: [],
                summary: { soldQty: 0, revenue: 0, profit: 0, returnsQty: 0, productCount: 0 }
            });
        } finally {
            setProductReportLoading(false);
        }
    }, [dateRange, appliedFilters]);

    useEffect(() => {
        if (activeTab === 'product') {
            fetchProductReport();
        }
    }, [activeTab, fetchProductReport]);

    const fetchInventoryReport = useCallback(async () => {
        setInventoryReportLoading(true);
        try {
            const params = new URLSearchParams({
                dateRange,
                branch: appliedFilters.branch,
                cashier: appliedFilters.cashier
            });
            const response = await axios.get(`${API_BASE_URL}/admin/reports/inventory?${params.toString()}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setInventoryReport({
                summary: response.data.summary || { totalItems: 0, totalStockQty: 0, lowStockCount: 0, outOfStockCount: 0, stockValue: 0 },
                statusBreakdown: response.data.statusBreakdown || [],
                locationStock: response.data.locationStock || [],
                lowStockItems: response.data.lowStockItems || [],
                outOfStockItems: response.data.outOfStockItems || [],
                items: response.data.items || []
            });
        } catch (err) {
            console.error('Failed to fetch inventory report', err);
            setInventoryReport({
                summary: { totalItems: 0, totalStockQty: 0, lowStockCount: 0, outOfStockCount: 0, stockValue: 0 },
                statusBreakdown: [],
                locationStock: [],
                lowStockItems: [],
                outOfStockItems: [],
                items: []
            });
        } finally {
            setInventoryReportLoading(false);
        }
    }, [dateRange, appliedFilters]);

    useEffect(() => {
        if (activeTab === 'inventory') {
            fetchInventoryReport();
        }
    }, [activeTab, fetchInventoryReport]);

    const fetchSupplierReport = useCallback(async () => {
        setSupplierReportLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/admin/reports/suppliers`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setSupplierReport({
                suppliers: response.data.suppliers || [],
                summary: response.data.summary || { totalSuppliers: 0, activeSuppliers: 0, totalPurchases: 0, duePayments: 0, returnValue: 0 }
            });
        } catch (err) {
            console.error('Failed to fetch supplier report', err);
            setSupplierReport({
                suppliers: [],
                summary: { totalSuppliers: 0, activeSuppliers: 0, totalPurchases: 0, duePayments: 0, returnValue: 0 }
            });
        } finally {
            setSupplierReportLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'supplier') {
            fetchSupplierReport();
        }
    }, [activeTab, fetchSupplierReport]);

    const filteredSupplierReports = supplierReport.suppliers.filter((supplier) => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return true;
        return [
            supplier.supplier_name,
            supplier.company_name,
            supplier.supplier_id,
            supplier.phone_number,
            supplier.email
        ].some(value => String(value || '').toLowerCase().includes(query));
    });

    // Summary Stats - Dynamic + Mocked
    const summaryStats = [
        { title: 'Total Sales Today', value: stats ? `Rs. ${Number(stats.salesToday || 0).toLocaleString()}` : 'Rs. 0', trend: 'Orders', isUp: true, icon: DollarSign, color: '#16A34A', data: salesData },
        { title: 'Low Stock Items', value: stats ? String(stats.lowInventory?.length || 0) : '0', trend: 'Live Stock', isUp: false, icon: AlertTriangle, color: '#F59E0B', data: salesData },
        { title: 'Out of Stock', value: stats ? String(stats.outOfStockCount || stats.outOfStock?.length || 0) : '0', trend: 'Live Stock', isUp: false, icon: Package, color: '#EF4444', data: salesData },
    ];

    const reportCategories = [
        { id: 'sales', name: 'Sales Reports', icon: DollarSign },
        { id: 'product', name: 'Product Reports', icon: Package },
        { id: 'inventory', name: 'Inventory Reports', icon: BarChart2 },
        { id: 'purchase', name: 'Purchase Reports', icon: Briefcase },
        { id: 'supplier', name: 'Supplier Reports', icon: Truck },
        { id: 'cashier', name: 'Cashier Reports', icon: User },
    ];
    const cashierOptions = [
        'All Cashiers',
        ...new Set([
            ...cashierStaff.map(staff => staff.full_name || staff.username).filter(Boolean),
            ...(stats?.cashiers?.names || []),
            ...(stats?.onlineCashiers?.names || [])
        ])
    ];

    const handleExport = (type) => {
        const data = [
            ["Date", "Invoice", "Customer", "Amount", "Profit", "Method"],
            ["2026-05-19 14:32", "#INV-88241", "Walk-in Customer", 12450.00, 3210.00, "Cash"],
            ["2026-05-19 15:10", "#INV-88242", "Inuka Mapa", 8500.00, 2100.00, "Card"],
            ["2026-05-19 16:20", "#INV-88243", "Kasun Perera", 15200.00, 4500.00, "Cash"],
            ["2026-05-19 16:45", "#INV-88244", "Walk-in", 3400.00, 850.00, "Card"],
            ["2026-05-19 17:30", "#INV-88245", "Saman Silva", 22100.00, 6200.00, "Cash"]
        ];

        if (type === 'csv') {
            const csvContent = data.map(e => e.join(",")).join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `report_${activeTab}_${dateRange}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else if (type === 'excel') {
            const ws = XLSX.utils.aoa_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Report");
            XLSX.writeFile(wb, `report_${activeTab}_${dateRange}.xlsx`);
        } else if (type === 'pdf') {
            const doc = new jsPDF();
            doc.text(`${activeTab.toUpperCase()} REPORT - ${dateRange}`, 14, 15);
            doc.autoTable({
                head: [data[0]],
                body: data.slice(1),
                startY: 20,
            });
            doc.save(`report_${activeTab}_${dateRange}.pdf`);
        } else if (type === 'print') {
            window.print();
        } else if (type === 'image') {
            const chartElement = document.getElementById('report-charts-container');
            if (chartElement) {
                html2canvas(chartElement, { backgroundColor: '#ffffff' }).then(canvas => {
                    const link = document.createElement('a');
                    link.download = `report_chart_${activeTab}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                });
            }
        }
    };

    return (
        <DashboardLayout activePage="reports" onNavigate={onNavigate}>
            <div className="dashboard-page custom-scrollbar reports-page">

                {/* Page Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="section-title mb-0">Business Intelligence & Reports</h1>
                        <p className="text-secondary text-sm">Comprehensive insights and performance analytics for your hardware POS.</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="inventory-outline-btn report-page-btn flex items-center gap-2">
                            <Mail className="w-4 h-4" /> Email Report
                        </button>
                        <button className="inventory-outline-btn report-page-btn flex items-center gap-2">
                            <Printer className="w-4 h-4" /> Print View
                        </button>
                    </div>
                </div>

                {/* Summary Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    {summaryStats.map((stat, idx) => (
                        <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-50 hover:shadow-md transition-all group overflow-hidden relative">
                            <div className="flex justify-between items-start mb-2">
                                <div className={`p-2 rounded-xl text-white`} style={{ backgroundColor: stat.color }}>
                                    <stat.icon className="w-4 h-4" />
                                </div>
                                <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${stat.isUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                    {stat.isUp ? <ChevronUp className="w-2 h-2" /> : <ChevronDown className="w-2 h-2" />}
                                    {stat.trend}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-gray-500 text-[11px] font-bold uppercase tracking-wider">{stat.title}</h3>
                                <p className="text-lg font-bold text-gray-800">{stat.value}</p>
                            </div>

                            {/* Mini Chart Background */}
                            <div className="absolute bottom-0 left-0 right-0 h-10 opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stat.data}>
                                        <Area type="monotone" dataKey="value" stroke={stat.color} fill={stat.color} strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Global Filters & Search */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-50 mb-8">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative group">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600" />
                                <select
                                    className="report-filter-select pl-10 pr-8 py-2.5 appearance-none transition-all"
                                    value={dateRange}
                                    onChange={(e) => setDateRange(e.target.value)}
                                >
                                    <option>Today</option>
                                    <option>Yesterday</option>
                                    <option>Last 7 Days</option>
                                    <option>This Month</option>
                                    <option>Last Month</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 pointer-events-none" />
                            </div>

                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`inventory-outline-btn report-page-btn flex items-center gap-2 ${showFilters ? 'report-page-btn-active' : ''}`}
                            >
                                <Filter className="w-4 h-4" /> {showFilters ? 'Hide Filters' : 'Show Advanced Filters'}
                            </button>
                        </div>

                        <div className="w-full lg:w-96 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by Invoice, Product, Barcode, Customer..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D7E7DC] rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-400 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {showFilters && (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-50 animate-fade-in-down">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Branch</label>
                                <select
                                    className="report-filter-select w-full px-3 py-2 text-sm focus:outline-none"
                                    value={selectedBranch}
                                    onChange={(e) => setSelectedBranch(e.target.value)}
                                >
                                    <option>Main Branch</option>
                                    <option>Branch 02</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Cashier</label>
                                <select
                                    className="report-filter-select w-full px-3 py-2 text-sm focus:outline-none"
                                    value={selectedCashier}
                                    onChange={(e) => setSelectedCashier(e.target.value)}
                                >
                                    {cashierOptions.map((cashier) => (
                                        <option key={cashier}>{cashier}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end gap-2">
                                <button
                                    onClick={() => setAppliedFilters({ branch: selectedBranch, cashier: selectedCashier })}
                                    className="inventory-outline-btn report-page-btn report-apply-btn flex-1"
                                >
                                    Apply
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedBranch('Main Branch');
                                        setSelectedCashier('All Cashiers');
                                        setAppliedFilters({ branch: 'Main Branch', cashier: 'All Cashiers' });
                                    }}
                                    className="inventory-outline-btn report-page-icon-btn p-2"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Report Content Section */}
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* Left Navigation */}
                    <div className="w-full lg:w-72 space-y-2">
                        <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-50 mb-6">
                            <h3 className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.2em] mb-4 px-2">Report Explorer</h3>
                            <div className="space-y-1">
                                {reportCategories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveTab(cat.id)}
                                        className={`inventory-outline-btn report-explorer-btn w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all ${activeTab === cat.id ? 'report-explorer-btn-active' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <cat.icon className="w-4 h-4" />
                                            {cat.name}
                                        </div>
                                        <ArrowRight className={`w-3 h-3 transition-transform ${activeTab === cat.id ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'}`} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Export Menu */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-50 text-slate-700">
                            <h3 className="text-[11px] font-semibold text-slate-600 uppercase tracking-[0.2em] mb-4">Export Options</h3>
                            <div className="grid grid-cols-1 gap-3">
                                <button onClick={() => handleExport('excel')} className="inventory-outline-btn report-export-btn flex flex-col items-center justify-center p-4 rounded-2xl transition-all group">
                                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                        <BarChart2 className="w-5 h-5 text-green-500" />
                                    </div>
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">Excel</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Report Data Display */}
                    <div className="flex-1">
                        <div className="bg-white rounded-3xl shadow-sm border border-emerald-50 overflow-hidden min-h-[600px] flex flex-col">

                            {/* Report Sub-tabs / Details */}
                            <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">{reportCategories.find(c => c.id === activeTab)?.name}</h2>
                                    <p className="text-sm text-gray-500">Showing data for <span className="font-bold text-emerald-600">{dateRange}</span></p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            fetchSalesTrend();
                                            fetchSalesReport();
                                            if (activeTab === 'product') fetchProductReport();
                                            if (activeTab === 'inventory') fetchInventoryReport();
                                            if (activeTab === 'supplier') fetchSupplierReport();
                                        }}
                                        className="inventory-outline-btn report-page-icon-btn p-2"
                                        title="Refresh Data"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Dynamic Content Based on activeTab */}
                            <div className="p-8 flex-1" id="report-charts-container">
                                {activeTab === 'sales' && (
                                    <div className="animate-fade-in">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h4 className="text-sm font-bold text-gray-700">Sales Revenue Trend</h4>
                                                    <div className="flex items-center gap-1 text-xs text-slate-600 font-medium bg-slate-50 px-2 py-1 rounded-lg">
                                                        <TrendingUp className="w-3 h-3" /> Rs. {salesTrendTotal.toLocaleString()}
                                                    </div>
                                                </div>
                                                <div className="h-64">
                                                    {salesTrendLoading ? (
                                                        <div className="h-full flex items-center justify-center text-sm font-semibold text-gray-400">Loading sales...</div>
                                                    ) : (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <AreaChart data={salesTrendData}>
                                                                <defs>
                                                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                                        <stop offset="5%" stopColor="#16A34A" stopOpacity={0.3} />
                                                                        <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                                                                    </linearGradient>
                                                                </defs>
                                                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `Rs.${v / 1000}k`} />
                                                                <Tooltip
                                                                    formatter={(value) => [`Rs. ${Number(value).toLocaleString()}`, 'Sales']}
                                                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                                                />
                                                                <Area type="monotone" dataKey="value" stroke="#16A34A" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} />
                                                            </AreaChart>
                                                        </ResponsiveContainer>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                                <h4 className="text-sm font-bold text-gray-700 mb-6">Sales by Category</h4>
                                                <div className="h-64">
                                                    {salesReportLoading ? (
                                                        <div className="h-full flex items-center justify-center text-sm font-semibold text-gray-400">Loading categories...</div>
                                                    ) : salesCategoryData.length === 0 ? (
                                                        <div className="h-full flex items-center justify-center text-sm font-semibold text-gray-400">No category sales for this filter</div>
                                                    ) : (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart data={salesCategoryData}>
                                                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `Rs.${v / 1000}k`} />
                                                                <Tooltip formatter={(value) => [formatCurrency(value), 'Sales']} cursor={{ fill: 'transparent' }} />
                                                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                                    {salesCategoryData.map((entry, index) => (
                                                                        <Cell key={`cell-${entry.name}`} fill={['#16A34A', '#D4A017', '#3B82F6', '#EF4444', '#8B5CF6', '#0891B2'][index % 6]} />
                                                                    ))}
                                                                </Bar>
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto rounded-xl border border-gray-100 table-container">
                                            <table className="w-full text-left">
                                                <thead className="bg-gray-50 border-b border-gray-100">
                                                    <tr>
                                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoice</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cashier</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Items</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {salesReportLoading && (
                                                        <tr>
                                                            <td colSpan="6" className="px-6 py-8 text-center text-sm font-semibold text-gray-400">Loading sales...</td>
                                                        </tr>
                                                    )}
                                                    {!salesReportLoading && salesOrders.length === 0 && (
                                                        <tr>
                                                            <td colSpan="6" className="px-6 py-8 text-center text-sm font-semibold text-gray-400">No sales found for this filter</td>
                                                        </tr>
                                                    )}
                                                    {!salesReportLoading && salesOrders.map((row) => (
                                                        <tr key={row.order_id} onClick={() => setSelectedSale(row)} className="hover:bg-emerald-50/40 transition-all cursor-pointer">
                                                            <td className="px-6 py-4 text-sm text-gray-600">{formatDateTime(row.closed_at || row.created_at)}</td>
                                                            <td className="px-6 py-4 text-sm font-bold text-gray-800">#INV-{row.order_id}</td>
                                                            <td className="px-6 py-4 text-sm text-gray-600">{row.customer_phone || 'Walk-in Customer'}</td>
                                                            <td className="px-6 py-4 text-sm text-gray-600">{row.cashier?.cashier_name || 'N/A'}</td>
                                                            <td className="px-6 py-4 text-sm font-medium text-slate-800">{formatCurrency(row.total_amount)}</td>
                                                            <td className="px-6 py-4">
                                                                <span className="px-2 py-1 bg-slate-50 text-slate-600 text-[10px] font-medium rounded-md uppercase">
                                                                    {row.order_items?.length || 0} Items
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'inventory' && (
                                    <div className="animate-fade-in">
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 mb-8">
                                            {[
                                                { label: 'Inventory Items', value: inventoryReport.summary.totalItems, sub: 'Active stock records' },
                                                { label: 'Available Stock', value: inventoryReport.summary.totalStockQty, sub: 'Total quantity on hand' },
                                                { label: 'Low Stock', value: inventoryReport.summary.lowStockCount, sub: 'Needs reorder attention' },
                                                { label: 'Out of Stock', value: inventoryReport.summary.outOfStockCount, sub: 'Unavailable items' },
                                                { label: 'Stock Value', value: formatCurrency(inventoryReport.summary.stockValue), sub: 'Buying value estimate' }
                                            ].map((item) => (
                                                <div key={item.label} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{item.label}</p>
                                                    <p className="text-xl font-black text-gray-900 mt-2 truncate">{item.value}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{item.sub}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                                <h4 className="text-sm font-bold text-gray-700 mb-6">Stock Status Distribution</h4>
                                                <div className="h-64">
                                                    {inventoryReportLoading ? (
                                                        <div className="h-full flex items-center justify-center text-sm font-semibold text-gray-400">Loading stock status...</div>
                                                    ) : (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <RePieChart>
                                                                <Pie
                                                                    data={inventoryReport.statusBreakdown}
                                                                    innerRadius={60}
                                                                    outerRadius={84}
                                                                    paddingAngle={5}
                                                                    dataKey="value"
                                                                >
                                                                    {inventoryReport.statusBreakdown.map((entry) => (
                                                                        <Cell
                                                                            key={`stock-${entry.name}`}
                                                                            fill={entry.name === 'In Stock' ? '#16A34A' : entry.name === 'Low Stock' ? '#F59E0B' : '#EF4444'}
                                                                        />
                                                                    ))}
                                                                </Pie>
                                                                <Tooltip />
                                                                <Legend verticalAlign="bottom" height={36} />
                                                            </RePieChart>
                                                        </ResponsiveContainer>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                                <h4 className="text-sm font-bold text-gray-700 mb-6">Warehouse / Store Stock</h4>
                                                <div className="h-64">
                                                    {inventoryReportLoading ? (
                                                        <div className="h-full flex items-center justify-center text-sm font-semibold text-gray-400">Loading locations...</div>
                                                    ) : inventoryReport.locationStock.length === 0 ? (
                                                        <div className="h-full flex items-center justify-center text-sm font-semibold text-gray-400">No stock locations recorded</div>
                                                    ) : (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart data={inventoryReport.locationStock} layout="vertical" margin={{ left: 20 }}>
                                                                <XAxis type="number" hide />
                                                                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={110} />
                                                                <Tooltip formatter={(value) => [`${value} units`, 'Stock Qty']} />
                                                                <Bar dataKey="value" fill="#16A34A" radius={[0, 5, 5, 0]} barSize={20} />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                                            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                                                <div className="px-5 py-4 bg-amber-50 border-b border-amber-100">
                                                    <h4 className="text-sm font-black text-amber-800">Low Stock Alerts</h4>
                                                    <p className="text-xs text-amber-700/70 mt-1">Items at or below reorder level.</p>
                                                </div>
                                                <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto custom-scrollbar">
                                                    {inventoryReportLoading && <div className="p-5 text-sm font-semibold text-gray-400">Loading alerts...</div>}
                                                    {!inventoryReportLoading && inventoryReport.lowStockItems.length === 0 && <div className="p-5 text-sm font-semibold text-gray-400">No low stock alerts.</div>}
                                                    {!inventoryReportLoading && inventoryReport.lowStockItems.slice(0, 8).map((item) => (
                                                        <div key={item.id} className="px-5 py-4 flex items-center justify-between gap-4">
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-900">{item.ingredient_name}</p>
                                                                <p className="text-xs text-gray-500">{item.item_code || 'No code'} · Reorder at {item.reorder_level}</p>
                                                            </div>
                                                            <span className="text-sm font-black text-amber-600">{item.quantity} {item.unit}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                                                <div className="px-5 py-4 bg-red-50 border-b border-red-100">
                                                    <h4 className="text-sm font-black text-red-800">Out of Stock Items</h4>
                                                    <p className="text-xs text-red-700/70 mt-1">Items currently unavailable for sale.</p>
                                                </div>
                                                <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto custom-scrollbar">
                                                    {inventoryReportLoading && <div className="p-5 text-sm font-semibold text-gray-400">Loading out-of-stock items...</div>}
                                                    {!inventoryReportLoading && inventoryReport.outOfStockItems.length === 0 && <div className="p-5 text-sm font-semibold text-gray-400">No out-of-stock items.</div>}
                                                    {!inventoryReportLoading && inventoryReport.outOfStockItems.slice(0, 8).map((item) => (
                                                        <div key={item.id} className="px-5 py-4 flex items-center justify-between gap-4">
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-900">{item.ingredient_name}</p>
                                                                <p className="text-xs text-gray-500">{item.item_code || 'No code'} · {item.storage_location}</p>
                                                            </div>
                                                            <span className="text-sm font-black text-red-600">{item.quantity} {item.unit}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                                            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                                <div>
                                                    <h4 className="text-sm font-black text-gray-800">Inventory Stock Register</h4>
                                                    <p className="text-xs text-gray-500 mt-1">Current stock quantity, stock status, and warehouse/store location.</p>
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{dateRange}</span>
                                            </div>
                                            <div className="overflow-x-auto table-container">
                                                <table className="w-full text-left">
                                                    <thead className="bg-white border-b border-gray-100">
                                                        <tr>
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Stock</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reorder Level</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Warehouse / Store</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {inventoryReportLoading && (
                                                            <tr>
                                                                <td colSpan="6" className="px-6 py-8 text-center text-sm font-semibold text-gray-400">Loading inventory report...</td>
                                                            </tr>
                                                        )}
                                                        {!inventoryReportLoading && inventoryReport.items.length === 0 && (
                                                            <tr>
                                                                <td colSpan="6" className="px-6 py-8 text-center text-sm font-semibold text-gray-400">No inventory data found.</td>
                                                            </tr>
                                                        )}
                                                        {!inventoryReportLoading && inventoryReport.items.map((item) => (
                                                            <tr key={item.id} className="hover:bg-emerald-50/30 transition-all">
                                                                <td className="px-6 py-4">
                                                                    <p className="text-sm font-bold text-gray-900">{item.ingredient_name}</p>
                                                                    <p className="text-xs text-gray-400 mt-0.5">{item.item_code || 'No item code'}</p>
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-gray-600">{item.category || 'Uncategorized'}</td>
                                                                <td className="px-6 py-4 text-sm font-black text-gray-800">{item.quantity} {item.unit || ''}</td>
                                                                <td className="px-6 py-4 text-sm text-gray-600">{item.reorder_level} {item.unit || ''}</td>
                                                                <td className="px-6 py-4">
                                                                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${item.status === 'In Stock' ? 'bg-emerald-50 text-emerald-700' : item.status === 'Low Stock' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                                                                        {item.status}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-gray-600">{item.storage_location || 'Not Specified'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'product' && (
                                    <div className="animate-fade-in">
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
                                            {[
                                                { label: 'Products Sold', value: productReport.summary.productCount, sub: `${productReport.summary.soldQty} total units` },
                                                { label: 'Product Revenue', value: formatCurrency(productReport.summary.revenue), sub: 'Closed order revenue' },
                                                { label: 'Estimated Profit', value: formatCurrency(productReport.summary.profit), sub: 'Revenue minus buying cost' },
                                                { label: 'Returns Qty', value: productReport.summary.returnsQty, sub: 'Supplier return records' },
                                                { label: 'Best Seller', value: productReport.bestSellingItems[0]?.product || 'N/A', sub: `${productReport.bestSellingItems[0]?.soldQty || 0} units sold` }
                                            ].map((item) => (
                                                <div key={item.label} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{item.label}</p>
                                                    <p className="text-xl font-black text-gray-900 mt-2 truncate">{item.value}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{item.sub}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h4 className="text-sm font-bold text-gray-700">Best Selling Items</h4>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Sold Qty</span>
                                                </div>
                                                <div className="h-72">
                                                    {productReportLoading ? (
                                                        <div className="h-full flex items-center justify-center text-sm font-semibold text-gray-400">Loading products...</div>
                                                    ) : productReport.bestSellingItems.length === 0 ? (
                                                        <div className="h-full flex items-center justify-center text-sm font-semibold text-gray-400">No product sales for this filter</div>
                                                    ) : (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart data={productReport.bestSellingItems} layout="vertical" margin={{ left: 24 }}>
                                                                <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                                                <YAxis dataKey="product" type="category" stroke="#64748b" fontSize={11} width={120} tickLine={false} axisLine={false} />
                                                                <Tooltip formatter={(value) => [`${value} units`, 'Sold Qty']} cursor={{ fill: 'transparent' }} />
                                                                <Bar dataKey="soldQty" fill="#16A34A" radius={[0, 6, 6, 0]} barSize={20} />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                                <div className="flex justify-between items-center mb-6">
                                                    <h4 className="text-sm font-bold text-gray-700">Profit by Product</h4>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Top 5</span>
                                                </div>
                                                <div className="h-72">
                                                    {productReportLoading ? (
                                                        <div className="h-full flex items-center justify-center text-sm font-semibold text-gray-400">Loading profit...</div>
                                                    ) : productReport.products.length === 0 ? (
                                                        <div className="h-full flex items-center justify-center text-sm font-semibold text-gray-400">No profit data for this filter</div>
                                                    ) : (
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart data={[...productReport.products].sort((a, b) => b.profit - a.profit).slice(0, 5)}>
                                                                <XAxis dataKey="product" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `Rs.${v / 1000}k`} />
                                                                <Tooltip formatter={(value) => [formatCurrency(value), 'Profit']} cursor={{ fill: 'transparent' }} />
                                                                <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                                                                    {[...productReport.products].sort((a, b) => b.profit - a.profit).slice(0, 5).map((item, index) => (
                                                                        <Cell key={`profit-${item.item_id || item.product}`} fill={['#D4A017', '#16A34A', '#3B82F6', '#8B5CF6', '#EF4444'][index % 5]} />
                                                                    ))}
                                                                </Bar>
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                                            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                                <div>
                                                    <h4 className="text-sm font-black text-gray-800">Product Performance</h4>
                                                    <p className="text-xs text-gray-500 mt-1">Quantity, revenue, profit, and returns for the selected report filters.</p>
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{dateRange}</span>
                                            </div>
                                            <div className="overflow-x-auto table-container">
                                                <table className="w-full text-left">
                                                    <thead className="bg-white border-b border-gray-100">
                                                        <tr>
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sold Qty</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Revenue</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Profit</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Returns</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {productReportLoading && (
                                                            <tr>
                                                                <td colSpan="6" className="px-6 py-8 text-center text-sm font-semibold text-gray-400">Loading product report...</td>
                                                            </tr>
                                                        )}
                                                        {!productReportLoading && productReport.products.length === 0 && (
                                                            <tr>
                                                                <td colSpan="6" className="px-6 py-8 text-center text-sm font-semibold text-gray-400">No product performance data found for this filter</td>
                                                            </tr>
                                                        )}
                                                        {!productReportLoading && productReport.products.map((product) => (
                                                            <tr key={product.item_id || product.product} className="hover:bg-emerald-50/30 transition-all">
                                                                <td className="px-6 py-4">
                                                                    <p className="text-sm font-bold text-gray-900">{product.product}</p>
                                                                    <p className="text-xs text-gray-400 mt-0.5">{product.item_code || 'No item code'}</p>
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-gray-600">{product.category}</td>
                                                                <td className="px-6 py-4 text-sm font-bold text-gray-800">{product.soldQty} {product.unit || ''}</td>
                                                                <td className="px-6 py-4 text-sm font-medium text-slate-800">{formatCurrency(product.revenue)}</td>
                                                                <td className="px-6 py-4 text-sm font-medium text-slate-800">{formatCurrency(product.profit)}</td>
                                                                <td className="px-6 py-4">
                                                                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${product.returnsQty > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>
                                                                        {product.returnsQty} returned
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'supplier' && (
                                    <div className="animate-fade-in">
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
                                            {[
                                                { label: 'Suppliers', value: supplierReport.summary.totalSuppliers, sub: 'Registered suppliers' },
                                                { label: 'Active Suppliers', value: supplierReport.summary.activeSuppliers, sub: 'Purchased within 90 days' },
                                                { label: 'Total Purchases', value: formatCurrency(supplierReport.summary.totalPurchases), sub: 'All supplier batches' },
                                                { label: 'Due Payments', value: formatCurrency(supplierReport.summary.duePayments), sub: 'Outstanding balances' },
                                                { label: 'Return Value', value: formatCurrency(supplierReport.summary.returnValue), sub: 'Supplier return value' }
                                            ].map((item) => (
                                                <div key={item.label} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{item.label}</p>
                                                    <p className="text-xl font-black text-gray-900 mt-2 truncate">{item.value}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{item.sub}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                                            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                                <div>
                                                    <h4 className="text-sm font-black text-gray-800">Supplier Directory & Performance</h4>
                                                    <p className="text-xs text-gray-500 mt-1">Search suppliers and open a complete supplier report with products, purchases, due payments, payment history, and returns.</p>
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{filteredSupplierReports.length} Showing</span>
                                            </div>
                                            <div className="overflow-x-auto table-container">
                                                <table className="w-full text-left">
                                                    <thead className="bg-white border-b border-gray-100">
                                                        <tr>
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Supplier</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Products</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Purchases</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Due</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Purchase</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {supplierReportLoading && (
                                                            <tr>
                                                                <td colSpan="7" className="px-6 py-8 text-center text-sm font-semibold text-gray-400">Loading supplier reports...</td>
                                                            </tr>
                                                        )}
                                                        {!supplierReportLoading && filteredSupplierReports.length === 0 && (
                                                            <tr>
                                                                <td colSpan="7" className="px-6 py-8 text-center text-sm font-semibold text-gray-400">No suppliers found.</td>
                                                            </tr>
                                                        )}
                                                        {!supplierReportLoading && filteredSupplierReports.map((supplier) => (
                                                            <tr key={supplier.id} onClick={() => setSelectedSupplierReport(supplier)} className="hover:bg-emerald-50/40 transition-all cursor-pointer">
                                                                <td className="px-6 py-4">
                                                                    <p className="text-sm font-bold text-gray-900">{supplier.supplier_name}</p>
                                                                    <p className="text-xs text-gray-400 mt-0.5">{supplier.supplier_id} · {supplier.company_name || 'Individual'}</p>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <p className="text-sm text-gray-700">{supplier.phone_number || 'N/A'}</p>
                                                                    <p className="text-xs text-gray-400 mt-0.5">{supplier.email || 'No email'}</p>
                                                                </td>
                                                                <td className="px-6 py-4 text-sm font-bold text-gray-800">{supplier.metrics.products_count}</td>
                                                                <td className="px-6 py-4 text-sm font-medium text-slate-800">{formatCurrency(supplier.metrics.total_purchases)}</td>
                                                                <td className="px-6 py-4 text-sm font-medium text-slate-800">{formatCurrency(supplier.metrics.due_payments)}</td>
                                                                <td className="px-6 py-4 text-sm text-gray-600">{supplier.metrics.last_purchase_date ? new Date(supplier.metrics.last_purchase_date).toLocaleDateString() : 'N/A'}</td>
                                                                <td className="px-6 py-4">
                                                                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${supplier.metrics.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                                        {supplier.metrics.status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'purchase' && (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4">
                                            <Briefcase className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-800">Purchase Reports</h3>
                                        <p className="text-gray-500 max-w-sm">To view purchase reports, open the supplier module and review the Recent Purchases section.</p>
                                        <button
                                            onClick={() => onNavigate('supplier', { focusSection: 'recent-purchases' })}
                                            className="inventory-outline-btn report-page-btn mt-6 px-6 py-2"
                                        >
                                            View Purchase Reports
                                        </button>
                                    </div>
                                )}

                                {activeTab === 'cashier' && (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                                            <User className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-800">Cashier Reports</h3>
                                        <p className="text-gray-500 max-w-sm">To view cashier reports, open the cash counter management page.</p>
                                        <button
                                            onClick={() => onNavigate('cash-management')}
                                            className="inventory-outline-btn report-page-btn mt-6 px-6 py-2"
                                        >
                                            View Cashier Reports
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {selectedSale && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 py-6">
                    {(() => {
                        const itemSubtotal = getSaleItemSubtotal(selectedSale);
                        const discount = Number(selectedSale.discount || 0);
                        const otherCharges = Number(selectedSale.other_charges || 0);
                        const finalTotal = Number(selectedSale.total_amount || 0);
                        const paymentRows = getSalePaymentRows(selectedSale);
                        const paidTotal = paymentRows.reduce((sum, payment) => sum + payment.amount, 0);
                        const balance = Math.max(finalTotal - paidTotal, 0);

                        return (
                            <div className="w-full max-w-6xl max-h-[92vh] overflow-hidden bg-white rounded-2xl shadow-2xl border border-[#D7E7DC] flex flex-col">
                                <div className="px-7 py-5 border-b border-[#D7E7DC] flex items-start justify-between bg-[#F8FCFA]">
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-700">Sales Invoice Details</p>
                                        <div className="flex flex-wrap items-center gap-3 mt-2">
                                            <h2 className="text-[2rem] font-semibold text-slate-950">#INV-{selectedSale.order_id}</h2>
                                            <span className="px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-[11px] font-bold uppercase text-emerald-700">
                                                {selectedSale.status || 'Closed'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 mt-1">Closed: {formatDateTime(selectedSale.closed_at || selectedSale.created_at)}</p>
                                    </div>
                                    <button onClick={() => setSelectedSale(null)} className="inventory-outline-btn report-page-icon-btn p-2" title="Close">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="overflow-y-auto p-7 custom-scrollbar bg-white">
                                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
                                        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="border border-gray-100 rounded-xl p-5 bg-white">
                                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Customer</p>
                                                <p className="text-[1rem] font-semibold text-slate-900 mt-3">{selectedSale.customer_name || (selectedSale.customer_phone ? 'Registered Customer' : 'Walk-in Customer')}</p>
                                                <p className="text-sm text-slate-500 mt-1">Phone: {selectedSale.customer_phone || 'N/A'}</p>
                                            </div>
                                            <div className="border border-gray-100 rounded-xl p-5 bg-white">
                                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Cashier</p>
                                                <p className="text-[1rem] font-semibold text-slate-900 mt-3">{selectedSale.cashier?.cashier_name || 'N/A'}</p>
                                                <p className="text-sm text-slate-500 mt-1">Counter: {selectedSale.cashier?.counter_number || 'N/A'}</p>
                                            </div>
                                            <div className="rounded-xl border border-gray-100 p-5">
                                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Order</p>
                                                <p className="text-sm font-semibold text-slate-800 mt-3">Order ID: {selectedSale.order_id}</p>
                                                <p className="text-sm text-slate-500 mt-1">Type: {selectedSale.table_id ? `Table ${selectedSale.table_id}` : 'Direct Sale'}</p>
                                            </div>
                                            <div className="rounded-xl border border-gray-100 p-5">
                                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Time</p>
                                                <p className="text-sm font-semibold text-slate-800 mt-3">Created: {formatDateTime(selectedSale.created_at)}</p>
                                                <p className="text-sm text-slate-500 mt-1">Closed: {formatDateTime(selectedSale.closed_at)}</p>
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-[#D7E7DC] bg-[#F8FCFA] p-5">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Billing Summary</p>
                                            <div className="mt-4 space-y-3">
                                                <div className="flex justify-between text-sm text-slate-600"><span>Items Subtotal</span><strong className="text-slate-900">{formatCurrency(itemSubtotal)}</strong></div>
                                                <div className="flex justify-between text-sm text-slate-600"><span>Discount</span><strong className="text-rose-600">- {formatCurrency(discount)}</strong></div>
                                                <div className="flex justify-between text-sm text-slate-600"><span>Other Charges</span><strong className="text-slate-900">+ {formatCurrency(otherCharges)}</strong></div>
                                                {otherCharges > 0 && (
                                                    <div className="rounded-lg border border-emerald-100 bg-white p-3">
                                                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Other Charge Reason</p>
                                                        <p className="text-sm font-medium text-slate-800 mt-1">{selectedSale.other_charges_reason || 'Not provided'}</p>
                                                    </div>
                                                )}
                                                <div className="border-t border-[#D7E7DC] pt-4 flex justify-between items-end">
                                                    <span className="text-sm font-bold uppercase tracking-[0.12em] text-slate-700">Grand Total</span>
                                                    <strong className="text-2xl text-slate-950">{formatCurrency(finalTotal)}</strong>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                                        <div className="xl:col-span-2 rounded-xl border border-gray-100 overflow-hidden">
                                            <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                                <h3 className="text-[1.05rem] font-semibold text-slate-800">Sold Items</h3>
                                                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{selectedSale.order_items?.length || 0} Items</span>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead className="bg-white border-b border-gray-100">
                                                        <tr>
                                                            <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.16em]">Item</th>
                                                            <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.16em]">Category</th>
                                                            <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.16em]">Code</th>
                                                            <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.16em]">Qty</th>
                                                            <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.16em]">Unit Price</th>
                                                            <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.16em] text-right">Line Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {selectedSale.order_items?.map((item) => (
                                                            <tr key={item.order_item_id}>
                                                                <td className="px-5 py-4 text-sm font-semibold text-slate-800">{item.item_name}</td>
                                                                <td className="px-5 py-4 text-sm text-gray-600">{item.category || 'Uncategorized'}</td>
                                                                <td className="px-5 py-4 text-sm text-gray-500">{item.item_code || 'N/A'}</td>
                                                                <td className="px-5 py-4 text-sm text-gray-600">{item.quantity} {item.unit || ''}</td>
                                                                <td className="px-5 py-4 text-sm text-gray-600">{formatCurrency(item.item_price)}</td>
                                                                <td className="px-5 py-4 text-sm font-semibold text-emerald-700 text-right">{formatCurrency(item.subtotal)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        <div className="space-y-5">
                                            <div className="rounded-xl border border-gray-100 p-5 bg-white">
                                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Payment Details</p>
                                                <div className="mt-4 space-y-3">
                                                    {paymentRows.map((payment, index) => (
                                                        <div key={`${payment.method}-${index}`} className="flex justify-between text-sm">
                                                            <span className="font-medium text-slate-600">{payment.method}</span>
                                                            <strong className="text-slate-900">{formatCurrency(payment.amount)}</strong>
                                                        </div>
                                                    ))}
                                                    <div className="border-t border-gray-100 pt-3 flex justify-between text-sm"><span className="text-slate-500">Paid Total</span><strong className="text-emerald-700">{formatCurrency(paidTotal)}</strong></div>
                                                    <div className="flex justify-between text-sm"><span className="text-slate-500">Balance</span><strong className={balance > 0 ? 'text-rose-600' : 'text-slate-900'}>{formatCurrency(balance)}</strong></div>
                                                </div>
                                            </div>
                                            <div className="rounded-xl border border-gray-100 p-5 bg-white">
                                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Notes</p>
                                                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{selectedSale.notes || 'No notes recorded for this invoice.'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-7 py-4 border-t border-gray-100 bg-white flex justify-end">
                                    <button onClick={() => setSelectedSale(null)} className="inventory-outline-btn report-page-btn px-5 py-2">Close</button>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {selectedSupplierReport && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 py-6">
                    <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between bg-gray-50">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[2px] text-emerald-600">Supplier Performance Report</p>
                                <h2 className="text-2xl font-black text-gray-900 mt-1">{selectedSupplierReport.supplier_name}</h2>
                                <p className="text-sm text-gray-500 mt-1">{selectedSupplierReport.supplier_id} · {selectedSupplierReport.company_name || 'Individual Supplier'}</p>
                            </div>
                            <button
                                onClick={() => setSelectedSupplierReport(null)}
                                className="p-2 rounded-xl bg-white text-gray-500 hover:text-red-500 hover:bg-red-50 border border-gray-100 transition-all"
                                title="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-6 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                <div className="border border-gray-100 rounded-xl p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Contact Details</p>
                                    <p className="text-sm font-bold text-gray-900 mt-2">{selectedSupplierReport.phone_number || 'N/A'}</p>
                                    <p className="text-xs text-gray-500 mt-1">{selectedSupplierReport.email || 'No email'}</p>
                                    <p className="text-xs text-gray-500 mt-1">{selectedSupplierReport.address || 'No address'}</p>
                                </div>
                                <div className="border border-[#D7E7DC] rounded-xl p-4 bg-white">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Total Purchases</p>
                                    <p className="text-xl font-semibold text-slate-900 mt-2">{formatCurrency(selectedSupplierReport.metrics.total_purchases)}</p>
                                    <p className="text-xs text-slate-500 mt-1">{selectedSupplierReport.metrics.batch_count} purchase batches</p>
                                </div>
                                <div className="border border-[#D7E7DC] rounded-xl p-4 bg-white">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Due Payments</p>
                                    <p className="text-xl font-semibold text-slate-900 mt-2">{formatCurrency(selectedSupplierReport.metrics.due_payments)}</p>
                                    <p className="text-xs text-slate-500 mt-1">{selectedSupplierReport.metrics.payment_completion}% settled</p>
                                </div>
                                <div className="border border-gray-100 rounded-xl p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Supplier Status</p>
                                    <p className="text-xl font-black text-gray-900 mt-2">{selectedSupplierReport.metrics.status}</p>
                                    <p className="text-xs text-gray-500 mt-1">Last purchase: {selectedSupplierReport.metrics.last_purchase_date ? new Date(selectedSupplierReport.metrics.last_purchase_date).toLocaleDateString() : 'N/A'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                <div className="rounded-xl border border-gray-100 overflow-hidden">
                                    <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
                                        <h3 className="text-sm font-black text-gray-800">Products Supplied</h3>
                                    </div>
                                    <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto custom-scrollbar">
                                        {selectedSupplierReport.products_supplied.length === 0 && <div className="p-5 text-sm font-semibold text-gray-400">No supplied products recorded.</div>}
                                        {selectedSupplierReport.products_supplied.map((product) => (
                                            <div key={product.code || product.name} className="px-5 py-4 flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{product.name}</p>
                                                    <p className="text-xs text-gray-500">{product.code || 'No code'} · {product.category}</p>
                                                </div>
                                                <span className="text-xs font-black text-gray-400">{product.unit || ''}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-gray-100 overflow-hidden">
                                    <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
                                        <h3 className="text-sm font-black text-gray-800">Supplier Performance</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-0">
                                        {[
                                            ['Products Supplied', selectedSupplierReport.metrics.products_count],
                                            ['Return Qty', selectedSupplierReport.metrics.return_qty],
                                            ['Return Value', formatCurrency(selectedSupplierReport.metrics.return_value)],
                                            ['Total Paid', formatCurrency(selectedSupplierReport.metrics.total_paid)]
                                        ].map(([label, value]) => (
                                            <div key={label} className="p-5 border-b border-r border-gray-50">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
                                                <p className="text-lg font-black text-gray-900 mt-2">{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-gray-100 overflow-hidden mb-6">
                                <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
                                    <h3 className="text-sm font-black text-gray-800">Purchase History</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-white border-b border-gray-100">
                                            <tr>
                                                <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Batch</th>
                                                <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                                <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Items</th>
                                                <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Purchase</th>
                                                <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Paid</th>
                                                <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Due</th>
                                                <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {selectedSupplierReport.purchase_history.length === 0 && (
                                                <tr><td colSpan="7" className="px-5 py-6 text-center text-sm font-semibold text-gray-400">No purchase history.</td></tr>
                                            )}
                                            {selectedSupplierReport.purchase_history.map((batch) => (
                                                <tr key={batch.id}>
                                                    <td className="px-5 py-4 text-sm font-bold text-gray-900">{batch.batch_number}</td>
                                                    <td className="px-5 py-4 text-sm text-gray-600">{formatDateTime(batch.batch_date)}</td>
                                                    <td className="px-5 py-4 text-sm text-gray-600">{batch.item_count}</td>
                                                    <td className="px-5 py-4 text-sm font-medium text-slate-800">{formatCurrency(batch.net_value)}</td>
                                                    <td className="px-5 py-4 text-sm text-gray-700">{formatCurrency(batch.paid_amount)}</td>
                                                    <td className="px-5 py-4 text-sm font-medium text-slate-800">{formatCurrency(batch.due_amount)}</td>
                                                    <td className="px-5 py-4 text-xs font-black text-gray-500">{batch.payment_status}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="rounded-xl border border-gray-100 overflow-hidden">
                                    <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
                                        <h3 className="text-sm font-black text-gray-800">Payment History</h3>
                                    </div>
                                    <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto custom-scrollbar">
                                        {selectedSupplierReport.payment_history.length === 0 && <div className="p-5 text-sm font-semibold text-gray-400">No payment history recorded.</div>}
                                        {selectedSupplierReport.payment_history.map((payment, idx) => (
                                            <div key={`${payment.source}-${idx}`} className="px-5 py-4 flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{payment.source}</p>
                                                    <p className="text-xs text-gray-500">{payment.batch_number} · {payment.method} · {formatDateTime(payment.date)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-medium text-slate-800">{formatCurrency(payment.amount)}</p>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase">{payment.status}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-gray-100 overflow-hidden">
                                    <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
                                        <h3 className="text-sm font-black text-gray-800">Return History</h3>
                                    </div>
                                    <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto custom-scrollbar">
                                        {selectedSupplierReport.return_history.length === 0 && <div className="p-5 text-sm font-semibold text-gray-400">No return history recorded.</div>}
                                        {selectedSupplierReport.return_history.map((ret) => (
                                            <div key={ret.id} className="px-5 py-4 flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{ret.product}</p>
                                                    <p className="text-xs text-gray-500">{ret.return_number} · {ret.return_type} · {formatDateTime(ret.created_at)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-red-600">{ret.quantity} units</p>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase">{ret.status}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end">
                            <button
                                onClick={() => setSelectedSupplierReport(null)}
                                className="inventory-outline-btn report-page-btn px-5 py-2"
                            >
                                Close Report
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes fade-in-down {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in-down {
                    animation: fade-in-down 0.4s ease-out;
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                }
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </DashboardLayout>
    );
};

export default ReportsPage;
