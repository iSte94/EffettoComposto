"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { LineChart as LineChartIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEuro } from "@/lib/format";
import {
    CHART_AXIS_PROPS,
    CHART_COLORS,
    CHART_CURSOR,
    CHART_GRID_PROPS,
    CHART_LEGEND_STYLE,
    CHART_TOOLTIP_ITEM_STYLE,
    CHART_TOOLTIP_LABEL_STYLE,
    CHART_TOOLTIP_STYLE,
    formatCompactEuroAxis,
} from "@/components/ui/chart-style";

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
                            <ComposedChart data={chartData} margin={{ top: 22, right: 18, left: 4, bottom: 16 }}>
                                <defs>
                                    <linearGradient id="colorPatrimonio" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_COLORS.wealth} stopOpacity={0.22} />
                                        <stop offset="95%" stopColor={CHART_COLORS.wealth} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorDebiti" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={CHART_COLORS.debt} stopOpacity={0} />
                                        <stop offset="95%" stopColor={CHART_COLORS.debt} stopOpacity={0.18} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid {...CHART_GRID_PROPS} />
                                <XAxis dataKey="name" {...CHART_AXIS_PROPS} dy={10} minTickGap={22} />
                                <YAxis {...CHART_AXIS_PROPS} tickFormatter={formatCompactEuroAxis} width={66} />
                                <Tooltip
                                    contentStyle={CHART_TOOLTIP_STYLE}
                                    labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                                    itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                                    cursor={CHART_CURSOR}
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    formatter={(value: any) => [formatEuro(Number(value)), undefined]}
                                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                                />
                                <Legend verticalAlign="top" height={40} iconType="circle" wrapperStyle={CHART_LEGEND_STYLE} />

                                <Area type="monotone" dataKey="Patrimonio" stroke={CHART_COLORS.wealth} strokeWidth={4} fillOpacity={1} fill="url(#colorPatrimonio)" activeDot={{ r: 7, strokeWidth: 0, fill: CHART_COLORS.wealth, filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.35))' }} />
                                <Area type="monotone" dataKey="Debiti" stroke={CHART_COLORS.debt} strokeWidth={2.5} fillOpacity={1} fill="url(#colorDebiti)" activeDot={false} />
                                <Line type="monotone" dataKey="Immobili" stroke={CHART_COLORS.realEstate} strokeWidth={2.4} dot={false} />
                                <Line type="monotone" dataKey="Liquidità" stroke={CHART_COLORS.liquidity} strokeWidth={2.4} dot={false} />
                                <Line type="monotone" dataKey="Altre Attività" stroke={CHART_COLORS.neutral} strokeWidth={2.4} dot={false} />
                                <Line type="monotone" dataKey="Bitcoin" stroke={CHART_COLORS.bitcoin} strokeWidth={2.4} dot={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
});
