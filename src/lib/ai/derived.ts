/**
 * Aggregatori derivati pensati per essere passati come contesto all'LLM.
 * Tutto pure: input = preferenze + snapshot + transazioni; output = numeri pronti.
 */

interface AssetSnapshot {
    date: string | Date;
    realEstateValue: number;
    realEstateCosts: number;
    realEstateRent: number;
    liquidStockValue: number;
    stocksSnapshotValue: number;
    customStocksList?: string;
    safeHavens: number;
    emergencyFund: number;
    pensionFund: number;
    bitcoinAmount: number;
    bitcoinPrice: number;
    debtsTotal: number;
}

interface BudgetTx {
    date: string;
    amount: number; // negativo = uscita, positivo = entrata
    category: string;
}

interface PreferenceLite {
    expensesList?: string;
    netIncome?: number;
    customStocksList?: string;
    fireWithdrawalRate?: number;
    expectedMonthlyExpenses?: number | null;
    birthYear?: number | null;
    retirementAge?: number | null;
    subscriptionsList?: string;
    grossIncome?: number;
    pensionContribution?: number;
    enablePensionOptimizer?: boolean;
}

interface GoalLite {
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: string | null;
    category?: string;
}

function safeJson<T>(raw: string | undefined | null, fallback: T): T {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

function totalAssets(s: AssetSnapshot): number {
    return (
        (s.realEstateValue || 0) +
        (s.liquidStockValue || 0) +
        (s.stocksSnapshotValue || 0) +
        (s.safeHavens || 0) +
        (s.emergencyFund || 0) +
        (s.pensionFund || 0) +
        (s.bitcoinAmount || 0) * (s.bitcoinPrice || 0)
    );
}

function netWorth(s: AssetSnapshot): number {
    return totalAssets(s) - (s.debtsTotal || 0);
}

function findClosestAtOrBefore<T extends { _d: Date }>(
    snapshots: T[],
    target: Date,
): { idx: number } | null {
    let best = -1;
    for (let i = 0; i < snapshots.length; i++) {
        if (snapshots[i]._d.getTime() <= target.getTime()) best = i;
        else break;
    }
    return best >= 0 ? { idx: best } : null;
}

function pct(curr: number, prev: number): number | null {
    if (!prev || prev === 0) return null;
    return ((curr - prev) / Math.abs(prev)) * 100;
}

export interface DerivedNetWorthPoint {
    date: string;
    netWorth: number;
    totalAssets: number;
    debts: number;
    breakdown: {
        realEstate: number;
        liquidStocks: number;
        bitcoin: number;
        safeHavens: number;
        emergencyFund: number;
        pensionFund: number;
    };
}

export interface DerivedDeltas {
    momPct: number | null;
    momAbs: number | null;
    yoyPct: number | null;
    yoyAbs: number | null;
    ytdPct: number | null;
    ytdAbs: number | null;
    sinceFirstPct: number | null;
    sinceFirstAbs: number | null;
}

export interface DerivedAllocation {
    asOf: string;
    netWorth: number;
    totalAssets: number;
    debts: number;
    classes: Array<{ name: string; value: number; pct: number }>;
}

export interface DerivedBudgetSummary {
    monthsTracked: number;
    avgMonthlyExpenses: number;
    avgMonthlyIncome: number;
    avgSavingRatePct: number | null;
    last3Months: Array<{ month: string; income: number; expenses: number; net: number }>;
    topCategoriesLast3M: Array<{ category: string; amount: number }>;
}

export interface DerivedSubscriptions {
    monthlyTotal: number;
    annualTotal: number;
    items: Array<{ name: string; monthly: number; frequency: "mensile" | "annuale" }>;
}

export interface DerivedGoals {
    items: Array<{
        name: string;
        category: string;
        progressPct: number;
        remaining: number;
        deadline: string | null;
        monthlyToTarget: number | null;
    }>;
}

export interface DerivedFireQuickCheck {
    currentNetWorth: number;
    investableNetWorth: number;
    annualExpensesEstimate: number;
    fireTargetEstimate: number | null;
    gapToFire: number | null;
    progressPct: number | null;
    swrUsedPct: number;
    currentAge: number | null;
    yearsToRetirement: number | null;
}

export interface DerivedMarketEffect {
    note: string;
    stocksValueNow: number | null;
    bitcoinValueNow: number | null;
    btcAvgPriceLastSnapshots: number | null;
}

export interface DerivedBundle {
    netWorth: {
        timeline: DerivedNetWorthPoint[];
        current: DerivedNetWorthPoint | null;
        deltas: DerivedDeltas;
    };
    allocation: DerivedAllocation | null;
    budget: DerivedBudgetSummary | null;
    subscriptions: DerivedSubscriptions | null;
    goals: DerivedGoals | null;
    fire: DerivedFireQuickCheck | null;
    market: DerivedMarketEffect | null;
}

function buildTimeline(snapshots: AssetSnapshot[]): DerivedNetWorthPoint[] {
    return snapshots.map((s) => ({
        date: (s.date instanceof Date ? s.date : new Date(s.date)).toISOString().slice(0, 10),
        netWorth: netWorth(s),
        totalAssets: totalAssets(s),
        debts: s.debtsTotal || 0,
        breakdown: {
            realEstate: s.realEstateValue || 0,
            liquidStocks: (s.liquidStockValue || 0) + (s.stocksSnapshotValue || 0),
            bitcoin: (s.bitcoinAmount || 0) * (s.bitcoinPrice || 0),
            safeHavens: s.safeHavens || 0,
            emergencyFund: s.emergencyFund || 0,
            pensionFund: s.pensionFund || 0,
        },
    }));
}

function computeDeltas(timeline: DerivedNetWorthPoint[]): DerivedDeltas {
    if (timeline.length === 0) {
        return {
            momPct: null, momAbs: null, yoyPct: null, yoyAbs: null,
            ytdPct: null, ytdAbs: null, sinceFirstPct: null, sinceFirstAbs: null,
        };
    }
    const dated = timeline.map((p) => ({ ...p, _d: new Date(p.date) }));
    const last = dated[dated.length - 1];
    const target = new Date(last._d);
    const monthAgo = new Date(target); monthAgo.setMonth(monthAgo.getMonth() - 1);
    const yearAgo = new Date(target); yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    const yearStart = new Date(target.getFullYear(), 0, 1);

    const findAt = (when: Date) => findClosestAtOrBefore(dated, when);
    const mom = findAt(monthAgo);
    const yoy = findAt(yearAgo);
    const ytd = findAt(yearStart);
    const first = dated[0];

    const valAt = (idx: number) => dated[idx].netWorth;

    return {
        momPct: mom ? pct(last.netWorth, valAt(mom.idx)) : null,
        momAbs: mom ? last.netWorth - valAt(mom.idx) : null,
        yoyPct: yoy ? pct(last.netWorth, valAt(yoy.idx)) : null,
        yoyAbs: yoy ? last.netWorth - valAt(yoy.idx) : null,
        ytdPct: ytd ? pct(last.netWorth, valAt(ytd.idx)) : null,
        ytdAbs: ytd ? last.netWorth - valAt(ytd.idx) : null,
        sinceFirstPct: pct(last.netWorth, first.netWorth),
        sinceFirstAbs: last.netWorth - first.netWorth,
    };
}

function computeAllocation(curr: DerivedNetWorthPoint | null): DerivedAllocation | null {
    if (!curr) return null;
    const b = curr.breakdown;
    const items = [
        { name: "Immobili", value: b.realEstate },
        { name: "Azioni/ETF", value: b.liquidStocks },
        { name: "Bitcoin", value: b.bitcoin },
        { name: "Beni rifugio", value: b.safeHavens },
        { name: "Liquidità/Emergenza", value: b.emergencyFund },
        { name: "Fondo pensione", value: b.pensionFund },
    ].filter((i) => i.value > 0);
    const total = items.reduce((s, i) => s + i.value, 0);
    return {
        asOf: curr.date,
        netWorth: curr.netWorth,
        totalAssets: curr.totalAssets,
        debts: curr.debts,
        classes: items.map((i) => ({
            name: i.name,
            value: i.value,
            pct: total > 0 ? (i.value / total) * 100 : 0,
        })),
    };
}

function computeBudget(transactions: BudgetTx[]): DerivedBudgetSummary | null {
    if (transactions.length === 0) return null;
    const byMonth = new Map<string, { income: number; expenses: number }>();
    const catTotals = new Map<string, number>();
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 3);

    for (const t of transactions) {
        const month = t.date.slice(0, 7);
        const cur = byMonth.get(month) ?? { income: 0, expenses: 0 };
        if (t.amount > 0) cur.income += t.amount;
        else cur.expenses += -t.amount;
        byMonth.set(month, cur);

        if (t.amount < 0 && new Date(t.date) >= cutoffDate) {
            catTotals.set(t.category, (catTotals.get(t.category) ?? 0) + -t.amount);
        }
    }

    const months = Array.from(byMonth.entries())
        .map(([m, v]) => ({ month: m, ...v, net: v.income - v.expenses }))
        .sort((a, b) => a.month.localeCompare(b.month));

    if (months.length === 0) return null;

    const totalIncome = months.reduce((s, m) => s + m.income, 0);
    const totalExpenses = months.reduce((s, m) => s + m.expenses, 0);
    const avgInc = totalIncome / months.length;
    const avgExp = totalExpenses / months.length;
    const savingRate = avgInc > 0 ? ((avgInc - avgExp) / avgInc) * 100 : null;

    const topCats = Array.from(catTotals.entries())
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

    return {
        monthsTracked: months.length,
        avgMonthlyExpenses: Math.round(avgExp),
        avgMonthlyIncome: Math.round(avgInc),
        avgSavingRatePct: savingRate,
        last3Months: months.slice(-3),
        topCategoriesLast3M: topCats,
    };
}

interface SubscriptionItem { name: string; amount: number; frequency: "mensile" | "annuale" }

function computeSubscriptions(prefs: PreferenceLite): DerivedSubscriptions | null {
    const list = safeJson<SubscriptionItem[]>(prefs.subscriptionsList, []);
    if (list.length === 0) return null;
    let monthly = 0;
    const items = list.map((s) => {
        const m = s.frequency === "annuale" ? s.amount / 12 : s.amount;
        monthly += m;
        return { name: s.name, monthly: m, frequency: s.frequency };
    });
    return {
        monthlyTotal: Math.round(monthly * 100) / 100,
        annualTotal: Math.round(monthly * 12 * 100) / 100,
        items,
    };
}

function computeGoals(goals: GoalLite[]): DerivedGoals | null {
    if (goals.length === 0) return null;
    const now = new Date();
    return {
        items: goals.map((g) => {
            const remaining = Math.max(0, g.targetAmount - g.currentAmount);
            const progress = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
            let monthly: number | null = null;
            if (g.deadline) {
                const dl = new Date(g.deadline + "-01");
                const months = Math.max(1, (dl.getFullYear() - now.getFullYear()) * 12 + (dl.getMonth() - now.getMonth()));
                monthly = remaining / months;
            }
            return {
                name: g.name,
                category: g.category ?? "general",
                progressPct: Math.round(progress * 10) / 10,
                remaining: Math.round(remaining),
                deadline: g.deadline ?? null,
                monthlyToTarget: monthly !== null ? Math.round(monthly) : null,
            };
        }),
    };
}

function annualExpensesFromPrefs(prefs: PreferenceLite, budget: DerivedBudgetSummary | null): number {
    if (prefs.expectedMonthlyExpenses && prefs.expectedMonthlyExpenses > 0) {
        return prefs.expectedMonthlyExpenses * 12;
    }
    const exp = safeJson<{ amount: number; isAnnual?: boolean }[]>(prefs.expensesList, []);
    if (exp.length > 0) {
        const monthly = exp.reduce((s, e) => s + (e.isAnnual ? e.amount / 12 : e.amount), 0);
        return monthly * 12;
    }
    if (budget?.avgMonthlyExpenses) return budget.avgMonthlyExpenses * 12;
    return 0;
}

function computeFire(
    prefs: PreferenceLite,
    curr: DerivedNetWorthPoint | null,
    budget: DerivedBudgetSummary | null,
): DerivedFireQuickCheck | null {
    if (!curr) return null;
    const swr = prefs.fireWithdrawalRate ?? 3.25;
    const annualExp = annualExpensesFromPrefs(prefs, budget);
    const target = annualExp > 0 ? annualExp / (swr / 100) : null;
    const gap = target !== null ? target - curr.netWorth : null;
    const progress = target !== null && target > 0 ? (curr.netWorth / target) * 100 : null;
    const investable = curr.netWorth - curr.breakdown.realEstate;
    const currentAge = prefs.birthYear ? new Date().getFullYear() - prefs.birthYear : null;
    const ytr = prefs.retirementAge && currentAge !== null ? prefs.retirementAge - currentAge : null;
    return {
        currentNetWorth: Math.round(curr.netWorth),
        investableNetWorth: Math.round(investable),
        annualExpensesEstimate: Math.round(annualExp),
        fireTargetEstimate: target !== null ? Math.round(target) : null,
        gapToFire: gap !== null ? Math.round(gap) : null,
        progressPct: progress !== null ? Math.round(progress * 10) / 10 : null,
        swrUsedPct: swr,
        currentAge,
        yearsToRetirement: ytr,
    };
}

function computeMarketEffect(snapshots: AssetSnapshot[]): DerivedMarketEffect | null {
    if (snapshots.length === 0) return null;
    const last = snapshots[snapshots.length - 1];
    const stocksNow = (last.liquidStockValue || 0) + (last.stocksSnapshotValue || 0);
    const btcNow = (last.bitcoinAmount || 0) * (last.bitcoinPrice || 0);

    const recent = snapshots.slice(-6).filter((s) => (s.bitcoinPrice || 0) > 0);
    const avgBtc = recent.length > 0 ? recent.reduce((s, r) => s + r.bitcoinPrice, 0) / recent.length : null;

    return {
        note: "L'effetto mercato preciso (contributi vs rivalutazione) richiede transazioni etichettate; questi sono valori snapshot. Confronta timeline e contributi mensili stimati per dedurre l'effetto.",
        stocksValueNow: Math.round(stocksNow),
        bitcoinValueNow: Math.round(btcNow),
        btcAvgPriceLastSnapshots: avgBtc !== null ? Math.round(avgBtc) : null,
    };
}

export function buildDerived(args: {
    preferences: PreferenceLite | null;
    snapshots: AssetSnapshot[];
    goals: GoalLite[];
    transactions: BudgetTx[];
}): DerivedBundle {
    const sortedSnapshots = [...args.snapshots].sort((a, b) => {
        const da = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
        const db = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
        return da - db;
    });
    const timeline = buildTimeline(sortedSnapshots);
    const current = timeline.length > 0 ? timeline[timeline.length - 1] : null;
    const deltas = computeDeltas(timeline);
    const allocation = computeAllocation(current);
    const budget = computeBudget(args.transactions);
    const subscriptions = args.preferences ? computeSubscriptions(args.preferences) : null;
    const goals = computeGoals(args.goals);
    const fire = args.preferences ? computeFire(args.preferences, current, budget) : null;
    const market = computeMarketEffect(sortedSnapshots);

    return {
        netWorth: { timeline, current, deltas },
        allocation,
        budget,
        subscriptions,
        goals,
        fire,
        market,
    };
}
