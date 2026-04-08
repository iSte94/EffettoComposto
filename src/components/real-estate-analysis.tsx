"use client";

import { lazy, Suspense, useState } from "react";
import { Landmark, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { MortgageSimulator } from "@/components/mortgage-simulator";
import { RentalIncomeAnalyzer } from "@/components/rental-income";

const MutuiMarket = lazy(() =>
    import("@/components/mutui-market").then((m) => ({ default: m.MutuiMarket }))
);

type Mode = "mutuo" | "rendita" | "market";

function TabFallback() {
    return (
        <div className="flex items-center justify-center rounded-2xl border border-border/70 bg-card/70 py-24 shadow-sm backdrop-blur-sm">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
    );
}

export function RealEstateAnalysis() {
    const [mode, setMode] = useState<Mode>("mutuo");

    return (
        <div className="space-y-8">
            {/* Toggle Mutuo / Rendita / Market */}
            <div className="flex justify-center">
                <div className="grid w-full max-w-3xl grid-cols-3 gap-1.5 rounded-2xl bg-muted/80 p-1.5 shadow-sm ring-1 ring-border/70">
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
                    <button
                        onClick={() => setMode("market")}
                        className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            mode === "market"
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <TrendingDown className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        <span className="whitespace-nowrap">Mutui Market</span>
                    </button>
                </div>
            </div>

            {/* Contenuto */}
            {mode === "mutuo" && <MortgageSimulator />}
            {mode === "rendita" && <RentalIncomeAnalyzer />}
            {mode === "market" && (
                <Suspense fallback={<TabFallback />}>
                    <MutuiMarket />
                </Suspense>
            )}
        </div>
    );
}

