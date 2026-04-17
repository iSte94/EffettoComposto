"use client";

import { useEffect, useMemo, useState } from "react";
interface User { username: string }
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Gauge, Target, Percent, Activity, BarChart3, LineChart as LineChartIcon, AlertCircle } from "lucide-react";
import { formatEuro } from "@/lib/format";
import { MonthlyReturnsHeatmap } from "@/components/performance/monthly-returns-heatmap";
import { UnderwaterDrawdownChart } from "@/components/performance/underwater-drawdown-chart";
import { DividendCalendar } from "@/components/performance/dividend-calendar";
import { AiPerformanceAnalysisDialog } from "@/components/performance/ai-analysis-dialog";

type Period = "ytd" | "1y" | "3y" | "5y" | "all";

interface PerformanceMetrics {
    startDate: string;
    endDate: string;
    months: number;
    startNetWorth: number;
    endNetWorth: number;
    totalCashFlow: number;
    roi: number | null;
    cagr: number | null;
    twr: number | null;
    mwr: number | null;
    volatility: number | null;
    sharpeRatio: number | null;
    maxDrawdown: number | null;
    maxDrawdownDate: string | null;
    drawdownDurationMonths: number | null;
    recoveryMonths: number | null;
    currentDrawdown: number | null;
}

interface PerformancePayload {
    period: Period;
    metrics: PerformanceMetrics;
    monthlyReturns: { ym: string; returnPct: number }[];
    underwaterSeries: { date: string; drawdown: number }[];
    snapshotCount: number;
    hasEnoughData: boolean;
}

const PERIOD_LABELS: { value: Period; label: string }[] = [
    { value: "ytd", label: "YTD" },
    { value: "1y", label: "1 Anno" },
    { value: "3y", label: "3 Anni" },
    { value: "5y", label: "5 Anni" },
    { value: "all", label: "Da Sempre" },
];

function formatPct(v: number | null | undefined, decimals = 1): string {
    if (v == null || !Number.isFinite(v)) return "—";
    return `${v >= 0 ? "+" : ""}${v.toFixed(decimals)}%`;
}

function formatSharpe(v: number | null): string {
    if (v == null || !Number.isFinite(v)) return "—";
    return v.toFixed(2);
}

interface KpiTileProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    hint?: string;
    tone?: "neutral" | "positive" | "negative" | "violet";
    numericValue?: number | null;
}

function KpiTile({ icon, label, value, hint, tone = "neutral", numericValue }: KpiTileProps) {
    const autoTone = tone === "neutral" && numericValue != null
        ? numericValue > 0 ? "positive" : numericValue < 0 ? "negative" : "neutral"
        : tone;
    const color = {
        neutral: "text-foreground",
        positive: "text-emerald-600 dark:text-emerald-400",
        negative: "text-rose-600 dark:text-rose-400",
        violet: "text-violet-600 dark:text-violet-400",
    }[autoTone];

    return (
        <Card className="bg-card/80 backdrop-blur-xl border border-border/70 rounded-2xl overflow-hidden transition-shadow hover:shadow-md">
            <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                    {icon}
                    <span className="truncate">{label}</span>
                </div>
                <div className={`text-2xl md:text-3xl font-extrabold tabular-nums ${color}`}>{value}</div>
                {hint && <div className="text-[10px] text-muted-foreground mt-1 leading-tight">{hint}</div>}
            </CardContent>
        </Card>
    );
}

interface PerformanceDashboardProps {
    user: User | null;
}

export function PerformanceDashboard({ user }: PerformanceDashboardProps) {
    const [period, setPeriod] = useState<Period>("1y");
    const [data, setData] = useState<PerformancePayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            return;
        }
        const ctl = new AbortController();
        fetch(`/api/performance?period=${period}`, { signal: ctl.signal, credentials: "include" })
            .then(async (res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((json) => setData(json))
            .catch((e) => {
                if (e.name !== "AbortError") setError(String(e.message || e));
            })
            .finally(() => setLoading(false));
        return () => ctl.abort();
    }, [user, period]);

    const monthlyReturns = useMemo(() => data?.monthlyReturns ?? [], [data]);
    const underwaterSeries = useMemo(() => data?.underwaterSeries ?? [], [data]);
    const m = data?.metrics;

    if (!user) {
        return (
            <div className="rounded-3xl border border-border/70 bg-card/80 p-10 shadow-sm text-center backdrop-blur-xl">
                <TrendingUp className="mx-auto w-12 h-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-xl font-bold mb-2">Performance non disponibile</h3>
                <p className="text-sm text-muted-foreground">Accedi con il tuo account per visualizzare le metriche di performance del tuo portafoglio.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20 pt-6">
            {/* Hero */}
            <div className="relative space-y-4 text-center">
                <h2 className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
                    Analisi <span className="text-violet-600 dark:text-violet-400">Performance</span>
                </h2>
                <p className="mx-auto max-w-2xl text-balance text-sm leading-relaxed text-muted-foreground sm:text-base">
                    Metriche professionali sul tuo portafoglio: rendimento annualizzato, volatilità, Sharpe, drawdown e tanto altro — calcolate sugli snapshot storici.
                </p>

                {/* Period selector + AI action */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <Tabs
                        value={period}
                        onValueChange={(v) => {
                            setLoading(true);
                            setError(null);
                            setPeriod(v as Period);
                        }}
                    >
                        <TabsList className="rounded-full border border-border/70 bg-card/80 backdrop-blur-xl p-1">
                            {PERIOD_LABELS.map((p) => (
                                <TabsTrigger
                                    key={p.value}
                                    value={p.value}
                                    className="rounded-full px-4 py-1.5 text-xs font-bold data-[state=active]:bg-violet-500 data-[state=active]:text-white data-[state=active]:shadow-md"
                                >
                                    {p.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                    {data?.hasEnoughData && data?.metrics && (
                        <AiPerformanceAnalysisDialog
                            period={period}
                            metrics={data.metrics}
                            monthlyReturns={data.monthlyReturns}
                            underwaterSeries={data.underwaterSeries}
                        />
                    )}
                </div>
            </div>

            {error && (
                <Card className="border-rose-200 bg-rose-50/80 dark:bg-rose-950/30 dark:border-rose-900/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-rose-700 dark:text-rose-300">Errore nel caricamento</p>
                            <p className="text-xs text-rose-600/80 dark:text-rose-400/80">{error}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setPeriod(period)}>Riprova</Button>
                    </CardContent>
                </Card>
            )}

            {loading ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
                    </div>
                    <Skeleton className="h-80 rounded-3xl" />
                    <Skeleton className="h-72 rounded-3xl" />
                </div>
            ) : !data?.hasEnoughData ? (
                <Card className="bg-card/80 backdrop-blur-xl border border-border/70 rounded-3xl">
                    <CardContent className="p-10 text-center">
                        <BarChart3 className="mx-auto w-12 h-12 text-muted-foreground/40 mb-4" />
                        <h3 className="text-xl font-bold mb-2">Dati insufficienti per l&apos;analisi</h3>
                        <p className="text-sm text-muted-foreground mb-4 max-w-lg mx-auto">
                            Servono almeno <strong>3 snapshot mensili</strong> nel periodo selezionato per calcolare le metriche di performance.
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Snapshot attuali nel periodo: <strong className="tabular-nums">{data?.snapshotCount ?? 0}</strong>
                        </p>
                    </CardContent>
                </Card>
            ) : m ? (
                <>
                    {/* KPI grid */}
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                        <KpiTile
                            icon={<TrendingUp className="w-3.5 h-3.5" />}
                            label="ROI"
                            value={formatPct(m.roi)}
                            hint="Semplice"
                            numericValue={m.roi}
                        />
                        <KpiTile
                            icon={<Target className="w-3.5 h-3.5" />}
                            label="CAGR"
                            value={formatPct(m.cagr)}
                            hint="Annualizzato"
                            numericValue={m.cagr}
                        />
                        <KpiTile
                            icon={<LineChartIcon className="w-3.5 h-3.5" />}
                            label="TWR"
                            value={formatPct(m.twr)}
                            hint="Time-Weighted"
                            numericValue={m.twr}
                            tone="violet"
                        />
                        <KpiTile
                            icon={<Percent className="w-3.5 h-3.5" />}
                            label="MWR (IRR)"
                            value={formatPct(m.mwr)}
                            hint="Money-Weighted"
                            numericValue={m.mwr}
                        />
                        <KpiTile
                            icon={<Activity className="w-3.5 h-3.5" />}
                            label="Volatilità"
                            value={formatPct(m.volatility)}
                            hint="Annualizzata σ"
                            tone="neutral"
                        />
                        <KpiTile
                            icon={<Gauge className="w-3.5 h-3.5" />}
                            label="Sharpe"
                            value={formatSharpe(m.sharpeRatio)}
                            hint={m.sharpeRatio != null ? (m.sharpeRatio > 1 ? "Buono" : m.sharpeRatio > 0 ? "Modesto" : "Negativo") : undefined}
                            tone={m.sharpeRatio != null ? (m.sharpeRatio > 1 ? "positive" : m.sharpeRatio > 0 ? "neutral" : "negative") : "neutral"}
                        />
                    </div>

                    {/* Context strip */}
                    <Card className="bg-card/80 backdrop-blur-xl border border-border/70 rounded-2xl">
                        <CardContent className="p-4 sm:p-5">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Patrimonio iniziale</div>
                                    <div className="text-sm font-extrabold tabular-nums">{formatEuro(m.startNetWorth)}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Patrimonio finale</div>
                                    <div className="text-sm font-extrabold tabular-nums">{formatEuro(m.endNetWorth)}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contributi netti</div>
                                    <div className={`text-sm font-extrabold tabular-nums ${m.totalCashFlow > 0 ? "text-emerald-600" : m.totalCashFlow < 0 ? "text-rose-600" : ""}`}>
                                        {m.totalCashFlow >= 0 ? "+" : ""}{formatEuro(m.totalCashFlow)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mesi analizzati</div>
                                    <div className="text-sm font-extrabold tabular-nums">{m.months}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Drawdown */}
                    <UnderwaterDrawdownChart
                        data={underwaterSeries}
                        maxDrawdown={m.maxDrawdown}
                        maxDrawdownDate={m.maxDrawdownDate}
                        currentDrawdown={m.currentDrawdown}
                    />

                    {/* Heatmap */}
                    <MonthlyReturnsHeatmap data={monthlyReturns} />

                    {/* Dividend Calendar */}
                    <DividendCalendar />

                    {/* Drawdown detail */}
                    {m.maxDrawdown != null && (
                        <Card className="bg-card/80 backdrop-blur-xl border border-border/70 rounded-3xl">
                            <CardHeader className="border-b border-border/70 bg-muted/40 pb-4 pt-4">
                                <CardTitle className="text-base font-bold">Dettaglio Drawdown</CardTitle>
                                <CardDescription className="text-xs">La fase più dolorosa del periodo e il tempo di recupero.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100/60 dark:border-rose-900/40 p-3">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1">Max Drawdown</div>
                                        <div className="text-xl font-extrabold tabular-nums text-rose-700 dark:text-rose-300">{m.maxDrawdown.toFixed(1)}%</div>
                                    </div>
                                    <div className="rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100/60 dark:border-amber-900/40 p-3">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">Durata discesa</div>
                                        <div className="text-xl font-extrabold tabular-nums text-amber-700 dark:text-amber-300">
                                            {m.drawdownDurationMonths != null ? `${m.drawdownDurationMonths} mesi` : "—"}
                                        </div>
                                    </div>
                                    <div className="rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900/40 p-3">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">Tempo Recupero</div>
                                        <div className="text-xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">
                                            {m.recoveryMonths != null ? `${m.recoveryMonths} mesi` : "In corso"}
                                        </div>
                                    </div>
                                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/40 p-3">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Drawdown Attuale</div>
                                        <div className={`text-xl font-extrabold tabular-nums ${
                                            (m.currentDrawdown ?? 0) < -0.5 ? "text-rose-600" : "text-emerald-600"
                                        }`}>
                                            {m.currentDrawdown != null ? `${m.currentDrawdown.toFixed(1)}%` : "—"}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            ) : null}
        </div>
    );
}
