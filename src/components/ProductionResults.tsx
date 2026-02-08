import React from 'react';
import { useRenegoStore } from '@/lib/store';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatEuroM } from '@/lib/calc';

export default function ProductionResults() {
    const { productionResults, productionConfig } = useRenegoStore();

    if (!productionResults || productionResults.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-12 border-2 border-dashed border-gray-200 rounded-2xl">
                <p className="font-bold">No Simulation Data</p>
                <p className="text-sm">Configure investments on the left and click "Run Capacity Simulation"</p>
            </div>
        );
    }

    // Chart Data Preparation (IDs are now PascalCase: Legacy, MRI, AI)
    const productionChartData = productionResults.map(r => ({
        year: `Year ${r.year}`,
        AI: Math.floor(r.production['AI'] / 1000),      // k units
        MRI: Math.floor(r.production['MRI'] / 1000),
        Legacy: Math.floor(r.production['Legacy'] / 1000),
        Profit: r.totalProfit / 1000000 // €m
    }));

    // Constraints keys
    const constraintKeys = productionConfig.constraints.map(c => c.id);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* 1. Key Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Total 5-Yr AI Units</p>
                    <p className="text-2xl font-black text-blue-600 mt-1">
                        {(productionResults.reduce((sum, r) => sum + r.production['AI'], 0) / 1000000).toFixed(2)}m
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Total Profit</p>
                    <p className="text-2xl font-black text-emerald-600 mt-1">
                        {formatEuroM(productionResults.reduce((sum, r) => sum + r.totalProfit, 0) / 1000000)}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Critical Bottlenecks (Year 1-5)</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {Array.from(new Set(productionResults.flatMap(r => r.bindingConstraints))).map(b => (
                            <span key={b} className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                                {b}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* 2. AI Production Chart */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Production Volume Forecast (k Units)</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={productionChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorMRI" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                            <Area type="monotone" dataKey="Legacy" stackId="1" stroke="#9ca3af" fill="#e5e7eb" />
                            <Area type="monotone" dataKey="MRI" stackId="1" stroke="#10b981" fill="url(#colorMRI)" />
                            <Area type="monotone" dataKey="AI" stackId="1" stroke="#2563eb" fill="url(#colorAI)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 3. Detailed Data Tables */}
            <div className="grid grid-cols-1 gap-8">

                {/* A. Optimal Production Table */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Optimal Production Plan</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 bg-gray-50 uppercase">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Year</th>
                                    <th className="px-4 py-3 font-medium text-right text-gray-400">Legacy</th>
                                    <th className="px-4 py-3 font-medium text-right text-emerald-600">MRI</th>
                                    <th className="px-4 py-3 font-medium text-right text-blue-600">AI (Rec)</th>
                                    <th className="px-4 py-3 font-medium text-right font-bold text-gray-700">Profit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {productionChartData.map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-900">{row.year}</td>
                                        <td className="px-4 py-3 text-right text-gray-500 font-mono">{(row.Legacy / 1000).toFixed(1)}m</td>
                                        <td className="px-4 py-3 text-right text-gray-500 font-mono">{(row.MRI / 1000).toFixed(1)}m</td>
                                        <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">{(row.AI / 1000).toFixed(1)}m</td>
                                        <td className="px-4 py-3 text-right font-mono font-bold">{formatEuroM(row.Profit)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* B. Bottleneck Heatmap Table */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Constraint Utilisation</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 bg-gray-50 uppercase">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Year</th>
                                    {constraintKeys.map(k => (
                                        <th key={k} className="px-4 py-3 font-medium text-center capitalize whitespace-nowrap">{k.replace('_', ' ')}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {productionResults.map((r, i) => (
                                    <tr key={i} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-3 font-medium text-gray-900">Year {r.year}</td>
                                        {constraintKeys.map(k => {
                                            const util = r.utilization[k] * 100;
                                            // Color coding
                                            let colorClass = "bg-emerald-100 text-emerald-800"; // Low
                                            if (util > 80) colorClass = "bg-amber-100 text-amber-800";
                                            if (util > 99) colorClass = "bg-red-100 text-red-800 font-bold border border-red-200";
                                            if (isNaN(util)) colorClass = "bg-gray-100 text-gray-400";

                                            return (
                                                <td key={k} className="px-2 py-3 text-center">
                                                    <span className={`inline-block px-2 py-1 rounded text-xs w-16 ${colorClass}`}>
                                                        {util.toFixed(1)}%
                                                    </span>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-3 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-500 text-center">
                        Red indicates binding constraint (&lt; 1% slack).
                    </div>
                </div>
            </div>

        </div>
    );
}
