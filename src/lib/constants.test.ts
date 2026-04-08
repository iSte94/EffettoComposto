import { describe, it, expect } from 'vitest';
import { USD_TO_EUR, GBP_TO_EUR, DTI_THRESHOLD, DEFAULT_PROPERTY_APPRECIATION, IRPEF_BRACKETS } from './constants';

describe('constants', () => {
    it('USD_TO_EUR is a reasonable exchange rate', () => {
        expect(USD_TO_EUR).toBeGreaterThan(0.5);
        expect(USD_TO_EUR).toBeLessThan(1.5);
    });

    it('GBP_TO_EUR is a reasonable exchange rate', () => {
        expect(GBP_TO_EUR).toBeGreaterThan(0.8);
        expect(GBP_TO_EUR).toBeLessThan(2.0);
    });

    it('DTI_THRESHOLD is 33%', () => {
        expect(DTI_THRESHOLD).toBe(0.33);
    });

    it('DEFAULT_PROPERTY_APPRECIATION is 2%', () => {
        expect(DEFAULT_PROPERTY_APPRECIATION).toBe(0.02);
    });

    it('IRPEF_BRACKETS has correct structure', () => {
        expect(IRPEF_BRACKETS).toHaveLength(3);
        expect(IRPEF_BRACKETS[0]).toEqual({ limit: 28000, rate: 0.23 });
        expect(IRPEF_BRACKETS[1]).toEqual({ limit: 50000, rate: 0.35 });
        expect(IRPEF_BRACKETS[2]).toEqual({ limit: Infinity, rate: 0.43 });
    });

    it('IRPEF brackets are in ascending order', () => {
        for (let i = 1; i < IRPEF_BRACKETS.length; i++) {
            expect(IRPEF_BRACKETS[i].limit).toBeGreaterThan(IRPEF_BRACKETS[i - 1].limit);
        }
    });

    it('IRPEF bracket rates are increasing', () => {
        for (let i = 1; i < IRPEF_BRACKETS.length; i++) {
            expect(IRPEF_BRACKETS[i].rate).toBeGreaterThan(IRPEF_BRACKETS[i - 1].rate);
        }
    });
});
