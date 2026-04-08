import { USD_TO_EUR, GBP_TO_EUR } from './constants';

interface FxCache {
    usdToEur: number;
    gbpToEur: number;
    fetchedAt: number;
}

const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours
let cache: FxCache | null = null;

async function fetchLiveRates(): Promise<{ usdToEur: number; gbpToEur: number }> {
    // Try ECB exchange rate API (free, no key required)
    try {
        const res = await fetch(
            'https://api.frankfurter.app/latest?from=EUR&to=USD,GBP',
            { next: { revalidate: 14400 } }
        );
        if (res.ok) {
            const data = await res.json();
            // API returns EUR → USD/GBP, we need USD → EUR and GBP → EUR
            const usdToEur = data.rates?.USD ? 1 / data.rates.USD : USD_TO_EUR;
            const gbpToEur = data.rates?.GBP ? 1 / data.rates.GBP : GBP_TO_EUR;
            return { usdToEur, gbpToEur };
        }
    } catch {
        // Fall through to defaults
    }
    return { usdToEur: USD_TO_EUR, gbpToEur: GBP_TO_EUR };
}

export async function getFxRates(): Promise<{ usdToEur: number; gbpToEur: number }> {
    const now = Date.now();
    if (cache && (now - cache.fetchedAt) < CACHE_TTL) {
        return { usdToEur: cache.usdToEur, gbpToEur: cache.gbpToEur };
    }

    const rates = await fetchLiveRates();
    cache = { ...rates, fetchedAt: now };
    return rates;
}
