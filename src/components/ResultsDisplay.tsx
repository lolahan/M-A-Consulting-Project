import { DealAnalysis, YearlyRevenue } from '@/lib/calc';
import { formatEuroM, formatMonths } from '@/lib/formatters';

interface ResultsDisplayProps {
    analysis: DealAnalysis;
    exclusivityYears: number;
    forecast: YearlyRevenue[];
}

export default function ResultsDisplay({ analysis, exclusivityYears, forecast }: ResultsDisplayProps) {

    // Recommendation Logic
    let recTitle = "Strong Case";
    let recDesc = "Approvable: NPV positive & payback within exclusivity.";
    let recColor = "text-emerald-700 bg-emerald-50 border-emerald-200";

    if (analysis.dealNPV <= 0) {
        recTitle = "Not Value Accretive";
        recDesc = "Reject: Deal destroys value (Negative NPV).";
        recColor = "text-red-700 bg-red-50 border-red-200";
    } else if (!analysis.isPaybackWithinExclusivity) {
        recTitle = "Conditional";
        recDesc = "Review Required: Value accretive but payback period exceeds exclusivity window.";
        recColor = "text-amber-700 bg-amber-50 border-amber-200";
    }

    const StatCard = ({ title, value, subtext }: { title: string; value: string; subtext: string }) => (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
            <h4 className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.15em] mb-2">{title}</h4>
            <div className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">{value}</div>
            <p className="text-[10px] font-semibold text-gray-500">{subtext}</p>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Recommendation Banner */}
            <div className={`p-4 rounded-xl border ${recColor} transition-all`}>
                <h3 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Recommendation (based on NPV & Payback)</h3>
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold">{recTitle}</span>
                </div>
                <p className="text-xs opacity-90">{recDesc}</p>
            </div>

            {/* Primary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    title="Deal NPV"
                    value={formatEuroM(analysis.dealNPV / 1000000)}
                    subtext={analysis.dealNPV > 0 ? "Net Value Created" : "Value Destruction"}
                />
                <StatCard
                    title="Payback"
                    value={analysis.paybackMonths ? formatMonths(analysis.paybackMonths) : "No Payback"}
                    subtext={analysis.isPaybackWithinExclusivity ? "Within Exclusivity" : "> Exclusivity Window"}
                />
                <StatCard
                    title="EBITDA Uplift"
                    value={formatEuroM(analysis.ebitdaUplift / 1000000)}
                    subtext="Total Royalty Savings"
                />
            </div>

            {/* Secondary Metrics / Process Data (Permanent View) */}
            <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                <div className="w-full flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Calculation Details / Process Metrics</span>
                </div>

                <div className="p-6 space-y-6">

                    {/* Baseline vs New Deal Table */}
                    <div>
                        <div className="flex justify-between items-end mb-3">
                            <h4 className="text-xs font-bold text-gray-700">Royalty Flows (Baseline 35% vs New)</h4>
                            <span className="text-[10px] text-gray-400">All figures in €m</span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-xs">
                                <thead>
                                    <tr className="border-b border-gray-100 text-gray-400 text-[9px] uppercase tracking-wider">
                                        <th className="pb-2 text-left w-24">Item</th>
                                        {forecast.map(f => (
                                            <th key={f.year} className="pb-2">{f.year}</th>
                                        ))}
                                        <th className="pb-2 pl-4 text-gray-600">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="font-mono text-gray-600">
                                    {/* Baseline */}
                                    <tr className="group hover:bg-gray-50/50">
                                        <td className="py-2 text-left font-sans font-medium text-gray-500">Baseline</td>
                                        {analysis.annualBaselineRoyalties.map((val, i) => (
                                            <td key={i} className="py-2">{val ? (val / 1000000).toFixed(2) : '-'}</td>
                                        ))}
                                        <td className="py-2 pl-4 font-bold">{(analysis.baselineTotalRoyalties / 1000000).toFixed(2)}</td>
                                    </tr>
                                    {/* New Deal */}
                                    <tr className="group hover:bg-gray-50/50">
                                        <td className="py-2 text-left font-sans font-medium text-blue-600">New Deal</td>
                                        {analysis.annualNewDealRoyalties.map((val, i) => (
                                            <td key={i} className="py-2 text-blue-600">{val ? (val / 1000000).toFixed(2) : '-'}</td>
                                        ))}
                                        <td className="py-2 pl-4 font-bold text-blue-600">{(analysis.newDealTotalRoyalties / 1000000).toFixed(2)}</td>
                                    </tr>
                                    {/* Savings */}
                                    <tr className="border-t border-gray-100 bg-emerald-50/30">
                                        <td className="py-2 text-left font-sans font-bold text-emerald-700">Savings</td>
                                        {analysis.annualSavings.map((val, i) => (
                                            <td key={i} className="py-2 text-emerald-700 font-bold">{val > 0 ? '+' : ''}{(val / 1000000).toFixed(2)}</td>
                                        ))}
                                        <td className="py-2 pl-4 font-bold text-emerald-700">{(analysis.ebitdaUplift / 1000000).toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Additional Metrics Grid */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                        <div>
                            <h5 className="text-[9px] text-gray-400 uppercase tracking-widest mb-1">NPV of Savings</h5>
                            <div className="text-sm font-bold text-gray-800">{formatEuroM(analysis.npvOfSavings / 1000000)}</div>
                        </div>
                        <div>
                            <h5 className="text-[9px] text-gray-400 uppercase tracking-widest mb-1">Total Upfront Fee</h5>
                            <div className="text-sm font-bold text-gray-800">
                                {/* Calculated as (NPV Savings - Deal NPV) to recover original upfront */}
                                {formatEuroM((analysis.npvOfSavings - analysis.dealNPV) / 1000000)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
