import { NextResponse } from 'next/server';
import { getFxRates } from '@/lib/fx-rates';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const ticker = searchParams.get('ticker');

        if (!ticker) {
            return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
        }

        const { usdToEur: USD_TO_EUR, gbpToEur: GBP_TO_EUR } = await getFxRates();

        let price = 0;
        let currency = 'EUR';
        let exchangeName = 'Unknown';
        let symbol = ticker;

        // --- METHOD 1: YAHOO FINANCE ---
        try {
            const yfResponse = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "application/json",
                    "Referer": "https://finance.yahoo.com/"
                },
                next: { revalidate: 300 }
            });

            if (yfResponse.ok) {
                const data = await yfResponse.json();
                if (data.chart?.result?.[0]) {
                    const meta = data.chart.result[0].meta;
                    price = meta.regularMarketPrice;
                    currency = meta.currency || 'EUR';
                    exchangeName = meta.exchangeName || 'Unknown';
                    symbol = meta.symbol;

                    if (currency === 'USD') price = price * USD_TO_EUR;
                    else if (currency === 'GBp') price = (price / 100) * GBP_TO_EUR;

                    // Try to get dividend yield from Yahoo Finance summary
                    let dividendYield = 0;
                    let annualDividend = 0;
                    try {
                        const summaryRes = await fetch(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=summaryDetail`, {
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                                "Accept": "application/json",
                                "Referer": "https://finance.yahoo.com/"
                            },
                            next: { revalidate: 86400 }
                        });
                        if (summaryRes.ok) {
                            const summaryData = await summaryRes.json();
                            const detail = summaryData.quoteSummary?.result?.[0]?.summaryDetail;
                            if (detail) {
                                dividendYield = detail.trailingAnnualDividendYield?.raw || detail.yield?.raw || 0;
                                annualDividend = detail.trailingAnnualDividendRate?.raw || detail.dividendRate?.raw || 0;
                                // Convert dividend to EUR if needed
                                if (currency === 'USD' && annualDividend > 0) annualDividend *= USD_TO_EUR;
                                else if (currency === 'GBp' && annualDividend > 0) annualDividend = (annualDividend / 100) * GBP_TO_EUR;
                            }
                        }
                    } catch {
                        // Dividend data is optional, continue without it
                    }

                    return NextResponse.json({ ticker: symbol, price, currency: 'EUR', originalCurrency: currency, exchangeName, dividendYield, annualDividend });
                }
            }
        } catch {
            console.log(`Yahoo Finance failed for ${ticker}, trying fallback...`);
        }

        // --- METHOD 2: STOOQ CSV FALLBACK ---
        try {
            // Stooq usually requires lowercasing and sometimes specific suffixes, but standard Yahoo tickers often work directly
            const stooqResponse = await fetch(`https://stooq.com/q/l/?s=${encodeURIComponent(ticker.toLowerCase())}&f=sd2t2ohlcv&h&e=csv`, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                },
                next: { revalidate: 300 }
            });

            if (stooqResponse.ok) {
                const csvData = await stooqResponse.text();
                // Expected format: Symbol,Date,Time,Open,High,Low,Close,Volume
                // Example: VWCE.DE,2026-02-24,17:30:00,149,150,148.759,149.72,198791
                const lines = csvData.trim().split('\n');
                if (lines.length > 1) {
                    const dataLine = lines[1];
                    // Stooq returns N/D if not found
                    if (!dataLine.includes('N/D')) {
                        const parts = dataLine.split(',');
                        if (parts.length >= 7) {
                            const closePrice = parseFloat(parts[6]);
                            if (!isNaN(closePrice)) {
                                console.log(`Stooq fallback successful for ${ticker}`);
                                return NextResponse.json({
                                    ticker: parts[0],
                                    price: closePrice, // Assuming EUR for EU tickers, we lack currency meta here
                                    currency: 'EUR',
                                    originalCurrency: 'Unknown',
                                    exchangeName: 'Stooq Fallback'
                                });
                            }
                        }
                    }
                }
            }
        } catch {
            console.log(`Stooq fallback failed for ${ticker}`);
        }

        return NextResponse.json({ error: 'Ticker not found across all providers' }, { status: 404 });

    } catch (error) {
        console.error('Error fetching stock:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
