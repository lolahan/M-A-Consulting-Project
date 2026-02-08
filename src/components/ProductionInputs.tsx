import React, { useState, useEffect } from 'react';
import { useRenegoStore } from '@/lib/store';
import { ROYALTY_OPTIONS } from '@/lib/productionOptimiser';

export default function ProductionInputs() {
    const { productionConfig, productionResults, setProductionConfig, runProductionOptimiser } = useRenegoStore();
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Suggestion State
    const [suggestion, setSuggestion] = useState<string | null>(null);

    // Analyze constraints for suggestions
    useEffect(() => {
        if (!productionResults || productionResults.length === 0) {
            setSuggestion(null);
            return;
        }
        // Check Year 1 & 2 binding constraints
        const earlyBinding = new Set([
            ...productionResults[0].bindingConstraints,
            ...productionResults[1].bindingConstraints
        ]);

        if (earlyBinding.has('Labour')) {
            setSuggestion("Labour is the immediate bottleneck. Consider increasing hiring rate.");
        } else if (earlyBinding.has('Wafer_Cutting')) {
            setSuggestion("Wafer capacity is tight. Add a Wafer Module.");
        } else if (earlyBinding.has('Line_2')) {
            setSuggestion("Line 2 is binding. Build Line 3 to relieve it.");
        } else if (earlyBinding.has('Station_B')) {
            setSuggestion("Station B is binding. Upgrade it.");
        } else {
            setSuggestion(null);
        }
    }, [productionResults]);
    // Auto-run on config change (Debounced slightly if needed, but calculation is fast)
    useEffect(() => {
        const timer = setTimeout(() => {
            runProductionOptimiser();
        }, 50); // Small debounce to avoid UI flicker on rapid clicks
        return () => clearTimeout(timer);
    }, [productionConfig, runProductionOptimiser]);

    // Analyze constraints for suggestions


    // --- Handlers ---

    // 1. Royalty / AI Profit
    const handleRoyaltyChange = (val: number) => { // val is profit per unit, NOT rate
        // We need to map Profit -> Rate to update the global store
        // ROYALTY_OPTIONS: { label: '35% Royalty', value: 64.40 }

        // 1. Update Production Config (Profit)
        setProductionConfig(prev => ({
            ...prev,
            products: prev.products.map(p =>
                p.id === 'AI' ? { ...p, profitPerUnit: val } : p
            )
        }));

        // 2. Update Global Royalty (Rate)
        // Find the option that matches this profit value
        const option = ROYALTY_OPTIONS.find(o => Math.abs(o.value - val) < 0.01);
        if (option) {
            // Extract percentage from label? Or add rate to options?
            // "12.5% Royalty" -> 0.125
            const label = option.label;
            if (label.includes('%')) {
                const percentage = parseFloat(label.split('%')[0]);
                useRenegoStore.getState().setGlobalRoyalty(percentage / 100);
            } else if (label.includes('No AI')) {
                useRenegoStore.getState().setGlobalRoyalty(0.35); // Fallback or 0? 
                // Any royalty rate is valid if volume is 0, but let's say 0 for clarity, or leave as is.
                // Actually if No AI Access, it means we don't do the deal? 
                // Let's assume No Access = 0 revenue, so royalty rate doesn't matter much mathematically, 
                // but let's set to 0.
                useRenegoStore.getState().setGlobalRoyalty(0);
            }
        }
    };

    // 2. Wafer Modules (0-3)
    const currentWaferCount = productionConfig.investments.filter(i => i.id.startsWith('wafer') && i.active).length;

    const handleWaferChange = (count: number) => {
        if (count < 0 || count > 3) return;
        setProductionConfig(prev => ({
            ...prev,
            investments: prev.investments.map(inv => {
                if (inv.id === 'wafer1') return { ...inv, active: count >= 1 };
                if (inv.id === 'wafer2') return { ...inv, active: count >= 2 };
                if (inv.id === 'wafer3') return { ...inv, active: count >= 3 };
                return inv;
            })
        }));
    };

    // 3. Infrastructure Toggles
    const toggleInvestment = (id: string) => {
        setProductionConfig(prev => ({
            ...prev,
            investments: prev.investments.map(inv =>
                inv.id === id ? { ...inv, active: !inv.active } : inv
            )
        }));
    };

    const isInvActive = (id: string) => productionConfig.investments.find(i => i.id === id)?.active || false;

    // 4. Labour Growth
    const labourConstraint = productionConfig.constraints.find(c => c.id === 'Labour');
    const labourGrowth = labourConstraint ? labourConstraint.annualGrowth : 512000;

    const handleLabourChange = (val: number) => {
        setProductionConfig(prev => ({
            ...prev,
            constraints: prev.constraints.map(c =>
                c.id === 'Labour' ? { ...c, annualGrowth: val } : c
            )
        }));
    };

    // Run on mount if no results? optional.

    return (
        <div className="space-y-6">

            {/* suggestion banner */}
            {suggestion && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                    <span className="text-amber-500 mt-0.5">💡</span>
                    <p className="text-xs text-amber-800 font-medium">{suggestion}</p>
                </div>
            )}

            {/* A. AI Profitability */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">1. AI Unit Profitability</h3>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Royalty Scenario</label>
                    <select
                        className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                        value={productionConfig.products.find(p => p.id === 'AI')?.profitPerUnit || 0}
                        onChange={(e) => handleRoyaltyChange(Number(e.target.value))}
                    >
                        {ROYALTY_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label} (€{opt.value})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* B. Capacity Investments */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">2. Capacity Investments</h3>

                {/* Wafer Stepper */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-gray-800">Wafer Modules</p>
                        <p className="text-[10px] text-gray-400">Each +200k units (3mo install)</p>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-lg border border-gray-200">
                        <button
                            onClick={() => handleWaferChange(currentWaferCount - 1)}
                            disabled={currentWaferCount === 0}
                            className="w-8 h-8 flex items-center justify-center rounded bg-white shadow-sm border border-gray-200 text-gray-600 disabled:opacity-50 hover:bg-gray-50 active:scale-95 transition-all"
                        >
                            -
                        </button>
                        <span className="text-sm font-bold w-4 text-center">{currentWaferCount}</span>
                        <button
                            onClick={() => handleWaferChange(currentWaferCount + 1)}
                            disabled={currentWaferCount === 3}
                            className="w-8 h-8 flex items-center justify-center rounded bg-white shadow-sm border border-gray-200 text-blue-600 font-bold disabled:opacity-50 hover:bg-blue-50 active:scale-95 transition-all"
                        >
                            +
                        </button>
                    </div>
                </div>

                <div className="h-px bg-gray-100"></div>

                {/* Line 3 Toggle */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-gray-800">Build Line 3</p>
                        <p className="text-[10px] text-gray-400">+1.25m Assembly (12mo install)</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isInvActive('line3')}
                            onChange={() => toggleInvestment('line3')}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                </div>

                <div className="h-px bg-gray-100"></div>

                {/* Stn B Toggle */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-gray-800">Station B Upgrade</p>
                        <p className="text-[10px] text-gray-400">+2.38m units (6mo install, 1mo downtime)</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isInvActive('stnB')}
                            onChange={() => toggleInvestment('stnB')}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                </div>
            </div>

            {/* C. Labour Constraints */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">3. Annual Labour Hiring</h3>
                <div className="flex gap-2">
                    <div className="flex-1">
                        <label className="text-[10px] text-gray-400 block mb-1">Growth Rate (Hours/Year)</label>
                        <input
                            type="number"
                            value={labourGrowth}
                            onChange={(e) => handleLabourChange(Number(e.target.value))}
                            className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                        />
                    </div>
                    <button
                        onClick={() => handleLabourChange(1024000)}
                        className="px-3 py-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 h-[full] mt-5 transition-colors"
                        title="Set to 1,024,000"
                    >
                        Double Rate
                    </button>
                </div>
            </div>

            {/* Run Button */}
            <button
                onClick={runProductionOptimiser}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 text-white font-bold shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all active:scale-[0.99]"
            >
                Run Simulation
            </button>

            {/* Advanced Toggle */}
            <div className="text-center">
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-[10px] text-gray-400 hover:text-gray-600 underline decoration-dotted"
                >
                    {showAdvanced ? 'Hide Advanced Constraints' : 'Show Advanced Constraints'}
                </button>
            </div>

            {showAdvanced && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 animate-in fade-in">
                    {productionConfig.constraints.filter(c => c.id !== 'Labour').map(c => (
                        <div key={c.id} className="flex justify-between items-center bg-white p-2 rounded border border-gray-100">
                            <span className="text-xs font-medium text-gray-600">{c.name}</span>
                            <input disabled value={c.baseCapacity.toLocaleString()} className="text-right text-xs bg-transparent w-20 text-gray-400" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
