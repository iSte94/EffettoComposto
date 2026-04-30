import { describe, it, expect } from "vitest";
import {
    computeSavingsOpportunity,
    DEFAULT_SAVINGS_OPPORTUNITY_HORIZON_YEARS,
    DEFAULT_SAVINGS_OPPORTUNITY_REAL_RETURN_PCT,
} from "./savings-opportunity";
import {
    DEFAULT_SUBSCRIPTION_OPPORTUNITY_HORIZON_YEARS,
    DEFAULT_SUBSCRIPTION_OPPORTUNITY_REAL_RETURN_PCT,
} from "./subscription-opportunity";

describe("computeSavingsOpportunity", () => {
    it("ritorna null quando il risparmio mensile e' zero", () => {
        expect(computeSavingsOpportunity({ monthlySavings: 0 })).toBeNull();
    });

    it("ritorna null quando il risparmio mensile e' negativo (l'utente spende piu' di quanto guadagna)", () => {
        expect(computeSavingsOpportunity({ monthlySavings: -200 })).toBeNull();
    });

    it("ritorna null su input non finiti (NaN/Infinity) senza propagare", () => {
        expect(computeSavingsOpportunity({ monthlySavings: NaN })).toBeNull();
        expect(computeSavingsOpportunity({ monthlySavings: Infinity })).toBeNull();
        expect(computeSavingsOpportunity({ monthlySavings: -Infinity })).toBeNull();
    });

    it("usa i default canonici quando years e realReturnPct sono omessi", () => {
        const r = computeSavingsOpportunity({ monthlySavings: 100 });
        expect(r).not.toBeNull();
        expect(r!.years).toBe(DEFAULT_SAVINGS_OPPORTUNITY_HORIZON_YEARS);
        expect(r!.realReturnPct).toBe(DEFAULT_SAVINGS_OPPORTUNITY_REAL_RETURN_PCT);
    });

    it("default coerenti con il modulo subscription-opportunity (UNICA fonte di verita' nel progetto)", () => {
        // Disallineare i default produrrebbe pannelli che mostrano assunzioni
        // diverse - il test fissa la coerenza nel tempo.
        expect(DEFAULT_SAVINGS_OPPORTUNITY_HORIZON_YEARS).toBe(DEFAULT_SUBSCRIPTION_OPPORTUNITY_HORIZON_YEARS);
        expect(DEFAULT_SAVINGS_OPPORTUNITY_REAL_RETURN_PCT).toBe(DEFAULT_SUBSCRIPTION_OPPORTUNITY_REAL_RETURN_PCT);
    });

    it("annualSavings e' sempre 12 * monthlySavings", () => {
        const r = computeSavingsOpportunity({ monthlySavings: 350 });
        expect(r).not.toBeNull();
        expect(r!.annualSavings).toBe(4200);
    });

    it("calcola correttamente il future value canonico (€500/mese @ 4% reale per 30 anni)", () => {
        // FV di rendita posticipata mensile, PMT=500, anni=30, r=4% reale.
        // Tolleranza ampia perche' la formula esatta usa la conversione esatta
        // m = (1+r)^(1/12) - 1 (vedi subscription-opportunity.ts).
        // Atteso ~ €345k (range tarato sul comportamento attuale del compound engine).
        const r = computeSavingsOpportunity({ monthlySavings: 500, years: 30, realReturnPct: 4 });
        expect(r).not.toBeNull();
        expect(r!.totalContributed).toBe(180000); // 500 * 12 * 30
        expect(r!.futureValueReal).toBeGreaterThan(330000);
        expect(r!.futureValueReal).toBeLessThan(360000);
        expect(r!.compoundGain).toBeCloseTo(r!.futureValueReal - r!.totalContributed, 6);
    });

    it("future value cresce monotonicamente con il rendimento reale", () => {
        const low = computeSavingsOpportunity({ monthlySavings: 200, years: 20, realReturnPct: 1 });
        const mid = computeSavingsOpportunity({ monthlySavings: 200, years: 20, realReturnPct: 4 });
        const high = computeSavingsOpportunity({ monthlySavings: 200, years: 20, realReturnPct: 7 });
        expect(low!.futureValueReal).toBeLessThan(mid!.futureValueReal);
        expect(mid!.futureValueReal).toBeLessThan(high!.futureValueReal);
    });

    it("future value cresce monotonicamente con l'orizzonte temporale", () => {
        const short = computeSavingsOpportunity({ monthlySavings: 200, years: 10, realReturnPct: 4 });
        const medium = computeSavingsOpportunity({ monthlySavings: 200, years: 20, realReturnPct: 4 });
        const long = computeSavingsOpportunity({ monthlySavings: 200, years: 30, realReturnPct: 4 });
        expect(short!.futureValueReal).toBeLessThan(medium!.futureValueReal);
        expect(medium!.futureValueReal).toBeLessThan(long!.futureValueReal);
    });

    it("future value scala linearmente col risparmio mensile (proprieta' della rendita)", () => {
        // Raddoppiando il PMT, il FV raddoppia esattamente: e' la linearita' della rendita posticipata.
        const a = computeSavingsOpportunity({ monthlySavings: 200, years: 20, realReturnPct: 4 });
        const b = computeSavingsOpportunity({ monthlySavings: 400, years: 20, realReturnPct: 4 });
        expect(b!.futureValueReal / a!.futureValueReal).toBeCloseTo(2, 6);
    });

    it("rendimento reale 0% -> future value coincide con il totale versato (no composto)", () => {
        const r = computeSavingsOpportunity({ monthlySavings: 250, years: 10, realReturnPct: 0 });
        expect(r!.totalContributed).toBe(30000); // 250 * 12 * 10
        expect(r!.futureValueReal).toBe(30000);
        expect(r!.compoundGain).toBe(0);
    });

    it("compoundGain > 0 con rendimento reale positivo e risparmio positivo (effetto composto)", () => {
        const r = computeSavingsOpportunity({ monthlySavings: 100, years: 25, realReturnPct: 4 });
        expect(r!.compoundGain).toBeGreaterThan(0);
    });

    it("years viene normalizzato dal modulo a valle (years frazionario o negativo gestiti)", () => {
        const frac = computeSavingsOpportunity({ monthlySavings: 100, years: 9.9, realReturnPct: 4 });
        expect(frac!.years).toBe(9); // .floor

        const neg = computeSavingsOpportunity({ monthlySavings: 100, years: -5, realReturnPct: 4 });
        expect(neg!.years).toBe(0);
        expect(neg!.totalContributed).toBe(0);
        expect(neg!.futureValueReal).toBe(0);
    });

    it("realReturnPct = Infinity non propaga NaN/Infinity al risultato", () => {
        const r = computeSavingsOpportunity({ monthlySavings: 100, years: 30, realReturnPct: Infinity });
        expect(r).not.toBeNull();
        expect(Number.isFinite(r!.futureValueReal)).toBe(true);
    });

    it("monthlySavings molto piccolo (centesimi) non rompe il calcolo", () => {
        const r = computeSavingsOpportunity({ monthlySavings: 0.01, years: 30, realReturnPct: 4 });
        expect(r).not.toBeNull();
        expect(r!.futureValueReal).toBeGreaterThan(0);
        expect(Number.isFinite(r!.futureValueReal)).toBe(true);
    });
});
