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
            <div className="lg:sticky lg:top-8">
                <div className="rounded-3xl border border-slate-200/80 bg-white/75 p-8 text-center shadow-md backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75 sm:p-12">
                    <ShieldCheck className="mx-auto mb-6 h-16 w-16 text-slate-300 dark:text-slate-600" />
                    <h3 className="mb-3 text-xl font-bold text-slate-400 dark:text-slate-500">Configura il tuo acquisto</h3>
                    <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-400 dark:text-slate-500">
                        Compila i dettagli a sinistra e premi &quot;Analizza Acquisto&quot; per ricevere un&apos;analisi professionale completa con consigli personalizzati.
                    </p>
                    <div className="mt-8 flex justify-center">
                        <ArrowRight className="h-6 w-6 rotate-180 text-slate-300 animate-pulse dark:text-slate-600 lg:rotate-0" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in slide-in-from-right-5 duration-500 lg:sticky lg:top-8">
            <div className="rounded-3xl border border-slate-200/80 bg-white/75 p-6 text-center shadow-md backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75 sm:p-8">
                <div className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Valutazione Complessiva</div>
                <div className={`mb-2 text-6xl font-extrabold sm:text-7xl ${scoreColor}`}>{overallScore}</div>
                <div className={`mb-4 text-lg font-bold ${scoreColor}`}>{scoreLabel}</div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div className={`h-full ${progressColor} transition-all duration-700`} style={{ width: `${overallScore}%` }} />
                </div>
                {itemName && (
                    <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                        Analisi per: <span className="font-bold text-slate-900 dark:text-slate-100">{itemName}</span>
                    </p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {isFinanced && (
                    <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 text-center shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Rata Mensile</div>
                        <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{formatEuro(calculations.monthlyPayment)}</div>
                    </div>
                )}
                {isFinanced && (
                    <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 text-center shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Interessi Totali</div>
                        <div className="text-2xl font-extrabold text-red-500">{formatEuro(calculations.totalInterest)}</div>
                    </div>
                )}
                <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 text-center shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Costo Totale (TCO)</div>
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{formatEuro(calculations.totalTCO)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 text-center shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Valore Residuo</div>
                    <div className="text-2xl font-extrabold text-emerald-500">{formatEuro(calculations.residualValue)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 text-center shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Costo Netto Reale</div>
                    <div className={`text-2xl font-extrabold ${calculations.netRealCost > 0 ? "text-red-500" : "text-emerald-500"}`}>{formatEuro(calculations.netRealCost)}</div>
                </div>
                {hasUser && (
                    <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 text-center shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Liquidita Residua</div>
                        <div className={`text-2xl font-extrabold ${calculations.liquidityAfter >= 0 ? "text-blue-500" : "text-red-500"}`}>{formatEuro(calculations.liquidityAfter)}</div>
                    </div>
                )}
            </div>

            <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                    <Lightbulb className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> Analisi e Consigli del Consulente
                </h3>
                {advices.map((advice, i) => {
                    const bgColor = advice.type === "danger" ? "border-red-200 bg-red-50/80 dark:border-red-900 dark:bg-red-950/30"
                        : advice.type === "warning" ? "border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30"
                            : advice.type === "success" ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30"
                                : "border-blue-200 bg-blue-50/80 dark:border-blue-900 dark:bg-blue-950/30";
                    return (
                        <div key={i} className={`animate-in fade-in-50 rounded-2xl border p-4 duration-300 sm:p-5 ${bgColor}`} style={{ animationDelay: `${i * 80}ms` }}>
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 shrink-0">{advice.icon}</div>
                                <div>
                                    <div className="mb-1 text-sm font-bold text-slate-900 dark:text-slate-100">{advice.title}</div>
                                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{advice.message}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {hasUser && onAcceptPurchase && (
                <div className="rounded-3xl border border-slate-200/80 bg-white/75 p-5 text-center shadow-md backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75 sm:p-6">
                    {isAlreadyAccepted ? (
                        <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="h-5 w-5" />
                            <span className="text-sm font-bold">Acquisto gia accettato</span>
                        </div>
                    ) : (
                        <>
                            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                Accettando, il finanziamento verra aggiunto ai tuoi prestiti e l&apos;impatto sara visibile in Patrimonio e FIRE.
                            </p>
                            <Button
                                onClick={onAcceptPurchase}
                                disabled={isAccepting}
                                className="mt-3 h-12 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 font-bold text-white hover:from-indigo-700 hover:to-violet-700"
                            >
                                {isAccepting ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvataggio...</>
                                ) : (
                                    <><CheckCircle className="mr-2 h-4 w-4" /> Accetta Spesa</>
                                )}
                            </Button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
});
