import { describe, it, expect } from 'vitest';
import { calculateIrpef } from './irpef';

describe('calculateIrpef', () => {
    it('returns 0 for zero income', () => {
        expect(calculateIrpef(0)).toBe(0);
    });

    it('returns 0 for negative income', () => {
        expect(calculateIrpef(-5000)).toBe(0);
    });

    it('calculates first bracket correctly (23% up to 28k)', () => {
        expect(calculateIrpef(10000)).toBe(2300);
        expect(calculateIrpef(28000)).toBe(6440);
    });

    it('calculates second bracket correctly (35% from 28k to 50k)', () => {
        // 28000 * 0.23 + 2000 * 0.35 = 6440 + 700 = 7140
        expect(calculateIrpef(30000)).toBe(7140);
        // 28000 * 0.23 + 22000 * 0.35 = 6440 + 7700 = 14140
        expect(calculateIrpef(50000)).toBe(14140);
    });

    it('calculates third bracket correctly (43% above 50k)', () => {
        // 6440 + 7700 + 10000 * 0.43 = 14140 + 4300 = 18440
        expect(calculateIrpef(60000)).toBe(18440);
        // 6440 + 7700 + 50000 * 0.43 = 14140 + 21500 = 35640
        expect(calculateIrpef(100000)).toBe(35640);
    });

    it('deducts pension contribution before calculating tax', () => {
        // 30000 gross - 5000 pension = 25000 taxable
        // 25000 * 0.23 = 5750
        expect(calculateIrpef(30000, 5000)).toBe(5750);
    });

    it('pension contribution cannot make taxable income negative', () => {
        // 10000 gross - 20000 pension = 0 taxable
        expect(calculateIrpef(10000, 20000)).toBe(0);
    });

    it('handles boundary values exactly', () => {
        // Exactly at 28000 boundary
        const at28k = calculateIrpef(28000);
        const just_above = calculateIrpef(28001);
        expect(just_above - at28k).toBeCloseTo(0.35, 1);

        // Exactly at 50000 boundary
        const at50k = calculateIrpef(50000);
        const just_above50k = calculateIrpef(50001);
        expect(just_above50k - at50k).toBeCloseTo(0.43, 1);
    });
});
