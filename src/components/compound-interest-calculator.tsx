"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Calculator, TrendingUp, Banknote, PiggyBank } from "lucide-react";
import { formatEuro } from "@/lib/format";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend,
} from "recharts";

export function CompoundInterestCalculator() {
    const [initialCapital, setInitialCapital] = useState(10000);
    const [monthlyContribution, setMonthlyContribution] = useState(300);
    const [annualRate, setAnnualRate] = useState(7);
    const [years, setYears] = useState(20);

    const result = useMemo(() => {
        const monthlyRate = annualRate / 100 / 12;
        const chartData: { anno: number; label: string; Versato: number; Interessi: number; Totale: number }[] = [];

        let balance = initialCapital;
        let totalDeposited = initialCapital;

        chartData.push({
            anno: 0,
            label: "Oggi",
            Versato: initialCapital,
            Interessi: 0,
            Totale: initialCapital,
        });

        for (let year = 1; year <= years; year++) {
            for (let month = 1; month <= 12; month++) {
                balance = balance * (1 + monthlyRate) + monthlyContribution;
                totalDeposited += monthlyContribution;
            }
            chartData.push({
                anno: year,
                label: `Anno ${year}`,
                Versato: Math.round(totalDeposited),
                Interessi: Math.round(balance - totalDeposited),
                Totale: Math.round(balance),
            });
        }

        return {
            finalBalance: balance,
            totalDeposited,
            totalInterest: balance - totalDeposited,
            chartData,
        };
    }, [initialCapital, monthlyContribution, annualRate, years]);

    return (
        <div className="space-y-8 animate-in fade-in-50 duration-500">
            {/* Header */}
            <div className="text-center space-y-4 pt-4 pb-6">
                <div className="inline-flex items-center justify-center p-3 bg-white/70 dark:bg-slate-900/70 border border-white dark:border-slate-800 rounded-2xl shadow-sm mb-2 backdrop-blur-md">
                    <Calculator className="w-8 h-8 text-teal-600 dark:text-teal-400" />
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center justify-center gap-3">
                    Interesse <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600">Composto</span>
                </h1>
                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
                    Simula la crescita del tuo capitale nel tempo con contributi mensili regolari e il potere dell&apos;interesse composto.
                </p>
            </div>

            <div className="grid lg:grid-cols-12 gap-8">
                {/* Input Panel */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 shadow-md rounded-3xl overflow-hidden">
                        <CardContent className="p-6 space-y-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <PiggyBank className="w-5 h-5 text-teal-500" /> Parametri
                            </h3>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Capitale Iniziale</Label>
                                <Input type="number" step={1000} value={initialCapital}
                                    onChange={e => setInitialCapital(Number(e.target.value))}
                                    className="text-lg font-bold text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900" />
                                <Slider value={[initialCapital]} min={0} max={200000} step={1000}
                                    onValueChange={v => setInitialCapital(v[0])} />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contributo Mensile</Label>
                                <Input type="number" step={50} value={monthlyContribution}
                                    onChange={e => setMonthlyContribution(Number(e.target.value))}
                                    className="text-lg font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900" />
                                <Slider value={[monthlyContribution]} min={0} max={5000} step={50}
                                    onValueChange={v => setMonthlyContribution(v[0])} />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rendimento Annuo (%)</Label>
                                    <span className="font-bold text-purple-600 dark:text-purple-400">{annualRate.toFixed(1)}%</span>
                                </div>
                                <Slider value={[annualRate]} min={0} max={15} step={0.5}
                                    onValueChange={v => setAnnualRate(v[0])} />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Durata (anni)</Label>
                                    <span className="font-bold text-slate-900 dark:text-slate-100">{years}</span>
                                </div>
                                <Slider value={[years]} min={1} max={50} step={1}
                                    onValueChange={v => setYears(v[0])} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Summary Numbers */}
                    <div className="grid grid-cols-1 gap-3">
                        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 p-5 rounded-2xl shadow-md text-center">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Capitale Finale</div>
                            <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{formatEuro(result.finalBalance)}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-center">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                                    <Banknote className="w-3 h-3" /> Totale Versato
                                </div>
                                <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400">{formatEuro(result.totalDeposited)}</div>
                            </div>
                            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-center">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                                    <TrendingUp className="w-3 h-3" /> Interessi Guadagnati
                                </div>
                                <div className="text-xl font-extrabold text-purple-600 dark:text-purple-400">{formatEuro(result.totalInterest)}</div>
                            </div>
                        </div>
                        <div className="bg-slate-100/80 dark:bg-slate-800/80 p-3 rounded-xl text-center">
                            <span className="text-xs text-slate-500">Il {((result.totalInterest / result.finalBalance) * 100).toFixed(0)}% del capitale finale proviene dagli interessi composti</span>
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div className="lg:col-span-8">
                    <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 shadow-md rounded-3xl overflow-hidden">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-6">
                                <TrendingUp className="w-5 h-5 text-emerald-500" /> Crescita del Capitale
                            </h3>
                            <div className="h-[450px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={result.chartData} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
                                        <defs>
                                            <linearGradient id="colorVersato" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorInteressi" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={10} interval="preserveStartEnd" />
                                        <YAxis tickFormatter={v => `\u20AC${Math.round(v / 1000)}k`} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dx={-10} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', borderRadius: '1rem', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }}
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            formatter={(value: any) => [formatEuro(Number(value)), undefined]}
                                        />
                                        <Legend verticalAlign="top" height={40} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#475569' }} />
                                        <Area type="monotone" dataKey="Versato" stackId="1" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorVersato)" />
                                        <Area type="monotone" dataKey="Interessi" stackId="1" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorInteressi)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Year-by-year table */}
                            <div className="mt-6 max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                                        <tr>
                                            <th className="text-left px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Anno</th>
                                            <th className="text-right px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Versato</th>
                                            <th className="text-right px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Interessi</th>
                                            <th className="text-right px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Totale</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.chartData.filter(d => d.anno > 0).map(d => (
                                            <tr key={d.anno} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                                <td className="px-3 py-2 font-bold text-slate-700 dark:text-slate-300">{d.anno}</td>
                                                <td className="px-3 py-2 text-right font-mono text-blue-600 dark:text-blue-400">{formatEuro(d.Versato)}</td>
                                                <td className="px-3 py-2 text-right font-mono text-purple-600 dark:text-purple-400">{formatEuro(d.Interessi)}</td>
                                                <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatEuro(d.Totale)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
