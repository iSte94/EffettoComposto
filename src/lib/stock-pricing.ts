import { getFxRates } from "@/lib/fx-rates";

export interface StockPriceQuote {
    price: number;
    dividendYield: number;
    annualDividend: number;
}

export async function fetchBtcPriceEur(): Promise<number> {
    try {
        const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCEUR");
        if (res.ok) {
            const data = await res.json();
            return parseFloat(data.price) || 0;
        }
    } catch (err) {
        console.error("[Stock Pricing] BTC fetch error:", err);
    }
    return 0;
}

export async function fetchStockPrice(
    ticker: string,
    fxRates?: { usdToEur: number; gbpToEur: number },
): Promise<StockPriceQuote | null> {
    const rates = fxRates ?? await getFxRates();

    try {
        const res = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`,
            {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "application/json",
                    "Referer": "https://finance.yahoo.com/",
                },
            },
        );
        if (res.ok) {
            const data = await res.json();
            const meta = data.chart?.result?.[0]?.meta;
            if (meta?.regularMarketPrice) {
                let price = meta.regularMarketPrice;
                const currency = meta.currency || "EUR";
                if (currency === "USD") price *= rates.usdToEur;
                else if (currency === "GBp") price = (price / 100) * rates.gbpToEur;

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
                        },
                    );
                    if (summaryRes.ok) {
                        const summaryData = await summaryRes.json();
                        const detail = summaryData.quoteSummary?.result?.[0]?.summaryDetail;
                        if (detail) {
                            dividendYield = detail.trailingAnnualDividendYield?.raw || detail.yield?.raw || 0;
                            annualDividend = detail.trailingAnnualDividendRate?.raw || detail.dividendRate?.raw || 0;
                            if (currency === "USD" && annualDividend > 0) annualDividend *= rates.usdToEur;
                            else if (currency === "GBp" && annualDividend > 0) annualDividend = (annualDividend / 100) * rates.gbpToEur;
                        }
                    }
                } catch {
                    // Dividend data optional
                }

                return { price, dividendYield, annualDividend };
            }
        }
    } catch {
        // fallback below
    }

    try {
        const res = await fetch(
            `https://stooq.com/q/l/?s=${encodeURIComponent(ticker.toLowerCase())}&f=sd2t2ohlcv&h&e=csv`,
            { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } },
        );
        if (res.ok) {
            const csv = await res.text();
            const lines = csv.trim().split("\n");
            if (lines.length > 1 && !lines[1].includes("N/D")) {
                const parts = lines[1].split(",");
                if (parts.length >= 7) {
                    const closePrice = parseFloat(parts[6]);
                    if (!Number.isNaN(closePrice)) {
                        return { price: closePrice, dividendYield: 0, annualDividend: 0 };
                    }
                }
            }
        }
    } catch {
        // noop
    }

    return null;
}
