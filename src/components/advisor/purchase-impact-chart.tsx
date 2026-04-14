"use client";

import { memo, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { formatEuro } from "@/lib/format";
import type { PurchaseSimulation, FinancialSnapshot } from "@/types";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    BarChart, Bar, Cell,
} from "recharts";

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
            items.push({ name: "Anticipo", valore: sim.downPayment, color: "#6366f1" });
            items.push({ name: "Interessi", valore: calculations.totalInterest, color: "#ef4444" });
        } else {
            items.push({ name: "Prezzo", valore: sim.totalPrice, color: "#6366f1" });
        }
        if (calculations.annualRecurringCosts > 0) {
            items.push({ name: `Costi Ricorrenti (${calculations.tcoYears}a)`, valore: calculations.annualRecurringCosts * calculations.tcoYears, color: "#f59e0b" });
        }
        const realRet = Math.max(0, ((snapshot.fireExpectedReturn - snapshot.expectedInflation) / 100));
        items.push({ name: "Costo Opportunita", valore: sim.totalPrice * Math.pow(1 + realRet, calculations.tcoYears) - sim.totalPrice, color: "#8b5cf6" });
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
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={costBreakdown} layout="vertical" margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                                <XAxis type="number" tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} width={140} />
                                <Tooltip formatter={euroFormatter} contentStyle={{ borderRadius: "12px", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "0 12px 30px rgba(0,0,0,.12)", backgroundColor: "rgba(15, 23, 42, 0.96)", color: "#e2e8f0" }} />
                                <Bar dataKey="valore" name="Importo" radius={[0, 6, 6, 0]}>
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
                            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> Capitale</span>
                            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Interessi</span>
                            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Debito Residuo</span>
                        </div>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={amortizationData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="gradCapitale" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradInteressi" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                                <XAxis dataKey="year" tick={{ fontSize: 9, fill: "#64748b" }} />
                                <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                                <Tooltip formatter={euroFormatter} contentStyle={{ borderRadius: "12px", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "0 12px 30px rgba(0,0,0,.12)", backgroundColor: "rgba(15, 23, 42, 0.96)", color: "#e2e8f0" }} />
                                <Area type="monotone" dataKey="capitalePagato" name="Capitale Pagato" stroke="#6366f1" fill="url(#gradCapitale)" strokeWidth={2} />
                                <Area type="monotone" dataKey="interessiPagati" name="Interessi Pagati" stroke="#ef4444" fill="url(#gradInteressi)" strokeWidth={2} />
                                <Area type="monotone" dataKey="debitoResiduo" name="Debito Residuo" stroke="#94a3b8" fill="none" strokeWidth={2} strokeDasharray="5 5" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
                <CardContent className="p-4 sm:p-5">
                    <h3 className="mb-4 text-sm font-bold text-slate-600 dark:text-slate-400">Composizione del Costo Totale</h3>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={costBreakdown} layout="vertical" margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                                <XAxis type="number" tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} width={140} />
                                <Tooltip formatter={euroFormatter} contentStyle={{ borderRadius: "12px", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "0 12px 30px rgba(0,0,0,.12)", backgroundColor: "rgba(15, 23, 42, 0.96)", color: "#e2e8f0" }} />
                                <Bar dataKey="valore" name="Importo" radius={[0, 6, 6, 0]}>
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
