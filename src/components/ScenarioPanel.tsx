"use client";

import React, { useState, useMemo } from 'react';
import { Scenario, SaveMode, generateId } from '@/lib/scenarioUtils';
import { useRenegoStore } from '@/lib/store';
import { CalcInputs, computeDealAnalysis } from '@/lib/calc';
import { formatEuroM, formatMonths } from '@/lib/formatters';

interface ScenarioPanelProps {
    scenarios: Scenario[];
    currentInputs: CalcInputs;
    onSave: (scenario: Scenario) => void;
    onLoad: (scenario: Scenario) => void;
    onDelete: (id: string) => void;
    onCompare: (selectedIds: string[]) => void;
    onImport: (scenarios: Scenario[]) => void;
    onExport: () => void;
}

export default function ScenarioPanel({
    scenarios,
    currentInputs,
    onSave,
    onLoad,
    onDelete,
    onCompare,
    onImport,
    onExport,
}: ScenarioPanelProps) {
    const [isOpen, setIsOpen] = useState(false); // Mobile state
    const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false); // Desktop state

    // Save Modal State
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [newScenarioName, setNewScenarioName] = useState("");
    const [newScenarioDescription, setNewScenarioDescription] = useState("");
    const [newScenarioTags, setNewScenarioTags] = useState("");
    const [saveMode, setSaveMode] = useState<SaveMode>("full");

    // Filter State
    const [filterTag, setFilterTag] = useState<string>("All");
    const [searchQuery, setSearchQuery] = useState("");

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Derived Data
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        scenarios.forEach(s => s.tags.forEach(t => tags.add(t)));
        return Array.from(tags).sort();
    }, [scenarios]);

    const filteredScenarios = useMemo(() => {
        return scenarios.filter(s => {
            const matchesTag = filterTag === "All" || s.tags.includes(filterTag);
            const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (s.description || "").toLowerCase().includes(searchQuery.toLowerCase());
            return matchesTag && matchesSearch;
        });
    }, [scenarios, filterTag, searchQuery]);

    const { operationalFeasibility } = useRenegoStore();

    const handleSave = () => {
        if (!newScenarioName.trim()) return;

        // Calculate Feasibility Metadata for this snapshot
        const totalForecast = currentInputs.forecast.reduce((sum, f) => sum + f.revenue, 0);
        const totalFeasible = operationalFeasibility.maxAiRevenue.reduce((a, b) => a + b, 0);
        const isConstrained = totalForecast > totalFeasible; // Simple check (improve to year-by-year if needed)

        const scenario: Scenario = {
            id: generateId(),
            name: newScenarioName,
            createdAt: Date.now(),
            inputs: currentInputs,
            saveMode,
            tags: newScenarioTags.split(',').map(t => t.trim()).filter(Boolean),
            description: newScenarioDescription.trim(),
            feasibility: {
                status: isConstrained ? 'Constrained' : 'Feasible',
                gap: Math.max(0, totalForecast - totalFeasible),
                maxRevenue: operationalFeasibility.maxAiRevenue
            }
        };

        onSave(scenario);
        setIsSaveModalOpen(false);
        setNewScenarioName("");
        setNewScenarioDescription("");
        setNewScenarioTags("");
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            if (newSet.size >= 6) return; // Max 6 comparison
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (Array.isArray(json)) {
                    // Basic validation
                    const validScenarios = json.filter(s => s.id && s.name && s.inputs);
                    onImport(validScenarios);
                } else {
                    alert("Invalid file format");
                }
            } catch (err) {
                alert("Failed to parse JSON");
            }
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = "";
    };

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`lg:hidden fixed top-20 left-4 z-40 p-2 bg-white rounded-lg shadow-md border border-gray-200 transition-transform duration-300 ${isOpen ? 'translate-x-[320px]' : 'translate-x-0'}`}
            >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
            </button>

            {/* Desktop Toggle Button (Visible only on LG) */}
            <button
                onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
                className={`hidden lg:flex fixed top-24 z-40 p-1.5 bg-white rounded-r-lg shadow-sm border-y border-r border-gray-200 text-gray-400 hover:text-blue-500 transition-all duration-300 ${isDesktopCollapsed ? 'left-0' : 'left-80'}`}
                title={isDesktopCollapsed ? "Expand Panel" : "Collapse Panel"}
            >
                <svg className={`w-4 h-4 transition-transform duration-300 ${isDesktopCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>

            <div className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 transform 
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
                lg:translate-x-0 lg:static lg:h-auto 
                ${isDesktopCollapsed ? 'lg:w-0 lg:overflow-hidden lg:opacity-0' : 'lg:w-80 lg:opacity-100'} 
                lg:shrink-0`}
            >
                <div className="h-full bg-white border-r border-gray-200 flex flex-col w-80 shadow-xl lg:shadow-none whitespace-nowrap">

                    {/* Header */}
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-600">Saved Scenarios</h2>
                        <div className="flex gap-2">
                            <button onClick={onExport} title="Export Scenarios" className="text-gray-400 hover:text-blue-500 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </button>
                            <label title="Import Scenarios" className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer">
                                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            </label>
                            <button onClick={() => setIsSaveModalOpen(true)} className="text-blue-600 hover:text-blue-700 font-bold text-xs flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 transition-all hover:shadow-sm">
                                + SAVE
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="p-4 space-y-3 border-b border-gray-100">
                        <input
                            type="text"
                            placeholder="Search scenarios..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                            <button
                                onClick={() => setFilterTag("All")}
                                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${filterTag === "All" ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}
                            >
                                All
                            </button>
                            {allTags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => setFilterTag(tag)}
                                    className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${filterTag === tag ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {filteredScenarios.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-xs text-gray-400">No scenarios found.</p>
                                <button onClick={() => setIsSaveModalOpen(true)} className="mt-2 text-[10px] text-blue-500 font-bold hover:underline">Save current state</button>
                            </div>
                        ) : (
                            filteredScenarios.map(scen => {
                                const analysis = computeDealAnalysis(scen.inputs);
                                const isSelected = selectedIds.has(scen.id);

                                return (
                                    <div
                                        key={scen.id}
                                        onClick={() => onLoad(scen)}
                                        className={`group relative p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md ${isSelected ? 'ring-2 ring-blue-500 border-transparent bg-blue-50/30' : 'bg-white border-gray-200 hover:border-blue-300'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="w-full pr-6">
                                                <h4 className="text-xs font-bold text-gray-800 line-clamp-1">{scen.name}</h4>
                                                {scen.description && (
                                                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{scen.description}</p>
                                                )}
                                                <div className="flex gap-1 mt-1 flex-wrap">
                                                    {scen.tags.map(t => (
                                                        <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 font-medium">{t}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelection(scen.id)}
                                                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                />
                                            </div>
                                        </div>

                                        {/* Compact KPI Summary */}
                                        <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-[10px] text-gray-500 border-t border-gray-100/50 pt-2 mt-2">
                                            <div className="flex justify-between">
                                                <span>NPV:</span>
                                                <span className={`font-mono font-bold ${analysis.dealNPV > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatEuroM(analysis.dealNPV / 1000000)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Payback:</span>
                                                <span className="font-mono text-gray-700">{analysis.paybackMonths ? formatMonths(analysis.paybackMonths) : "None"}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Rate:</span>
                                                <span className="font-mono text-gray-700">{(scen.inputs.newRoyaltyRate * 100).toFixed(1)}%</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Upfront:</span>
                                                <span className="font-mono text-gray-700">€{(scen.inputs.upfrontFee / 1000000).toFixed(1)}m</span>
                                            </div>
                                        </div>

                                        {/* Hover Actions */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDelete(scen.id); }}
                                            className="absolute top-2 right-8 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                                            title="Delete Scenario"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer Actions */}
                    {selectedIds.size >= 2 && (
                        <div className="p-4 border-t border-gray-200 bg-blue-50">
                            <button
                                onClick={() => onCompare(Array.from(selectedIds))}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex justify-center items-center gap-2"
                            >
                                Compare {selectedIds.size} Scenarios
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            </button>
                            <button
                                onClick={() => setSelectedIds(new Set())}
                                className="w-full mt-2 text-[10px] text-blue-500 hover:text-blue-700 font-medium text-center"
                            >
                                Clear Selection
                            </button>
                        </div>
                    )}
                </div>

                {/* Save Scenario Modal */}
                {isSaveModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 p-6 animate-in zoom-in-50 duration-200">
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-4">Save Scenario</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Scenario Name</label>
                                    <input
                                        type="text"
                                        autoFocus
                                        value={newScenarioName}
                                        onChange={(e) => setNewScenarioName(e.target.value)}
                                        className="w-full bg-white border border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all rounded-lg px-3 py-2 text-sm"
                                        placeholder="e.g. Aggressive Growth Strategy"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Description (Optional)</label>
                                    <textarea
                                        value={newScenarioDescription}
                                        onChange={(e) => setNewScenarioDescription(e.target.value)}
                                        className="w-full bg-white border border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all rounded-lg px-3 py-2 text-sm resize-none h-16"
                                        placeholder="Add details about this scenario..."
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Tags (For Filtering)</label>
                                    <input
                                        type="text"
                                        value={newScenarioTags}
                                        onChange={(e) => setNewScenarioTags(e.target.value)}
                                        className="w-full bg-white border border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all rounded-lg px-3 py-2 text-sm"
                                        placeholder="e.g. Q1, High Risk"
                                    />
                                </div>

                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-gray-700">Snapshot Revenue Forecast?</label>
                                        <div
                                            onClick={() => setSaveMode(saveMode === "full" ? "termsOnly" : "full")}
                                            className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors ${saveMode === "full" ? "bg-blue-500" : "bg-gray-300"}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${saveMode === "full" ? "translate-x-5" : "translate-x-0"}`}></div>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 leading-tight">
                                        {saveMode === "full"
                                            ? "Saves current deal terms AND the specific revenue numbers in the forecast table."
                                            : "Saves only deal terms (rates, upfront). Loading will apply these terms to whatever revenue forecast is currently active."}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setIsSaveModalOpen(false)}
                                    className="flex-1 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!newScenarioName.trim()}
                                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                                >
                                    Save Snapshot
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
