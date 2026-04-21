"use client";

import { memo, useMemo, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Clock, TrendingDown, AlertTriangle, ArrowRight, PiggyBank, Wallet, Target } from "lucide-react";
import {
    ComposedChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    ReferenceLine,
    ReferenceArea,
    ReferenceDot,
} from "recharts";
import { formatEuro } from "@/lib/format";
import { formatDelay } from "@/lib/finance/fire-projection";
import { computeAdvisorFireComparison, getAdvisorOwnershipMonthlyDelta, hasAdvisorFireContext } from "@/lib/finance/advisor-fire";
import type { PurchaseSimulation, FinancialSnapshot } from "@/types";

interface FireImpactChartProps {
    sim: PurchaseSimulation;
    calculations: {
        monthlyPayment: number;
        annualRecurringCosts: number;
        tcoYears: number;
        cashOutlay: number;
    };
    snapshot: FinancialSnapshot;
    plannedAdjustments?: {
        plannedCapitalDeltaByMonth?: number[];
        plannedNetCashflowDeltaByMonth?: number[];
    };
}

interface FireChartPoint {
    year: number;
    age: number;
    senza: number;
    con: number;
    target: number;
    gap: number;
}

function OutcomeCard({
    label,
    ageLabel,
    timingLabel,
    accentClassName,
    borderClassName,
}: {
    label: string;
    ageLabel: string;
    timingLabel: string;
    accentClassName: string;
    borderClassName: string;
}) {
    return (
        <div className={`rounded-3xl border bg-white/8 p-4 backdrop-blur-sm ${borderClassName}`}>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">{label}</div>
            <div className={`mt-2 text-2xl font-extrabold ${accentClassName}`}>{ageLabel}</div>
            <div className="mt-1 text-sm text-white/70">{timingLabel}</div>
        </div>
    );
}

function MetricTile({
    icon,
    label,
    value,
    note,
}: {
    icon: ReactNode;
    label: string;
    value: string;
    note: string;
}) {
    return (
        <div className="rounded-3xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
                {icon}
                <span>{label}</span>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-white">{value}</div>
            <div className="mt-1 text-sm leading-relaxed text-white/70">{note}</div>
        </div>
    );
}

function FireTooltipContent({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: Array<{
        color?: string;
        name?: string;
        value?: number;
        payload?: FireChartPoint;
    }>;
    label?: number;
}) {
    if (!active || !payload?.length) return null;

    const point = payload[0]?.payload;
    if (!point) return null;

    return (
        <div className="rounded-2xl border border-slate-700 bg-slate-950/95 p-3 text-xs text-slate-200 shadow-2xl">
            <div className="mb-2 font-semibold text-slate-50">Eta&apos; {Math.round(Number(label))} anni</div>
            <div className="space-y-1.5">
                {payload.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-slate-300">{entry.name}</span>
                        </div>
                        <span className="font-semibold text-slate-50">{formatEuro(Number(entry.value ?? 0))}</span>
                    </div>
                ))}
            </div>
            <div className="mt-2 border-t border-slate-800 pt-2 text-slate-400">
                Gap tra scenari: <span className="font-semibold text-amber-300">{formatEuro(point.gap)}</span>
            </div>
        </div>
    );
}

export const FireImpactChart = memo(function FireImpactChart({
    sim, calculations, snapshot, plannedAdjustments,
}: FireImpactChartProps) {

    const { baseline, withPurchase, delay, data, hasFireData, isCoastMode, ownershipMonthlyDelta } = useMemo(() => {
        const hasFireData = hasAdvisorFireContext(snapshot);
        const isCoastMode = snapshot.monthlySavings <= 0 && snapshot.fireStartingCapital > 0;
        if (!hasFireData) {
            return {
                baseline: null,
                withPurchase: null,
                delay: 0,
                data: [] as FireChartPoint[],
                hasFireData: false,
                isCoastMode: false,
                ownershipMonthlyDelta: 0,
            };
        }

        const comparison = computeAdvisorFireComparison(snapshot, sim, calculations, plannedAdjustments);
        if (!comparison) {
            return {
                baseline: null,
                withPurchase: null,
                delay: 0,
                data: [] as FireChartPoint[],
                hasFireData: false,
                isCoastMode: false,
                ownershipMonthlyDelta: 0,
            };
        }

        const { baseline, withPurchase, delayMonths: delay } = comparison;
        const ownershipMonthlyDelta = getAdvisorOwnershipMonthlyDelta(sim, calculations);

        const maxLen = Math.max(baseline.chartData.length, withPurchase.chartData.length);
        const data = Array.from({ length: maxLen }, (_, i) => {
            const withoutPoint = baseline.chartData[i];
            const withPoint = withPurchase.chartData[i];
            const senza = withoutPoint ? Math.round(withoutPoint.capital) : 0;
            const con = withPoint ? Math.round(withPoint.capital) : 0;

            return {
                year: withoutPoint?.year ?? withPoint?.year ?? i,
                age: withoutPoint?.age ?? withPoint?.age ?? 0,
                senza,
                con,
                target: withoutPoint?.target ?? withPoint?.target ?? 0,
                gap: Math.max(0, senza - con),
            };
        });
        return { baseline, withPurchase, delay, data, hasFireData: true, isCoastMode, ownershipMonthlyDelta };
    }, [sim, calculations, plannedAdjustments, snapshot]);

    if (!hasFireData || !baseline || !withPurchase) {
        return (
            <Card className="overflow-hidden rounded-2xl border border-amber-200/60 bg-amber-50/60 backdrop-blur-xl dark:border-amber-900/60 dark:bg-amber-950/30">
                <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                        <div>
                            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">Impatto FIRE non calcolabile</h3>
                            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                                Per vedere l&apos;impatto sul tuo FIRE completa i parametri nel tab <strong>FIRE</strong> (anno di nascita, spese attese) e assicurati di avere <strong>almeno capitale investibile o risparmio mensile &gt; 0</strong>.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const delayLabel = formatDelay(delay);
    const delayTextClassName = delay > 12 ? "text-rose-300" : delay > 0 ? "text-amber-300" : "text-emerald-300";
    const delayChipClassName = delay > 12
        ? "bg-rose-500/15 text-rose-100 ring-1 ring-inset ring-rose-400/30"
        : delay > 0
            ? "bg-amber-500/15 text-amber-100 ring-1 ring-inset ring-amber-400/30"
            : "bg-emerald-500/15 text-emerald-100 ring-1 ring-inset ring-emerald-400/30";
    const highlightFill = delay > 0 ? "#f59e0b" : "#10b981";
    const fireAgeBase = baseline.ageAtFire > 0 ? `${baseline.ageAtFire.toFixed(1)} anni` : "non raggiunto";
    const fireAgeWith = withPurchase.ageAtFire > 0 ? `${withPurchase.ageAtFire.toFixed(1)} anni` : "non raggiunto";
    const timingBase = baseline.yearsToFire > 0 ? `fra ${baseline.yearsToFire.toFixed(1)}a` : baseline.alreadyFire ? "gia' raggiunto" : "non raggiunto";
    const timingWith = withPurchase.yearsToFire > 0 ? `fra ${withPurchase.yearsToFire.toFixed(1)}a` : withPurchase.alreadyFire ? "gia' raggiunto" : "non raggiunto";
    const hasDynamicTargetChange = Math.abs(withPurchase.fireTarget - baseline.fireTarget) > 1;
    const hasPlannedAdjustments = Boolean(
        plannedAdjustments?.plannedCapitalDeltaByMonth?.some((value) => value !== 0)
        || plannedAdjustments?.plannedNetCashflowDeltaByMonth?.some((value) => value !== 0),
    );
    const delayNarrative = delay > 0
        ? `Questo acquisto sposta la tua indipendenza da ${fireAgeBase} a ${fireAgeWith}. La fascia evidenziata nel grafico mostra il tempo extra che stai pagando.`
        : delay < 0
            ? `Questo scenario ti avvicina al FIRE: passi da ${fireAgeBase} a ${fireAgeWith}.`
            : "Con i parametri attuali l'impatto sul tuo FIRE e' minimo.";
    const monthlyDragValue = `${formatEuro(Math.abs(ownershipMonthlyDelta))}/m`;
    const monthlyDragNote = ownershipMonthlyDelta >= 0 ? "costo mensile netto che rallenta la corsa" : "cashflow positivo aggiuntivo";

    return (
        <Card className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/80 shadow-lg backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
            <CardContent className="space-y-4 p-4 sm:p-5">
                <div className="relative overflow-hidden rounded-[1.75rem] bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.28),_transparent_40%),linear-gradient(135deg,_#020617_0%,_#0f172a_55%,_#312e81_100%)] p-5 text-white shadow-[0_25px_80px_rgba(15,23,42,0.35)] sm:p-6">
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute -left-20 top-0 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl" />
                        <div className="absolute right-0 top-8 h-48 w-48 rounded-full bg-indigo-400/10 blur-3xl" />
                    </div>

                    <div className="relative space-y-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/75">
                                    <Flame className="h-4 w-4 text-orange-300" />
                                    Impatto sul tuo FIRE
                                </div>
                                <div>
                                    <h3 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                                        Quanto tempo di liberta ti costa davvero questo acquisto
                                    </h3>
                                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                                        {delayNarrative}
                                    </p>
                                </div>
                            </div>

                            <div className={`rounded-3xl px-4 py-3 shadow-lg backdrop-blur-sm ${delayChipClassName}`}>
                                <div className="flex items-start gap-3">
                                    <Clock className={`mt-0.5 h-5 w-5 ${delayTextClassName}`} />
                                    <div>
                                        <div className={`text-3xl font-extrabold leading-none ${delayTextClassName}`}>{delayLabel}</div>
                                        <div className="mt-1 text-[11px] font-medium text-white/70">spostamento FIRE</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-3 xl:grid-cols-[1.1fr_1.1fr_0.9fr]">
                            <OutcomeCard
                                label="Senza acquisto"
                                ageLabel={fireAgeBase}
                                timingLabel={timingBase}
                                accentClassName="text-emerald-300"
                                borderClassName="border-emerald-400/20"
                            />
                            <div className="hidden items-center justify-center xl:flex">
                                <div className="rounded-full bg-white/10 p-3">
                                    <ArrowRight className="h-6 w-6 text-white/70" />
                                </div>
                            </div>
                            <OutcomeCard
                                label="Con acquisto"
                                ageLabel={fireAgeWith}
                                timingLabel={timingWith}
                                accentClassName="text-indigo-300"
                                borderClassName="border-indigo-400/20"
                            />
                        </div>

                        <div className="grid gap-3 lg:grid-cols-3">
                            <MetricTile
                                icon={<Target className="h-3.5 w-3.5 text-amber-300" />}
                                label="Target FIRE"
                                value={formatEuro(baseline.fireTarget)}
                                note={hasDynamicTargetChange ? `con acquisto ${formatEuro(withPurchase.fireTarget)}` : `SWR ${snapshot.fireWithdrawalRate}%`}
                            />
                            <MetricTile
                                icon={<Wallet className="h-3.5 w-3.5 text-blue-300" />}
                                label="Capitale tolto oggi"
                                value={formatEuro(calculations.cashOutlay)}
                                note={sim.isFinanced ? "anticipo che smette di capitalizzare" : "uscita immediata dal capitale FIRE"}
                            />
                            <MetricTile
                                icon={<PiggyBank className="h-3.5 w-3.5 text-rose-300" />}
                                label="Freno mensile"
                                value={monthlyDragValue}
                                note={monthlyDragNote}
                            />
                        </div>

                        <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-4 shadow-inner backdrop-blur-sm">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="text-sm font-bold text-white">Proiezione del capitale</div>
                                    <div className="text-xs text-slate-400">
                                        La distanza fra le curve mostra il capitale che perdi nel tempo rispetto allo scenario senza acquisto.
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 text-[11px]">
                                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-200 ring-1 ring-inset ring-emerald-400/20">
                                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                                        Senza acquisto
                                    </span>
                                    <span className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-indigo-200 ring-1 ring-inset ring-indigo-400/20">
                                        <span className="h-2.5 w-2.5 rounded-full bg-indigo-400" />
                                        Con acquisto
                                    </span>
                                    <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-amber-200 ring-1 ring-inset ring-amber-400/20">
                                        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                                        Target FIRE
                                    </span>
                                </div>
                            </div>

                            <div className="h-[340px] sm:h-[380px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={data} margin={{ top: 18, right: 20, left: -8, bottom: 8 }}>
                                        <defs>
                                            <linearGradient id="gradFireSenza" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                                                <stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
                                            </linearGradient>
                                            <linearGradient id="gradFireCon" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#818cf8" stopOpacity={0.35} />
                                                <stop offset="100%" stopColor="#818cf8" stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>

                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" vertical={false} />

                                        {baseline.yearsToFire > 0 && withPurchase.yearsToFire > 0 && Math.abs(delay) >= 1 && (
                                            <ReferenceArea
                                                x1={Math.min(baseline.ageAtFire, withPurchase.ageAtFire)}
                                                x2={Math.max(baseline.ageAtFire, withPurchase.ageAtFire)}
                                                fill={highlightFill}
                                                fillOpacity={0.08}
                                                strokeOpacity={0}
                                            />
                                        )}

                                        <XAxis
                                            dataKey="age"
                                            tick={{ fontSize: 10, fill: "#cbd5e1" }}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value: number) => `${Math.round(value)}a`}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 10, fill: "#cbd5e1" }}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
                                        />

                                        <Tooltip
                                            content={<FireTooltipContent />}
                                            cursor={{ stroke: "rgba(255,255,255,0.18)", strokeDasharray: "4 4" }}
                                        />

                                        <ReferenceLine
                                            y={baseline.fireTarget}
                                            stroke="#fbbf24"
                                            strokeDasharray="5 5"
                                            label={{ value: "Target base", fontSize: 10, fill: "#fbbf24", position: "insideTopRight" }}
                                        />

                                        {hasDynamicTargetChange && (
                                            <ReferenceLine
                                                y={withPurchase.fireTarget}
                                                stroke="#818cf8"
                                                strokeDasharray="4 5"
                                                label={{ value: "Target con acquisto", fontSize: 10, fill: "#a5b4fc", position: "insideBottomRight" }}
                                            />
                                        )}

                                        <Area
                                            type="monotone"
                                            dataKey="senza"
                                            name="Senza acquisto"
                                            stroke="#34d399"
                                            fill="url(#gradFireSenza)"
                                            strokeWidth={3}
                                            dot={false}
                                            activeDot={{ r: 5, fill: "#34d399", stroke: "#ecfdf5", strokeWidth: 2 }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="con"
                                            name="Con acquisto"
                                            stroke="#818cf8"
                                            fill="url(#gradFireCon)"
                                            strokeWidth={3}
                                            dot={false}
                                            activeDot={{ r: 5, fill: "#818cf8", stroke: "#e0e7ff", strokeWidth: 2 }}
                                        />

                                        {baseline.yearsToFire > 0 && (
                                            <>
                                                <ReferenceLine x={baseline.ageAtFire} stroke="#34d399" strokeDasharray="3 4" />
                                                <ReferenceDot x={baseline.ageAtFire} y={baseline.fireTarget} r={5} fill="#34d399" stroke="#ecfdf5" strokeWidth={2} />
                                            </>
                                        )}

                                        {withPurchase.yearsToFire > 0 && (
                                            <>
                                                <ReferenceLine x={withPurchase.ageAtFire} stroke="#818cf8" strokeDasharray="3 4" />
                                                <ReferenceDot x={withPurchase.ageAtFire} y={withPurchase.fireTarget} r={5} fill="#818cf8" stroke="#e0e7ff" strokeWidth={2} />
                                            </>
                                        )}
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
                    {isCoastMode ? (
                        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
                            <div className="font-bold">Modalita&apos; Coast FIRE</div>
                            <p className="mt-1 leading-relaxed">
                                Il tuo risparmio mensile attuale e&apos; 0, ma il capitale gia&apos; accumulato cresce comunque al rendimento reale. Qui l&apos;acquisto pesa soprattutto perche&apos; riduce il capitale iniziale che lavora per te.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
                            <div className="font-bold text-slate-900 dark:text-slate-100">Motore della proiezione</div>
                            <p className="mt-1 leading-relaxed">
                                Il ritardo deriva da due forze: capitale iniziale sottratto oggi e minore capacita&apos; di accumulo nei prossimi anni.
                            </p>
                        </div>
                    )}

                    <div className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
                        <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                        <span className="leading-relaxed">
                            La proiezione usa i <strong>tuoi parametri FIRE</strong> (rendimento {snapshot.fireExpectedReturn}%, inflazione {snapshot.expectedInflation}%, SWR {snapshot.fireWithdrawalRate}%, risparmio {formatEuro(snapshot.monthlySavings)}/mese). Lo scenario &quot;con acquisto&quot; sottrae l&apos;esborso iniziale dal capitale FIRE, applica la rata{sim.isFinanced ? ` per ${sim.financingYears} anni` : ""} e considera un delta mensile netto di {monthlyDragValue} {ownershipMonthlyDelta >= 0 ? "di costi" : "di cashflow positivo"}{hasPlannedAdjustments ? ". Nel baseline sono gia' inclusi anche gli eventi futuri pianificati." : ""}.
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});
