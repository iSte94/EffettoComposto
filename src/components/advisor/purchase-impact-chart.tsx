"use client";

import { memo, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { formatEuro } from "@/lib/format";
import type { PurchaseSimulation, FinancialSnapshot } from "@/types";
import { computeRealReturn } from "@/lib/finance/fire-projection";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    BarChart, Bar, Cell,
} from "recharts";
import {
    CHART_AXIS_PROPS,
    CHART_COLORS,
    CHART_CURSOR,
    CHART_GRID_PROPS,
    CHART_HORIZONTAL_BAR_RADIUS,
    CHART_TOOLTIP_ITEM_STYLE,
    CHART_TOOLTIP_LABEL_STYLE,
    CHART_TOOLTIP_STYLE,
    formatCompactEuroAxis,
} from "@/components/ui/chart-style";

interface PurchaseImpactChartProps {
    sim: PurchaseSimulation;
    calculations: {
        loanAmount: number;
        monthlyPayment: number;
        totalInterest: number;
        totalTCO: number;
        tcoYears: number;
        cashOutlay: number;
        annualRecurringCosts: number;
    };
    snapshot: FinancialSnapshot;
}

function generateAmortizationData(loanAmount: number, monthlyRate: number, monthlyPayment: number, totalMonths: number) {
    const data: { month: number; year: string; capitalePagato: number; interessiPagati: number; debitoResiduo: number }[] = [];
    let remaining = loanAmount;
    let cumulativeCapital = 0;
    let cumulativeInterest = 0;

    for (let m = 1; m <= totalMonths && remaining > 0; m++) {
        const interestPortion = remaining * monthlyRate;
        const capitalPortion = Math.min(remaining, monthlyPayment - interestPortion);
        remaining = Math.max(0, remaining - capitalPortion);
        cumulativeCapital += capitalPortion;
        cumulativeInterest += interestPortion;

        if (m % 3 === 0 || m === 1 || m === totalMonths) {
            data.push({
                month: m,
                year: m % 12 === 0 ? `Anno ${m / 12}` : `${m}m`,
                capitalePagato: Math.round(cumulativeCapital),
                interessiPagati: Math.round(cumulativeInterest),
                debitoResiduo: Math.round(remaining),
            });
        }
    }
    return data;
}

export const PurchaseImpactChart = memo(function PurchaseImpactChart({
    sim, calculations, snapshot,
}: PurchaseImpactChartProps) {
    const monthlyRate = (sim.financingRate / 100) / 12;
    const totalMonths = sim.financingYears * 12;

    const amortizationData = useMemo(() => {
        if (!sim.isFinanced || calculations.loanAmount <= 0) return [];
        return generateAmortizationData(calculations.loanAmount, monthlyRate, calculations.monthlyPayment, totalMonths);
    }, [sim.isFinanced, calculations.loanAmount, calculations.monthlyPayment, monthlyRate, totalMonths]);

    const costBreakdown = useMemo(() => {
        const items: { name: string; valore: number; color: string }[] = [];
        if (sim.isFinanced) {
            items.push({ name: "Anticipo", valore: sim.downPayment, color: CHART_COLORS.capital });
            items.push({ name: "Interessi", valore: calculations.totalInterest, color: CHART_COLORS.expense });
        } else {
            items.push({ name: "Prezzo", valore: sim.totalPrice, color: CHART_COLORS.investment });
        }
        if (calculations.annualRecurringCosts > 0) {
            items.push({ name: `Costi Ricorrenti (${calculations.tcoYears}a)`, valore: calculations.annualRecurringCosts * calculations.tcoYears, color: CHART_COLORS.target });
        }
        const realRet = Math.max(0, computeRealReturn(snapshot.fireExpectedReturn, snapshot.expectedInflation));
        items.push({
            name: "Costo Opportunita",
            valore: calculations.cashOutlay * Math.pow(1 + realRet, calculations.tcoYears) - calculations.cashOutlay,
            color: CHART_COLORS.opportunity,
        });
        return items;
    }, [sim, calculations, snapshot]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const euroFormatter = (value: any) => [formatEuro(Number(value)), undefined];

    if (!sim.isFinanced) {
        // Solo cost breakdown se non finanziato (no ammortamento)
        return (
            <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
                <CardContent className="p-4 sm:p-5">
                    <div className="mb-4 flex items-center gap-2">
                        <div className="rounded-xl bg-indigo-50 p-2 dark:bg-indigo-950/50">
                            <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Composizione del Costo Totale</h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Dove finiscono i tuoi soldi</p>
                        </div>
                    </div>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                            <BarChart data={costBreakdown} layout="vertical" margin={{ top: 8, right: 10, left: 8, bottom: 6 }}>
                                <CartesianGrid {...CHART_GRID_PROPS} />
                                <XAxis type="number" {...CHART_AXIS_PROPS} tickFormatter={formatCompactEuroAxis} />
                                <YAxis type="category" dataKey="name" {...CHART_AXIS_PROPS} width={150} />
                                <Tooltip formatter={euroFormatter} contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} itemStyle={CHART_TOOLTIP_ITEM_STYLE} cursor={CHART_CURSOR} />
                                <Bar dataKey="valore" name="Importo" radius={CHART_HORIZONTAL_BAR_RADIUS}>
                                    {costBreakdown.map((entry, index) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
                <CardContent className="p-4 sm:p-5">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <div className="rounded-xl bg-indigo-50 p-2 dark:bg-indigo-950/50">
                                <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Piano di Ammortamento</h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">Come si ripartisce la rata fra capitale e interessi</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs">
                            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Capitale</span>
                            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Interessi</span>
                            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Debito Residuo</span>
                        </div>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                            <AreaChart data={amortizationData} margin={{ top: 12, right: 12, left: 0, bottom: 6 }}>
                                <defs>
                                    <linearGradient id="gradCapitale" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_COLORS.investment} stopOpacity={0.38} />
                                        <stop offset="95%" stopColor={CHART_COLORS.investment} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradInteressi" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_COLORS.expense} stopOpacity={0.34} />
                                        <stop offset="95%" stopColor={CHART_COLORS.expense} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid {...CHART_GRID_PROPS} />
                                <XAxis dataKey="year" {...CHART_AXIS_PROPS} minTickGap={16} />
                                <YAxis {...CHART_AXIS_PROPS} tickFormatter={formatCompactEuroAxis} width={58} />
                                <Tooltip formatter={euroFormatter} contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} itemStyle={CHART_TOOLTIP_ITEM_STYLE} cursor={CHART_CURSOR} />
                                <Area type="monotone" dataKey="capitalePagato" name="Capitale Pagato" stroke={CHART_COLORS.investment} fill="url(#gradCapitale)" strokeWidth={2.5} />
                                <Area type="monotone" dataKey="interessiPagati" name="Interessi Pagati" stroke={CHART_COLORS.expense} fill="url(#gradInteressi)" strokeWidth={2.5} />
                                <Area type="monotone" dataKey="debitoResiduo" name="Debito Residuo" stroke={CHART_COLORS.neutral} fill="none" strokeWidth={2.5} strokeDasharray="6 6" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
                <CardContent className="p-4 sm:p-5">
                    <h3 className="mb-4 text-sm font-bold text-slate-600 dark:text-slate-400">Composizione del Costo Totale</h3>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                            <BarChart data={costBreakdown} layout="vertical" margin={{ top: 8, right: 10, left: 8, bottom: 6 }}>
                                <CartesianGrid {...CHART_GRID_PROPS} />
                                <XAxis type="number" {...CHART_AXIS_PROPS} tickFormatter={formatCompactEuroAxis} />
                                <YAxis type="category" dataKey="name" {...CHART_AXIS_PROPS} width={150} />
                                <Tooltip formatter={euroFormatter} contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} itemStyle={CHART_TOOLTIP_ITEM_STYLE} cursor={CHART_CURSOR} />
                                <Bar dataKey="valore" name="Importo" radius={CHART_HORIZONTAL_BAR_RADIUS}>
                                    {costBreakdown.map((entry, index) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
});
