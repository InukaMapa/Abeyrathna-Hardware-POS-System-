import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/api';

const ShiftStartForm = ({ onShiftStarted }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        cashier_name: user?.username || '',
        counter_number: '1',
        opening_cash: '0'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Sync cashier name if user state loads later
    React.useEffect(() => {
        if (user?.username && !formData.cashier_name) {
            setFormData(prev => ({ ...prev, cashier_name: user.username }));
        }
    }, [user, formData.cashier_name]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/cash/start-shift`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Failed to start shift');

            onShiftStarted(data.shift);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-sm mx-auto mt-16">
            <div className="bg-[#1E1E1E] border border-[#333333] rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/5 rounded-full -mr-12 -mt-12 blur-2xl"></div>

                <div className="text-center mb-8 relative z-10">
                    <div className="w-16 h-16 bg-red-600/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-red-600/20">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tight mb-1">Initialize Shift</h2>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Opening cash balance</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">
                                Cashier Name
                            </label>
                            <input
                                type="text"
                                value={formData.cashier_name}
                                readOnly
                                className="block w-full px-4 py-3 bg-gray-900/30 border border-[#333] rounded-xl text-gray-500 font-bold text-sm focus:outline-none cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">
                                Counter
                            </label>
                            <select
                                value={formData.counter_number}
                                onChange={(e) => setFormData({ ...formData, counter_number: e.target.value })}
                                className="block w-full px-4 py-3 bg-gray-900 border border-[#444] rounded-xl text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50 appearance-none"
                            >
                                <option value="1">C-01</option>
                                <option value="2">C-02</option>
                                <option value="3">C-03</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">
                                Time
                            </label>
                            <div className="px-4 py-3 bg-gray-900/30 border border-[#333] rounded-xl text-gray-500 font-bold text-[10px] flex items-center h-[46px]">
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">
                            Opening Balance (Rs.)
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span className="text-gray-600 font-bold text-base">Rs.</span>
                            </div>
                            <input
                                type="number"
                                step="0.01"
                                required
                                min="0"
                                value={formData.opening_cash}
                                onChange={(e) => setFormData({ ...formData, opening_cash: e.target.value })}
                                className="block w-full pl-12 pr-4 py-4 bg-gray-900 border border-[#444] rounded-xl text-white text-xl font-black placeholder-gray-800 focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-600 transition-all font-mono"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-500 font-bold text-xs flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-red-600 text-white font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-700 transition-all transform active:scale-95 shadow-lg shadow-red-600/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Starting...
                            </span>
                        ) : (
                            'Start New Shift'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ShiftStartForm;
