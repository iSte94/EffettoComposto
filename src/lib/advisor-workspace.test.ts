import { describe, expect, it } from "vitest";
import {
    buildAdvisorScenarioReport,
    buildDefaultAdvisorGoalDraft,
    mapLegacyAcceptedPurchaseToScenario,
    parseAdvisorSavedScenarios,
    upsertAdvisorScenario,
} from "./advisor-workspace";
import type { AdvisorSavedScenarioInput, AcceptedPurchase } from "@/types";

const financedScenario: AdvisorSavedScenarioInput = {
    simulation: {
        category: "auto",
        itemName: "BMW Serie 3",
        totalPrice: 32000,
        downPayment: 8000,
        financingRate: 5.4,
        financingYears: 5,
        isFinanced: true,
        annualInsurance: 900,
        annualMaintenance: 600,
        monthlyFuel: 180,
        depreciationRate: 18,
        monthlyRent: 0,
        condominiumFees: 0,
        imuTax: 0,
        usefulLifeYears: 10,
    },
    summary: {
        overallScore: 58,
        monthlyPayment: 455,
        totalInterest: 3300,
        totalTCO: 48700,
        cashOutlay: 8000,
        liquidityAfter: 12000,
        emergencyMonthsLeft: 4.5,
        fireDelayMonthsValue: 7,
        tcoYears: 5,
    },
    note: "Da rivedere dopo l'estate",
    isShortlisted: false,
    linkedGoalId: null,
};

describe("advisor-workspace", () => {
    it("upsertAdvisorScenario aggiorna lo scenario esistente senza duplicarlo", () => {
        const first = upsertAdvisorScenario([], financedScenario, { now: "2026-04-19T09:00:00.000Z" });
        const second = upsertAdvisorScenario(first.scenarios, {
            ...financedScenario,
            summary: { ...financedScenario.summary, overallScore: 63 },
            note: "Aggiornato",
        }, { now: "2026-04-20T09:00:00.000Z", desiredShortlist: true });

        expect(second.scenarios).toHaveLength(1);
        expect(second.scenario.createdAt).toBe("2026-04-19T09:00:00.000Z");
        expect(second.scenario.updatedAt).toBe("2026-04-20T09:00:00.000Z");
        expect(second.scenario.summary.overallScore).toBe(63);
        expect(second.scenario.note).toBe("Aggiornato");
        expect(second.scenario.isShortlisted).toBe(true);
    });

    it("parseAdvisorSavedScenarios recupera i legacy accepted purchases quando il nuovo workspace e vuoto", () => {
        const legacy: AcceptedPurchase = {
            id: "legacy-1",
            acceptedAt: "2026-01-15T10:00:00.000Z",
            category: "auto",
            itemName: "Auto usata",
            totalPrice: 14000,
            downPayment: 2000,
            isFinanced: true,
            financingRate: 4.9,
            financingYears: 4,
            monthlyPayment: 280,
            totalInterest: 1400,
            totalTCO: 18200,
            linkedLoanId: "loan-1",
        };

        const parsed = parseAdvisorSavedScenarios("[]", JSON.stringify([legacy]));

        expect(parsed).toHaveLength(1);
        expect(parsed[0].simulation.itemName).toBe("Auto usata");
        expect(parsed[0].summary.monthlyPayment).toBe(280);
        expect(parsed[0].note).toContain("legacy");
    });

    it("buildDefaultAdvisorGoalDraft usa anticipo per gli scenari finanziati e prezzo pieno per quelli cash", () => {
        const financedSaved = upsertAdvisorScenario([], financedScenario).scenario;
        const cashSaved = upsertAdvisorScenario([], {
            ...financedScenario,
            simulation: { ...financedScenario.simulation, itemName: "Cucina nuova", category: "arredamento", isFinanced: false, totalPrice: 9000, downPayment: 0 },
            summary: { ...financedScenario.summary, cashOutlay: 9000, monthlyPayment: 0 },
        }).scenario;

        expect(buildDefaultAdvisorGoalDraft(financedSaved).targetAmount).toBe(8000);
        expect(buildDefaultAdvisorGoalDraft(cashSaved).targetAmount).toBe(9000);
    });

    it("buildAdvisorScenarioReport genera una sintesi leggibile", () => {
        const saved = upsertAdvisorScenario([], financedScenario, { now: "2026-04-19T09:00:00.000Z" }).scenario;
        const report = buildAdvisorScenarioReport(saved);

        expect(report).toContain("BMW Serie 3");
        expect(report).toContain("Valutazione: 58/100");
        expect(report).toContain("Da rivedere dopo l'estate");
    });

    it("mapLegacyAcceptedPurchaseToScenario mantiene i valori economici principali", () => {
        const legacy: AcceptedPurchase = {
            id: "legacy-2",
            acceptedAt: "2026-02-10T10:00:00.000Z",
            category: "immobile",
            itemName: "Bilocale Isola",
            totalPrice: 280000,
            downPayment: 70000,
            isFinanced: true,
            financingRate: 3.1,
            financingYears: 25,
            monthlyPayment: 970,
            totalInterest: 81000,
            totalTCO: 361000,
        };

        const mapped = mapLegacyAcceptedPurchaseToScenario(legacy);

        expect(mapped.simulation.category).toBe("immobile");
        expect(mapped.summary.cashOutlay).toBe(70000);
        expect(mapped.summary.totalTCO).toBe(361000);
    });
});
