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

    const sorted = [...debts].sort((a, b) => (strategy === "snowball" ? a.balance - b.balance : b.rate - a.rate));
    const order = sorted.map((debt) => debt.name);

    const balances = new Map(sorted.map((debt) => [debt.id, debt.balance]));
    const rates = new Map(sorted.map((debt) => [debt.id, debt.rate / 100 / 12]));
    const mins = new Map(sorted.map((debt) => [debt.id, debt.minPayment]));

    let totalInterest = 0;
    let months = 0;
    const maxMonths = 600;

    while (months < maxMonths) {
        const activeDebts = sorted.filter((debt) => (balances.get(debt.id) || 0) > 0.01);
        if (activeDebts.length === 0) break;

        months++;

        for (const debt of activeDebts) {
            const balance = balances.get(debt.id) || 0;
            const interest = balance * (rates.get(debt.id) || 0);
            totalInterest += interest;
            balances.set(debt.id, balance + interest);
        }

        let remaining = extraMonthly;
        for (const debt of activeDebts) {
            const balance = balances.get(debt.id) || 0;
            const minimum = Math.min(mins.get(debt.id) || 0, balance);
            balances.set(debt.id, balance - minimum);
        }

        for (const debt of sorted) {
            const balance = balances.get(debt.id) || 0;
            if (balance <= 0.01) continue;
            const payment = Math.min(remaining, balance);
            balances.set(debt.id, balance - payment);
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
        setDebts((prev) => [...prev, { id: Date.now().toString(), name: "", balance: 0, rate: 0, minPayment: 50 }]);
    };

    const removeDebt = (id: string) => {
        setDebts((prev) => prev.filter((debt) => debt.id !== id));
    };

    const updateDebt = (id: string, updates: Partial<Debt>) => {
        setDebts((prev) => prev.map((debt) => (debt.id === id ? { ...debt, ...updates } : debt)));
    };

    const results = useMemo(() => {
        const validDebts = debts.filter((debt) => debt.balance > 0 && debt.rate > 0 && debt.minPayment > 0);
        if (validDebts.length === 0) return null;
        return {
            snowball: simulatePayoff(validDebts, "snowball", extraMonthly),
            avalanche: simulatePayoff(validDebts, "avalanche", extraMonthly),
        };
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
            <Card className="overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-md backdrop-blur-xl">
                <CardContent className="space-y-5 p-5 sm:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                            <Scale className="h-5 w-5 text-indigo-500" /> Strategia Estinzione Debiti
                        </h3>
                        <Button variant="outline" size="sm" className="min-h-10 rounded-xl text-xs sm:self-auto" onClick={addDebt}>
                            <Plus className="mr-1 h-3 w-3" /> Aggiungi Debito
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {debts.map((debt) => (
                            <div key={debt.id} className="rounded-2xl border border-border/70 bg-background/60 p-3">
                                <div className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,0.9fr))_auto] md:items-end">
                                    <div>
                                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Nome</Label>
                                        <Input
                                            value={debt.name}
                                            onChange={(e) => updateDebt(debt.id, { name: e.target.value })}
                                            placeholder="Es. Carta di credito"
                                            className="min-h-10 rounded-xl border-border/70 bg-transparent text-sm"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Saldo</Label>
                                        <Input
                                            type="number"
                                            value={debt.balance}
                                            onChange={(e) => updateDebt(debt.id, { balance: Number(e.target.value) })}
                                            className="min-h-10 rounded-xl border-border/70 bg-transparent text-sm font-bold text-red-600 dark:text-red-400"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Tasso %</Label>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            value={debt.rate}
                                            onChange={(e) => updateDebt(debt.id, { rate: Number(e.target.value) })}
                                            className="min-h-10 rounded-xl border-border/70 bg-transparent text-sm font-mono"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Rata Min.</Label>
                                        <Input
                                            type="number"
                                            value={debt.minPayment}
                                            onChange={(e) => updateDebt(debt.id, { minPayment: Number(e.target.value) })}
                                            className="min-h-10 rounded-xl border-border/70 bg-transparent text-sm font-mono"
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20"
                                            onClick={() => removeDebt(debt.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-2 border-t border-border/70 pt-3">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Budget Extra Mensile per Estinzione</Label>
                        <Input
                            type="number"
                            step={50}
                            value={extraMonthly}
                            onChange={(e) => setExtraMonthly(Number(e.target.value))}
                            className="min-h-11 border-indigo-200 bg-indigo-50/60 text-lg font-bold text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300"
                        />
                        <p className="text-[10px] text-muted-foreground">Importo aggiuntivo oltre le rate minime da destinare al debito prioritario.</p>
                    </div>
                </CardContent>
            </Card>

            {results && (
                <div className="grid gap-6 xl:grid-cols-2">
                    <Card className="overflow-hidden rounded-3xl border border-blue-200 bg-blue-50/70 dark:border-blue-900 dark:bg-blue-950/20">
                        <CardContent className="space-y-4 p-6">
                            <h4 className="flex items-center gap-2 text-lg font-bold text-blue-700 dark:text-blue-300">
                                <Snowflake className="h-5 w-5" /> Metodo Snowball
                            </h4>
                            <p className="text-xs text-blue-700/75 dark:text-blue-400/75">Estingui prima il debito con il saldo piu basso. Motivazione psicologica: vedi risultati rapidi.</p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl bg-white/70 p-3 text-center dark:bg-slate-900/50">
                                    <div className="text-[10px] font-bold uppercase text-blue-500">Tempo Totale</div>
                                    <div className="text-2xl font-extrabold text-blue-700 dark:text-blue-300">{Math.ceil(results.snowball.months / 12)} anni</div>
                                    <div className="text-xs text-blue-500">{results.snowball.months} mesi</div>
                                </div>
                                <div className="rounded-2xl bg-white/70 p-3 text-center dark:bg-slate-900/50">
                                    <div className="text-[10px] font-bold uppercase text-blue-500">Interessi Pagati</div>
                                    <div className="text-2xl font-extrabold text-red-500">{formatEuro(results.snowball.totalInterest)}</div>
                                </div>
                            </div>
                            <div className="rounded-2xl bg-background/60 p-3 text-[10px] text-blue-700 dark:text-blue-300">
                                <span className="font-bold">Ordine:</span> {results.snowball.order.join(" -> ")}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden rounded-3xl border border-orange-200 bg-orange-50/70 dark:border-orange-900 dark:bg-orange-950/20">
                        <CardContent className="space-y-4 p-6">
                            <h4 className="flex items-center gap-2 text-lg font-bold text-orange-700 dark:text-orange-300">
                                <Flame className="h-5 w-5" /> Metodo Avalanche
                            </h4>
                            <p className="text-xs text-orange-700/75 dark:text-orange-400/75">Estingui prima il debito con il tasso piu alto. Matematicamente ottimale: risparmi piu interessi.</p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="rounded-2xl bg-white/70 p-3 text-center dark:bg-slate-900/50">
                                    <div className="text-[10px] font-bold uppercase text-orange-500">Tempo Totale</div>
                                    <div className="text-2xl font-extrabold text-orange-700 dark:text-orange-300">{Math.ceil(results.avalanche.months / 12)} anni</div>
                                    <div className="text-xs text-orange-500">{results.avalanche.months} mesi</div>
                                </div>
                                <div className="rounded-2xl bg-white/70 p-3 text-center dark:bg-slate-900/50">
                                    <div className="text-[10px] font-bold uppercase text-orange-500">Interessi Pagati</div>
                                    <div className="text-2xl font-extrabold text-red-500">{formatEuro(results.avalanche.totalInterest)}</div>
                                </div>
                            </div>
                            <div className="rounded-2xl bg-background/60 p-3 text-[10px] text-orange-700 dark:text-orange-300">
                                <span className="font-bold">Ordine:</span> {results.avalanche.order.join(" -> ")}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {results && (
                <Card className="overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-md backdrop-blur-xl">
                    <CardContent className="p-6">
                        <h4 className="mb-4 text-sm font-bold text-foreground">Confronto Visuale</h4>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={comparisonData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12, fontWeight: 600 }} />
                                    <YAxis yAxisId="left" tickFormatter={(value: number) => `${value}m`} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                                    <YAxis yAxisId="right" orientation="right" tickFormatter={(value: number) => `€${(value / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: "12px",
                                            border: "1px solid var(--border)",
                                            boxShadow: "0 10px 40px -10px rgba(15,23,42,0.35)",
                                            backgroundColor: "var(--popover)",
                                            color: "var(--popover-foreground)",
                                        }}
                                        formatter={(value: number | string | undefined) => [typeof value === "number" && value < 1000 ? `${value} mesi` : formatEuro(Number(value ?? 0)), undefined]}
                                    />
                                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: "11px", fontWeight: 600 }} />
                                    <Bar yAxisId="left" dataKey="Mesi" radius={[8, 8, 0, 0]}>
                                        {comparisonData.map((_, index) => (
                                            <Cell key={index} fill={index === 0 ? "#3b82f6" : "#f97316"} />
                                        ))}
                                    </Bar>
                                    <Bar yAxisId="right" dataKey="Interessi Totali" radius={[8, 8, 0, 0]}>
                                        {comparisonData.map((_, index) => (
                                            <Cell key={index} fill={index === 0 ? "#93c5fd" : "#fdba74"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {results.avalanche.totalInterest < results.snowball.totalInterest && (
                            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                                <span className="font-bold">Risparmio con Avalanche:</span> {formatEuro(results.snowball.totalInterest - results.avalanche.totalInterest)} in meno di interessi
                                {results.snowball.months !== results.avalanche.months && (
                                    <> e {Math.abs(results.snowball.months - results.avalanche.months)} mesi {results.avalanche.months < results.snowball.months ? "prima" : "dopo"}</>
                                )}
                                .
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
