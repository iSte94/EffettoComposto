"use client";

import { memo, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { TrendingUp } from "lucide-react";
import { formatEuro } from "@/lib/format";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, ReferenceLine,
} from "recharts";

interface HistoryPoint {
    date: string;
    totalNetWorth?: number;
}

type ProjectionMode = "savings" | "trend" | "compound";

interface NetWorthProjectionProps {
    history: HistoryPoint[];
    monthlySavings?: number;
    currentNetWorth?: number;
    expectedReturnRate?: number; // rendimento annuo atteso (%) dal FIRE
}

export const NetWorthProjection = memo(function NetWorthProjection({ history, monthlySavings, currentNetWorth: currentNetWorthProp, expectedReturnRate }: NetWorthProjectionProps) {
    const [projectionYears, setProjectionYears] = useState(10);
    const [projectionMode, setProjectionMode] = useState<ProjectionMode>("savings");

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

        // Modalità: savings (risparmio netto lineare), trend (storico lineare), compound (risparmio + rendimento composto)
        const isCompound = projectionMode === "compound";
        const effectiveMonthlyGrowth = projectionMode === "trend" ? historicalMonthlyGrowth : (monthlySavings ?? historicalMonthlyGrowth);
        const monthlyReturn = (expectedReturnRate ?? 0) / 100 / 12; // tasso mensile

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

        // Funzione per calcolo composto: FV = PV*(1+r)^n + PMT*((1+r)^n - 1)/r
        const compoundFV = (pv: number, pmt: number, r: number, n: number) => {
            if (r === 0) return pv + pmt * n;
            return pv * Math.pow(1 + r, n) + pmt * (Math.pow(1 + r, n) - 1) / r;
        };

        for (let y = 1; y <= projectionYears; y++) {
            const futureDate = new Date(baseDate);
            futureDate.setFullYear(futureDate.getFullYear() + y);
            const months = y * 12;

            let projected: number, optimistic: number, pessimistic: number;
            if (isCompound) {
                const pmt = monthlySavings ?? 0;
                projected = compoundFV(baseValue, pmt, monthlyReturn, months);
                // Ottimista: rendimento +50%, Pessimista: rendimento -50%
                optimistic = compoundFV(baseValue, pmt, monthlyReturn * 1.5, months);
                pessimistic = compoundFV(baseValue, pmt, monthlyReturn * 0.5, months);
            } else {
                projected = baseValue + effectiveMonthlyGrowth * months;
                optimistic = baseValue + effectiveMonthlyGrowth * months * 1.5;
                pessimistic = baseValue + effectiveMonthlyGrowth * months * 0.5;
            }

            chartData.push({
                label: `${futureDate.getFullYear()}`,
                Proiezione: Math.round(projected),
                "Caso Ottimista": Math.round(optimistic),
                "Caso Pessimista": Math.round(Math.max(0, pessimistic)),
            });
        }

        const totalMonths = projectionYears * 12;
        const projectedFinal = isCompound
            ? compoundFV(baseValue, monthlySavings ?? 0, monthlyReturn, totalMonths)
            : baseValue + effectiveMonthlyGrowth * totalMonths;
        const annualizedGrowth = isCompound
            ? (projectedFinal - baseValue) / projectionYears
            : effectiveMonthlyGrowth * 12;

        // Info per spiegazione trend storico
        const historySpanMonths = hasHistory
            ? Math.round((points[points.length - 1].date.getTime() - points[0].date.getTime()) / (30.44 * 24 * 60 * 60 * 1000))
            : 0;

        return {
            chartData,
            currentNetWorth: baseValue,
            projectedNetWorth: projectedFinal,
            monthlyGrowth: effectiveMonthlyGrowth,
            annualizedGrowth,
            bridgeLabel,
            historicalMonthlyGrowth,
            historyPointsCount: points.length,
            historySpanMonths,
        };
    }, [history, projectionYears, projectionMode, monthlySavings, currentNetWorthProp, expectedReturnRate]);

    if (!data) return null;

    const hasMonthlySavings = monthlySavings !== undefined;
    const hasHistory = history.filter(h => h.totalNetWorth !== undefined).length >= 2;
    const hasReturnRate = expectedReturnRate !== undefined && expectedReturnRate > 0;
    const hasCompound = hasMonthlySavings && hasReturnRate;
    // Quante modalità sono disponibili?
    const availableModes = [hasMonthlySavings, hasHistory, hasCompound].filter(Boolean).length;

    return (
        <Card className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_20px_55px_-35px_rgba(15,23,42,0.42)] sm:bg-white/90 sm:backdrop-blur-xl">
            <CardContent className="p-5 space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        <h3 className="text-sm font-bold text-slate-600">Proiezione Patrimonio</h3>
                        {availableModes <= 1 && (
                            <InfoTooltip>
                                {hasHistory
                                    ? <>Proiezione basata sul trend storico: regressione lineare su {data.historyPointsCount} snapshot in {data.historySpanMonths} mesi ({formatEuro(data.historicalMonthlyGrowth)}/mese). Compila il profilo finanziario per abilitare anche la proiezione per risparmio netto.</>
                                    : <>Proiezione basata sul risparmio netto mensile di {formatEuro(data.monthlyGrowth)} (entrate - uscite dal profilo). Registra almeno 2 snapshot per abilitare anche la proiezione per trend storico.</>
                                }
                            </InfoTooltip>
                        )}
                    </div>
                    <div className="flex w-full items-center gap-3 sm:w-48">
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

                {/* Toggle modalità proiezione */}
                {availableModes > 1 && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        {hasMonthlySavings && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setProjectionMode("savings")}
                                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${projectionMode === "savings" ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Risparmio Netto ({formatEuro(monthlySavings)}/m)
                                </button>
                                <InfoTooltip>
                                    Proiezione lineare basata sulla differenza tra entrate (redditi + affitti) e uscite (spese, costi immobili, rate prestiti) dal profilo finanziario. Assume un risparmio costante di {formatEuro(monthlySavings)}/mese.
                                </InfoTooltip>
                            </div>
                        )}
                        {hasHistory && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setProjectionMode("trend")}
                                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${projectionMode === "trend" ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Trend Storico ({formatEuro(data.historicalMonthlyGrowth)}/m)
                                </button>
                                <InfoTooltip>
                                    Regressione lineare su {data.historyPointsCount} snapshot in {data.historySpanMonths} mesi. La retta che meglio approssima l&apos;andamento reale del patrimonio indica una crescita media di {formatEuro(data.historicalMonthlyGrowth)}/mese. Tiene conto di tutto: risparmi, rendimenti, variazioni di mercato e spese straordinarie.
                                </InfoTooltip>
                            </div>
                        )}
                        {hasCompound && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setProjectionMode("compound")}
                                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${projectionMode === "compound" ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Risparmio + Rendimento ({expectedReturnRate}%)
                                </button>
                                <InfoTooltip>
                                    Ogni mese aggiungi {formatEuro(monthlySavings!)} di risparmio netto e l&apos;intero capitale matura un rendimento del {expectedReturnRate}% annuo con interesse composto (il rendimento genera altro rendimento). Il tasso utilizzato e&#768; quello impostato nella sezione FIRE. Bande: rendimento +50% / -50%.
                                </InfoTooltip>
                            </div>
                        )}
                    </div>
                )}

                {/* Quick stats */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attuale</p>
                        <p className="text-sm font-extrabold text-slate-700">{formatEuro(data.currentNetWorth)}</p>
                    </div>
                    <div className="rounded-xl bg-blue-50 p-3">
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Proiezione {projectionYears}a</p>
                        <p className="text-sm font-extrabold text-blue-600">{formatEuro(data.projectedNetWorth)}</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-3">
                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Crescita/anno</p>
                        <p className="text-sm font-extrabold text-emerald-600">{formatEuro(data.annualizedGrowth)}</p>
                    </div>
                </div>

                {/* Chart */}
                <div className="h-64 sm:h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={16} interval={Math.max(0, Math.floor(data.chartData.length / 8))} />
                            <YAxis width={44} tick={{ fontSize: 10 }} tickFormatter={(v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                            <Tooltip
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                formatter={(value: any) => formatEuro(Number(value))}
                                contentStyle={{ borderRadius: "12px", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "0 8px 24px rgba(15,23,42,0.12)", backgroundColor: "rgba(255,255,255,0.96)" }}
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
                    Le bande mostrano scenario ottimista (+50%) e pessimista (-50%).
                </p>
            </CardContent>
        </Card>
    );
});
