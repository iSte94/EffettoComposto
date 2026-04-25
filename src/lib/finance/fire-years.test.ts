import { describe, it, expect } from "vitest";
import {
    estimateYearsToFire,
    FIRE_YEARS_DEFAULT_REAL_RETURN_PCT,
    FIRE_YEARS_DEFAULT_SWR_PCT,
    FIRE_YEARS_MAX,
} from "./fire-years";

describe("estimateYearsToFire", () => {
    it("ritorna null se reddito o spese o risparmio non sono positivi", () => {
        expect(estimateYearsToFire({ monthlyIncome: 0, monthlyExpenses: 1500, monthlySavings: 500 })).toBeNull();
        expect(estimateYearsToFire({ monthlyIncome: 2000, monthlyExpenses: 0, monthlySavings: 500 })).toBeNull();
        expect(estimateYearsToFire({ monthlyIncome: 2000, monthlyExpenses: 1500, monthlySavings: 0 })).toBeNull();
        expect(estimateYearsToFire({ monthlyIncome: 2000, monthlyExpenses: 1500, monthlySavings: -100 })).toBeNull();
    });

    it("ritorna null se il risparmio supera o eguaglia il reddito (caso non realistico)", () => {
        expect(estimateYearsToFire({ monthlyIncome: 2000, monthlyExpenses: 0, monthlySavings: 2000 })).toBeNull();
    });

    it("usa i default per realReturn e SWR", () => {
        const r = estimateYearsToFire({ monthlyIncome: 3000, monthlyExpenses: 2000, monthlySavings: 1000 });
        expect(r).not.toBeNull();
        expect(r!.realReturnPct).toBe(FIRE_YEARS_DEFAULT_REAL_RETURN_PCT);
        expect(r!.swrPct).toBe(FIRE_YEARS_DEFAULT_SWR_PCT);
    });

    it("calcola correttamente target FIRE = annualExpenses / SWR", () => {
        const r = estimateYearsToFire({
            monthlyIncome: 4000,
            monthlyExpenses: 2000, // 24k/anno
            monthlySavings: 2000,
            swrPct: 4, // 4% SWR -> target = 25× annualExpenses = 600k
        });
        expect(r!.fireTarget).toBeCloseTo(600_000, -1);
    });

    it("savingsRatePct riflette la quota mensile (non quella annuale)", () => {
        const r = estimateYearsToFire({ monthlyIncome: 4000, monthlyExpenses: 3000, monthlySavings: 1000 });
        expect(r!.savingsRatePct).toBeCloseTo(25, 5);
    });

    it("riproduce la 'shockingly simple math' di MMM (50% savings @ 5% real)", () => {
        // Caso classico Networthify: 50% savings rate + 5% real return + 4% SWR
        // partendo da capitale zero -> circa 17 anni al FIRE.
        const r = estimateYearsToFire({
            monthlyIncome: 4000,
            monthlyExpenses: 2000,
            monthlySavings: 2000,
            netWorth: 0,
            realReturnPct: 5,
            swrPct: 4,
        });
        expect(r).not.toBeNull();
        expect(r!.yearsToFire).toBeGreaterThan(16);
        expect(r!.yearsToFire).toBeLessThan(18);
    });

    it("tassi di risparmio bassi producono orizzonti molto lunghi (10% @ 5% real)", () => {
        // 10% savings @ 5% real ~ 51 anni (Networthify reference).
        const r = estimateYearsToFire({
            monthlyIncome: 4000,
            monthlyExpenses: 3600,
            monthlySavings: 400,
            netWorth: 0,
            realReturnPct: 5,
            swrPct: 4,
        });
        expect(r!.yearsToFire).toBeGreaterThan(48);
        expect(r!.yearsToFire).toBeLessThan(54);
    });

    it("aumentare il tasso di risparmio riduce drasticamente il tempo (monotonia)", () => {
        const params = {
            monthlyIncome: 5000,
            monthlyExpenses: 3000,
            netWorth: 0,
            realReturnPct: 4,
            swrPct: 3.25,
        };
        const r10 = estimateYearsToFire({ ...params, monthlySavings: 500 })!;
        const r30 = estimateYearsToFire({ ...params, monthlySavings: 1500 })!;
        const r60 = estimateYearsToFire({ ...params, monthlySavings: 3000 })!;
        expect(r10.yearsToFire).toBeGreaterThan(r30.yearsToFire);
        expect(r30.yearsToFire).toBeGreaterThan(r60.yearsToFire);
    });

    it("il capitale gia' accumulato accorcia il percorso (monotonia)", () => {
        const base = {
            monthlyIncome: 4000,
            monthlyExpenses: 2500,
            monthlySavings: 1500,
            realReturnPct: 4,
            swrPct: 3.25,
        };
        const r0 = estimateYearsToFire({ ...base, netWorth: 0 })!;
        const r100k = estimateYearsToFire({ ...base, netWorth: 100_000 })!;
        const r500k = estimateYearsToFire({ ...base, netWorth: 500_000 })!;
        expect(r100k.yearsToFire).toBeLessThan(r0.yearsToFire);
        expect(r500k.yearsToFire).toBeLessThan(r100k.yearsToFire);
    });

    it("se il patrimonio raggiunge gia' il target restituisce alreadyFire", () => {
        const r = estimateYearsToFire({
            monthlyIncome: 4000,
            monthlyExpenses: 2000,
            monthlySavings: 500,
            netWorth: 1_000_000,
            swrPct: 4, // target = 600k, netWorth lo supera
        });
        expect(r).not.toBeNull();
        expect(r!.alreadyFire).toBe(true);
        expect(r!.yearsToFire).toBe(0);
        expect(r!.fireGap).toBe(0);
    });

    it("rendimento reale zero: cade su modello lineare non-NaN", () => {
        // gap = 600k, savings = 24k/anno -> 25 anni esatti
        const r = estimateYearsToFire({
            monthlyIncome: 4000,
            monthlyExpenses: 2000,
            monthlySavings: 2000,
            netWorth: 0,
            realReturnPct: 0,
            swrPct: 4,
        });
        expect(r).not.toBeNull();
        expect(Number.isFinite(r!.yearsToFire)).toBe(true);
        expect(r!.yearsToFire).toBeCloseTo(25, 5);
    });

    it("capa il risultato a FIRE_YEARS_MAX quando il piano e' irrealisticamente lungo", () => {
        // Risparmio simbolico vs spese alte: oltre 100 anni.
        const r = estimateYearsToFire({
            monthlyIncome: 4000,
            monthlyExpenses: 3990,
            monthlySavings: 10,
            netWorth: 0,
            realReturnPct: 1,
            swrPct: 4,
        });
        expect(r).not.toBeNull();
        expect(r!.capped).toBe(true);
        expect(r!.yearsToFire).toBe(FIRE_YEARS_MAX);
    });

    it("non restituisce mai NaN o Infinity per input finiti positivi", () => {
        const r = estimateYearsToFire({
            monthlyIncome: 1234.5,
            monthlyExpenses: 678.9,
            monthlySavings: 555.6,
            netWorth: 12345,
            realReturnPct: 3.7,
            swrPct: 3.25,
        });
        expect(Number.isFinite(r!.yearsToFire)).toBe(true);
        expect(Number.isFinite(r!.fireTarget)).toBe(true);
        expect(Number.isFinite(r!.fireGap)).toBe(true);
        expect(Number.isFinite(r!.savingsRatePct)).toBe(true);
    });
});
