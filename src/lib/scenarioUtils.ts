import { CalcInputs } from './calc';

export type SaveMode = "full" | "termsOnly";

export interface Scenario {
    id: string;
    name: string;
    createdAt: number;
    inputs: CalcInputs;
    saveMode: SaveMode;
    tags: string[];
    description?: string;
    // Cache feasibility data for dashboard display
    feasibility?: {
        status: 'Feasible' | 'Constrained';
        gap: number; // Revenue gap (Total Difference)
        maxRevenue: number[]; // Yearly Feasible Revenue
    };
}

export const generateId = () => Math.random().toString(36).substring(2, 9);

export const saveScenariosToStorage = (scenarios: Scenario[]) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('license_tool_scenarios', JSON.stringify(scenarios));
    }
};

export const loadScenariosFromStorage = (): Scenario[] => {
    if (typeof window !== 'undefined') {
        const data = localStorage.getItem('license_tool_scenarios');
        return data ? JSON.parse(data) : [];
    }
    return [];
};

export const exportScenarios = (scenarios: Scenario[]) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(scenarios));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "license_scenarios.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};

export const getEffectiveInputs = (scenario: Scenario, useFeasible: boolean): CalcInputs => {
    // If feasible mode is ON and we have valid feasibility data, override forecast
    if (useFeasible && scenario.feasibility && scenario.feasibility.maxRevenue && scenario.feasibility.maxRevenue.length > 0) {
        return {
            ...scenario.inputs,
            forecast: scenario.inputs.forecast.map((f, i) => ({
                ...f,
                revenue: scenario.feasibility!.maxRevenue[i] ?? f.revenue // Fallback to original if index missing
            }))
        };
    }
    return scenario.inputs;
};
