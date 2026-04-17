"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ChevronLeft, ChevronRight, Gift, Clock, AlertCircle } from "lucide-react";
import { formatEuro } from "@/lib/format";

interface DividendItem {
    id: string;
    assetTicker: string;
    assetName?: string | null;
    exDate: string;             // YYYY-MM-DD
    paymentDate: string;        // YYYY-MM-DD
    netAmount: number;
    grossAmount: number;
    netAmountEur?: number | null;
    grossAmountEur?: number | null;
    currency: string;
    dividendType: string;
    quantity: number;
    dividendPerShare: number;
}

interface DividendCalendarProps {
    loadingExternal?: boolean;
}

const DAY_LABELS_FULL = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const DAY_LABELS_SHORT = ["L", "M", "M", "G", "V", "S", "D"];
const MONTH_LABELS = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

function toIsoItalyDate(d: Date): string {
    // Use local time (assumed Italy) — project runs with Italian locale
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function startOfMonth(y: number, m: number): Date {
    return new Date(y, m, 1);
}

function endOfMonth(y: number, m: number): Date {
    return new Date(y, m + 1, 0);
}

function buildCalendarCells(year: number, month: number): Date[] {
    const first = startOfMonth(year, month);
    const last = endOfMonth(year, month);
    // getDay: 0=Sunday, 1=Monday... we want Monday=0
    const firstWeekday = (first.getDay() + 6) % 7;
    const totalDays = last.getDate();
    const cells: Date[] = [];
    // Prev month padding
    for (let i = firstWeekday - 1; i >= 0; i--) {
        const d = new Date(year, month, -i);
        cells.push(d);
    }
    for (let d = 1; d <= totalDays; d++) {
        cells.push(new Date(year, month, d));
    }
    // Pad to 42 cells (6×7)
    while (cells.length < 42) {
        const last = cells[cells.length - 1];
        cells.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
    }
    return cells.slice(0, 42);
}

function netEur(d: DividendItem): number {
    return d.currency === "EUR" ? d.netAmount : (d.netAmountEur ?? d.netAmount);
}

export const DividendCalendar = memo(function DividendCalendar({ loadingExternal }: DividendCalendarProps) {
    const reducedMotion = useReducedMotion();
    const today = useMemo(() => new Date(), []);
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [dividends, setDividends] = useState<DividendItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    // Fetch dividends for current month (with small buffer for the 6-week grid)
    useEffect(() => {
        const ctl = new AbortController();
        const from = toIsoItalyDate(new Date(year, month - 1, 15));
        const to = toIsoItalyDate(new Date(year, month + 2, 15));
        fetch(`/api/dividends?from=${from}&to=${to}`, { signal: ctl.signal, credentials: "include" })
            .then(async (res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((json) => {
                const list: DividendItem[] = Array.isArray(json) ? json : (json.dividends ?? json.items ?? []);
                setDividends(list);
            })
            .catch((e) => {
                if (e.name !== "AbortError") setError(String(e.message || e));
            })
            .finally(() => setLoading(false));
        return () => ctl.abort();
    }, [year, month]);

    // Group dividends by payment date (YYYY-MM-DD)
    const byDate = useMemo(() => {
        const map = new Map<string, DividendItem[]>();
        for (const d of dividends) {
            const key = d.paymentDate.slice(0, 10);
            const arr = map.get(key) ?? [];
            arr.push(d);
            map.set(key, arr);
        }
        return map;
    }, [dividends]);

    const cells = useMemo(() => buildCalendarCells(year, month), [year, month]);
    const todayIso = toIsoItalyDate(today);

    // Monthly totals
    const monthlyTotal = useMemo(() => {
        let net = 0;
        let count = 0;
        for (const d of dividends) {
            const [y, m] = d.paymentDate.slice(0, 7).split("-").map(Number);
            if (y === year && m === month + 1) {
                net += netEur(d);
                count++;
            }
        }
        return { net, count };
    }, [dividends, year, month]);

    const selectedItems = selectedDate ? (byDate.get(selectedDate) ?? []) : [];

    const navigate = (delta: number) => {
        const nm = month + delta;
        const ny = year + Math.floor(nm / 12);
        const adj = ((nm % 12) + 12) % 12;
        setLoading(true);
        setError(null);
        setYear(ny);
        setMonth(adj);
        setSelectedDate(null);
    };

    const goToday = () => {
        setLoading(true);
        setError(null);
        setYear(today.getFullYear());
        setMonth(today.getMonth());
        setSelectedDate(toIsoItalyDate(today));
    };

    return (
        <Card className="bg-card/80 backdrop-blur-xl border border-border/70 rounded-3xl overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/70 bg-muted/40 pb-5 pt-5 sm:pb-6 sm:pt-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center text-xl font-bold text-foreground">
                            <Calendar className="w-5 h-5 mr-3 text-emerald-500" /> Calendario Dividendi
                        </CardTitle>
                        <CardDescription className="text-sm mt-1">
                            Stacchi e pagamenti dei tuoi dividendi nel mese. Fuso orario Europa/Roma.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="rounded-full h-9 w-9" onClick={() => navigate(-1)} aria-label="Mese precedente">
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div className="text-center min-w-[130px]">
                            <div className="text-sm font-extrabold">{MONTH_LABELS[month]} {year}</div>
                            <button onClick={goToday} className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 hover:underline">
                                Oggi
                            </button>
                        </div>
                        <Button variant="outline" size="icon" className="rounded-full h-9 w-9" onClick={() => navigate(1)} aria-label="Mese successivo">
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {monthlyTotal.count > 0 && (
                    <div className="mt-4 flex items-center gap-2 rounded-full bg-emerald-50/80 dark:bg-emerald-950/30 px-3 py-1.5 border border-emerald-100/80 dark:border-emerald-900/50 w-fit">
                        <Gift className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-[11px] font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">
                            {formatEuro(monthlyTotal.net)} · {monthlyTotal.count} {monthlyTotal.count === 1 ? "stacco" : "stacchi"} nel mese
                        </span>
                    </div>
                )}
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
                {error && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 dark:bg-rose-950/30 dark:border-rose-900/50 p-3 flex items-center gap-2 mb-4">
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        <span className="text-xs text-rose-700 dark:text-rose-300">Errore caricamento: {error}</span>
                    </div>
                )}

                {loading || loadingExternal ? (
                    <Skeleton className="h-[420px] rounded-2xl" />
                ) : (
                    <div className="grid gap-4 md:grid-cols-[1fr_280px]">
                        {/* Calendar grid */}
                        <div>
                            {/* Day headers */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {DAY_LABELS_FULL.map((d, i) => (
                                    <div key={d + i} className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-1">
                                        <span className="hidden sm:inline">{d}</span>
                                        <span className="sm:hidden">{DAY_LABELS_SHORT[i]}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Cells */}
                            <div className="grid grid-cols-7 gap-1">
                                {cells.map((date, i) => {
                                    const iso = toIsoItalyDate(date);
                                    const inMonth = date.getMonth() === month;
                                    const isToday = iso === todayIso;
                                    const isSelected = iso === selectedDate;
                                    const events = byDate.get(iso) ?? [];
                                    const hasEvents = events.length > 0;
                                    const totalNet = events.reduce((s, e) => s + netEur(e), 0);

                                    return (
                                        <motion.button
                                            key={iso + i}
                                            type="button"
                                            initial={reducedMotion ? false : { opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.25, delay: reducedMotion ? 0 : Math.min(i * 0.008, 0.2) }}
                                            onClick={() => setSelectedDate(iso === selectedDate ? null : iso)}
                                            className={`
                                                relative aspect-square rounded-xl border p-1.5 text-left
                                                transition-all duration-200
                                                ${inMonth ? 'bg-card/60' : 'bg-muted/30 text-muted-foreground/60'}
                                                ${isToday ? 'border-violet-400 border-2' : 'border-border/50'}
                                                ${isSelected ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-background z-10' : ''}
                                                ${hasEvents ? 'hover:scale-[1.04] cursor-pointer' : 'hover:bg-muted/40'}
                                                focus:outline-none focus:ring-2 focus:ring-violet-500
                                            `}
                                        >
                                            <div className="flex items-start justify-between">
                                                <span className={`text-[11px] font-bold tabular-nums ${isToday ? 'text-violet-600 dark:text-violet-400' : ''}`}>
                                                    {date.getDate()}
                                                </span>
                                                {hasEvents && (
                                                    <div className="flex items-center">
                                                        <span className="text-[8px] font-extrabold bg-emerald-500 text-white rounded-full px-1 tabular-nums">
                                                            {events.length}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            {hasEvents && (
                                                <div className="mt-1">
                                                    <div className="text-[9px] font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400 truncate">
                                                        +{formatEuro(totalNet)}
                                                    </div>
                                                    <div className="hidden sm:block mt-0.5 space-y-0.5">
                                                        {events.slice(0, 2).map((e) => (
                                                            <div key={e.id} className="text-[8px] truncate text-emerald-700/90 dark:text-emerald-300/90 leading-tight">
                                                                {e.assetTicker}
                                                            </div>
                                                        ))}
                                                        {events.length > 2 && (
                                                            <div className="text-[8px] text-emerald-700/70 dark:text-emerald-300/70 italic">
                                                                +{events.length - 2}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Sidebar: selected day detail */}
                        <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 min-h-[200px]">
                            <AnimatePresence mode="wait">
                                {selectedDate ? (
                                    <motion.div
                                        key={selectedDate}
                                        initial={reducedMotion ? {} : { opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/70">
                                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span className="text-xs font-bold">
                                                {new Date(selectedDate).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
                                            </span>
                                        </div>

                                        {selectedItems.length === 0 ? (
                                            <div className="text-xs text-muted-foreground italic text-center py-6">
                                                Nessun dividendo in questa data.
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {selectedItems.map((d) => {
                                                    const isUpcoming = d.paymentDate > todayIso;
                                                    return (
                                                        <div
                                                            key={d.id}
                                                            className={`rounded-xl p-3 border ${
                                                                isUpcoming
                                                                    ? "bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/50"
                                                                    : "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-900/50"
                                                            }`}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="min-w-0">
                                                                    <div className="font-extrabold text-sm truncate">{d.assetTicker}</div>
                                                                    {d.assetName && (
                                                                        <div className="text-[10px] text-muted-foreground truncate">{d.assetName}</div>
                                                                    )}
                                                                </div>
                                                                <div className={`text-sm font-extrabold tabular-nums shrink-0 ${
                                                                    isUpcoming ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"
                                                                }`}>
                                                                    +{formatEuro(netEur(d))}
                                                                </div>
                                                            </div>
                                                            <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                                                                <span className="tabular-nums">{d.quantity.toLocaleString("it-IT")} × {d.dividendPerShare.toFixed(4)} {d.currency}</span>
                                                                {d.dividendType && d.dividendType !== "ordinary" && (
                                                                    <span className="px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-bold uppercase text-[9px]">
                                                                        {d.dividendType}
                                                                    </span>
                                                                )}
                                                                {isUpcoming && (
                                                                    <span className="text-amber-700 dark:text-amber-400 font-bold">In arrivo</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex flex-col items-center justify-center h-full text-center py-6"
                                    >
                                        <Calendar className="w-8 h-8 mb-2 opacity-40" />
                                        <p className="text-xs text-muted-foreground max-w-[200px]">
                                            Seleziona un giorno del calendario per vedere i dettagli dei dividendi.
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
});
