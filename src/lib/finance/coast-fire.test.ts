import { describe, expect, it } from "vitest";
import {
    buildPassiveIncomeBreakdown,
    buildDynamicFireTargetSchedule,
    computeCoastFireScenarios,
    computeFireTargetForRetirementAge,
} from "./coast-fire";

describe("computeCoastFireScenarios", () => {
    const baseInput = {
        currentAge: 35,
        retirementAge: 60,
        publicPensionAge: 67,
        currentCapital: 250_000,
        monthlyExpenses: 2_500,
        monthlyPublicPension: 0,
        monthlyRealEstateIncome: 0,
        withdrawalRatePct: 4,
        nominalReturnPct: 6,
        inflationPct: 2,
    };

    it("riduce il target FIRE netto quando aumenta la pensione pubblica", () => {
        const withoutPension = computeCoastFireScenarios(baseInput);
        const withPension = computeCoastFireScenarios({
            ...baseInput,
            monthlyPublicPension: 1_200,
        });

        const baseWithout = withoutPension.scenarios.find((s) => s.scenario === "base");
        const baseWith = withPension.scenarios.find((s) => s.scenario === "base");

        expect(baseWithout).toBeDefined();
        expect(baseWith).toBeDefined();
        expect(baseWith!.fireTargetNet).toBeLessThan(baseWithout!.fireTargetNet);
        expect(baseWith!.coastFireTarget).toBeLessThan(baseWithout!.coastFireTarget);
    });

    it("non produce NaN/Infinity con withdrawalRatePct = 0", () => {
        const result = computeCoastFireScenarios({
            ...baseInput,
            withdrawalRatePct: 0,
        });

        for (const s of result.scenarios) {
            expect(Number.isFinite(s.coastFireTarget)).toBe(true);
            expect(Number.isFinite(s.fireTargetNet)).toBe(true);
            expect(Number.isFinite(s.pensionPresentValue)).toBe(true);
            expect(s.coastFireTarget).toBeGreaterThan(0);
        }
        expect(Number.isFinite(result.baseFireTarget)).toBe(true);
        expect(result.baseFireTarget).toBeGreaterThan(0);
    });

    it("non produce NaN/Infinity con withdrawalRatePct negativo", () => {
        const result = computeCoastFireScenarios({
            ...baseInput,
            withdrawalRatePct: -5,
        });

        expect(Number.isFinite(result.baseFireTarget)).toBe(true);
        expect(result.baseFireTarget).toBeGreaterThan(0);
    });

    it("gestisce monthlyExpenses = 0 senza errori", () => {
        const result = computeCoastFireScenarios({
            ...baseInput,
            monthlyExpenses: 0,
        });

        const base = result.scenarios.find((s) => s.scenario === "base");
        expect(base).toBeDefined();
        expect(base!.fireTargetNet).toBe(0);
        expect(base!.coastFireTarget).toBe(0);
    });

    it("il bollo abbassa il rendimento reale netto e alza il Coast FIRE richiesto", () => {
        const withoutTaxStamp = computeCoastFireScenarios(baseInput);
        const withTaxStamp = computeCoastFireScenarios({
            ...baseInput,
            applyTaxStamp: true,
        });

        const baseWithout = withoutTaxStamp.scenarios.find((s) => s.scenario === "base");
        const baseWith = withTaxStamp.scenarios.find((s) => s.scenario === "base");

        expect(baseWithout).toBeDefined();
        expect(baseWith).toBeDefined();
        expect(baseWith!.realReturnPct).toBeCloseTo(baseWithout!.realReturnPct - 0.2, 6);
        expect(baseWith!.coastFireTarget).toBeGreaterThan(baseWithout!.coastFireTarget);
    });

    it("anticipare l'eta pensionabile abbassa il capitale richiesto", () => {
        const latePension = computeCoastFireScenarios({
            ...baseInput,
            monthlyPublicPension: 1_200,
            publicPensionAge: 67,
        });
        const earlyPension = computeCoastFireScenarios({
            ...baseInput,
            monthlyPublicPension: 1_200,
            publicPensionAge: 63,
        });

        const baseLate = latePension.scenarios.find((s) => s.scenario === "base");
        const baseEarly = earlyPension.scenarios.find((s) => s.scenario === "base");

        expect(baseLate).toBeDefined();
        expect(baseEarly).toBeDefined();
        expect(baseEarly!.fireTargetNet).toBeLessThan(baseLate!.fireTargetNet);
        expect(baseEarly!.coastFireTarget).toBeLessThan(baseLate!.coastFireTarget);
    });

    it("considera rendite passive programmate future nel target netto", () => {
        const withoutPassive = computeCoastFireScenarios(baseInput);
        const withFuturePassive = computeCoastFireScenarios({
            ...baseInput,
            passiveIncomeStreams: [
                { annualAmount: 9_000, startAge: 63, endAge: 90 },
            ],
        });

        const baseWithout = withoutPassive.scenarios.find((s) => s.scenario === "base");
        const baseWithFuturePassive = withFuturePassive.scenarios.find((s) => s.scenario === "base");

        expect(baseWithout).toBeDefined();
        expect(baseWithFuturePassive).toBeDefined();
        expect(baseWithFuturePassive!.fireTargetNet).toBeLessThan(baseWithout!.fireTargetNet);
        expect(baseWithFuturePassive!.passiveIncomePresentValue).toBeGreaterThan(0);
    });

    it("una rendita che parte prima del retirement abbassa ulteriormente il Coast FIRE se la reinvesti", () => {
        const atRetirement = computeCoastFireScenarios({
            ...baseInput,
            passiveIncomeStreams: [
                { annualAmount: 12_000, startAge: 60, endAge: 90 },
            ],
            preRetirementPassiveIncomeSavingsPct: 100,
        });
        const beforeRetirement = computeCoastFireScenarios({
            ...baseInput,
            passiveIncomeStreams: [
                { annualAmount: 12_000, startAge: 45, endAge: 90 },
            ],
            preRetirementPassiveIncomeSavingsPct: 100,
        });

        const baseAtRetirement = atRetirement.scenarios.find((s) => s.scenario === "base");
        const baseBeforeRetirement = beforeRetirement.scenarios.find((s) => s.scenario === "base");

        expect(baseAtRetirement).toBeDefined();
        expect(baseBeforeRetirement).toBeDefined();
        expect(baseBeforeRetirement!.fireTargetNet).toBeCloseTo(baseAtRetirement!.fireTargetNet, 6);
        expect(baseBeforeRetirement!.coastFireTarget).toBeLessThan(baseAtRetirement!.coastFireTarget);
    });

    it("se spendi tutta la rendita pre-retirement il Coast FIRE non riceve accelerazione extra", () => {
        const atRetirement = computeCoastFireScenarios({
            ...baseInput,
            passiveIncomeStreams: [
                { annualAmount: 12_000, startAge: 60, endAge: 90 },
            ],
            preRetirementPassiveIncomeSavingsPct: 0,
        });
        const beforeRetirementSpent = computeCoastFireScenarios({
            ...baseInput,
            passiveIncomeStreams: [
                { annualAmount: 12_000, startAge: 45, endAge: 90 },
            ],
            preRetirementPassiveIncomeSavingsPct: 0,
        });

        const baseAtRetirement = atRetirement.scenarios.find((s) => s.scenario === "base");
        const baseBeforeRetirementSpent = beforeRetirementSpent.scenarios.find((s) => s.scenario === "base");

        expect(baseAtRetirement).toBeDefined();
        expect(baseBeforeRetirementSpent).toBeDefined();
        expect(baseBeforeRetirementSpent!.coastFireTarget).toBeCloseTo(baseAtRetirement!.coastFireTarget, 6);
    });

    it("espone un breakdown delle rendite future in euro reali di oggi", () => {
        const breakdown = buildPassiveIncomeBreakdown({
            ...baseInput,
            currentAge: 32,
            retirementAge: 50,
            nominalReturnPct: 6.5,
            inflationPct: 2,
            passiveIncomeStreams: [
                { label: "Via al Golf 29", annualAmount: 3_000, startAge: 50, endAge: 90 },
                { label: "Via G. Mazzini 26", annualAmount: 13_000, startAge: 50, endAge: 90 },
            ],
        });

        expect(breakdown).toHaveLength(2);
        expect(breakdown[0].label).toBe("Via al Golf 29");
        expect(breakdown[0].presentValueAtRetirement).toBeCloseTo(55_907.07, 2);
        expect(breakdown[1].presentValueAtRetirement).toBeCloseTo(242_263.98, 2);
        expect(breakdown[0].presentValueToday).toBeLessThan(breakdown[0].presentValueAtRetirement);
        expect(breakdown[1].presentValueToday).toBeLessThan(breakdown[1].presentValueAtRetirement);
    });

    it("una rendita passiva negativa aumenta il target FIRE netto", () => {
        const withoutNegativePassive = computeCoastFireScenarios(baseInput);
        const withNegativePassive = computeCoastFireScenarios({
            ...baseInput,
            passiveIncomeStreams: [
                { annualAmount: -3_000, startAge: 60, endAge: 90 },
            ],
        });

        const baseWithout = withoutNegativePassive.scenarios.find((s) => s.scenario === "base");
        const baseWithNegative = withNegativePassive.scenarios.find((s) => s.scenario === "base");

        expect(baseWithout).toBeDefined();
        expect(baseWithNegative).toBeDefined();
        expect(baseWithNegative!.fireTargetNet).toBeGreaterThan(baseWithout!.fireTargetNet);
        expect(baseWithNegative!.passiveIncomePresentValue).toBeLessThan(0);
    });

    it("il Coast FIRE cresce quando rimuovi i supporti futuri dal modello", () => {
        const withSupports = computeCoastFireScenarios({
            ...baseInput,
            monthlyPublicPension: 1_200,
            passiveIncomeStreams: [
                { annualAmount: 9_000, startAge: 63, endAge: 90 },
            ],
        });
        const withoutPassive = computeCoastFireScenarios({
            ...baseInput,
            monthlyPublicPension: 1_200,
        });
        const withoutSupports = computeCoastFireScenarios(baseInput);

        const baseWithSupports = withSupports.scenarios.find((s) => s.scenario === "base");
        const baseWithoutPassive = withoutPassive.scenarios.find((s) => s.scenario === "base");
        const baseWithoutSupports = withoutSupports.scenarios.find((s) => s.scenario === "base");

        expect(baseWithSupports).toBeDefined();
        expect(baseWithoutPassive).toBeDefined();
        expect(baseWithoutSupports).toBeDefined();
        expect(baseWithoutPassive!.coastFireTarget).toBeGreaterThan(baseWithSupports!.coastFireTarget);
        expect(baseWithoutSupports!.coastFireTarget).toBeGreaterThan(baseWithoutPassive!.coastFireTarget);
    });

    it("richiede più capitale se vuoi smettere oggi invece che all'età pensionabile pianificata", () => {
        const retireToday = computeFireTargetForRetirementAge({
            retirementAge: baseInput.currentAge,
            publicPensionAge: baseInput.publicPensionAge,
            monthlyExpenses: baseInput.monthlyExpenses,
            monthlyPublicPension: 1_200,
            withdrawalRatePct: baseInput.withdrawalRatePct,
            nominalReturnPct: baseInput.nominalReturnPct,
            inflationPct: baseInput.inflationPct,
        });
        const retireAtPlan = computeFireTargetForRetirementAge({
            retirementAge: baseInput.retirementAge,
            publicPensionAge: baseInput.publicPensionAge,
            monthlyExpenses: baseInput.monthlyExpenses,
            monthlyPublicPension: 1_200,
            withdrawalRatePct: baseInput.withdrawalRatePct,
            nominalReturnPct: baseInput.nominalReturnPct,
            inflationPct: baseInput.inflationPct,
        });

        expect(retireToday.fireTargetNet).toBeGreaterThan(retireAtPlan.fireTargetNet);
    });

    it("la schedule dinamica parte dal target retire-now e converge al target pianificato", () => {
        const schedule = buildDynamicFireTargetSchedule({
            currentAge: baseInput.currentAge,
            maxYears: baseInput.retirementAge - baseInput.currentAge,
            publicPensionAge: baseInput.publicPensionAge,
            monthlyExpenses: baseInput.monthlyExpenses,
            monthlyPublicPension: 1_200,
            withdrawalRatePct: baseInput.withdrawalRatePct,
            nominalReturnPct: baseInput.nominalReturnPct,
            inflationPct: baseInput.inflationPct,
        });
        const retireToday = computeFireTargetForRetirementAge({
            retirementAge: baseInput.currentAge,
            publicPensionAge: baseInput.publicPensionAge,
            monthlyExpenses: baseInput.monthlyExpenses,
            monthlyPublicPension: 1_200,
            withdrawalRatePct: baseInput.withdrawalRatePct,
            nominalReturnPct: baseInput.nominalReturnPct,
            inflationPct: baseInput.inflationPct,
        });
        const retireAtPlan = computeFireTargetForRetirementAge({
            retirementAge: baseInput.retirementAge,
            publicPensionAge: baseInput.publicPensionAge,
            monthlyExpenses: baseInput.monthlyExpenses,
            monthlyPublicPension: 1_200,
            withdrawalRatePct: baseInput.withdrawalRatePct,
            nominalReturnPct: baseInput.nominalReturnPct,
            inflationPct: baseInput.inflationPct,
        });

        expect(schedule[0]).toBeCloseTo(retireToday.fireTargetNet, 6);
        expect(schedule.at(-1)).toBeCloseTo(retireAtPlan.fireTargetNet, 6);
        expect(schedule[0]).toBeGreaterThan(schedule.at(-1)!);
    });
});
