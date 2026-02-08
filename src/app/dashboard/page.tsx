'use client';
import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DashboardMatrix from '@/components/DashboardMatrix';
import DashboardCharts from '@/components/DashboardCharts';
import { useRenegoStore } from '@/lib/store';

export default function Dashboard() {
    // Global State
    const scenarios = useRenegoStore((state) => state.scenarios);

    // UI State
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isHydrated, setIsHydrated] = useState(false);

    // Hydration Safety
    useEffect(() => {
        setIsHydrated(true);
    }, []);

    // Set initial selection when data loads
    useEffect(() => {
        if (isHydrated && scenarios.length > 0 && !selectedId) {
            setSelectedId(scenarios[0].id);
        }
    }, [isHydrated, scenarios, selectedId]);

    const handleSelect = (id: string) => {
        setSelectedId(id);
    };

    if (!isHydrated) {
        return <div className="min-h-screen bg-gray-50" />;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Header />

            <main className="flex-1 container mx-auto px-6 py-8 space-y-8 animate-in fade-in duration-500">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Decision Dashboard</h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Comparative analysis of saved deal scenarios.
                    </p>
                </div>

                {/* 1. Comparison Matrix */}
                <DashboardMatrix
                    scenarios={scenarios}
                    selectedId={selectedId}
                    onSelect={handleSelect}
                />

                {/* 2. Visualizations */}
                <DashboardCharts
                    scenarios={scenarios}
                    selectedId={selectedId}
                />

                {scenarios.length === 0 && (
                    <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                        <p className="text-gray-400 font-bold mb-2">Data Source Empty</p>
                        <p className="text-sm text-gray-400">
                            Go to the
                            <a href="/" className="text-blue-500 hover:underline mx-1">Modeler</a>
                            tab to build and save scenarios first.
                        </p>
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}
