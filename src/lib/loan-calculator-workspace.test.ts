import { describe, expect, it } from "vitest";
import {
    parseLoanCalculatorSavedScenarios,
    removeLoanCalculatorScenario,
    upsertLoanCalculatorScenario,
} from "@/lib/loan-calculator-workspace";
import type { LoanCalculatorSavedScenario, LoanCalculatorSavedScenarioInput } from "@/types";

const baseInput: LoanCalculatorSavedScenarioInput = {
    name: "Scenario Auto",
    simulations: [
        {
            id: "sim-1",
            importo: 25000,
            anticipo: 5000,
            tasso: 5.5,
            durata: 60,
        },
    ],
    intestatario: "person1",
    enableDebtReductionSimulation: true,
    selectedExistingLoanId: "loan-1",
    selectedPrepaymentAmount: 3000,
};

describe("loan-calculator-workspace", () => {
    it("parseLoanCalculatorSavedScenarios returns empty array for invalid json", () => {
        expect(parseLoanCalculatorSavedScenarios("{invalid")).toEqual([]);
    });

    it("parseLoanCalculatorSavedScenarios sorts scenarios by updatedAt desc", () => {
        const raw = JSON.stringify([
            {
                id: "old",
                createdAt: "2026-04-20T10:00:00.000Z",
                updatedAt: "2026-04-20T10:00:00.000Z",
                ...baseInput,
                name: "Vecchio",
            },
            {
                id: "new",
                createdAt: "2026-04-21T10:00:00.000Z",
                updatedAt: "2026-04-22T10:00:00.000Z",
                ...baseInput,
                name: "Nuovo",
            },
        ]);

        const parsed = parseLoanCalculatorSavedScenarios(raw);

        expect(parsed.map((scenario) => scenario.id)).toEqual(["new", "old"]);
    });

    it("upsertLoanCalculatorScenario creates a new scenario when no id is provided", () => {
        const result = upsertLoanCalculatorScenario([], baseInput, {
            now: "2026-04-23T14:00:00.000Z",
        });

        expect(result.scenario.id).toContain("loan-scenario-");
        expect(result.scenario.createdAt).toBe("2026-04-23T14:00:00.000Z");
        expect(result.scenario.updatedAt).toBe("2026-04-23T14:00:00.000Z");
        expect(result.scenarios).toHaveLength(1);
    });

    it("upsertLoanCalculatorScenario updates an existing scenario preserving createdAt", () => {
        const existing: LoanCalculatorSavedScenario = {
            id: "scenario-1",
            createdAt: "2026-04-20T09:00:00.000Z",
            updatedAt: "2026-04-20T09:00:00.000Z",
            ...baseInput,
        };

        const result = upsertLoanCalculatorScenario(
            [existing],
            {
                ...baseInput,
                name: "Scenario Aggiornato",
                selectedPrepaymentAmount: 4500,
            },
            {
                scenarioId: existing.id,
                now: "2026-04-23T14:30:00.000Z",
            },
        );

        expect(result.scenario.id).toBe(existing.id);
        expect(result.scenario.createdAt).toBe(existing.createdAt);
        expect(result.scenario.updatedAt).toBe("2026-04-23T14:30:00.000Z");
        expect(result.scenario.name).toBe("Scenario Aggiornato");
        expect(result.scenario.selectedPrepaymentAmount).toBe(4500);
    });

    it("removeLoanCalculatorScenario removes the requested scenario", () => {
        const scenarios: LoanCalculatorSavedScenario[] = [
            {
                id: "scenario-1",
                createdAt: "2026-04-20T09:00:00.000Z",
                updatedAt: "2026-04-23T14:30:00.000Z",
                ...baseInput,
            },
            {
                id: "scenario-2",
                createdAt: "2026-04-19T09:00:00.000Z",
                updatedAt: "2026-04-22T14:30:00.000Z",
                ...baseInput,
                name: "Scenario Casa",
            },
        ];

        const next = removeLoanCalculatorScenario(scenarios, "scenario-1");

        expect(next.map((scenario) => scenario.id)).toEqual(["scenario-2"]);
    });
});
