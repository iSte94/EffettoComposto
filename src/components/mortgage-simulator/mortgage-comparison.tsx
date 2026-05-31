"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Scale } from "lucide-react";
import { formatEuro } from "@/lib/format";
import { calculateMortgagePayment } from "@/lib/finance/loans";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
    LineChart, Line
} from "recharts";
import {
    CHART_AXIS_PROPS,
    CHART_BAR_RADIUS,
    CHART_COLORS,
    CHART_CURSOR,
    CHART_GRID_PROPS,
    CHART_LEGEND_STYLE,
    CHART_TOOLTIP_ITEM_STYLE,
    CHART_TOOLTIP_LABEL_STYLE,
    CHART_TOOLTIP_STYLE,
    formatCompactEuroAxis,
} from "@/components/ui/chart-style";

interface MortgageScenario {
    id: number;
    label: string;
    propertyPrice: number;
    downpayment: number;
    rate: number;
    years: number;
}

interface ScenarioResult extends MortgageScenario {
    loanAmount: number;
    monthlyPayment: number;
    totalPaid: number;
    totalInterest: number;
}

const COLORS = [CHART_COLORS.capital, CHART_COLORS.wealth, CHART_COLORS.target];
const LABELS = ["Offerta A", "Offerta B", "Offerta C"];

function createDefaultScenario(id: number): MortgageScenario {
    return {
        id,
        label: LABELS[id] || `Offerta ${id + 1}`,
        propertyPrice: 200000,
        downpayment: 40000,
        rate: 3.5,
        years: 25,
    };
}

function calculateScenario(s: MortgageScenario): ScenarioResult {
    const loanAmount = Math.max(0, s.propertyPrice - s.downpayment);
    const { monthlyPayment, totalPaid, totalInterest } = calculateMortgagePayment({
        loanAmount,
        annualRatePct: s.rate,
        years: s.years,
    });
    return { ...s, loanAmount, monthlyPayment, totalPaid, totalInterest };
}

export function MortgageComparison() {
    const [scenarios, setScenarios] = useState<MortgageScenario[]>([
        createDefaultScenario(0),
        createDefaultScenario(1),
    ]);

    const results = useMemo(() => scenarios.map(calculateScenario), [scenarios]);

    const updateScenario = (id: number, field: keyof MortgageScenario, value: string) => {
        setScenarios(prev => prev.map(s =>
            s.id === id ? { ...s, [field]: field === "label" ? value : Math.max(0, Number(value) || 0) } : s
        ));
    };

    const addScenario = () => {
        if (scenarios.length >= 3) return;
        setScenarios(prev => [...prev, createDefaultScenario(prev.length)]);
    };

    const removeScenario = (id: number) => {
        if (scenarios.length <= 2) return;
        setScenarios(prev => prev.filter(s => s.id !== id));
    };

    const barData = [
        {
            name: "Rata Mensile",
            ...Object.fromEntries(results.map(r => [r.label, Math.round(r.monthlyPayment)])),
        },
        {
            name: "Totale Interessi",
            ...Object.fromEntries(results.map(r => [r.label, Math.round(r.totalInterest)])),
        },
        {
            name: "Costo Totale",
            ...Object.fromEntries(results.map(r => [r.label, Math.round(r.totalPaid)])),
        },
    ];

    const maxYears = Math.max(1, ...results.map(r => r.years));
    const debtOverTime = Array.from({ length: maxYears + 1 }, (_, year) => {
        const point: Record<string, string | number> = { anno: `Anno ${year}` };
        for (const r of results) {
            if (year > r.years) {
                point[r.label] = 0;
                continue;
            }
            const monthlyRate = (r.rate / 100) / 12;
            const numPayments = r.years * 12;
            const monthsPassed = year * 12;
            if (numPayments <= 0) {
                point[r.label] = Math.max(0, r.loanAmount);
                continue;
            }
            if (monthlyRate > 0 && r.loanAmount > 0) {
                const factor = Math.pow(1 + monthlyRate, numPayments);
                const factorPassed = Math.pow(1 + monthlyRate, monthsPassed);
                const remaining = r.loanAmount * (factor - factorPassed) / (factor - 1);
                point[r.label] = Math.max(0, Math.round(remaining));
            } else {
                const perMonth = r.loanAmount / numPayments;
                point[r.label] = Math.max(0, Math.round(r.loanAmount - perMonth * monthsPassed));
            }
        }
        return point;
    });

    const bestMonthly = results.reduce((best, r) => r.monthlyPayment < best.monthlyPayment ? r : best);
    const bestTotal = results.reduce((best, r) => r.totalPaid < best.totalPaid ? r : best);

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-blue-50 p-2 dark:bg-blue-950/50">
                        <Scale className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Confronto Mutui</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Confronta fino a 3 offerte fianco a fianco</p>
                    </div>
                </div>
                {scenarios.length < 3 && (
                    <Button variant="outline" size="sm" className="h-11 rounded-xl text-xs" onClick={addScenario}>
                        <Plus className="mr-1 h-3.5 w-3.5" /> Aggiungi Offerta
                    </Button>
                )}
            </div>

            <div className={`grid gap-4 ${scenarios.length === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"}`}>
                {scenarios.map((s, idx) => (
                    <Card key={s.id} className="overflow-hidden rounded-2xl border-2 border-slate-200/80 bg-white/75 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75" style={{ borderColor: `${COLORS[idx]}40` }}>
                        <CardContent className="space-y-4 p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                                    <Input
                                        value={s.label}
                                        onChange={e => updateScenario(s.id, "label", e.target.value)}
                                        className="h-10 w-32 border-none bg-transparent p-0 text-sm font-bold focus-visible:ring-0"
                                    />
                                </div>
                                {scenarios.length > 2 && (
                                    <Button variant="ghost" size="sm" className="h-10 w-10 rounded-full p-0 text-slate-400 hover:text-red-500" onClick={() => removeScenario(s.id)} aria-label="Rimuovi offerta">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 dark:text-slate-400">Prezzo Immobile</Label>
                                    <Input type="number" min="0" value={s.propertyPrice || ""} onChange={e => updateScenario(s.id, "propertyPrice", e.target.value)} className="h-11 rounded-lg border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-800/50" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 dark:text-slate-400">Anticipo</Label>
                                    <Input type="number" min="0" value={s.downpayment || ""} onChange={e => updateScenario(s.id, "downpayment", e.target.value)} className="h-11 rounded-lg border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-800/50" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 dark:text-slate-400">Tasso %</Label>
                                    <Input type="number" min="0" step="0.1" value={s.rate || ""} onChange={e => updateScenario(s.id, "rate", e.target.value)} className="h-11 rounded-lg border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-800/50" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 dark:text-slate-400">Durata (anni)</Label>
                                    <Input type="number" min="1" value={s.years || ""} onChange={e => updateScenario(s.id, "years", e.target.value)} className="h-11 rounded-lg border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-800/50" />
                                </div>
                            </div>

                            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500 dark:text-slate-400">Importo Mutuo</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{formatEuro(results[idx].loanAmount)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500 dark:text-slate-400">Rata Mensile</span>
                                    <span className="font-bold" style={{ color: COLORS[idx] }}>{formatEuro(results[idx].monthlyPayment)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500 dark:text-slate-400">Totale Interessi</span>
                                    <span className="font-bold text-red-500">{formatEuro(results[idx].totalInterest)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500 dark:text-slate-400">Costo Totale</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{formatEuro(results[idx].totalPaid)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-5 dark:border-emerald-800 dark:bg-emerald-950/30">
                <h4 className="mb-3 text-sm font-bold text-emerald-800 dark:text-emerald-300">Riepilogo Confronto</h4>
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                    <div>
                        <span className="text-slate-600 dark:text-slate-400">Rata piu&apos; bassa: </span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">{bestMonthly.label}</span>
                        <span className="text-slate-500"> ({formatEuro(bestMonthly.monthlyPayment)}/mese)</span>
                    </div>
                    <div>
                        <span className="text-slate-600 dark:text-slate-400">Costo totale minore: </span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">{bestTotal.label}</span>
                        <span className="text-slate-500"> ({formatEuro(bestTotal.totalPaid)} totali)</span>
                    </div>
                    {results.length >= 2 && (
                        <div className="md:col-span-2">
                            <span className="text-slate-600 dark:text-slate-400">Risparmio interessi (migliore vs peggiore): </span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                {formatEuro(Math.max(...results.map(r => r.totalInterest)) - Math.min(...results.map(r => r.totalInterest)))}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
                    <CardContent className="p-4 sm:p-5">
                        <h4 className="mb-4 text-sm font-bold text-slate-600 dark:text-slate-400">Confronto Costi</h4>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData} margin={{ top: 14, right: 8, left: 0, bottom: 6 }} barCategoryGap="24%">
                                    <CartesianGrid {...CHART_GRID_PROPS} />
                                    <XAxis dataKey="name" {...CHART_AXIS_PROPS} />
                                    <YAxis {...CHART_AXIS_PROPS} tickFormatter={formatCompactEuroAxis} width={58} />
                                    <Tooltip formatter={(value: string | number | undefined) => formatEuro(Number(value ?? 0))} contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} itemStyle={CHART_TOOLTIP_ITEM_STYLE} cursor={CHART_CURSOR} />
                                    <Legend wrapperStyle={CHART_LEGEND_STYLE} iconType="circle" />
                                    {results.map((r, i) => (
                                        <Bar key={r.label} dataKey={r.label} fill={COLORS[i]} radius={CHART_BAR_RADIUS} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
                    <CardContent className="p-4 sm:p-5">
                        <h4 className="mb-4 text-sm font-bold text-slate-600 dark:text-slate-400">Debito Residuo nel Tempo</h4>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={debtOverTime} margin={{ top: 14, right: 8, left: 0, bottom: 6 }}>
                                    <CartesianGrid {...CHART_GRID_PROPS} />
                                    <XAxis dataKey="anno" {...CHART_AXIS_PROPS} interval={Math.max(0, Math.floor(maxYears / 6))} />
                                    <YAxis {...CHART_AXIS_PROPS} tickFormatter={formatCompactEuroAxis} width={58} />
                                    <Tooltip formatter={(value: string | number | undefined) => formatEuro(Number(value ?? 0))} contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} itemStyle={CHART_TOOLTIP_ITEM_STYLE} cursor={CHART_CURSOR} />
                                    <Legend wrapperStyle={CHART_LEGEND_STYLE} iconType="circle" />
                                    {results.map((r, i) => (
                                        <Line key={r.label} type="monotone" dataKey={r.label} stroke={COLORS[i]} strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
