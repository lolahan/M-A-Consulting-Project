import React, { useMemo, useState } from 'react';
import { useRenegoStore } from '@/lib/store';
import { Scenario, getEffectiveInputs } from '@/lib/scenarioUtils';
import { computeDealAnalysis } from '@/lib/calc';
import { formatEuroM, formatMonths } from '@/lib/formatters';

interface ComparisonTableProps {
    scenarios: Scenario[];
    onClose: () => void;
}

type SortField = 'npv' | 'payback' | 'name';

export default function ComparisonTable({ scenarios, onClose }: ComparisonTableProps) {
    const [sortField, setSortField] = useState<SortField>('npv');
    const { useFeasibleRevenue } = useRenegoStore();

    const comparisonData = useMemo(() => {
        return scenarios.map(s => {
            const effectiveInputs = getEffectiveInputs(s, useFeasibleRevenue);
            const analysis = computeDealAnalysis(effectiveInputs);
            // Payback for sorting: use months value or Infinity if null
            const paybackVal = analysis.paybackMonths ?? 999;

            return {
                id: s.id,
                name: s.name,
                inputs: s.inputs,
                analysis,
                paybackVal,
            };
        });
    }, [scenarios, useFeasibleRevenue]);

    const sortedData = useMemo(() => {
        return [...comparisonData].sort((a, b) => {
            if (sortField === 'npv') return b.analysis.dealNPV - a.analysis.dealNPV;
            if (sortField === 'payback') return a.paybackVal - b.paybackVal;
            return a.name.localeCompare(b.name);
        });
    }, [comparisonData, sortField]);

    if (scenarios.length === 0) return null;

    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Scenario Comparison</h3>
                    <div className="flex bg-white rounded-lg border border-gray-200 p-0.5">
                        <button onClick={() => setSortField('npv')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${sortField === 'npv' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Sort NPV</button>
                        <button onClick={() => setSortField('payback')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${sortField === 'payback' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Sort Payback</button>
                    </div>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-6 py-4 font-medium text-gray-400 uppercase tracking-wider text-[10px] w-48">Metric</th>
                            {sortedData.map(s => (
                                <th key={s.id} className="px-6 py-4 font-bold text-gray-800 min-w-[160px]">
                                    <div className="flex flex-col">
                                        <span>{s.name}</span>
                                        <span className="text-[9px] font-normal text-gray-400 mt-0.5 font-mono">{(s.inputs.newRoyaltyRate * 100).toFixed(1)}% Royalty</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {/* Key Financials */}
                        <tr className="hover:bg-blue-50/30 transition-colors group">
                            <td className="px-6 py-3 font-bold text-gray-700 group-hover:text-blue-700">Deal NPV</td>
                            {sortedData.map(s => (
                                <td key={s.id} className={`px-6 py-3 font-mono font-bold ${s.analysis.dealNPV > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {formatEuroM(s.analysis.dealNPV / 1000000)}
                                </td>
                            ))}
                        </tr>
                        <tr className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-3 text-gray-600">Discounted Payback</td>
                            {sortedData.map(s => (
                                <td key={s.id} className="px-6 py-3 text-gray-800 text-xs font-mono">
                                    {s.analysis.paybackMonths ? formatMonths(s.analysis.paybackMonths) : "No Payback"}
                                </td>
                            ))}
                        </tr>
                        <tr className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-3 text-gray-600">EBITDA Uplift</td>
                            {sortedData.map(s => (
                                <td key={s.id} className="px-6 py-3 font-mono text-gray-800 font-bold">
                                    {formatEuroM(s.analysis.ebitdaUplift / 1000000)}
                                </td>
                            ))}
                        </tr>

                        <tr className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-3 text-gray-600 text-xs">NPV of Savings</td>
                            {sortedData.map(s => (
                                <td key={s.id} className="px-6 py-3 font-mono text-gray-500 text-xs">
                                    {formatEuroM(s.analysis.npvOfSavings / 1000000)}
                                </td>
                            ))}
                        </tr>

                        {/* Deal Structure */}
                        <tr className="bg-gray-50/30 border-t border-gray-100"><td colSpan={sortedData.length + 1} className="h-2"></td></tr>

                        <tr className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-3 text-gray-500 text-xs">Upfront Fee</td>
                            {sortedData.map(s => (
                                <td key={s.id} className="px-6 py-3 font-mono text-xs text-gray-600">
                                    €{(s.inputs.upfrontFee / 1000000).toFixed(2)}m
                                </td>
                            ))}
                        </tr>
                        <tr className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-3 text-gray-500 text-xs">Exclusivity Period</td>
                            {sortedData.map(s => (
                                <td key={s.id} className="px-6 py-3 font-mono text-xs text-gray-600">
                                    {s.inputs.exclusivityYears} Years
                                </td>
                            ))}
                        </tr>
                        <tr className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-3 text-gray-500 text-xs">Deal Structure</td>
                            {sortedData.map(s => (
                                <td key={s.id} className="px-6 py-3 font-mono text-xs text-gray-600 capitalize">
                                    {s.inputs.dealStructure === 'exclusivityOnly' ? 'Exclusivity Only' : 'Full Term'}
                                </td>
                            ))}
                        </tr>

                        {/* Totals */}
                        <tr className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-3 text-gray-500 text-xs">Total Royalties (New)</td>
                            {sortedData.map(s => (
                                <td key={s.id} className="px-6 py-3 font-mono text-xs text-blue-600 font-medium">
                                    {formatEuroM(s.analysis.newDealTotalRoyalties / 1000000)}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
