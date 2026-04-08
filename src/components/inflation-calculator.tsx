"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingDown, Euro, Calendar, Percent } from "lucide-react";
import { formatEuro, formatPercent } from "@/lib/format";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
    CartesianGrid,
} from "recharts";

export function InflationCalculator() {
    const [amount, setAmount] = useState(100000);
    const [inflationRate, setInflationRate] = useState(2.5);
    const [years, setYears] = useState(20);
    const [nominalReturn, setNominalReturn] = useState(7);

    const data = useMemo(() => {
        const realReturn = ((1 + nominalReturn / 100) / (1 + inflationRate / 100) - 1) * 100;
        const points = [];
        for (let year = 0; year <= years; year++) {
            const inflationFactor = Math.pow(1 + inflationRate / 100, year);
            const purchasingPower = amount / inflationFactor;
            const nominalValue = amount * Math.pow(1 + nominalReturn / 100, year);
            const realValue = nominalValue / inflationFactor;
            points.push({
                anno: year,
                label: `Anno ${year}`,
                "Potere d'Acquisto": Math.round(purchasingPower),
                "Valore Nominale Investito": Math.round(nominalValue),
                "Valore Reale Investito": Math.round(realValue),
            });
        }
        return { points, realReturn };
    }, [amount, inflationRate, years, nominalReturn]);

    const finalPurchasingPower = data.points[data.points.length - 1]["Potere d'Acquisto"];
    const lostValue = amount - finalPurchasingPower;
    const lostPercent = (lostValue / amount) * 100;
    const finalNominal = data.points[data.points.length - 1]["Valore Nominale Investito"];
    const finalReal = data.points[data.points.length - 1]["Valore Reale Investito"];

    return (
        <div className="space-y-6">
            <div className="flex items-start gap-3">
                <div className="rounded-xl bg-red-50 p-2.5 dark:bg-red-950/50">
                    <TrendingDown className="h-6 w-6 text-red-500 dark:text-red-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-foreground">Calcolatore Inflazione</h2>
                    <p className="text-xs text-muted-foreground">Analizza l&apos;impatto dell&apos;inflazione sul tuo capitale nel tempo</p>
                </div>
            </div>

            <Card className="rounded-3xl border border-border/70 bg-card/80 shadow-md backdrop-blur-xl">
                <CardContent className="p-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Euro className="h-3 w-3" /> Capitale Iniziale
                            </Label>
                            <Input
                                type="number"
                                value={amount || ""}
                                onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
                                className="min-h-11 rounded-xl text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Percent className="h-3 w-3" /> Inflazione Annua %
                            </Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={inflationRate || ""}
                                onChange={(e) => setInflationRate(Math.max(0, Number(e.target.value) || 0))}
                                className="min-h-11 rounded-xl text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" /> Orizzonte (anni)
                            </Label>
                            <Input
                                type="number"
                                value={years || ""}
                                onChange={(e) => setYears(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                                className="min-h-11 rounded-xl text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                                <TrendingDown className="h-3 w-3 rotate-180" /> Rendimento Nominale %
                            </Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={nominalReturn || ""}
                                onChange={(e) => setNominalReturn(Number(e.target.value) || 0)}
                                className="min-h-11 rounded-xl text-sm"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">Potere d&apos;Acquisto Finale</p>
                    <p className="mt-1 text-lg font-extrabold text-red-600 dark:text-red-400">{formatEuro(finalPurchasingPower)}</p>
                    <p className="mt-0.5 text-[10px] text-red-400">-{formatPercent(lostPercent, 0)} in {years} anni</p>
                </div>
                <div className="rounded-3xl border border-border/70 bg-muted/35 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Valore Perso</p>
                    <p className="mt-1 text-lg font-extrabold text-foreground">{formatEuro(lostValue)}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">erosione inflazionistica</p>
                </div>
                <div className="rounded-3xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Se Investito (Nominale)</p>
                    <p className="mt-1 text-lg font-extrabold text-blue-600 dark:text-blue-400">{formatEuro(finalNominal)}</p>
                    <p className="mt-0.5 text-[10px] text-blue-400">al {formatPercent(nominalReturn)} annuo</p>
                </div>
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Valore Reale Investito</p>
                    <p className="mt-1 text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{formatEuro(finalReal)}</p>
                    <p className="mt-0.5 text-[10px] text-emerald-400">rendimento reale {formatPercent(data.realReturn)}</p>
                </div>
            </div>

            <Card className="rounded-3xl border border-border/70 bg-card/80 shadow-md backdrop-blur-xl">
                <CardContent className="p-5">
                    <h3 className="mb-4 text-sm font-bold text-muted-foreground">Evoluzione nel Tempo</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.points} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis
                                    dataKey="anno"
                                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                                    tickFormatter={(value: number) => `${value}a`}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                                    tickFormatter={(value: number) => (value >= 1000 ? `${Math.round(value / 1000)}k` : String(value))}
                                />
                                <Tooltip
                                    formatter={(value: number | string | undefined) => formatEuro(Number(value ?? 0))}
                                    labelFormatter={(label) => `Anno ${String(label ?? 0)}`}
                                    contentStyle={{
                                        borderRadius: "16px",
                                        border: "1px solid var(--border)",
                                        backgroundColor: "var(--popover)",
                                        color: "var(--popover-foreground)",
                                        boxShadow: "0 16px 40px -16px rgba(15, 23, 42, 0.45)",
                                    }}
                                />
                                <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }} />
                                <Area
                                    type="monotone"
                                    dataKey="Valore Nominale Investito"
                                    stroke="#3b82f6"
                                    fill="#3b82f6"
                                    fillOpacity={0.1}
                                    strokeWidth={2}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="Valore Reale Investito"
                                    stroke="#10b981"
                                    fill="#10b981"
                                    fillOpacity={0.15}
                                    strokeWidth={2}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="Potere d'Acquisto"
                                    stroke="#ef4444"
                                    fill="#ef4444"
                                    fillOpacity={0.1}
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-2 rounded-3xl border border-amber-200 bg-amber-50/90 p-5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Come leggere il grafico</p>
                <ul className="list-inside list-disc space-y-1 text-xs text-amber-700 dark:text-amber-400">
                    <li><span className="font-bold text-red-500">Linea rossa tratteggiata</span>: quanto valgono i tuoi {formatEuro(amount)} se li tieni fermi (potere d&apos;acquisto reale)</li>
                    <li><span className="font-bold text-blue-500">Area blu</span>: valore nominale se investiti al {formatPercent(nominalReturn)} (quello che vedi sul conto)</li>
                    <li><span className="font-bold text-emerald-500">Area verde</span>: valore reale degli investimenti (al netto dell&apos;inflazione, il vero guadagno)</li>
                </ul>
            </div>
        </div>
    );
}
