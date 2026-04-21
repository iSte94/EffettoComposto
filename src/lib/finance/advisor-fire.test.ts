import { describe, expect, it } from "vitest";
import type { FinancialSnapshot, PurchaseSimulation } from "@/types";
import {
    buildAdvisorFireBaseParams,
    buildAdvisorFireWithPurchaseParams,
    computeAdvisorFireComparison,
    getAdvisorOwnershipMonthlyDelta,
} from "./advisor-fire";

const snapshot: FinancialSnapshot = {
    totalAssets: 250_000,
    totalDebts: 20_000,
    netWorth: 230_000,
    liquidAssets: 90_000,
    emergencyFund: 20_000,
    monthlyIncome: 3_800,
    realEstateValue: 120_000,
    investableAssets: 130_000,
    investableNetWorth: 110_000,
    monthlyExpenses: 1_700,
    monthlySavings: 1_200,
    existingLoansMonthlyPayment: 300,
    currentDTI: 300 / 3800,
    existingLoansCount: 1,
    birthYear: 1991,
    currentAge: 35,
    retirementAge: 60,
    expectedMonthlyExpensesAtFire: 2_400,
    fireStartingCapital: 110_000,
    fireAdjustedMonthlyExpensesAtFire: 2_000,
    fireWithdrawalRate: 3.25,
    fireExpectedReturn: 6,
    expectedInflation: 2,
};

const propertySim: PurchaseSimulation = {
    category: "immobile",
    itemName: "Bilocale",
    totalPrice: 200_000,
    downPayment: 40_000,
    financingRate: 3.5,
    financingYears: 20,
    isFinanced: true,
    annualInsurance: 0,
    annualMaintenance: 0,
    monthlyFuel: 0,
    depreciationRate: 0,
    monthlyRent: 1_200,
    condominiumFees: 120,
    imuTax: 80,
    usefulLifeYears: 20,
};

describe("advisor-fire helpers", () => {
    it("usa il capitale e la spesa FIRE gia' allineati al tab FIRE", () => {
        const params = buildAdvisorFireBaseParams(snapshot);
        expect(params.startingCapital).toBe(snapshot.fireStartingCapital);
        expect(params.monthlyExpensesAtFire).toBe(snapshot.fireAdjustedMonthlyExpensesAtFire);
    });

    it("tratta l'affitto netto come delta mensile positivo nel caso immobile", () => {
        const monthlyDelta = getAdvisorOwnershipMonthlyDelta(propertySim, {
            annualRecurringCosts: (propertySim.condominiumFees + propertySim.imuTax) * 12,
        });
        expect(monthlyDelta).toBe(-1_000);
    });

    it("riduce la spesa FIRE effettiva per un immobile con cashflow positivo", () => {
        const params = buildAdvisorFireWithPurchaseParams(snapshot, propertySim, {
            monthlyPayment: 900,
            annualRecurringCosts: (propertySim.condominiumFees + propertySim.imuTax) * 12,
            tcoYears: propertySim.financingYears,
            cashOutlay: propertySim.downPayment,
        });
        expect(params.monthlyExpensesAtFire).toBeLessThan(snapshot.fireAdjustedMonthlyExpensesAtFire);
        expect(params.ongoingMonths).toBe(0);
    });

    it("un immobile a reddito ritarda meno il FIRE rispetto allo stesso immobile senza affitto", () => {
        const withRent = computeAdvisorFireComparison(snapshot, propertySim, {
            monthlyPayment: 900,
            annualRecurringCosts: (propertySim.condominiumFees + propertySim.imuTax) * 12,
            tcoYears: propertySim.financingYears,
            cashOutlay: propertySim.downPayment,
        });
        const withoutRent = computeAdvisorFireComparison(snapshot, {
            ...propertySim,
            monthlyRent: 0,
        }, {
            monthlyPayment: 900,
            annualRecurringCosts: (propertySim.condominiumFees + propertySim.imuTax) * 12,
            tcoYears: propertySim.financingYears,
            cashOutlay: propertySim.downPayment,
        });

        expect(withRent).not.toBeNull();
        expect(withoutRent).not.toBeNull();
        expect((withRent?.delayMonths ?? 0)).toBeLessThan(withoutRent?.delayMonths ?? 0);
    });

    it("include gli eventi futuri pianificati nel baseline e nel confronto con acquisto", () => {
        const adjustments = {
            plannedCapitalDeltaByMonth: [-20_000, 0, 0, 0, 0, 50_000],
            plannedNetCashflowDeltaByMonth: [0, -400, -400, -400, 0, 0],
        };

        const baseParams = buildAdvisorFireBaseParams(snapshot, adjustments);
        expect(baseParams.plannedCapitalDeltaByMonth).toEqual(adjustments.plannedCapitalDeltaByMonth);
        expect(baseParams.plannedNetCashflowDeltaByMonth).toEqual(adjustments.plannedNetCashflowDeltaByMonth);

        const withPurchaseParams = buildAdvisorFireWithPurchaseParams(snapshot, propertySim, {
            monthlyPayment: 900,
            annualRecurringCosts: (propertySim.condominiumFees + propertySim.imuTax) * 12,
            tcoYears: propertySim.financingYears,
            cashOutlay: propertySim.downPayment,
        }, adjustments);
        expect(withPurchaseParams.plannedCapitalDeltaByMonth).toEqual(adjustments.plannedCapitalDeltaByMonth);
        expect(withPurchaseParams.plannedNetCashflowDeltaByMonth).toEqual(adjustments.plannedNetCashflowDeltaByMonth);

        const comparisonWithAdjustments = computeAdvisorFireComparison(snapshot, propertySim, {
            monthlyPayment: 900,
            annualRecurringCosts: (propertySim.condominiumFees + propertySim.imuTax) * 12,
            tcoYears: propertySim.financingYears,
            cashOutlay: propertySim.downPayment,
        }, adjustments);
        const comparisonWithoutAdjustments = computeAdvisorFireComparison(snapshot, propertySim, {
            monthlyPayment: 900,
            annualRecurringCosts: (propertySim.condominiumFees + propertySim.imuTax) * 12,
            tcoYears: propertySim.financingYears,
            cashOutlay: propertySim.downPayment,
        });

        expect(comparisonWithAdjustments).not.toBeNull();
        expect(comparisonWithoutAdjustments).not.toBeNull();
        expect(comparisonWithAdjustments?.baseline.chartData[0]?.capital).toBe(snapshot.fireStartingCapital);
        expect(comparisonWithAdjustments?.baseline.monthsToFire).not.toBe(comparisonWithoutAdjustments?.baseline.monthsToFire);
    });
});
