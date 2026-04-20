import { describe, it, expect } from 'vitest';
import {
    calculateMortgagePayment,
    calculateMortgageRemainingDebt,
    calculateRemainingDebt,
    getInstallmentAmountForMonth,
    calculateGrowthRate,
} from './loans';
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

describe('calculateMortgagePayment', () => {
    it('calcola correttamente un mutuo standard (francese)', () => {
        // 160k @ 3.5% per 25 anni -> rata ~800€/mese
        const r = calculateMortgagePayment({ loanAmount: 160000, annualRatePct: 3.5, years: 25 });
        expect(r.monthlyPayment).toBeGreaterThan(790);
        expect(r.monthlyPayment).toBeLessThan(810);
        expect(Number.isFinite(r.monthlyPayment)).toBe(true);
        expect(r.totalInterest).toBeGreaterThan(0);
        expect(r.numPayments).toBe(300);
    });

    it('BUGFIX: rate=0% produce rata = capitale/n (non NaN)', () => {
        // Mutuo a tasso zero (prestito familiare / promozione). Prima produceva
        // 0/0 = NaN inquinando l'intera dashboard.
        const r = calculateMortgagePayment({ loanAmount: 120000, annualRatePct: 0, years: 10 });
        expect(Number.isFinite(r.monthlyPayment)).toBe(true);
        expect(r.monthlyPayment).toBeCloseTo(1000, 6); // 120000 / 120
        expect(r.totalInterest).toBe(0);
    });

    it('BUGFIX: years=0 ritorna zero invece di Infinity', () => {
        // Durata zero è un input edge; prima produceva numeratore positivo / 0
        // = Infinity, che mostrava "€Infinity" in UI.
        const r = calculateMortgagePayment({ loanAmount: 160000, annualRatePct: 3.5, years: 0 });
        expect(Number.isFinite(r.monthlyPayment)).toBe(true);
        expect(r.monthlyPayment).toBe(0);
        expect(r.totalPaid).toBe(0);
        expect(r.totalInterest).toBe(0);
    });

    it('BUGFIX: rate=0% e years=0 insieme non producono NaN', () => {
        const r = calculateMortgagePayment({ loanAmount: 160000, annualRatePct: 0, years: 0 });
        expect(r.monthlyPayment).toBe(0);
        expect(Number.isFinite(r.monthlyPayment)).toBe(true);
    });

    it('loanAmount = 0 ritorna tutto zero', () => {
        const r = calculateMortgagePayment({ loanAmount: 0, annualRatePct: 3.5, years: 25 });
        expect(r.monthlyPayment).toBe(0);
        expect(r.totalPaid).toBe(0);
        expect(r.totalInterest).toBe(0);
    });

    it('input negativi vengono normalizzati a 0', () => {
        const r = calculateMortgagePayment({ loanAmount: -10000, annualRatePct: -1, years: -5 });
        expect(r.monthlyPayment).toBe(0);
        expect(Number.isFinite(r.monthlyPayment)).toBe(true);
    });

    it('input NaN/Infinity vengono normalizzati a 0', () => {
        const r = calculateMortgagePayment({
            loanAmount: Number.NaN,
            annualRatePct: Number.POSITIVE_INFINITY,
            years: Number.NaN,
        });
        expect(Number.isFinite(r.monthlyPayment)).toBe(true);
        expect(r.monthlyPayment).toBe(0);
    });

    it('totalPaid = monthlyPayment * numPayments', () => {
        const r = calculateMortgagePayment({ loanAmount: 200000, annualRatePct: 4, years: 30 });
        expect(r.totalPaid).toBeCloseTo(r.monthlyPayment * r.numPayments, 6);
    });

    it('rata mutuo > capitale/n quando il tasso e\' positivo', () => {
        const r = calculateMortgagePayment({ loanAmount: 100000, annualRatePct: 5, years: 20 });
        // A tasso positivo la rata deve essere sempre maggiore della rata a tasso zero.
        expect(r.monthlyPayment).toBeGreaterThan(100000 / 240);
    });
});

describe('calculateMortgageRemainingDebt', () => {
    it('debito al mese 0 = loanAmount', () => {
        const d = calculateMortgageRemainingDebt({ loanAmount: 160000, annualRatePct: 3.5, years: 25, monthsPassed: 0 });
        expect(d).toBe(160000);
    });

    it('debito a fine piano = 0', () => {
        const d = calculateMortgageRemainingDebt({ loanAmount: 160000, annualRatePct: 3.5, years: 25, monthsPassed: 300 });
        expect(d).toBe(0);
    });

    it('debito decresce nel tempo', () => {
        const d60 = calculateMortgageRemainingDebt({ loanAmount: 160000, annualRatePct: 3.5, years: 25, monthsPassed: 60 });
        const d180 = calculateMortgageRemainingDebt({ loanAmount: 160000, annualRatePct: 3.5, years: 25, monthsPassed: 180 });
        expect(d60).toBeLessThan(160000);
        expect(d180).toBeLessThan(d60);
    });

    it('tasso zero: ammortamento lineare', () => {
        const d = calculateMortgageRemainingDebt({ loanAmount: 120000, annualRatePct: 0, years: 10, monthsPassed: 60 });
        expect(d).toBeCloseTo(60000, 6);
    });

    it('years=0 ritorna loanAmount (nessuna rata prevista)', () => {
        const d = calculateMortgageRemainingDebt({ loanAmount: 160000, annualRatePct: 3.5, years: 0, monthsPassed: 0 });
        expect(Number.isFinite(d)).toBe(true);
        expect(d).toBe(160000);
    });

    it('monthsPassed oltre la durata ritorna 0, non numeri negativi', () => {
        const d = calculateMortgageRemainingDebt({ loanAmount: 100000, annualRatePct: 4, years: 10, monthsPassed: 500 });
        expect(d).toBe(0);
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
