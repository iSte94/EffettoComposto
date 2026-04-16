import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId, unauthorizedResponse, UnauthorizedError } from '@/lib/api-auth';
import { computeDividendOverview, computeYocMetrics, type DividendRecordLite, type AssetPositionLite } from '@/lib/finance/dividend-stats';
import type { CustomStock } from '@/types';

/**
 * GET /api/dividends/stats
 *
 * Ritorna overview (totali, per mese/anno/asset) + metriche YoC sul portafoglio corrente.
 */
export async function GET() {
    try {
        const userId = await getAuthenticatedUserId();

        const [dividends, preference, latestAssetRecord] = await Promise.all([
            prisma.dividendRecord.findMany({ where: { userId }, orderBy: { paymentDate: 'desc' } }),
            prisma.preference.findUnique({ where: { userId } }),
            prisma.assetRecord.findFirst({ where: { userId }, orderBy: { date: 'desc' } }),
        ]);

        // Preferisci la lista live da Preference (aggiornata in tempo reale);
        // fallback al latest snapshot se manca.
        let stocks: CustomStock[] = [];
        try {
            const fromPref = preference?.customStocksList
                ? (JSON.parse(preference.customStocksList) as CustomStock[])
                : null;
            const fromSnap = latestAssetRecord?.customStocksList
                ? (JSON.parse(latestAssetRecord.customStocksList) as CustomStock[])
                : null;
            stocks = fromPref && fromPref.length > 0 ? fromPref : (fromSnap ?? []);
        } catch {
            stocks = [];
        }

        const positions: AssetPositionLite[] = stocks
            .filter((s) => s.shares > 0 && (s.currentPrice ?? 0) > 0)
            .map((s) => ({
                ticker: s.ticker,
                shares: s.shares,
                currentPrice: s.currentPrice || 0,
                // averageCost not tracked in CustomStock yet; will be null for now
                averageCost: undefined,
            }));

        const divLite: DividendRecordLite[] = dividends.map((d) => ({
            assetTicker: d.assetTicker,
            assetIsin: d.assetIsin,
            exDate: d.exDate,
            paymentDate: d.paymentDate,
            dividendPerShare: d.dividendPerShare,
            quantity: d.quantity,
            grossAmount: d.grossAmount,
            grossAmountEur: d.grossAmountEur,
            netAmount: d.netAmount,
            netAmountEur: d.netAmountEur,
            currency: d.currency,
            dividendType: d.dividendType,
            costPerShare: d.costPerShare,
        }));

        const overview = computeDividendOverview(divLite);
        const yoc = computeYocMetrics(divLite, positions);

        return NextResponse.json({ overview, yoc });
    } catch (err) {
        if (err instanceof UnauthorizedError) return unauthorizedResponse();
        console.error('GET /api/dividends/stats error:', err);
        return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
    }
}

