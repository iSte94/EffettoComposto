import prisma from "@/lib/prisma";
import type { AiToolDef } from "@/lib/ai/tool-types";
import { calculateNetSalary } from "@/lib/finance/irpef";
import { computeCoastFireScenarios } from "@/lib/finance/coast-fire";
import { computeFireSensitivity } from "@/lib/finance/fire-sensitivity";
import { computeSaleTax } from "@/lib/finance/sale-tax";
import { projectFire } from "@/lib/finance/fire-projection";
import {
    calculateMonthlyReturns,
    calculatePerformance,
    calculateUnderwaterSeries,
    type MonthlyCashFlow,
    type NetWorthSnapshot,
} from "@/lib/finance/performance-metrics";
import { computeDividendOverview, computeYocMetrics, type AssetPositionLite, type DividendRecordLite } from "@/lib/finance/dividend-stats";
import { fetchBtcPriceEur, fetchStockPrice } from "@/lib/stock-pricing";
import { isValidIsin, scrapeBondPriceByIsin } from "@/lib/borsa-italiana/bond-scraper";
import { getCachedOffers, isCacheValid, scrapeAllCombinations } from "@/lib/mutui-market/scraper";
import { buildPendingActionResult } from "@/lib/ai/pending-actions";
import { sanitizePreferenceForClient } from "@/lib/user-data";
import type { AssistantChannel, AssetRecord, CustomStock } from "@/types";

interface AiToolContext {
    userId: string;
    channel: AssistantChannel;
    canWrite: boolean;
}

type Period = "ytd" | "1y" | "3y" | "5y" | "all";

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
    let u = 0;
    let w = 0;
    while (u === 0) u = Math.random();
    while (w === 0) w = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * w);
}

function toIsoDate(date: Date | string): string {
    return (date instanceof Date ? date : new Date(date)).toISOString().slice(0, 10);
}

function snapshotNetWorth(r: AssetRecord): number {
    const crypto = (r.bitcoinAmount || 0) * (r.bitcoinPrice || 0);
    return (r.liquidStockValue || 0)
        + (r.stocksSnapshotValue || 0)
        + (r.safeHavens || 0)
        + (r.emergencyFund || 0)
        + (r.pensionFund || 0)
        + crypto
        - (r.debtsTotal || 0);
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

async function getPreferences(userId: string) {
    return prisma.preference.findUnique({ where: { userId } });
}

async function getAssetHistory(userId: string) {
    return prisma.assetRecord.findMany({ where: { userId }, orderBy: { date: "asc" } });
}

async function getLatestSnapshot(userId: string) {
    return prisma.assetRecord.findFirst({ where: { userId }, orderBy: { date: "desc" } });
}

async function getMonthlyCashflows(userId: string): Promise<MonthlyCashFlow[]> {
    const txs = await prisma.budgetTransaction.findMany({ where: { userId } });
    const map = new Map<string, number>();
    for (const t of txs) {
        const ym = t.date.slice(0, 7);
        map.set(ym, (map.get(ym) ?? 0) + t.amount);
    }
    return [...map.entries()].map(([ym, netCashFlow]) => ({ ym, netCashFlow }));
}

function filterByPeriod(snapshots: NetWorthSnapshot[], period: Period, today: Date): NetWorthSnapshot[] {
    if (period === "all" || snapshots.length === 0) return snapshots;
    let cutoff: Date;
    if (period === "ytd") {
        cutoff = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
        const decPrev = new Date(Date.UTC(today.getUTCFullYear() - 1, 11, 1));
        return snapshots.filter((s) => new Date(s.date) >= decPrev);
    }
    if (period === "1y") cutoff = new Date(today.getTime() - 365 * 24 * 3600 * 1000);
    else if (period === "3y") cutoff = new Date(today.getTime() - 3 * 365 * 24 * 3600 * 1000);
    else cutoff = new Date(today.getTime() - 5 * 365 * 24 * 3600 * 1000);
    return snapshots.filter((s) => new Date(s.date) >= cutoff);
}

function makeReadOnlyGuard(context: AiToolContext) {
    if (context.canWrite) return;
    throw new Error("Gli strumenti di scrittura non sono disponibili in questo contesto");
}

function buildMortgageAmortizationTool(): AiToolDef {
    return {
        name: "calculate_mortgage_amortization",
        description: "Calcola la rata mensile di un mutuo a tasso fisso, interessi totali e schema annuale.",
        parameters: {
            type: "object",
            properties: {
                principal: { type: "number" },
                annualRatePct: { type: "number" },
                years: { type: "integer" },
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
                let yi = 0;
                let yc = 0;
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
            const totalInterest = yearly.reduce((sum, row) => sum + row.interestPaid, 0);
            return {
                monthlyPayment: Math.round(monthly * 100) / 100,
                totalPaid: Math.round(monthly * n * 100) / 100,
                totalInterest,
                yearlySchedule: yearly,
            };
        },
    };
}

function buildNetSalaryTool(): AiToolDef {
    return {
        name: "calculate_net_salary",
        description: "Calcola lo stipendio netto annuale e mensile italiano da un RAL.",
        parameters: {
            type: "object",
            properties: {
                ral: { type: "number" },
                mensilita: { type: "integer", enum: [12, 13, 14] },
                contractType: {
                    type: "string",
                    enum: ["standard", "apprendistato", "pubblico", "over15"],
                },
                applyCuneoFiscale: { type: "boolean" },
            },
            required: ["ral"],
        },
        async handler(args) {
            return calculateNetSalary({
                ral: num(args.ral),
                mensilita: args.mensilita ? Number(args.mensilita) as 12 | 13 | 14 : 14,
                contractType: str(args.contractType, "standard") as "standard" | "apprendistato" | "pubblico" | "over15",
                applyCuneoFiscale: args.applyCuneoFiscale === undefined ? true : bool(args.applyCuneoFiscale),
            });
        },
    };
}

function buildFireMonteCarloTool(): AiToolDef {
    return {
        name: "run_fire_monte_carlo",
        description: "Simulazione Monte Carlo del percorso FIRE con 2000 traiettorie.",
        parameters: {
            type: "object",
            properties: {
                startingCapital: { type: "number" },
                monthlyContribution: { type: "number" },
                annualReturnRealPct: { type: "number" },
                volatilityPct: { type: "number" },
                years: { type: "integer" },
                fireTarget: { type: "number" },
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
                const sorted = [...arr].sort((a, b) => a - b);
                return sorted[Math.floor(sorted.length * p)];
            };

            return {
                runs,
                yearsSimulated: years,
                finalP10: Math.round(percentile(finalValues, 0.1)),
                finalP50: Math.round(percentile(finalValues, 0.5)),
                finalP90: Math.round(percentile(finalValues, 0.9)),
                successRatePct: target !== null ? Math.round((successes / runs) * 1000) / 10 : null,
                target,
                yearlyPercentiles: yearPaths.map((col, year) => ({
                    year,
                    p10: Math.round(percentile(col, 0.1)),
                    p50: Math.round(percentile(col, 0.5)),
                    p90: Math.round(percentile(col, 0.9)),
                })),
            };
        },
    };
}

function buildCoastFireTool(): AiToolDef {
    return {
        name: "compute_coast_fire_scenarios",
        description: "Calcola tre scenari (Bear/Base/Bull) di Coast FIRE.",
        parameters: {
            type: "object",
            properties: {
                currentAge: { type: "integer" },
                retirementAge: { type: "integer" },
                publicPensionAge: { type: "integer" },
                startingCapital: { type: "number" },
                expectedMonthlyExpenses: { type: "number" },
                expectedPublicPension: { type: "number" },
                expectedPassiveIncomeMonthly: { type: "number" },
                fireWithdrawalRate: { type: "number" },
                fireExpectedReturn: { type: "number" },
                expectedInflation: { type: "number" },
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
}

function buildSensitivityMatrixTool(): AiToolDef {
    return {
        name: "compute_fire_sensitivity_matrix",
        description: "Costruisce una griglia che mostra quanti anni servono per raggiungere FIRE variando spese e risparmio.",
        parameters: {
            type: "object",
            properties: {
                startingCapital: { type: "number" },
                currentAge: { type: "integer" },
                retirementAge: { type: "integer" },
                monthlySavingsBaseline: { type: "number" },
                monthlyExpensesBaseline: { type: "number" },
                withdrawalRatePct: { type: "number" },
                nominalReturnPct: { type: "number" },
                inflationPct: { type: "number" },
                maxYears: { type: "integer" },
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
}

function buildSaleTaxTool(): AiToolDef {
    return {
        name: "compute_sale_tax",
        description: "Calcola l'imposta sulla plusvalenza al netto italiano su una vendita.",
        parameters: {
            type: "object",
            properties: {
                assetType: { type: "string", enum: ["equity", "bond"] },
                shares: { type: "number" },
                sellPrice: { type: "number" },
                costBasis: { type: "number" },
                priorLosses: { type: "number" },
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
}

function buildSavingsPlanTool(): AiToolDef {
    return {
        name: "compute_savings_plan",
        description: "Calcola il contributo mensile necessario per raggiungere un obiettivo, o viceversa il tempo necessario.",
        parameters: {
            type: "object",
            properties: {
                startingCapital: { type: "number" },
                targetAmount: { type: "number" },
                annualReturnPct: { type: "number" },
                years: { type: "integer" },
                monthlyContribution: { type: "number" },
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
}

function buildRealEstateProfitabilityTool(): AiToolDef {
    return {
        name: "compute_real_estate_profitability",
        description: "Confronta l'acquisto di un immobile a reddito con l'investimento in borsa dello stesso capitale.",
        parameters: {
            type: "object",
            properties: {
                propertyPrice: { type: "number" },
                downpayment: { type: "number" },
                annualRatePct: { type: "number" },
                years: { type: "integer" },
                monthlyRent: { type: "number" },
                annualCosts: { type: "number" },
                marketReturnPct: { type: "number" },
                vacancyPct: { type: "number" },
                appreciationPct: { type: "number" },
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
}

function buildStockPriceTool(): AiToolDef {
    return {
        name: "get_stock_price",
        description: "Recupera il prezzo live in EUR di un'azione o ETF.",
        parameters: {
            type: "object",
            properties: {
                ticker: { type: "string" },
            },
            required: ["ticker"],
        },
        async handler(args) {
            const ticker = str(args.ticker).trim();
            if (!ticker) return { error: "Ticker mancante" };
            const quote = await fetchStockPrice(ticker);
            if (!quote) return { error: "Prezzo non disponibile" };
            return quote;
        },
    };
}

function buildBitcoinPriceTool(): AiToolDef {
    return {
        name: "get_bitcoin_price",
        description: "Recupera il prezzo live del Bitcoin in EUR.",
        parameters: { type: "object", properties: {} },
        async handler() {
            const price = await fetchBtcPriceEur();
            return price > 0 ? { price } : { error: "Prezzo BTC non disponibile" };
        },
    };
}

function buildBondQuoteTool(): AiToolDef {
    return {
        name: "get_bond_quote",
        description: "Recupera il prezzo corrente di un'obbligazione italiana dato l'ISIN.",
        parameters: {
            type: "object",
            properties: {
                isin: { type: "string" },
            },
            required: ["isin"],
        },
        async handler(args) {
            const isin = str(args.isin).trim().toUpperCase();
            if (!isin) return { error: "ISIN mancante" };
            if (!isValidIsin(isin)) return { error: "ISIN non valido" };
            return scrapeBondPriceByIsin(isin);
        },
    };
}

function buildMortgageMarketTool(): AiToolDef {
    return {
        name: "get_mortgage_market_offers",
        description: "Recupera le offerte di mutuo aggiornate da MutuiSupermarket.",
        parameters: {
            type: "object",
            properties: {
                tipoTasso: { type: "string", enum: ["F", "V"] },
                durata: { type: "integer", enum: [15, 20, 30] },
            },
            required: ["tipoTasso", "durata"],
        },
        async handler(args) {
            const tipoTasso = str(args.tipoTasso, "F") as "F" | "V";
            const durata = Math.floor(num(args.durata, 30));
            if (!await isCacheValid()) {
                void scrapeAllCombinations().catch(() => undefined);
            }
            let result = await getCachedOffers(tipoTasso, durata);
            if (!result) {
                await scrapeAllCombinations();
                result = await getCachedOffers(tipoTasso, durata);
            }
            if (!result) return { error: "Impossibile recuperare le offerte" };
            return {
                offers: result.offerte.slice(0, 8),
                scrapedAt: result.scrapedAt,
            };
        },
    };
}

function buildLatestSnapshotTool(context: AiToolContext): AiToolDef {
    return {
        name: "get_latest_net_worth_snapshot",
        description: "Restituisce l'ultimo snapshot patrimoniale dell'utente con tutte le componenti.",
        parameters: { type: "object", properties: {} },
        async handler() {
            const latest = await getLatestSnapshot(context.userId);
            if (!latest) return { error: "Nessuno snapshot disponibile" };
            return {
                date: toIsoDate(latest.date),
                netWorth: Math.round(snapshotNetWorth(latest as unknown as AssetRecord)),
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
}

function buildNetWorthHistoryTool(context: AiToolContext): AiToolDef {
    return {
        name: "get_net_worth_history",
        description: "Ritorna la serie storica del patrimonio netto dell'utente.",
        parameters: {
            type: "object",
            properties: {
                period: { type: "string", enum: ["3m", "6m", "1y", "3y", "5y", "all"] },
                granularity: { type: "string", enum: ["monthly", "all"] },
            },
        },
        async handler(args) {
            let records = await getAssetHistory(context.userId);
            const period = str(args.period, "1y");
            const granularity = str(args.granularity, "monthly");
            const now = Date.now();
            const periodDays: Record<string, number> = { "3m": 90, "6m": 180, "1y": 365, "3y": 365 * 3, "5y": 365 * 5 };
            if (period !== "all" && periodDays[period]) {
                const cutoff = now - periodDays[period] * 24 * 3600 * 1000;
                records = records.filter((r) => new Date(r.date).getTime() >= cutoff);
            }
            if (granularity === "monthly") {
                const byMonth = new Map<string, typeof records[number]>();
                for (const record of records) {
                    byMonth.set(toIsoDate(record.date).slice(0, 7), record);
                }
                records = [...byMonth.values()].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            }
            if (records.length > 120) {
                const step = Math.ceil(records.length / 120);
                records = records.filter((_, index) => index % step === 0);
            }
            return {
                period,
                count: records.length,
                series: records.map((r) => ({
                    date: toIsoDate(r.date),
                    netWorth: Math.round(snapshotNetWorth(r as unknown as AssetRecord)),
                })),
            };
        },
    };
}

function buildNetWorthDeltaTool(context: AiToolContext): AiToolDef {
    return {
        name: "get_net_worth_delta",
        description: "Calcola la variazione del patrimonio netto dell'utente tra due date.",
        parameters: {
            type: "object",
            properties: {
                from: { type: "string" },
                to: { type: "string" },
            },
            required: ["from", "to"],
        },
        async handler(args) {
            const records = (await getAssetHistory(context.userId)).map((record) => ({
                date: toIsoDate(record.date),
                netWorth: snapshotNetWorth(record as unknown as AssetRecord),
            }));
            if (records.length === 0) return { error: "Nessuno snapshot disponibile" };
            const fromStr = str(args.from);
            const toStr = str(args.to);
            const closest = (target: string) => {
                const t = new Date(target).getTime();
                let best: typeof records[number] | null = null;
                let bestDiff = Infinity;
                for (const record of records) {
                    const diff = Math.abs(new Date(record.date).getTime() - t);
                    if (diff < bestDiff) {
                        best = record;
                        bestDiff = diff;
                    }
                }
                return best;
            };
            const from = closest(fromStr);
            const to = closest(toStr);
            if (!from || !to) return { error: "Snapshot non trovati" };
            const delta = to.netWorth - from.netWorth;
            const pct = from.netWorth !== 0 ? (delta / Math.abs(from.netWorth)) * 100 : null;
            return {
                from: { requested: fromStr, actualDate: from.date, netWorth: Math.round(from.netWorth) },
                to: { requested: toStr, actualDate: to.date, netWorth: Math.round(to.netWorth) },
                deltaAbs: Math.round(delta),
                deltaPct: pct !== null ? Math.round(pct * 100) / 100 : null,
            };
        },
    };
}

function buildAssetAllocationTool(context: AiToolContext): AiToolDef {
    return {
        name: "get_asset_allocation",
        description: "Ritorna l'allocazione percentuale del patrimonio lordo tra asset class al giorno più recente.",
        parameters: { type: "object", properties: {} },
        async handler() {
            const latest = await getLatestSnapshot(context.userId);
            if (!latest) return { error: "Nessuno snapshot disponibile" };
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
            const total = Object.values(components).reduce((sum, value) => sum + value, 0);
            return {
                asOfDate: toIsoDate(latest.date),
                totalGross: Math.round(total),
                debts: latest.debtsTotal || 0,
                allocation: Object.fromEntries(
                    Object.entries(components).map(([key, value]) => [
                        key,
                        {
                            eur: Math.round(value),
                            pct: total > 0 ? Math.round((value / total) * 1000) / 10 : 0,
                        },
                    ]),
                ),
            };
        },
    };
}

function buildPerformanceMetricsTool(context: AiToolContext): AiToolDef {
    return {
        name: "get_portfolio_performance",
        description: "Metriche di performance del portafoglio: ROI, CAGR, TWR, MWR, volatilità, Sharpe e Max Drawdown.",
        parameters: {
            type: "object",
            properties: {
                period: { type: "string", enum: ["ytd", "1y", "3y", "5y", "all"] },
            },
        },
        async handler(args) {
            const period = str(args.period, "1y") as Period;
            const [records, cashflows] = await Promise.all([
                getAssetHistory(context.userId),
                getMonthlyCashflows(context.userId),
            ]);
            const byMonth = new Map<string, NetWorthSnapshot>();
            for (const record of records) {
                const iso = toIsoDate(record.date);
                const ym = iso.slice(0, 7);
                byMonth.set(ym, {
                    date: iso,
                    netWorth: snapshotNetWorth(record as unknown as AssetRecord),
                });
            }
            const filtered = filterByPeriod(
                [...byMonth.values()].sort((a, b) => a.date.localeCompare(b.date)),
                period,
                new Date(),
            );
            const metrics = calculatePerformance(filtered, cashflows, { riskFreeRate: 2.5 });
            return {
                period,
                metrics,
                monthlyReturns: calculateMonthlyReturns(filtered, cashflows),
                underwaterSeries: calculateUnderwaterSeries(filtered, cashflows),
                snapshotCount: filtered.length,
                hasEnoughData: filtered.length >= 3,
            };
        },
    };
}

function buildDividendsOverviewTool(context: AiToolContext): AiToolDef {
    return {
        name: "get_dividends_overview",
        description: "Sommario dividendi ricevuti e metriche YoC del portafoglio.",
        parameters: { type: "object", properties: {} },
        async handler() {
            const [dividends, preference, latestAssetRecord] = await Promise.all([
                prisma.dividendRecord.findMany({ where: { userId: context.userId }, orderBy: { paymentDate: "desc" } }),
                getPreferences(context.userId),
                getLatestSnapshot(context.userId),
            ]);

            let stocks: CustomStock[] = [];
            try {
                const fromPref = preference?.customStocksList ? JSON.parse(preference.customStocksList) as CustomStock[] : null;
                const fromSnap = latestAssetRecord?.customStocksList ? JSON.parse(latestAssetRecord.customStocksList) as CustomStock[] : null;
                stocks = fromPref && fromPref.length > 0 ? fromPref : (fromSnap ?? []);
            } catch {
                stocks = [];
            }

            const positions: AssetPositionLite[] = stocks
                .filter((stock) => stock.shares > 0 && (stock.currentPrice ?? 0) > 0)
                .map((stock) => ({
                    ticker: stock.ticker,
                    shares: stock.shares,
                    currentPrice: stock.currentPrice || 0,
                    averageCost: undefined,
                }));

            const divLite: DividendRecordLite[] = dividends.map((dividend) => ({
                assetTicker: dividend.assetTicker,
                assetIsin: dividend.assetIsin,
                exDate: dividend.exDate,
                paymentDate: dividend.paymentDate,
                dividendPerShare: dividend.dividendPerShare,
                quantity: dividend.quantity,
                grossAmount: dividend.grossAmount,
                grossAmountEur: dividend.grossAmountEur,
                netAmount: dividend.netAmount,
                netAmountEur: dividend.netAmountEur,
                currency: dividend.currency,
                dividendType: dividend.dividendType,
                costPerShare: dividend.costPerShare,
            }));

            return {
                overview: computeDividendOverview(divLite),
                yoc: computeYocMetrics(divLite, positions),
            };
        },
    };
}

function buildCustomStocksTool(context: AiToolContext): AiToolDef {
    return {
        name: "get_custom_stocks_portfolio",
        description: "Ritorna il portafoglio titoli dell'utente con valore e plus/minus latente.",
        parameters: { type: "object", properties: {} },
        async handler() {
            const preference = await getPreferences(context.userId);
            const list = parseJson<CustomStock[]>(preference?.customStocksList, []);
            if (list.length === 0) return { error: "Nessun titolo salvato" };
            return {
                count: list.length,
                positions: list.map((stock) => {
                    const value = (stock.shares || 0) * (stock.currentPrice || 0);
                    const cost = (stock.shares || 0) * ((stock as CustomStock & { avgCost?: number }).avgCost || 0);
                    return {
                        id: stock.id,
                        ticker: stock.ticker,
                        name: (stock as CustomStock & { name?: string }).name,
                        shares: stock.shares,
                        avgCost: (stock as CustomStock & { avgCost?: number }).avgCost,
                        currentPrice: stock.currentPrice,
                        marketValue: Math.round(value),
                        unrealizedPnl: Math.round(value - cost),
                        unrealizedPnlPct: cost > 0 ? Math.round(((value - cost) / cost) * 1000) / 10 : null,
                    };
                }),
            };
        },
    };
}

function buildSavingsGoalsTool(context: AiToolContext): AiToolDef {
    return {
        name: "get_savings_goals",
        description: "Lista degli obiettivi di risparmio attivi dell'utente.",
        parameters: { type: "object", properties: {} },
        async handler() {
            const goals = await prisma.savingsGoal.findMany({
                where: { userId: context.userId },
                orderBy: { createdAt: "desc" },
            });
            return {
                goals: goals.map((goal) => ({
                    id: goal.id,
                    name: goal.name,
                    category: goal.category,
                    targetAmount: goal.targetAmount,
                    currentAmount: goal.currentAmount,
                    deadline: goal.deadline,
                    progressPct: goal.targetAmount > 0 ? Math.round((goal.currentAmount / goal.targetAmount) * 1000) / 10 : 0,
                })),
            };
        },
    };
}

function buildBudgetSummaryTool(context: AiToolContext): AiToolDef {
    return {
        name: "get_budget_summary",
        description: "Ritorna il bilancio mensile utente con saving rate e categorie.",
        parameters: {
            type: "object",
            properties: {
                month: { type: "string" },
            },
        },
        async handler(args) {
            const month = str(args.month) || new Date().toISOString().slice(0, 7);
            const [txs, preference] = await Promise.all([
                prisma.budgetTransaction.findMany({
                    where: {
                        userId: context.userId,
                        date: {
                            gte: `${month}-01`,
                            lt: `${month === `${month.slice(0, 4)}-12`
                                ? `${Number(month.slice(0, 4)) + 1}-01`
                                : `${month.slice(0, 4)}-${String(Number(month.slice(5, 7)) + 1).padStart(2, "0")}`}-01`,
                        },
                    },
                    orderBy: { date: "desc" },
                }),
                getPreferences(context.userId),
            ]);
            const categories = parseJson<Array<{ id: string; name: string; limit: number }>>(preference?.budgetCategoriesList, []);

            let income = 0;
            let expenses = 0;
            const byCategory = new Map<string, { income: number; expenses: number; count: number }>();
            for (const tx of txs) {
                if (tx.amount > 0) income += tx.amount;
                else expenses += -tx.amount;
                const current = byCategory.get(tx.category) ?? { income: 0, expenses: 0, count: 0 };
                if (tx.amount > 0) current.income += tx.amount;
                else current.expenses += -tx.amount;
                current.count += 1;
                byCategory.set(tx.category, current);
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
                byCategory: [...byCategory.entries()].map(([category, value]) => {
                    const categoryDef = categories.find((item) => item.id === category || item.name === category);
                    return {
                        category,
                        income: Math.round(value.income),
                        expenses: Math.round(value.expenses),
                        count: value.count,
                        budgetLimit: categoryDef?.limit ?? null,
                        overBudget: categoryDef?.limit ? value.expenses > categoryDef.limit : false,
                    };
                }).sort((a, b) => b.expenses - a.expenses),
                recentTransactions: txs.slice(0, 25).map((tx) => ({
                    id: tx.id,
                    date: tx.date,
                    description: tx.description,
                    amount: tx.amount,
                    category: tx.category,
                })),
            };
        },
    };
}

function buildPreferencesTool(context: AiToolContext): AiToolDef {
    return {
        name: "get_user_preferences",
        description: "Ritorna le preferenze dell'utente rilevanti per mutuo, FIRE, budget e profilo.",
        parameters: { type: "object", properties: {} },
        async handler() {
            const preference = await getPreferences(context.userId);
            if (!preference) return { error: "Preferenze non impostate" };
            const filtered = sanitizePreferenceForClient(preference) ?? {};
            return {
                preferences: Object.fromEntries(
                    Object.entries(filtered).filter(([, value]) => {
                        if (typeof value !== "string") return true;
                        if (!value.startsWith("[") && !value.startsWith("{")) return true;
                        return value.length <= 200;
                    }),
                ),
            };
        },
    };
}

function buildRecallMemoryTool(context: AiToolContext): AiToolDef {
    return {
        name: "recall_memory",
        description: "Recupera fatti memorizzati nel profilo persistente dell'utente.",
        parameters: {
            type: "object",
            properties: {
                category: {
                    type: "string",
                    enum: ["profilo", "obiettivo", "decisione", "preferenza", "contesto", "all"],
                },
                limit: { type: "integer" },
            },
        },
        async handler(args) {
            const category = str(args.category, "all");
            const limit = Math.max(1, Math.min(50, Math.floor(num(args.limit, 20))));
            const memory = await prisma.assistantMemory.findMany({
                where: {
                    userId: context.userId,
                    ...(category !== "all" ? { category } : {}),
                },
                orderBy: [
                    { pinned: "desc" },
                    { updatedAt: "desc" },
                ],
                take: limit,
            });
            return {
                count: memory.length,
                memory: memory.map((entry) => ({
                    id: entry.id,
                    category: entry.category,
                    fact: entry.fact,
                    pinned: entry.pinned,
                    updatedAt: entry.updatedAt.toISOString(),
                })),
            };
        },
    };
}

function buildSearchBudgetTransactionsTool(context: AiToolContext): AiToolDef {
    return {
        name: "search_budget_transactions",
        description: "Cerca transazioni budget per descrizione o mese per ottenere gli ID corretti.",
        parameters: {
            type: "object",
            properties: {
                query: { type: "string" },
                month: { type: "string" },
                limit: { type: "integer" },
            },
        },
        async handler(args) {
            const query = str(args.query).trim().toLowerCase();
            const month = str(args.month);
            const limit = Math.max(1, Math.min(50, Math.floor(num(args.limit, 10))));
            const txs = await prisma.budgetTransaction.findMany({
                where: {
                    userId: context.userId,
                    ...(month ? { date: { gte: `${month}-01`, lt: `${month}-31` } } : {}),
                    ...(query ? { description: { contains: query } } : {}),
                },
                orderBy: { date: "desc" },
                take: limit,
            });
            return {
                count: txs.length,
                transactions: txs.map((tx) => ({
                    id: tx.id,
                    date: tx.date,
                    description: tx.description,
                    amount: tx.amount,
                    category: tx.category,
                })),
            };
        },
    };
}

function buildSimulateMortgageScenarioTool(context: AiToolContext): AiToolDef {
    return {
        name: "simulate_mortgage_scenario",
        description: "Simula uno scenario mutuo con DTI, interessi, sostenibilità e confronto con le preferenze correnti.",
        parameters: {
            type: "object",
            properties: {
                propertyPrice: { type: "number" },
                downPayment: { type: "number" },
                annualRatePct: { type: "number" },
                years: { type: "integer" },
                monthlyIncome: { type: "number" },
                existingInstallments: { type: "number" },
            },
        },
        async handler(args) {
            const preference = await getPreferences(context.userId);
            const propertyPrice = num(args.propertyPrice, preference?.propertyPrice ?? 300000);
            const downPayment = num(args.downPayment, preference?.downpayment ?? 0);
            const annualRatePct = num(args.annualRatePct, preference?.rate ?? 3.5);
            const years = Math.max(1, Math.floor(num(args.years, preference?.years ?? 30)));
            const monthlyIncome = num(args.monthlyIncome, preference?.netIncome ?? 0);
            const existingInstallments = num(args.existingInstallments, preference?.existingInstallment ?? 0);
            const principal = Math.max(0, propertyPrice - downPayment);
            const monthlyRate = annualRatePct / 100 / 12;
            const totalMonths = years * 12;
            const monthlyPayment = principal === 0
                ? 0
                : monthlyRate > 0
                    ? (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1)
                    : principal / totalMonths;
            const totalPaid = monthlyPayment * totalMonths;
            const totalInterest = totalPaid - principal;
            const dtiPct = monthlyIncome > 0 ? ((existingInstallments + monthlyPayment) / monthlyIncome) * 100 : null;
            const verdict = dtiPct === null
                ? "reddito_non_disponibile"
                : dtiPct > 40 ? "alto_rischio"
                    : dtiPct > 33 ? "da_valutare"
                        : "sostenibile";

            return {
                inputs: {
                    propertyPrice,
                    downPayment,
                    principal,
                    annualRatePct,
                    years,
                    monthlyIncome,
                    existingInstallments,
                },
                results: {
                    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
                    totalInterest: Math.round(totalInterest),
                    totalPaid: Math.round(totalPaid),
                    dtiPct: dtiPct !== null ? Math.round(dtiPct * 10) / 10 : null,
                    verdict,
                },
                comparedToSavedPreferences: {
                    savedPropertyPrice: preference?.propertyPrice ?? null,
                    savedRate: preference?.rate ?? null,
                    savedYears: preference?.years ?? null,
                },
            };
        },
    };
}

function buildSimulateFireScenarioTool(context: AiToolContext): AiToolDef {
    return {
        name: "simulate_fire_scenario",
        description: "Simula un percorso FIRE partendo dai dati utente attuali con eventuali override.",
        parameters: {
            type: "object",
            properties: {
                startingCapital: { type: "number" },
                monthlySavings: { type: "number" },
                monthlyExpensesAtFire: { type: "number" },
                expectedReturnPct: { type: "number" },
                inflationPct: { type: "number" },
                withdrawalRatePct: { type: "number" },
                currentAge: { type: "integer" },
                retirementAge: { type: "integer" },
            },
        },
        async handler(args) {
            const [preference, latestSnapshot] = await Promise.all([
                getPreferences(context.userId),
                getLatestSnapshot(context.userId),
            ]);
            const currentYear = new Date().getFullYear();
            const defaultCurrentAge = preference?.birthYear ? currentYear - preference.birthYear : 30;
            const startingCapital = num(
                args.startingCapital,
                latestSnapshot ? snapshotNetWorth(latestSnapshot as unknown as AssetRecord) - (latestSnapshot.realEstateValue || 0) : 0,
            );
            const monthlySavings = num(args.monthlySavings, preference?.monthlySavings ?? 0);
            const monthlyExpensesAtFire = num(args.monthlyExpensesAtFire, preference?.expectedMonthlyExpenses ?? 0);
            const expectedReturnPct = num(args.expectedReturnPct, preference?.fireExpectedReturn ?? 6);
            const inflationPct = num(args.inflationPct, 2);
            const withdrawalRatePct = num(args.withdrawalRatePct, preference?.fireWithdrawalRate ?? 3.25);
            const currentAge = Math.floor(num(args.currentAge, defaultCurrentAge));
            const retirementAge = Math.floor(num(args.retirementAge, preference?.retirementAge ?? 60));

            const projection = projectFire({
                startingCapital,
                monthlySavings,
                monthlyExpensesAtFire,
                expectedReturnPct,
                inflationPct,
                withdrawalRatePct,
                currentAge,
                retirementAge,
                maxYears: 60,
            });

            return {
                inputs: {
                    startingCapital,
                    monthlySavings,
                    monthlyExpensesAtFire,
                    expectedReturnPct,
                    inflationPct,
                    withdrawalRatePct,
                    currentAge,
                    retirementAge,
                },
                results: {
                    fireTarget: Math.round(projection.fireTarget),
                    yearsToFire: projection.yearsToFire >= 0 ? Math.round(projection.yearsToFire * 10) / 10 : null,
                    ageAtFire: projection.ageAtFire >= 0 ? Math.round(projection.ageAtFire * 10) / 10 : null,
                    monthsToFire: projection.monthsToFire >= 0 ? projection.monthsToFire : null,
                    alreadyFire: projection.alreadyFire,
                    gapToFire: Math.round(Math.max(0, projection.fireTarget - startingCapital)),
                    chartPreview: projection.chartData.slice(0, 10).map((point) => ({
                        age: point.age,
                        capital: Math.round(point.capital),
                        target: Math.round(point.target),
                    })),
                },
            };
        },
    };
}

function buildAddBudgetTransactionTool(context: AiToolContext): AiToolDef {
    return {
        name: "add_budget_transaction",
        description: "Propone l'aggiunta di una transazione budget. Richiede conferma esplicita.",
        parameters: {
            type: "object",
            properties: {
                description: { type: "string" },
                amount: { type: "number", description: "Importo positivo" },
                category: { type: "string" },
                direction: { type: "string", enum: ["expense", "income"] },
                date: { type: "string", description: "YYYY-MM-DD. Default oggi." },
            },
            required: ["description", "amount", "category", "direction"],
        },
        async handler(args) {
            makeReadOnlyGuard(context);
            const amount = Math.abs(num(args.amount));
            const signedAmount = str(args.direction, "expense") === "income" ? amount : -amount;
            const date = str(args.date) || new Date().toISOString().slice(0, 10);
            const description = str(args.description).trim();
            const category = str(args.category).trim() || "Altro";
            return buildPendingActionResult(
                "add_budget_transaction",
                "Aggiungi transazione budget",
                `Nuova transazione: ${date} • ${description} • ${signedAmount.toFixed(2)} EUR • ${category}`,
                { date, description, amount: signedAmount, category },
            );
        },
    };
}

function buildDeleteBudgetTransactionTool(context: AiToolContext): AiToolDef {
    return {
        name: "delete_budget_transaction",
        description: "Propone l'eliminazione di una transazione budget. Richiede conferma esplicita.",
        parameters: {
            type: "object",
            properties: {
                transactionId: { type: "string" },
                description: { type: "string" },
            },
            required: ["transactionId"],
        },
        async handler(args) {
            makeReadOnlyGuard(context);
            const transactionId = str(args.transactionId).trim();
            const tx = await prisma.budgetTransaction.findFirst({
                where: { id: transactionId, userId: context.userId },
            });
            if (!tx) return { error: "Transazione non trovata" };
            return buildPendingActionResult(
                "delete_budget_transaction",
                "Elimina transazione budget",
                `Eliminare la transazione "${tx.description}" del ${tx.date} (${tx.amount.toFixed(2)} EUR)?`,
                { transactionId: tx.id, description: tx.description },
            );
        },
    };
}

function buildUpdateBudgetTransactionCategoryTool(context: AiToolContext): AiToolDef {
    return {
        name: "update_budget_transaction_category",
        description: "Propone l'aggiornamento della categoria di una transazione budget. Richiede conferma.",
        parameters: {
            type: "object",
            properties: {
                transactionId: { type: "string" },
                category: { type: "string" },
            },
            required: ["transactionId", "category"],
        },
        async handler(args) {
            makeReadOnlyGuard(context);
            const transactionId = str(args.transactionId).trim();
            const category = str(args.category).trim();
            const tx = await prisma.budgetTransaction.findFirst({
                where: { id: transactionId, userId: context.userId },
            });
            if (!tx) return { error: "Transazione non trovata" };
            return buildPendingActionResult(
                "update_budget_transaction_category",
                "Aggiorna categoria transazione",
                `Aggiornare "${tx.description}" da ${tx.category} a ${category}?`,
                { transactionId: tx.id, category },
            );
        },
    };
}

function buildCreateGoalTool(context: AiToolContext): AiToolDef {
    return {
        name: "create_goal",
        description: "Propone la creazione di un obiettivo di risparmio. Richiede conferma.",
        parameters: {
            type: "object",
            properties: {
                name: { type: "string" },
                targetAmount: { type: "number" },
                currentAmount: { type: "number" },
                deadline: { type: "string" },
                category: { type: "string" },
            },
            required: ["name", "targetAmount"],
        },
        async handler(args) {
            makeReadOnlyGuard(context);
            const name = str(args.name).trim();
            const targetAmount = num(args.targetAmount);
            const currentAmount = num(args.currentAmount);
            const deadline = str(args.deadline) || null;
            const category = str(args.category, "general");
            return buildPendingActionResult(
                "create_goal",
                "Crea obiettivo",
                `Nuovo obiettivo "${name}" • target ${targetAmount.toFixed(2)} EUR${deadline ? ` • deadline ${deadline}` : ""}`,
                { name, targetAmount, currentAmount, deadline, category },
            );
        },
    };
}

function buildUpdateGoalTool(context: AiToolContext): AiToolDef {
    return {
        name: "update_goal",
        description: "Propone l'aggiornamento di un obiettivo di risparmio. Richiede conferma.",
        parameters: {
            type: "object",
            properties: {
                goalId: { type: "string" },
                name: { type: "string" },
                targetAmount: { type: "number" },
                currentAmount: { type: "number" },
                deadline: { type: "string" },
                category: { type: "string" },
            },
            required: ["goalId"],
        },
        async handler(args) {
            makeReadOnlyGuard(context);
            const goalId = str(args.goalId).trim();
            const goal = await prisma.savingsGoal.findFirst({
                where: { id: goalId, userId: context.userId },
            });
            if (!goal) return { error: "Obiettivo non trovato" };
            return buildPendingActionResult(
                "update_goal",
                "Aggiorna obiettivo",
                `Aggiornare l'obiettivo "${goal.name}" con i nuovi valori proposti?`,
                {
                    goalId,
                    ...(args.name !== undefined ? { name: str(args.name) } : {}),
                    ...(args.targetAmount !== undefined ? { targetAmount: num(args.targetAmount) } : {}),
                    ...(args.currentAmount !== undefined ? { currentAmount: num(args.currentAmount) } : {}),
                    ...(args.deadline !== undefined ? { deadline: str(args.deadline) || null } : {}),
                    ...(args.category !== undefined ? { category: str(args.category) } : {}),
                },
            );
        },
    };
}

function buildDeleteGoalTool(context: AiToolContext): AiToolDef {
    return {
        name: "delete_goal",
        description: "Propone l'eliminazione di un obiettivo di risparmio. Richiede conferma.",
        parameters: {
            type: "object",
            properties: {
                goalId: { type: "string" },
            },
            required: ["goalId"],
        },
        async handler(args) {
            makeReadOnlyGuard(context);
            const goalId = str(args.goalId).trim();
            const goal = await prisma.savingsGoal.findFirst({
                where: { id: goalId, userId: context.userId },
            });
            if (!goal) return { error: "Obiettivo non trovato" };
            return buildPendingActionResult(
                "delete_goal",
                "Elimina obiettivo",
                `Eliminare l'obiettivo "${goal.name}"?`,
                { goalId, name: goal.name },
            );
        },
    };
}

function buildAddMemoryTool(context: AiToolContext): AiToolDef {
    return {
        name: "add_memory",
        description: "Propone il salvataggio di un fatto nella memoria persistente. Richiede conferma.",
        parameters: {
            type: "object",
            properties: {
                category: { type: "string", enum: ["profilo", "obiettivo", "decisione", "preferenza", "contesto"] },
                fact: { type: "string" },
                pinned: { type: "boolean" },
            },
            required: ["category", "fact"],
        },
        async handler(args) {
            makeReadOnlyGuard(context);
            const category = str(args.category);
            const fact = str(args.fact).trim();
            const pinned = bool(args.pinned, false);
            return buildPendingActionResult(
                "add_memory",
                "Aggiungi fatto in memoria",
                `Salvare in memoria [${category}] ${fact}`,
                { category, fact, pinned, source: "manual" },
            );
        },
    };
}

function buildDeleteMemoryTool(context: AiToolContext): AiToolDef {
    return {
        name: "delete_memory",
        description: "Propone la rimozione di un fatto dalla memoria persistente. Richiede conferma.",
        parameters: {
            type: "object",
            properties: {
                memoryId: { type: "string" },
            },
            required: ["memoryId"],
        },
        async handler(args) {
            makeReadOnlyGuard(context);
            const memoryId = str(args.memoryId).trim();
            const memory = await prisma.assistantMemory.findFirst({
                where: { id: memoryId, userId: context.userId },
            });
            if (!memory) return { error: "Fatto memoria non trovato" };
            return buildPendingActionResult(
                "delete_memory",
                "Elimina fatto memoria",
                `Eliminare dalla memoria: ${memory.fact}`,
                { memoryId: memory.id, fact: memory.fact },
            );
        },
    };
}

function buildToggleMemoryPinTool(context: AiToolContext): AiToolDef {
    return {
        name: "toggle_memory_pin",
        description: "Propone di pinnare o unpinnare un fatto memoria. Richiede conferma.",
        parameters: {
            type: "object",
            properties: {
                memoryId: { type: "string" },
                pinned: { type: "boolean" },
            },
            required: ["memoryId", "pinned"],
        },
        async handler(args) {
            makeReadOnlyGuard(context);
            const memoryId = str(args.memoryId).trim();
            const pinned = bool(args.pinned);
            const memory = await prisma.assistantMemory.findFirst({
                where: { id: memoryId, userId: context.userId },
            });
            if (!memory) return { error: "Fatto memoria non trovato" };
            return buildPendingActionResult(
                "toggle_memory_pin",
                pinned ? "Pinna fatto memoria" : "Rimuovi pin fatto memoria",
                `${pinned ? "Pinnare" : "Rimuovere il pin"} per: ${memory.fact}`,
                { memoryId: memory.id, pinned },
            );
        },
    };
}

export function getServerAiTools(context: AiToolContext): AiToolDef[] {
    return [
        buildLatestSnapshotTool(context),
        buildNetWorthHistoryTool(context),
        buildNetWorthDeltaTool(context),
        buildAssetAllocationTool(context),
        buildPerformanceMetricsTool(context),
        buildDividendsOverviewTool(context),
        buildCustomStocksTool(context),
        buildSavingsGoalsTool(context),
        buildBudgetSummaryTool(context),
        buildPreferencesTool(context),
        buildRecallMemoryTool(context),
        buildSearchBudgetTransactionsTool(context),

        buildMortgageAmortizationTool(),
        buildNetSalaryTool(),
        buildFireMonteCarloTool(),
        buildCoastFireTool(),
        buildSensitivityMatrixTool(),
        buildSaleTaxTool(),
        buildSavingsPlanTool(),
        buildRealEstateProfitabilityTool(),
        buildSimulateMortgageScenarioTool(context),
        buildSimulateFireScenarioTool(context),

        buildStockPriceTool(),
        buildBitcoinPriceTool(),
        buildBondQuoteTool(),
        buildMortgageMarketTool(),

        buildAddBudgetTransactionTool(context),
        buildDeleteBudgetTransactionTool(context),
        buildUpdateBudgetTransactionCategoryTool(context),
        buildCreateGoalTool(context),
        buildUpdateGoalTool(context),
        buildDeleteGoalTool(context),
        buildAddMemoryTool(context),
        buildDeleteMemoryTool(context),
        buildToggleMemoryPinTool(context),
    ];
}
