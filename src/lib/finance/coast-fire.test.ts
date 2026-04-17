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
