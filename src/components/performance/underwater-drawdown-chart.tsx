"use client";

import { memo, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceDot, ReferenceLine } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, ArrowDownRight } from "lucide-react";

export interface UnderwaterPoint {
    date: string;       // ISO YYYY-MM-DD
    drawdown: number;   // %, 0 at peak, negative while underwater
}

interface UnderwaterDrawdownChartProps {
    data: UnderwaterPoint[];
    maxDrawdown?: number | null;
    maxDrawdownDate?: string | null;
    currentDrawdown?: number | null;
    loading?: boolean;
}

const MONTH_LABELS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

function formatMonthLabel(iso: string): string {
    const [y, m] = iso.slice(0, 7).split("-").map(Number);
    if (!y || !m) return iso;
    return `${MONTH_LABELS[m - 1]} ${String(y).slice(2)}`;
}

function formatFullDate(iso: string): string {
    const [y, m] = iso.slice(0, 7).split("-").map(Number);
    if (!y || !m) return iso;
    return `${MONTH_LABELS[m - 1]} ${y}`;
}

export const UnderwaterDrawdownChart = memo(function UnderwaterDrawdownChart({
    data,
    maxDrawdown,
    maxDrawdownDate,
    currentDrawdown,
    loading,
}: UnderwaterDrawdownChartProps) {
    const { chartData, minValue, troughPoint } = useMemo(() => {
        if (!data || data.length === 0) {
            return { chartData: [], minValue: 0, troughPoint: null as null | { date: string; drawdown: number } };
        }
        const min = data.reduce((m, p) => (p.drawdown < m ? p.drawdown : m), 0);
        let trough: { date: string; drawdown: number } | null = null;
        for (const p of data) {
            if (!trough || p.drawdown < trough.drawdown) trough = { date: p.date, drawdown: p.drawdown };
        }
        return { chartData: data, minValue: min, troughPoint: trough };
    }, [data]);

    if (loading) {
        return (
            <Card className="bg-card/80 backdrop-blur-xl border border-border/70 rounded-3xl overflow-hidden shadow-sm">
                <CardHeader className="border-b border-border/70 bg-muted/40 pb-5 pt-5">
                    <CardTitle className="flex items-center text-xl font-bold text-foreground">
                        <Activity className="w-5 h-5 mr-3 text-rose-500" /> Underwater Drawdown
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="h-72 animate-pulse bg-muted/40 rounded-2xl" />
                </CardContent>
            </Card>
        );
    }

    const isEmpty = !chartData || chartData.length < 2;
    const yDomainMin = Math.min(minValue * 1.1, -1);

    return (
        <Card className="bg-card/80 backdrop-blur-xl border border-border/70 rounded-3xl overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-muted/40 pb-5 pt-5 sm:pb-6 sm:pt-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                        <CardTitle className="flex items-center text-xl font-bold text-foreground">
                            <Activity className="w-5 h-5 mr-3 text-rose-500" /> Underwater Drawdown
                        </CardTitle>
                        <CardDescription className="text-sm mt-1">
                            Quanto il portafoglio è rimasto sotto il picco storico nel tempo. 0% = nuovo massimo, valori negativi = fase di recupero.
                        </CardDescription>
                    </div>
                    {!isEmpty && (
                        <div className="flex flex-wrap gap-2">
                            {currentDrawdown != null && (
                                <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 border ${
                                    currentDrawdown < -0.5
                                        ? "bg-rose-50/80 dark:bg-rose-950/30 border-rose-100/80 dark:border-rose-900/50"
                                        : "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-100/80 dark:border-emerald-900/50"
                                }`}>
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Attuale</span>
                                    <span className={`text-[11px] font-extrabold tabular-nums ${
                                        currentDrawdown < -0.5 ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"
                                    }`}>
                                        {currentDrawdown.toFixed(1)}%
                                    </span>
                                </div>
                            )}
                            {maxDrawdown != null && (
                                <div className="flex items-center gap-1.5 rounded-full bg-rose-50/80 dark:bg-rose-950/30 px-3 py-1.5 border border-rose-100/80 dark:border-rose-900/50">
                                    <ArrowDownRight className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                    <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400">Max</span>
                                    <span className="text-[11px] font-extrabold tabular-nums text-rose-700 dark:text-rose-300">
                                        {maxDrawdown.toFixed(1)}%
                                    </span>
                                    {maxDrawdownDate && (
                                        <span className="text-[10px] text-rose-500/90">· {formatFullDate(maxDrawdownDate)}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 md:p-8 pt-6">
                {isEmpty ? (
                    <div className="h-56 flex flex-col items-center justify-center text-center border-2 border-dashed border-border/70 rounded-2xl bg-muted/30">
                        <Activity className="w-10 h-10 mb-3 opacity-40" aria-hidden="true" />
                        <p className="font-medium text-foreground">Dati insufficienti.</p>
                        <p className="text-xs text-muted-foreground mt-1">Servono almeno 2 snapshot per calcolare il drawdown.</p>
                    </div>
                ) : (
                    <div className="h-[300px] sm:h-[360px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="underwaterGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.05} />
                                        <stop offset="50%" stopColor="#f43f5e" stopOpacity={0.25} />
                                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.55} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.16)" />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={formatMonthLabel}
                                    tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                                    minTickGap={30}
                                    dy={6}
                                />
                                <YAxis
                                    tickFormatter={(v) => `${v.toFixed(0)}%`}
                                    tickLine={false}
                                    axisLine={false}
                                    domain={[yDomainMin, 0]}
                                    tick={{ fill: "#64748b", fontSize: 11 }}
                                    width={50}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "rgba(255, 255, 255, 0.96)",
                                        backdropFilter: "blur(16px)",
                                        borderRadius: "1rem",
                                        border: "1px solid rgba(148, 163, 184, 0.24)",
                                        boxShadow: "0 20px 40px -10px rgba(0,0,0,0.15)",
                                    }}
                                    labelStyle={{ fontWeight: "bold", color: "#0f172a", marginBottom: "6px" }}
                                    itemStyle={{ color: "#e11d48", fontWeight: 700, fontSize: "13px" }}
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    formatter={(value: any) => [`${Number(value).toFixed(2)}%`, "Drawdown"]}
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    labelFormatter={(label: any) => formatFullDate(String(label))}
                                />
                                <ReferenceLine y={0} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1.5} />
                                <Area
                                    type="monotone"
                                    dataKey="drawdown"
                                    stroke="#e11d48"
                                    strokeWidth={2.5}
                                    fill="url(#underwaterGradient)"
                                    isAnimationActive
                                    animationDuration={900}
                                    activeDot={{ r: 5, strokeWidth: 0, fill: "#e11d48" }}
                                />
                                {troughPoint && troughPoint.drawdown < -0.5 && (
                                    <ReferenceDot
                                        x={troughPoint.date}
                                        y={troughPoint.drawdown}
                                        r={6}
                                        fill="#e11d48"
                                        stroke="#fff"
                                        strokeWidth={2}
                                        ifOverflow="extendDomain"
                                    />
                                )}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
});
