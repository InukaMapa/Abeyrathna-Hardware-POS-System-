import React, { useState, useEffect } from 'react';

const DenominationCounter = ({ onTotalChange, initialCounts, shiftId = 'default', readOnly = false }) => {
    const denominations = [
        { label: 'Rs 5000', value: 5000, key: 'rs5000' },
        { label: 'Rs 2000', value: 2000, key: 'rs2000' },
        { label: 'Rs 1000', value: 1000, key: 'rs1000' },
        { label: 'Rs 500', value: 500, key: 'rs500' },
        { label: 'Rs 100', value: 100, key: 'rs100' },
        { label: 'Rs 50', value: 50, key: 'rs50' },
        { label: 'Rs 20', value: 20, key: 'rs20' },
        { label: 'Rs 10', value: 10, key: 'rs10' },
        { label: 'Rs 5', value: 5, key: 'rs5' },
        { label: 'Rs 2', value: 2, key: 'rs2' },
        { label: 'Rs 1', value: 1, key: 'rs1' },
    ];

    const [counts, setCounts] = useState(() => {
        const defaultCounts = {
            rs5000: 0, rs2000: 0, rs1000: 0, rs500: 0, rs100: 0,
            rs50: 0, rs20: 0, rs10: 0, rs5: 0, rs2: 0, rs1: 0
        };

        const hasInitial = initialCounts && Object.values(initialCounts).some(v => v > 0);

        if (hasInitial) {
            return { ...defaultCounts, ...initialCounts };
        }

        try {
            const draftStr = localStorage.getItem(`cash_denominations_draft_${shiftId}`);
            if (draftStr) {
                const draft = JSON.parse(draftStr);
                return { ...defaultCounts, ...draft };
            }
        } catch (e) {
            console.error('Failed to parse draft from localStorage', e);
        }

        return { ...defaultCounts, ...initialCounts };
    });

    const [totals, setTotals] = useState({});
    const [grandTotal, setGrandTotal] = useState(0);

    useEffect(() => {
        let newGrandTotal = 0;
        const newTotals = {};
        denominations.forEach(den => {
            const rowTotal = (counts[den.key] || 0) * den.value;
            newTotals[den.key] = rowTotal;
            newGrandTotal += rowTotal;
        });
        setTotals(newTotals);
        setGrandTotal(newGrandTotal);
        onTotalChange(newGrandTotal, counts);

        if (!readOnly) {
            localStorage.setItem(`cash_denominations_draft_${shiftId}`, JSON.stringify(counts));
        }
    }, [counts, shiftId, readOnly]);

    const handleCountChange = (key, value) => {
        const num = parseInt(value) || 0;
        setCounts(prev => ({ ...prev, [key]: num }));
    };

    return (
        <div className="cash-card bg-[#1E1E1E] border border-[#333333] rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-red-600/5 rounded-full -ml-16 -mt-16 blur-2xl"></div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-500 mb-8 relative z-10 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-red-600 rounded-full"></span>
                Cash Denomination Counter
            </h3>
            <div className="relative z-10 overflow-hidden rounded-xl border border-[#333333]">
                <table className="w-full border-collapse text-left">
                    <thead>
                        <tr className="bg-gray-800/50 border-b border-[#333333]">
                            <th className="p-4 font-bold uppercase tracking-widest text-[10px] text-gray-500">Denomination</th>
                            <th className="p-4 font-bold uppercase tracking-widest text-[10px] text-gray-500 text-center">Quantity</th>
                            <th className="p-4 font-bold uppercase tracking-widest text-[10px] text-gray-500 text-right">Line Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#333333]">
                        {denominations.map(den => (
                            <tr key={den.key} className="hover:bg-white/[0.02] transition-colors">
                                <td className="p-4 font-bold text-gray-300">{den.label}</td>
                                <td className="p-4 text-center">
                                    <input
                                        type="number"
                                        min="0"
                                        value={counts[den.key] || ''}
                                        onChange={(e) => handleCountChange(den.key, e.target.value)}
                                        disabled={readOnly}
                                        placeholder="0"
                                        className="w-20 px-3 py-2 bg-gray-900/50 border border-[#444] rounded-lg text-white text-center font-bold focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600 transition-all placeholder-gray-700 disabled:opacity-50"
                                    />
                                </td>
                                <td className="p-4 text-right font-black text-white tabular-nums">
                                    Rs. {totals[den.key]?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 pt-6 border-t-2 border-dashed border-[#333333] flex justify-between items-center relative z-10">
                <span className="text-gray-400 text-sm font-black uppercase tracking-widest">Grand Total</span>
                <span className="text-xl font-black text-red-600 tracking-tighter truncate whitespace-nowrap">
                    Rs. {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            </div>
        </div>
    );
};

export default DenominationCounter;
