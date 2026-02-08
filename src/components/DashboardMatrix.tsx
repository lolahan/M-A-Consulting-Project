import React from 'react';
import { Scenario, getEffectiveInputs } from '@/lib/scenarioUtils';
import { computeDealAnalysis, formatEuroM, formatMonths } from '@/lib/calc';
import { useRenegoStore } from '@/lib/store';

interface DashboardMatrixProps {
    scenarios: Scenario[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}

export default function DashboardMatrix({ scenarios, selectedId, onSelect }: DashboardMatrixProps) {
    const { operationalFeasibility, useFeasibleRevenue } = useRenegoStore();

    if (scenarios.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-gray-400 font-bold mb-2">No Scenarios Found</p>
                <p className="text-xs text-gray-400">Save scenarios in the Modeler to compare them here.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Scenario Comparison Matrix</h3>
                {useFeasibleRevenue && (
                    <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold uppercase">
                        Using Feasible Revenue
                    </span>
                )}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                            <th className="px-6 py-3">Scenario Name</th>
                            <th className="px-6 py-3 text-right">Deal NPV</th>
                            <th className="px-6 py-3 text-right">Payback</th>
                            <th className="px-6 py-3 text-right">EBITDA Uplift</th>
                            <th className="px-6 py-3 text-center">Status</th>
                            <th className="px-6 py-3 text-center">Structure</th>
                            <th className="px-6 py-3 text-right">Input Royalty</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {scenarios.map(scen => {
                            const effectiveInputs = getEffectiveInputs(scen, useFeasibleRevenue);
                            const analysis = computeDealAnalysis(effectiveInputs);
                            const isSelected = selectedId === scen.id;

                            // Status Badge
                            const isConstrained = scen.feasibility?.status === 'Constrained';
                            const gap = scen.feasibility?.gap || 0;

                            return (
                                <tr
                                    key={scen.id}
                                    onClick={() => onSelect(scen.id)}
                                    className={`
cursor - pointer transition - colors hover: bg - gray - 50
                                        ${isSelected ? 'bg-blue-50/30' : ''}
`}
                                >
                                    <td className="px-6 py-4 font-bold text-gray-800 relative">
                                        {isSelected && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                                        )}
                                        {scen.name}
                                        {scen.description && (
                                            <p className="text-[10px] text-gray-400 font-normal mt-0.5 line-clamp-1">{scen.description}</p>
                                        )}
                                        <div className="flex gap-1 mt-1">
                                            {scen.tags.map(t => (
                                                <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-normal">{t}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className={`px - 6 py - 4 text - right font - mono font - bold ${analysis.dealNPV > 0 ? 'text-emerald-600' : 'text-red-500'} `}>
                                        {formatEuroM(analysis.dealNPV / 1000000)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-gray-600">
                                        {formatMonths(analysis.paybackMonths)}
                                    </td>
                                    <td className={`px - 6 py - 4 text - right font - mono font - bold ${analysis.ebitdaUplift > 0 ? 'text-blue-600' : 'text-gray-400'} `}>
                                        {analysis.ebitdaUplift > 0 ? '+' : ''}{formatEuroM(analysis.ebitdaUplift / 1000000)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {scen.feasibility ? (
                                            <div className={`inline - flex flex - col items - center px - 2 py - 0.5 rounded ${isConstrained ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'} `}>
                                                <span className="text-[10px] font-bold uppercase">{isConstrained ? 'Constrained' : 'Feasible'}</span>
                                                {isConstrained && <span className="text-[9px] opacity-80">-€{(gap / 1000000).toFixed(1)}m</span>}
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {scen.inputs.dealStructure === 'exclusivityOnly' ? (
                                            <span className="text-[10px] text-gray-500 font-medium">Exclusivity Only ({scen.inputs.exclusivityYears}y)</span>
                                        ) : (
                                            <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded">Full Term</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-gray-600">
                                        {(scen.inputs.newRoyaltyRate * 100).toFixed(1)}%
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
