"use client";

import { formatEuro } from "@/lib/format";

interface DtiAnalysisProps {
    mortgagePayment: number;
    loanAmount: number;
    totalMonthlyDebt: number;
    calculatedExistingInstallment: number;
    sustainabilityRatio: number;
    maxInstallment: number;
    maxNewMortgageAllowed: number;
}

export function DtiAnalysis({
    mortgagePayment, loanAmount, totalMonthlyDebt,
    calculatedExistingInstallment, sustainabilityRatio,
    maxInstallment, maxNewMortgageAllowed
}: DtiAnalysisProps) {
    return (
        <div className="space-y-10">
            <div className="grid grid-cols-2 gap-8 divide-x divide-slate-100">
                <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest">Rata Fissa Nuovo Mutuo</div>
                    <div className="text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">{formatEuro(mortgagePayment)}</div>
                    <div className="text-sm font-medium text-slate-500 mt-2">
                        Importo Mutuo: {formatEuro(loanAmount)}
                    </div>
                </div>
                <div className="space-y-3 pl-8">
                    <div className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest">Debiti Mensili Totali</div>
                    <div className="text-5xl font-bold tracking-tight text-red-500 tabular-nums">{formatEuro(totalMonthlyDebt)}</div>
                    <div className="text-sm font-medium text-slate-500 mt-2">
                        Include {formatEuro(calculatedExistingInstallment)} di prestiti pre-esistenti.
                    </div>
                </div>
            </div>

            <div className={`p-8 rounded-3xl border border-slate-200 shadow-md transition-colors ${sustainabilityRatio > 33 ? 'bg-red-50/80' : 'bg-emerald-50 dark:bg-emerald-950/50/80'}`}>
                <div className="flex justify-between items-end mb-4">
                    <div className="font-bold text-lg text-slate-800 dark:text-slate-200 flex items-center">
                        Indice Rata/Reddito Globale
                    </div>
                    <div className={`text-4xl font-extrabold ${sustainabilityRatio > 33 ? 'text-red-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {sustainabilityRatio.toFixed(1)}%
                    </div>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-4 rounded-full overflow-hidden mb-2">
                    <div
                        className={`h-full transition-all duration-700 ease-out ${sustainabilityRatio > 33 ? 'bg-red-500' : 'bg-emerald-50 dark:bg-emerald-950/500'}`}
                        style={{ width: `${Math.min(sustainabilityRatio, 100)}%` }}
                    />
                </div>

                <div className="flex justify-between text-sm font-medium text-slate-600 dark:text-slate-400 border-t border-slate-200 mt-6 pt-4">
                    <span>Soglia Max Banca (33%): <strong className="text-slate-900 dark:text-slate-100">{formatEuro(maxInstallment)}</strong></span>
                    <span>Spazio Resìduo per Mutuo: <strong className={`font-bold ${maxNewMortgageAllowed < mortgagePayment ? 'text-red-500' : 'text-emerald-500'}`}>{formatEuro(maxNewMortgageAllowed)}</strong></span>
                </div>

                <p className={`text-sm md:text-base mt-4 font-medium leading-relaxed ${sustainabilityRatio > 33 ? 'text-red-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {sustainabilityRatio <= 33
                        ? "Eccellente. I tuoi debiti combinati rientrano comodamente nei parametri. Questo nuovo mutuo ha alte probabilità di essere approvato."
                        : "Attenzione Rischio Sofferenza. Sommando i prestiti pregressi, superi la soglia del 33%. La banca potrebbe chiederti garanzie o un anticipo maggiore per concedere l\u0027ipoteca."}
                </p>
            </div>
        </div>
    );
}
