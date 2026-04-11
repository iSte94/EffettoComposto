"use client";

import { memo, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { TrendingUp } from "lucide-react";
import { formatEuro } from "@/lib/format";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, ReferenceLine,
} from "recharts";

interface HistoryPoint {
    date: string;
    totalNetWorth?: number;
}

interface NetWorthProjectionProps {
    history: HistoryPoint[];
    monthlySavings?: number;
    currentNetWorth?: number;
}

export const NetWorthProjection = memo(function NetWorthProjection({ history, monthlySavings, currentNetWorth: currentNetWorthProp }: NetWorthProjectionProps) {
    const [projectionYears, setProjectionYears] = useState(10);
    const [useHistoricalTrend, setUseHistoricalTrend] = useState(false);

    const data = useMemo(() => {
        const points = history
            .filter(h => h.totalNetWorth !== undefined)
            .map(h => ({ date: new Date(h.date), value: h.totalNetWorth! }))
            .sort((a, b) => a.date.getTime() - b.date.getTime());

        const hasHistory = points.length >= 2;
        const baseValue = hasHistory ? points[points.length - 1].value : (currentNetWorthProp ?? 0);
        const baseDate = hasHistory ? points[points.length - 1].date : new Date();

        // Se non c'è storico e non c'è patrimonio corrente, non mostrare nulla
        if (!hasHistory && (currentNetWorthProp === undefined || currentNetWorthProp === 0) && !monthlySavings) return null;

        let historicalMonthlyGrowth = 0;
        if (hasHistory) {
            // Regressione lineare (least squares) su tutti i punti
            // x = mesi dal primo snapshot, y = net worth
            const MS_PER_MONTH = 30.44 * 24 * 60 * 60 * 1000;
            const t0 = points[0].date.getTime();
            const xs = points.map(p => (p.date.getTime() - t0) / MS_PER_MONTH);
            const ys = points.map(p => p.value);
            const n = points.length;
            const sumX = xs.reduce((a, b) => a + b, 0);
            const sumY = ys.reduce((a, b) => a + b, 0);
            const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
            const sumX2 = xs.reduce((a, x) => a + x * x, 0);
            const denom = n * sumX2 - sumX * sumX;
            historicalMonthlyGrowth = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
        }

        // Usa risparmio netto mensile (default) o trend storico (toggle)
        const effectiveMonthlyGrowth = useHistoricalTrend ? historicalMonthlyGrowth : (monthlySavings ?? historicalMonthlyGrowth);

        // Build historical + projected data
        const chartData: { label: string; Storico?: number; Proiezione?: number; "Caso Ottimista"?: number; "Caso Pessimista"?: number }[] = [];

        if (hasHistory) {
            // Historical points (sample up to 24)
            const step = Math.max(1, Math.floor(points.length / 24));
            for (let i = 0; i < points.length; i += step) {
                const p = points[i];
                const yearStr = `${p.date.getFullYear()}-${String(p.date.getMonth() + 1).padStart(2, '0')}`;
                chartData.push({ label: yearStr, Storico: Math.round(p.value) });
            }
            // Ensure last point is included
            const last = points[points.length - 1];
            if (chartData.length === 0 || chartData[chartData.length - 1].Storico !== Math.round(last.value)) {
                const yearStr = `${last.date.getFullYear()}-${String(last.date.getMonth() + 1).padStart(2, '0')}`;
                chartData.push({ label: yearStr, Storico: Math.round(last.value) });
            }
        } else {
            // No history: start from current point
            const now = new Date();
            const yearStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            chartData.push({ label: yearStr, Storico: Math.round(baseValue) });
        }

        // Projected points (yearly)
        const bridgeLabel = chartData[chartData.length - 1].label;
        chartData[chartData.length - 1].Proiezione = Math.round(baseValue);
        chartData[chartData.length - 1]["Caso Ottimista"] = Math.round(baseValue);
        chartData[chartData.length - 1]["Caso Pessimista"] = Math.round(baseValue);

        for (let y = 1; y <= projectionYears; y++) {
            const futureDate = new Date(baseDate);
            futureDate.setFullYear(futureDate.getFullYear() + y);
            const months = y * 12;
            const projected = baseValue + effectiveMonthlyGrowth * months;
            const optimistic = baseValue + effectiveMonthlyGrowth * months * 1.5;
            const pessimistic = baseValue + effectiveMonthlyGrowth * months * 0.5;

            chartData.push({
                label: `${futureDate.getFullYear()}`,
                Proiezione: Math.round(projected),
                "Caso Ottimista": Math.round(optimistic),
                "Caso Pessimista": Math.round(Math.max(0, pessimistic)),
            });
        }

        const projectedFinal = baseValue + effectiveMonthlyGrowth * projectionYears * 12;
        const annualizedGrowth = effectiveMonthlyGrowth * 12;

        return {
            chartData,
            currentNetWorth: baseValue,
            projectedNetWorth: projectedFinal,
            monthlyGrowth: effectiveMonthlyGrowth,
            annualizedGrowth,
            bridgeLabel,
            historicalMonthlyGrowth,
        };
    }, [history, projectionYears, useHistoricalTrend, monthlySavings, currentNetWorthProp]);

    if (!data) return null;

    const hasMonthlySavings = monthlySavings !== undefined;
    const hasHistory = history.filter(h => h.totalNetWorth !== undefined).length >= 2;

    return (
        <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 rounded-2xl shadow-md">
            <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400">Proiezione Patrimonio</h3>
                    </div>
                    <div className="flex items-center gap-3 w-48">
                        <Label className="text-xs text-slate-400 whitespace-nowrap">{projectionYears} anni</Label>
                        <Slider
                            value={[projectionYears]}
                            min={1}
                            max={30}
                            step={1}
                            onValueChange={([v]) => setProjectionYears(v)}
                            className="w-full"
                        />
                    </div>
                </div>

                {/* Toggle trend storico / risparmio netto */}
                {hasMonthlySavings && hasHistory && (
                    <div className="flex items-center gap-2 text-xs">
                        <button
                            onClick={() => setUseHistoricalTrend(false)}
                            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${!useHistoricalTrend ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Risparmio Netto ({formatEuro(monthlySavings)}/m)
                        </button>
                        <button
                            onClick={() => setUseHistoricalTrend(true)}
                            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${useHistoricalTrend ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Trend Storico ({formatEuro(data.historicalMonthlyGrowth)}/m)
                        </button>
                    </div>
                )}

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attuale</p>
                        <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">{formatEuro(data.currentNetWorth)}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-2.5">
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Proiezione {projectionYears}a</p>
                        <p className="text-sm font-extrabold text-blue-600 dark:text-blue-400">{formatEuro(data.projectedNetWorth)}</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-2.5">
                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Crescita/anno</p>
                        <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{formatEuro(data.annualizedGrowth)}</p>
                    </div>
                </div>

                {/* Chart */}
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={Math.max(0, Math.floor(data.chartData.length / 8))} />
                            <YAxis tick={{ fontSize: 9 }} tickFormatter={(v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                            <Tooltip
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                formatter={(value: any) => formatEuro(Number(value))}
                                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)" }}
                            />
                            <ReferenceLine x={data.bridgeLabel} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: "Oggi", fontSize: 10, fill: "#94a3b8" }} />
                            <Area type="monotone" dataKey="Caso Ottimista" stroke="transparent" fill="#10b981" fillOpacity={0.08} />
                            <Area type="monotone" dataKey="Caso Pessimista" stroke="transparent" fill="#ef4444" fillOpacity={0.05} />
                            <Area type="monotone" dataKey="Storico" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
                            <Area type="monotone" dataKey="Proiezione" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.08} strokeWidth={2} strokeDasharray="6 3" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <p className="text-[10px] text-slate-400 text-center">
                    {useHistoricalTrend || !hasMonthlySavings
                        ? `Basato sul trend storico di ${formatEuro(data.monthlyGrowth)}/mese. Le bande mostrano scenario ottimista (+50%) e pessimista (-50%).`
                        : `Basato sul risparmio netto mensile di ${formatEuro(data.monthlyGrowth)}/mese. Le bande mostrano scenario ottimista (+50%) e pessimista (-50%).`
                    }
                </p>
            </CardContent>
        </Card>
    );
});
