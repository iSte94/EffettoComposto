"use client";

import { memo, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingDown, Trash2, Calendar, CreditCard, BarChart3 } from "lucide-react";
import { formatEuro } from "@/lib/format";
import type { PurchaseSimulation, FinancialSnapshot, AcceptedPurchase } from "@/types";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    BarChart, Bar, Cell, Legend,
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
    acceptedPurchases: AcceptedPurchase[];
    onRemovePurchase: (id: string) => void;
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

function generateWealthProjection(
    snapshot: FinancialSnapshot,
    cashOutlay: number,
    monthlyPayment: number,
    annualRecurring: number,
    years: number,
    marketReturn: number = 0.07,
) {
    const data: { year: number; label: string; senzaAcquisto: number; conAcquisto: number }[] = [];
    const monthlyReturn = Math.pow(1 + marketReturn, 1 / 12) - 1;
    const monthlySaving = snapshot.monthlyIncome * 0.2;
    const totalMonths = years * 12;

    let wealthWithout = snapshot.netWorth;
    let wealthWith = snapshot.netWorth - cashOutlay;

    for (let m = 0; m <= totalMonths; m++) {
        if (m % 6 === 0) {
            data.push({
                year: m / 12,
                label: m === 0 ? "Oggi" : m % 12 === 0 ? `Anno ${m / 12}` : `${(m / 12).toFixed(1)}a`,
                senzaAcquisto: Math.round(wealthWithout),
                conAcquisto: Math.round(wealthWith),
            });
        }
        if (m < totalMonths) {
            wealthWithout += monthlySaving;
            wealthWithout *= (1 + monthlyReturn);

            const monthlyRecurring = annualRecurring / 12;
            const netSaving = Math.max(0, monthlySaving - monthlyPayment - monthlyRecurring);
            wealthWith += netSaving;
            wealthWith *= (1 + monthlyReturn);
        }
    }
    return data;
}

export const PurchaseImpactChart = memo(function PurchaseImpactChart({
    sim, calculations, snapshot, acceptedPurchases, onRemovePurchase,
}: PurchaseImpactChartProps) {
    const monthlyRate = (sim.financingRate / 100) / 12;
    const totalMonths = sim.financingYears * 12;

    const amortizationData = useMemo(() => {
        if (!sim.isFinanced || calculations.loanAmount <= 0) return [];
        return generateAmortizationData(calculations.loanAmount, monthlyRate, calculations.monthlyPayment, totalMonths);
    }, [sim.isFinanced, calculations.loanAmount, calculations.monthlyPayment, monthlyRate, totalMonths]);

    const wealthData = useMemo(() => {
        return generateWealthProjection(
            snapshot,
            calculations.cashOutlay,
            sim.isFinanced ? calculations.monthlyPayment : 0,
            calculations.annualRecurringCosts,
            Math.max(calculations.tcoYears, 5),
        );
    }, [snapshot, calculations, sim.isFinanced]);

    const wealthDifference = useMemo(() => {
        if (wealthData.length === 0) return 0;
        const last = wealthData[wealthData.length - 1];
        return last.senzaAcquisto - last.conAcquisto;
    }, [wealthData]);

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
        items.push({ name: "Costo Opportunita", valore: sim.totalPrice * Math.pow(1.07, calculations.tcoYears) - sim.totalPrice, color: "#8b5cf6" });
        return items;
    }, [sim, calculations]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const euroFormatter = (value: any) => [formatEuro(Number(value)), undefined];

    return (
        <div className="space-y-6 animate-in fade-in-50 duration-500">
            <div className="flex items-center gap-3">
                <div className="rounded-xl bg-indigo-50 p-2.5 dark:bg-indigo-950/50">
                    <BarChart3 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Impatto Futuro dell&apos;Acquisto</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Come questa spesa influenza il tuo patrimonio nel tempo</p>
                </div>
            </div>

            <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
                <CardContent className="p-4 sm:p-5">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400">Proiezione Patrimonio: Con vs Senza Acquisto</h3>
                        <div className="text-xs font-bold text-red-500">Differenza a {calculations.tcoYears} anni: -{formatEuro(wealthDifference)}</div>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={wealthData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="gradWithout" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradWith" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" />
                                <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#64748b" }} />
                                <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                                <Tooltip
                                    formatter={euroFormatter}
                                    contentStyle={{ borderRadius: "12px", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "0 12px 30px rgba(0,0,0,.12)", backgroundColor: "rgba(15, 23, 42, 0.96)", color: "#e2e8f0" }}
                                    labelStyle={{ color: "#cbd5e1", fontWeight: 700 }}
                                />
                                <Legend wrapperStyle={{ fontSize: "11px", color: "#64748b" }} />
                                <Area type="monotone" dataKey="senzaAcquisto" name="Senza Acquisto" stroke="#10b981" fill="url(#gradWithout)" strokeWidth={2} />
                                <Area type="monotone" dataKey="conAcquisto" name="Con Acquisto" stroke="#6366f1" fill="url(#gradWith)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {sim.isFinanced && amortizationData.length > 0 && (
                <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
                    <CardContent className="p-4 sm:p-5">
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400">Piano di Ammortamento</h3>
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
            )}

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

            {acceptedPurchases.length > 0 && (
                <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/75 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
                    <CardContent className="p-4 sm:p-5">
                        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400">
                            <CreditCard className="h-4 w-4" /> Acquisti Accettati
                        </h3>
                        <div className="space-y-3">
                            {acceptedPurchases.map(p => (
                                <div key={p.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex-1">
                                        <div className="mb-1 flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{p.itemName}</span>
                                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                                                {p.category}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(p.acceptedAt).toLocaleDateString("it-IT")}
                                            </span>
                                            <span>Prezzo: {formatEuro(p.totalPrice)}</span>
                                            {p.isFinanced && (
                                                <>
                                                    <span>Rata: {formatEuro(p.monthlyPayment)}/mese</span>
                                                    <span className="text-red-500">Interessi: {formatEuro(p.totalInterest)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onRemovePurchase(p.id)}
                                        className="h-10 w-10 shrink-0 rounded-full text-slate-400 hover:text-red-500"
                                        aria-label="Rimuovi acquisto"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                            <div className="flex items-start gap-2">
                                <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                    Gli acquisti accettati sono gia integrati nei tuoi prestiti. L&apos;impatto e visibile automaticamente nel tab <strong>FIRE</strong> e nel <strong>Patrimonio</strong>.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
});
