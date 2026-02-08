"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import RenegotiationForm from '@/components/RenegotiationForm';
import ResultsDisplay from '@/components/ResultsDisplay';
import ScenarioPanel from '@/components/ScenarioPanel';
import ComparisonTable from '@/components/ComparisonTable';
import { computeDealAnalysis, CalcInputs } from '@/lib/calc';
import { Scenario } from '@/lib/scenarioUtils';
import { useRenegoStore } from '@/lib/store';

export default function Home() {
  // Global State (Persisted)
  const {
    inputs,
    setInputs,
    scenarios,
    addScenario,
    setScenarios,
    deleteScenario,
    updateScenario,
    useFeasibleRevenue,
    operationalFeasibility,
    setGlobalRoyalty
  } = useRenegoStore();

  // Compute Effective Inputs for Analysis (Respecting Toggle)
  const effectiveInputs = useMemo(() => {
    if (useFeasibleRevenue && operationalFeasibility.maxAiRevenue.length > 0) {
      // Override forecast with feasible revenue
      return {
        ...inputs,
        forecast: inputs.forecast.map((f, i) => ({
          ...f,
          revenue: operationalFeasibility.maxAiRevenue[i] ?? f.revenue
        }))
      };
    }
    return inputs;
  }, [inputs, useFeasibleRevenue, operationalFeasibility]);

  // Compute Analysis
  const analysis = useMemo(() => {
    return computeDealAnalysis(effectiveInputs);
  }, [effectiveInputs]);

  // Local UI State
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Prevent Hydration Mismatch
  useEffect(() => {
    setIsHydrated(true);
  }, []);


  const scenariosToCompare = useMemo(() => {
    return scenarios.filter(s => compareIds.includes(s.id));
  }, [scenarios, compareIds]);

  const handleInputChange = (
    field: keyof CalcInputs,
    value: any
  ) => {
    if (field === 'newRoyaltyRate') {
      // Sync both Financial Input and Production Model Profit
      setGlobalRoyalty(Number(value));
    } else {
      setInputs((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSaveScenario = (newScenario: Scenario) => {
    // Add to store (auto-persisted)
    addScenario(newScenario);
  };

  const handleLoadScenario = (scenario: Scenario) => {
    if (scenario.saveMode === 'full') {
      setInputs(scenario.inputs);
    } else {
      // Terms only: keep current forecast, apply other terms
      setInputs((prev) => ({
        ...scenario.inputs,
        forecast: prev.forecast
      }));
    }
  };

  const handleDeleteScenario = (id: string) => {
    if (confirm("Delete this scenario snapshot?")) {
      deleteScenario(id);
      setCompareIds(prev => prev.filter(cId => cId !== id));
    }
  };

  const handleImportScenarios = (imported: Scenario[]) => {
    const merged = [...scenarios];
    imported.forEach(imp => {
      const existingIndex = merged.findIndex(s => s.id === imp.id);
      if (existingIndex >= 0) {
        // ID Conflict: Append (Imported) to name and create new ID
        merged.unshift({
          ...imp,
          id: imp.id + '_imported_' + Date.now(),
          name: imp.name + " (Imported)"
        });
      } else {
        merged.unshift(imp);
      }
    });
    // Update store
    setScenarios(merged);
    alert(`Imported ${imported.length} scenarios successfully.`);
  };

  // Show loading or default until hydrated to avoid mismatch
  if (!isHydrated) {
    return <div className="min-h-screen bg-white" />;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-blue-500/20">
      <Header />

      <div className="flex flex-col lg:flex-row flex-grow">
        {/* Side Panel */}
        <ScenarioPanel
          scenarios={scenarios}
          currentInputs={inputs}
          onSave={handleSaveScenario}
          onLoad={handleLoadScenario}
          onDelete={handleDeleteScenario}
          onCompare={setCompareIds}
          onImport={handleImportScenarios}
          onExport={() => import('@/lib/scenarioUtils').then(m => m.exportScenarios(scenarios))}
        />

        {/* Main Workspace */}
        <main className="flex-grow container mx-auto px-6 py-8 max-w-7xl space-y-8 animate-in fade-in duration-500">

          <div className="mb-8 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">Model Workspace</span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">AI License Renegotiation</h2>
            <p className="text-gray-500 max-w-2xl text-sm font-medium">
              Simulate royalty structures and liquidity outcomes to optimize Enterprise Value.
            </p>
          </div>

          {/* 2-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">

            {/* Left Column: Deal Inputs */}
            <section className="lg:col-span-1 space-y-6">
              <div className="flex items-center gap-3 mb-2 px-1">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Deal Inputs</h3>
                <div className="h-px flex-grow bg-gray-200"></div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xl shadow-blue-900/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500"></div>
                <RenegotiationForm
                  inputs={inputs}
                  onChange={handleInputChange}
                />
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-[10px] text-gray-400 leading-relaxed italic">
                * All revenue figures are in Euro (€). NPV calculations use a {(inputs.discountRate * 100).toFixed(1)}% discount rate.
              </div>
            </section>

            {/* Right Column: Results & Comparison */}
            <section className="lg:col-span-2 space-y-6">

              {/* Active Analysis */}
              <div>
                <div className="flex items-center gap-3 mb-4 px-1">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Analysis Result</h3>
                  <div className="h-px flex-grow bg-gray-200"></div>
                </div>

                <ResultsDisplay
                  analysis={analysis}
                  exclusivityYears={inputs.exclusivityYears}
                  forecast={inputs.forecast}
                />
              </div>

              {/* Comparison Analysis */}
              {compareIds.length > 0 && (
                <div className="mt-12 pt-8 border-t border-dashed border-gray-200">
                  <ComparisonTable
                    scenarios={scenariosToCompare}
                    onClose={() => setCompareIds([])}
                  />
                </div>
              )}

              {/* Strategic Context Footer */}
              {compareIds.length === 0 && (
                <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-200/60 shadow-inner">
                  <h4 className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest mb-3">Negotiation Strategy / Notes</h4>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 leading-relaxed">
                        This tool models the trade-off between immediate liquidity (€{(inputs.upfrontFee / 1000000).toFixed(2)}m upfront) and long-term royalty savings.
                        Exclusivity is treated as a contractual constraint lacking intrinsic valuation data.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </section>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
