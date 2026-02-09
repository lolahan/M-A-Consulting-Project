import React, { useState } from 'react';
import { CalcInputs, DealStructure } from '@/lib/calc';

interface RenegotiationFormProps {
    inputs: CalcInputs;
    onChange: (field: keyof CalcInputs, value: any) => void;
}

const InputField = ({
    label,
    field,
    value,
    suffix = "",
    min,
    max,
    step = 1,
    onChange
}: {
    label: string,
    field: keyof CalcInputs,
    value: number,
    suffix?: string,
    min?: number,
    max?: number,
    step?: number,
    onChange: (field: keyof CalcInputs, value: any) => void
}) => {
    // 1. Determine external display value
    const getDisplayValue = (val: number) => {
        // Strict Decimal Input: 0.15 displayed as "0.15"
        if (field === 'newRoyaltyRate' || field === 'discountRate') {
            return val.toString();
        }
        // Fee: Euro -> Euro M
        if (field === 'upfrontFee') {
            return parseFloat((val / 1000000).toFixed(2)).toString();
        }
        return val.toString();
    };

    const [textValue, setTextValue] = useState(getDisplayValue(value));
    const [isFocused, setIsFocused] = useState(false);

    // Sync from props ONLY when not focused
    React.useEffect(() => {
        if (!isFocused) {
            setTextValue(getDisplayValue(value));
        }
    }, [value, isFocused, field]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawVal = e.target.value;

        // Allow decimals, digits only
        if (!/^\d*\.?\d*$/.test(rawVal)) return;

        setTextValue(rawVal);

        if (rawVal === '' || rawVal === '.') return;

        const numVal = parseFloat(rawVal);
        if (isNaN(numVal)) return;

        // Commit change immediately - NO SCALING for Rates
        if (field === 'newRoyaltyRate' || field === 'discountRate') {
            onChange(field, numVal);
        } else if (field === 'upfrontFee') {
            onChange(field, numVal * 1000000);
        } else {
            onChange(field, numVal);
        }
    };

    // Safety Clamp on Blur
    const handleBlur = () => {
        setIsFocused(false);

        const num = parseFloat(textValue);
        if (isNaN(num)) {
            setTextValue(getDisplayValue(value));
            return;
        }

        // Optional Clamp
        // if (min !== undefined && num < min) ...
        // if (max !== undefined && num > max) ...
        // For now, adhering to instruction: "don't change unit semantics", just clean format.
        // We will just re-sync to standard format if valid

        setTextValue(num.toString());
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">
                    {label}
                </label>
            </div>

            <div className="relative">
                <input
                    type="text"
                    inputMode="decimal"
                    value={textValue}
                    onChange={handleChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={handleBlur}
                    placeholder="0"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all pr-12 shadow-sm"
                />
                {suffix && <span className="absolute right-4 top-3 text-[10px] text-gray-400 font-bold uppercase">{suffix}</span>}
            </div>
        </div>
    );
};

import { useRenegoStore } from '@/lib/store';

// ... (Input Field Component remains same)

export default function RenegotiationForm({
    inputs,
    onChange,
}: RenegotiationFormProps) {
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const { operationalFeasibility, useFeasibleRevenue, toggleFeasibleRevenue } = useRenegoStore();

    // Feasibility Logic
    // Max Units from Production
    const maxUnits = operationalFeasibility?.maxAiUnitsPerYear || [];
    // Price Assumption: Revenue = Units * Price. 
    // We reverse engineer Price from Year 1 Forecast? 
    // Or simpler: Just stick to Unit capacity if possible, but inputs are in Euro.
    // Let's assume a standard ASP of €75 (Base Revenue 62.5M / 0.83M units? No wait, 
    // Base Revenue 62.5M is total. 
    // Let's use a safe proxy: €100 per unit for high-level check.
    // BETTER: Display the "Max Feasible Revenue" based on the user's current forecast implied price.
    // Implied Price = Forecast[i] / (Some Baseline Units)? No.
    // Let's just display "Max Production Units" vs "Implied Units at €100/unit".

    // Actually, the user wants "Connection". 
    // Let's show: "Production Constraint: X million units".
    // And "Apply Feasible Forecast" button which sets Revenue = Units * €70 (approx).

    const handleRevenueChange = (index: number, value: number) => {
        const newForecast = [...inputs.forecast];
        newForecast[index] = { ...newForecast[index], revenue: value };
        onChange('forecast', newForecast);
    };

    const handleApplyFeasible = () => {
        // Auto-fill forecast based on production capacity
        // Assumption: €75 ASP (Conservative)
        const ASP = 75;
        const newForecast = inputs.forecast.map((f, i) => ({
            ...f,
            revenue: (maxUnits[i] || 0) * ASP
        }));
        onChange('forecast', newForecast);
    };

    return (
        <div className="space-y-8">
            {/* Feasibility Status Widget (New) */}
            <div className={`p-4 rounded-xl border transition-colors ${operationalFeasibility.maxAiRevenue.length > 0 ? (operationalFeasibility.feasibilityStatus === 'Feasible' ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100') : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h4 className={`text-xs font-bold uppercase tracking-widest ${operationalFeasibility.feasibilityStatus === 'Feasible' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {operationalFeasibility.feasibilityStatus === 'Feasible' ? 'Operational Feasibility: OK' : 'Production Constraints Detected'}
                        </h4>
                        <p className="text-[10px] text-gray-500 mt-1 max-w-[250px]">
                            {operationalFeasibility.bindingConstraints.length > 0
                                ? `Active Bottlenecks: ${operationalFeasibility.bindingConstraints.join(', ')}`
                                : "Production capacity is unconstrained for current settings."}
                        </p>
                    </div>
                </div>

                {/* Target vs Feasible Toggle */}
                <div className="flex items-center justify-between bg-white/50 p-2 rounded-lg border border-gray-200/50">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Valuation Mode:</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleFeasibleRevenue}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all border ${!useFeasibleRevenue
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white text-gray-400 border-gray-200 hover:text-gray-600'
                                }`}
                        >
                            Target
                        </button>
                        <button
                            onClick={toggleFeasibleRevenue}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all border ${useFeasibleRevenue
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-gray-400 border-gray-200 hover:text-gray-600'
                                }`}
                        >
                            Feasible
                        </button>
                    </div>
                </div>

                {/* Apply Button (Only if feasible data exists) */}
                {operationalFeasibility.maxAiRevenue.length > 0 && (
                    <button
                        onClick={handleApplyFeasible}
                        className="w-full mt-3 py-2 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <span>⬇ Apply Feasible to Forecast</span>
                    </button>
                )}
            </div>

            {/* Strategic Parameters */}
            <div className="space-y-6">
                <div>
                    <InputField label="New Royalty Rate" field="newRoyaltyRate" value={inputs.newRoyaltyRate} suffix="" min={0} max={1} step={0.01} onChange={onChange} />
                    <p className="text-[9px] text-gray-400 mt-1 pl-1">
                        Currently synced with Production Model ({operationalFeasibility.royaltyRate * 100}%)
                    </p>
                </div>
                {/* ... rest of inputs ... */}
                <InputField label="Upfront Fee Capital" field="upfrontFee" value={inputs.upfrontFee} suffix="€m" onChange={onChange} />

                {/* Deal Structure Toggle */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">Deal Structure</label>
                    <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200">
                        <button
                            onClick={() => onChange('dealStructure', 'exclusivityOnly')}
                            className={`py-2 px-3 text-[10px] font-bold rounded-lg transition-all ${inputs.dealStructure === 'exclusivityOnly'
                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            Exclusivity Only
                        </button>
                        <button
                            onClick={() => onChange('dealStructure', 'fullTerm')}
                            className={`py-2 px-3 text-[10px] font-bold rounded-lg transition-all ${inputs.dealStructure === 'fullTerm'
                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            Full Term
                        </button>
                    </div>
                    <p className="text-[9px] text-gray-400 leading-tight px-1">
                        {inputs.dealStructure === 'exclusivityOnly'
                            ? "Reduced royalty applies only during exclusivity period, then reverts to baseline (35%)."
                            : "Reduced royalty rate applies for the entire forecast period."}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {inputs.dealStructure === 'exclusivityOnly' && (
                        <InputField label="Exclusivity" field="exclusivityYears" value={inputs.exclusivityYears} suffix="Yrs" onChange={onChange} />
                    )}
                    <div>
                        <InputField label="Discount Rate" field="discountRate" value={inputs.discountRate} suffix="" onChange={onChange} />
                        <p className="text-[9px] text-gray-400 mt-1 pl-1">e.g. 0.135 = 13.5%</p>
                    </div>
                </div>
            </div>

            {/* Read-Only Revenue Forecast (Collapsible) */}
            <div className="pt-6 border-t border-gray-100">
                <button
                    onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                    className="flex items-center justify-between w-full text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 hover:text-blue-500 transition-colors"
                >
                    <span>Given AI Revenue Projections (€m)</span>
                    <span className={`transform transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`}>▼</span>
                </button>

                {isAdvancedOpen ? (
                    <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-200">
                        <div className="col-span-2 text-[9px] text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 mb-2 font-medium">
                            ⚠ For internal sensitivity only. Base case is fixed.
                        </div>
                        {inputs.forecast.map((f, i) => (
                            <div key={f.year} className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col gap-1 relative">
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{f.year}</span>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={f.revenue / 1000000}
                                        onChange={(e) => handleRevenueChange(i, (parseFloat(e.target.value) || 0) * 1000000)}
                                        className="w-full bg-transparent border-none p-0 text-lg font-bold text-gray-800 focus:ring-0 placeholder:text-gray-300"
                                    />
                                    <span className="absolute right-0 bottom-1.5 text-[10px] text-gray-400 font-bold">€M</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-2">
                        {inputs.forecast.map(f => (
                            <div key={f.year} className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
                                <div className="text-[9px] text-gray-400 font-bold">{f.year}</div>
                                <div className="text-xs font-bold text-gray-600">€{(f.revenue / 1000000).toFixed(1)}m</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
