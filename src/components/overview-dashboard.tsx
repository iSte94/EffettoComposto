"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
    BarChart3, Home, Wallet, Bitcoin, Package,
    Flame, Target, ShieldAlert, TrendingDown, FileDown, CheckCircle2,
} from "lucide-react";
import { formatEuro } from "@/lib/format";
import { FinancialAlerts } from "@/components/financial-alerts";
import { NetWorthProjection } from "@/components/patrimonio/net-worth-projection";

import { WelcomeOnboarding } from "@/components/welcome-onboarding";
import { exportPatrimonioCSV } from "@/lib/export/csv";
import type { AssetRecord, AcceptedPurchase, ExistingLoan } from "@/types";

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
    const [existingLoans, setExistingLoans] = useState<ExistingLoan[]>([]);

    useEffect(() => {
        if (!user) { setLoading(false); return; }

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
                try { setExistingLoans(JSON.parse(prefData.preferences.existingLoansList || "[]")); } catch { /* empty */ }
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
            currentNetWorth, netWorthChange, netWorthChangePercent,
            totalDebts, debtToAssetRatio,
            realEstateValue, liquidValue, btcValue, otherAssets,
            sparkData, allocation,
            fireTarget, fireProgress,
            emergencyFund, emergencyMonths,
            snapshotCount: history.length,
            latestDate: latest.date,
        };
    }, [history, preferences]);

    // Calcola risparmio netto mensile dalle preferenze (stesso calcolo del patrimonio-dashboard)
    const monthlySavings = useMemo(() => {
        const grossIncome = Number(preferences.person1Income || 0) + Number(preferences.person2Income || 0);
        if (grossIncome <= 0) return undefined;

        // Spese manuali
        let manualExpenses = 0;
        try {
            const list = JSON.parse(String(preferences.expensesList || "[]"));
            manualExpenses = list.reduce((acc: number, e: { amount?: number; isAnnual?: boolean }) => acc + ((e.amount || 0) / (e.isAnnual ? 12 : 1)), 0);
        } catch { /* empty */ }

        // Costi e affitti immobili (annuali → mensili)
        let realEstateMonthlyCosts = 0;
        let realEstateMonthlyRent = 0;
        try {
            const reList = JSON.parse(String(preferences.realEstateList || "[]"));
            const annualCosts = reList.reduce((acc: number, p: { costs?: number; imu?: number; isPrimaryResidence?: boolean }) => {
                const costs = p.costs || 0;
                const imu = (!p.isPrimaryResidence ? (p.imu || 0) : 0);
                return acc + costs + imu;
            }, 0);
            realEstateMonthlyCosts = annualCosts / 12;
            const annualRent = reList.reduce((acc: number, p: { monthlyRent?: number }) => acc + ((p.monthlyRent || 0) * 12), 0);
            realEstateMonthlyRent = annualRent / 12;
        } catch { /* empty */ }

        // Rate prestiti (rata già disponibile nel tipo ExistingLoan)
        let monthlyLoanPayments = 0;
        const now = new Date();
        for (const loan of existingLoans) {
            const end = new Date(loan.endDate + "-01");
            if (end > now) {
                monthlyLoanPayments += loan.installment || 0;
            }
        }

        return grossIncome + realEstateMonthlyRent - manualExpenses - realEstateMonthlyCosts - monthlyLoanPayments;
    }, [preferences, existingLoans]);

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
                <div className="text-4xl sm:text-5xl font-extrabold text-card-foreground tabular-nums leading-none">
                    {formatEuro(metrics.currentNetWorth)}
                </div>
                <div className={`text-sm font-bold ${isPositiveChange ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {isPositiveChange ? '+' : ''}{formatEuro(metrics.netWorthChange)}
                    <span className="text-muted-foreground font-normal">({metrics.netWorthChangePercent >= 0 ? '+' : ''}{metrics.netWorthChangePercent.toFixed(1)}% vs snapshot precedente)</span>
                </div>
                <div className="text-xs text-muted-foreground">
                    {metrics.snapshotCount} snapshot totali &middot; ultimo: {new Date(metrics.latestDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
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
            <NetWorthProjection history={history} monthlySavings={monthlySavings} currentNetWorth={metrics?.currentNetWorth} />

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
