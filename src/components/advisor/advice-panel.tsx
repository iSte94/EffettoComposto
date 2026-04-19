"use client";

import { memo } from "react";
import { ShieldCheck, ArrowRight, Lightbulb, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
        cashOutlay: number;
        dtiPostPurchase: number;
        emergencyMonthsLeft: number;
        fireDelayMonthsValue: number;
        hasFireImpact: boolean;
        tcoYears: number;
    };
    advices: Advice[];
    hasUser: boolean;
    onAcceptPurchase?: () => void;
    isAccepting?: boolean;
    isAlreadyAccepted?: boolean;
}

function getLeadSentence(message: string): string {
    const trimmed = message.trim();
    const match = trimmed.match(/^[^.?!]+[.?!]/);
    return match?.[0] ?? trimmed;
}

function formatFireDelayShort(delay: number): string {
    if (!Number.isFinite(delay)) {
        return delay > 0 ? "non raggiungibile" : "raggiungibile";
    }
    if (Math.abs(delay) < 1) return "impatto minimo";
    const roundedDelay = Math.round(delay);
    const absDelay = Math.abs(roundedDelay);
    const years = Math.floor(absDelay / 12);
    const months = absDelay % 12;
    const parts = [
        years > 0 ? `${years}a` : null,
        months > 0 ? `${months}m` : null,
    ].filter(Boolean);
    return `${roundedDelay > 0 ? "+" : "-"}${parts.join(" ")}`;
}

function getToneClasses(type: Advice["type"]) {
    if (type === "danger") {
        return {
            card: "border-red-200 bg-red-50/80 dark:border-red-900 dark:bg-red-950/30",
            badge: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
            text: "text-red-600 dark:text-red-400",
        };
    }
    if (type === "warning") {
        return {
            card: "border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30",
            badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
            text: "text-amber-600 dark:text-amber-400",
        };
    }
    if (type === "success") {
        return {
            card: "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30",
            badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
            text: "text-emerald-600 dark:text-emerald-400",
        };
    }
    return {
        card: "border-blue-200 bg-blue-50/80 dark:border-blue-900 dark:bg-blue-950/30",
        badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
        text: "text-blue-600 dark:text-blue-400",
    };
}

function AdviceCard({ advice, compact = false }: { advice: Advice; compact?: boolean }) {
    const tone = getToneClasses(advice.type);
    return (
        <div className={`rounded-2xl border p-4 sm:p-5 ${tone.card}`}>
            <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{advice.icon}</div>
                <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${tone.badge}`}>
                            {advice.type === "danger" ? "Critico" : advice.type === "warning" ? "Attenzione" : advice.type === "success" ? "Punto forte" : "Contesto"}
                        </span>
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{advice.title}</div>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                        {compact ? getLeadSentence(advice.message) : advice.message}
                    </p>
                </div>
            </div>
        </div>
    );
}

export const AdvicePanel = memo(function AdvicePanel({
    showResults, itemName, isFinanced, overallScore, calculations, advices, hasUser,
    onAcceptPurchase, isAccepting, isAlreadyAccepted,
}: AdvicePanelProps) {
    const scoreColor = overallScore >= 70 ? "text-emerald-500" : overallScore >= 40 ? "text-amber-500" : "text-red-500";
    const scoreLabel = overallScore >= 70 ? "Buona" : overallScore >= 40 ? "Attenzione" : "Critica";
    const verdictAdvice = advices.find((advice) => advice.title.startsWith("Verdetto:"));
    const detailAdvices = verdictAdvice ? advices.filter((advice) => advice !== verdictAdvice) : advices;
    const criticalAdvices = detailAdvices.filter((advice) => advice.type === "danger" || advice.type === "warning");
    const strengths = detailAdvices.filter((advice) => advice.type === "success");
    const context = detailAdvices.filter((advice) => advice.type === "info");
    const summaryAdvices = [...criticalAdvices, ...strengths, ...context].slice(0, 4);
    const verdictTone = getToneClasses(verdictAdvice?.type ?? (overallScore >= 70 ? "success" : overallScore >= 40 ? "warning" : "danger"));
    const dtiTone = calculations.dtiPostPurchase > 33
        ? "text-red-600 dark:text-red-400"
        : calculations.dtiPostPurchase > 20
            ? "text-amber-600 dark:text-amber-400"
            : "text-emerald-600 dark:text-emerald-400";
    const liquidityTone = calculations.liquidityAfter >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400";
    const fireTone = !calculations.hasFireImpact
        ? "text-slate-500 dark:text-slate-400"
        : calculations.fireDelayMonthsValue > 12
            ? "text-red-600 dark:text-red-400"
            : calculations.fireDelayMonthsValue > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400";
    const metricCards = hasUser
        ? [
            {
                label: "Esborso oggi",
                value: formatEuro(calculations.cashOutlay),
                note: isFinanced ? "anticipo iniziale" : "pagamento unico",
                valueClassName: "text-slate-900 dark:text-slate-100",
            },
            {
                label: isFinanced ? "Rata mensile" : "Liquidita dopo",
                value: isFinanced ? `${formatEuro(calculations.monthlyPayment)}/mese` : formatEuro(calculations.liquidityAfter),
                note: isFinanced ? `DTI ${calculations.dtiPostPurchase.toFixed(1)}%` : `${calculations.emergencyMonthsLeft.toFixed(1)} mesi di copertura`,
                valueClassName: isFinanced ? dtiTone : liquidityTone,
            },
            {
                label: "Costo totale",
                value: formatEuro(calculations.totalTCO),
                note: `orizzonte ${calculations.tcoYears} anni`,
                valueClassName: "text-slate-900 dark:text-slate-100",
            },
            {
                label: "Impatto FIRE",
                value: calculations.hasFireImpact ? formatFireDelayShort(calculations.fireDelayMonthsValue) : "n.d.",
                note: calculations.hasFireImpact ? "spostamento stimato" : "richiede profilo FIRE",
                valueClassName: fireTone,
            },
        ]
        : [
            {
                label: "Esborso oggi",
                value: formatEuro(calculations.cashOutlay),
                note: isFinanced ? "anticipo iniziale" : "pagamento unico",
                valueClassName: "text-slate-900 dark:text-slate-100",
            },
            {
                label: isFinanced ? "Rata mensile" : "Valore residuo",
                value: isFinanced ? `${formatEuro(calculations.monthlyPayment)}/mese` : formatEuro(calculations.residualValue),
                note: isFinanced ? "stima del finanziamento" : "stima a fine orizzonte",
                valueClassName: isFinanced ? "text-slate-900 dark:text-slate-100" : "text-emerald-600 dark:text-emerald-400",
            },
            {
                label: "Costo totale",
                value: formatEuro(calculations.totalTCO),
                note: `orizzonte ${calculations.tcoYears} anni`,
                valueClassName: "text-slate-900 dark:text-slate-100",
            },
            {
                label: "Costo netto reale",
                value: formatEuro(calculations.netRealCost),
                note: "solo numeri dell'acquisto",
                valueClassName: calculations.netRealCost > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400",
            },
        ];
    const quickFacts = hasUser
        ? [
            {
                label: isFinanced ? "DTI post-acquisto" : "Copertura residua",
                value: isFinanced ? `${calculations.dtiPostPurchase.toFixed(1)}%` : `${calculations.emergencyMonthsLeft.toFixed(1)} mesi`,
                className: isFinanced ? dtiTone : liquidityTone,
            },
            {
                label: "Valore residuo",
                value: formatEuro(calculations.residualValue),
                className: "text-emerald-600 dark:text-emerald-400",
            },
            {
                label: "Costo netto reale",
                value: formatEuro(calculations.netRealCost),
                className: calculations.netRealCost > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400",
            },
        ]
        : [
            {
                label: "Interessi totali",
                value: isFinanced ? formatEuro(calculations.totalInterest) : formatEuro(0),
                className: isFinanced ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400",
            },
            {
                label: "Valore residuo",
                value: formatEuro(calculations.residualValue),
                className: "text-emerald-600 dark:text-emerald-400",
            },
            {
                label: "Analisi personale",
                value: "Accedi per DTI, liquidita e FIRE",
                className: "text-indigo-600 dark:text-indigo-400",
            },
        ];

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
            <div className={`rounded-3xl border bg-white/80 p-5 shadow-md backdrop-blur-xl dark:bg-slate-900/80 sm:p-6 ${verdictTone.card}`}>
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1 space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${verdictTone.badge}`}>
                                {verdictAdvice?.title.replace("Verdetto: ", "") ?? `Valutazione ${scoreLabel}`}
                            </span>
                            <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm dark:bg-slate-800/80 dark:text-slate-300">
                                Score {overallScore}/100
                            </span>
                            <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm dark:bg-slate-800/80 dark:text-slate-300">
                                {isFinanced ? "Con finanziamento" : "Pagamento diretto"}
                            </span>
                        </div>

                        <div>
                            <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                                {itemName ? itemName : "La tua simulazione"}
                            </h3>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                                {verdictAdvice ? verdictAdvice.message : "Ecco la lettura sintetica del consulente: prima il verdetto, poi i rischi e infine gli approfondimenti."}
                            </p>
                        </div>

                        <div className="max-w-md space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                <span>Valutazione complessiva</span>
                                <span className={scoreColor}>{scoreLabel}</span>
                            </div>
                            <Progress value={overallScore} className="h-3 bg-white/80 dark:bg-slate-800/70" />
                        </div>

                        {summaryAdvices.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                    Cosa guardare subito
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {summaryAdvices.map((advice) => {
                                        const tone = getToneClasses(advice.type);
                                        return (
                                            <span
                                                key={`${advice.type}-${advice.title}`}
                                                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${tone.badge}`}
                                            >
                                                {advice.title}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:w-[23rem]">
                        {metricCards.map((metric) => (
                            <div key={metric.label} className="rounded-2xl border border-white/70 bg-white/85 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950/40">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                    {metric.label}
                                </div>
                                <div className={`mt-1 text-2xl font-extrabold ${metric.valueClassName}`}>
                                    {metric.value}
                                </div>
                                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                    {metric.note}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {quickFacts.map((fact) => (
                        <div key={fact.label} className="rounded-2xl border border-white/70 bg-white/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-950/30">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                {fact.label}
                            </div>
                            <div className={`mt-1 text-sm font-bold ${fact.className}`}>{fact.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white/75 p-4 shadow-md backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75 sm:p-5">
                <div className="mb-4 flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Analisi guidata</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Parti dalla sintesi, poi apri solo le sezioni che ti servono.
                        </p>
                    </div>
                </div>

                <Tabs defaultValue={criticalAdvices.length > 0 ? "criticita" : "sintesi"} className="gap-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="sintesi">Sintesi</TabsTrigger>
                        <TabsTrigger value="criticita">
                            Criticita{criticalAdvices.length > 0 ? ` (${criticalAdvices.length})` : ""}
                        </TabsTrigger>
                        <TabsTrigger value="approfondimenti">Approfondimenti</TabsTrigger>
                    </TabsList>

                    <TabsContent value="sintesi" className="space-y-3">
                        {summaryAdvices.length > 0 ? (
                            summaryAdvices.map((advice) => (
                                <AdviceCard key={`${advice.type}-${advice.title}`} advice={advice} compact />
                            ))
                        ) : (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                                Nessun punto critico emerso: questa simulazione e gia abbastanza lineare da leggere.
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="criticita" className="space-y-3">
                        {criticalAdvices.length > 0 ? (
                            criticalAdvices.map((advice) => (
                                <AdviceCard key={`${advice.type}-${advice.title}`} advice={advice} />
                            ))
                        ) : (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                                Nessuna criticita importante: i principali controlli di sostenibilita risultano in ordine.
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="approfondimenti" className="space-y-3">
                        {[...strengths, ...context].length > 0 ? (
                            [...strengths, ...context].map((advice) => (
                                <AdviceCard key={`${advice.type}-${advice.title}`} advice={advice} />
                            ))
                        ) : (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                                Qui troverai i punti di forza e il contesto aggiuntivo quando disponibili.
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
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
