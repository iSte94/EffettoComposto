import type { FinancialSnapshot, PurchaseSimulation } from "@/types";
import { fireDelayMonths, projectFire, type FireProjectionParams, type FireProjectionResult } from "./fire-projection";

export interface AdvisorFirePurchaseCalculations {
    monthlyPayment: number;
    annualRecurringCosts: number;
    tcoYears: number;
    cashOutlay: number;
}

export interface AdvisorFireComparison {
    baseline: FireProjectionResult;
    withPurchase: FireProjectionResult;
    delayMonths: number;
}

export interface AdvisorFirePlannedAdjustments {
    plannedCapitalDeltaByMonth?: number[];
    plannedNetCashflowDeltaByMonth?: number[];
}

export function hasAdvisorFireContext(snapshot: FinancialSnapshot): boolean {
    return snapshot.currentAge !== null && (snapshot.monthlySavings > 0 || snapshot.fireStartingCapital > 0);
}

export function buildAdvisorFireBaseParams(
    snapshot: FinancialSnapshot,
    adjustments: AdvisorFirePlannedAdjustments = {},
): FireProjectionParams {
    return {
        startingCapital: snapshot.fireStartingCapital,
        monthlySavings: snapshot.monthlySavings,
        monthlyExpensesAtFire: snapshot.fireAdjustedMonthlyExpensesAtFire,
        expectedReturnPct: snapshot.fireExpectedReturn,
        inflationPct: snapshot.expectedInflation,
        withdrawalRatePct: snapshot.fireWithdrawalRate,
        currentAge: snapshot.currentAge ?? 30,
        retirementAge: snapshot.retirementAge,
        plannedCapitalDeltaByMonth: adjustments.plannedCapitalDeltaByMonth,
        plannedNetCashflowDeltaByMonth: adjustments.plannedNetCashflowDeltaByMonth,
    };
}

export function getAdvisorOwnershipMonthlyDelta(
    sim: PurchaseSimulation,
    calculations: Pick<AdvisorFirePurchaseCalculations, "annualRecurringCosts">,
): number {
    const recurringCostsMonthly = calculations.annualRecurringCosts / 12;

    if (sim.category === "immobile") {
        return recurringCostsMonthly - sim.monthlyRent;
    }

    return recurringCostsMonthly;
}

export function buildAdvisorFireWithPurchaseParams(
    snapshot: FinancialSnapshot,
    sim: PurchaseSimulation,
    calculations: AdvisorFirePurchaseCalculations,
    adjustments: AdvisorFirePlannedAdjustments = {},
): FireProjectionParams {
    const baseParams = buildAdvisorFireBaseParams(snapshot, adjustments);
    const ownershipMonthlyDelta = getAdvisorOwnershipMonthlyDelta(sim, calculations);
    const fireExpenseDelta = sim.category === "immobile" ? ownershipMonthlyDelta : 0;

    return {
        ...baseParams,
        monthlyExpensesAtFire: Math.max(0, baseParams.monthlyExpensesAtFire + fireExpenseDelta),
        oneTimeOutflow: calculations.cashOutlay,
        recurringMonthlyCost: sim.isFinanced ? calculations.monthlyPayment : 0,
        recurringMonths: sim.isFinanced ? sim.financingYears * 12 : 0,
        ongoingMonthlyCost: ownershipMonthlyDelta,
        ongoingMonths: sim.category === "immobile" ? 0 : calculations.tcoYears * 12,
    };
}

export function computeAdvisorFireComparison(
    snapshot: FinancialSnapshot,
    sim: PurchaseSimulation,
    calculations: AdvisorFirePurchaseCalculations,
    adjustments: AdvisorFirePlannedAdjustments = {},
): AdvisorFireComparison | null {
    if (!hasAdvisorFireContext(snapshot)) {
        return null;
    }

    const baseline = projectFire(buildAdvisorFireBaseParams(snapshot, adjustments));
    const withPurchase = projectFire(buildAdvisorFireWithPurchaseParams(snapshot, sim, calculations, adjustments));

    return {
        baseline,
        withPurchase,
        delayMonths: fireDelayMonths(baseline, withPurchase),
    };
}
