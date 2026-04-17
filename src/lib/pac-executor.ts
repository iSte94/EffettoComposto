import prisma from "@/lib/prisma";
import { fetchStockPrice, type StockPriceQuote } from "@/lib/stock-pricing";
import { formatDateKey, isPacScheduleDue, parsePacTimingConfig } from "@/lib/pac";

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

export interface ApplyPacSchedulesResult {
    stocks: StockEntry[];
    createdExecutions: number;
    skippedExecutions: number;
    failedExecutions: number;
}

function updateStockWithQuote(stock: StockEntry, quote: StockPriceQuote): StockEntry {
    return {
        ...stock,
        currentPrice: quote.price,
        dividendYield: quote.dividendYield,
        annualDividend: quote.annualDividend,
    };
}

export async function applyDuePacSchedules(userId: string, rawStocks: StockEntry[], targetDate: Date): Promise<ApplyPacSchedulesResult> {
    const schedules = await prisma.assetPacSchedule.findMany({
        where: {
            userId,
            active: true,
        },
        orderBy: { createdAt: "asc" },
    });

    if (schedules.length === 0) {
        return { stocks: rawStocks, createdExecutions: 0, skippedExecutions: 0, failedExecutions: 0 };
    }

    const stocks = rawStocks.map((stock) => ({ ...stock }));
    const executionDate = formatDateKey(targetDate);
    let createdExecutions = 0;
    let skippedExecutions = 0;
    let failedExecutions = 0;

    for (const schedule of schedules) {
        const due = isPacScheduleDue({
            cadence: schedule.cadence as never,
            timingConfig: parsePacTimingConfig(schedule.timingConfig),
            active: schedule.active,
        }, targetDate);

        if (!due.due) continue;

        const existingExecution = await prisma.assetPacExecution.findUnique({
            where: {
                scheduleId_executionDate: {
                    scheduleId: schedule.id,
                    executionDate,
                },
            },
        });
        if (existingExecution) continue;

        const stockIndex = stocks.findIndex((stock) => stock.id === schedule.assetKey);
        if (stockIndex < 0) {
            await prisma.assetPacExecution.create({
                data: {
                    scheduleId: schedule.id,
                    userId,
                    assetKey: schedule.assetKey,
                    assetTicker: schedule.assetTicker,
                    executionDate,
                    amountEur: schedule.amountEur,
                    status: "failed",
                    reason: "asset_missing",
                },
            });
            failedExecutions++;
            continue;
        }

        const quote = await fetchStockPrice(schedule.assetTicker);
        const fallbackPrice = Number(stocks[stockIndex].currentPrice) || 0;
        const priceUsed = quote?.price || fallbackPrice;
        if (priceUsed <= 0) {
            await prisma.assetPacExecution.create({
                data: {
                    scheduleId: schedule.id,
                    userId,
                    assetKey: schedule.assetKey,
                    assetTicker: schedule.assetTicker,
                    executionDate,
                    amountEur: schedule.amountEur,
                    status: "skipped",
                    reason: "price_unavailable",
                },
            });
            skippedExecutions++;
            continue;
        }

        const sharesBought = schedule.amountEur / priceUsed;
        const updated = {
            ...stocks[stockIndex],
            shares: (Number(stocks[stockIndex].shares) || 0) + sharesBought,
        };
        stocks[stockIndex] = quote ? updateStockWithQuote(updated, quote) : { ...updated, currentPrice: priceUsed };

        await prisma.assetPacExecution.create({
            data: {
                scheduleId: schedule.id,
                userId,
                assetKey: schedule.assetKey,
                assetTicker: schedule.assetTicker,
                executionDate,
                amountEur: schedule.amountEur,
                priceUsed,
                sharesBought,
                status: "executed",
            },
        });
        createdExecutions++;
    }

    return {
        stocks,
        createdExecutions,
        skippedExecutions,
        failedExecutions,
    };
}
