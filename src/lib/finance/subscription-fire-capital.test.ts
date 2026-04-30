import { describe, it, expect } from "vitest";
import {
    computeSubscriptionFireCapital,
    DEFAULT_SUBSCRIPTION_FIRE_SWR_PCT,
} from "./subscription-fire-capital";

describe("computeSubscriptionFireCapital", () => {
    it("usa il SWR di default (3.25%) quando omesso", () => {
        const r = computeSubscriptionFireCapital({ monthlyAmount: 100 });
        expect(r.swrPct).toBe(DEFAULT_SUBSCRIPTION_FIRE_SWR_PCT);
        // 100 EUR/mese -> 1200 EUR/anno -> 1200 / 0.0325 ~ 36_923 EUR.
        expect(r.requiredFireCapital).toBeCloseTo(1200 / (DEFAULT_SUBSCRIPTION_FIRE_SWR_PCT / 100), 4);
    });

    it("monthlyAmount = 0 -> requiredFireCapital = 0 e annualCost = 0", () => {
        const r = computeSubscriptionFireCapital({ monthlyAmount: 0, swrPct: 3.25 });
        expect(r.annualCost).toBe(0);
        expect(r.requiredFireCapital).toBe(0);
    });

    it("regola del 25x classica al 4% SWR", () => {
        const r = computeSubscriptionFireCapital({ monthlyAmount: 100, swrPct: 4 });
        expect(r.capitalMultiplier).toBeCloseTo(25, 6);
        // 100 * 12 = 1200 -> 1200 * 25 = 30_000.
        expect(r.requiredFireCapital).toBeCloseTo(30_000, 6);
    });

    it("regola del ~30.77x al 3.25% SWR", () => {
        const r = computeSubscriptionFireCapital({ monthlyAmount: 50, swrPct: 3.25 });
        expect(r.capitalMultiplier).toBeCloseTo(30.7692, 3);
        // 50 * 12 = 600 -> 600 / 0.0325 ~ 18461.54.
        expect(r.requiredFireCapital).toBeCloseTo(600 / 0.0325, 3);
    });

    it("requiredFireCapital cresce linearmente con la spesa mensile", () => {
        const a = computeSubscriptionFireCapital({ monthlyAmount: 50, swrPct: 3.25 });
        const b = computeSubscriptionFireCapital({ monthlyAmount: 100, swrPct: 3.25 });
        const c = computeSubscriptionFireCapital({ monthlyAmount: 200, swrPct: 3.25 });
        expect(b.requiredFireCapital).toBeCloseTo(a.requiredFireCapital * 2, 4);
        expect(c.requiredFireCapital).toBeCloseTo(a.requiredFireCapital * 4, 4);
    });

    it("requiredFireCapital decresce con SWR piu' alto (a parita' di spesa)", () => {
        const low = computeSubscriptionFireCapital({ monthlyAmount: 100, swrPct: 2 });
        const mid = computeSubscriptionFireCapital({ monthlyAmount: 100, swrPct: 3.25 });
        const high = computeSubscriptionFireCapital({ monthlyAmount: 100, swrPct: 4 });
        expect(low.requiredFireCapital).toBeGreaterThan(mid.requiredFireCapital);
        expect(mid.requiredFireCapital).toBeGreaterThan(high.requiredFireCapital);
    });

    it("SWR <= 0 -> requiredFireCapital = 0 (rendita perpetua indefinita)", () => {
        const zero = computeSubscriptionFireCapital({ monthlyAmount: 100, swrPct: 0 });
        expect(zero.requiredFireCapital).toBe(0);
        const neg = computeSubscriptionFireCapital({ monthlyAmount: 100, swrPct: -2 });
        expect(neg.requiredFireCapital).toBe(0);
    });

    it("sanitizza NaN/Infinity senza propagarli", () => {
        const nan = computeSubscriptionFireCapital({ monthlyAmount: NaN, swrPct: 3.25 });
        expect(Number.isFinite(nan.requiredFireCapital)).toBe(true);
        expect(nan.requiredFireCapital).toBe(0);

        const infSwr = computeSubscriptionFireCapital({ monthlyAmount: 100, swrPct: Infinity });
        // Infinity sanitizzato a default (3.25%): risultato deve essere finito.
        expect(Number.isFinite(infSwr.requiredFireCapital)).toBe(true);
        expect(infSwr.swrPct).toBe(DEFAULT_SUBSCRIPTION_FIRE_SWR_PCT);
    });

    it("monthlyAmount negativo viene clampato a zero", () => {
        const r = computeSubscriptionFireCapital({ monthlyAmount: -50, swrPct: 3.25 });
        expect(r.annualCost).toBe(0);
        expect(r.requiredFireCapital).toBe(0);
    });

    it("annualCost = monthlyAmount * 12 sempre", () => {
        const r = computeSubscriptionFireCapital({ monthlyAmount: 73.5, swrPct: 3.25 });
        expect(r.annualCost).toBeCloseTo(73.5 * 12, 6);
    });
});
