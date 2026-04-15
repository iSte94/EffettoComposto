"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
    BarChart3, Home, Wallet, Bitcoin, Package,
    Flame, Target, ShieldAlert, TrendingDown, FileDown, CheckCircle2,
    LineChart, Activity,
} from "lucide-react";
import { formatEuro } from "@/lib/format";
import { computeHistoryStats } from "@/lib/finance/history-stats";
import { FinancialAlerts } from "@/components/financial-alerts";
import { NetWorthProjection } from "@/components/patrimonio/net-worth-projection";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

import { WelcomeOnboarding } from "@/components/welcome-onboarding";
import { exportPatrimonioCSV } from "@/lib/export/csv";
import type { AssetRecord, AcceptedPurchase } from "@/types";

interface OverviewDashboardProps {
    user: { username: string } | null;
}

function MetricCard({ icon, label, value, subtitle, color = "slate" }: {
    icon: React.ReactNode; label: string; value: string; subtitle?: string; color?: string;
}) {
    const colorMap: Record<string, string> = {
        slate: "bg-card/80 border-border/70",
        blue: "bg-blue-50/80 dark:bg-blue-950/25 border-blue-100/80 dark:border-blue-900/70",
        purple: "bg-purple-50/80 dark:bg-purple-950/25 border-purple-100/80 dark:border-purple-900/70",
        amber: "bg-amber-50/80 dark:bg-amber-950/25 border-amber-100/80 dark:border-amber-900/70",
        emerald: "bg-emerald-50/80 dark:bg-emerald-950/25 border-emerald-100/80 dark:border-emerald-900/70",
        rose: "bg-rose-50/80 dark:bg-rose-950/25 border-rose-100/80 dark:border-rose-900/70",
        teal: "bg-teal-50/80 dark:bg-teal-950/25 border-teal-100/80 dark:border-teal-900/70",
        orange: "bg-orange-50/80 dark:bg-orange-950/25 border-orange-100/80 dark:border-orange-900/70",
    };
    return (
        <Card className={`${colorMap[color] || colorMap.slate} backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md`}>
            <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2">
                    {icon}
                    <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-[0.24em]">{label}</span>
                </div>
                <div className="text-lg sm:text-xl font-extrabold text-card-foreground tabular-nums">{value}</div>
                {subtitle && <div className="text-xs text-muted-foreground mt-1 leading-snug">{subtitle}</div>}
            </CardContent>
        </Card>
    );
}

export function OverviewDashboard({ user }: OverviewDashboardProps) {
    const [history, setHistory] = useState<AssetRecord[]>([]);
    const [preferences, setPreferences] = useState<Record<string, number | string | null>>({});
    const [loading, setLoading] = useState(true);
    const [acceptedPurchases, setAcceptedPurchases] = useState<AcceptedPurchase[]>([]);

    useEffect(() => {
        if (!user) return;

        Promise.all([
            fetch('/api/patrimonio').then(r => r.json()),
            fetch('/api/preferences').then(r => r.json()),
        ]).then(([patrimonioData, prefData]) => {
            if (patrimonioData.history) {
                // Calcola totalNetWorth per ogni record (esclusi immobili)
                const enriched = patrimonioData.history.map((item: AssetRecord) => ({
                    ...item,
                    totalNetWorth: (item.liquidStockValue || 0) + (item.stocksSnapshotValue || 0) +
                        (item.safeHavens || 0) + (item.emergencyFund || 0) + (item.pensionFund || 0) +
                        ((item.bitcoinAmount || 0) * (item.bitcoinPrice || 0)) - (item.debtsTotal || 0)
                }));
                setHistory(enriched);
            }
            if (prefData.preferences) {
                setPreferences(prefData.preferences);
                try { setAcceptedPurchases(JSON.parse(prefData.preferences.acceptedPurchases || "[]")); } catch { /* empty */ }
            }
        }).catch(console.error)
            .finally(() => setLoading(false));
    }, [user]);

    const metrics = useMemo(() => {
        if (history.length === 0) return null;

        const latest = history[history.length - 1];
        const previous = history.length >= 2 ? history[history.length - 2] : null;

        const currentNetWorth = latest.totalNetWorth || 0;
        const previousNetWorth = previous?.totalNetWorth || currentNetWorth;
        const netWorthChange = currentNetWorth - previousNetWorth;
        const netWorthChangePercent = previousNetWorth !== 0 ? (netWorthChange / Math.abs(previousNetWorth)) * 100 : 0;

        // Breakdown del delta vs snapshot precedente, per categoria
        const btcLatest = (latest.bitcoinAmount || 0) * (latest.bitcoinPrice || 0);
        const btcPrev = previous ? (previous.bitcoinAmount || 0) * (previous.bitcoinPrice || 0) : btcLatest;
        const changeBreakdown = previous ? [
            { label: "Liquidità & ETF", delta: ((latest.liquidStockValue || 0) + (latest.stocksSnapshotValue || 0)) - ((previous.liquidStockValue || 0) + (previous.stocksSnapshotValue || 0)), color: "bg-purple-500" },
            { label: "Fondo Emergenza", delta: (latest.emergencyFund || 0) - (previous.emergencyFund || 0), color: "bg-emerald-500" },
            { label: "Bitcoin", delta: btcLatest - btcPrev, color: "bg-amber-500" },
            { label: "Beni Rifugio", delta: (latest.safeHavens || 0) - (previous.safeHavens || 0), color: "bg-slate-400" },
            { label: "Fondo Pensione", delta: (latest.pensionFund || 0) - (previous.pensionFund || 0), color: "bg-teal-500" },
            { label: "Debiti", delta: -((latest.debtsTotal || 0) - (previous.debtsTotal || 0)), color: "bg-rose-500" },
        ].filter(item => Math.abs(item.delta) >= 0.5).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)) : [];

        const totalDebts = latest.debtsTotal || 0;
        const totalAssets = currentNetWorth + totalDebts;
        const debtToAssetRatio = totalAssets > 0 ? (totalDebts / totalAssets) * 100 : 0;

        const realEstateValue = latest.realEstateValue || 0;
        const liquidValue = (latest.liquidStockValue || 0) + (latest.stocksSnapshotValue || 0) + (latest.emergencyFund || 0);
        const btcValue = (latest.bitcoinAmount || 0) * (latest.bitcoinPrice || 0);
        const otherAssets = (latest.safeHavens || 0) + (latest.pensionFund || 0);

        // Sparkline data (ultimi 30 records o tutti se meno)
        const sparkData = history.slice(-30).map(item => ({
            date: item.date,
            value: item.totalNetWorth || 0
        }));

        // Asset allocation percentages
        const totalGross = realEstateValue + liquidValue + btcValue + otherAssets;
        const allocation = totalGross > 0 ? {
            immobili: (realEstateValue / totalGross) * 100,
            liquidita: (liquidValue / totalGross) * 100,
            crypto: (btcValue / totalGross) * 100,
            altro: (otherAssets / totalGross) * 100,
        } : { immobili: 0, liquidita: 0, crypto: 0, altro: 0 };

        // Statistiche storiche su tutta la serie (CAGR + max drawdown).
        // Usano il totalNetWorth gia' arricchito sopra.
        const historyPoints = history.map(item => ({
            date: item.date,
            value: item.totalNetWorth || 0,
        }));
        const historyStats = computeHistoryStats(historyPoints);

        // FIRE progress (se abbiamo i parametri)
        const fireWithdrawalRate = Number(preferences.fireWithdrawalRate) || 3.25;
        const expectedMonthlyExpenses = Number(preferences.expectedMonthlyExpenses) || 0;
        const fireTarget = expectedMonthlyExpenses > 0
            ? (expectedMonthlyExpenses * 12) / (fireWithdrawalRate / 100)
            : 0;
        const fireProgress = fireTarget > 0 ? Math.min(100, (currentNetWorth / fireTarget) * 100) : 0;

        // Emergency fund months - se separato usa emergencyFund, altrimenti liquidStockValue
        const isSeparate = !!preferences.separateEmergencyFund;
        const emergencyFundValue = isSeparate ? (latest.emergencyFund || 0) : (latest.liquidStockValue || 0);
        const emergencyFund = emergencyFundValue;
        const monthlyExpenses = expectedMonthlyExpenses || 2000; // fallback
        const emergencyMonths = monthlyExpenses > 0 ? emergencyFund / monthlyExpenses : 0;

        return {
            currentNetWorth, netWorthChange, netWorthChangePercent, changeBreakdown, hasPrevious: !!previous,
            totalDebts, debtToAssetRatio,
            realEstateValue, liquidValue, btcValue, otherAssets,
            sparkData, allocation,
            fireTarget, fireProgress,
            emergencyFund, emergencyMonths,
            snapshotCount: history.length,
            latestDate: latest.date,
            cagrPercent: historyStats.cagrPercent,
            cagrYears: historyStats.cagrYears,
            maxDrawdownPercent: historyStats.maxDrawdownPercent,
            peakValue: historyStats.peakValue,
        };
    }, [history, preferences]);

    // Usa il netIncome salvato dal patrimonio-dashboard (single source of truth)
    const monthlySavings = useMemo(() => {
        const saved = Number(preferences.netIncome);
        if (!isNaN(saved) && saved !== 0) return saved;
        // Fallback: nessun netIncome salvato, l'utente non ha ancora compilato il profilo
        return undefined;
    }, [preferences]);

    if (!user) {
        return <WelcomeOnboarding />;
    }

    if (loading) {
        return (
            <div className="space-y-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {[...Array(8)].map((_, i) => (
                        <Skeleton key={i} className="h-32 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (!metrics) {
        return (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center space-y-6">
                <div className="p-6 rounded-full bg-muted/80 border border-border/70">
                    <BarChart3 className="w-12 h-12 text-muted-foreground" />
                </div>
                <h2 className="text-3xl font-extrabold text-card-foreground">Riepilogo</h2>
                <p className="text-muted-foreground max-w-md leading-relaxed">Nessun dato trovato. Salva il tuo primo snapshot nel tab Patrimonio per iniziare!</p>
            </div>
        );
    }

    const isPositiveChange = metrics.netWorthChange >= 0;

    return (
        <div className="space-y-8">
            {/* Hero */}
            <div className="text-center space-y-3">
                <h2 className="text-[11px] sm:text-sm font-bold text-muted-foreground uppercase tracking-[0.28em]">Patrimonio Netto</h2>
                <TooltipProvider delayDuration={150}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="text-4xl sm:text-5xl font-extrabold text-card-foreground tabular-nums leading-none cursor-help inline-block">
                                {formatEuro(metrics.currentNetWorth)}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs p-0 text-left">
                            {metrics.hasPrevious && metrics.changeBreakdown.length > 0 ? (
                                <div className="p-3 space-y-2">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Cosa ha mosso il patrimonio
                                    </div>
                                    <div className="space-y-1.5">
                                        {metrics.changeBreakdown.map(item => {
                                            const positive = item.delta >= 0;
                                            const share = metrics.netWorthChange !== 0
                                                ? (item.delta / metrics.netWorthChange) * 100
                                                : 0;
                                            return (
                                                <div key={item.label} className="flex items-center justify-between gap-3 text-xs">
                                                    <span className="flex items-center gap-1.5 text-card-foreground">
                                                        <span className={`w-2 h-2 rounded-full ${item.color}`} />
                                                        {item.label}
                                                    </span>
                                                    <span className={`tabular-nums font-bold ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                        {positive ? '+' : ''}{formatEuro(item.delta)}
                                                        {Math.abs(share) >= 1 && Math.abs(share) <= 150 && (
                                                            <span className="text-muted-foreground font-normal ml-1">({share >= 0 ? '+' : ''}{share.toFixed(0)}%)</span>
                                                        )}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="pt-1.5 border-t border-border/60 flex items-center justify-between text-xs">
                                        <span className="font-bold text-muted-foreground">Totale</span>
                                        <span className={`tabular-nums font-extrabold ${isPositiveChange ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {isPositiveChange ? '+' : ''}{formatEuro(metrics.netWorthChange)}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-3 text-xs text-muted-foreground">
                                    Nessuna variazione dallo snapshot precedente.
                                </div>
                            )}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <div className={`text-sm font-bold ${isPositiveChange ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isPositiveChange ? '+' : ''}{formatEuro(metrics.netWorthChange)}
                    <span className="text-muted-foreground font-normal">({metrics.netWorthChangePercent >= 0 ? '+' : ''}{metrics.netWorthChangePercent.toFixed(1)}% vs snapshot precedente)</span>
                </div>
                <div className="text-xs text-muted-foreground">
                    {metrics.snapshotCount} snapshot totali &middot; ultimo: {new Date(metrics.latestDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>

                {/* Statistiche storiche: CAGR + Max Drawdown */}
                {(metrics.cagrPercent !== null || (metrics.maxDrawdownPercent !== null && metrics.maxDrawdownPercent < 0)) && (
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        {metrics.cagrPercent !== null && metrics.cagrYears !== null && (
                            <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-secondary/60 px-3 py-1 text-xs font-semibold cursor-help">
                                            <LineChart className="size-3.5 text-teal-500" />
                                            <span className="text-muted-foreground">CAGR</span>
                                            <span className={`tabular-nums ${metrics.cagrPercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                {metrics.cagrPercent >= 0 ? '+' : ''}{metrics.cagrPercent.toFixed(1)}%
                                            </span>
                                            <span className="text-muted-foreground font-normal">
                                                /anno
                                            </span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-xs">
                                        <div className="text-xs space-y-1 p-1">
                                            <div className="font-bold">Tasso di crescita annualizzato</div>
                                            <div className="text-muted-foreground">
                                                Crescita composta del patrimonio su {metrics.cagrYears.toFixed(1)} {metrics.cagrYears >= 2 ? 'anni' : 'anno'} di storico.
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        {metrics.maxDrawdownPercent !== null && metrics.maxDrawdownPercent < 0 && metrics.peakValue !== null && (
                            <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-secondary/60 px-3 py-1 text-xs font-semibold cursor-help">
                                            <Activity className="size-3.5 text-rose-500" />
                                            <span className="text-muted-foreground">Max drawdown</span>
                                            <span className="tabular-nums text-rose-600 dark:text-rose-400">
                                                {metrics.maxDrawdownPercent.toFixed(1)}%
                                            </span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-xs">
                                        <div className="text-xs space-y-1 p-1">
                                            <div className="font-bold">Massimo calo da un picco</div>
                                            <div className="text-muted-foreground">
                                                Peggior contrazione percentuale osservata rispetto a un massimo storico. Picco registrato: {formatEuro(metrics.peakValue)}.
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                )}
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                <MetricCard
                    icon={<Home className="w-4 h-4 text-blue-500" />}
                    label="Immobili"
                    value={formatEuro(metrics.realEstateValue)}
                    subtitle={`${metrics.allocation.immobili.toFixed(0)}% del portafoglio`}
                    color="blue"
                />
                <MetricCard
                    icon={<Wallet className="w-4 h-4 text-purple-500" />}
                    label="Liquidita' & ETF"
                    value={formatEuro(metrics.liquidValue)}
                    subtitle={`${metrics.allocation.liquidita.toFixed(0)}% del portafoglio`}
                    color="purple"
                />
                <MetricCard
                    icon={<Bitcoin className="w-4 h-4 text-amber-500" />}
                    label="Bitcoin & Crypto"
                    value={formatEuro(metrics.btcValue)}
                    subtitle={`${metrics.allocation.crypto.toFixed(0)}% del portafoglio`}
                    color="amber"
                />
                <MetricCard
                    icon={<Package className="w-4 h-4 text-slate-500" />}
                    label="Altri Asset"
                    value={formatEuro(metrics.otherAssets)}
                    subtitle={`${metrics.allocation.altro.toFixed(0)}% del portafoglio`}
                    color="slate"
                />
                <MetricCard
                    icon={<TrendingDown className="w-4 h-4 text-rose-500" />}
                    label="Debiti Totali"
                    value={formatEuro(metrics.totalDebts)}
                    subtitle={`${metrics.debtToAssetRatio.toFixed(1)}% rapporto debito/asset`}
                    color="rose"
                />
                <MetricCard
                    icon={<ShieldAlert className="w-4 h-4 text-emerald-500" />}
                    label="Fondo Emergenza"
                    value={formatEuro(metrics.emergencyFund)}
                    subtitle={`${metrics.emergencyMonths.toFixed(1)} mesi di autonomia`}
                    color="emerald"
                />
                {metrics.fireTarget > 0 && (
                    <MetricCard
                        icon={<Flame className="w-4 h-4 text-orange-500" />}
                        label="Progresso FIRE"
                        value={`${metrics.fireProgress.toFixed(1)}%`}
                        subtitle={`Target: ${formatEuro(metrics.fireTarget)}`}
                        color="orange"
                    />
                )}
                {metrics.fireTarget > 0 && (
                    <MetricCard
                        icon={<Target className="w-4 h-4 text-teal-500" />}
                        label="Distanza FIRE"
                        value={formatEuro(Math.max(0, metrics.fireTarget - metrics.currentNetWorth))}
                        subtitle={metrics.fireProgress >= 100 ? "Obiettivo raggiunto!" : "Capitale mancante"}
                        color="teal"
                    />
                )}
            </div>

            {/* Financial Alerts */}
            <FinancialAlerts data={{
                netWorth: metrics.currentNetWorth,
                emergencyFund: metrics.emergencyFund,
                monthlyExpenses: preferences?.expectedMonthlyExpenses ? Number(preferences.expectedMonthlyExpenses) : undefined,
                monthlyIncome: preferences ? Number(preferences.person1Income || 0) + Number(preferences.person2Income || 0) : undefined,
                monthlyInstallment: preferences?.existingInstallment ? Number(preferences.existingInstallment) : undefined,
                fireTarget: metrics.fireTarget || undefined,
                fireProgress: metrics.fireProgress || undefined,
            }} />

            {/* Asset Allocation Bar */}
            <div className="bg-card/80 backdrop-blur-xl border border-border/70 rounded-3xl shadow-sm p-5 sm:p-6">
                <h3 className="text-[11px] sm:text-sm font-bold text-muted-foreground uppercase tracking-[0.24em] mb-4">Allocazione Asset</h3>
                <div className="w-full h-6 bg-muted rounded-full overflow-hidden flex">
                    {metrics.allocation.immobili > 0 && (
                        <div className="bg-blue-500 h-full transition-all duration-700" style={{ width: `${metrics.allocation.immobili}%` }} title={`Immobili ${metrics.allocation.immobili.toFixed(1)}%`} />
                    )}
                    {metrics.allocation.liquidita > 0 && (
                        <div className="bg-purple-500 h-full transition-all duration-700" style={{ width: `${metrics.allocation.liquidita}%` }} title={`Liquidita ${metrics.allocation.liquidita.toFixed(1)}%`} />
                    )}
                    {metrics.allocation.crypto > 0 && (
                        <div className="bg-amber-500 h-full transition-all duration-700" style={{ width: `${metrics.allocation.crypto}%` }} title={`Crypto ${metrics.allocation.crypto.toFixed(1)}%`} />
                    )}
                    {metrics.allocation.altro > 0 && (
                        <div className="bg-slate-400 h-full transition-all duration-700" style={{ width: `${metrics.allocation.altro}%` }} title={`Altro ${metrics.allocation.altro.toFixed(1)}%`} />
                    )}
                </div>
                <div className="flex flex-wrap gap-3 sm:gap-4 mt-3 text-xs font-medium text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Immobili</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Liquidità & ETF</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Crypto</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Altro</span>
                </div>
            </div>

            {/* Net Worth Projection */}
            <NetWorthProjection history={history} monthlySavings={monthlySavings} currentNetWorth={metrics?.currentNetWorth} expectedReturnRate={Number(preferences.fireExpectedReturn) || undefined} />

            {/* Accepted Purchases Summary */}
            {acceptedPurchases.length > 0 && (
                <div className="bg-card/80 backdrop-blur-xl border border-border/70 rounded-3xl shadow-sm p-5 sm:p-6">
                    <h3 className="text-[11px] sm:text-sm font-bold text-muted-foreground uppercase tracking-[0.24em] mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Acquisti Accettati
                    </h3>
                    <div className="space-y-2">
                        {acceptedPurchases.map(p => (
                            <div key={p.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-sm p-3 bg-muted/60 rounded-xl">
                                <div>
                                    <span className="font-bold text-card-foreground">{p.itemName}</span>
                                    <span className="text-xs text-muted-foreground sm:ml-2">{p.category}</span>
                                </div>
                                <div className="text-right sm:shrink-0">
                                    <span className="font-bold text-card-foreground tabular-nums">{formatEuro(p.totalPrice)}</span>
                                    {p.isFinanced && (
                                        <span className="text-xs text-rose-500 dark:text-rose-400 sm:ml-2">-{formatEuro(p.monthlyPayment)}/m</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mt-4 pt-3 border-t border-border text-sm">
                        <span className="font-bold text-muted-foreground">Totale Rate Finanziate</span>
                        <span className="font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                            {formatEuro(acceptedPurchases.filter(p => p.isFinanced).reduce((s, p) => s + p.monthlyPayment, 0))}
                        </span>/mese
                    </div>
                </div>
            )}

            {/* Export Button */}
            {history.length > 0 && (
                <div className="flex justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl text-xs min-h-10 px-4"
                        onClick={() => exportPatrimonioCSV(history)}
                    >
                        <FileDown className="w-3.5 h-3.5 mr-1.5" /> Esporta Storico CSV
                    </Button>
                </div>
            )}
        </div>
    );
}
