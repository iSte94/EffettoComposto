import { describe, expect, it } from "vitest";
import {
    normalizePlannedFinancialEventInput,
    plannedFinancialEventInputSchema,
} from "./planned-events";

describe("plannedFinancialEventInputSchema", () => {
    it("accetta una spesa cash una tantum valida", () => {
        const result = plannedFinancialEventInputSchema.safeParse({
            title: "Matrimonio",
            direction: "outflow",
            kind: "one_time",
            category: "famiglia",
            eventMonth: "2028-06",
            amount: 12000,
            status: "planned",
        });

        expect(result.success).toBe(true);
    });

    it("accetta un'entrata una tantum come eredita", () => {
        const result = plannedFinancialEventInputSchema.safeParse({
            title: "Eredita nonna",
            direction: "inflow",
            kind: "one_time",
            category: "eredita",
            eventMonth: "2027-03",
            amount: 45000,
            status: "planned",
        });

        expect(result.success).toBe(true);
    });

    it("rifiuta mesi non validi", () => {
        const result = plannedFinancialEventInputSchema.safeParse({
            title: "Viaggio",
            direction: "outflow",
            kind: "one_time",
            category: "viaggio",
            eventMonth: "2028-13",
            amount: 3000,
            status: "planned",
        });

        expect(result.success).toBe(false);
    });

    it("rifiuta un evento finanziato senza durata o tasso", () => {
        const result = plannedFinancialEventInputSchema.safeParse({
            title: "Auto",
            direction: "outflow",
            kind: "financed",
            category: "auto",
            eventMonth: "2027-10",
            amount: 24000,
            upfrontAmount: 6000,
            financedAmount: 18000,
            status: "planned",
        });

        expect(result.success).toBe(false);
    });

    it("rifiuta un'entrata finanziata", () => {
        const result = plannedFinancialEventInputSchema.safeParse({
            title: "Eredita rateizzata",
            direction: "inflow",
            kind: "financed",
            category: "eredita",
            eventMonth: "2027-10",
            amount: 24000,
            upfrontAmount: 6000,
            financedAmount: 18000,
            durationMonths: 48,
            interestRate: 4.2,
            status: "planned",
        });

        expect(result.success).toBe(false);
    });

    it("normalizza le spese una tantum azzerando i campi del finanziamento", () => {
        const parsed = plannedFinancialEventInputSchema.parse({
            title: "Vacanza",
            direction: "outflow",
            kind: "one_time",
            category: "viaggio",
            eventMonth: "2027-08",
            amount: 5000,
            upfrontAmount: 1000,
            financedAmount: 4000,
            durationMonths: 12,
            interestRate: 4,
            status: "planned",
        });

        const normalized = normalizePlannedFinancialEventInput(parsed);
        expect(normalized.upfrontAmount).toBeNull();
        expect(normalized.financedAmount).toBeNull();
        expect(normalized.durationMonths).toBeNull();
        expect(normalized.interestRate).toBeNull();
    });
});
