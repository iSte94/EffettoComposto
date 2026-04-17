import { describe, expect, it } from "vitest";
import { computeCoastFireScenarios } from "./coast-fire";

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
});
