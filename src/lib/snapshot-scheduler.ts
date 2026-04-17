/**
 * Scheduler per snapshot giornalieri automatici.
 * Ogni giorno a mezzanotte (00:00) aggiorna lo snapshot di ogni utente
 * con prezzi BTC e stock/ETF freschi, accrediti mensili del fondo pensione
 * e PAC automatici dovuti per la giornata corrente.
 */

import prisma from "@/lib/prisma";
import { getFxRates } from "@/lib/fx-rates";
import { applyDuePacSchedules } from "@/lib/pac-executor";
import { applyMonthlyPensionAccruals } from "@/lib/pension-accruals";
import { fetchBtcPriceEur, fetchStockPrice } from "@/lib/stock-pricing";

const SNAPSHOT_HOUR = 0;
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

let isRunning = false;
let lastRunDate = "";

interface StockEntry {
    id: string;
    ticker?: string;
    shares: number;
    currentPrice?: number;
    manualValue?: number;
    dividendYield?: number;
    annualDividend?: number;
    [key: string]: unknown;
}

function effectiveStockValue(s: StockEntry): number {
    if (s.manualValue !== undefined && s.manualValue > 0) return s.manualValue;
    return (s.currentPrice || 0) * s.shares;
}

export async function refreshAllSnapshots(): Promise<{ updated: number; skipped: number; errors: number }> {
    const result = { updated: 0, skipped: 0, errors: 0 };

    const users = await prisma.user.findMany({
        where: { assets: { some: {} } },
        select: {
            id: true,
            username: true,
            preferences: true,
        },
    });

    if (users.length === 0) {
        console.log("[Snapshot Scheduler] Nessun utente con snapshot trovato");
        return result;
    }

    const [btcPrice, fxRates] = await Promise.all([fetchBtcPriceEur(), getFxRates()]);
    if (btcPrice === 0) {
        console.warn("[Snapshot Scheduler] Prezzo BTC non disponibile, uso ultimo noto");
    }

    for (const user of users) {
        try {
            const lastSnapshot = await prisma.assetRecord.findFirst({
                where: { userId: user.id },
                orderBy: { date: "desc" },
            });

            if (!lastSnapshot) {
                result.skipped++;
                continue;
            }

            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

            const existingToday = await prisma.assetRecord.findFirst({
                where: {
                    userId: user.id,
                    date: { gte: startOfDay, lte: endOfDay },
                },
            });

            let stocks: StockEntry[] = [];
            try {
                stocks = JSON.parse(lastSnapshot.customStocksList || "[]");
            } catch {
                stocks = [];
            }

            const tickerStocks = stocks.filter((stock) => stock.ticker && stock.shares > 0);
            if (tickerStocks.length > 0) {
                const batchSize = 5;
                for (let i = 0; i < tickerStocks.length; i += batchSize) {
                    const batch = tickerStocks.slice(i, i + batchSize);
                    const priceResults = await Promise.all(batch.map((stock) => fetchStockPrice(stock.ticker!, fxRates)));
                    batch.forEach((stock, idx) => {
                        const quote = priceResults[idx];
                        if (!quote) return;

                        const target = stocks.find((item) => item.id === stock.id);
                        if (!target) return;
                        target.currentPrice = quote.price;
                        target.dividendYield = quote.dividendYield;
                        target.annualDividend = quote.annualDividend;
                    });
                }
            }

            const pacResult = await applyDuePacSchedules(user.id, stocks, today);
            stocks = pacResult.stocks;

            const pensionAccrualResult = user.preferences
                ? await applyMonthlyPensionAccruals({
                    userId: user.id,
                    preference: user.preferences,
                    snapshot: {
                        pensionFund: lastSnapshot.pensionFund,
                        otherAssetsOwnership: lastSnapshot.otherAssetsOwnership,
                    },
                    targetDate: today,
                })
                : {
                    pensionFund: lastSnapshot.pensionFund,
                    otherAssetsOwnership: lastSnapshot.otherAssetsOwnership,
                    createdAccruals: 0,
                };

            const newStocksSnapshotValue = stocks.reduce((acc, stock) => acc + effectiveStockValue(stock), 0);
            const effectiveBtcPrice = btcPrice > 0 ? btcPrice : lastSnapshot.bitcoinPrice;

            const recordData = {
                userId: user.id,
                realEstateValue: lastSnapshot.realEstateValue,
                realEstateCosts: lastSnapshot.realEstateCosts,
                realEstateRent: lastSnapshot.realEstateRent,
                realEstateList: lastSnapshot.realEstateList,
                liquidStockValue: lastSnapshot.liquidStockValue,
                stocksSnapshotValue: newStocksSnapshotValue,
                customStocksList: JSON.stringify(stocks),
                safeHavens: lastSnapshot.safeHavens,
                emergencyFund: lastSnapshot.emergencyFund,
                pensionFund: pensionAccrualResult.pensionFund,
                debtsTotal: lastSnapshot.debtsTotal,
                bitcoinAmount: lastSnapshot.bitcoinAmount,
                bitcoinPrice: effectiveBtcPrice,
                otherAssetsOwnership: pensionAccrualResult.otherAssetsOwnership,
            };

            if (existingToday) {
                await prisma.assetRecord.update({
                    where: { id: existingToday.id },
                    data: recordData,
                });
            } else {
                await prisma.assetRecord.create({ data: recordData });
            }

            await prisma.preference.updateMany({
                where: { userId: user.id },
                data: {
                    customStocksList: JSON.stringify(stocks),
                },
            });

            result.updated++;
            console.log(
                `[Snapshot Scheduler] ${user.username}: snapshot aggiornato (BTC: ${effectiveBtcPrice.toFixed(0)} EUR, ${tickerStocks.length} titoli, PAC ${pacResult.createdExecutions}, FP ${pensionAccrualResult.createdAccruals})`,
            );
        } catch (err) {
            result.errors++;
            console.error(`[Snapshot Scheduler] Errore per utente ${user.username}:`, err);
        }
    }

    return result;
}

async function tick() {
    if (isRunning) return;
    isRunning = true;

    try {
        const now = new Date();
        const currentHour = now.getHours();
        const todayStr = now.toISOString().slice(0, 10);

        if (currentHour === SNAPSHOT_HOUR && lastRunDate !== todayStr) {
            console.log(`[Snapshot Scheduler] Avvio refresh giornaliero: ${now.toISOString()}`);
            const result = await refreshAllSnapshots();
            lastRunDate = todayStr;
            console.log(`[Snapshot Scheduler] Completato: ${result.updated} aggiornati, ${result.skipped} saltati, ${result.errors} errori`);
        }
    } catch (error) {
        console.error("[Snapshot Scheduler] Errore:", error);
    } finally {
        isRunning = false;
    }
}

export function startSnapshotScheduler() {
    console.log(`[Snapshot Scheduler] Avviato. Refresh snapshot ogni giorno alle ${SNAPSHOT_HOUR}:00`);

    setTimeout(() => {
        tick();
    }, 15_000);

    setInterval(() => {
        tick();
    }, CHECK_INTERVAL_MS);
}
