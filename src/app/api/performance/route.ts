import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId, unauthorizedResponse, UnauthorizedError } from '@/lib/api-auth';
import {
    calculatePerformance,
    calculateMonthlyReturns,
    calculateUnderwaterSeries,
    type NetWorthSnapshot,
    type MonthlyCashFlow,
} from '@/lib/finance/performance-metrics';
import type { AssetRecord } from '@/types';

/**
 * GET /api/performance?period=ytd|1y|3y|5y|all
 *
 * Calcola metriche performance sul portafoglio. Esclude gli immobili dal netWorth
 * per concentrarsi sul "patrimonio investibile".
 */

type Period = 'ytd' | '1y' | '3y' | '5y' | 'all';

function snapshotNetWorth(r: AssetRecord): number {
    const crypto = (r.bitcoinAmount || 0) * (r.bitcoinPrice || 0);
    return (r.liquidStockValue || 0) +
        (r.stocksSnapshotValue || 0) +
        (r.safeHavens || 0) +
        (r.emergencyFund || 0) +
        (r.pensionFund || 0) +
        crypto -
        (r.debtsTotal || 0);
}

function filterByPeriod(snapshots: NetWorthSnapshot[], period: Period, today: Date): NetWorthSnapshot[] {
    if (period === 'all' || snapshots.length === 0) return snapshots;
    let cutoff: Date;
    if (period === 'ytd') {
        cutoff = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
        // Include also December of previous year as baseline
        const decPrev = new Date(Date.UTC(today.getUTCFullYear() - 1, 11, 1));
        return snapshots.filter((s) => new Date(s.date) >= decPrev);
    }
    if (period === '1y') cutoff = new Date(today.getTime() - 365 * 24 * 3600 * 1000);
    else if (period === '3y') cutoff = new Date(today.getTime() - 3 * 365 * 24 * 3600 * 1000);
    else cutoff = new Date(today.getTime() - 5 * 365 * 24 * 3600 * 1000);

    return snapshots.filter((s) => new Date(s.date) >= cutoff);
}

/**
 * Infer cashflow da budget transactions (uscite/entrate mensili).
 * Consideriamo come "cashflow" solo i movimenti di finanziamento del portafoglio.
 * Stima approssimata: delta snapshot meno rendimento stimato. Per semplicità iniziale
 * derivare da budget transactions nette.
 */
async function getMonthlyCashflows(userId: string): Promise<MonthlyCashFlow[]> {
    const txs = await prisma.budgetTransaction.findMany({ where: { userId } });
    const map = new Map<string, number>();
    for (const t of txs) {
        const ym = t.date.slice(0, 7);
        map.set(ym, (map.get(ym) ?? 0) + t.amount);
    }
    return [...map.entries()].map(([ym, netCashFlow]) => ({ ym, netCashFlow }));
}

export async function GET(req: Request) {
    try {
        const userId = await getAuthenticatedUserId();
        const { searchParams } = new URL(req.url);
        const period = (searchParams.get('period') ?? '1y') as Period;

        const [records, cashflows] = await Promise.all([
            prisma.assetRecord.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
            getMonthlyCashflows(userId),
        ]);

        // Monthly snapshots: deduplicate by YM taking latest per month
        const byMonth = new Map<string, NetWorthSnapshot>();
        for (const r of records) {
            const iso = r.date.toISOString().slice(0, 10);
            const ym = iso.slice(0, 7);
            const nw = snapshotNetWorth(r as unknown as AssetRecord);
            byMonth.set(ym, { date: iso, netWorth: nw });
        }
        const allSnapshots = [...byMonth.values()].sort((a, b) => a.date.localeCompare(b.date));
        const filtered = filterByPeriod(allSnapshots, period, new Date());

        // Risk-free rate from preferences (default 2.5%)
        const riskFree = 2.5;

        const metrics = calculatePerformance(filtered, cashflows, { riskFreeRate: riskFree });
        const monthly = calculateMonthlyReturns(filtered, cashflows);
        const underwater = calculateUnderwaterSeries(filtered, cashflows);

        return NextResponse.json({
            period,
            metrics,
            monthlyReturns: monthly,
            underwaterSeries: underwater,
            snapshotCount: filtered.length,
            hasEnoughData: filtered.length >= 3,
        });
    } catch (err) {
        if (err instanceof UnauthorizedError) return unauthorizedResponse();
        console.error('GET /api/performance error:', err);
        return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
    }
}
