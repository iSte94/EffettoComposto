"use client";

import { memo, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Activity } from "lucide-react";
import {
    ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend, ReferenceDot,
} from "recharts";
import { formatEuro } from "@/lib/format";
import { projectFire } from "@/lib/finance/fire-projection";
import type { PurchaseSimulation, FinancialSnapshot } from "@/types";

interface SensitivityChartProps {
    sim: PurchaseSimulation;
    snapshot: FinancialSnapshot;
    calculations: {
        annualRecurringCosts: number;
        tcoYears: number;
    };
}

type Axis = "downPayment" | "years";

function amortizationMonthly(P: number, annualRate: number, years: number): number {
    const i = annualRate / 100 / 12;
    const n = years * 12;
    if (n <= 0 || P <= 0) return 0;
    if (i === 0) return P / n;
    return (P * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
}

export const SensitivityChart = memo(function SensitivityChart({
    sim, snapshot, calculations,
}: SensitivityChartProps) {
    const [axis, setAxis] = useState<Axis>("downPayment");

    const hasFireData = snapshot.currentAge !== null && snapshot.monthlySavings > 0;

    const baseParams = {
        startingCapital: snapshot.liquidAssets + snapshot.emergencyFund,
        monthlySavings: snapshot.monthlySavings,
        monthlyExpensesAtFire: snapshot.expectedMonthlyExpensesAtFire,
        expectedReturnPct: snapshot.fireExpectedReturn,
        inflationPct: snapshot.expectedInflation,
        withdrawalRatePct: snapshot.fireWithdrawalRate,
        currentAge: snapshot.currentAge ?? 30,
        retirementAge: snapshot.retirementAge,
    };

    const baseline = useMemo(
        () => hasFireData ? projectFire(baseParams) : null,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [hasFireData, snapshot]
    );

    const data = useMemo(() => {
        const points: { x: number; label: string; rata: number; interessi: number; tco: number; fireDelay: number; isCurrent: boolean }[] = [];
        const recurringMonths = (yrs: number) => yrs * 12;
        const ongoingMonths = calculations.tcoYears * 12;

        if (axis === "downPayment") {
            // Varia anticipo dal 0% al 50% in 11 step
            for (let pct = 0; pct <= 50; pct += 5) {
                const dp = Math.round(sim.totalPrice * (pct / 100));
                const P = sim.totalPrice - dp;
                const rata = amortizationMonthly(P, sim.financingRate, sim.financingYears);
                const interessi = rata * sim.financingYears * 12 - P;
                const tco = sim.totalPrice + Math.max(0, interessi) + calculations.annualRecurringCosts * calculations.tcoYears;
                let fireDelay = 0;
                if (baseline && hasFireData) {
                    const scen = projectFire({
                        ...baseParams,
                        oneTimeOutflow: dp,
                        recurringMonthlyCost: rata,
                        recurringMonths: recurringMonths(sim.financingYears),
                        ongoingMonthlyCost: calculations.annualRecurringCosts / 12,
                        ongoingMonths,
                    });
                    fireDelay = (scen.monthsToFire - baseline.monthsToFire) / 12;
                }
                const currentPct = Math.round((sim.downPayment / sim.totalPrice) * 100);
                points.push({
                    x: pct,
                    label: `${pct}%`,
                    rata: Math.round(rata),
                    interessi: Math.round(Math.max(0, interessi)),
                    tco: Math.round(tco),
                    fireDelay: Number(fireDelay.toFixed(2)),
                    isCurrent: Math.abs(pct - currentPct) < 2.5,
                });
            }
        } else {
            // Varia durata da 1 a 10 anni
            const P = sim.totalPrice - sim.downPayment;
            for (let yrs = 1; yrs <= 10; yrs++) {
                const rata = amortizationMonthly(P, sim.financingRate, yrs);
                const interessi = rata * yrs * 12 - P;
                const tco = sim.totalPrice + Math.max(0, interessi) + calculations.annualRecurringCosts * calculations.tcoYears;
                let fireDelay = 0;
                if (baseline && hasFireData) {
                    const scen = projectFire({
                        ...baseParams,
                        oneTimeOutflow: sim.downPayment,
                        recurringMonthlyCost: rata,
                        recurringMonths: yrs * 12,
                        ongoingMonthlyCost: calculations.annualRecurringCosts / 12,
                        ongoingMonths,
                    });
                    fireDelay = (scen.monthsToFire - baseline.monthsToFire) / 12;
                }
                points.push({
                    x: yrs,
                    label: `${yrs}a`,
                    rata: Math.round(rata),
                    interessi: Math.round(Math.max(0, interessi)),
                    tco: Math.round(tco),
                    fireDelay: Number(fireDelay.toFixed(2)),
                    isCurrent: yrs === sim.financingYears,
                });
            }
        }
        return points;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [axis, sim, snapshot, calculations, baseline, hasFireData]);

    const currentPoint = data.find(d => d.isCurrent);

    return (
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
            <CardContent className="p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="rounded-xl bg-cyan-50 p-2 dark:bg-cyan-950/50">
                            <Activity className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Sensitivita del Finanziamento</h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Come cambia tutto al variare di {axis === "downPayment" ? "anticipo" : "durata"}
                            </p>
                        </div>
                    </div>
                    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-xs dark:border-slate-700 dark:bg-slate-800/40">
                        <button
                            onClick={() => setAxis("downPayment")}
                            className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${axis === "downPayment"
                                ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400"
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                }`}
                        >
                            Anticipo %
                        </button>
                        <button
                            onClick={() => setAxis("years")}
                            className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${axis === "years"
                                ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400"
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                }`}
                        >
                            Durata anni
                        </button>
                    </div>
                </div>

                {!sim.isFinanced && (
                    <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/70 p-2 text-[11px] text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                        Hai scelto pagamento cash. La sensitivita mostra cosa succederebbe se finanziassi.
                    </div>
                )}

                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} />
                            <YAxis
                                yAxisId="left"
                                tick={{ fontSize: 9, fill: "#64748b" }}
                                tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                tick={{ fontSize: 9, fill: "#64748b" }}
                                tickFormatter={(v: number) => `${v.toFixed(1)}a`}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: "12px",
                                    border: "1px solid rgba(148,163,184,0.18)",
                                    boxShadow: "0 12px 30px rgba(0,0,0,.12)",
                                    backgroundColor: "rgba(15, 23, 42, 0.96)",
                                    color: "#e2e8f0",
                                }}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                formatter={(value: any, name: any) => {
                                    if (name === "Ritardo FIRE") return [`${Number(value).toFixed(2)} anni`, name];
                                    return [formatEuro(Number(value)), name];
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
                            <Bar yAxisId="left" dataKey="tco" name="TCO" fill="#6366f1" radius={[6, 6, 0, 0]} />
                            <Bar yAxisId="left" dataKey="interessi" name="Interessi" fill="#ef4444" radius={[6, 6, 0, 0]} />
                            <Line yAxisId="right" type="monotone" dataKey="fireDelay" name="Ritardo FIRE" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
                            {currentPoint && (
                                <ReferenceDot
                                    yAxisId="left"
                                    x={currentPoint.label}
                                    y={currentPoint.tco}
                                    r={6}
                                    fill="#10b981"
                                    stroke="#fff"
                                    strokeWidth={2}
                                />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {currentPoint && (
                    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5 text-[11px] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <strong>La tua scelta attuale</strong> ({axis === "downPayment" ? `${currentPoint.x}% anticipo` : `${currentPoint.x} anni`}):
                        rata {formatEuro(currentPoint.rata)}/m, interessi {formatEuro(currentPoint.interessi)}, TCO {formatEuro(currentPoint.tco)}
                        {currentPoint.fireDelay > 0 && `, ritardo FIRE ${currentPoint.fireDelay.toFixed(1)}a`}.
                    </div>
                )}
            </CardContent>
        </Card>
    );
});
