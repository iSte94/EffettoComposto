"use client";

import { formatEuro } from "@/lib/format";

interface ProfitabilityAnalysisProps {
    grossYield: number;
    netYield: number;
    cashflow: number;
    years: number;
    rentInflation: number;
    vacancyRate: number;
    totalRentCollected: number;
    totalCashNeeded: number;
    totalInterestPaid: number;
    extraMaintenance: number;
    pureRealEstateProfit: number;
    propertyFutureValue: number;
    investFutureValue: number;
    marketReturn: number;
}

export function ProfitabilityAnalysis({
    grossYield, netYield, cashflow, years,
    rentInflation, vacancyRate,
    totalRentCollected, totalCashNeeded, totalInterestPaid, extraMaintenance,
    pureRealEstateProfit,
    propertyFutureValue, investFutureValue, marketReturn
}: ProfitabilityAnalysisProps) {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white/75 p-5 text-center dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Yield Lordo</div>
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{grossYield.toFixed(2)}%</div>
                </div>
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white/75 p-5 text-center dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Yield Netto Reale</div>
                    <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{netYield.toFixed(2)}%</div>
                </div>
                <div className={`flex flex-col items-center justify-center rounded-2xl border p-5 text-center bg-white/75 dark:bg-slate-900/70 ${cashflow >= 0 ? "border-emerald-200 dark:border-emerald-900" : "border-red-200 dark:border-red-900"}`}>
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Cashflow Mensile</div>
                    <div className={`text-3xl font-extrabold ${cashflow >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                        {cashflow >= 0 ? "+" : ""}{formatEuro(cashflow)}
                    </div>
                    <div className="mt-1 px-2 text-[9px] font-medium leading-tight text-slate-500 line-clamp-2">Extra ricavo dopo aver pagato tutte le spese e rata.</div>
                </div>
            </div>

            <div className="space-y-6 border-t border-slate-200 pt-4 dark:border-slate-800">
                <h4 className="pb-1 text-xl font-extrabold text-slate-900 dark:text-slate-100">
                    Profittabilita Reale: Totale Cumulato su {years} Anni
                </h4>

                <div className={`rounded-3xl border border-slate-200 p-5 shadow-md sm:p-6 ${pureRealEstateProfit >= 0 ? "bg-emerald-50/90 dark:bg-emerald-950/50" : "bg-red-50/70 dark:bg-red-950/30"}`}>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Affitti Netti Stimati (con {rentInflation}% inflazione e {vacancyRate}% sfitto):</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">+{formatEuro(totalRentCollected)}</span>
                        </div>
                        <div className="flex flex-col gap-1 border-b border-slate-200 pb-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Capitale Iniziale (Anticipo + Tasse + Notaio + Agenzia):</span>
                            <span className="font-bold text-red-500">-{formatEuro(totalCashNeeded)}</span>
                        </div>
                        <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Interessi Totali Pagati alla Banca:</span>
                            <span className="font-bold text-red-500">-{formatEuro(totalInterestPaid)}</span>
                        </div>
                        <div className="flex flex-col gap-1 border-b border-slate-200 pb-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Manutenzione Straordinaria (Extra):</span>
                            <span className="font-bold text-red-500">-{formatEuro(extraMaintenance)}</span>
                        </div>

                        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
                            <span className="font-bold text-slate-900 dark:text-slate-100">Guadagno/Perdita Cash Cumulata:</span>
                            <span className={`text-3xl font-extrabold tracking-tight ${pureRealEstateProfit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                {pureRealEstateProfit >= 0 ? "+" : ""}{formatEuro(pureRealEstateProfit)}
                            </span>
                        </div>
                    </div>

                    <p className="mt-6 text-sm leading-relaxed font-medium text-slate-600 dark:text-slate-400">
                        {pureRealEstateProfit >= 0
                            ? `Positivo! L'affitto cumulato nei ${years} anni ripagherà interamente l'anticipo versato, tutti i costi iniziali (tasse/agenzia/notaio), le spese impreviste e tutti gli interessi del mutuo. Inoltre, manterrai un surplus cash di ${formatEuro(pureRealEstateProfit)} e possiederai l'immobile al 100%.`
                            : `Attenzione: gli affitti cumulati nei ${years} anni NON bastano a coprire interamente l'esborso iniziale (anticipo + tasse/agenzia), la manutenzione extra e la valanga di interessi bancari. Sei "sotto" di ${formatEuro(Math.abs(pureRealEstateProfit))}. Guadagnerai solo se l'immobile si rivaluterà di almeno questa cifra.`}
                    </p>
                </div>
            </div>

            <div className="space-y-6 border-t border-slate-200 pt-4 dark:border-slate-800">
                <h4 className="pb-1 text-xl font-extrabold text-slate-900 dark:text-slate-100">
                    Costo Opportunita Finale (Tra {years} Anni)
                </h4>

                <div className="space-y-4">
                    <div className="relative rounded-3xl border border-slate-200 bg-white p-5 shadow-md dark:bg-slate-900/70 sm:p-6">
                        <div className="mb-2 text-sm font-bold text-slate-500">Scenario A: Immobili (L&apos;immobile ti resta pagato a vita)</div>
                        <div className="text-4xl font-extrabold text-slate-900 dark:text-slate-100">{formatEuro(propertyFutureValue)}</div>
                        <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                            Valore stimato a fine ciclo (+2% inflazione/anno medio nel tempo). Non conta le entrate bonus da cashflow accumulato se le hai spese.
                        </p>
                    </div>

                    <div className="relative z-10 -my-3 flex justify-center">
                        <div className="rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-bold uppercase tracking-widest text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100">Contro</div>
                    </div>

                    <div className="relative rounded-3xl border border-purple-200 bg-purple-50 p-5 shadow-[0_8px_30px_rgba(168,85,247,0.1)] dark:border-purple-900 dark:bg-purple-950/50 sm:p-6">
                        <div className="mb-2 text-sm font-bold text-purple-600 dark:text-purple-400">Scenario B: Compounding nel Mercato Azionario ({marketReturn}%)</div>
                        <div className="text-4xl font-extrabold text-purple-600 dark:text-purple-400">{formatEuro(investFutureValue)}</div>
                        <p className="mt-3 text-xs leading-relaxed font-medium text-purple-500 dark:text-purple-300">
                            Hai preso i <strong className="font-bold underline text-purple-700 dark:text-purple-300">{formatEuro(totalCashNeeded)}</strong> (che avresti speso in tasse, agenzie e anticipo) e li hai messi in un ETF/Azionario al {marketReturn}% per {years} anni, in santa pace, pagando l&apos;affitto mensilmente come sempre.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
