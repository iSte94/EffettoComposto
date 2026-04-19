"use client";

import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Briefcase, CheckCircle2, Clock, Info, Shield, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { formatEuro } from "@/lib/format";
import {
    buildPassiveIncomeBreakdown,
    computeCoastFireScenarios,
    type CoastFireInput,
    type CoastFireScenarioResult,
    type PassiveIncomeBreakdownEntry,
} from "@/lib/finance/coast-fire";

interface CoastFireScenariosProps {
    input: CoastFireInput;
}

interface ConservativeVariant {
    id: string;
    label: string;
    hint: string;
    value: number;
    deltaFromBase: number;
}

function formatAge(age: number): string {
    const roundedAge = Math.round(age * 10) / 10;
    return Number.isInteger(roundedAge) ? `${roundedAge}` : roundedAge.toFixed(1);
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
    const progress = s.coastFireTarget > 0 ? Math.max(0, Math.min(100, (currentCapital / s.coastFireTarget) * 100)) : 100;

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

function getBaseScenario(result: ReturnType<typeof computeCoastFireScenarios>): CoastFireScenarioResult {
    return result.scenarios.find((scenario) => scenario.scenario === "base") ?? result.scenarios[0];
}

export const CoastFireScenarios = memo(function CoastFireScenarios({ input }: CoastFireScenariosProps) {
    const { result, bestScenario, conservativeVariants, passiveBreakdown, baseScenario } = useMemo(() => {
        const computedResult = computeCoastFireScenarios(input);
        const best = computedResult.scenarios.reduce((currentBest, scenario) =>
            scenario.coastFireTarget < currentBest.coastFireTarget ? scenario : currentBest,
        computedResult.scenarios[0]);
        const baseScenario = getBaseScenario(computedResult);
        const hasPassiveSupport = baseScenario.passiveIncomePresentValue > 0;
        const hasPensionSupport = baseScenario.pensionPresentValue > 0;
        const hasPreRetirementPassiveSupport = (input.passiveIncomeStreams ?? []).some((stream) => stream.startAge < input.retirementAge);
        const breakdown = hasPassiveSupport ? buildPassiveIncomeBreakdown(input, "base") : [];
        const variants: ConservativeVariant[] = [{
            id: "base",
            label: "Base",
            hint: hasPreRetirementPassiveSupport
                ? "Include pensione INPS, rendite future e quota reinvestita prima del FIRE"
                : "Include pensione INPS e rendite future",
            value: baseScenario.coastFireTarget,
            deltaFromBase: 0,
        }];

        if (hasPassiveSupport) {
            const withoutFutureRents = computeCoastFireScenarios({
                ...input,
                monthlyRealEstateIncome: 0,
                passiveIncomeStreams: [],
            });
            const withoutFutureRentsBase = getBaseScenario(withoutFutureRents);

            variants.push({
                id: "without-rents",
                label: hasPensionSupport ? "Prudente" : "Senza affitti",
                hint: hasPensionSupport ? "Ignora gli affitti futuri" : "Esclude le rendite future",
                value: withoutFutureRentsBase.coastFireTarget,
                deltaFromBase: withoutFutureRentsBase.coastFireTarget - baseScenario.coastFireTarget,
            });
        }

        if (hasPensionSupport) {
            const withoutFutureSupports = computeCoastFireScenarios({
                ...input,
                monthlyPublicPension: 0,
                monthlyRealEstateIncome: 0,
                passiveIncomeStreams: [],
            });
            const withoutFutureSupportsBase = getBaseScenario(withoutFutureSupports);

            variants.push({
                id: "without-supports",
                label: hasPassiveSupport ? "Molto prudente" : "Prudente",
                hint: hasPassiveSupport ? "Ignora pensione e affitti futuri" : "Ignora la pensione INPS",
                value: withoutFutureSupportsBase.coastFireTarget,
                deltaFromBase: withoutFutureSupportsBase.coastFireTarget - baseScenario.coastFireTarget,
            });
        }

        return {
            result: computedResult,
            bestScenario: best,
            conservativeVariants: variants,
            passiveBreakdown: breakdown,
            baseScenario,
        };
    }, [input]);

    return (
        <Card className="bg-card/80 backdrop-blur-xl border border-border/70 rounded-3xl overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-muted/40 pb-5 pt-5 sm:pb-6 sm:pt-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                        <CardTitle className="flex items-center text-xl font-bold text-foreground">
                            <Zap className="w-5 h-5 mr-3 text-violet-500" /> Coast FIRE · Scenari di mercato
                        </CardTitle>
                        <CardDescription className="text-sm mt-1">
                            Non e il capitale per andare in pensione subito: e la soglia per smettere di contribuire oggi e arrivare comunque a FIRE a {input.retirementAge} anni, considerando la pensione INPS a {input.publicPensionAge} anni.
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

                {conservativeVariants.length > 1 && (
                    <div className="mt-5 rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                        <div className="flex items-start gap-3">
                            <div className="rounded-xl bg-amber-100 p-2 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                <Shield className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Lettura prudente</p>
                                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                                    Confronta il numero base con una soglia piu prudente, togliendo i supporti futuri che oggi non hai ancora in tasca.
                                </p>
                            </div>
                        </div>

                        <div className={`mt-4 grid gap-3 ${conservativeVariants.length > 2 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                            {conservativeVariants.map((variant) => {
                                const isBase = variant.id === "base";

                                return (
                                    <div
                                        key={variant.id}
                                        className={`rounded-2xl border p-4 ${isBase
                                            ? "border-violet-200/70 bg-violet-50/80 dark:border-violet-900/40 dark:bg-violet-950/30"
                                            : "border-amber-200/70 bg-white/80 dark:border-amber-900/40 dark:bg-slate-950/30"
                                            }`}
                                    >
                                        <div className={`text-[10px] font-extrabold uppercase tracking-[0.22em] ${isBase ? "text-violet-600 dark:text-violet-400" : "text-amber-700 dark:text-amber-300"}`}>
                                            {variant.label}
                                        </div>
                                        <div className={`mt-1 text-2xl font-extrabold tabular-nums ${isBase ? "text-violet-700 dark:text-violet-300" : "text-slate-900 dark:text-slate-100"}`}>
                                            {formatEuro(variant.value)}
                                        </div>
                                        <div className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                                            {variant.hint}
                                        </div>
                                        {!isBase && (
                                            <div className="mt-3 inline-flex rounded-full border border-amber-200/80 bg-amber-100/80 px-2.5 py-1 text-[10px] font-bold text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/30 dark:text-amber-200">
                                                +{formatEuro(variant.deltaFromBase)} vs base
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {passiveBreakdown.length > 0 && (
                    <div className="mt-5 rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Breakdown rendite future</p>
                                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                                    Tutti i valori sono in euro di oggi: l&apos;inflazione e gia incorporata nel rendimento reale dello scenario base ({baseScenario.realReturnPct.toFixed(2)}%).
                                </p>
                            </div>
                            <div className="rounded-full border border-emerald-200/80 bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700 dark:border-emerald-900/40 dark:bg-slate-950/30 dark:text-emerald-300">
                                Scenario Base
                            </div>
                        </div>

                        <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-100/80 bg-white/80 dark:border-emerald-900/30 dark:bg-slate-950/30">
                            <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-emerald-100/80 px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500 dark:border-emerald-900/30 md:grid">
                                <span>Immobile</span>
                                <span>Netto annuo</span>
                                <span>Conta da</span>
                                <span>PV a pensionamento</span>
                                <span>Equivalente oggi</span>
                            </div>

                            <div className="divide-y divide-emerald-100/80 dark:divide-emerald-900/30">
                                {passiveBreakdown.map((entry: PassiveIncomeBreakdownEntry) => (
                                    <div key={`${entry.label}-${entry.startAge}`} className="px-4 py-3">
                                        <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-center">
                                            <div>
                                                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{entry.label}</div>
                                                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                                    {formatAge(entry.durationYears)} anni di rendita conteggiati nel Coast FIRE
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between gap-3 md:block">
                                                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 md:hidden">Netto annuo</span>
                                                <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">{formatEuro(entry.annualAmount)}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-3 md:block">
                                                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 md:hidden">Conta da</span>
                                                <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">{formatAge(entry.startAge)} anni</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-3 md:block">
                                                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 md:hidden">PV a pensionamento</span>
                                                <span className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{formatEuro(entry.presentValueAtRetirement)}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-3 md:block">
                                                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 md:hidden">Equivalente oggi</span>
                                                <span className="text-sm font-bold tabular-nums text-violet-700 dark:text-violet-300">{formatEuro(entry.presentValueToday)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                            Il breakdown mostra solo il supporto post-FIRE. Se una rendita parte prima del pensionamento, la quota destinata al risparmio entra gia nel percorso pre-FIRE secondo le impostazioni del pannello.
                        </p>
                    </div>
                )}

                <div className="mt-5 rounded-2xl bg-muted/40 border border-border/70 p-4 flex items-start gap-3">
                    <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="text-xs text-muted-foreground leading-relaxed">
                        <p>
                            <strong className="text-foreground">Come leggerlo:</strong> non e il capitale per vivere di rendita da oggi. Se il tuo capitale attuale ({formatEuro(input.currentCapital)}) supera il target Coast FIRE di uno scenario, puoi tecnicamente smettere di contribuire e il compound porterà comunque il portafoglio al traguardo FIRE entro {input.retirementAge} anni.
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
