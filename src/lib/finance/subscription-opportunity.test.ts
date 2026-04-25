import { describe, it, expect } from "vitest";
import {
    computeSubscriptionOpportunityCost,
    DEFAULT_SUBSCRIPTION_OPPORTUNITY_HORIZON_YEARS,
    DEFAULT_SUBSCRIPTION_OPPORTUNITY_REAL_RETURN_PCT,
} from "./subscription-opportunity";

describe("computeSubscriptionOpportunityCost", () => {
    it("usa i default canonici quando years e realReturnPct sono omessi", () => {
        const r = computeSubscriptionOpportunityCost({ monthlyAmount: 100 });
        expect(r.years).toBe(DEFAULT_SUBSCRIPTION_OPPORTUNITY_HORIZON_YEARS);
        expect(r.realReturnPct).toBe(DEFAULT_SUBSCRIPTION_OPPORTUNITY_REAL_RETURN_PCT);
    });

    it("monthlyAmount = 0 produce zero su tutti i ritorni numerici", () => {
        const r = computeSubscriptionOpportunityCost({ monthlyAmount: 0, years: 30, realReturnPct: 4 });
        expect(r.totalContributed).toBe(0);
        expect(r.futureValueReal).toBe(0);
        expect(r.compoundGain).toBe(0);
    });

    it("years = 0 -> totalContributed e futureValueReal sono zero, gain zero", () => {
        const r = computeSubscriptionOpportunityCost({ monthlyAmount: 100, years: 0, realReturnPct: 4 });
        expect(r.totalContributed).toBe(0);
        expect(r.futureValueReal).toBe(0);
        expect(r.compoundGain).toBe(0);
    });

    it("rendimento reale 0% -> future value = totale versato, gain = 0", () => {
        const r = computeSubscriptionOpportunityCost({ monthlyAmount: 100, years: 10, realReturnPct: 0 });
        expect(r.totalContributed).toBe(12000); // 100 * 12 * 10
        expect(r.futureValueReal).toBe(12000);
        expect(r.compoundGain).toBe(0);
    });

    it("calcola correttamente il future value @ 4% reale per 30 anni (latte factor classico)", () => {
        // FV di rendita posticipata mensile, PMT=50, anni=30, r=4% reale.
        // monthlyRate = 1.04^(1/12) - 1 ~ 0.0032737
        // months = 360. annuityFactor = ((1+m)^360 - 1)/m ~ 690.5 (con conversione esatta).
        // FV ~ 50 * 690.5 ~ 34_525. Tolleranza ampia perche' la conversione esatta
        // (m = (1+r)^(1/12)-1) differisce dal naive r/12 di qualche punto percentuale
        // sul finale a 30 anni.
        const r = computeSubscriptionOpportunityCost({ monthlyAmount: 50, years: 30, realReturnPct: 4 });
        expect(r.totalContributed).toBe(18000);
        expect(r.futureValueReal).toBeGreaterThan(33000);
        expect(r.futureValueReal).toBeLessThan(36000);
        expect(r.compoundGain).toBeCloseTo(r.futureValueReal - r.totalContributed, 6);
    });

    it("future value cresce monotonicamente con il rendimento reale", () => {
        const low = computeSubscriptionOpportunityCost({ monthlyAmount: 100, years: 20, realReturnPct: 1 });
        const mid = computeSubscriptionOpportunityCost({ monthlyAmount: 100, years: 20, realReturnPct: 4 });
        const high = computeSubscriptionOpportunityCost({ monthlyAmount: 100, years: 20, realReturnPct: 7 });
        expect(low.futureValueReal).toBeLessThan(mid.futureValueReal);
        expect(mid.futureValueReal).toBeLessThan(high.futureValueReal);
    });

    it("future value cresce monotonicamente con l'orizzonte temporale", () => {
        const short = computeSubscriptionOpportunityCost({ monthlyAmount: 100, years: 10, realReturnPct: 4 });
        const medium = computeSubscriptionOpportunityCost({ monthlyAmount: 100, years: 20, realReturnPct: 4 });
        const long = computeSubscriptionOpportunityCost({ monthlyAmount: 100, years: 30, realReturnPct: 4 });
        expect(short.futureValueReal).toBeLessThan(medium.futureValueReal);
        expect(medium.futureValueReal).toBeLessThan(long.futureValueReal);
    });

    it("compoundGain e' positivo con rendimento reale > 0 e monthlyAmount > 0", () => {
        const r = computeSubscriptionOpportunityCost({ monthlyAmount: 30, years: 25, realReturnPct: 4 });
        expect(r.compoundGain).toBeGreaterThan(0);
    });

    it("sanitizza input NaN/Infinity senza propagarli", () => {
        const nan = computeSubscriptionOpportunityCost({ monthlyAmount: NaN, years: 30, realReturnPct: 4 });
        expect(Number.isFinite(nan.futureValueReal)).toBe(true);
        expect(nan.futureValueReal).toBe(0);

        const inf = computeSubscriptionOpportunityCost({ monthlyAmount: 100, years: 30, realReturnPct: Infinity });
        expect(Number.isFinite(inf.futureValueReal)).toBe(true);

        const negYears = computeSubscriptionOpportunityCost({ monthlyAmount: 100, years: -5, realReturnPct: 4 });
        expect(negYears.years).toBe(0);
        expect(negYears.totalContributed).toBe(0);
    });

    it("valori negativi di monthlyAmount sono clampati a zero", () => {
        const r = computeSubscriptionOpportunityCost({ monthlyAmount: -200, years: 30, realReturnPct: 4 });
        expect(r.totalContributed).toBe(0);
        expect(r.futureValueReal).toBe(0);
    });

    it("years viene troncato a intero (.floor)", () => {
        const r = computeSubscriptionOpportunityCost({ monthlyAmount: 100, years: 9.9, realReturnPct: 4 });
        expect(r.years).toBe(9);
    });
});
