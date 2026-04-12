// Parser per CSV bancari italiani
// Supporta formati: Fineco, Intesa Sanpaolo, Unicredit, generico

export interface BankTransaction {
    date: string;          // YYYY-MM-DD
    description: string;
    amount: number;        // positivo = entrata, negativo = uscita
    balance?: number;      // saldo dopo operazione
    category?: string;     // auto-detected
}

export interface ImportResult {
    transactions: BankTransaction[];
    detectedBank: string;
    totalIncome: number;
    totalExpenses: number;
    currentBalance?: number;
    monthlySummary: { month: string; income: number; expenses: number; net: number }[];
}

// Detect delimiter from first line
function detectDelimiter(line: string): string {
    const semicolons = (line.match(/;/g) || []).length;
    const commas = (line.match(/,/g) || []).length;
    const tabs = (line.match(/\t/g) || []).length;
    if (tabs > semicolons && tabs > commas) return '\t';
    if (semicolons >= commas) return ';';
    return ',';
}

// Parse Italian number format: 1.234,56 -> 1234.56
function parseItalianNumber(s: string): number {
    if (!s || !s.trim()) return 0;
    const cleaned = s.trim()
        .replace(/[€\s]/g, '')
        .replace(/\./g, '')    // remove thousand separators
        .replace(',', '.');    // decimal comma -> dot
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

// Parse date in various Italian formats
function parseDate(s: string): string | null {
    if (!s) return null;
    const trimmed = s.trim().replace(/"/g, '');

    // DD/MM/YYYY or DD-MM-YYYY
    const dmy = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;

    // YYYY-MM-DD (ISO)
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return trimmed;

    // DD/MM/YY
    const dmy2 = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/);
    if (dmy2) {
        const year = parseInt(dmy2[3]) > 50 ? `19${dmy2[3]}` : `20${dmy2[3]}`;
        return `${year}-${dmy2[2].padStart(2, '0')}-${dmy2[1].padStart(2, '0')}`;
    }

    return null;
}

export interface CategoryRule {
    name: string;
    keywords: string[];
}

// Auto-detect category from description.
// Se passato customCategories, le keyword dell'utente hanno la precedenza sulle regole built-in.
export function categorizeTransaction(desc: string, customCategories?: CategoryRule[]): string {
    const d = desc.toLowerCase();

    if (customCategories && customCategories.length > 0) {
        for (const cat of customCategories) {
            if (!cat.keywords || cat.keywords.length === 0) continue;
            for (const rawKw of cat.keywords) {
                const kw = rawKw.trim().toLowerCase();
                if (kw.length >= 2 && d.includes(kw)) return cat.name;
            }
        }
    }

    if (d.includes('stipendio') || d.includes('salario') || d.includes('ral')) return 'Stipendio';
    if (d.includes('affitto') || d.includes('canone locazione')) return 'Affitto';
    if (d.includes('mutuo') || d.includes('rata finanziamento')) return 'Mutuo/Prestito';
    if (d.includes('bolletta') || d.includes('enel') || d.includes('eni') || d.includes('a2a') || d.includes('hera')) return 'Utenze';
    if (d.includes('supermercato') || d.includes('conad') || d.includes('esselunga') || d.includes('coop') || d.includes('lidl')) return 'Spesa';
    if (d.includes('amazon') || d.includes('paypal')) return 'Shopping Online';
    if (d.includes('assicurazione') || d.includes('polizza')) return 'Assicurazione';
    if (d.includes('investimento') || d.includes('fondi') || d.includes('etf') || d.includes('trading')) return 'Investimenti';
    if (d.includes('carburante') || d.includes('benzina') || d.includes('esso') || d.includes('q8') || d.includes('ip')) return 'Trasporti';
    if (d.includes('ristorante') || d.includes('bar') || d.includes('pizzeria')) return 'Ristorazione';
    return 'Altro';
}

// Detect which bank format
function detectBank(headers: string[]): string {
    const h = headers.map(s => s.toLowerCase().replace(/"/g, '').trim());
    if (h.some(x => x.includes('fineco'))) return 'Fineco';
    if (h.some(x => x === 'data contabile') && h.some(x => x === 'data valuta')) return 'Intesa Sanpaolo';
    if (h.some(x => x.includes('importo'))) return 'Generico Italiano';
    if (h.some(x => x === 'date') && h.some(x => x === 'amount')) return 'Generico EN';
    return 'Generico';
}

function splitCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
        if (ch === '"') { inQuotes = !inQuotes; continue; }
        if (ch === delimiter && !inQuotes) { result.push(current.trim()); current = ''; continue; }
        current += ch;
    }
    result.push(current.trim());
    return result;
}

export function parseBankCSV(csvContent: string, customCategories?: CategoryRule[]): ImportResult {
    const lines = csvContent.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) {
        return { transactions: [], detectedBank: 'Sconosciuto', totalIncome: 0, totalExpenses: 0, monthlySummary: [] };
    }

    const delimiter = detectDelimiter(lines[0]);
    const headers = splitCSVLine(lines[0], delimiter);
    const detectedBank = detectBank(headers);
    const headerLower = headers.map(h => h.toLowerCase().replace(/"/g, '').trim());

    // Find column indices
    const dateIdx = headerLower.findIndex(h => h.includes('data') || h === 'date');
    const descIdx = headerLower.findIndex(h => h.includes('descri') || h.includes('causale') || h.includes('dettagli') || h === 'description');
    const amountIdx = headerLower.findIndex(h => h.includes('importo') || h === 'amount' || h.includes('dare/avere'));
    const balanceIdx = headerLower.findIndex(h => h.includes('saldo') || h === 'balance');
    // Some banks have separate debit/credit columns
    const debitIdx = headerLower.findIndex(h => h === 'dare' || h.includes('uscite') || h === 'debit');
    const creditIdx = headerLower.findIndex(h => h === 'avere' || h.includes('entrate') || h === 'credit');

    const transactions: BankTransaction[] = [];

    for (let i = 1; i < lines.length; i++) {
        const cols = splitCSVLine(lines[i], delimiter);
        if (cols.length < 2) continue;

        const dateStr = dateIdx >= 0 ? parseDate(cols[dateIdx]) : null;
        if (!dateStr) continue;

        const description = descIdx >= 0 ? cols[descIdx] : '';

        let amount = 0;
        if (amountIdx >= 0) {
            amount = parseItalianNumber(cols[amountIdx]);
        } else if (debitIdx >= 0 && creditIdx >= 0) {
            const debit = parseItalianNumber(cols[debitIdx]);
            const credit = parseItalianNumber(cols[creditIdx]);
            amount = credit > 0 ? credit : -Math.abs(debit);
        }

        const balance = balanceIdx >= 0 ? parseItalianNumber(cols[balanceIdx]) : undefined;
        const category = categorizeTransaction(description, customCategories);

        transactions.push({ date: dateStr, description, amount, balance, category });
    }

    // Sort by date
    transactions.sort((a, b) => a.date.localeCompare(b.date));

    const totalIncome = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    const lastWithBalance = [...transactions].reverse().find(t => t.balance !== undefined);
    const currentBalance = lastWithBalance?.balance;

    // Monthly summary
    const monthMap = new Map<string, { income: number; expenses: number }>();
    for (const t of transactions) {
        const month = t.date.substring(0, 7); // YYYY-MM
        const entry = monthMap.get(month) || { income: 0, expenses: 0 };
        if (t.amount > 0) entry.income += t.amount;
        else entry.expenses += Math.abs(t.amount);
        monthMap.set(month, entry);
    }
    const monthlySummary = Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, { income, expenses }]) => ({ month, income, expenses, net: income - expenses }));

    return { transactions, detectedBank, totalIncome, totalExpenses, currentBalance, monthlySummary };
}
