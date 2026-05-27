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
        <div className="cash-card bg-white border border-[#D7E7DC] rounded-2xl p-8 shadow-sm relative overflow-hidden">
            <h3 className="text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-6 relative z-10 flex items-center gap-3">
                <span className="w-1.5 h-5 bg-emerald-600 rounded-full"></span>
                Cash Denomination Counter
            </h3>
            <div className="relative z-10 overflow-hidden rounded-xl border border-[#D7E7DC]">
                <table className="w-full border-collapse text-left">
                    <thead>
                        <tr className="bg-[#F8FCFA] border-b border-[#D7E7DC]">
                            <th className="p-4 font-semibold uppercase tracking-[0.18em] text-[10px] text-slate-500">Denomination</th>
                            <th className="p-4 font-semibold uppercase tracking-[0.18em] text-[10px] text-slate-500 text-center">Quantity</th>
                            <th className="p-4 font-semibold uppercase tracking-[0.18em] text-[10px] text-slate-500 text-right">Line Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAF1EC]">
                        {denominations.map(den => (
                            <tr key={den.key} className="hover:bg-[#FCFEFD] transition-colors">
                                <td className="p-4 font-medium text-slate-800">{den.label}</td>
                                <td className="p-4 text-center">
                                    <input
                                        type="number"
                                        min="0"
                                        value={counts[den.key] || ''}
                                        onChange={(e) => handleCountChange(den.key, e.target.value)}
                                        disabled={readOnly}
                                        placeholder="0"
                                        className="w-24 h-11 px-3 py-2 bg-white border border-[#E2E8F0] rounded-xl text-slate-700 text-center font-normal focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 transition-all placeholder-slate-300 disabled:opacity-70"
                                    />
                                </td>
                                <td className="p-4 text-right font-medium text-slate-800 tabular-nums">
                                    Rs. {totals[den.key]?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 pt-6 border-t border-[#E2E8F0] flex justify-between items-center relative z-10">
                <span className="text-slate-500 text-[0.78rem] font-semibold uppercase tracking-[0.18em]">Grand Total</span>
                <span className="text-[1.05rem] font-semibold text-slate-900 truncate whitespace-nowrap">
                    Rs. {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
            </div>
        </div>
    );
};

export default DenominationCounter;
