"use client";

import { memo, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Scale, Wallet, CreditCard, TrendingUp, Trophy } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Cell, LabelList,
} from "recharts";
import { formatEuro } from "@/lib/format";
import type { PurchaseSimulation, FinancialSnapshot } from "@/types";
import { projectFire } from "@/lib/finance/fire-projection";

interface ScenarioComparisonProps {
    sim: PurchaseSimulation;
    snapshot: FinancialSnapshot;
    calculations: {
        loanAmount: number;
        monthlyPayment: number;
        totalInterest: number;
        annualRecurringCosts: number;
        tcoYears: number;
        cashOutlay: number;
    };
}

interface Scenario {
    key: "cash" | "financed" | "invest";
    label: string;
    icon: React.ReactNode;
    color: string;
    description: string;
    wealthAtEnd: number;
    liquidityNow: number;
    interestPaid: number;
    yearsToFire: number;
}

export const ScenarioComparison = memo(function ScenarioComparison({
    sim, snapshot, calculations,
}: ScenarioComparisonProps) {

    const scenarios = useMemo<Scenario[]>(() => {
        const horizon = Math.max(calculations.tcoYears, 5);
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

        // SCENARIO 1: Cash (paghi tutto subito)
        const cash = hasFireData ? projectFire({
            ...baseParams,
            oneTimeOutflow: sim.totalPrice,
            ongoingMonthlyCost: calculations.annualRecurringCosts / 12,
            ongoingMonths: calculations.tcoYears * 12,
        }) : null;

        // SCENARIO 2: Finanziato (anticipo + rata)
        const financed = hasFireData ? projectFire({
            ...baseParams,
            oneTimeOutflow: sim.downPayment,
            recurringMonthlyCost: calculations.monthlyPayment,
            recurringMonths: sim.financingYears * 12,
            ongoingMonthlyCost: calculations.annualRecurringCosts / 12,
            ongoingMonths: calculations.tcoYears * 12,
        }) : null;

        // SCENARIO 3: Non comprare, investire (nessun esborso)
        const invest = hasFireData ? projectFire(baseParams) : null;

        // Se non abbiamo dati FIRE, calcola "wealth at end" con formula semplificata:
        // capital * (1+r)^n + savings accumulati - costi vari
        const realRet = (snapshot.fireExpectedReturn - snapshot.expectedInflation) / 100;
        const fv = (capital: number, years: number, monthlyContrib: number) => {
            const monthlyR = Math.pow(1 + realRet, 1 / 12) - 1;
            const months = years * 12;
            const fvCapital = capital * Math.pow(1 + monthlyR, months);
            const fvContrib = monthlyR > 0
                ? monthlyContrib * ((Math.pow(1 + monthlyR, months) - 1) / monthlyR)
                : monthlyContrib * months;
            return fvCapital + fvContrib;
        };

        const startLiq = snapshot.liquidAssets + snapshot.emergencyFund;
        const monthlyRecurring = calculations.annualRecurringCosts / 12;

        const cashWealth = cash
            ? cash.chartData[Math.min(horizon, cash.chartData.length - 1)]?.capital ?? 0
            : fv(startLiq - sim.totalPrice, horizon, snapshot.monthlySavings - monthlyRecurring);

        const financedWealth = financed
            ? financed.chartData[Math.min(horizon, financed.chartData.length - 1)]?.capital ?? 0
            : fv(startLiq - sim.downPayment, horizon, snapshot.monthlySavings - calculations.monthlyPayment - monthlyRecurring);

        const investWealth = invest
            ? invest.chartData[Math.min(horizon, invest.chartData.length - 1)]?.capital ?? 0
            : fv(startLiq, horizon, snapshot.monthlySavings);

        return [
            {
                key: "cash",
                label: "Cash",
                icon: <Wallet className="h-4 w-4" />,
                color: "#6366f1",
                description: "Paghi tutto subito, zero interessi",
                wealthAtEnd: Math.max(0, cashWealth),
                liquidityNow: Math.max(0, startLiq - sim.totalPrice),
                interestPaid: 0,
                yearsToFire: cash?.yearsToFire ?? -1,
            },
            {
                key: "financed",
                label: sim.isFinanced ? "Finanziato" : "Finanziato*",
                icon: <CreditCard className="h-4 w-4" />,
                color: "#f59e0b",
                description: `Anticipo + ${sim.financingYears}a di rate al ${sim.financingRate}%`,
                wealthAtEnd: Math.max(0, financedWealth),
                liquidityNow: Math.max(0, startLiq - sim.downPayment),
                interestPaid: calculations.totalInterest,
                yearsToFire: financed?.yearsToFire ?? -1,
            },
            {
                key: "invest",
                label: "Non compri",
                icon: <TrendingUp className="h-4 w-4" />,
                color: "#10b981",
                description: "Investi tutto, rinunci all'acquisto",
                wealthAtEnd: Math.max(0, investWealth),
                liquidityNow: startLiq,
                interestPaid: 0,
                yearsToFire: invest?.yearsToFire ?? -1,
            },
        ];
    }, [sim, snapshot, calculations]);

    const maxWealth = Math.max(...scenarios.map(s => s.wealthAtEnd));
    const winner = scenarios.reduce((best, s) => s.wealthAtEnd > best.wealthAtEnd ? s : best, scenarios[0]);

    const chartData = scenarios.map(s => ({
        name: s.label,
        Patrimonio: Math.round(s.wealthAtEnd),
        color: s.color,
    }));

    return (
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
            <CardContent className="p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2">
                    <div className="rounded-xl bg-violet-50 p-2 dark:bg-violet-950/50">
                        <Scale className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Confronto Scenari a {Math.max(calculations.tcoYears, 5)} anni</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Come evolve il tuo patrimonio nelle tre strategie
                        </p>
                    </div>
                </div>

                <div className="mb-4 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 10, left: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                            <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                            <Tooltip
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                formatter={(v: any) => [formatEuro(Number(v)), "Patrimonio"]}
                                contentStyle={{
                                    borderRadius: "12px",
                                    border: "1px solid rgba(148,163,184,0.18)",
                                    boxShadow: "0 12px 30px rgba(0,0,0,.12)",
                                    backgroundColor: "rgba(15, 23, 42, 0.96)",
                                    color: "#e2e8f0",
                                }}
                            />
                            <Bar dataKey="Patrimonio" radius={[8, 8, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={index} fill={entry.color} />
                                ))}
                                <LabelList
                                    dataKey="Patrimonio"
                                    position="top"
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    formatter={(v: any) => formatEuro(Number(v))}
                                    style={{ fontSize: 10, fill: "#64748b", fontWeight: 700 }}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                    {scenarios.map(s => {
                        const isWinner = s.key === winner.key && s.wealthAtEnd === maxWealth;
                        const gap = maxWealth - s.wealthAtEnd;
                        return (
                            <div
                                key={s.key}
                                className={`relative rounded-xl border p-3 ${isWinner
                                    ? "border-emerald-300 bg-emerald-50/60 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/30"
                                    : "border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/40"
                                    }`}
                            >
                                {isWinner && (
                                    <div className="absolute -top-2 right-2 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold uppercase text-white">
                                        <Trophy className="h-3 w-3" /> Migliore
                                    </div>
                                )}
                                <div className="mb-1.5 flex items-center gap-1.5" style={{ color: s.color }}>
                                    {s.icon}
                                    <span className="text-xs font-bold">{s.label}</span>
                                </div>
                                <p className="mb-2 text-[10px] leading-tight text-slate-500 dark:text-slate-400">{s.description}</p>
                                <div className="space-y-1 text-[11px]">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Patrimonio finale:</span>
                                        <span className="font-bold text-slate-900 dark:text-slate-100">{formatEuro(s.wealthAtEnd)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Liquidita dopo:</span>
                                        <span className="font-mono text-slate-700 dark:text-slate-300">{formatEuro(s.liquidityNow)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Interessi pagati:</span>
                                        <span className="font-mono text-red-500">{formatEuro(s.interestPaid)}</span>
                                    </div>
                                    {s.yearsToFire > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">FIRE in:</span>
                                            <span className="font-bold text-orange-500">{s.yearsToFire.toFixed(1)}a</span>
                                        </div>
                                    )}
                                    {!isWinner && gap > 0 && (
                                        <div className="mt-1 border-t border-slate-200 pt-1 text-[10px] text-red-500 dark:border-slate-700">
                                            −{formatEuro(gap)} vs migliore
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-3 text-[10px] italic text-slate-500 dark:text-slate-400">
                    * Lo scenario &quot;Finanziato&quot; e calcolato anche se al momento hai selezionato pagamento cash,
                    cosi puoi vedere l&apos;alternativa. Il patrimonio finale include il rendimento composto al
                    {" "}{(snapshot.fireExpectedReturn - snapshot.expectedInflation).toFixed(1)}% reale.
                </div>
            </CardContent>
        </Card>
    );
});
