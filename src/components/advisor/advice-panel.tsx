"use client";

import { memo } from "react";
import { ShieldCheck, ArrowRight, Lightbulb, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatEuro } from "@/lib/format";
import type { Advice } from "@/types";

interface AdvicePanelProps {
    showResults: boolean;
    itemName: string;
    isFinanced: boolean;
    overallScore: number;
    calculations: {
        monthlyPayment: number;
        totalInterest: number;
        totalTCO: number;
        residualValue: number;
        netRealCost: number;
        liquidityAfter: number;
    };
    advices: Advice[];
    hasUser: boolean;
    onAcceptPurchase?: () => void;
    isAccepting?: boolean;
    isAlreadyAccepted?: boolean;
}

export const AdvicePanel = memo(function AdvicePanel({
    showResults, itemName, isFinanced, overallScore, calculations, advices, hasUser,
    onAcceptPurchase, isAccepting, isAlreadyAccepted,
}: AdvicePanelProps) {
    const scoreColor = overallScore >= 70 ? "text-emerald-500" : overallScore >= 40 ? "text-amber-500" : "text-red-500";
    const scoreLabel = overallScore >= 70 ? "Buona" : overallScore >= 40 ? "Attenzione" : "Critica";
    const progressColor = overallScore >= 70 ? "bg-emerald-500" : overallScore >= 40 ? "bg-amber-500" : "bg-red-500";

    if (!showResults) {
        return (
            <div className="sticky top-8">
                <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 p-12 rounded-3xl shadow-md text-center">
                    <ShieldCheck className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-6" />
                    <h3 className="text-xl font-bold text-slate-400 dark:text-slate-500 mb-3">Configura il tuo acquisto</h3>
                    <p className="text-sm text-slate-400 dark:text-slate-500 max-w-md mx-auto leading-relaxed">
                        Compila i dettagli a sinistra e premi &quot;Analizza Acquisto&quot; per ricevere un&apos;analisi professionale completa con consigli personalizzati.
                    </p>
                    <div className="flex justify-center mt-8">
                        <ArrowRight className="w-6 h-6 text-slate-300 dark:text-slate-600 rotate-180 lg:rotate-0 animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="sticky top-8 space-y-6 animate-in slide-in-from-right-5 duration-500">
            {/* Score */}
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 p-8 rounded-3xl shadow-md text-center">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Valutazione Complessiva</div>
                <div className={`text-7xl font-extrabold ${scoreColor} mb-2`}>{overallScore}</div>
                <div className={`text-lg font-bold ${scoreColor} mb-4`}>{scoreLabel}</div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                    <div className={`h-full ${progressColor} transition-all duration-700`} style={{ width: `${overallScore}%` }} />
                </div>
                {itemName && (
                    <p className="text-sm text-slate-500 mt-4 font-medium">
                        Analisi per: <span className="text-slate-900 dark:text-slate-100 font-bold">{itemName}</span>
                    </p>
                )}
            </div>

            {/* Summary Numbers */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {isFinanced && (
                    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-center">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Rata Mensile</div>
                        <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{formatEuro(calculations.monthlyPayment)}</div>
                    </div>
                )}
                {isFinanced && (
                    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-center">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Interessi Totali</div>
                        <div className="text-2xl font-extrabold text-red-500">{formatEuro(calculations.totalInterest)}</div>
                    </div>
                )}
                <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Costo Totale (TCO)</div>
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{formatEuro(calculations.totalTCO)}</div>
                </div>
                <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Valore Residuo</div>
                    <div className="text-2xl font-extrabold text-emerald-500">{formatEuro(calculations.residualValue)}</div>
                </div>
                <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Costo Netto Reale</div>
                    <div className={`text-2xl font-extrabold ${calculations.netRealCost > 0 ? "text-red-500" : "text-emerald-500"}`}>{formatEuro(calculations.netRealCost)}</div>
                </div>
                {hasUser && (
                    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-center">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Liquidita Residua</div>
                        <div className={`text-2xl font-extrabold ${calculations.liquidityAfter >= 0 ? "text-blue-500" : "text-red-500"}`}>{formatEuro(calculations.liquidityAfter)}</div>
                    </div>
                )}
            </div>

            {/* Advices */}
            <div className="space-y-3">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Analisi e Consigli del Consulente
                </h3>
                {advices.map((advice, i) => {
                    const bgColor = advice.type === "danger" ? "bg-red-50/80 dark:bg-red-950/30 border-red-200 dark:border-red-900"
                        : advice.type === "warning" ? "bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900"
                        : advice.type === "success" ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900"
                        : "bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900";
                    return (
                        <div key={i} className={`p-5 rounded-2xl border ${bgColor} animate-in fade-in-50 duration-300`} style={{ animationDelay: `${i * 80}ms` }}>
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 shrink-0">{advice.icon}</div>
                                <div>
                                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-1">{advice.title}</div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{advice.message}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Bottone Accetta Spesa */}
            {hasUser && onAcceptPurchase && (
                <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 p-6 rounded-3xl shadow-md text-center space-y-3">
                    {isAlreadyAccepted ? (
                        <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-bold text-sm">Acquisto gia accettato</span>
                        </div>
                    ) : (
                        <>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Accettando, il finanziamento verra aggiunto ai tuoi prestiti e l&apos;impatto sara visibile in Patrimonio e FIRE.
                            </p>
                            <Button
                                onClick={onAcceptPurchase}
                                disabled={isAccepting}
                                className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-3"
                            >
                                {isAccepting ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvataggio...</>
                                ) : (
                                    <><CheckCircle className="w-4 h-4 mr-2" /> Accetta Spesa</>
                                )}
                            </Button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
});
