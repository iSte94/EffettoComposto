/**
 * Registry dei tool che l'LLM puo' chiamare durante una conversazione.
 * Ogni tool ha:
 *  - schema JSON Schema (parameters) compatibile con Gemini & OpenRouter
 *  - handler async client-side che esegue il calcolo / chiama l'API
 */

import { calculateNetSalary } from "@/lib/finance/irpef";
import { computeCoastFireScenarios } from "@/lib/finance/coast-fire";
import { computeFireSensitivity } from "@/lib/finance/fire-sensitivity";
import { computeSaleTax } from "@/lib/finance/sale-tax";

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

function bool(v: unknown, def = false): boolean {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return v.toLowerCase() === "true";
    return def;
}

function gaussian(): number {
    let u = 0, w = 0;
    while (u === 0) u = Math.random();
    while (w === 0) w = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * w);
}

async function getJson<T = unknown>(url: string): Promise<T | { error: string }> {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return { error: `HTTP ${res.status} su ${url}` };
    return res.json();
}

// ========== FINANZA PURA (no fetch) ==========

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
        return calculateNetSalary({
            ral: num(args.ral),
            mensilita: args.mensilita ? Number(args.mensilita) as 12 | 13 | 14 : 14,
            contractType: (str(args.contractType, "standard") as "standard" | "apprendistato" | "pubblico" | "over15"),
            applyCuneoFiscale: args.applyCuneoFiscale === undefined ? true : Boolean(args.applyCuneoFiscale),
        });
    },
};

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

const coastFireTool: AiToolDef = {
    name: "compute_coast_fire_scenarios",
    description:
        "Calcola tre scenari (Bear/Base/Bull) di Coast FIRE con pensione pubblica attualizzata: a che patrimonio bisogna arrivare ADESSO perche' senza piu' versamenti il capitale cresca da solo fino al target FIRE all'eta' di pensionamento. Tiene conto di spese mensili, pensione pubblica e rendite immobiliari.",
    parameters: {
        type: "object",
        properties: {
            currentAge: { type: "integer", description: "Eta' attuale" },
            retirementAge: { type: "integer", description: "Eta' a cui si desidera raggiungere FIRE" },
            publicPensionAge: { type: "integer", description: "Eta' inizio pensione pubblica (es. 67)" },
            startingCapital: { type: "number", description: "Capitale investito gia' accumulato EUR" },
            expectedMonthlyExpenses: { type: "number", description: "Spese mensili attese dopo FIRE in EUR" },
            expectedPublicPension: { type: "number", description: "Pensione pubblica mensile attesa EUR" },
            expectedPassiveIncomeMonthly: { type: "number", description: "Entrate passive mensili (affitti netti) EUR" },
            fireWithdrawalRate: { type: "number", description: "SWR in % (es. 3.25)" },
            fireExpectedReturn: { type: "number", description: "Rendimento annuo nominale atteso %" },
            expectedInflation: { type: "number", description: "Inflazione attesa annua %" },
        },
        required: ["currentAge", "retirementAge", "startingCapital", "expectedMonthlyExpenses", "fireWithdrawalRate", "fireExpectedReturn", "expectedInflation"],
    },
    async handler(args) {
        return computeCoastFireScenarios({
            currentAge: Math.floor(num(args.currentAge, 30)),
            retirementAge: Math.floor(num(args.retirementAge, 60)),
            publicPensionAge: Math.floor(num(args.publicPensionAge, 67)),
            currentCapital: num(args.startingCapital),
            monthlyExpenses: num(args.expectedMonthlyExpenses),
            monthlyPublicPension: num(args.expectedPublicPension),
            monthlyRealEstateIncome: num(args.expectedPassiveIncomeMonthly),
            withdrawalRatePct: num(args.fireWithdrawalRate, 3.25),
            nominalReturnPct: num(args.fireExpectedReturn, 6),
            inflationPct: num(args.expectedInflation, 2),
        });
    },
};

const sensitivityMatrixTool: AiToolDef = {
    name: "compute_fire_sensitivity_matrix",
    description:
        "Costruisce una griglia 5x4 che mostra quanti anni servono per raggiungere FIRE variando le spese (-20%..+20%) e il tasso di risparmio mensile (0.5x..2x). Permette di capire quale leva (risparmiare di piu' vs spendere meno) ha piu' impatto.",
    parameters: {
        type: "object",
        properties: {
            startingCapital: { type: "number" },
            currentAge: { type: "integer" },
            retirementAge: { type: "integer", description: "Eta' massima di simulazione (es. 70)" },
            monthlySavingsBaseline: { type: "number", description: "Risparmi mensili baseline EUR" },
            monthlyExpensesBaseline: { type: "number", description: "Spese mensili baseline EUR" },
            withdrawalRatePct: { type: "number", description: "SWR % (es. 3.25)" },
            nominalReturnPct: { type: "number", description: "Rendimento nominale %" },
            inflationPct: { type: "number", description: "Inflazione annua %" },
            maxYears: { type: "integer", description: "Cap anni (default 50)" },
        },
        required: ["startingCapital", "currentAge", "monthlySavingsBaseline", "monthlyExpensesBaseline", "withdrawalRatePct", "nominalReturnPct", "inflationPct"],
    },
    async handler(args) {
        return computeFireSensitivity({
            startingCapital: num(args.startingCapital),
            currentAge: Math.floor(num(args.currentAge, 30)),
            retirementAge: Math.floor(num(args.retirementAge, 70)),
            monthlySavingsBaseline: num(args.monthlySavingsBaseline),
            monthlyExpensesBaseline: num(args.monthlyExpensesBaseline),
            withdrawalRatePct: num(args.withdrawalRatePct, 3.25),
            nominalReturnPct: num(args.nominalReturnPct, 6),
            inflationPct: num(args.inflationPct, 2),
            maxYears: Math.floor(num(args.maxYears, 50)),
        });
    },
};

const saleTaxTool: AiToolDef = {
    name: "compute_sale_tax",
    description:
        "Calcola l'imposta sulla plusvalenza al netto italiano (26% azioni/ETF, 12.5% titoli di stato UE/white list) su una vendita, con eventuale compensazione minusvalenze pregresse. Ritorna imponibile, tasse, netto, e minusvalenze residue riportabili.",
    parameters: {
        type: "object",
        properties: {
            assetType: { type: "string", enum: ["equity", "bond"], description: "equity = azioni/ETF 26%, bond = titoli di stato 12.5%" },
            shares: { type: "number", description: "Quantita' vendute" },
            sellPrice: { type: "number", description: "Prezzo unitario di vendita EUR" },
            costBasis: { type: "number", description: "Costo unitario medio di acquisto EUR" },
            priorLosses: { type: "number", description: "Minusvalenze precedenti compensabili EUR" },
        },
        required: ["assetType", "shares", "sellPrice", "costBasis"],
    },
    async handler(args) {
        const type = str(args.assetType, "equity");
        return computeSaleTax({
            shares: num(args.shares),
            currentPrice: num(args.sellPrice),
            averageCost: num(args.costBasis),
            taxRatePct: type === "bond" ? 12.5 : 26,
            accumulatedLosses: num(args.priorLosses),
        });
    },
};

const savingsPlanTool: AiToolDef = {
    name: "compute_savings_plan",
    description:
        "Calcola il contributo mensile necessario per raggiungere un obiettivo in N anni, o viceversa il tempo per raggiungerlo con un contributo dato. Usa rendimento composto mensile. Se si forniscono sia monthlyContribution sia targetAmount, calcola gli anni necessari.",
    parameters: {
        type: "object",
        properties: {
            startingCapital: { type: "number", description: "Capitale iniziale EUR" },
            targetAmount: { type: "number", description: "Obiettivo EUR" },
            annualReturnPct: { type: "number", description: "Rendimento annuo atteso %" },
            years: { type: "integer", description: "Orizzonte (opzionale se fornisci monthlyContribution)" },
            monthlyContribution: { type: "number", description: "Contributo mensile (opzionale se fornisci years)" },
        },
        required: ["startingCapital", "targetAmount", "annualReturnPct"],
    },
    async handler(args) {
        const PV = num(args.startingCapital);
        const FV = num(args.targetAmount);
        const ret = num(args.annualReturnPct, 5) / 100;
        const i = Math.pow(1 + ret, 1 / 12) - 1;
        const years = args.years !== undefined ? num(args.years) : null;
        const pmt = args.monthlyContribution !== undefined ? num(args.monthlyContribution) : null;

        if (years !== null && years > 0) {
            const n = years * 12;
            const fvPV = PV * Math.pow(1 + i, n);
            const gap = FV - fvPV;
            const requiredPmt = i > 0 ? gap * i / (Math.pow(1 + i, n) - 1) : gap / n;
            return {
                mode: "required_monthly_contribution",
                requiredMonthly: Math.round(Math.max(0, requiredPmt) * 100) / 100,
                years,
                futureValueFromPVAlone: Math.round(fvPV),
            };
        }
        if (pmt !== null) {
            let cap = PV;
            for (let m = 1; m <= 12 * 100; m++) {
                cap = cap * (1 + i) + pmt;
                if (cap >= FV) {
                    return {
                        mode: "years_to_target",
                        yearsToTarget: Math.round((m / 12) * 100) / 100,
                        monthsToTarget: m,
                        finalCapital: Math.round(cap),
                    };
                }
            }
            return { mode: "years_to_target", error: "Non raggiungibile in 100 anni con questi parametri" };
        }
        return { error: "Fornire 'years' o 'monthlyContribution'" };
    },
};

// ========== DATI LIVE (fetch API pubbliche) ==========

const stockPriceTool: AiToolDef = {
    name: "get_stock_price",
    description:
        "Recupera il prezzo live in EUR di un'azione/ETF da Yahoo Finance (con fallback Stooq + Borsa Italiana per bond). Usa il ticker corretto (es. VWCE.DE, AAPL, o ISIN bond IT00...).",
    parameters: {
        type: "object",
        properties: {
            ticker: { type: "string", description: "Ticker (es: VWCE.DE, AAPL, MSFT) o ISIN bond" },
        },
        required: ["ticker"],
    },
    async handler(args) {
        const ticker = str(args.ticker).trim();
        if (!ticker) return { error: "Ticker mancante" };
        return getJson(`/api/stocks?ticker=${encodeURIComponent(ticker)}`);
    },
};

const btcPriceTool: AiToolDef = {
    name: "get_bitcoin_price",
    description: "Recupera il prezzo live del Bitcoin in EUR (fonte: Binance).",
    parameters: { type: "object", properties: {} },
    async handler() {
        return getJson("/api/bitcoin");
    },
};

const bondQuoteTool: AiToolDef = {
    name: "get_bond_quote",
    description: "Recupera il prezzo corrente di un'obbligazione italiana dal mercato MOT di Borsa Italiana dato l'ISIN (formato IT00...).",
    parameters: {
        type: "object",
        properties: {
            isin: { type: "string", description: "Codice ISIN (es. IT0005672024)" },
        },
        required: ["isin"],
    },
    async handler(args) {
        const isin = str(args.isin).trim().toUpperCase();
        if (!isin) return { error: "ISIN mancante" };
        return getJson(`/api/bond/quote?isin=${encodeURIComponent(isin)}`);
    },
};

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
        const json = await getJson<{ data?: unknown[]; scrapedAt?: string }>(
            `/api/mutui-market?tipoTasso=${tipoTasso}&durata=${durata}`,
        );
        if ("error" in json) return json;
        const offers = Array.isArray(json.data) ? json.data.slice(0, 8) : json;
        return { offers, scrapedAt: json.scrapedAt };
    },
};

// ========== DATI UTENTE (fetch API autenticate) ==========

const netWorthDeltaTool: AiToolDef = {
    name: "get_net_worth_delta",
    description:
        "Calcola la variazione del patrimonio netto dell'utente tra due date (formato YYYY-MM-DD). Usa lo snapshot piu' vicino a ciascuna data e ritorna delta assoluto e percentuale.",
    parameters: {
        type: "object",
        properties: {
            from: { type: "string", description: "Data inizio YYYY-MM-DD" },
            to: { type: "string", description: "Data fine YYYY-MM-DD (omessa = oggi)" },
        },
        required: ["from"],
    },
    async handler(args) {
        const fromStr = str(args.from);
        const toStr = str(args.to) || new Date().toISOString().slice(0, 10);
        const json = await getJson<{ history?: RawSnapshot[] }>("/api/patrimonio");
        if ("error" in json) return json;
        const records = json.history ?? [];
        if (!records.length) return { error: "Nessuno snapshot disponibile" };

        const closest = (target: string) => {
            const t = new Date(target).getTime();
            let best: RawSnapshot | null = null;
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
        const fNw = computeNetWorth(f);
        const tNw = computeNetWorth(t);
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

interface RawSnapshot {
    date: string;
    totalNetWorth?: number;
    realEstateValue?: number;
    liquidStockValue?: number;
    stocksSnapshotValue?: number;
    safeHavens?: number;
    emergencyFund?: number;
    pensionFund?: number;
    bitcoinAmount?: number;
    bitcoinPrice?: number;
    debtsTotal?: number;
}

function computeNetWorth(r: RawSnapshot): number {
    if (typeof r.totalNetWorth === "number") return r.totalNetWorth;
    return (r.realEstateValue || 0) + (r.liquidStockValue || 0) + (r.stocksSnapshotValue || 0)
        + (r.safeHavens || 0) + (r.emergencyFund || 0) + (r.pensionFund || 0)
        + (r.bitcoinAmount || 0) * (r.bitcoinPrice || 0) - (r.debtsTotal || 0);
}

const latestSnapshotTool: AiToolDef = {
    name: "get_latest_net_worth_snapshot",
    description:
        "Restituisce l'ultimo snapshot patrimoniale dell'utente con tutte le componenti (immobili, azioni/ETF, safe haven, fondo emergenza, fondo pensione, BTC, debiti) + patrimonio netto calcolato.",
    parameters: { type: "object", properties: {} },
    async handler() {
        const json = await getJson<{ history?: RawSnapshot[] }>("/api/patrimonio");
        if ("error" in json) return json;
        const records = json.history ?? [];
        if (!records.length) return { error: "Nessuno snapshot disponibile" };
        const latest = records[records.length - 1];
        return {
            date: latest.date,
            netWorth: Math.round(computeNetWorth(latest)),
            components: {
                realEstate: latest.realEstateValue || 0,
                liquidStocks: latest.liquidStockValue || 0,
                stocksSnapshot: latest.stocksSnapshotValue || 0,
                safeHavens: latest.safeHavens || 0,
                emergencyFund: latest.emergencyFund || 0,
                pensionFund: latest.pensionFund || 0,
                bitcoinValue: Math.round((latest.bitcoinAmount || 0) * (latest.bitcoinPrice || 0)),
                debts: latest.debtsTotal || 0,
            },
        };
    },
};

const netWorthHistoryTool: AiToolDef = {
    name: "get_net_worth_history",
    description:
        "Ritorna la serie storica del patrimonio netto. Supporta filtro periodo (3m/1y/5y/all) e granularita' (monthly/all). Ritorna sempre max 120 punti per non saturare il contesto.",
    parameters: {
        type: "object",
        properties: {
            period: { type: "string", enum: ["3m", "6m", "1y", "3y", "5y", "all"], description: "Default 1y" },
            granularity: { type: "string", enum: ["monthly", "all"], description: "monthly = 1 punto/mese (default), all = tutti" },
        },
    },
    async handler(args) {
        const period = str(args.period, "1y");
        const granularity = str(args.granularity, "monthly");
        const json = await getJson<{ history?: RawSnapshot[] }>("/api/patrimonio");
        if ("error" in json) return json;
        let records = json.history ?? [];

        // Filter by period
        const now = Date.now();
        const periodDays: Record<string, number> = { "3m": 90, "6m": 180, "1y": 365, "3y": 365 * 3, "5y": 365 * 5 };
        if (period !== "all" && periodDays[period]) {
            const cutoff = now - periodDays[period] * 24 * 3600 * 1000;
            records = records.filter((r) => new Date(r.date).getTime() >= cutoff);
        }

        // Monthly dedup (latest per month)
        if (granularity === "monthly") {
            const byMonth = new Map<string, RawSnapshot>();
            for (const r of records) byMonth.set(r.date.slice(0, 7), r);
            records = [...byMonth.values()].sort((a, b) => a.date.localeCompare(b.date));
        }

        // Cap 120
        if (records.length > 120) {
            const step = Math.ceil(records.length / 120);
            records = records.filter((_, i) => i % step === 0);
        }

        return {
            period,
            count: records.length,
            series: records.map((r) => ({ date: r.date, netWorth: Math.round(computeNetWorth(r)) })),
        };
    },
};

const assetAllocationTool: AiToolDef = {
    name: "get_asset_allocation",
    description:
        "Ritorna l'allocazione percentuale del patrimonio lordo tra asset class (immobili/azioni-ETF/safe haven/liquidita/pensione/BTC) al giorno piu' recente.",
    parameters: { type: "object", properties: {} },
    async handler() {
        const json = await getJson<{ history?: RawSnapshot[] }>("/api/patrimonio");
        if ("error" in json) return json;
        const records = json.history ?? [];
        if (!records.length) return { error: "Nessuno snapshot disponibile" };
        const latest = records[records.length - 1];
        const btc = (latest.bitcoinAmount || 0) * (latest.bitcoinPrice || 0);
        const stocks = (latest.liquidStockValue || 0) + (latest.stocksSnapshotValue || 0);
        const components: Record<string, number> = {
            immobili: latest.realEstateValue || 0,
            azioni_etf: stocks,
            safe_haven: latest.safeHavens || 0,
            fondo_emergenza: latest.emergencyFund || 0,
            fondo_pensione: latest.pensionFund || 0,
            bitcoin: btc,
        };
        const total = Object.values(components).reduce((s, v) => s + v, 0);
        const allocation = Object.fromEntries(
            Object.entries(components).map(([k, v]) => [k, {
                eur: Math.round(v),
                pct: total > 0 ? Math.round((v / total) * 1000) / 10 : 0,
            }]),
        );
        return { asOfDate: latest.date, totalGross: Math.round(total), debts: latest.debtsTotal || 0, allocation };
    },
};

const performanceMetricsTool: AiToolDef = {
    name: "get_portfolio_performance",
    description:
        "Metriche di performance del portafoglio: ROI, CAGR, TWR (Time-Weighted Return annualizzato), MWR/IRR, volatilita' annualizzata, Sharpe ratio, Max Drawdown storico e Drawdown attuale. Richiede almeno 3 snapshot mensili.",
    parameters: {
        type: "object",
        properties: {
            period: { type: "string", enum: ["ytd", "1y", "3y", "5y", "all"], description: "Default 1y" },
        },
    },
    async handler(args) {
        const period = str(args.period, "1y");
        return getJson(`/api/performance?period=${encodeURIComponent(period)}`);
    },
};

const dividendsOverviewTool: AiToolDef = {
    name: "get_dividends_overview",
    description:
        "Sommario dividendi ricevuti: totali lordo/netto, numero stacchi, breakdown per mese/anno/asset/tipo, dividendi in arrivo (future payment dates), + Yield on Cost e Current Yield del portafoglio.",
    parameters: { type: "object", properties: {} },
    async handler() {
        return getJson("/api/dividends/stats");
    },
};

const savingsGoalsTool: AiToolDef = {
    name: "get_savings_goals",
    description:
        "Lista degli obiettivi di risparmio attivi dell'utente: nome, categoria, target, progresso attuale, eventuale deadline.",
    parameters: { type: "object", properties: {} },
    async handler() {
        return getJson("/api/goals");
    },
};

const budgetSummaryTool: AiToolDef = {
    name: "get_budget_summary",
    description:
        "Ritorna il bilancio mensile utente: transazioni aggregate per categoria, saving rate, confronto con budget impostati per mese. Parametro 'month' in YYYY-MM (default mese corrente).",
    parameters: {
        type: "object",
        properties: {
            month: { type: "string", description: "Mese YYYY-MM (default: corrente)" },
        },
    },
    async handler(args) {
        const month = str(args.month) || new Date().toISOString().slice(0, 7);
        const [txRes, catRes] = await Promise.all([
            getJson<{ transactions?: Array<{ date: string; amount: number; category: string; description: string }> }>(`/api/budget/transactions?month=${month}`),
            getJson<{ categories?: Array<{ id: string; name: string; limit: number }> }>("/api/budget/categories"),
        ]);
        if ("error" in txRes) return txRes;
        if ("error" in catRes) return catRes;
        const txs = txRes.transactions ?? [];
        const cats = catRes.categories ?? [];

        let income = 0, expenses = 0;
        const byCategory = new Map<string, { income: number; expenses: number; count: number }>();
        for (const t of txs) {
            if (t.amount > 0) income += t.amount; else expenses += -t.amount;
            const c = byCategory.get(t.category) ?? { income: 0, expenses: 0, count: 0 };
            if (t.amount > 0) c.income += t.amount; else c.expenses += -t.amount;
            c.count += 1;
            byCategory.set(t.category, c);
        }
        const net = income - expenses;
        const savingRate = income > 0 ? (net / income) * 100 : 0;
        return {
            month,
            transactionCount: txs.length,
            income: Math.round(income),
            expenses: Math.round(expenses),
            netCashflow: Math.round(net),
            savingRatePct: Math.round(savingRate * 10) / 10,
            byCategory: [...byCategory.entries()].map(([cat, v]) => {
                const catDef = cats.find((c) => c.id === cat || c.name === cat);
                return {
                    category: cat,
                    income: Math.round(v.income),
                    expenses: Math.round(v.expenses),
                    count: v.count,
                    budgetLimit: catDef?.limit ?? null,
                    overBudget: catDef?.limit ? v.expenses > catDef.limit : false,
                };
            }).sort((a, b) => b.expenses - a.expenses),
        };
    },
};

const preferencesTool: AiToolDef = {
    name: "get_user_preferences",
    description:
        "Ritorna tutte le preferenze/impostazioni dell'utente: parametri mutuo (tasso/durata/prezzo casa), profilo FIRE (eta', pensione, SWR, rendimento), spese, redditi. Utile per spiegare/sfidare le assunzioni usate nei simulatori.",
    parameters: { type: "object", properties: {} },
    async handler() {
        const json = await getJson<{ preferences?: Record<string, unknown> }>("/api/preferences");
        if ("error" in json) return json;
        const pref = json.preferences;
        if (!pref) return { error: "Preferenze non impostate" };
        // Filter out long JSON lists for brevity
        const filtered: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(pref)) {
            if (typeof v === "string" && v.startsWith("[") && v.length > 200) continue;
            if (typeof v === "string" && v.startsWith("{") && v.length > 200) continue;
            if (k.startsWith("aiApiKey") || k === "aiApiKeyEnc") continue;
            filtered[k] = v;
        }
        return { preferences: filtered };
    },
};

const recallMemoryTool: AiToolDef = {
    name: "recall_memory",
    description:
        "Recupera fatti memorizzati nel profilo persistente dell'utente, filtrati per categoria. Usa questo quando l'utente chiede di ricordare qualcosa o quando serve contesto storico oltre alla conversazione corrente.",
    parameters: {
        type: "object",
        properties: {
            category: {
                type: "string",
                enum: ["profilo", "obiettivo", "decisione", "preferenza", "contesto", "all"],
                description: "Filtro categoria (default 'all')",
            },
            limit: { type: "integer", description: "Max risultati (default 20)" },
        },
    },
    async handler(args) {
        const category = str(args.category, "all");
        const limit = Math.max(1, Math.min(50, Math.floor(num(args.limit, 20))));
        const q = category === "all" ? "" : `?category=${category}`;
        const json = await getJson<{ memory?: Array<{ fact: string; category: string; pinned: boolean; updatedAt: string }> }>(`/api/ai/memory${q}`);
        if ("error" in json) return json;
        const memory = json.memory ?? [];
        return { count: memory.length, memory: memory.slice(0, limit) };
    },
};

const realEstateProfitabilityTool: AiToolDef = {
    name: "compute_real_estate_profitability",
    description:
        "Confronta l'acquisto di un immobile (messo a reddito) con l'investimento in borsa dello stesso capitale, per un dato orizzonte. Calcola rendimento netto affitto, apprezzamento immobile, valore investimento alternativo e stampa il differenziale.",
    parameters: {
        type: "object",
        properties: {
            propertyPrice: { type: "number" },
            downpayment: { type: "number", description: "Anticipo EUR" },
            annualRatePct: { type: "number", description: "Tasso mutuo %" },
            years: { type: "integer", description: "Anni analisi (= durata mutuo tipica)" },
            monthlyRent: { type: "number", description: "Affitto mensile lordo EUR" },
            annualCosts: { type: "number", description: "Costi annuali (tasse, manutenzione) EUR" },
            marketReturnPct: { type: "number", description: "Rendimento annuo borsa % (default 7)" },
            vacancyPct: { type: "number", description: "% vacancy affitto (default 5)" },
            appreciationPct: { type: "number", description: "Apprezzamento annuo immobile % (default 1)" },
        },
        required: ["propertyPrice", "downpayment", "annualRatePct", "years", "monthlyRent"],
    },
    async handler(args) {
        const price = num(args.propertyPrice);
        const down = num(args.downpayment);
        const rate = num(args.annualRatePct);
        const years = Math.max(1, Math.floor(num(args.years, 30)));
        const rent = num(args.monthlyRent);
        const costs = num(args.annualCosts);
        const marketRet = num(args.marketReturnPct, 7) / 100;
        const vacancy = num(args.vacancyPct, 5) / 100;
        const appr = num(args.appreciationPct, 1) / 100;

        const loan = Math.max(0, price - down);
        const i = rate / 100 / 12;
        const n = years * 12;
        const monthlyPayment = i > 0 ? (loan * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1) : loan / n;
        const totalPaidMortgage = monthlyPayment * n;
        const totalInterest = totalPaidMortgage - loan;

        const netAnnualRent = rent * 12 * (1 - vacancy) - costs;
        const totalNetRent = netAnnualRent * years;
        const futurePropertyValue = price * Math.pow(1 + appr, years);

        const finalPropertyEquity = futurePropertyValue + totalNetRent - totalPaidMortgage;
        const netProfitRealEstate = finalPropertyEquity - down;

        // Alternative: invest down + mortgage payment at marketRet
        let altCap = down;
        const mr = Math.pow(1 + marketRet, 1 / 12) - 1;
        for (let m = 1; m <= n; m++) altCap = altCap * (1 + mr) + monthlyPayment;
        const netProfitStocks = altCap - down;

        return {
            mortgage: {
                monthlyPayment: Math.round(monthlyPayment),
                totalInterest: Math.round(totalInterest),
                totalPaid: Math.round(totalPaidMortgage),
            },
            realEstate: {
                netAnnualRent: Math.round(netAnnualRent),
                totalNetRent: Math.round(totalNetRent),
                futurePropertyValue: Math.round(futurePropertyValue),
                finalEquity: Math.round(finalPropertyEquity),
                netProfit: Math.round(netProfitRealEstate),
            },
            stocksAlternative: {
                finalCapital: Math.round(altCap),
                netProfit: Math.round(netProfitStocks),
            },
            differential: Math.round(netProfitRealEstate - netProfitStocks),
            verdict: netProfitRealEstate > netProfitStocks ? "immobile_meglio" : "borsa_meglio",
            deltaPct: netProfitStocks !== 0 ? Math.round(((netProfitRealEstate - netProfitStocks) / Math.abs(netProfitStocks)) * 1000) / 10 : null,
        };
    },
};

const customStocksTool: AiToolDef = {
    name: "get_custom_stocks_portfolio",
    description:
        "Ritorna il portafoglio titoli dell'utente: lista azioni/ETF/bond con ticker, ISIN, quote detenute, prezzo medio di carico, prezzo corrente, valore totale, plusvalenza/minusvalenza latente.",
    parameters: { type: "object", properties: {} },
    async handler() {
        const json = await getJson<{ preferences?: { customStocksList?: string } }>("/api/preferences");
        if ("error" in json) return json;
        const raw = json.preferences?.customStocksList;
        if (!raw) return { error: "Nessun titolo salvato" };
        try {
            const list = JSON.parse(raw) as Array<{
                ticker?: string; isin?: string; name?: string; shares?: number;
                avgCost?: number; currentPrice?: number; currency?: string;
            }>;
            return {
                count: list.length,
                positions: list.map((s) => {
                    const value = (s.shares || 0) * (s.currentPrice || 0);
                    const cost = (s.shares || 0) * (s.avgCost || 0);
                    return {
                        ticker: s.ticker || s.isin,
                        name: s.name,
                        shares: s.shares,
                        avgCost: s.avgCost,
                        currentPrice: s.currentPrice,
                        currency: s.currency,
                        marketValue: Math.round(value),
                        unrealizedPnl: Math.round(value - cost),
                        unrealizedPnlPct: cost > 0 ? Math.round(((value - cost) / cost) * 1000) / 10 : null,
                    };
                }),
            };
        } catch {
            return { error: "Formato customStocksList non valido" };
        }
    },
};

// ========== REGISTRY ==========

export const AI_TOOLS: AiToolDef[] = [
    // Dati utente (richiedono auth)
    latestSnapshotTool,
    netWorthHistoryTool,
    netWorthDeltaTool,
    assetAllocationTool,
    performanceMetricsTool,
    dividendsOverviewTool,
    customStocksTool,
    savingsGoalsTool,
    budgetSummaryTool,
    preferencesTool,
    recallMemoryTool,

    // Calcoli finanziari
    mortgageAmortizationTool,
    netSalaryTool,
    fireMonteCarloTool,
    coastFireTool,
    sensitivityMatrixTool,
    saleTaxTool,
    savingsPlanTool,
    realEstateProfitabilityTool,

    // Dati live esterni
    stockPriceTool,
    btcPriceTool,
    bondQuoteTool,
    mortgageMarketTool,
];

export function getTool(name: string): AiToolDef | undefined {
    return AI_TOOLS.find((t) => t.name === name);
}

// Silence unused helper warning (bool() kept for future validators)
void bool;
