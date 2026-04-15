/**
 * Registry dei tool che l'LLM puo' chiamare durante una conversazione.
 * Ogni tool ha:
 *  - schema JSON Schema (parameters) compatibile con Gemini & OpenRouter
 *  - handler async client-side che esegue il calcolo / chiama l'API
 */

import { calculateNetSalary } from "@/lib/finance/irpef";

export interface AiToolDef {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    handler: (args: Record<string, unknown>) => Promise<unknown>;
}

// ---------- helpers ----------

function num(v: unknown, def = 0): number {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : def;
}

function str(v: unknown, def = ""): string {
    return typeof v === "string" ? v : def;
}

function gaussian(): number {
    let u = 0, w = 0;
    while (u === 0) u = Math.random();
    while (w === 0) w = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * w);
}

// ---------- tool: ammortamento mutuo (rata francese) ----------

const mortgageAmortizationTool: AiToolDef = {
    name: "calculate_mortgage_amortization",
    description:
        "Calcola la rata mensile di un mutuo a tasso fisso (ammortamento francese), il totale degli interessi pagati e produce uno schema annuale (capitale residuo, interessi, capitale rimborsato per anno).",
    parameters: {
        type: "object",
        properties: {
            principal: { type: "number", description: "Capitale finanziato in EUR" },
            annualRatePct: { type: "number", description: "Tasso annuo nominale (es: 3.5)" },
            years: { type: "integer", description: "Durata in anni" },
        },
        required: ["principal", "annualRatePct", "years"],
    },
    async handler(args) {
        const P = num(args.principal);
        const ratePct = num(args.annualRatePct);
        const years = Math.max(1, Math.floor(num(args.years, 30)));
        const i = ratePct / 100 / 12;
        const n = years * 12;
        const monthly = i > 0
            ? (P * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1)
            : P / n;

        let balance = P;
        const yearly: Array<{ year: number; interestPaid: number; capitalPaid: number; balance: number }> = [];
        for (let y = 1; y <= years; y++) {
            let yi = 0, yc = 0;
            for (let m = 0; m < 12; m++) {
                const interest = balance * i;
                const capital = monthly - interest;
                balance -= capital;
                yi += interest;
                yc += capital;
            }
            yearly.push({
                year: y,
                interestPaid: Math.round(yi),
                capitalPaid: Math.round(yc),
                balance: Math.max(0, Math.round(balance)),
            });
        }
        const totalInterest = yearly.reduce((s, r) => s + r.interestPaid, 0);
        return {
            monthlyPayment: Math.round(monthly * 100) / 100,
            totalPaid: Math.round((monthly * n) * 100) / 100,
            totalInterest,
            yearlySchedule: yearly,
        };
    },
};

// ---------- tool: stipendio netto IRPEF ----------

const netSalaryTool: AiToolDef = {
    name: "calculate_net_salary",
    description:
        "Calcola lo stipendio netto annuale e mensile italiano da un RAL (Reddito Annuo Lordo), applicando IRPEF, INPS, detrazioni lavoro dipendente e cuneo fiscale 2025/2026.",
    parameters: {
        type: "object",
        properties: {
            ral: { type: "number", description: "Reddito Annuo Lordo in EUR" },
            mensilita: { type: "integer", description: "Numero di mensilita' (12, 13, 14). Default 14", enum: [12, 13, 14] },
            contractType: {
                type: "string",
                enum: ["standard", "apprendistato", "pubblico", "over15"],
                description: "Tipo contratto. Default 'standard'.",
            },
            applyCuneoFiscale: { type: "boolean", description: "Applica cuneo fiscale (default true)" },
        },
        required: ["ral"],
    },
    async handler(args) {
        const result = calculateNetSalary({
            ral: num(args.ral),
            mensilita: args.mensilita ? Number(args.mensilita) as 12 | 13 | 14 : 14,
            contractType: (str(args.contractType, "standard") as "standard" | "apprendistato" | "pubblico" | "over15"),
            applyCuneoFiscale: args.applyCuneoFiscale === undefined ? true : Boolean(args.applyCuneoFiscale),
        });
        return result;
    },
};

// ---------- tool: Monte Carlo FIRE semplificato ----------

const fireMonteCarloTool: AiToolDef = {
    name: "run_fire_monte_carlo",
    description:
        "Simulazione Monte Carlo del percorso FIRE: data un capitale iniziale, contributi mensili, rendimento annuo reale atteso e volatilita', proietta il patrimonio per N anni e calcola percentili (p10/p50/p90) e probabilita' di raggiungere un eventuale target. Esegue 2000 traiettorie.",
    parameters: {
        type: "object",
        properties: {
            startingCapital: { type: "number", description: "Patrimonio investito di partenza in EUR" },
            monthlyContribution: { type: "number", description: "Contributi mensili in EUR (positivo = accumulo)" },
            annualReturnRealPct: { type: "number", description: "Rendimento annuo reale atteso in % (es: 5)" },
            volatilityPct: { type: "number", description: "Deviazione standard annua in % (es: 15)" },
            years: { type: "integer", description: "Orizzonte in anni" },
            fireTarget: { type: "number", description: "Target FIRE in EUR (opzionale, per success rate)" },
        },
        required: ["startingCapital", "monthlyContribution", "annualReturnRealPct", "volatilityPct", "years"],
    },
    async handler(args) {
        const start = num(args.startingCapital);
        const monthly = num(args.monthlyContribution);
        const meanPct = num(args.annualReturnRealPct);
        const stdPct = num(args.volatilityPct);
        const years = Math.max(1, Math.floor(num(args.years, 20)));
        const target = args.fireTarget !== undefined ? num(args.fireTarget) : null;
        const runs = 2000;
        const mean = meanPct / 100;
        const std = stdPct / 100;

        const finalValues: number[] = [];
        let successes = 0;
        const yearPaths: number[][] = Array.from({ length: years + 1 }, () => []);

        for (let r = 0; r < runs; r++) {
            let cap = start;
            yearPaths[0].push(cap);
            let reachedTarget = false;
            for (let y = 1; y <= years; y++) {
                const yearReturn = mean + std * gaussian();
                cap = cap * (1 + yearReturn) + monthly * 12;
                if (cap < 0) cap = 0;
                yearPaths[y].push(cap);
                if (target !== null && cap >= target) reachedTarget = true;
            }
            finalValues.push(cap);
            if (reachedTarget) successes++;
        }

        const percentile = (arr: number[], p: number) => {
            const s = [...arr].sort((a, b) => a - b);
            return s[Math.floor(s.length * p)];
        };

        const yearStats = yearPaths.map((col, y) => ({
            year: y,
            p10: Math.round(percentile(col, 0.1)),
            p50: Math.round(percentile(col, 0.5)),
            p90: Math.round(percentile(col, 0.9)),
        }));

        return {
            runs,
            yearsSimulated: years,
            finalP10: Math.round(percentile(finalValues, 0.1)),
            finalP50: Math.round(percentile(finalValues, 0.5)),
            finalP90: Math.round(percentile(finalValues, 0.9)),
            successRatePct: target !== null ? Math.round((successes / runs) * 1000) / 10 : null,
            target,
            yearlyPercentiles: yearStats,
        };
    },
};

// ---------- tool: prezzo azione/ETF live ----------

const stockPriceTool: AiToolDef = {
    name: "get_stock_price",
    description:
        "Recupera il prezzo live in EUR di un'azione/ETF da Yahoo Finance (con fallback Stooq). Usa il ticker corretto (es. VWCE.DE, AAPL).",
    parameters: {
        type: "object",
        properties: {
            ticker: { type: "string", description: "Ticker (es: VWCE.DE, AAPL, MSFT)" },
        },
        required: ["ticker"],
    },
    async handler(args) {
        const ticker = str(args.ticker).trim();
        if (!ticker) return { error: "Ticker mancante" };
        const res = await fetch(`/api/stocks?ticker=${encodeURIComponent(ticker)}`);
        if (!res.ok) return { error: `Errore ${res.status}: ticker non trovato` };
        return res.json();
    },
};

// ---------- tool: prezzo BTC ----------

const btcPriceTool: AiToolDef = {
    name: "get_bitcoin_price",
    description: "Recupera il prezzo live del Bitcoin in EUR (fonte: Binance).",
    parameters: { type: "object", properties: {} },
    async handler() {
        const res = await fetch("/api/bitcoin");
        if (!res.ok) return { error: `Errore ${res.status}` };
        return res.json();
    },
};

// ---------- tool: offerte mutui market ----------

const mortgageMarketTool: AiToolDef = {
    name: "get_mortgage_market_offers",
    description:
        "Recupera le offerte di mutuo aggiornate da MutuiSupermarket per il tipo di tasso e durata richiesti. Restituisce TAN/TAEG/rata di varie banche.",
    parameters: {
        type: "object",
        properties: {
            tipoTasso: { type: "string", enum: ["F", "V"], description: "F = fisso, V = variabile" },
            durata: { type: "integer", enum: [15, 20, 30], description: "Durata in anni" },
        },
        required: ["tipoTasso", "durata"],
    },
    async handler(args) {
        const tipoTasso = str(args.tipoTasso, "F");
        const durata = Math.floor(num(args.durata, 30));
        const res = await fetch(`/api/mutui-market?tipoTasso=${tipoTasso}&durata=${durata}`);
        if (!res.ok) return { error: `Errore ${res.status}` };
        const json = await res.json();
        // Compatta: ritorna solo le prime 8 offerte per non saturare il contesto
        const offers = (json.data && Array.isArray(json.data)) ? json.data.slice(0, 8) : json;
        return { offers, scrapedAt: json.scrapedAt };
    },
};

// ---------- tool: delta patrimonio tra due date ----------

const netWorthDeltaTool: AiToolDef = {
    name: "get_net_worth_delta",
    description:
        "Calcola la variazione del patrimonio netto dell'utente tra due date (formato YYYY-MM-DD). Usa lo snapshot piu' vicino a ciascuna data e ritorna delta assoluto e percentuale.",
    parameters: {
        type: "object",
        properties: {
            from: { type: "string", description: "Data inizio in formato YYYY-MM-DD" },
            to: { type: "string", description: "Data fine in formato YYYY-MM-DD (omessa = oggi)" },
        },
        required: ["from"],
    },
    async handler(args) {
        const fromStr = str(args.from);
        const toStr = str(args.to) || new Date().toISOString().slice(0, 10);
        const res = await fetch("/api/patrimonio");
        if (!res.ok) return { error: `Errore ${res.status}` };
        const json = await res.json();
        const records: Array<{ date: string; totalNetWorth?: number;
            realEstateValue: number; liquidStockValue: number; stocksSnapshotValue: number;
            safeHavens: number; emergencyFund: number; pensionFund: number; bitcoinAmount: number;
            bitcoinPrice: number; debtsTotal: number;
        }> = json.history ?? json.records ?? json ?? [];

        if (!Array.isArray(records) || records.length === 0) return { error: "Nessuno snapshot disponibile" };

        const nw = (r: typeof records[number]) => {
            if (typeof r.totalNetWorth === "number") return r.totalNetWorth;
            return (r.realEstateValue || 0) + (r.liquidStockValue || 0) + (r.stocksSnapshotValue || 0)
                + (r.safeHavens || 0) + (r.emergencyFund || 0) + (r.pensionFund || 0)
                + (r.bitcoinAmount || 0) * (r.bitcoinPrice || 0) - (r.debtsTotal || 0);
        };
        const closest = (target: string) => {
            const t = new Date(target).getTime();
            let best: typeof records[number] | null = null;
            let bestDiff = Infinity;
            for (const r of records) {
                const diff = Math.abs(new Date(r.date).getTime() - t);
                if (diff < bestDiff) { bestDiff = diff; best = r; }
            }
            return best;
        };

        const f = closest(fromStr);
        const t = closest(toStr);
        if (!f || !t) return { error: "Snapshot non trovati" };
        const fNw = nw(f);
        const tNw = nw(t);
        const delta = tNw - fNw;
        const pct = fNw !== 0 ? (delta / Math.abs(fNw)) * 100 : null;
        return {
            from: { requested: fromStr, actualDate: f.date, netWorth: Math.round(fNw) },
            to: { requested: toStr, actualDate: t.date, netWorth: Math.round(tNw) },
            deltaAbs: Math.round(delta),
            deltaPct: pct !== null ? Math.round(pct * 100) / 100 : null,
        };
    },
};

// ---------- registry ----------

export const AI_TOOLS: AiToolDef[] = [
    mortgageAmortizationTool,
    netSalaryTool,
    fireMonteCarloTool,
    stockPriceTool,
    btcPriceTool,
    mortgageMarketTool,
    netWorthDeltaTool,
];

export function getTool(name: string): AiToolDef | undefined {
    return AI_TOOLS.find((t) => t.name === name);
}
