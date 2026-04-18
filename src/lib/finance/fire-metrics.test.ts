import { describe, expect, it } from "vitest";
import type { AssetRecord } from "@/types";
import { computeFireMetricsFromSnapshot } from "./fire-metrics";

describe("computeFireMetricsFromSnapshot", () => {
    const snapshotWithFutureRent: AssetRecord = {
        id: "snap-1",
        date: "2026-04-17",
        realEstateValue: 300000,
        realEstateCosts: 0,
        realEstateRent: 0,
        liquidStockValue: 80000,
        stocksSnapshotValue: 20000,
        safeHavens: 10000,
        emergencyFund: 15000,
        pensionFund: 25000,
        debtsTotal: 5000,
        bitcoinAmount: 1,
        bitcoinPrice: 50000,
        realEstateList: JSON.stringify([
            {
                id: "re-1",
                name: "Bilocale",
                value: 300000,
                costs: 2000,
                imu: 1000,
                rent: 12000,
                isRented: false,
                rentStartDate: "2052-01",
            },
        ]),
    };

    it("non usa il valore immobili nel capitale FIRE ma usa la rendita futura nel target", () => {
        const snapshotWithoutRent: AssetRecord = {
            ...snapshotWithFutureRent,
            realEstateList: JSON.stringify([
                {
                    id: "re-1",
                    name: "Bilocale",
                    value: 300000,
                    costs: 2000,
                    imu: 1000,
                    rent: 12000,
                    isRented: false,
                },
            ]),
        };

        const withoutRent = computeFireMetricsFromSnapshot(snapshotWithoutRent, {
            birthYear: 1990,
            retirementAge: 60,
            expectedMonthlyExpenses: 2500,
            fireWithdrawalRate: 4,
            fireExpectedReturn: 6,
            expectedInflation: 2,
            expectedPublicPension: 0,
            publicPensionAge: 67,
            includeIlliquidInFire: false,
        }, new Date("2026-04-17"));

        const withRent = computeFireMetricsFromSnapshot(snapshotWithFutureRent, {
            birthYear: 1990,
            retirementAge: 60,
            expectedMonthlyExpenses: 2500,
            fireWithdrawalRate: 4,
            fireExpectedReturn: 6,
            expectedInflation: 2,
            expectedPublicPension: 0,
            publicPensionAge: 67,
            includeIlliquidInFire: false,
        }, new Date("2026-04-17"));

        expect(withoutRent.currentCapital).toBe(165000);
        expect(withRent.currentCapital).toBe(165000);
        expect(withRent.fireTarget).toBeLessThan(withoutRent.fireTarget);
    });

    it("propaga la quota reinvestita delle rendite pre-FIRE nel Coast FIRE", () => {
        const snapshotWithPreRetirementRent: AssetRecord = {
            ...snapshotWithFutureRent,
            realEstateList: JSON.stringify([
                {
                    id: "re-1",
                    name: "Bilocale",
                    value: 300000,
                    costs: 2000,
                    imu: 1000,
                    rent: 12000,
                    isRented: false,
                    rentStartDate: "2032-01",
                },
            ]),
        };

        const spentBeforeFire = computeFireMetricsFromSnapshot(snapshotWithPreRetirementRent, {
            birthYear: 1990,
            retirementAge: 60,
            expectedMonthlyExpenses: 2500,
            fireWithdrawalRate: 4,
            fireExpectedReturn: 6,
            expectedInflation: 2,
            expectedPublicPension: 0,
            publicPensionAge: 67,
            preRetirementPassiveIncomeSavingsPct: 0,
            includeIlliquidInFire: false,
        }, new Date("2026-04-17"));

        const reinvestedBeforeFire = computeFireMetricsFromSnapshot(snapshotWithPreRetirementRent, {
            birthYear: 1990,
            retirementAge: 60,
            expectedMonthlyExpenses: 2500,
            fireWithdrawalRate: 4,
            fireExpectedReturn: 6,
            expectedInflation: 2,
            expectedPublicPension: 0,
            publicPensionAge: 67,
            preRetirementPassiveIncomeSavingsPct: 100,
            includeIlliquidInFire: false,
        }, new Date("2026-04-17"));

        expect(reinvestedBeforeFire.fireTarget).toBeCloseTo(spentBeforeFire.fireTarget, 6);
        expect(reinvestedBeforeFire.coastFireTarget).toBeLessThan(spentBeforeFire.coastFireTarget);
    });
});
