/**
 * Metriche di performance portafoglio basate su snapshot mensili e flussi di cassa.
 *
 * ROI, CAGR, TWR, MWR (IRR), Volatilità annualizzata, Sharpe Ratio,
 * Max Drawdown + durata + recovery time.
 *
 * Tutti i calcoli operano su un array di snapshot ordinati cronologicamente
 * con associati flussi di cassa mensili.
 */

export interface NetWorthSnapshot {
    date: string;      // ISO date
    netWorth: number;  // EUR
}

export interface MonthlyCashFlow {
    ym: string;     // YYYY-MM
    netCashFlow: number; // contributi positivi, prelievi negativi (dividendi esclusi)
}

export interface PerformanceMetrics {
    startDate: string;
    endDate: string;
    months: number;
    startNetWorth: number;
    endNetWorth: number;
    totalCashFlow: number;   // somma contributi nel periodo
    roi: number | null;        // %
    cagr: number | null;       // % annualizzato
    twr: number | null;        // % annualizzato
    mwr: number | null;        // % annualizzato (IRR)
    volatility: number | null;  // % annualizzata
    sharpeRatio: number | null;
    maxDrawdown: number | null; // % (negativo)
    maxDrawdownDate: string | null;
    drawdownDurationMonths: number | null;
    recoveryMonths: number | null;
    currentDrawdown: number | null; // %
}

export interface MonthlyReturn {
    ym: string;
    returnPct: number; // %
}

function ymKey(date: string): string {
    return date.slice(0, 7);
}

function buildCashflowMap(flows: MonthlyCashFlow[]): Map<string, number> {
    const m = new Map<string, number>();
    for (const f of flows) m.set(f.ym, (m.get(f.ym) ?? 0) + f.netCashFlow);
    return m;
}

/**
 * Calcola i rendimenti mensili rimuovendo l'effetto dei flussi di cassa.
 * formula: r_m = (endNW - cashFlow) / startNW - 1
 */
export function calculateMonthlyReturns(
    snapshots: NetWorthSnapshot[],
    flows: MonthlyCashFlow[]
): MonthlyReturn[] {
    const cf = buildCashflowMap(flows);
    const out: MonthlyReturn[] = [];
    for (let i = 1; i < snapshots.length; i++) {
        const prev = snapshots[i - 1];
        const cur = snapshots[i];
        if (prev.netWorth <= 0) continue;
        const flow = cf.get(ymKey(cur.date)) ?? 0;
        const ret = ((cur.netWorth - flow) / prev.netWorth) - 1;
        out.push({ ym: ymKey(cur.date), returnPct: ret * 100 });
    }
    return out;
}

export function calculateROI(startNW: number, endNW: number, totalFlows: number): number | null {
    if (startNW <= 0) return null;
    return ((endNW - startNW - totalFlows) / startNW) * 100;
}

export function calculateCAGR(startNW: number, endNW: number, totalFlows: number, months: number): number | null {
    const years = months / 12;
    if (years <= 0) return null;
    const adjStart = startNW + totalFlows;
    if (adjStart <= 0) return null;
    const ratio = endNW / adjStart;
    if (ratio <= 0) return null;
    return (Math.pow(ratio, 1 / years) - 1) * 100;
}

/** Time-Weighted Return: compone i rendimenti mensili, annualizza. */
export function calculateTWR(monthly: MonthlyReturn[], months: number): number | null {
    if (monthly.length === 0 || months <= 0) return null;
    let product = 1;
    for (const m of monthly) {
        product *= (1 + m.returnPct / 100);
    }
    if (product <= 0) return null;
    const totalReturn = product - 1;
    const years = months / 12;
    return (Math.pow(1 + totalReturn, 1 / years) - 1) * 100;
}

/** Volatilità annualizzata (deviazione standard dei rendimenti mensili × √12). */
export function calculateVolatility(monthly: MonthlyReturn[]): number | null {
    // Filtro outlier: movimenti > ±50% probabilmente sono contributi spike
    const filtered = monthly.filter((m) => Math.abs(m.returnPct) <= 50);
    if (filtered.length < 2) return null;
    const mean = filtered.reduce((s, m) => s + m.returnPct, 0) / filtered.length;
    const variance = filtered.reduce((s, m) => s + (m.returnPct - mean) ** 2, 0) / (filtered.length - 1);
    const stdDev = Math.sqrt(variance);
    return stdDev * Math.sqrt(12);
}

/** Sharpe Ratio = (Return - RiskFree) / Volatility */
export function calculateSharpeRatio(annualReturn: number | null, volatility: number | null, riskFreeRate = 2.5): number | null {
    if (annualReturn == null || volatility == null || volatility === 0) return null;
    return (annualReturn - riskFreeRate) / volatility;
}

/**
 * Max Drawdown + data del punto più basso.
 * Calcola su serie "TWR-adjusted": netWorth - cumulativeCashflow
 */
export function calculateMaxDrawdown(
    snapshots: NetWorthSnapshot[],
    flows: MonthlyCashFlow[]
): { drawdown: number | null; troughDate: string | null; peakDate: string | null; recoveryDate: string | null; currentDrawdown: number | null } {
    const cf = buildCashflowMap(flows);
    let cumulativeCf = 0;
    const adjusted: { date: string; value: number }[] = snapshots.map((s) => {
        cumulativeCf += cf.get(ymKey(s.date)) ?? 0;
        return { date: s.date, value: s.netWorth - cumulativeCf };
    });

    if (adjusted.length < 2) {
        return { drawdown: null, troughDate: null, peakDate: null, recoveryDate: null, currentDrawdown: null };
    }

    let peak = adjusted[0].value;
    let peakIdx = 0;
    let maxDrawdown = 0;
    let troughIdx = 0;
    let maxPeakIdx = 0;

    for (let i = 1; i < adjusted.length; i++) {
        if (adjusted[i].value > peak) {
            peak = adjusted[i].value;
            peakIdx = i;
        } else if (peak > 0) {
            const dd = (adjusted[i].value - peak) / peak;
            if (dd < maxDrawdown) {
                maxDrawdown = dd;
                troughIdx = i;
                maxPeakIdx = peakIdx;
            }
        }
    }

    const currentValue = adjusted[adjusted.length - 1].value;
    const currentPeak = Math.max(...adjusted.map((a) => a.value));
    const currentDrawdown = currentPeak > 0 ? ((currentValue - currentPeak) / currentPeak) * 100 : 0;

    if (maxDrawdown === 0) {
        return { drawdown: null, troughDate: null, peakDate: null, recoveryDate: null, currentDrawdown };
    }

    const peakValue = adjusted[maxPeakIdx].value;
    let recoveryDate: string | null = null;
    for (let i = troughIdx + 1; i < adjusted.length; i++) {
        if (adjusted[i].value >= peakValue) {
            recoveryDate = adjusted[i].date;
            break;
        }
    }

    return {
        drawdown: maxDrawdown * 100,
        troughDate: adjusted[troughIdx].date,
        peakDate: adjusted[maxPeakIdx].date,
        recoveryDate,
        currentDrawdown,
    };
}

function diffMonths(fromIso: string, toIso: string): number {
    const a = new Date(fromIso);
    const b = new Date(toIso);
    return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

/** Money-Weighted Return / IRR via Newton-Raphson */
export function calculateIRR(
    snapshots: NetWorthSnapshot[],
    flows: MonthlyCashFlow[]
): number | null {
    if (snapshots.length < 2) return null;
    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    const startDate = new Date(first.date);

    // Build cashflow series: initial - start NW (outflow), each month's flow (outflow), final + end NW (inflow)
    const series: { t: number; cf: number }[] = [];
    series.push({ t: 0, cf: -first.netWorth });
    const cfMap = buildCashflowMap(flows);
    for (const [ym, amount] of cfMap.entries()) {
        const [y, m] = ym.split('-').map(Number);
        const d = new Date(Date.UTC(y, m - 1, 15));
        const t = (d.getTime() - startDate.getTime()) / (365.25 * 24 * 3600 * 1000);
        if (t > 0) series.push({ t, cf: -amount });
    }
    const endT = (new Date(last.date).getTime() - startDate.getTime()) / (365.25 * 24 * 3600 * 1000);
    series.push({ t: Math.max(endT, 0.01), cf: last.netWorth });

    const npv = (r: number) => series.reduce((s, { t, cf }) => s + cf / Math.pow(1 + r, t), 0);
    const dNpv = (r: number) => series.reduce((s, { t, cf }) => s - t * cf / Math.pow(1 + r, t + 1), 0);

    let rate = 0.08;
    for (let i = 0; i < 100; i++) {
        const v = npv(rate);
        const d = dNpv(rate);
        if (Math.abs(d) < 1e-10) break;
        const next = rate - v / d;
        if (Math.abs(next - rate) < 1e-6) {
            rate = next;
            break;
        }
        rate = Math.max(next, -0.99);
    }

    return Number.isFinite(rate) ? rate * 100 : null;
}

/**
 * Aggregato di tutte le metriche per un intervallo di snapshot.
 */
export function calculatePerformance(
    snapshots: NetWorthSnapshot[],
    flows: MonthlyCashFlow[],
    opts: { riskFreeRate?: number } = {}
): PerformanceMetrics {
    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];

    const months = snapshots.length >= 2 ? Math.max(1, diffMonths(first.date, last.date)) : 0;
    const monthlyReturns = calculateMonthlyReturns(snapshots, flows);

    const totalFlows = flows.reduce((s, f) => s + f.netCashFlow, 0);
    const roi = calculateROI(first.netWorth, last.netWorth, totalFlows);
    const cagr = calculateCAGR(first.netWorth, last.netWorth, totalFlows, months);
    const twr = calculateTWR(monthlyReturns, months);
    const mwr = calculateIRR(snapshots, flows);
    const volatility = calculateVolatility(monthlyReturns);
    const sharpe = calculateSharpeRatio(twr ?? cagr, volatility, opts.riskFreeRate);
    const dd = calculateMaxDrawdown(snapshots, flows);

    let ddDuration: number | null = null;
    let recovery: number | null = null;
    if (dd.drawdown !== null && dd.peakDate && dd.troughDate) {
        ddDuration = diffMonths(dd.peakDate, dd.troughDate);
        if (dd.recoveryDate) recovery = diffMonths(dd.troughDate, dd.recoveryDate);
    }

    return {
        startDate: first?.date ?? '',
        endDate: last?.date ?? '',
        months,
        startNetWorth: first?.netWorth ?? 0,
        endNetWorth: last?.netWorth ?? 0,
        totalCashFlow: totalFlows,
        roi,
        cagr,
        twr,
        mwr,
        volatility,
        sharpeRatio: sharpe,
        maxDrawdown: dd.drawdown,
        maxDrawdownDate: dd.troughDate,
        drawdownDurationMonths: ddDuration,
        recoveryMonths: recovery,
        currentDrawdown: dd.currentDrawdown,
    };
}

/**
 * Prepara i dati per il grafico Underwater Drawdown:
 * ogni punto rappresenta quanto il portafoglio è sotto il picco storico (0% = peak).
 */
export function calculateUnderwaterSeries(
    snapshots: NetWorthSnapshot[],
    flows: MonthlyCashFlow[]
): { date: string; drawdown: number }[] {
    if (snapshots.length === 0) return [];
    const cf = buildCashflowMap(flows);
    let cumulativeCf = 0;
    let peak = 0;
    const out: { date: string; drawdown: number }[] = [];
    for (const s of snapshots) {
        cumulativeCf += cf.get(ymKey(s.date)) ?? 0;
        const adjusted = s.netWorth - cumulativeCf;
        if (adjusted > peak) peak = adjusted;
        const dd = peak > 0 ? ((adjusted - peak) / peak) * 100 : 0;
        out.push({ date: s.date, drawdown: dd });
    }
    return out;
}
