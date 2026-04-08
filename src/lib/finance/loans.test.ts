import { describe, it, expect } from 'vitest';
import { calculateRemainingDebt, getInstallmentAmountForMonth, calculateGrowthRate } from './loans';
import type { ExistingLoan } from './loans';

function makeLoan(overrides: Partial<ExistingLoan> = {}): ExistingLoan {
    return {
        id: '1',
        name: 'Test Loan',
        category: 'Personale',
        installment: 500,
        startDate: '2020-01',
        endDate: '2025-01',
        ...overrides,
    };
}

describe('calculateRemainingDebt', () => {
    it('returns 0 for undefined loan', () => {
        expect(calculateRemainingDebt(undefined)).toBe(0);
    });

    it('returns 0 when no dates provided', () => {
        expect(calculateRemainingDebt(makeLoan({ startDate: '', endDate: '' }))).toBe(0);
    });

    it('returns currentRemainingDebt if explicitly set', () => {
        const now = new Date();
        const loan = makeLoan({
            currentRemainingDebt: 12345,
            startDate: `${now.getFullYear() - 1}-01`,
            endDate: `${now.getFullYear() + 3}-01`,
        });
        expect(calculateRemainingDebt(loan)).toBe(12345);
    });

    it('returns 0 when loan is fully repaid (endDate in the past)', () => {
        const loan = makeLoan({ startDate: '2018-01', endDate: '2020-01' });
        expect(calculateRemainingDebt(loan)).toBe(0);
    });

    it('calculates French amortization remaining debt correctly', () => {
        // Loan: 100k, 5% annual, 10 years (120 months)
        // After 60 months, ~55% of principal should remain
        const loan = makeLoan({
            startDate: '2020-06',
            endDate: '2030-06',
            originalAmount: 100000,
            interestRate: 5,
            installment: 1060.66,
        });
        const debt = calculateRemainingDebt(loan);
        // Remaining debt after ~5 years should be roughly 55k-60k range
        expect(debt).toBeGreaterThan(40000);
        expect(debt).toBeLessThan(70000);
    });

    it('uses linear approximation when only originalAmount is known (no rate)', () => {
        const loan = makeLoan({
            startDate: '2023-01',
            endDate: '2027-01',
            originalAmount: 48000,
            interestRate: 0,
        });
        const debt = calculateRemainingDebt(loan);
        // Linear: should decrease proportionally
        expect(debt).toBeGreaterThan(0);
        expect(debt).toBeLessThan(48000);
    });

    it('falls back to installment * remainingMonths when no originalAmount', () => {
        const now = new Date();
        const endYear = now.getFullYear() + 2;
        const loan = makeLoan({
            startDate: `${now.getFullYear() - 1}-01`,
            endDate: `${endYear}-01`,
            installment: 300,
        });
        const debt = calculateRemainingDebt(loan);
        expect(debt).toBeGreaterThan(0);
        // Should be roughly installment * remaining months
        expect(debt).toBeLessThanOrEqual(300 * 36);
    });
});

describe('getInstallmentAmountForMonth', () => {
    it('returns the fixed installment for a standard loan', () => {
        const loan = makeLoan({ installment: 500, isVariable: false });
        const result = getInstallmentAmountForMonth(loan, 12, 60, 12);
        expect(result).toBe(500);
    });

    it('calculates installment from principal and rate when installment is 0', () => {
        const loan = makeLoan({
            installment: 0,
            originalAmount: 100000,
            interestRate: 5,
            startDate: '2020-01',
            endDate: '2030-01',
        });
        const totalMonths = 120;
        const result = getInstallmentAmountForMonth(loan, 0, totalMonths, 0);
        // French amortization: ~1060 per month
        expect(result).toBeGreaterThan(1000);
        expect(result).toBeLessThan(1200);
    });

    it('returns 0 when installment is 0 and no principal/rate info', () => {
        const loan = makeLoan({ installment: 0 });
        expect(getInstallmentAmountForMonth(loan, 0, 60, 0)).toBe(0);
    });
});

describe('calculateGrowthRate', () => {
    it('returns 0 for non-variable loans', () => {
        const loan = makeLoan({ isVariable: false, originalAmount: 100000, interestRate: 5 });
        expect(calculateGrowthRate(loan, 120, 0)).toBe(0);
    });

    it('returns 0 when no principal is available', () => {
        const loan = makeLoan({ originalAmount: undefined, currentRemainingDebt: undefined });
        expect(calculateGrowthRate(loan, 60, 0)).toBe(0);
    });

    it('returns 0 when remaining months is 0', () => {
        const loan = makeLoan({ originalAmount: 100000, interestRate: 5 });
        expect(calculateGrowthRate(loan, 60, 60)).toBe(0);
    });
});
