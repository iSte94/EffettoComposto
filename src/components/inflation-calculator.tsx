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
        for (let y = 0; y <= years; y++) {
            const inflationFactor = Math.pow(1 + inflationRate / 100, y);
            const purchasingPower = amount / inflationFactor;
            const nominalValue = amount * Math.pow(1 + nominalReturn / 100, y);
            const realValue = nominalValue / inflationFactor;
            points.push({
                anno: y,
                label: `Anno ${y}`,
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
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-50 dark:bg-red-950/50 rounded-xl">
                    <TrendingDown className="w-6 h-6 text-red-500 dark:text-red-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Calcolatore Inflazione</h2>
                    <p className="text-xs text-slate-500">Analizza l&apos;impatto dell&apos;inflazione sul tuo capitale nel tempo</p>
                </div>
            </div>

            {/* Inputs */}
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 rounded-2xl shadow-md">
                <CardContent className="p-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-500 flex items-center gap-1">
                                <Euro className="w-3 h-3" /> Capitale Iniziale
                            </Label>
                            <Input
                                type="number"
                                value={amount || ""}
                                onChange={e => setAmount(Math.max(0, Number(e.target.value) || 0))}
                                className="h-9 text-sm rounded-lg"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-500 flex items-center gap-1">
                                <Percent className="w-3 h-3" /> Inflazione Annua %
                            </Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={inflationRate || ""}
                                onChange={e => setInflationRate(Math.max(0, Number(e.target.value) || 0))}
                                className="h-9 text-sm rounded-lg"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Orizzonte (anni)
                            </Label>
                            <Input
                                type="number"
                                value={years || ""}
                                onChange={e => setYears(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                                className="h-9 text-sm rounded-lg"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-slate-500 flex items-center gap-1">
                                <TrendingDown className="w-3 h-3 rotate-180" /> Rendimento Nominale %
                            </Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={nominalReturn || ""}
                                onChange={e => setNominalReturn(Number(e.target.value) || 0)}
                                className="h-9 text-sm rounded-lg"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Potere d&apos;Acquisto Finale</p>
                    <p className="text-lg font-extrabold text-red-600 dark:text-red-400 mt-1">{formatEuro(finalPurchasingPower)}</p>
                    <p className="text-[10px] text-red-400 mt-0.5">-{formatPercent(lostPercent, 0)} in {years} anni</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valore Perso</p>
                    <p className="text-lg font-extrabold text-slate-700 dark:text-slate-300 mt-1">{formatEuro(lostValue)}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">erosione inflazionistica</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Se Investito (Nominale)</p>
                    <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400 mt-1">{formatEuro(finalNominal)}</p>
                    <p className="text-[10px] text-blue-400 mt-0.5">al {formatPercent(nominalReturn)} annuo</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Valore Reale Investito</p>
                    <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{formatEuro(finalReal)}</p>
                    <p className="text-[10px] text-emerald-400 mt-0.5">rendimento reale {formatPercent(data.realReturn)}</p>
                </div>
            </div>

            {/* Chart */}
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 rounded-2xl shadow-md">
                <CardContent className="p-5">
                    <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-4">Evoluzione nel Tempo</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.points} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="anno"
                                    tick={{ fontSize: 10 }}
                                    tickFormatter={(v: number) => `${v}a`}
                                />
                                <YAxis
                                    tick={{ fontSize: 10 }}
                                    tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
                                />
                                <Tooltip
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    formatter={(value: any) => formatEuro(Number(value))}
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    labelFormatter={(label: any) => `Anno ${label}`}
                                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)" }}
                                />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
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

            {/* Explanation */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 text-sm text-amber-800 dark:text-amber-300 space-y-2">
                <p className="font-bold text-xs uppercase tracking-widest text-amber-600">Come leggere il grafico</p>
                <ul className="text-xs space-y-1 list-disc list-inside text-amber-700 dark:text-amber-400">
                    <li><span className="text-red-500 font-bold">Linea rossa tratteggiata</span>: quanto valgono i tuoi {formatEuro(amount)} se li tieni fermi (potere d&apos;acquisto reale)</li>
                    <li><span className="text-blue-500 font-bold">Area blu</span>: valore nominale se investiti al {formatPercent(nominalReturn)} (quello che vedi sul conto)</li>
                    <li><span className="text-emerald-500 font-bold">Area verde</span>: valore reale degli investimenti (al netto dell&apos;inflazione, il vero guadagno)</li>
                </ul>
            </div>
        </div>
    );
}
