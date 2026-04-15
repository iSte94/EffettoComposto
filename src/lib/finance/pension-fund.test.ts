import { describe, it, expect } from 'vitest';
import {
    liquidatePensionFund,
    shouldLiquidatePensionFund,
} from './pension-fund';

describe('liquidatePensionFund', () => {
    it('returns zeros when pension capital is zero or negative', () => {
        const r = liquidatePensionFund({
            pensionCap: 0,
            exitTaxRate: 15,
            exitMode: 'hybrid',
            accessAge: 62,
            lifeExpectancy: 85,
        });
        expect(r.cashLump).toBe(0);
        expect(r.monthlyAnnuity).toBe(0);
        expect(r.netCapital).toBe(0);

        const r2 = liquidatePensionFund({
            pensionCap: -5000,
            exitTaxRate: 15,
            exitMode: 'annuity',
            accessAge: 62,
            lifeExpectancy: 85,
        });
        expect(r2.monthlyAnnuity).toBe(0);
    });

    it('applies exit tax correctly in annuity mode', () => {
        // 100k netto dopo il 15% = 85k; mesi = (85-62)*12 = 276
        const r = liquidatePensionFund({
            pensionCap: 100000,
            exitTaxRate: 15,
            exitMode: 'annuity',
            accessAge: 62,
            lifeExpectancy: 85,
        });
        expect(r.netCapital).toBeCloseTo(85000, 6);
        expect(r.cashLump).toBe(0);
        expect(r.monthlyAnnuity).toBeCloseTo(85000 / 276, 6);
    });

    it('splits 50/50 in hybrid mode', () => {
        const r = liquidatePensionFund({
            pensionCap: 100000,
            exitTaxRate: 15,
            exitMode: 'hybrid',
            accessAge: 62,
            lifeExpectancy: 85,
        });
        // 85k * 0.5 = 42500 cash, 42500 spalmato su 276 mesi
        expect(r.cashLump).toBeCloseTo(42500, 6);
        expect(r.monthlyAnnuity).toBeCloseTo(42500 / 276, 6);
    });

    it('clamps exit tax rate to [0, 100]', () => {
        const negative = liquidatePensionFund({
            pensionCap: 100000,
            exitTaxRate: -10,
            exitMode: 'annuity',
            accessAge: 62,
            lifeExpectancy: 85,
        });
        // Tax = 0 → netto = 100k
        expect(negative.netCapital).toBeCloseTo(100000, 6);

        const huge = liquidatePensionFund({
            pensionCap: 100000,
            exitTaxRate: 500,
            exitMode: 'annuity',
            accessAge: 62,
            lifeExpectancy: 85,
        });
        // Tax = 100% → netto = 0
        expect(huge.netCapital).toBeCloseTo(0, 6);
        expect(huge.monthlyAnnuity).toBeCloseTo(0, 6);
    });

    it('avoids division by zero when lifeExpectancy <= accessAge', () => {
        const r = liquidatePensionFund({
            pensionCap: 100000,
            exitTaxRate: 15,
            exitMode: 'annuity',
            accessAge: 85,
            lifeExpectancy: 85,
        });
        // (85-85)*12 = 0 → clamped a 1 mese
        expect(Number.isFinite(r.monthlyAnnuity)).toBe(true);
        expect(r.monthlyAnnuity).toBeCloseTo(85000, 6);
    });

    it('handles NaN / Infinity capital gracefully', () => {
        const r = liquidatePensionFund({
            pensionCap: Number.NaN,
            exitTaxRate: 15,
            exitMode: 'annuity',
            accessAge: 62,
            lifeExpectancy: 85,
        });
        expect(r.cashLump).toBe(0);
        expect(r.monthlyAnnuity).toBe(0);
    });
});

describe('shouldLiquidatePensionFund (bug regression)', () => {
    it('returns false once already accessed (idempotent)', () => {
        expect(shouldLiquidatePensionFund(62, 62, true)).toBe(false);
        expect(shouldLiquidatePensionFund(70, 62, true)).toBe(false);
    });

    it('returns true at the exact access age', () => {
        expect(shouldLiquidatePensionFund(62, 62, false)).toBe(true);
    });

    // REGRESSION: il bug originale usava `yAge === pensionFundAccessAge` e
    // non liquidava MAI se l'eta' di partenza era gia' oltre l'eta' di accesso.
    it('BUG FIX: liquidates when currentAge > accessAge (was skipped before)', () => {
        // Esempio: utente di 65 anni con fondo pensione accessibile dai 62.
        expect(shouldLiquidatePensionFund(65, 62, false)).toBe(true);
    });

    // REGRESSION: il bug originale usava strict equality, fallendo per eta'
    // non intere (es. se currentAge e' 32.5).
    it('BUG FIX: liquidates with fractional ages (strict === would fail)', () => {
        expect(shouldLiquidatePensionFund(62.5, 62, false)).toBe(true);
        expect(shouldLiquidatePensionFund(61.99, 62, false)).toBe(false);
    });

    it('returns false before access age', () => {
        expect(shouldLiquidatePensionFund(50, 62, false)).toBe(false);
        expect(shouldLiquidatePensionFund(0, 62, false)).toBe(false);
    });

    it('rejects non-finite inputs safely', () => {
        expect(shouldLiquidatePensionFund(Number.NaN, 62, false)).toBe(false);
        expect(shouldLiquidatePensionFund(62, Number.NaN, false)).toBe(false);
        expect(shouldLiquidatePensionFund(Number.POSITIVE_INFINITY, 62, false)).toBe(false);
    });
});
