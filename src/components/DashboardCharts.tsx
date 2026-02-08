import React, { useMemo, useState } from 'react';
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Legend, ReferenceLine, Label, Cell, Symbols
} from 'recharts';
import { useRenegoStore } from '@/lib/store';
import { Scenario, getEffectiveInputs } from '@/lib/scenarioUtils';
import { computeDealAnalysis, formatEuroM, formatMonths, CalcInputs } from '@/lib/calc';

interface DashboardChartsProps {
    scenarios: Scenario[];
    selectedId: string | null;
}

export default function DashboardCharts({ scenarios, selectedId }: DashboardChartsProps) {
    const { useFeasibleRevenue } = useRenegoStore();
    const [refExclusivity, setRefExclusivity] = useState<number>(24);
    const [showFrontier, setShowFrontier] = useState<boolean>(false);
    const [showVariants, setShowVariants] = useState<boolean>(false);

    // 1. Prepare Base Data
    const baseChartData = useMemo(() => {
        return scenarios.map(s => {
            const effectiveInputs = getEffectiveInputs(s, useFeasibleRevenue);
            const analysis = computeDealAnalysis(effectiveInputs);
            const exclusivityMonths = s.inputs.dealStructure === 'exclusivityOnly' ? s.inputs.exclusivityYears * 12 : 60;
            const gap = (analysis.paybackMonths || 999) - exclusivityMonths;

            return {
                id: s.id,
                name: s.name,
                payback: analysis.paybackMonths, // X for Scatter
                npv: analysis.dealNPV / 1000000, // Y for Scatter (€m)
                upfront: s.inputs.upfrontFee / 1000000, // X for Frontier (€m)
                royalty: s.inputs.newRoyaltyRate * 100, // Y for Frontier (%)
                exclusivityMonths,
                gap,
                structure: s.inputs.dealStructure,
                inputs: effectiveInputs, // Store effective inputs !
                isVariant: false,
                isEfficient: false, // Calculated later
            };
        });
    }, [scenarios, useFeasibleRevenue]);

    // 2. Generate Variants (if enabled)
    const variantData = useMemo(() => {
        if (!showVariants || scenarios.length === 0) return [];

        // Base variant generation on the Selected Scenario, or the first one
        const baseScenario = scenarios.find(s => s.id === selectedId) || scenarios[0];
        const baseInputs = getEffectiveInputs(baseScenario, useFeasibleRevenue);
        const baseRate = baseInputs.newRoyaltyRate;

        // Generate ±3% constraints (e.g. if 7%, do 4%, 5.5%, 8.5%, 10%)
        const variants = [-0.03, -0.015, 0.015, 0.03].map((delta, i) => {
            const newRate = Math.max(0.01, baseRate + delta);
            const variantInputs: CalcInputs = { ...baseInputs, newRoyaltyRate: newRate };
            const analysis = computeDealAnalysis(variantInputs);
            const exclusivityMonths = variantInputs.dealStructure === 'exclusivityOnly' ? variantInputs.exclusivityYears * 12 : 60;

            return {
                id: `variant-${i}`,
                name: `${baseScenario.name} (Royalty ${(newRate * 100).toFixed(1)}%)`,
                payback: analysis.paybackMonths,
                npv: analysis.dealNPV / 1000000,
                upfront: variantInputs.upfrontFee / 1000000,
                royalty: newRate * 100,
                exclusivityMonths,
                gap: (analysis.paybackMonths || 999) - exclusivityMonths,
                structure: variantInputs.dealStructure,
                inputs: variantInputs,
                isVariant: true,
                isEfficient: false,
            };
        });

        return variants;
    }, [scenarios, selectedId, showVariants, useFeasibleRevenue]);

    // 3. Combine Data & Calculate Efficiency Frontier
    const chartData = useMemo(() => {
        const combined = [...baseChartData, ...variantData];

        if (!showFrontier) return combined;

        // Pareto Frontier Logic: A point is EFFICIENT if no other point has (Better NPV AND Better Payback)
        // Better NPV = higher; Better Payback = lower
        return combined.map(pt => {
            const isDominated = combined.some(other =>
                other.id !== pt.id &&
                other.npv >= pt.npv &&
                (other.payback || 999) <= (pt.payback || 999) &&
                (other.npv > pt.npv || (other.payback || 999) < (pt.payback || 999))
            );
            return { ...pt, isEfficient: !isDominated };
        });
    }, [baseChartData, variantData, showFrontier]);

    // 4. Data for Line Chart
    const curveData = useMemo(() => {
        const targets = selectedId
            ? chartData.filter(d => d.id === selectedId && !d.isVariant)
            : chartData.filter(d => !d.isVariant).slice(0, 3);

        if (targets.length === 0) return { data: [], scenarios: [] };

        const maxYears = Math.max(...targets.map(t => t.inputs.forecast.length));
        const dataPoints = [];

        for (let i = 0; i <= maxYears; i++) {
            const point: any = { year: 2026 + i };
            targets.forEach(t => {
                let cum = -t.upfront; // €m already
                // Need to recalculate analysis helper if not stored, 
                // but we can just re-run computeDealAnalysis or grab from memo if we passed it fully.
                // We didn't pass full analysis object in step 1 to save space, let's re-compute or trust inputs
                const analysis = computeDealAnalysis(t.inputs);
                for (let j = 0; j < i; j++) {
                    cum += (analysis.annualSavings[j] || 0) / 1000000;
                }
                point[t.name] = cum;
            });
            dataPoints.push(point);
        }
        return { data: dataPoints, scenarios: targets };
    }, [chartData, selectedId]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-xl text-xs z-50">
                    <p className="font-bold text-gray-800 mb-1">{data.name}</p>
                    <div className="space-y-1 text-gray-500">
                        <p>NPV: <span className="font-mono font-bold text-blue-600">€{data.npv?.toFixed(1)}m</span></p>
                        <p>Payback: <span className="font-mono font-bold text-gray-700">{formatMonths(data.payback)}</span></p>
                        <p>Ref. Exclusivity: <span className="font-mono">{data.exclusivityMonths} mo</span></p>
                        <hr className="border-gray-100 my-1" />
                        <p>Payback Gap: <span className={`font-mono font-bold ${data.gap <= 0 ? 'text-emerald-600' : 'text-amber-500'}`}>
                            {data.gap <= 0 ? "Safe" : `+${data.gap.toFixed(1)} mo`}
                        </span></p>
                        <p>Structure: <span className="capitalize">{data.structure === 'fullTerm' ? 'Full Term' : 'Exclusivity Only'}</span></p>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Check if royalty rates are all identical (flat line warning)
    const uniqueRoyalties = new Set(scenarios.map(s => s.inputs.newRoyaltyRate));
    const isFlatLine = uniqueRoyalties.size === 1 && scenarios.length > 1;

    return (
        <div className="space-y-6">

            {/* Control Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap gap-4 items-center justify-between shadow-sm">
                <div className="flex gap-4 items-center">
                    <label className="text-xs font-bold text-gray-600 flex items-center gap-2">
                        Reference Exclusivity:
                        <select
                            value={refExclusivity}
                            onChange={(e) => setRefExclusivity(Number(e.target.value))}
                            className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-gray-700 font-normal focus:ring-1 focus:ring-blue-500 outline-none"
                        >
                            {[12, 18, 24, 36, 48, 60].map(m => (
                                <option key={m} value={m}>{m} Months</option>
                            ))}
                        </select>
                    </label>

                    <button
                        onClick={() => setShowFrontier(!showFrontier)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-medium flex items-center gap-1
                            ${showFrontier ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                        {showFrontier ? '✨ Hide Efficient Frontier' : '✨ Highlight Efficient Frontier'}
                    </button>
                </div>

                {isFlatLine && !showVariants && (
                    <div className="text-[10px] text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded hidden md:block">
                        ⚠️ Scenarios share the same royalty. Enable variants →
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Visual 1: Risk-Return Scatter */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[450px]">
                    <div className="mb-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Risk vs Return (Payback vs NPV)</h3>
                        <div className="flex justify-between items-start mt-1">
                            <p className="text-[10px] text-gray-400 max-w-[70%]">
                                <span className="font-bold text-gray-500">Shapes:</span> Circle=Full Term, Square=Exclusivity. <br />
                                <span className="font-bold text-gray-500">Colors:</span> Green=Safe (&le;Excl), Grey=Risk.
                            </p>
                        </div>
                    </div>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis
                                    type="number"
                                    dataKey="payback"
                                    name="Payback"
                                    unit=" mo"
                                    label={{ value: 'Payback (Months) → Risk', position: 'bottom', offset: 0, fontSize: 10, fill: '#9ca3af' }}
                                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                                    domain={[0, 'auto']}
                                />
                                <YAxis
                                    type="number"
                                    dataKey="npv"
                                    name="NPV"
                                    unit="m"
                                    label={{ value: 'Deal NPV (€m) → Value', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#9ca3af' }}
                                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

                                {/* Reference Line for Global Check */}
                                <ReferenceLine x={refExclusivity} stroke="#e5e7eb" strokeDasharray="3 3">
                                    <Label value={`Ref: ${refExclusivity}mo`} position="insideTopLeft" fontSize={9} fill="#9ca3af" angle={-90} />
                                </ReferenceLine>

                                <Scatter name="Scenarios" data={chartData}>
                                    {chartData.map((entry, index) => {
                                        // Shape Logic
                                        const shapeType = entry.structure === 'fullTerm' ? 'circle' : 'square';
                                        // Color Logic (Green if Payback <= Exclusivity, else Gray)
                                        const isSafe = entry.gap <= 0;
                                        const baseColor = isSafe ? '#10b981' : '#9ca3af'; // Emerald vs Gray
                                        // Highlight Selection
                                        const isSelected = entry.id === selectedId;

                                        // Final Color:
                                        // - Variant: Lighter opacity
                                        // - Selected: Distinct Blue
                                        // - Efficient: Gold Stroke?

                                        let fill = baseColor;
                                        let stroke = baseColor;
                                        let strokeWidth = 0;
                                        let opacity = 1;

                                        if (entry.isVariant) {
                                            opacity = 0.5;
                                            fill = isSafe ? '#6ee7b7' : '#d1d5db';
                                        }

                                        if (isSelected) {
                                            fill = '#2563eb'; // Blue override
                                            stroke = '#1e40af';
                                            strokeWidth = 2;
                                            opacity = 1;
                                        } else if (showFrontier && entry.isEfficient && !entry.isVariant) {
                                            stroke = '#f59e0b'; // Gold stroke for frontier
                                            strokeWidth = 2;
                                        }

                                        return (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={fill}
                                                stroke={stroke}
                                                strokeWidth={strokeWidth}
                                                fillOpacity={opacity}
                                            />
                                        );
                                    })}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Visual 2: Negotiation Feasibility Map */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[450px]">
                    <div className="mb-4 flex justify-between items-start">
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Feasibility Map (Upfront vs Royalty)</h3>
                            <p className="text-[10px] text-gray-400">Green zone = Viable Deals (Payback &le; Exclusivity & NPV &gt; 0)</p>
                        </div>
                        <button
                            onClick={() => setShowVariants(!showVariants)}
                            className={`text-[10px] px-2 py-1 rounded border transition-colors
                                ${showVariants ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                        >
                            {showVariants ? 'Hide Variants' : '+ Generate Variants'}
                        </button>
                    </div>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis
                                    type="number"
                                    dataKey="upfront"
                                    name="Upfront"
                                    unit="m"
                                    label={{ value: 'Upfront Fee (€m)', position: 'bottom', offset: 0, fontSize: 10, fill: '#9ca3af' }}
                                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                                />
                                <YAxis
                                    type="number"
                                    dataKey="royalty"
                                    name="Royalty"
                                    unit="%"
                                    label={{ value: 'Royalty Rate (%)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#9ca3af' }}
                                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                                    domain={[0, 'auto']}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

                                <Scatter name="Scenarios" data={chartData}>
                                    {chartData.map((entry, index) => {
                                        // Feasibility Color Logic
                                        // Feasible: NPV > 0 AND Payback <= Exclusivity
                                        // Conditional: NPV > 0 AND Payback > Exclusivity
                                        // Unviable: NPV <= 0

                                        const isFeasible = entry.npv > 0 && entry.gap <= 0;
                                        const isConditional = entry.npv > 0 && entry.gap > 0;

                                        let fill = '#ef4444'; // Red (Unviable)
                                        if (isFeasible) fill = '#10b981'; // Green
                                        else if (isConditional) fill = '#f59e0b'; // Amber

                                        if (entry.id === selectedId) {
                                            fill = '#2563eb'; // Blue override
                                        }

                                        return (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={fill}
                                                fillOpacity={entry.isVariant ? 0.3 : 1}
                                                stroke={entry.id === selectedId ? '#1e40af' : 'none'}
                                                strokeWidth={entry.id === selectedId ? 2 : 0}
                                            />
                                        );
                                    })}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Visual 3: Cash Flow Curve */}
                <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[300px]">
                    <div className="mb-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Cumulative Cash Flow (Proxy)</h3>
                        <p className="text-[10px] text-gray-400">Comparing cash accumulation over time for selected vs comparison scenarios.</p>
                    </div>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={curveData.data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} label={{ value: '€m', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#9ca3af' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                    labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '0.5rem' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                {curveData.scenarios.map((s, i) => (
                                    <Line
                                        key={s.id}
                                        type="monotone"
                                        dataKey={s.name}
                                        stroke={s.id === selectedId ? '#2563eb' : `hsl(${210 + i * 40}, 70%, 50%)`}
                                        strokeWidth={s.id === selectedId ? 3 : 2}
                                        dot={{ r: 3 }}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
