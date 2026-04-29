import { describe, it, expect } from "vitest";
import {
    computeTopSubscriptionImpact,
    type SubscriptionLike,
} from "./subscription-top-spender";
import {
    DEFAULT_SUBSCRIPTION_OPPORTUNITY_HORIZON_YEARS,
    DEFAULT_SUBSCRIPTION_OPPORTUNITY_REAL_RETURN_PCT,
} from "./subscription-opportunity";

describe("computeTopSubscriptionImpact", () => {
    it("ritorna null su lista vuota", () => {
        expect(computeTopSubscriptionImpact([])).toBeNull();
    });

    it("ritorna null se nessun abbonamento ha importo > 0", () => {
        const subs: SubscriptionLike[] = [
            { name: "A", amount: 0, frequency: "mensile" },
            { name: "B", amount: -10, frequency: "mensile" },
        ];
        expect(computeTopSubscriptionImpact(subs)).toBeNull();
    });

    it("identifica il piu' costoso normalizzando frequenza annuale a mensile", () => {
        // Annuale 600 = 50/mese, batte mensile 30.
        const subs: SubscriptionLike[] = [
            { name: "Mensile economico", amount: 30, frequency: "mensile" },
            { name: "Assicurazione", amount: 600, frequency: "annuale" },
        ];
        const top = computeTopSubscriptionImpact(subs);
        expect(top).not.toBeNull();
        expect(top!.name).toBe("Assicurazione");
        expect(top!.monthlyNormalized).toBe(50);
        expect(top!.annualNormalized).toBe(600);
    });

    it("la quota percentuale somma correttamente al totale mensile normalizzato", () => {
        const subs: SubscriptionLike[] = [
            { name: "A", amount: 10, frequency: "mensile" },
            { name: "B", amount: 30, frequency: "mensile" },
            { name: "C", amount: 120, frequency: "annuale" }, // 10/mese
        ];
        // totale 50/mese, top = B (30) -> 60%
        const top = computeTopSubscriptionImpact(subs);
        expect(top).not.toBeNull();
        expect(top!.name).toBe("B");
        expect(top!.percentOfTotal).toBeCloseTo(60, 6);
    });

    it("usa default canonici (30 anni, 4% reale) quando non si passano option", () => {
        const subs: SubscriptionLike[] = [{ name: "X", amount: 50, frequency: "mensile" }];
        const top = computeTopSubscriptionImpact(subs);
        expect(top).not.toBeNull();
        expect(top!.horizonYears).toBe(DEFAULT_SUBSCRIPTION_OPPORTUNITY_HORIZON_YEARS);
        expect(top!.realReturnPct).toBe(DEFAULT_SUBSCRIPTION_OPPORTUNITY_REAL_RETURN_PCT);
    });

    it("rispetta options.years e options.realReturnPct", () => {
        const subs: SubscriptionLike[] = [{ name: "X", amount: 50, frequency: "mensile" }];
        const top = computeTopSubscriptionImpact(subs, { years: 10, realReturnPct: 0 });
        expect(top!.horizonYears).toBe(10);
        expect(top!.realReturnPct).toBe(0);
        // 0% reale -> futureValueReal == totale versato (50 * 12 * 10 = 6000).
        expect(top!.futureValueReal).toBeCloseTo(6000, 6);
    });

    it("future value reale del top abbonamento e' positivo con rendimento > 0 e orizzonte > 0", () => {
        const subs: SubscriptionLike[] = [{ name: "X", amount: 50, frequency: "mensile" }];
        const top = computeTopSubscriptionImpact(subs);
        expect(top!.futureValueReal).toBeGreaterThan(top!.annualNormalized * top!.horizonYears * 0.9);
        expect(top!.futureValueReal).toBeGreaterThan(0);
    });

    it("ignora importi NaN/Infinity senza propagarli", () => {
        const subs: SubscriptionLike[] = [
            { name: "ValidA", amount: 20, frequency: "mensile" },
            { name: "Bad", amount: NaN, frequency: "mensile" },
            { name: "AlsoBad", amount: Infinity, frequency: "annuale" },
        ];
        const top = computeTopSubscriptionImpact(subs);
        expect(top).not.toBeNull();
        expect(top!.name).toBe("ValidA");
        expect(Number.isFinite(top!.percentOfTotal)).toBe(true);
        expect(Number.isFinite(top!.futureValueReal)).toBe(true);
        expect(top!.percentOfTotal).toBeCloseTo(100, 6);
    });

    it("con un solo abbonamento, percentuale = 100%", () => {
        const subs: SubscriptionLike[] = [{ name: "Solo", amount: 15, frequency: "mensile" }];
        const top = computeTopSubscriptionImpact(subs);
        expect(top!.percentOfTotal).toBeCloseTo(100, 6);
    });

    it("a parita' di costo mensile mantiene il primo trovato (stabilita')", () => {
        const subs: SubscriptionLike[] = [
            { name: "Primo", amount: 20, frequency: "mensile" },
            { name: "Secondo", amount: 240, frequency: "annuale" }, // 20/mese
        ];
        const top = computeTopSubscriptionImpact(subs);
        expect(top!.name).toBe("Primo");
    });

    it("nome vuoto e' supportato (utente non ha ancora compilato il nome)", () => {
        const subs: SubscriptionLike[] = [{ name: "", amount: 10, frequency: "mensile" }];
        const top = computeTopSubscriptionImpact(subs);
        expect(top!.name).toBe("");
        expect(top!.monthlyNormalized).toBe(10);
    });

    it("il top scelto e' deterministicamente quello con piu' alto costo mensile", () => {
        const subs: SubscriptionLike[] = [
            { name: "A", amount: 5, frequency: "mensile" },
            { name: "B", amount: 7, frequency: "mensile" },
            { name: "C", amount: 6, frequency: "mensile" },
        ];
        const top = computeTopSubscriptionImpact(subs);
        expect(top!.name).toBe("B");
        expect(top!.monthlyNormalized).toBe(7);
    });
});
