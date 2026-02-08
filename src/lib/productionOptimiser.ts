import { formatEuroM } from './calc';

// --- Data Types ---

export interface Product {
    id: string; // 'Legacy', 'MRI', 'AI'
    name: string;
    profitPerUnit: number; // Updated to match Python/Table
    // For Legacy/MRI which have fixed or min targets per year
    fixedOutput?: number[]; // Array of length YEARS
    minOutput?: number[];   // Array of length YEARS 
}

export interface Constraint {
    id: string;
    name: string;
    baseCapacity: number;
    annualGrowth: number; // e.g. 512,000 for labour
}

export interface Investment {
    id: string;
    name: string; // Matches Python name key
    constraintAffected: string; // ID of constraint it boosts
    active: boolean;
    installMonths: number;
    fullCapacity: number; // Capacity added when fully active
    downtimeMonths: number;
}

export type UsageMatrix = Record<string, Record<string, number>>; // constraintId -> productId -> usage

export interface ProductionConfig {
    years: number;
    products: Product[];
    constraints: Constraint[];
    usage: UsageMatrix;
    investments: Investment[];
    downtimeMode: 'all' | 'affected'; // "allConstraints" vs "affectedConstraintOnly"
}

export interface YearResult {
    year: number;
    capacities: Record<string, number>; // constraintId -> max capacity
    production: Record<string, number>; // productId -> units
    slack: Record<string, number>;      // constraintId -> remaining
    utilization: Record<string, number>;// constraintId -> % used
    bindingConstraints: string[];
    totalProfit: number;
    status: string; // 'Optimal' or 'Infeasible'
}

// --- Defaults (Strictly aligned with Python) ---

export const DEFAULT_YEARS = 5;

// Data from Python Source & Table
export const DEFAULT_PRODUCTS: Product[] = [
    {
        id: 'Legacy',
        name: 'Legacy',
        profitPerUnit: 20.0, // Source: BTL Product Line Revenue Breakdown (Reported Contribution)
        fixedOutput: [1950000, 1950000, 1950000, 1950000, 1950000]
    },
    {
        id: 'MRI',
        name: 'MRI',
        profitPerUnit: 40.0, // Source: BTL Product Line Revenue Breakdown (Reported Contribution)
        minOutput: [1537500, 1537500, 1537500, 1537500, 1537500]
    },
    {
        id: 'AI',
        name: 'AI',
        profitPerUnit: 64.4, // Source: User Update (35% Royalty Case)
        // No fixed/min, it fills the slack
    }
];

export const ROYALTY_OPTIONS = [
    { label: '35% Royalty', value: 64.40 },
    { label: '15% Royalty', value: 90.67 },
    { label: '12.5% Royalty', value: 93.96 },
    { label: '10% Royalty', value: 97.24 },
    { label: 'No AI Access', value: 0 },
];

export const DEFAULT_CONSTRAINTS: Constraint[] = [
    { id: 'Labour', name: 'Labour', baseCapacity: 2560000, annualGrowth: 512000 },
    { id: 'Wafer_Cutting', name: 'Wafer Cutting', baseCapacity: 800000, annualGrowth: 0 },
    { id: 'Line_1', name: 'Line 1', baseCapacity: 640000, annualGrowth: 0 },
    { id: 'Line_2', name: 'Line 2', baseCapacity: 1248000, annualGrowth: 0 },
    { id: 'Energy', name: 'Energy', baseCapacity: 64000000, annualGrowth: 0 },
    { id: 'Station_B', name: 'Station B', baseCapacity: 5280000, annualGrowth: 0 },
];

export const DEFAULT_USAGE: UsageMatrix = {
    'Labour': { 'Legacy': 0.5, 'MRI': 0.8, 'AI': 1.2 },
    'Wafer_Cutting': { 'Legacy': 0.2, 'MRI': 0.2, 'AI': 0.2 },
    'Line_1': { 'Legacy': 0.2, 'MRI': 0.0, 'AI': 0.0 },
    'Line_2': { 'Legacy': 0.0, 'MRI': 0.4, 'AI': 0.8 },
    'Energy': { 'Legacy': 4.0, 'MRI': 7.0, 'AI': 10.0 },
    'Station_B': { 'Legacy': 1.0, 'MRI': 1.0, 'AI': 1.0 }
};

export const DEFAULT_INVESTMENTS: Investment[] = [
    {
        id: 'wafer1',
        name: 'Wafer Cutting Module 1',
        constraintAffected: 'Wafer_Cutting',
        active: false,
        installMonths: 3,
        fullCapacity: 200000,
        downtimeMonths: 0
    },
    {
        id: 'wafer2',
        name: 'Wafer Cutting Module 2',
        constraintAffected: 'Wafer_Cutting',
        active: false,
        installMonths: 3,
        fullCapacity: 200000,
        downtimeMonths: 0
    },
    {
        id: 'wafer3',
        name: 'Wafer Cutting Module 3',
        constraintAffected: 'Wafer_Cutting',
        active: false,
        installMonths: 3,
        fullCapacity: 200000,
        downtimeMonths: 0
    },
    {
        id: 'line3',
        name: 'Line 3',
        constraintAffected: 'Line_2', // Note: Python applies Line 3 inv to Line 2 constraint
        active: false,
        installMonths: 12,
        fullCapacity: 1248000,
        downtimeMonths: 0
    },
    {
        id: 'stnB',
        name: 'Station B Upgrade',
        constraintAffected: 'Station_B',
        active: false,
        installMonths: 6,
        fullCapacity: 2376000,
        downtimeMonths: 1
    },
];

export const DEFAULT_CONFIG: ProductionConfig = {
    years: DEFAULT_YEARS,
    products: DEFAULT_PRODUCTS,
    constraints: DEFAULT_CONSTRAINTS,
    usage: DEFAULT_USAGE,
    investments: DEFAULT_INVESTMENTS,
    downtimeMode: 'all',
};

// --- Core Logic ---

export function computeCapacitySchedule(config: ProductionConfig): Record<string, number>[] {
    const schedule: Record<string, number>[] = [];

    // Helper to check investment status
    const getInv = (id: string) => config.investments.find(i => i.id === id);

    for (let yearIdx = 0; yearIdx < config.years; yearIdx++) {
        const yearNum = yearIdx + 1;
        const caps: Record<string, number> = {};

        // 1. Base + Growth
        config.constraints.forEach(c => {
            caps[c.id] = c.baseCapacity + (c.annualGrowth * yearIdx);
        });

        // 2. Apply Investments (Python logic port)
        config.investments.forEach(inv => {
            if (!inv.active) return;

            // Logic:
            // finish_year = (install_months // 12) + 1
            // if install_months % 12 == 0: finish_year = install_months // 12 + 1 (Python logic actually: if %12==0, finishes start of next year?
            // Python: "if install_months % 12 == 0: finish_year = install // 12 + 1; months_active = 12"
            // Wait, Python code: 
            // finish_year = (install // 12) + 1
            // months_active = 12 - (install % 12)
            // if install % 12 == 0: finish_year = install // 12 + 1; months_active = 12.

            // Let's trace Python for 12 months (Line 3):
            // finish = (12//12)+1 = 2. 
            // if 12%12==0 -> finish=2, active=12.
            // So for Year < 2 (Year 1): Pass.
            // For Year == 2: Cap += Full * (12/12) = Full.
            // So Line 3 (12mo) starts fully in Year 2.

            // Wafer (3 months):
            // finish = (3//12)+1 = 1.
            // active = 12 - 3 = 9.
            // Year 1 == Finish Year -> Cap += Full * (9/12). 
            // So 75% capacity in Year 1.

            let finishYear = Math.floor(inv.installMonths / 12) + 1;
            let monthsActive = 12 - (inv.installMonths % 12);

            if (inv.installMonths % 12 === 0) {
                finishYear = Math.floor(inv.installMonths / 12) + 1;
                monthsActive = 12;
            }

            // Apply
            if (yearNum < finishYear) {
                // Installing...
            } else if (yearNum === finishYear) {
                // Partial year
                if (caps[inv.constraintAffected]) {
                    caps[inv.constraintAffected] += inv.fullCapacity * (monthsActive / 12);
                }
            } else {
                // Fully operational
                if (caps[inv.constraintAffected]) {
                    caps[inv.constraintAffected] += inv.fullCapacity;
                }
            }
        });

        // 3. Apply Downtime (Python logic port)
        config.investments.forEach(inv => {
            if (!inv.active || inv.downtimeMonths === 0) return;

            // When does downtime happen? 
            // Python: 
            // finish_year calculation same as above.
            // if year == finish_year: apply downtime_factor.

            let finishYear = Math.floor(inv.installMonths / 12) + 1;
            if (inv.installMonths % 12 === 0) {
                finishYear = Math.floor(inv.installMonths / 12) + 1;
            }

            if (yearNum === finishYear) {
                const factor = (12 - inv.downtimeMonths) / 12;

                if (config.downtimeMode === 'all') {
                    // Python logic: "for constraint in CONSTRAINTS: schedule[year][constraint] *= downtime_factor"
                    Object.keys(caps).forEach(k => caps[k] *= factor);
                } else {
                    // Only affected constraint
                    if (caps[inv.constraintAffected]) {
                        caps[inv.constraintAffected] *= factor;
                    }
                }
            }
        });

        schedule.push(caps);
    }
    return schedule;
}

export function solveYearLP(
    yearIdx: number,
    capacities: Record<string, number>,
    config: ProductionConfig
): YearResult {
    // Products
    const legacy = config.products.find(p => p.id === 'Legacy')!;
    const mri = config.products.find(p => p.id === 'MRI')!;
    const ai = config.products.find(p => p.id === 'AI')!;

    // Mandatory Production
    const legacyAmt = legacy.fixedOutput ? legacy.fixedOutput[yearIdx] : 0;
    const mriAmt = mri.minOutput ? mri.minOutput[yearIdx] : 0;

    // Remaining Capacity for AI
    // Optimization: Maximize AI profit. 
    // Since AI profit > 0, we maximize AI units subject to constraints.
    // Max AI = Min across all constraints of (Available / UnitUsage)

    let maxAI = Infinity;
    const slack: Record<string, number> = {};
    const utilization: Record<string, number> = {};
    const binding: string[] = [];
    const consumed: Record<string, number> = {};

    let feasible = true;

    // 1. Calculate Mandatory Usage & Capacity Checks
    config.constraints.forEach(c => {
        const cap = capacities[c.id];
        const usageL = config.usage[c.id]['Legacy'] || 0;
        const usageM = config.usage[c.id]['MRI'] || 0;
        const usageA = config.usage[c.id]['AI'] || 0;

        const usedBase = (usageL * legacyAmt) + (usageM * mriAmt);

        if (usedBase > cap + 1e-6) { // Float tolerance
            feasible = false;
        }

        // AI Capacity
        if (usageA > 0) {
            const remaining = Math.max(0, cap - usedBase);
            const canMake = remaining / usageA;
            if (canMake < maxAI) {
                maxAI = canMake;
            }
        }
    });

    if (!feasible) {
        return {
            year: yearIdx + 1,
            capacities,
            production: { 'Legacy': legacyAmt, 'MRI': mriAmt, 'AI': 0 },
            slack: {},
            utilization: {},
            bindingConstraints: ['Infeasible (Mandatory > Cap)'],
            totalProfit: 0,
            status: 'Infeasible'
        };
    }

    // AI Amount (Integer units typically, but Python allows floats? 
    // Python outputs e.g. 295,833.33 units. So we keep floats.)
    const aiAmt = Math.max(0, maxAI);

    // 2. Final Calc
    config.constraints.forEach(c => {
        const cap = capacities[c.id];
        const usageL = config.usage[c.id]['Legacy'] || 0;
        const usageM = config.usage[c.id]['MRI'] || 0;
        const usageA = config.usage[c.id]['AI'] || 0;

        const used = (usageL * legacyAmt) + (usageM * mriAmt) + (usageA * aiAmt);
        consumed[c.id] = used;

        const s = cap - used;
        slack[c.id] = s;
        utilization[c.id] = cap > 0 ? (used / cap) : 0;

        if (Math.abs(s) < 1e-6 || (cap > 0 && used / cap > 0.9999)) {
            binding.push(c.id); // e.g. 'Labour'
        }
    });

    const totalProfit =
        (legacyAmt * legacy.profitPerUnit) +
        (mriAmt * mri.profitPerUnit) +
        (aiAmt * ai.profitPerUnit);

    return {
        year: yearIdx + 1,
        capacities,
        production: { 'Legacy': legacyAmt, 'MRI': mriAmt, 'AI': aiAmt },
        slack,
        utilization,
        bindingConstraints: binding,
        totalProfit,
        status: 'Optimal'
    };
}

export function runOptimiser(config: ProductionConfig): YearResult[] {
    const years = config.years;
    const schedule = computeCapacitySchedule(config);
    const results: YearResult[] = [];

    for (let i = 0; i < years; i++) {
        results.push(solveYearLP(i, schedule[i], config));
    }
    return results;
}
