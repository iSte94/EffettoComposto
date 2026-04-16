/**
 * Scraper storico dividendi da Borsa Italiana per ISIN.
 *
 * URL Azioni: https://www.borsaitaliana.it/borsa/quotazioni/azioni/elenco-completo-dividendi.html?isin={ISIN}&lang=it
 * URL ETF:    https://www.borsaitaliana.it/borsa/etf/dividendi.html?isin={ISIN}&lang=it
 *
 * Tabella ETF (4 colonne): DATA DIVIDENDO | PROVENTO | VALUTA | DATA PAGAMENTO
 * Tabella Azioni (7+ colonne): pattern matching per trovare date e numeri
 */

export type DividendAssetType = 'stock' | 'etf' | 'auto';

export interface ScrapedDividend {
    exDate: string;            // YYYY-MM-DD
    paymentDate: string;        // YYYY-MM-DD
    dividendPerShare: number;   // In currency units
    currency: 'EUR' | 'USD' | 'GBP' | 'CHF' | 'JPY' | 'CAD' | 'Unknown';
    dividendType: 'ordinary' | 'extraordinary' | 'interim' | 'final';
    rawText?: string;
}

const FETCH_TIMEOUT_MS = 20_000;

/** Parse italian date: DD/MM/YY or DD/MM/YYYY → YYYY-MM-DD */
function parseItalianDate(raw: string): string | null {
    const m = raw.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (!m) return null;
    const day = m[1].padStart(2, '0');
    const month = m[2].padStart(2, '0');
    let year = m[3];
    if (year.length === 2) {
        // 2-digit year: assume 2000-2099
        year = `20${year}`;
    }
    const d = new Date(`${year}-${month}-${day}T00:00:00Z`);
    if (isNaN(d.getTime())) return null;
    return `${year}-${month}-${day}`;
}

/** Parse italian number: "1.234,56" → 1234.56 */
function parseItalianNumber(str: string): number {
    const cleaned = str.replace(/\./g, '').replace(',', '.').trim();
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : NaN;
}

function mapCurrency(raw: string): ScrapedDividend['currency'] {
    const s = raw.toLowerCase().trim();
    if (s.includes('eur') || s === '€') return 'EUR';
    if (s.includes('dollaro') || s.includes('usd') || s === '$') return 'USD';
    if (s.includes('sterlin') || s.includes('gbp') || s === '£') return 'GBP';
    if (s.includes('franc') || s.includes('chf')) return 'CHF';
    if (s.includes('yen') || s.includes('jpy')) return 'JPY';
    if (s.includes('canad') || s.includes('cad')) return 'CAD';
    return 'Unknown';
}

function stripTags(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchHtml(url: string): Promise<string | null> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            signal: ctrl.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html',
                'Accept-Language': 'it-IT,it;q=0.9',
            },
            next: { revalidate: 43200 }, // Cache 12h
        });
        if (!res.ok) return null;
        return await res.text();
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

/** Extract all tables from HTML as arrays of row cells (plaintext). */
function extractTables(html: string): string[][][] {
    const tables: string[][][] = [];
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch: RegExpExecArray | null;
    while ((tableMatch = tableRegex.exec(html)) !== null) {
        const rows: string[][] = [];
        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let rowMatch: RegExpExecArray | null;
        while ((rowMatch = rowRegex.exec(tableMatch[1])) !== null) {
            const cells: string[] = [];
            const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
            let cellMatch: RegExpExecArray | null;
            while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
                cells.push(stripTags(cellMatch[1]));
            }
            if (cells.length > 0) rows.push(cells);
        }
        if (rows.length > 0) tables.push(rows);
    }
    return tables;
}

function detectDividendType(rawRow: string): ScrapedDividend['dividendType'] {
    const s = rawRow.toLowerCase();
    if (s.includes('straordinar')) return 'extraordinary';
    if (s.includes('acconto') || s.includes('interim')) return 'interim';
    if (s.includes('saldo') || s.includes('final')) return 'final';
    return 'ordinary';
}

function parseEtfTable(rows: string[][]): ScrapedDividend[] {
    // ETF table has 4 columns: DATA DIVIDENDO | PROVENTO | VALUTA | DATA PAGAMENTO
    // First row is header
    const out: ScrapedDividend[] = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 4) continue;
        const exDate = parseItalianDate(row[0]);
        const amount = parseItalianNumber(row[1]);
        const currency = mapCurrency(row[2]);
        const paymentDate = parseItalianDate(row[3]);
        if (!exDate || !paymentDate || !Number.isFinite(amount) || amount <= 0) continue;
        out.push({
            exDate,
            paymentDate,
            dividendPerShare: amount,
            currency,
            dividendType: detectDividendType(row.join(' ')),
            rawText: row.join(' | '),
        });
    }
    return out;
}

function parseStockTable(rows: string[][]): ScrapedDividend[] {
    // Stock table has 7+ columns; use pattern matching
    const out: ScrapedDividend[] = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 4) continue;

        // Collect all date-shaped cells and number-shaped cells
        const dates: { idx: number; value: string }[] = [];
        const numbers: { idx: number; value: number }[] = [];
        const currencies: { idx: number; value: ScrapedDividend['currency'] }[] = [];

        row.forEach((cell, idx) => {
            const dateParsed = parseItalianDate(cell);
            if (dateParsed) {
                dates.push({ idx, value: dateParsed });
                return;
            }
            const numParsed = parseItalianNumber(cell);
            if (Number.isFinite(numParsed) && numParsed > 0 && numParsed < 1000) {
                numbers.push({ idx, value: numParsed });
            }
            const curr = mapCurrency(cell);
            if (curr !== 'Unknown') {
                currencies.push({ idx, value: curr });
            }
        });

        if (dates.length < 2 || numbers.length === 0) continue;
        // Earliest date = ex-date, latest = payment date
        const sortedDates = [...dates].sort((a, b) => a.value.localeCompare(b.value));
        const exDate = sortedDates[0].value;
        const paymentDate = sortedDates[sortedDates.length - 1].value;
        const dividendPerShare = numbers[0].value;
        const currency = currencies[0]?.value ?? 'EUR';

        out.push({
            exDate,
            paymentDate,
            dividendPerShare,
            currency,
            dividendType: detectDividendType(row.join(' ')),
            rawText: row.join(' | '),
        });
    }
    return out;
}

async function scrapeFromUrl(url: string): Promise<ScrapedDividend[]> {
    const html = await fetchHtml(url);
    if (!html) return [];
    const tables = extractTables(html);
    // Find the best-fitting table: look for "dividendo" or "provento" in headers
    let best: { rows: string[][]; type: 'etf' | 'stock' } | null = null;
    for (const t of tables) {
        if (t.length < 2) continue;
        const header = t[0].join(' ').toLowerCase();
        if (!header.includes('dividend') && !header.includes('provento') && !header.includes('stacco')) continue;
        if (t[0].length === 4) {
            best = { rows: t, type: 'etf' };
            break; // ETF has canonical 4-col layout
        }
        if (t[0].length >= 5) {
            best = { rows: t, type: 'stock' };
        }
    }
    if (!best) return [];
    return best.type === 'etf' ? parseEtfTable(best.rows) : parseStockTable(best.rows);
}

/**
 * Scrape dividendi per un ISIN da Borsa Italiana.
 * Prova prima la pagina ETF, poi quella azioni.
 */
export async function scrapeDividendsByIsin(
    isin: string,
    type: DividendAssetType = 'auto'
): Promise<ScrapedDividend[]> {
    const cleanIsin = isin.trim().toUpperCase();
    const urls: string[] = [];

    if (type === 'etf' || type === 'auto') {
        urls.push(`https://www.borsaitaliana.it/borsa/etf/dividendi.html?isin=${cleanIsin}&lang=it`);
    }
    if (type === 'stock' || type === 'auto') {
        urls.push(`https://www.borsaitaliana.it/borsa/quotazioni/azioni/elenco-completo-dividendi.html?isin=${cleanIsin}&lang=it`);
    }

    for (const url of urls) {
        try {
            const results = await scrapeFromUrl(url);
            if (results.length > 0) return results;
        } catch (e) {
            console.warn(`Dividend scrape failed for ${url}:`, e);
        }
    }
    return [];
}

/** Italian withholding tax rate on dividends (26%). */
export const IT_DIVIDEND_WITHHOLDING_TAX = 0.26;

export function calculateDividendTax(grossAmount: number, taxRate = IT_DIVIDEND_WITHHOLDING_TAX): number {
    return Math.max(0, grossAmount * taxRate);
}
