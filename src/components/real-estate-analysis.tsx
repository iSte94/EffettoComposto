"use client";

import { useState } from "react";
import { Landmark, TrendingUp } from "lucide-react";
import { MortgageSimulator } from "@/components/mortgage-simulator";
import { RentalIncomeAnalyzer } from "@/components/rental-income";

type Mode = "mutuo" | "rendita";

export function RealEstateAnalysis() {
    const [mode, setMode] = useState<Mode>("mutuo");

    return (
        <div className="space-y-8">
            {/* Toggle Mutuo / Rendita */}
            <div className="flex justify-center">
                <div className="inline-flex bg-slate-100/80 dark:bg-slate-800/80 p-1.5 rounded-2xl shadow-sm">
                    <button
                        onClick={() => setMode("mutuo")}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
                            mode === "mutuo"
                                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        }`}
                    >
                        <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        Simulatore Mutuo
                    </button>
                    <button
                        onClick={() => setMode("rendita")}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
                            mode === "rendita"
                                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        }`}
                    >
                        <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        Rendita Immobili
                    </button>
                </div>
            </div>

            {/* Contenuto */}
            {mode === "mutuo" ? <MortgageSimulator /> : <RentalIncomeAnalyzer />}
        </div>
    );
}
