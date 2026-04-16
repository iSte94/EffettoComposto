"use client";

import { memo, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Grid3x3, Sparkles, ArrowUp, ArrowDown, Info } from "lucide-react";
import { formatEuro } from "@/lib/format";
import { computeFireSensitivity, type FireSensitivityInput, type SensitivityCell } from "@/lib/finance/fire-sensitivity";

interface SensitivityMatrixProps {
    input: FireSensitivityInput;
}

function colorForDelta(vs: number | null, isBaseline: boolean, reached: boolean): { bg: string; text: string } {
    if (isBaseline) return { bg: "bg-violet-500 dark:bg-violet-600 ring-2 ring-violet-400", text: "text-white" };
    if (!reached) return { bg: "bg-slate-200 dark:bg-slate-800", text: "text-slate-500" };
    if (vs == null) return { bg: "bg-slate-100 dark:bg-slate-800/50", text: "text-slate-600" };
    if (vs <= -5) return { bg: "bg-emerald-600 dark:bg-emerald-700", text: "text-white" };
    if (vs < -2) return { bg: "bg-emerald-400 dark:bg-emerald-600/80", text: "text-white" };
    if (vs < 0) return { bg: "bg-emerald-200 dark:bg-emerald-900/40", text: "text-emerald-900 dark:text-emerald-200" };
    if (vs === 0) return { bg: "bg-slate-200 dark:bg-slate-700/60", text: "text-slate-700 dark:text-slate-300" };
    if (vs < 2) return { bg: "bg-rose-200 dark:bg-rose-900/40", text: "text-rose-900 dark:text-rose-200" };
    if (vs < 5) return { bg: "bg-rose-400 dark:bg-rose-600/80", text: "text-white" };
    return { bg: "bg-rose-600 dark:bg-rose-700", text: "text-white" };
}

export const SensitivityMatrix = memo(function SensitivityMatrix({ input }: SensitivityMatrixProps) {
    const reducedMotion = useReducedMotion();
    const [hovered, setHovered] = useState<SensitivityCell | null>(null);

    const result = useMemo(() => computeFireSensitivity(input), [input]);

    return (
        <Card className="bg-card/80 backdrop-blur-xl border border-border/70 rounded-3xl overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-muted/40 pb-5 pt-5 sm:pb-6 sm:pt-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                        <CardTitle className="flex items-center text-xl font-bold text-foreground">
                            <Grid3x3 className="w-5 h-5 mr-3 text-violet-500" /> Matrice di Sensitività
                        </CardTitle>
                        <CardDescription className="text-sm mt-1">
                            Anni al traguardo FIRE al variare di spese future e risparmio mensile. Verde = anticipi, rosso = rimandi.
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {result.bestCase && (
                            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50/80 dark:bg-emerald-950/30 px-3 py-1.5 border border-emerald-100/80 dark:border-emerald-900/50">
                                <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-[10px] uppercase font-bold text-emerald-600">Best</span>
                                <span className="text-[11px] font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">
                                    {result.bestCase.yearsToFire?.toFixed(1)} anni
                                </span>
                            </div>
                        )}
                        {result.baseline && (
                            <div className="flex items-center gap-1.5 rounded-full bg-violet-50/80 dark:bg-violet-950/30 px-3 py-1.5 border border-violet-100/80 dark:border-violet-900/50">
                                <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                                <span className="text-[10px] uppercase font-bold text-violet-600">Base</span>
                                <span className="text-[11px] font-extrabold tabular-nums text-violet-700 dark:text-violet-300">
                                    {result.baseline.yearsToFire != null ? `${result.baseline.yearsToFire.toFixed(1)} anni` : "—"}
                                </span>
                            </div>
                        )}
                        {result.worstCase && (
                            <div className="flex items-center gap-1.5 rounded-full bg-rose-50/80 dark:bg-rose-950/30 px-3 py-1.5 border border-rose-100/80 dark:border-rose-900/50">
                                <ArrowUp className="w-3.5 h-3.5 text-rose-600" />
                                <span className="text-[10px] uppercase font-bold text-rose-600">Worst</span>
                                <span className="text-[11px] font-extrabold tabular-nums text-rose-700 dark:text-rose-300">
                                    {result.worstCase.yearsToFire?.toFixed(1)} anni
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
                <div className="overflow-x-auto">
                    <div className="min-w-[560px]">
                        {/* Column headers (Expenses) */}
                        <div className="grid gap-1.5 mb-2" style={{ gridTemplateColumns: `110px repeat(${result.expensesAxis.length}, minmax(0, 1fr))` }}>
                            <div className="flex items-end justify-end pr-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Risparmio ↓ / Spese →
                            </div>
                            {result.expensesAxis.map((e) => (
                                <div key={`eh-${e}`} className="text-center">
                                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Spesa</div>
                                    <div className="text-xs font-extrabold tabular-nums">{formatEuro(e)}</div>
                                </div>
                            ))}
                        </div>

                        {/* Rows */}
                        {result.cells.map((row, rowIdx) => (
                            <motion.div
                                key={result.savingsAxis[rowIdx]}
                                initial={reducedMotion ? false : { opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: reducedMotion ? 0 : rowIdx * 0.07 }}
                                className="grid gap-1.5 mb-1.5"
                                style={{ gridTemplateColumns: `110px repeat(${result.expensesAxis.length}, minmax(0, 1fr))` }}
                            >
                                <div className="flex flex-col items-end justify-center pr-2 text-right">
                                    <div className="text-[10px] uppercase font-bold text-muted-foreground">Risparmio</div>
                                    <div className="text-xs font-extrabold tabular-nums">{formatEuro(result.savingsAxis[rowIdx])}<span className="text-[10px] text-muted-foreground font-medium">/m</span></div>
                                </div>
                                {row.map((cell, colIdx) => {
                                    const colors = colorForDelta(cell.vsBaselineYears, cell.isBaseline, cell.yearsToFire != null);
                                    return (
                                        <motion.button
                                            key={`${rowIdx}-${colIdx}`}
                                            type="button"
                                            initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.25, delay: reducedMotion ? 0 : rowIdx * 0.07 + colIdx * 0.04 }}
                                            onMouseEnter={() => setHovered(cell)}
                                            onMouseLeave={() => setHovered(null)}
                                            onFocus={() => setHovered(cell)}
                                            onBlur={() => setHovered(null)}
                                            aria-label={`Risparmio ${cell.savingsMonthly}, spese ${cell.expensesMonthly}: ${cell.yearsToFire != null ? `${cell.yearsToFire.toFixed(1)} anni` : 'non raggiungibile'}`}
                                            className={`
                                                relative aspect-[2/1.2] rounded-xl ${colors.bg} ${colors.text}
                                                flex flex-col items-center justify-center
                                                text-center transition-all duration-200
                                                hover:scale-[1.05] hover:z-10 hover:shadow-md
                                                focus:outline-none focus:ring-2 focus:ring-violet-500 focus:z-10
                                                cursor-pointer
                                            `}
                                        >
                                            {cell.yearsToFire != null ? (
                                                <>
                                                    <span className="text-lg md:text-xl font-extrabold tabular-nums leading-none">
                                                        {cell.yearsToFire.toFixed(1)}
                                                    </span>
                                                    <span className="text-[9px] uppercase tracking-wider font-bold opacity-80 mt-0.5">
                                                        anni
                                                    </span>
                                                    {cell.fireAge != null && (
                                                        <span className="text-[9px] opacity-70 tabular-nums">età {Math.round(cell.fireAge)}</span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-[10px] italic opacity-70">mai</span>
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Hover detail */}
                <div className="mt-4 min-h-[52px] rounded-2xl border border-border/70 bg-muted/40 px-4 py-3">
                    {hovered ? (
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-4">
                                <div>
                                    <span className="text-muted-foreground">Spesa</span>
                                    <span className="ml-1.5 font-bold tabular-nums">{formatEuro(hovered.expensesMonthly)}/m</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Risparmio</span>
                                    <span className="ml-1.5 font-bold tabular-nums">{formatEuro(hovered.savingsMonthly)}/m</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Target FIRE</span>
                                    <span className="ml-1.5 font-bold tabular-nums">{formatEuro(hovered.fireTarget)}</span>
                                </div>
                            </div>
                            {hovered.yearsToFire != null && hovered.vsBaselineYears != null && !hovered.isBaseline && (
                                <div className={`font-extrabold tabular-nums ${
                                    hovered.vsBaselineYears < 0 ? 'text-emerald-600 dark:text-emerald-400' :
                                    hovered.vsBaselineYears > 0 ? 'text-rose-600 dark:text-rose-400' :
                                    'text-muted-foreground'
                                }`}>
                                    {hovered.vsBaselineYears < 0 ? '−' : '+'}{Math.abs(hovered.vsBaselineYears).toFixed(1)} anni vs baseline
                                </div>
                            )}
                            {hovered.isBaseline && (
                                <div className="text-violet-600 dark:text-violet-400 font-extrabold text-xs">★ Baseline</div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
                            <Info className="w-3.5 h-3.5" />
                            Passa il mouse su una cella per il dettaglio. La cella viola rappresenta il tuo scenario corrente.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
});
