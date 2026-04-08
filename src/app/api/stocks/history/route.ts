import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getFxRates } from '@/lib/fx-rates';


export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const ticker = searchParams.get('ticker');
        const range = searchParams.get('range') || '5y'; // Default 5 years
        const interval = searchParams.get('interval') || '1mo'; // Default monthly data

        if (!ticker) {
            return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
        }

        const { usdToEur: USD_TO_EUR, gbpToEur: GBP_TO_EUR } = await getFxRates();

        const normalizedTicker = ticker.toUpperCase();

        // 1. Check Database Cache
        try {
            const cached = await prisma.stockHistoryCache.findUnique({
                where: { ticker: normalizedTicker }
            });

            if (cached) {
                const cacheAgeHours = (Date.now() - new Date(cached.updatedAt).getTime()) / (1000 * 60 * 60);

                // If cache is less than 24 hours old, return it
                if (cacheAgeHours < 24) {
                    return NextResponse.json({
                        ticker: normalizedTicker,
                        currency: 'EUR',
                        history: JSON.parse(cached.history),
                        cached: true
                    });
                }
                // Else, proceed to fetch fresh data
            }
        } catch (dbError) {
            console.error("Cache Check Error:", dbError);
            // Continue to fetch if DB fails
        }

        // 2. Fetch Fresh Data from Yahoo Finance
        const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(normalizedTicker)}?interval=${interval}&range=${range}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json",
                "Referer": "https://finance.yahoo.com/"
            },
            next: { revalidate: 86400 } // Cache historical data for 24 hours
        });

        if (!response.ok) {
            return NextResponse.json({ error: `Yahoo Finance error: ${response.status}` }, { status: response.status });
        }

        const data = await response.json();

        if (!data.chart?.result?.[0]) {
            return NextResponse.json({ error: 'Ticker history not found' }, { status: 404 });
        }

        const result = data.chart.result[0];
        const timestamps = result.timestamp || [];
        const closePrices = result.indicators?.quote?.[0]?.close || [];
        const meta = result.meta;
        const currency = meta.currency || 'EUR';

        // Format into a flat array of data points
        const history = timestamps.map((ts: number, index: number) => {
            let price = closePrices[index];

            // Currency Normalization
            if (price !== null && price !== undefined) {
                if (currency === 'USD') {
                    price = price * USD_TO_EUR;
                } else if (currency === 'GBp') {
                    price = (price / 100) * GBP_TO_EUR;
                }
            }

            return {
                timestamp: ts * 1000, // Convert to JS milliseconds
                date: new Date(ts * 1000).toISOString().split('T')[0],
                price: price || 0,
                originalCurrency: currency
            };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }).filter((point: any) => point.price > 0); // Remove empty or broken data points

        // 3. Save to Database Cache
        try {
            await prisma.stockHistoryCache.upsert({
                where: { ticker: normalizedTicker },
                update: { history: JSON.stringify(history) },
                create: {
                    ticker: normalizedTicker,
                    history: JSON.stringify(history)
                }
            });
        } catch (dbError) {
            console.error("Cache Save Error:", dbError);
            // Don't fail the response if cache save fails
        }

        return NextResponse.json({
            ticker: meta.symbol,
            currency: 'EUR',
            history,
            cached: false
        });

    } catch (error) {
        console.error('Error fetching stock history:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
