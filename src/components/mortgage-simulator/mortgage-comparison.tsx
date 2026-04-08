"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Scale } from "lucide-react";
import { formatEuro } from "@/lib/format";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
    LineChart, Line
} from "recharts";

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

const COLORS = ["#3b82f6", "#10b981", "#f59e0b"];
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
    const monthlyRate = (s.rate / 100) / 12;
    const numPayments = s.years * 12;
    const monthlyPayment = loanAmount > 0 && monthlyRate > 0
        ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
        : loanAmount > 0 ? loanAmount / numPayments : 0;
    const totalPaid = monthlyPayment * numPayments;
    const totalInterest = Math.max(0, totalPaid - loanAmount);
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

    // Chart data: comparison bars
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

    // Chart data: debt over time (yearly)
    const maxYears = Math.max(...results.map(r => r.years));
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

    // Best scenario highlight
    const bestMonthly = results.reduce((best, r) => r.monthlyPayment < best.monthlyPayment ? r : best);
    const bestTotal = results.reduce((best, r) => r.totalPaid < best.totalPaid ? r : best);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-xl">
                        <Scale className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Confronto Mutui</h3>
                        <p className="text-xs text-slate-500">Confronta fino a 3 offerte fianco a fianco</p>
                    </div>
                </div>
                {scenarios.length < 3 && (
                    <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={addScenario}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Aggiungi Offerta
                    </Button>
                )}
            </div>

            {/* Scenario Input Cards */}
            <div className={`grid gap-4 ${scenarios.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                {scenarios.map((s, idx) => (
                    <Card key={s.id} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-2 rounded-2xl overflow-hidden"
                        style={{ borderColor: COLORS[idx] + "40" }}>
                        <CardContent className="p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                                    <Input
                                        value={s.label}
                                        onChange={e => updateScenario(s.id, "label", e.target.value)}
                                        className="h-7 text-sm font-bold border-none p-0 bg-transparent focus-visible:ring-0 w-32"
                                    />
                                </div>
                                {scenarios.length > 2 && (
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-500" onClick={() => removeScenario(s.id)}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500">Prezzo Immobile</Label>
                                    <Input type="number" value={s.propertyPrice || ""} onChange={e => updateScenario(s.id, "propertyPrice", e.target.value)} className="h-8 text-sm rounded-lg" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500">Anticipo</Label>
                                    <Input type="number" value={s.downpayment || ""} onChange={e => updateScenario(s.id, "downpayment", e.target.value)} className="h-8 text-sm rounded-lg" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500">Tasso %</Label>
                                    <Input type="number" step="0.1" value={s.rate || ""} onChange={e => updateScenario(s.id, "rate", e.target.value)} className="h-8 text-sm rounded-lg" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500">Durata (anni)</Label>
                                    <Input type="number" value={s.years || ""} onChange={e => updateScenario(s.id, "years", e.target.value)} className="h-8 text-sm rounded-lg" />
                                </div>
                            </div>

                            {/* Quick Results */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Importo Mutuo</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{formatEuro(results[idx].loanAmount)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Rata Mensile</span>
                                    <span className="font-bold" style={{ color: COLORS[idx] }}>{formatEuro(results[idx].monthlyPayment)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Totale Interessi</span>
                                    <span className="font-bold text-red-500">{formatEuro(results[idx].totalInterest)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Costo Totale</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{formatEuro(results[idx].totalPaid)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Winner Highlight */}
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5">
                <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mb-3">Riepilogo Confronto</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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

            {/* Comparison Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar Chart: Key Metrics */}
                <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 rounded-2xl">
                    <CardContent className="p-5">
                        <h4 className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-4">Confronto Costi</h4>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                                    <Tooltip
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        formatter={(value: any) => formatEuro(Number(value))}
                                        contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)" }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    {results.map((r, i) => (
                                        <Bar key={r.label} dataKey={r.label} fill={COLORS[i]} radius={[4, 4, 0, 0]} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Line Chart: Remaining Debt Over Time */}
                <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 rounded-2xl">
                    <CardContent className="p-5">
                        <h4 className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-4">Debito Residuo nel Tempo</h4>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={debtOverTime} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                    <XAxis dataKey="anno" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(maxYears / 6))} />
                                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                                    <Tooltip
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        formatter={(value: any) => formatEuro(Number(value))}
                                        contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)" }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    {results.map((r, i) => (
                                        <Line key={r.label} type="monotone" dataKey={r.label} stroke={COLORS[i]} strokeWidth={2.5} dot={false} />
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
