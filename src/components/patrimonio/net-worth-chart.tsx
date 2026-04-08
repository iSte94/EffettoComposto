"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { LineChart as LineChartIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEuro } from "@/lib/format";

interface ChartDataPoint {
    name: string;
    fullDate: string;
    Patrimonio: number | undefined;
    Immobili: number;
    "Liquidità": number;
    "Altre Attività": number;
    Bitcoin: number;
    Debiti: number;
}

interface NetWorthChartProps {
    chartData: ChartDataPoint[];
    loading: boolean;
    isEmpty: boolean;
}

export const NetWorthChart = memo(function NetWorthChart({ chartData, loading, isEmpty }: NetWorthChartProps) {
    return (
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 shadow-xl overflow-hidden rounded-3xl">
            <CardHeader className="bg-white/50 dark:bg-slate-800/50 border-b border-white dark:border-slate-800 pb-8 pt-8 px-8">
                <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
                    <LineChartIcon className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" /> Andamento nel Tempo
                </CardTitle>
                <CardDescription className="text-base text-slate-500">
                    Traccia la crescita del tuo patrimonio netto inserendo periodicamente dei nuovi Snapshot.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-2 md:p-8 pt-8">
                {loading ? (
                    <Skeleton className="w-full h-[400px] rounded-2xl bg-white/50 dark:bg-slate-800/50" />
                ) : isEmpty ? (
                    <div role="status" aria-label="Nessun dato storico disponibile. Salva il tuo primo Snapshot per iniziare." className="h-[400px] flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-300 rounded-2xl bg-white/50 dark:bg-slate-800/50">
                        <LineChartIcon className="w-12 h-12 mb-4 opacity-50 text-slate-400" aria-hidden="true" />
                        <p className="font-medium text-slate-700 dark:text-slate-300">Nessun dato storico.</p>
                        <p className="text-sm">Salva il tuo primo Snapshot per iniziare il tracciamento!</p>
                    </div>
                ) : (
                    <div className="h-[450px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                                <defs>
                                    <linearGradient id="colorPatrimonio" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorDebiti" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                <YAxis tickFormatter={(val) => `\u20AC${Math.round(val / 1000)}k`} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(16px)', borderRadius: '1rem', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }}
                                    labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}
                                    itemStyle={{ color: '#334155', border: 'none' }}
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    formatter={(value: any) => [formatEuro(Number(value)), undefined]}
                                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                                />
                                <Legend verticalAlign="top" height={40} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#475569', paddingBottom: '20px' }} />

                                <Area type="monotone" dataKey="Patrimonio" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorPatrimonio)" activeDot={{ r: 8, strokeWidth: 0, fill: '#10b981', filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.4))' }} />
                                <Area type="monotone" dataKey="Debiti" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorDebiti)" activeDot={false} />
                                <Line type="monotone" dataKey="Immobili" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="Liquidità" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="Altre Attività" stroke="#64748b" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="Bitcoin" stroke="#f59e0b" strokeWidth={2} dot={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
});
