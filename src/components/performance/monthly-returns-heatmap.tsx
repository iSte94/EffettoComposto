"use client";

import { memo, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarDays, TrendingUp, TrendingDown } from "lucide-react";

export interface MonthlyReturn {
    ym: string;      // YYYY-MM
    returnPct: number;
}

interface MonthlyReturnsHeatmapProps {
    data: MonthlyReturn[];
    loading?: boolean;
}

const MONTHS_FULL = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
const MONTHS_SHORT = ["G", "F", "M", "A", "M", "G", "L", "A", "S", "O", "N", "D"];

function colorFor(pct: number | null): { bg: string; text: string; ring: string } {
    if (pct == null) return { bg: "bg-slate-100 dark:bg-slate-800/50", text: "text-slate-400 dark:text-slate-500", ring: "" };
    if (pct <= -5) return { bg: "bg-rose-600 dark:bg-rose-700", text: "text-white", ring: "ring-rose-400/40" };
    if (pct < -2) return { bg: "bg-rose-400 dark:bg-rose-600/80", text: "text-white", ring: "ring-rose-300/30" };
    if (pct < 0) return { bg: "bg-rose-200 dark:bg-rose-900/40", text: "text-rose-900 dark:text-rose-200", ring: "" };
    if (pct === 0) return { bg: "bg-slate-200 dark:bg-slate-700/60", text: "text-slate-700 dark:text-slate-300", ring: "" };
    if (pct < 2) return { bg: "bg-emerald-200 dark:bg-emerald-900/40", text: "text-emerald-900 dark:text-emerald-200", ring: "" };
    if (pct < 5) return { bg: "bg-emerald-400 dark:bg-emerald-600/80", text: "text-white", ring: "ring-emerald-300/30" };
    return { bg: "bg-emerald-600 dark:bg-emerald-700", text: "text-white", ring: "ring-emerald-400/40" };
}

interface HeatmapCell {
    year: number;
    month: number; // 0-11
    pct: number | null;
}

function formatPct(pct: number): string {
    const sign = pct > 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}%`;
}

export const MonthlyReturnsHeatmap = memo(function MonthlyReturnsHeatmap({ data, loading }: MonthlyReturnsHeatmapProps) {
    const reducedMotion = useReducedMotion();
    const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

    const { years, grid, stats } = useMemo(() => {
        const byYm = new Map<string, number>();
        for (const d of data) byYm.set(d.ym, d.returnPct);

        if (data.length === 0) {
            return { years: [] as number[], grid: {} as Record<number, (number | null)[]>, stats: null };
        }

        const yrs = Array.from(new Set(data.map((d) => parseInt(d.ym.slice(0, 4), 10)))).sort((a, b) => a - b);
        const g: Record<number, (number | null)[]> = {};
        for (const y of yrs) {
            g[y] = Array.from({ length: 12 }, (_, m) => {
                const key = `${y}-${String(m + 1).padStart(2, "0")}`;
                return byYm.has(key) ? (byYm.get(key) as number) : null;
            });
        }

        let best: { ym: string; pct: number } | null = null;
        let worst: { ym: string; pct: number } | null = null;
        let positive = 0;
        let total = 0;
        for (const d of data) {
            if (Number.isFinite(d.returnPct)) {
                total++;
                if (d.returnPct > 0) positive++;
                if (!best || d.returnPct > best.pct) best = { ym: d.ym, pct: d.returnPct };
                if (!worst || d.returnPct < worst.pct) worst = { ym: d.ym, pct: d.returnPct };
            }
        }
        const hitRate = total > 0 ? (positive / total) * 100 : 0;
        return { years: yrs, grid: g, stats: { best, worst, hitRate, total } };
    }, [data]);

    if (loading) {
        return (
            <Card className="bg-card/80 backdrop-blur-xl border border-border/70 rounded-3xl overflow-hidden shadow-sm">
                <CardHeader className="border-b border-border/70 bg-muted/40 pb-5 pt-5">
                    <CardTitle className="flex items-center text-xl font-bold text-foreground">
                        <CalendarDays className="w-5 h-5 mr-3 text-violet-500" /> Heatmap Rendimenti Mensili
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="h-64 animate-pulse bg-muted/40 rounded-2xl" />
                </CardContent>
            </Card>
        );
    }

    const isEmpty = years.length === 0;

    return (
        <Card className="bg-card/80 backdrop-blur-xl border border-border/70 rounded-3xl overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-muted/40 pb-5 pt-5 sm:pb-6 sm:pt-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <CardTitle className="flex items-center text-xl font-bold text-foreground">
                            <CalendarDays className="w-5 h-5 mr-3 text-violet-500" /> Heatmap Rendimenti Mensili
                        </CardTitle>
                        <CardDescription className="text-sm mt-1">
                            Rendimenti del portafoglio mese per mese, al netto dei flussi di cassa (contributi e prelievi).
                        </CardDescription>
                    </div>
                    {stats && stats.total > 0 && (
                        <div className="flex flex-wrap gap-2">
                            <div className="flex items-center gap-2 rounded-full bg-emerald-50/80 dark:bg-emerald-950/30 px-3 py-1.5 border border-emerald-100/80 dark:border-emerald-900/50">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                                    Hit Rate: {stats.hitRate.toFixed(0)}%
                                </span>
                            </div>
                            {stats.best && (
                                <div className="flex items-center gap-1.5 rounded-full bg-emerald-50/80 dark:bg-emerald-950/30 px-3 py-1.5 border border-emerald-100/80 dark:border-emerald-900/50">
                                    <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Best</span>
                                    <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">
                                        {formatPct(stats.best.pct)}
                                    </span>
                                </div>
                            )}
                            {stats.worst && (
                                <div className="flex items-center gap-1.5 rounded-full bg-rose-50/80 dark:bg-rose-950/30 px-3 py-1.5 border border-rose-100/80 dark:border-rose-900/50">
                                    <TrendingDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                    <span className="text-[11px] font-extrabold text-rose-700 dark:text-rose-300 tabular-nums">
                                        {formatPct(stats.worst.pct)}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
                {isEmpty ? (
                    <div className="h-48 flex flex-col items-center justify-center text-center border-2 border-dashed border-border/70 rounded-2xl bg-muted/30">
                        <CalendarDays className="w-10 h-10 mb-3 opacity-40" aria-hidden="true" />
                        <p className="font-medium text-foreground">Dati insufficienti per la heatmap.</p>
                        <p className="text-xs text-muted-foreground mt-1">Servono almeno 2 snapshot mensili per calcolare i rendimenti.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Grid */}
                        <div className="overflow-x-auto">
                            <div className="min-w-[480px]">
                                {/* Headers */}
                                <div className="grid grid-cols-[48px_repeat(12,minmax(0,1fr))] gap-1 mb-2">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground" />
                                    {MONTHS_FULL.map((m, i) => (
                                        <div
                                            key={m}
                                            className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                                        >
                                            <span className="hidden sm:inline">{m}</span>
                                            <span className="sm:hidden">{MONTHS_SHORT[i]}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Rows */}
                                {years.map((year, rowIdx) => (
                                    <motion.div
                                        key={year}
                                        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: reducedMotion ? 0 : rowIdx * 0.06 }}
                                        className="grid grid-cols-[48px_repeat(12,minmax(0,1fr))] gap-1 mb-1"
                                    >
                                        <div className="flex items-center text-[11px] font-extrabold tabular-nums text-muted-foreground pr-1">
                                            {year}
                                        </div>
                                        {grid[year].map((pct, m) => {
                                            const colors = colorFor(pct);
                                            const cell: HeatmapCell = { year, month: m, pct };
                                            return (
                                                <motion.button
                                                    key={`${year}-${m}`}
                                                    type="button"
                                                    initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ duration: 0.25, delay: reducedMotion ? 0 : rowIdx * 0.06 + m * 0.015 }}
                                                    onMouseEnter={() => setHoveredCell(cell)}
                                                    onMouseLeave={() => setHoveredCell(null)}
                                                    onFocus={() => setHoveredCell(cell)}
                                                    onBlur={() => setHoveredCell(null)}
                                                    aria-label={pct == null ? `${MONTHS_FULL[m]} ${year}: nessun dato` : `${MONTHS_FULL[m]} ${year}: ${formatPct(pct)}`}
                                                    className={`
                                                        relative aspect-square rounded-md ${colors.bg} ${colors.text}
                                                        flex items-center justify-center
                                                        text-[9px] sm:text-[10px] md:text-[11px] font-bold tabular-nums
                                                        transition-all duration-200
                                                        hover:scale-110 hover:z-10 hover:ring-2 ${colors.ring}
                                                        focus:outline-none focus:ring-2 focus:ring-violet-500 focus:z-10
                                                        ${pct == null ? 'cursor-default' : 'cursor-pointer'}
                                                    `}
                                                >
                                                    {pct != null && (
                                                        <span className="hidden md:inline">
                                                            {pct >= 10 || pct <= -10 ? pct.toFixed(0) : pct.toFixed(1)}
                                                        </span>
                                                    )}
                                                    {pct != null && (
                                                        <span className="md:hidden w-1.5 h-1.5 rounded-full bg-current opacity-60" aria-hidden="true" />
                                                    )}
                                                </motion.button>
                                            );
                                        })}
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Hover detail */}
                        <div className="min-h-[44px] rounded-2xl border border-border/70 bg-muted/40 px-4 py-2 flex items-center justify-between">
                            {hoveredCell ? (
                                <>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            {MONTHS_FULL[hoveredCell.month]} {hoveredCell.year}
                                        </span>
                                    </div>
                                    <span className={`text-base font-extrabold tabular-nums ${
                                        hoveredCell.pct == null ? 'text-muted-foreground' :
                                        hoveredCell.pct > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                                        hoveredCell.pct < 0 ? 'text-rose-600 dark:text-rose-400' :
                                        'text-muted-foreground'
                                    }`}>
                                        {hoveredCell.pct == null ? 'Nessun dato' : formatPct(hoveredCell.pct)}
                                    </span>
                                </>
                            ) : (
                                <span className="text-xs text-muted-foreground italic">
                                    Passa il mouse su una cella per vedere il dettaglio.
                                </span>
                            )}
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                <span>Peggio</span>
                                <div className="flex items-center gap-0.5 ml-2">
                                    <div className="w-4 h-4 rounded bg-rose-600 dark:bg-rose-700" aria-label="≤ -5%" />
                                    <div className="w-4 h-4 rounded bg-rose-400 dark:bg-rose-600/80" aria-label="-5% a -2%" />
                                    <div className="w-4 h-4 rounded bg-rose-200 dark:bg-rose-900/40" aria-label="-2% a 0%" />
                                    <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700/60" aria-label="0%" />
                                    <div className="w-4 h-4 rounded bg-emerald-200 dark:bg-emerald-900/40" aria-label="0% a 2%" />
                                    <div className="w-4 h-4 rounded bg-emerald-400 dark:bg-emerald-600/80" aria-label="2% a 5%" />
                                    <div className="w-4 h-4 rounded bg-emerald-600 dark:bg-emerald-700" aria-label="≥ 5%" />
                                </div>
                                <span className="ml-2">Meglio</span>
                            </div>
                            {stats && (
                                <div className="text-[10px] text-muted-foreground tabular-nums">
                                    {stats.total} mesi · rendimento mediano calcolato
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
});
