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
        <div className="space-y-10">
            <div className="grid grid-cols-3 gap-6">
                <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 flex flex-col items-center justify-center text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Yield Lordo</div>
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{grossYield.toFixed(2)}%</div>
                </div>
                <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 flex flex-col items-center justify-center text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Yield Netto Reale</div>
                    <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{netYield.toFixed(2)}%</div>
                </div>
                <div className={`p-5 rounded-2xl border flex flex-col items-center justify-center text-center bg-white/70 dark:bg-slate-900/70 ${cashflow >= 0 ? 'border-emerald-200 dark:border-emerald-900' : 'border-red-200'}`}>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Cashflow Mensile</div>
                    <div className={`text-3xl font-extrabold ${cashflow >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {cashflow >= 0 ? '+' : ''}{formatEuro(cashflow)}
                    </div>
                    <div className="text-[9px] font-medium mt-1 leading-tight text-slate-500 px-2 line-clamp-2">Extra ricavo dopo aver pagato tutte le spese e Rata!</div>
                </div>
            </div>

            <div className="space-y-6 pt-4 border-t border-slate-200">
                <h4 className="font-extrabold text-xl text-slate-900 dark:text-slate-100 pb-1">
                    Profittabilità Reale: Totale Cumulato su {years} Anni
                </h4>

                <div className={`p-6 rounded-3xl border border-slate-200 shadow-md ${pureRealEstateProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/50/50' : 'bg-red-50/50'}`}>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600 dark:text-slate-400">Affitti Netti Stimati (con {rentInflation}% inflazione e {vacancyRate}% sfitto):</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">+{formatEuro(totalRentCollected)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
                            <span className="text-slate-600 dark:text-slate-400">Capitale Iniziale (Anticipo + Tasse + Notaio + Agenzia):</span>
                            <span className="font-bold text-red-500">-{formatEuro(totalCashNeeded)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600 dark:text-slate-400">Interessi Totali Pagati alla Banca:</span>
                            <span className="font-bold text-red-500">-{formatEuro(totalInterestPaid)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
                            <span className="text-slate-600 dark:text-slate-400">Manutenzione Straordinaria (Extra):</span>
                            <span className="font-bold text-red-500">-{formatEuro(extraMaintenance)}</span>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100">Guadagno/Perdita Cash Cumulata:</span>
                            <span className={`text-3xl font-extrabold tracking-tight ${pureRealEstateProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {pureRealEstateProfit >= 0 ? '+' : ''}{formatEuro(pureRealEstateProfit)}
                            </span>
                        </div>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-6 leading-relaxed font-medium">
                        {pureRealEstateProfit >= 0
                            ? `Positivo! L\u0027affitto cumulato nei ${years} anni ripagherà interamente l\u0027anticipo versato, tutti i costi iniziali (tasse/agenzia/notaio), le spese impreviste e tutti gli interessi del mutuo. Inoltre, manterrai un surplus cash di ${formatEuro(pureRealEstateProfit)} e possiederai l\u0027immobile al 100%.`
                            : `Attenzione: gli affitti cumulati nei ${years} anni NON bastano a coprire interamente l\u0027esborso iniziale (anticipo + tasse/agenzia), la manutenzione extra e la valanga di interessi bancari. Sei "sotto" di ${formatEuro(Math.abs(pureRealEstateProfit))}. Guadagnerai solo se l\u0027immobile si rivaluterà di almeno questa cifra.`}
                    </p>
                </div>
            </div>

            <div className="space-y-6 pt-4 border-t border-slate-200">
                <h4 className="font-extrabold text-xl text-slate-900 dark:text-slate-100 pb-1">
                    Costo Opportunità Finale (Tra {years} Anni)
                </h4>

                <div className="space-y-4">
                    <div className="relative p-6 bg-white border border-slate-200 rounded-3xl shadow-md">
                        <div className="text-sm font-bold text-slate-500 mb-2">Scenario A: Immobili (L&apos;immobile ti resta pagato a vita)</div>
                        <div className="text-4xl font-extrabold text-slate-900 dark:text-slate-100">{formatEuro(propertyFutureValue)}</div>
                        <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                            Valore stimato a fine ciclo (+2% inflazione/anno medio nel tempo). Non conta le entrate bonus da cashflow accumulato se le hai spese.
                        </p>
                    </div>

                    <div className="flex justify-center -my-3 relative z-10">
                        <div className="bg-white text-slate-900 dark:text-slate-100 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest border border-slate-200 shadow-sm">Contro</div>
                    </div>

                    <div className="relative p-6 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-900 rounded-3xl shadow-[0_8px_30px_rgba(168,85,247,0.1)]">
                        <div className="text-sm font-bold text-purple-600 dark:text-purple-400 mb-2">Scenario B: Compounding nel Mercato Azionario ({marketReturn}%)</div>
                        <div className="text-4xl font-extrabold text-purple-600 dark:text-purple-400">{formatEuro(investFutureValue)}</div>
                        <p className="text-xs text-purple-400 font-medium mt-3 leading-relaxed">
                            Hai preso i <strong className="font-bold underline text-purple-700 dark:text-purple-300">{formatEuro(totalCashNeeded)}</strong> (che avresti speso in tasse, agenzie e anticipo) e li hai messi in un ETF/Azionario al {marketReturn}% per {years} anni, in santa pace, pagando l&apos;affitto mensilmente come sempre.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
