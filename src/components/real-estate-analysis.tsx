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
                <div className="grid w-full max-w-2xl grid-cols-2 gap-1.5 rounded-2xl bg-muted/80 p-1.5 shadow-sm ring-1 ring-border/70">
                    <button
                        onClick={() => setMode("mutuo")}
                        className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            mode === "mutuo"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="whitespace-nowrap">Simulatore Mutuo</span>
                    </button>
                    <button
                        onClick={() => setMode("rendita")}
                        className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            mode === "rendita"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="whitespace-nowrap">Rendita Immobili</span>
                    </button>
                </div>
            </div>

            {/* Contenuto */}
            {mode === "mutuo" ? <MortgageSimulator /> : <RentalIncomeAnalyzer />}
        </div>
    );
}
