"use client";

import { memo, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Clock, TrendingDown, AlertTriangle } from "lucide-react";
import {
    ComposedChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, ReferenceLine, Legend,
} from "recharts";
import { formatEuro } from "@/lib/format";
import { projectFire, fireDelayMonths, formatDelay, type FireProjectionParams } from "@/lib/finance/fire-projection";
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
}

export const FireImpactChart = memo(function FireImpactChart({
    sim, calculations, snapshot,
}: FireImpactChartProps) {

    const { baseline, withPurchase, delay, data, hasFireData } = useMemo(() => {
        const hasFireData = snapshot.currentAge !== null && snapshot.monthlySavings > 0;
        if (!hasFireData) {
            return {
                baseline: null,
                withPurchase: null,
                delay: 0,
                data: [] as { year: number; age: number; senza: number; con: number; target: number }[],
                hasFireData: false,
            };
        }

        const baseParams: FireProjectionParams = {
            startingCapital: snapshot.liquidAssets + snapshot.emergencyFund,
            monthlySavings: snapshot.monthlySavings,
            monthlyExpensesAtFire: snapshot.expectedMonthlyExpensesAtFire,
            expectedReturnPct: snapshot.fireExpectedReturn,
            inflationPct: snapshot.expectedInflation,
            withdrawalRatePct: snapshot.fireWithdrawalRate,
            currentAge: snapshot.currentAge!,
            retirementAge: snapshot.retirementAge,
        };

        const baseline = projectFire(baseParams);

        // Con acquisto: esborso anticipo + rata * durata finanziamento + costi ricorrenti
        // I costi ricorrenti restano attivi per tutta la vita utile (tcoYears)
        const recurringMonths = sim.isFinanced ? sim.financingYears * 12 : 0;
        const withPurchase = projectFire({
            ...baseParams,
            oneTimeOutflow: calculations.cashOutlay,
            recurringMonthlyCost: sim.isFinanced ? calculations.monthlyPayment : 0,
            recurringMonths,
            ongoingMonthlyCost: calculations.annualRecurringCosts / 12,
            ongoingMonths: calculations.tcoYears * 12,
        });

        const delay = fireDelayMonths(baseline, withPurchase);

        // Merge delle serie per il chart (allineate per anno)
        const maxLen = Math.max(baseline.chartData.length, withPurchase.chartData.length);
        const data = Array.from({ length: maxLen }, (_, i) => {
            const a = baseline.chartData[i];
            const b = withPurchase.chartData[i];
            return {
                year: a?.year ?? b?.year ?? i,
                age: a?.age ?? b?.age ?? 0,
                senza: a ? Math.round(a.capital) : 0,
                con: b ? Math.round(b.capital) : 0,
                target: a?.target ?? b?.target ?? 0,
            };
        });

        return { baseline, withPurchase, delay, data, hasFireData: true };
    }, [sim, calculations, snapshot]);

    if (!hasFireData || !baseline || !withPurchase) {
        return (
            <Card className="overflow-hidden rounded-2xl border border-amber-200/60 bg-amber-50/60 backdrop-blur-xl dark:border-amber-900/60 dark:bg-amber-950/30">
                <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                        <div>
                            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">Impatto FIRE non calcolabile</h3>
                            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                                Per vedere l&apos;impatto sul tuo FIRE completa i parametri nel tab <strong>FIRE</strong> (anno di nascita, spese attese) e assicurati di avere un <strong>risparmio mensile positivo</strong> (reddito &gt; spese).
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const delayLabel = formatDelay(delay);
    const delayColor = delay > 12 ? "text-red-500" : delay > 0 ? "text-amber-500" : "text-emerald-500";
    const delayBg = delay > 12 ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900"
        : delay > 0 ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900"
            : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900";

    const fireAgeBase = baseline.ageAtFire > 0 ? baseline.ageAtFire.toFixed(1) : ">60a";
    const fireAgeWith = withPurchase.ageAtFire > 0 ? withPurchase.ageAtFire.toFixed(1) : ">60a";

    return (
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
            <CardContent className="p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="rounded-xl bg-orange-50 p-2 dark:bg-orange-950/50">
                            <Flame className="h-5 w-5 text-orange-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Impatto sul tuo FIRE</h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Proiezione del capitale con e senza questo acquisto
                            </p>
                        </div>
                    </div>
                    <div className={`rounded-xl border px-3 py-2 ${delayBg}`}>
                        <div className="flex items-center gap-2">
                            <Clock className={`h-4 w-4 ${delayColor}`} />
                            <div>
                                <div className={`text-lg font-extrabold leading-none ${delayColor}`}>{delayLabel}</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">spostamento FIRE</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mini KPI */}
                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">FIRE senza</div>
                        <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{fireAgeBase} anni</div>
                        <div className="text-[10px] text-slate-500">{baseline.yearsToFire > 0 ? `fra ${baseline.yearsToFire.toFixed(1)}a` : "gia' raggiunto"}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">FIRE con</div>
                        <div className="text-base font-bold text-indigo-600 dark:text-indigo-400">{fireAgeWith} anni</div>
                        <div className="text-[10px] text-slate-500">{withPurchase.yearsToFire > 0 ? `fra ${withPurchase.yearsToFire.toFixed(1)}a` : "--"}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Target FIRE</div>
                        <div className="text-base font-bold text-slate-900 dark:text-slate-100">{formatEuro(baseline.fireTarget)}</div>
                        <div className="text-[10px] text-slate-500">SWR {snapshot.fireWithdrawalRate}%</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Risparmio usato</div>
                        <div className="text-base font-bold text-slate-900 dark:text-slate-100">{formatEuro(snapshot.monthlySavings)}/m</div>
                        <div className="text-[10px] text-slate-500">reddito − spese − rate</div>
                    </div>
                </div>

                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                            <defs>
                                <linearGradient id="gradFireSenza" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradFireCon" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                            <XAxis
                                dataKey="age"
                                tick={{ fontSize: 10, fill: "#64748b" }}
                                tickFormatter={(v: number) => `${Math.round(v)}a`}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: "#64748b" }}
                                tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                            />
                            <Tooltip
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                formatter={(value: any, name: any) => [formatEuro(Number(value)), name]}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                labelFormatter={(age: any) => `Eta' ${Math.round(Number(age))} anni`}
                                contentStyle={{
                                    borderRadius: "12px",
                                    border: "1px solid rgba(148,163,184,0.18)",
                                    boxShadow: "0 12px 30px rgba(0,0,0,.12)",
                                    backgroundColor: "rgba(15, 23, 42, 0.96)",
                                    color: "#e2e8f0",
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
                            <ReferenceLine
                                y={baseline.fireTarget}
                                stroke="#f59e0b"
                                strokeDasharray="5 5"
                                label={{ value: "Target FIRE", fontSize: 10, fill: "#f59e0b", position: "right" }}
                            />
                            <Area type="monotone" dataKey="senza" name="Senza acquisto" stroke="#10b981" fill="url(#gradFireSenza)" strokeWidth={2.5} />
                            <Area type="monotone" dataKey="con" name="Con acquisto" stroke="#6366f1" fill="url(#gradFireCon)" strokeWidth={2.5} />
                            {baseline.yearsToFire > 0 && (
                                <ReferenceLine
                                    x={baseline.ageAtFire}
                                    stroke="#10b981"
                                    strokeDasharray="2 4"
                                />
                            )}
                            {withPurchase.yearsToFire > 0 && (
                                <ReferenceLine
                                    x={withPurchase.ageAtFire}
                                    stroke="#6366f1"
                                    strokeDasharray="2 4"
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-3 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                    <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
                    <span>
                        La proiezione usa i <strong>tuoi parametri FIRE</strong> (rendimento {snapshot.fireExpectedReturn}%,
                        inflazione {snapshot.expectedInflation}%, SWR {snapshot.fireWithdrawalRate}%, risparmio
                        {" "}{formatEuro(snapshot.monthlySavings)}/mese). Lo scenario &quot;con acquisto&quot; sottrae
                        l&apos;anticipo dal capitale iniziale e riduce il risparmio mensile per la rata
                        {sim.isFinanced ? ` e ${sim.financingYears} anni di finanziamento` : ""}.
                    </span>
                </div>
            </CardContent>
        </Card>
    );
});
