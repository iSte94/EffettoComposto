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
        <div className="space-y-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:divide-x sm:divide-slate-100 dark:sm:divide-slate-800">
                <div className="space-y-3">
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-400">Rata Fissa Nuovo Mutuo</div>
                    <div className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums sm:text-5xl">{formatEuro(mortgagePayment)}</div>
                    <div className="text-sm font-medium text-slate-500">Importo Mutuo: {formatEuro(loanAmount)}</div>
                </div>
                <div className="space-y-3 sm:pl-8">
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-400">Debiti Mensili Totali</div>
                    <div className="text-4xl font-bold tracking-tight text-red-500 tabular-nums sm:text-5xl">{formatEuro(totalMonthlyDebt)}</div>
                    <div className="text-sm font-medium text-slate-500">Include {formatEuro(calculatedExistingInstallment)} di prestiti pre-esistenti.</div>
                </div>
            </div>

            <div className={`rounded-3xl border border-slate-200 p-5 shadow-md transition-colors sm:p-8 ${sustainabilityRatio > 33 ? "bg-red-50/90 dark:bg-red-950/30" : "bg-emerald-50/90 dark:bg-emerald-950/50"}`}>
                <div className="mb-4 flex items-end justify-between gap-4">
                    <div className="text-lg font-bold text-slate-800 dark:text-slate-200">Indice Rata/Reddito Globale</div>
                    <div className={`text-4xl font-extrabold ${sustainabilityRatio > 33 ? "text-red-600" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {sustainabilityRatio.toFixed(1)}%
                    </div>
                </div>
                <div className="mb-2 h-4 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                        className={`h-full transition-all duration-700 ease-out ${sustainabilityRatio > 33 ? "bg-red-500" : "bg-emerald-500"}`}
                        style={{ width: `${Math.min(sustainabilityRatio, 100)}%` }}
                    />
                </div>

                <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 text-sm font-medium text-slate-600 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                    <span>Soglia Max Banca (33%): <strong className="text-slate-900 dark:text-slate-100">{formatEuro(maxInstallment)}</strong></span>
                    <span>Spazio Residuo per Mutuo: <strong className={`font-bold ${maxNewMortgageAllowed < mortgagePayment ? "text-red-500" : "text-emerald-500"}`}>{formatEuro(maxNewMortgageAllowed)}</strong></span>
                </div>

                <p className={`mt-4 text-sm font-medium leading-relaxed sm:text-base ${sustainabilityRatio > 33 ? "text-red-600" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {sustainabilityRatio <= 33
                        ? "Eccellente. I tuoi debiti combinati rientrano comodamente nei parametri. Questo nuovo mutuo ha alte probabilita di essere approvato."
                        : "Attenzione Rischio Sofferenza. Sommando i prestiti pregressi, superi la soglia del 33%. La banca potrebbe chiederti garanzie o un anticipo maggiore per concedere l'ipoteca."}
                </p>
            </div>
        </div>
    );
}
