import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const q = searchParams.get('q');

        if (!q || q.length < 2) {
            return NextResponse.json({ suggestions: [] });
        }

        // --- SMART ALIAS DICTIONARY ---
        // Maps common user searches to obscure Euro-denominated tickers that Yahoo Finance hides
        const ALIAS_MAP: Record<string, string[]> = {
            'FBTC': ['XS2434891219.SG', 'FBTC.DE', 'FBTC.MI'], // Fidelity Physical Bitcoin (Stuttgart is EUR)
            'PHYSICAL BITCOIN': ['XS2434891219.SG', 'WBIT.HM', 'BTCW.AS'],
            'WBIT': ['WBIT.HM', 'GB00BJYDH287.SG', 'BTCW.AS'], // WisdomTree Physical Bitcoin ETP
            'VWCE': ['VWCE.DE', 'VWCE.MI', 'VWCE.AS']
        };

        const normalizedQuery = q.toUpperCase().trim();
        let aliasTickers: string[] = [];

        for (const [key, tickers] of Object.entries(ALIAS_MAP)) {
            if (normalizedQuery.includes(key) || key.includes(normalizedQuery)) {
                aliasTickers = [...aliasTickers, ...tickers];
            }
        }

        // 1. Always search the exact user query
        const promises = [
            fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&enableFuzzyQuery=true`, {
                headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 3600 }
            }).then(r => r.ok ? r.json() : { quotes: [] })
        ];

        // 1b. Inject targeted queries if an alias matches
        for (const ticker of aliasTickers) {
            promises.push(
                fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&quotesCount=1&enableFuzzyQuery=false`, {
                    headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 3600 }
                }).then(r => r.ok ? r.json() : { quotes: [] })
            );
        }

        // 2. If the user didn't specify an exchange (no dot in query) and it looks like a ticker (no spaces, short length)
        if (!q.includes('.') && !q.includes(' ') && q.trim().length <= 6) {
            const euSuffixes = ['.MI', '.DE', '.AS', '.PA', '.MU', '.L', '.SW', '.SG', '.F']; // Added Swiss, Stuttgart, Frankfurt


            for (const suffix of euSuffixes) {
                promises.push(
                    fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q + suffix)}&quotesCount=5&enableFuzzyQuery=false`, {
                        headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 3600 }
                    }).then(r => r.ok ? r.json() : { quotes: [] })
                );
            }
        }

        const results = await Promise.all(promises);

        // Aggregate all quotes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let allQuotes: any[] = [];
        for (const data of results) {
            if (data && data.quotes) {
                allQuotes = [...allQuotes, ...data.quotes];
            }
        }

        // Deduplicate by symbol
        const uniqueQuotesMap = new Map();
        for (const quote of allQuotes) {
            if (quote.symbol && !uniqueQuotesMap.has(quote.symbol)) {
                // Prioritize ETFs and Equities, but ALWAYS allow our manual alias injections
                if (quote.quoteType === 'ETF' || quote.quoteType === 'EQUITY' || aliasTickers.includes(quote.symbol)) {
                    uniqueQuotesMap.set(quote.symbol, quote);
                }
            }
        }

        // Transform the results into a cleaner format
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const suggestions = Array.from(uniqueQuotesMap.values()).map((quote: any) => ({
            symbol: quote.symbol,
            name: quote.shortname || quote.longname || quote.symbol,
            exchDisp: quote.exchDisp,
            typeDisp: quote.typeDisp || quote.quoteType,
            exchange: quote.exchange
        }));

        // Prioritize European Exchanges (EUR) in Sort
        const preferredExchanges = ['GER', 'FRA', 'MIL', 'AMS', 'PAR', 'MUN', 'STU', 'HAM', 'DXE', 'CXE'];
        const nonEurExchanges = ['EBS', 'LSE', 'NYQ', 'NMS', 'NGM']; // Swiss, London, US

        const sortedSuggestions = suggestions.sort((a, b) => {
            // 0. EXPLICIT ALIAS MATCHES WIN OVER EVERYTHING
            const aIsAlias = aliasTickers.includes(a.symbol);
            const bIsAlias = aliasTickers.includes(b.symbol);
            if (aIsAlias && !bIsAlias) return -1;
            if (!aIsAlias && bIsAlias) return 1;

            const aIsEuro = preferredExchanges.includes(a.exchange);
            const bIsEuro = preferredExchanges.includes(b.exchange);

            const aIsNonEur = nonEurExchanges.includes(a.exchange) || a.symbol.endsWith('.SW') || a.symbol.endsWith('.L');
            const bIsNonEur = nonEurExchanges.includes(b.exchange) || b.symbol.endsWith('.SW') || b.symbol.endsWith('.L');

            // 1. If A is Euro and B is not, A wins
            if (aIsEuro && !bIsEuro) return -1;
            // 2. If B is Euro and A is not, B wins
            if (!aIsEuro && bIsEuro) return 1;

            // 3. If neither (or both) are Euro, downrank the explicitly non-EUR ones (Swiss/London)
            if (!aIsNonEur && bIsNonEur) return -1;
            if (aIsNonEur && !bIsNonEur) return 1;

            return 0; // Keep original order otherwise
        });

        return NextResponse.json({ suggestions: sortedSuggestions.slice(0, 15) });

    } catch (error) {
        console.error('Error searching stocks:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
