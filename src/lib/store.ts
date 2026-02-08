import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CalcInputs } from './calc';
import { Scenario } from './scenarioUtils';
import {
    INITIAL_REVENUE_YEARS,
    BASELINE_ROYALTY_RATE,
    BASELINE_UPFRONT_FEE,
    DEFAULT_DISCOUNT_RATE
} from './defaults';
import {
    ProductionConfig,
    YearResult,
    DEFAULT_CONFIG,
    runOptimiser
} from './productionOptimiser';

export const DEFAULT_ASP = 131.36; // Implied ASP from Profit/Royalty slope (Delta Profit / Delta Rate)

// Replicate defaults from page.tsx to ensure consistency
export const DEFAULT_INPUTS: CalcInputs = {
    forecast: INITIAL_REVENUE_YEARS,
    baselineRoyaltyRate: BASELINE_ROYALTY_RATE / 100,
    newRoyaltyRate: 0.07,
    upfrontFee: 1500000,
    discountRate: DEFAULT_DISCOUNT_RATE / 100,
    exclusivityYears: 4,
    dealStructure: 'exclusivityOnly',
};

interface RenegoState {
    scenarios: Scenario[];
    inputs: CalcInputs;
    useFeasibleRevenue: boolean;

    // Production Optimiser State
    productionConfig: ProductionConfig;
    productionResults: YearResult[];
    operationalFeasibility: OperationalFeasibility;

    // Actions
    setInputs: (inputs: CalcInputs | ((prev: CalcInputs) => CalcInputs)) => void;
    toggleFeasibleRevenue: () => void; // Toggle "Advanced Valuation Mode"

    // Global Actions
    setGlobalRoyalty: (rate: number) => void;

    // Scenario Actions
    addScenario: (scenario: Scenario) => void;
    deleteScenario: (id: string) => void;
    updateScenario: (id: string, updates: Partial<Scenario>) => void;
    setScenarios: (scenarios: Scenario[]) => void;

    setProductionConfig: (config: ProductionConfig | ((prev: ProductionConfig) => ProductionConfig)) => void;
    runProductionOptimiser: () => void;

    // Reset
    resetInputs: () => void;
}

export interface OperationalFeasibility {
    maxAiUnitsPerYear: number[]; // [Year1, Year2, ...] from Production
    maxAiRevenue: number[]; // Derived from Units * ASP
    bindingConstraints: string[]; // List of bottlenecks
    feasibilityStatus: 'Feasible' | 'Constrained';
    royaltyRate: number; // Shared "World Variable"
}

export const useRenegoStore = create<RenegoState>()(
    persist(
        (set, get) => ({
            scenarios: [],
            inputs: DEFAULT_INPUTS,
            useFeasibleRevenue: false, // Default OFF

            // Production Defaults
            productionConfig: DEFAULT_CONFIG,
            productionResults: [],
            operationalFeasibility: {
                maxAiUnitsPerYear: [],
                maxAiRevenue: [],
                bindingConstraints: [],
                feasibilityStatus: 'Feasible',
                royaltyRate: 0.07
            },

            setInputs: (inputs) => set((state) => ({
                inputs: typeof inputs === 'function' ? inputs(state.inputs) : inputs
            })),

            toggleFeasibleRevenue: () => set((state) => ({ useFeasibleRevenue: !state.useFeasibleRevenue })),

            setGlobalRoyalty: (rate) => {
                let newProfit = 0;

                // 1. Try exact match with Presets (to avoid floating point mismatch with Dropdown)
                // 35% -> 64.4
                if (Math.abs(rate - 0.35) < 0.001) newProfit = 64.40;
                else if (Math.abs(rate - 0.15) < 0.001) newProfit = 90.67;
                else if (Math.abs(rate - 0.125) < 0.001) newProfit = 93.96;
                else if (Math.abs(rate - 0.10) < 0.001) newProfit = 97.24;
                else {
                    // 2. Fallback to Formula for custom rates
                    // Profit = 64.4 + (0.35 - rate) * 131.36
                    newProfit = 64.4 + (0.35 - rate) * 131.36;
                }

                if (newProfit < 0) newProfit = 0;

                set((state) => ({
                    inputs: { ...state.inputs, newRoyaltyRate: rate },
                    operationalFeasibility: { ...state.operationalFeasibility, royaltyRate: rate },
                    productionConfig: {
                        ...state.productionConfig,
                        products: state.productionConfig.products.map(p =>
                            p.id === 'AI' ? { ...p, profitPerUnit: newProfit } : p
                        )
                    }
                }));
            },

            addScenario: (scenario: Scenario) => set((state) => ({
                scenarios: [scenario, ...state.scenarios]
            })),

            deleteScenario: (id: string) => set((state) => ({
                scenarios: state.scenarios.filter(s => s.id !== id)
            })),

            updateScenario: (id: string, updates: Partial<Scenario>) => set((state) => ({
                scenarios: state.scenarios.map(s => s.id === id ? { ...s, ...updates } : s)
            })),

            setScenarios: (scenarios: Scenario[]) => set({ scenarios }),

            // Production Actions
            setProductionConfig: (config) => {
                set((state) => {
                    const newConfig = typeof config === 'function' ? config(state.productionConfig) : config;
                    return { productionConfig: newConfig };
                });
            },

            runProductionOptimiser: () => {
                const config = get().productionConfig;
                const results = runOptimiser(config);

                // Calculate feasibility metadata
                const maxAiUnitsPerYear = results.map(r => r.production['AI'] || 0);
                const bindingConstraints = Array.from(new Set(results.flatMap(r => r.bindingConstraints)));

                // ASP Assumption: €75 per unit (Conservative Proxy)
                // This converts physical capacity to "Feasible Revenue"
                const ASP = 75;
                const maxAiRevenue = maxAiUnitsPerYear.map(u => u * ASP);

                set((state) => ({
                    productionResults: results,
                    operationalFeasibility: {
                        ...state.operationalFeasibility,
                        maxAiUnitsPerYear,
                        maxAiRevenue,
                        bindingConstraints,
                        feasibilityStatus: 'Feasible' // Simplification
                    }
                }));
            },

            resetInputs: () => set({ inputs: DEFAULT_INPUTS }),
        }),
        {
            name: 'mcs_renego_storage_v5', // Increment version
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                scenarios: state.scenarios,
                inputs: state.inputs,
                useFeasibleRevenue: state.useFeasibleRevenue,
                productionConfig: state.productionConfig,
                productionResults: state.productionResults,
                operationalFeasibility: state.operationalFeasibility
            }),
        }
    )
);
