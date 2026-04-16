"use client";

import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Briefcase, CheckCircle2, Clock, Info, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { formatEuro } from "@/lib/format";
import { computeCoastFireScenarios, type CoastFireInput, type CoastFireScenarioResult } from "@/lib/finance/coast-fire";

interface CoastFireScenariosProps {
    input: CoastFireInput;
}

const SCENARIO_STYLE: Record<string, {
    ring: string;
    bg: string;
    text: string;
    accent: string;
    icon: React.ReactNode;
}> = {
    bear: {
        ring: "border-rose-200/70 dark:border-rose-900/40",
        bg: "bg-rose-50/80 dark:bg-rose-950/30",
        text: "text-rose-600 dark:text-rose-400",
        accent: "text-rose-700 dark:text-rose-300",
        icon: <TrendingDown className="w-4 h-4" />,
    },
    base: {
        ring: "border-violet-200/70 dark:border-violet-900/40",
        bg: "bg-violet-50/80 dark:bg-violet-950/30",
        text: "text-violet-600 dark:text-violet-400",
        accent: "text-violet-700 dark:text-violet-300",
        icon: <Briefcase className="w-4 h-4" />,
    },
    bull: {
        ring: "border-emerald-200/70 dark:border-emerald-900/40",
        bg: "bg-emerald-50/80 dark:bg-emerald-950/30",
        text: "text-emerald-600 dark:text-emerald-400",
        accent: "text-emerald-700 dark:text-emerald-300",
        icon: <TrendingUp className="w-4 h-4" />,
    },
};

function ScenarioCard({ s, currentCapital }: { s: CoastFireScenarioResult; currentCapital: number }) {
    const style = SCENARIO_STYLE[s.scenario];
    const progress = s.coastFireTarget > 0 ? Math.min(100, (currentCapital / s.coastFireTarget) * 100) : 100;

    return (
        <div className={`rounded-3xl border ${style.ring} ${style.bg} p-5 overflow-hidden relative transition-transform hover:-translate-y-0.5`}>
            {s.coastFireReached && (
                <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-emerald-500 text-white px-2 py-0.5 text-[10px] font-extrabold shadow">
                    <CheckCircle2 className="w-3 h-3" /> RAGGIUNTO
                </div>
            )}

            <div className={`flex items-center gap-2 mb-1 text-[10px] font-extrabold uppercase tracking-[0.24em] ${style.text}`}>
                {style.icon} {s.label}
            </div>
            <div className="flex items-baseline gap-2 mb-1">
                <span className={`text-2xl font-extrabold tabular-nums ${style.accent}`}>
                    {formatEuro(s.coastFireTarget)}
                </span>
            </div>
            <div className="text-[11px] text-muted-foreground mb-3">
                Rendimento reale: <span className="font-bold tabular-nums">{s.realReturnPct.toFixed(2)}%</span>
            </div>

            {/* Progress bar */}
            <div className="relative h-2 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden mb-2">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${s.coastFireReached ? 'bg-emerald-500' : 'bg-gradient-to-r from-violet-500 to-pink-500'}`}
                    style={{ width: `${progress}%` }}
                />
            </div>
            <div className="flex justify-between text-[10px] font-bold tabular-nums">
                <span className="text-muted-foreground">{progress.toFixed(0)}%</span>
                {s.coastFireReached ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                        +{formatEuro(s.surplusOrGap)} surplus
                    </span>
                ) : (
                    <span className={style.text}>
                        -{formatEuro(Math.abs(s.surplusOrGap))} gap
                    </span>
                )}
            </div>

            {/* Details */}
            <div className="mt-4 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">FIRE target netto</span>
                    <span className="font-bold tabular-nums">{formatEuro(s.fireTargetNet)}</span>
                </div>
                {s.pensionPresentValue > 0 && (
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">PV Pensione INPS</span>
                        <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                            -{formatEuro(s.pensionPresentValue)}
                        </span>
                    </div>
                )}
                {s.passiveIncomePresentValue > 0 && (
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">PV Rendita immobiliare</span>
                        <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                            -{formatEuro(s.passiveIncomePresentValue)}
                        </span>
                    </div>
                )}
                {!s.coastFireReached && s.yearsToCoastFire != null && (
                    <div className="flex items-center justify-between pt-1.5 border-t border-current/10">
                        <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Tempo al Coast
                        </span>
                        <span className={`font-bold tabular-nums ${style.accent}`}>
                            ~{s.yearsToCoastFire.toFixed(1)} anni
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

export const CoastFireScenarios = memo(function CoastFireScenarios({ input }: CoastFireScenariosProps) {
    const result = useMemo(() => computeCoastFireScenarios(input), [input]);
    const bestScenario = result.scenarios.reduce((best, s) => s.coastFireTarget < best.coastFireTarget ? s : best, result.scenarios[0]);

    return (
        <Card className="bg-card/80 backdrop-blur-xl border border-border/70 rounded-3xl overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-muted/40 pb-5 pt-5 sm:pb-6 sm:pt-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                        <CardTitle className="flex items-center text-xl font-bold text-foreground">
                            <Zap className="w-5 h-5 mr-3 text-violet-500" /> Coast FIRE · Scenari di mercato
                        </CardTitle>
                        <CardDescription className="text-sm mt-1">
                            Quanto capitale serve oggi per smettere di risparmiare e arrivare comunque a FIRE a {input.retirementAge} anni, considerando la pensione INPS a {input.publicPensionAge} anni.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-muted/60 border border-border/70 px-3 py-1.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">FIRE target</span>
                        <span className="text-xs font-extrabold tabular-nums">{formatEuro(result.baseFireTarget)}</span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {result.scenarios.map((s) => (
                        <ScenarioCard key={s.scenario} s={s} currentCapital={input.currentCapital} />
                    ))}
                </div>

                <div className="mt-5 rounded-2xl bg-muted/40 border border-border/70 p-4 flex items-start gap-3">
                    <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="text-xs text-muted-foreground leading-relaxed">
                        <p>
                            <strong className="text-foreground">Come leggerlo:</strong> se il tuo capitale attuale ({formatEuro(input.currentCapital)}) supera il target Coast FIRE di uno scenario, puoi tecnicamente smettere di contribuire e il compound porterà comunque il portafoglio al traguardo FIRE entro {input.retirementAge} anni.
                        </p>
                        {bestScenario && bestScenario.coastFireReached && (
                            <p className="mt-2">
                                <strong className="text-emerald-600 dark:text-emerald-400">Scenario più favorevole raggiunto:</strong> con ipotesi {bestScenario.label}, sei già oltre il punto di non ritorno positivo.
                            </p>
                        )}
                        <p className="mt-2 text-[11px] italic">
                            Valori in euro odierni. I tre scenari variano il rendimento reale di ±2% dalla tua stima base. La pensione è scontata come rendita vitalizia a partire dall&apos;età INPS.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});
