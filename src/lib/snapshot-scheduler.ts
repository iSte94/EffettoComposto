/**
 * Scheduler per snapshot giornalieri automatici.
 * Ogni giorno a mezzanotte (00:00) aggiorna lo snapshot di ogni utente
 * con prezzi BTC e stock/ETF freschi, in modo che lo storico rifletta
 * l'andamento reale del portafoglio anche se l'utente non apre l'app.
 *
 * Segue lo stesso pattern dello scheduler Mutui Market.
 */

import prisma from "@/lib/prisma";
import { getFxRates } from "@/lib/fx-rates";

const SNAPSHOT_HOUR = 0; // Mezzanotte
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // Controlla ogni 30 minuti

let isRunning = false;
let lastRunDate = ""; // "YYYY-MM-DD" dell'ultimo run riuscito

// --- Price fetching (server-side, no Next.js API routes) ---

async function fetchBtcPriceEur(): Promise<number> {
    try {
        const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCEUR");
        if (res.ok) {
            const data = await res.json();
            return parseFloat(data.price) || 0;
        }
    } catch (err) {
        console.error("[Snapshot Scheduler] BTC fetch error:", err);
    }
    return 0;
}

async function fetchStockPrice(ticker: string, fxRates: { usdToEur: number; gbpToEur: number }): Promise<{ price: number; dividendYield: number; annualDividend: number } | null> {
    // Yahoo Finance
    try {
        const res = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`,
            {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "application/json",
                    "Referer": "https://finance.yahoo.com/",
                },
            }
        );
        if (res.ok) {
            const data = await res.json();
            const meta = data.chart?.result?.[0]?.meta;
            if (meta?.regularMarketPrice) {
                let price = meta.regularMarketPrice;
                const currency = meta.currency || "EUR";
                if (currency === "USD") price *= fxRates.usdToEur;
                else if (currency === "GBp") price = (price / 100) * fxRates.gbpToEur;

                let dividendYield = 0;
                let annualDividend = 0;
                try {
                    const summaryRes = await fetch(
                        `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=summaryDetail`,
                        {
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                                "Accept": "application/json",
                                "Referer": "https://finance.yahoo.com/",
                            },
                        }
                    );
                    if (summaryRes.ok) {
                        const summaryData = await summaryRes.json();
                        const detail = summaryData.quoteSummary?.result?.[0]?.summaryDetail;
                        if (detail) {
                            dividendYield = detail.trailingAnnualDividendYield?.raw || detail.yield?.raw || 0;
                            annualDividend = detail.trailingAnnualDividendRate?.raw || detail.dividendRate?.raw || 0;
                            if (currency === "USD" && annualDividend > 0) annualDividend *= fxRates.usdToEur;
                            else if (currency === "GBp" && annualDividend > 0) annualDividend = (annualDividend / 100) * fxRates.gbpToEur;
                        }
                    }
                } catch {
                    // Dividend data optional
                }

                return { price, dividendYield, annualDividend };
            }
        }
    } catch {
        // Fallback to Stooq
    }

    // Stooq fallback
    try {
        const res = await fetch(
            `https://stooq.com/q/l/?s=${encodeURIComponent(ticker.toLowerCase())}&f=sd2t2ohlcv&h&e=csv`,
            { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } }
        );
        if (res.ok) {
            const csv = await res.text();
            const lines = csv.trim().split("\n");
            if (lines.length > 1 && !lines[1].includes("N/D")) {
                const parts = lines[1].split(",");
                if (parts.length >= 7) {
                    const closePrice = parseFloat(parts[6]);
                    if (!isNaN(closePrice)) return { price: closePrice, dividendYield: 0, annualDividend: 0 };
                }
            }
        }
    } catch {
        // Both providers failed
    }

    return null;
}

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

/** Aggiorna gli snapshot di tutti gli utenti con prezzi freschi */
export async function refreshAllSnapshots(): Promise<{ updated: number; skipped: number; errors: number }> {
    const result = { updated: 0, skipped: 0, errors: 0 };

    // Trova tutti gli utenti che hanno almeno un snapshot
    const users = await prisma.user.findMany({
        where: { assets: { some: {} } },
        select: { id: true, username: true },
    });

    if (users.length === 0) {
        console.log("[Snapshot Scheduler] Nessun utente con snapshot trovato");
        return result;
    }

    // Fetch prezzi globali (BTC + FX rates) una sola volta
    const [btcPrice, fxRates] = await Promise.all([fetchBtcPriceEur(), getFxRates()]);

    if (btcPrice === 0) {
        console.warn("[Snapshot Scheduler] Prezzo BTC non disponibile, uso ultimo noto");
    }

    for (const user of users) {
        try {
            // Prendi l'ultimo snapshot dell'utente
            const lastSnapshot = await prisma.assetRecord.findFirst({
                where: { userId: user.id },
                orderBy: { date: "desc" },
            });

            if (!lastSnapshot) {
                result.skipped++;
                continue;
            }

            // Parse stocks list
            let stocks: StockEntry[] = [];
            try {
                stocks = JSON.parse(lastSnapshot.customStocksList || "[]");
            } catch {
                // noop
            }

            // Aggiorna prezzi stock in parallelo (max 5 concurrent per rate limiting)
            const tickerStocks = stocks.filter((s) => s.ticker && s.shares > 0);
            if (tickerStocks.length > 0) {
                const batchSize = 5;
                for (let i = 0; i < tickerStocks.length; i += batchSize) {
                    const batch = tickerStocks.slice(i, i + batchSize);
                    const priceResults = await Promise.all(
                        batch.map((s) => fetchStockPrice(s.ticker!, fxRates))
                    );
                    batch.forEach((s, idx) => {
                        const priceData = priceResults[idx];
                        if (priceData) {
                            const stock = stocks.find((st) => st.id === s.id);
                            if (stock) {
                                stock.currentPrice = priceData.price;
                                stock.dividendYield = priceData.dividendYield;
                                stock.annualDividend = priceData.annualDividend;
                            }
                        }
                    });
                }
            }

            const newStocksSnapshotValue = stocks.reduce((acc, s) => acc + effectiveStockValue(s), 0);
            const effectiveBtcPrice = btcPrice > 0 ? btcPrice : lastSnapshot.bitcoinPrice;

            // Controlla se esiste gia' uno snapshot per oggi
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

            const existingToday = await prisma.assetRecord.findFirst({
                where: {
                    userId: user.id,
                    date: { gte: startOfDay, lte: endOfDay },
                },
            });

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
                pensionFund: lastSnapshot.pensionFund,
                debtsTotal: lastSnapshot.debtsTotal,
                bitcoinAmount: lastSnapshot.bitcoinAmount,
                bitcoinPrice: effectiveBtcPrice,
                otherAssetsOwnership: lastSnapshot.otherAssetsOwnership,
            };

            if (existingToday) {
                await prisma.assetRecord.update({
                    where: { id: existingToday.id },
                    data: recordData,
                });
            } else {
                await prisma.assetRecord.create({ data: recordData });
            }

            result.updated++;
            console.log(`[Snapshot Scheduler] ${user.username}: snapshot aggiornato (BTC: ${effectiveBtcPrice.toFixed(0)}€, ${tickerStocks.length} titoli)`);
        } catch (err) {
            result.errors++;
            console.error(`[Snapshot Scheduler] Errore per utente ${user.username}:`, err);
        }
    }

    return result;
}

// --- Scheduler loop ---

async function tick() {
    if (isRunning) return;
    isRunning = true;

    try {
        const now = new Date();
        const currentHour = now.getHours();
        const todayStr = now.toISOString().slice(0, 10);

        // Esegui a mezzanotte, ma solo se non ha gia' girato oggi
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

/** Avvia lo scheduler. Chiamare una sola volta. */
export function startSnapshotScheduler() {
    console.log(`[Snapshot Scheduler] Avviato. Refresh snapshot ogni giorno alle ${SNAPSHOT_HOUR}:00`);

    // Primo check dopo 15s (dare tempo al server di partire)
    setTimeout(() => {
        tick();
    }, 15_000);

    // Poi controlla ogni 30 minuti
    setInterval(() => {
        tick();
    }, CHECK_INTERVAL_MS);
}
