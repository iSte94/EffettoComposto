import { USD_TO_EUR, GBP_TO_EUR } from './constants';

export interface FxRates {
    usdToEur: number;
    gbpToEur: number;
    chfToEur: number;
    jpyToEur: number;
    cadToEur: number;
    audToEur: number;
}

interface FxCache extends FxRates {
    fetchedAt: number;
}

const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours
const DEFAULT_RATES: FxRates = {
    usdToEur: USD_TO_EUR,
    gbpToEur: GBP_TO_EUR,
    chfToEur: 1.05,
    jpyToEur: 0.0062,
    cadToEur: 0.68,
    audToEur: 0.61,
};
let cache: FxCache | null = null;

async function fetchLiveRates(): Promise<FxRates> {
    // Try Frankfurter API (ECB data, free, no key required)
    try {
        const res = await fetch(
            'https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,CHF,JPY,CAD,AUD',
            { next: { revalidate: 14400 } }
        );
        if (res.ok) {
            const data = await res.json();
            // API returns EUR → CCY, we need CCY → EUR (inverse)
            const rates = data.rates || {};
            return {
                usdToEur: rates.USD ? 1 / rates.USD : DEFAULT_RATES.usdToEur,
                gbpToEur: rates.GBP ? 1 / rates.GBP : DEFAULT_RATES.gbpToEur,
                chfToEur: rates.CHF ? 1 / rates.CHF : DEFAULT_RATES.chfToEur,
                jpyToEur: rates.JPY ? 1 / rates.JPY : DEFAULT_RATES.jpyToEur,
                cadToEur: rates.CAD ? 1 / rates.CAD : DEFAULT_RATES.cadToEur,
                audToEur: rates.AUD ? 1 / rates.AUD : DEFAULT_RATES.audToEur,
            };
        }
    } catch {
        // Fall through to defaults
    }
    return { ...DEFAULT_RATES };
}

export async function getFxRates(): Promise<FxRates> {
    const now = Date.now();
    if (cache && (now - cache.fetchedAt) < CACHE_TTL) {
        const { fetchedAt: _, ...rates } = cache;
        void _;
        return rates;
    }

    const rates = await fetchLiveRates();
    cache = { ...rates, fetchedAt: now };
    return rates;
}

/** Normalize a raw price from Yahoo Finance to EUR, handling all supported currencies. */
export function normalizePriceToEur(rawPrice: number, currency: string, rates: FxRates): number {
    if (!Number.isFinite(rawPrice) || rawPrice <= 0) return 0;
    switch (currency) {
        case 'EUR':
            return rawPrice;
        case 'USD':
            return rawPrice * rates.usdToEur;
        case 'GBP':
            return rawPrice * rates.gbpToEur;
        case 'GBp': // British pence → divide by 100 first
            return (rawPrice / 100) * rates.gbpToEur;
        case 'CHF':
            return rawPrice * rates.chfToEur;
        case 'JPY':
            return rawPrice * rates.jpyToEur;
        case 'CAD':
            return rawPrice * rates.cadToEur;
        case 'AUD':
            return rawPrice * rates.audToEur;
        default:
            return rawPrice; // Unknown currency, return as-is
    }
}
