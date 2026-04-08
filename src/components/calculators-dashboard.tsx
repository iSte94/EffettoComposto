"use client";

import { InflationCalculator } from "@/components/inflation-calculator";
import { CompoundInterestCalculator } from "@/components/compound-interest-calculator";
import { Calculator } from "lucide-react";

export function CalculatorsDashboard() {
    return (
        <div className="space-y-8">
            <div className="text-center space-y-2 pb-4">
                <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-900 rounded-2xl shadow-sm">
                    <Calculator className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                    <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-200">Calcolatori</h2>
                </div>
                <p className="text-sm text-slate-500">Strumenti per calcolare inflazione e interesse composto.</p>
            </div>

            <InflationCalculator />
            <CompoundInterestCalculator />
        </div>
    );
}
