/**
 * Scraper prezzi obbligazioni da Borsa Italiana MOT.
 *
 * Usato come fallback quando Yahoo Finance / Stooq non trovano il ticker
 * (tipico per BTP e obbligazioni italiane identificate solo da ISIN).
 *
 * URL: https://www.borsaitaliana.it/borsa/obbligazioni/mot/btp/scheda/{ISIN}-MOTX.html?lang=it
 *
 * Strategia a 5 livelli di fallback nell'ordine:
 *   1. Prezzo "forte" nella strong tag principale
 *   2. "Ultimo Contratto"
 *   3. "Prezzo Ufficiale"
 *   4. "Apertura"
 *   5. Scan generico tabella
 */

export interface BondPriceResult {
    isin: string;
    price: number | null;
    currency: 'EUR';
    priceType: 'ultimo' | 'ufficiale' | 'apertura' | 'none';
    lastUpdate?: string;
    error?: string;
}

const BORSA_IT_URL_SEGMENTS = ['btp', 'obbligazioni-europee', 'obbligazioni-estere', 'obbligazioni-sovranazionali'];
const FETCH_TIMEOUT_MS = 30_000; // Borsa Italiana can be slow

/** Validate ISIN format (2-letter country code + 9 alphanumeric + 1 check digit). */
export function isValidIsin(isin: string): boolean {
    return /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(isin);
}

/** Detect if ISIN is likely an Italian bond (starts with IT). */
export function isItalianBondIsin(code: string): boolean {
    return typeof code === 'string' && /^IT\d{10}$/i.test(code.trim());
}

/**
 * Parse italian number format: "1.234,56" → 1234.56
 * Removes periods (thousands), replaces comma with dot (decimal).
 */
function parseItalianNumber(str: string): number {
    const cleaned = str.replace(/\./g, '').replace(',', '.').trim();
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : NaN;
}

/** Strip HTML tags to plaintext. */
function stripTags(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Extract text content between a label and the next HTML boundary. */
function extractLabelValue(html: string, labelRegex: RegExp): string | null {
    const labelMatch = html.match(labelRegex);
    if (!labelMatch) return null;
    const afterLabel = html.slice(labelMatch.index! + labelMatch[0].length);
    // Look for the next <dd>, <td>, or <span> content
    const valueMatch = afterLabel.match(/<(?:dd|td|span|strong)[^>]*>([\s\S]*?)<\/(?:dd|td|span|strong)>/i);
    if (!valueMatch) return null;
    const text = stripTags(valueMatch[1]);
    return text || null;
}

const PRICE_PATTERN = /^-?\d{1,3}(?:\.\d{3})*(?:,\d+)?$/;

function tryParsePrice(raw: string | null): number | null {
    if (!raw) return null;
    // Extract numeric part (possibly preceded by currency symbols)
    const numMatch = raw.match(/-?\d{1,3}(?:\.\d{3})*(?:,\d+)?/);
    if (!numMatch) return null;
    if (!PRICE_PATTERN.test(numMatch[0])) return null;
    const num = parseItalianNumber(numMatch[0]);
    // Bond prices are typically 50-200 (percentage of par)
    if (!Number.isFinite(num) || num <= 0 || num > 10000) return null;
    return num;
}

async function fetchHtml(url: string): Promise<string | null> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            signal: ctrl.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'it-IT,it;q=0.9,en;q=0.7',
            },
            next: { revalidate: 3600 }, // Cache 1h at Next level
        });
        if (!res.ok) return null;
        return await res.text();
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

async function fetchBorsaIt(isin: string): Promise<string | null> {
    // Try different URL segments to find the bond
    for (const segment of BORSA_IT_URL_SEGMENTS) {
        const url = `https://www.borsaitaliana.it/borsa/obbligazioni/mot/${segment}/scheda/${isin}-MOTX.html?lang=it`;
        const html = await fetchHtml(url);
        if (html && html.length > 1000 && !html.toLowerCase().includes('pagina non trovata')) {
            return html;
        }
    }
    return null;
}

/**
 * Scrape bond price from Borsa Italiana MOT.
 * Returns null price if scraping fails; caller can use fallback strategy.
 */
export async function scrapeBondPriceByIsin(isin: string): Promise<BondPriceResult> {
    const cleanIsin = isin.trim().toUpperCase();

    if (!isValidIsin(cleanIsin)) {
        return { isin: cleanIsin, price: null, currency: 'EUR', priceType: 'none', error: 'ISIN non valido' };
    }

    const html = await fetchBorsaIt(cleanIsin);
    if (!html) {
        return { isin: cleanIsin, price: null, currency: 'EUR', priceType: 'none', error: 'Pagina non trovata su Borsa Italiana' };
    }

    // Strategy 1: Main "strong" formatPrice tag (most prominent price on page)
    const strongMatch = html.match(/<strong[^>]*class="[^"]*formatPrice[^"]*"[^>]*>([\s\S]*?)<\/strong>/i);
    if (strongMatch) {
        const val = stripTags(strongMatch[1]);
        const parsed = tryParsePrice(val);
        if (parsed !== null) {
            return { isin: cleanIsin, price: parsed, currency: 'EUR', priceType: 'ultimo', lastUpdate: new Date().toISOString() };
        }
    }

    // Strategy 2: "Ultimo Contratto"
    const ultimo = extractLabelValue(html, /ultimo\s+contratto/i);
    const ultimoPrice = tryParsePrice(ultimo);
    if (ultimoPrice !== null) {
        return { isin: cleanIsin, price: ultimoPrice, currency: 'EUR', priceType: 'ultimo', lastUpdate: new Date().toISOString() };
    }

    // Strategy 3: "Prezzo Ufficiale"
    const ufficiale = extractLabelValue(html, /prezzo\s+ufficiale/i);
    const ufficialePrice = tryParsePrice(ufficiale);
    if (ufficialePrice !== null) {
        return { isin: cleanIsin, price: ufficialePrice, currency: 'EUR', priceType: 'ufficiale', lastUpdate: new Date().toISOString() };
    }

    // Strategy 4: "Apertura"
    const apertura = extractLabelValue(html, /(?:apertura|prezzo\s+di\s+apertura)/i);
    const aperturaPrice = tryParsePrice(apertura);
    if (aperturaPrice !== null) {
        return { isin: cleanIsin, price: aperturaPrice, currency: 'EUR', priceType: 'apertura', lastUpdate: new Date().toISOString() };
    }

    // Strategy 5: Generic scan — pick first plausible price near the top of the page
    const genericMatches = html.match(/<(?:td|dd|strong|span)[^>]*>(-?\d{1,3}(?:\.\d{3})*,\d+)<\/(?:td|dd|strong|span)>/g);
    if (genericMatches) {
        for (const m of genericMatches.slice(0, 20)) {
            const inner = m.replace(/<[^>]+>/g, '');
            const parsed = tryParsePrice(inner);
            if (parsed !== null && parsed > 20 && parsed < 300) {
                return { isin: cleanIsin, price: parsed, currency: 'EUR', priceType: 'ultimo', lastUpdate: new Date().toISOString() };
            }
        }
    }

    return { isin: cleanIsin, price: null, currency: 'EUR', priceType: 'none', error: 'Prezzo non trovato nella pagina' };
}
