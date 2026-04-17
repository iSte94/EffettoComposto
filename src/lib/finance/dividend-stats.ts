/**
 * Calcolo statistiche dividendi: YoC, Current Yield, DPS growth, Total Return.
 */

export interface DividendRecordLite {
    assetTicker: string;
    assetIsin?: string | null;
    exDate: string;
    paymentDate: string;
    dividendPerShare: number;
    quantity: number;
    grossAmount: number;
    grossAmountEur?: number | null;
    netAmount: number;
    netAmountEur?: number | null;
    currency: string;
    dividendType: string;
    costPerShare?: number | null;
}

export interface AssetPositionLite {
    ticker: string;
    isin?: string | null;
    shares: number;
    currentPrice: number;      // EUR
    averageCost?: number;      // EUR per share
}

export interface YocMetrics {
    portfolioYoc: number;           // %
    portfolioCurrentYield: number;  // %
    totalCostBasis: number;         // EUR
    totalMarketValue: number;       // EUR
    ttmGrossDividends: number;      // EUR
    ttmNetDividends: number;        // EUR
    yocDifference: number;           // YoC - Current Yield (positive = dividend growth outpaced price)
    byAsset: AssetYocEntry[];
}

export interface AssetYocEntry {
    ticker: string;
    yoc: number;                    // %
    currentYield: number;           // %
    ttmGross: number;               // EUR
    ttmNet: number;                 // EUR
    costBasis: number;              // EUR
    marketValue: number;            // EUR
    difference: number;             // yoc - currentYield
}

export interface MonthlyDividend {
    ym: string;    // YYYY-MM
    gross: number;
    net: number;
    count: number;
}

export interface DividendOverview {
    totalGross: number;
    totalNet: number;
    totalTax: number;
    count: number;
    byMonth: MonthlyDividend[];
    byAsset: { ticker: string; gross: number; net: number; count: number }[];
    byType: { type: string; gross: number; net: number; count: number }[];
    byYear: { year: number; gross: number; net: number; count: number }[];
    upcomingNet: number;   // Future (payment date > today)
    upcomingCount: number;
}

function toEur(d: DividendRecordLite, field: 'gross' | 'net'): number {
    if (d.currency === 'EUR') return field === 'gross' ? d.grossAmount : d.netAmount;
    const eur = field === 'gross' ? d.grossAmountEur : d.netAmountEur;
    if (eur != null && Number.isFinite(eur)) return eur;
    return field === 'gross' ? d.grossAmount : d.netAmount;
}

function ymKey(isoDate: string): string {
    return isoDate.slice(0, 7);
}

/** Overview statistiche generali. */
export function computeDividendOverview(
    dividends: DividendRecordLite[],
    today: Date = new Date()
): DividendOverview {
    const todayIso = today.toISOString().slice(0, 10);
    const past = dividends.filter((d) => d.paymentDate <= todayIso);
    const future = dividends.filter((d) => d.paymentDate > todayIso);

    let totalGross = 0, totalNet = 0, totalTax = 0;
    const monthMap = new Map<string, MonthlyDividend>();
    const assetMap = new Map<string, { gross: number; net: number; count: number }>();
    const typeMap = new Map<string, { gross: number; net: number; count: number }>();
    const yearMap = new Map<number, { gross: number; net: number; count: number }>();

    for (const d of past) {
        const g = toEur(d, 'gross');
        const n = toEur(d, 'net');
        totalGross += g;
        totalNet += n;
        totalTax += (g - n);

        const ym = ymKey(d.paymentDate);
        const m = monthMap.get(ym) ?? { ym, gross: 0, net: 0, count: 0 };
        m.gross += g; m.net += n; m.count++;
        monthMap.set(ym, m);

        const a = assetMap.get(d.assetTicker) ?? { gross: 0, net: 0, count: 0 };
        a.gross += g; a.net += n; a.count++;
        assetMap.set(d.assetTicker, a);

        const t = typeMap.get(d.dividendType) ?? { gross: 0, net: 0, count: 0 };
        t.gross += g; t.net += n; t.count++;
        typeMap.set(d.dividendType, t);

        const year = parseInt(d.paymentDate.slice(0, 4), 10);
        const y = yearMap.get(year) ?? { gross: 0, net: 0, count: 0 };
        y.gross += g; y.net += n; y.count++;
        yearMap.set(year, y);
    }

    let upcomingNet = 0;
    for (const d of future) upcomingNet += toEur(d, 'net');

    return {
        totalGross,
        totalNet,
        totalTax,
        count: past.length,
        byMonth: [...monthMap.values()].sort((a, b) => a.ym.localeCompare(b.ym)),
        byAsset: [...assetMap.entries()].map(([ticker, v]) => ({ ticker, ...v })).sort((a, b) => b.net - a.net),
        byType: [...typeMap.entries()].map(([type, v]) => ({ type, ...v })),
        byYear: [...yearMap.entries()].map(([year, v]) => ({ year, ...v })).sort((a, b) => a.year - b.year),
        upcomingNet,
        upcomingCount: future.length,
    };
}

/**
 * Calcola YoC e Current Yield per il portafoglio.
 * - YoC = dividendi TTM / costo base storico
 * - Current Yield = dividendi TTM / valore di mercato corrente
 */
export function computeYocMetrics(
    dividends: DividendRecordLite[],
    positions: AssetPositionLite[],
    today: Date = new Date()
): YocMetrics {
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoIso = oneYearAgo.toISOString().slice(0, 10);
    const todayIso = today.toISOString().slice(0, 10);

    // TTM dividends by ticker
    const ttmByTicker = new Map<string, { gross: number; net: number }>();
    for (const d of dividends) {
        if (d.paymentDate < oneYearAgoIso || d.paymentDate > todayIso) continue;
        const g = toEur(d, 'gross');
        const n = toEur(d, 'net');
        const cur = ttmByTicker.get(d.assetTicker) ?? { gross: 0, net: 0 };
        cur.gross += g; cur.net += n;
        ttmByTicker.set(d.assetTicker, cur);
    }

    let totalCost = 0, totalValue = 0, totalTtmGross = 0, totalTtmNet = 0;
    const byAsset: AssetYocEntry[] = [];

    for (const p of positions) {
        if (p.shares <= 0) continue;
        const ttm = ttmByTicker.get(p.ticker);
        if (!ttm || ttm.gross <= 0) continue;

        const marketValue = p.shares * p.currentPrice;
        const costBasis = (p.averageCost ?? 0) > 0 ? p.shares * (p.averageCost as number) : marketValue;

        const yoc = costBasis > 0 ? (ttm.gross / costBasis) * 100 : 0;
        const currentYield = marketValue > 0 ? (ttm.gross / marketValue) * 100 : 0;

        byAsset.push({
            ticker: p.ticker,
            yoc,
            currentYield,
            ttmGross: ttm.gross,
            ttmNet: ttm.net,
            costBasis,
            marketValue,
            difference: yoc - currentYield,
        });

        totalCost += costBasis;
        totalValue += marketValue;
        totalTtmGross += ttm.gross;
        totalTtmNet += ttm.net;
    }

    const portfolioYoc = totalCost > 0 ? (totalTtmGross / totalCost) * 100 : 0;
    const portfolioCurrentYield = totalValue > 0 ? (totalTtmGross / totalValue) * 100 : 0;

    return {
        portfolioYoc,
        portfolioCurrentYield,
        totalCostBasis: totalCost,
        totalMarketValue: totalValue,
        ttmGrossDividends: totalTtmGross,
        ttmNetDividends: totalTtmNet,
        yocDifference: portfolioYoc - portfolioCurrentYield,
        byAsset: byAsset.sort((a, b) => b.yoc - a.yoc),
    };
}
