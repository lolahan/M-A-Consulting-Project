'use client';
import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductionInputs from '@/components/ProductionInputs';
import ProductionResults from '@/components/ProductionResults';
import { useRenegoStore } from '@/lib/store';

export default function ProductionPage() {
    const [isHydrated, setIsHydrated] = useState(false);

    // Hydration Safety
    useEffect(() => {
        setIsHydrated(true);
    }, []);

    if (!isHydrated) {
        return <div className="min-h-screen bg-gray-50" />;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-blue-500/20">
            <Header />

            <main className="flex-1 container mx-auto px-6 py-8 max-w-7xl space-y-8 animate-in fade-in duration-500">
                <div className="mb-8 space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">Operations Strategy</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Production Capacity Optimiser</h2>
                    <p className="text-gray-500 max-w-2xl text-sm font-medium">
                        Simulate investment bottlenecks and optimize multi-year AI production schedules.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">

                    {/* Left: Inputs */}
                    <section className="lg:col-span-1 space-y-6">
                        <ProductionInputs />
                    </section>

                    {/* Right: Results */}
                    <section className="lg:col-span-2 space-y-6">
                        <div className="flex items-center gap-3 mb-4 px-1">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Simulation Results</h3>
                            <div className="h-px flex-grow bg-gray-200"></div>
                        </div>
                        <ProductionResults />
                    </section>

                </div>
            </main>

            <Footer />
        </div>
    );
}
