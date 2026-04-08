"use client";

import { InflationCalculator } from "@/components/inflation-calculator";
import { CompoundInterestCalculator } from "@/components/compound-interest-calculator";
import { Calculator } from "lucide-react";

export function CalculatorsDashboard() {
    return (
        <div className="space-y-8">
            <div className="text-center space-y-3 pb-4">
                <div className="inline-flex items-center gap-3 px-4 sm:px-5 py-2.5 bg-teal-50/80 dark:bg-teal-950/35 border border-teal-200/80 dark:border-teal-900/70 rounded-2xl shadow-sm">
                    <Calculator className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                    <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">Calcolatori</h2>
                </div>
                <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">Strumenti per calcolare inflazione e interesse composto.</p>
            </div>

            <InflationCalculator />
            <CompoundInterestCalculator />
        </div>
    );
}
