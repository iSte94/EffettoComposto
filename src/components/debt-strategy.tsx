"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Snowflake, Flame, Scale } from "lucide-react";
import { formatEuro } from "@/lib/format";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend, Cell,
} from "recharts";

interface Debt {
    id: string;
    name: string;
    balance: number;
    rate: number;
    minPayment: number;
}

interface PayoffResult {
    months: number;
    totalInterest: number;
    order: string[];
}

function simulatePayoff(debts: Debt[], strategy: "snowball" | "avalanche", extraMonthly: number): PayoffResult {
    if (debts.length === 0) return { months: 0, totalInterest: 0, order: [] };

    const sorted = [...debts].sort((a, b) =>
        strategy === "snowball" ? a.balance - b.balance : b.rate - a.rate
    );
    const order = sorted.map(d => d.name);

    const balances = new Map(sorted.map(d => [d.id, d.balance]));
    const rates = new Map(sorted.map(d => [d.id, d.rate / 100 / 12]));
    const mins = new Map(sorted.map(d => [d.id, d.minPayment]));

    let totalInterest = 0;
    let months = 0;
    const maxMonths = 600; // 50 years safety cap

    while (months < maxMonths) {
        const activeDebts = sorted.filter(d => (balances.get(d.id) || 0) > 0.01);
        if (activeDebts.length === 0) break;

        months++;

        // Accrue interest
        for (const d of activeDebts) {
            const bal = balances.get(d.id) || 0;
            const interest = bal * (rates.get(d.id) || 0);
            totalInterest += interest;
            balances.set(d.id, bal + interest);
        }

        // Pay minimums
        let remaining = extraMonthly;
        for (const d of activeDebts) {
            const bal = balances.get(d.id) || 0;
            const min = Math.min(mins.get(d.id) || 0, bal);
            balances.set(d.id, bal - min);
        }

        // Apply extra to first priority debt
        for (const d of sorted) {
            const bal = balances.get(d.id) || 0;
            if (bal <= 0.01) continue;
            const payment = Math.min(remaining, bal);
            balances.set(d.id, bal - payment);
            remaining -= payment;
            if (remaining <= 0) break;
        }
    }

    return { months, totalInterest, order };
}

export function DebtStrategy() {
    const [debts, setDebts] = useState<Debt[]>([
        { id: "1", name: "Carta di Credito", balance: 5000, rate: 18, minPayment: 100 },
        { id: "2", name: "Prestito Auto", balance: 12000, rate: 5.5, minPayment: 250 },
    ]);
    const [extraMonthly, setExtraMonthly] = useState(200);

    const addDebt = () => {
        setDebts(prev => [...prev, { id: Date.now().toString(), name: "", balance: 0, rate: 0, minPayment: 50 }]);
    };

    const removeDebt = (id: string) => {
        setDebts(prev => prev.filter(d => d.id !== id));
    };

    const updateDebt = (id: string, updates: Partial<Debt>) => {
        setDebts(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    };

    const results = useMemo(() => {
        const validDebts = debts.filter(d => d.balance > 0 && d.rate > 0 && d.minPayment > 0);
        if (validDebts.length === 0) return null;
        const snowball = simulatePayoff(validDebts, "snowball", extraMonthly);
        const avalanche = simulatePayoff(validDebts, "avalanche", extraMonthly);
        const totalDebt = validDebts.reduce((acc, d) => acc + d.balance, 0);
        return { snowball, avalanche, totalDebt };
    }, [debts, extraMonthly]);

    const comparisonData = useMemo(() => {
        if (!results) return [];
        return [
            {
                name: "Snowball",
                Mesi: results.snowball.months,
                "Interessi Totali": Math.round(results.snowball.totalInterest),
            },
            {
                name: "Avalanche",
                Mesi: results.avalanche.months,
                "Interessi Totali": Math.round(results.avalanche.totalInterest),
            },
        ];
    }, [results]);

    return (
        <div className="space-y-6">
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 shadow-md rounded-3xl overflow-hidden">
                <CardContent className="p-6 space-y-5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Scale className="w-5 h-5 text-indigo-500" /> Strategia Estinzione Debiti
                        </h3>
                        <Button variant="outline" size="sm" className="text-xs rounded-xl" onClick={addDebt}>
                            <Plus className="w-3 h-3 mr-1" /> Aggiungi Debito
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {debts.map(debt => (
                            <div key={debt.id} className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="grid grid-cols-12 gap-2 items-end">
                                    <div className="col-span-4">
                                        <Label className="text-[10px] text-slate-500 uppercase font-bold">Nome</Label>
                                        <Input value={debt.name} onChange={e => updateDebt(debt.id, { name: e.target.value })}
                                            placeholder="Es. Carta di credito"
                                            className="h-8 text-sm bg-transparent border-slate-200 dark:border-slate-700" />
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-[10px] text-slate-500 uppercase font-bold">Saldo</Label>
                                        <Input type="number" value={debt.balance} onChange={e => updateDebt(debt.id, { balance: Number(e.target.value) })}
                                            className="h-8 text-sm font-mono font-bold text-red-600 dark:text-red-400 bg-transparent border-slate-200 dark:border-slate-700" />
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-[10px] text-slate-500 uppercase font-bold">Tasso %</Label>
                                        <Input type="number" step="0.1" value={debt.rate} onChange={e => updateDebt(debt.id, { rate: Number(e.target.value) })}
                                            className="h-8 text-sm font-mono bg-transparent border-slate-200 dark:border-slate-700" />
                                    </div>
                                    <div className="col-span-3">
                                        <Label className="text-[10px] text-slate-500 uppercase font-bold">Rata Min.</Label>
                                        <Input type="number" value={debt.minPayment} onChange={e => updateDebt(debt.id, { minPayment: Number(e.target.value) })}
                                            className="h-8 text-sm font-mono bg-transparent border-slate-200 dark:border-slate-700" />
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:text-rose-600" onClick={() => removeDebt(debt.id)}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Budget Extra Mensile per Estinzione</Label>
                        <Input type="number" step={50} value={extraMonthly}
                            onChange={e => setExtraMonthly(Number(e.target.value))}
                            className="text-lg font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900" />
                        <p className="text-[10px] text-slate-500">Importo aggiuntivo oltre le rate minime da destinare al debito prioritario.</p>
                    </div>
                </CardContent>
            </Card>

            {results && (
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Snowball */}
                    <Card className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-3xl overflow-hidden">
                        <CardContent className="p-6 space-y-4">
                            <h4 className="text-lg font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                                <Snowflake className="w-5 h-5" /> Metodo Snowball
                            </h4>
                            <p className="text-xs text-blue-600/70 dark:text-blue-400/70">Estingui prima il debito con il saldo piu basso. Motivazione psicologica: vedi risultati rapidi.</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="text-center p-3 bg-white/70 dark:bg-slate-900/50 rounded-xl">
                                    <div className="text-[10px] font-bold text-blue-500 uppercase">Tempo Totale</div>
                                    <div className="text-2xl font-extrabold text-blue-700 dark:text-blue-300">{Math.ceil(results.snowball.months / 12)} anni</div>
                                    <div className="text-xs text-blue-500">{results.snowball.months} mesi</div>
                                </div>
                                <div className="text-center p-3 bg-white/70 dark:bg-slate-900/50 rounded-xl">
                                    <div className="text-[10px] font-bold text-blue-500 uppercase">Interessi Pagati</div>
                                    <div className="text-2xl font-extrabold text-red-500">{formatEuro(results.snowball.totalInterest)}</div>
                                </div>
                            </div>
                            <div className="text-[10px] text-blue-600 dark:text-blue-400">
                                <span className="font-bold">Ordine:</span> {results.snowball.order.join(" → ")}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Avalanche */}
                    <Card className="bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-3xl overflow-hidden">
                        <CardContent className="p-6 space-y-4">
                            <h4 className="text-lg font-bold text-orange-700 dark:text-orange-300 flex items-center gap-2">
                                <Flame className="w-5 h-5" /> Metodo Avalanche
                            </h4>
                            <p className="text-xs text-orange-600/70 dark:text-orange-400/70">Estingui prima il debito con il tasso piu alto. Matematicamente ottimale: risparmi piu interessi.</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="text-center p-3 bg-white/70 dark:bg-slate-900/50 rounded-xl">
                                    <div className="text-[10px] font-bold text-orange-500 uppercase">Tempo Totale</div>
                                    <div className="text-2xl font-extrabold text-orange-700 dark:text-orange-300">{Math.ceil(results.avalanche.months / 12)} anni</div>
                                    <div className="text-xs text-orange-500">{results.avalanche.months} mesi</div>
                                </div>
                                <div className="text-center p-3 bg-white/70 dark:bg-slate-900/50 rounded-xl">
                                    <div className="text-[10px] font-bold text-orange-500 uppercase">Interessi Pagati</div>
                                    <div className="text-2xl font-extrabold text-red-500">{formatEuro(results.avalanche.totalInterest)}</div>
                                </div>
                            </div>
                            <div className="text-[10px] text-orange-600 dark:text-orange-400">
                                <span className="font-bold">Ordine:</span> {results.avalanche.order.join(" → ")}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {results && (
                <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 shadow-md rounded-3xl overflow-hidden">
                    <CardContent className="p-6">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">Confronto Visuale</h4>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={comparisonData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                                    <YAxis yAxisId="left" tickFormatter={v => `${v}m`} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                    <YAxis yAxisId="right" orientation="right" tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)', backgroundColor: 'rgba(255,255,255,0.95)' }}
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        formatter={(value: any) => [typeof value === 'number' && value < 1000 ? `${value} mesi` : formatEuro(Number(value)), undefined]}
                                    />
                                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                                    <Bar yAxisId="left" dataKey="Mesi" radius={[8, 8, 0, 0]}>
                                        {comparisonData.map((_, i) => (
                                            <Cell key={i} fill={i === 0 ? "#3b82f6" : "#f97316"} />
                                        ))}
                                    </Bar>
                                    <Bar yAxisId="right" dataKey="Interessi Totali" radius={[8, 8, 0, 0]}>
                                        {comparisonData.map((_, i) => (
                                            <Cell key={i} fill={i === 0 ? "#93c5fd" : "#fdba74"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {results.avalanche.totalInterest < results.snowball.totalInterest && (
                            <div className="mt-4 p-3 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900 text-sm text-emerald-700 dark:text-emerald-300">
                                <span className="font-bold">Risparmio con Avalanche:</span> {formatEuro(results.snowball.totalInterest - results.avalanche.totalInterest)} in meno di interessi
                                {results.snowball.months !== results.avalanche.months && (
                                    <> e {Math.abs(results.snowball.months - results.avalanche.months)} mesi {results.avalanche.months < results.snowball.months ? "prima" : "dopo"}</>
                                )}.
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
