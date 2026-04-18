import type { AssetRecord, RealEstateProperty } from "@/types";
import { computeCoastFireScenarios, type CoastFireInput, type CoastFireResult } from "./coast-fire";
import {
    buildRealEstatePassiveIncomeStreams,
    formatYearMonth,
    sumRealEstateAnnualNetIncome,
} from "./real-estate";

const DEFAULT_FIRE_WITHDRAWAL_RATE = 3.25;
const DEFAULT_FIRE_EXPECTED_RETURN = 6;
const DEFAULT_EXPECTED_INFLATION = 2;
const DEFAULT_PUBLIC_PENSION_AGE = 67;

export interface FireMetricsResult {
    currentAge: number | null;
    currentNetWorth: number;
    currentLiquidAssets: number;
    currentCapital: number;
    grossFireTarget: number;
    fireTarget: number;
    coastFireTarget: number;
    fireProgress: number;
    fireGap: number;
    futureIncomeAdjustment: number;
    realEstateAnnualIncomeNow: number;
    coastFireAnalysis: CoastFireResult | null;
    coastFireInput: CoastFireInput | null;
}

function toNumber(value: unknown, fallback = 0): number {
    return typeof value === "number" && Number.isFinite(value)
        ? value
        : (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))
            ? Number(value)
            : fallback);
}

function toIntegerOrNull(value: unknown): number | null {
    const parsed = toNumber(value, Number.NaN);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function toBoolean(value: unknown, fallback = false): boolean {
    return typeof value === "boolean" ? value : fallback;
}

function parsePreRetirementPassiveIncomeMode(value: unknown): CoastFireInput["preRetirementPassiveIncomeMode"] {
    return value === "fixed" ? "fixed" : "percent";
}

function parseRealEstateList(snapshot?: AssetRecord | null): RealEstateProperty[] {
    if (!snapshot) return [];

    try {
        if (snapshot.realEstateList) {
            const parsed = JSON.parse(snapshot.realEstateList) as RealEstateProperty[];
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch {
        // noop: fallback legacy sotto
    }

    const legacyRent = Math.max(0, snapshot.realEstateRent || 0);
    const legacyCosts = Math.max(0, snapshot.realEstateCosts || 0);
    if (legacyRent <= 0 && legacyCosts <= 0) return [];

    return [{
        id: "legacy-fire-real-estate",
        name: "Immobile storico",
        value: 0,
        costs: legacyCosts,
        rent: legacyRent,
        isRented: true,
    }];
}

export function computeFireMetricsFromSnapshot(
    snapshot: AssetRecord | null | undefined,
    preferences: Record<string, unknown> | null | undefined,
    now: Date = new Date(),
): FireMetricsResult {
    const liquidStockValue = Math.max(0, snapshot?.liquidStockValue || 0);
    const stocksSnapshotValue = Math.max(0, snapshot?.stocksSnapshotValue || 0);
    const safeHavens = Math.max(0, snapshot?.safeHavens || 0);
    const emergencyFund = Math.max(0, snapshot?.emergencyFund || 0);
    const pensionFund = Math.max(0, snapshot?.pensionFund || 0);
    const debtsTotal = Math.max(0, snapshot?.debtsTotal || 0);
    const btcValue = Math.max(0, snapshot?.bitcoinAmount || 0) * Math.max(0, snapshot?.bitcoinPrice || 0);

    const currentNetWorth = liquidStockValue + stocksSnapshotValue + safeHavens + emergencyFund + pensionFund + btcValue - debtsTotal;
    const currentLiquidAssets = liquidStockValue + stocksSnapshotValue + emergencyFund + btcValue;
    const includeIlliquidInFire = toBoolean(preferences?.includeIlliquidInFire, false);
    const currentCapital = includeIlliquidInFire ? currentNetWorth : currentLiquidAssets;

    const expectedMonthlyExpenses = Math.max(0, toNumber(preferences?.expectedMonthlyExpenses));
    const fireWithdrawalRate = Math.max(0, toNumber(preferences?.fireWithdrawalRate, DEFAULT_FIRE_WITHDRAWAL_RATE));
    const grossFireTarget = expectedMonthlyExpenses > 0 && fireWithdrawalRate > 0
        ? (expectedMonthlyExpenses * 12) / (fireWithdrawalRate / 100)
        : 0;

    const realEstateList = parseRealEstateList(snapshot);
    const asOfYearMonth = formatYearMonth(now);
    const realEstateAnnualIncomeNow = sumRealEstateAnnualNetIncome(realEstateList, asOfYearMonth);

    const birthYear = toIntegerOrNull(preferences?.birthYear);
    const retirementAge = toIntegerOrNull(preferences?.retirementAge);
    const currentAge = birthYear != null ? now.getFullYear() - birthYear : null;

    let coastFireAnalysis: CoastFireResult | null = null;
    let coastFireInput: CoastFireInput | null = null;
    let fireTarget = grossFireTarget;
    let coastFireTarget = grossFireTarget;

    if (
        currentAge != null &&
        retirementAge != null &&
        expectedMonthlyExpenses > 0 &&
        fireWithdrawalRate > 0
    ) {
        const publicPensionAge = toIntegerOrNull(preferences?.publicPensionAge) ?? DEFAULT_PUBLIC_PENSION_AGE;
        const expectedPublicPension = Math.max(0, toNumber(preferences?.expectedPublicPension));
        const fireExpectedReturn = toNumber(preferences?.fireExpectedReturn, DEFAULT_FIRE_EXPECTED_RETURN);
        const expectedInflation = toNumber(preferences?.expectedInflation, DEFAULT_EXPECTED_INFLATION);
        const applyTaxStamp = toBoolean(preferences?.applyTaxStamp, true);
        const preRetirementPassiveIncomeMode = parsePreRetirementPassiveIncomeMode(preferences?.preRetirementPassiveIncomeMode);
        const preRetirementPassiveIncomeSavingsPct = Math.min(100, Math.max(0, toNumber(preferences?.preRetirementPassiveIncomeSavingsPct, 100)));
        const preRetirementPassiveIncomeSavingsAnnual = Math.max(0, toNumber(preferences?.preRetirementPassiveIncomeSavingsAnnual));
        const passiveIncomeStreams = buildRealEstatePassiveIncomeStreams(realEstateList, {
            currentAge,
            retirementAge,
            asOfYearMonth,
        });

        coastFireInput = {
            currentAge,
            retirementAge,
            publicPensionAge,
            currentCapital,
            monthlyExpenses: expectedMonthlyExpenses,
            monthlyPublicPension: expectedPublicPension,
            passiveIncomeStreams,
            withdrawalRatePct: fireWithdrawalRate,
            nominalReturnPct: fireExpectedReturn,
            inflationPct: expectedInflation,
            applyTaxStamp,
            preRetirementPassiveIncomeMode,
            preRetirementPassiveIncomeSavingsPct,
            preRetirementPassiveIncomeSavingsAnnual,
        };

        coastFireAnalysis = computeCoastFireScenarios(coastFireInput);

        const baseScenario = coastFireAnalysis.scenarios.find((scenario) => scenario.scenario === "base")
            ?? coastFireAnalysis.scenarios[0];

        fireTarget = Math.max(0, baseScenario?.fireTargetNet ?? grossFireTarget);
        coastFireTarget = Math.max(0, baseScenario?.coastFireTarget ?? grossFireTarget);
    }

    const fireProgress = fireTarget > 0
        ? Math.max(0, Math.min(100, (currentCapital / fireTarget) * 100))
        : 0;

    return {
        currentAge,
        currentNetWorth,
        currentLiquidAssets,
        currentCapital,
        grossFireTarget,
        fireTarget,
        coastFireTarget,
        fireProgress,
        fireGap: fireTarget > 0 ? Math.max(0, fireTarget - currentCapital) : 0,
        futureIncomeAdjustment: Math.max(0, grossFireTarget - fireTarget),
        realEstateAnnualIncomeNow,
        coastFireAnalysis,
        coastFireInput,
    };
}
