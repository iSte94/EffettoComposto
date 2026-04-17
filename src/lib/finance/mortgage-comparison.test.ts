import { describe, it, expect } from "vitest";

// Extract the pure calculation logic from the component for testing.
// These replicate the functions in mortgage-comparison.tsx.

function calculateScenario(s: { propertyPrice: number; downpayment: number; rate: number; years: number }) {
    const loanAmount = Math.max(0, s.propertyPrice - s.downpayment);
    const monthlyRate = (s.rate / 100) / 12;
    const numPayments = Math.max(0, s.years * 12);
    let monthlyPayment = 0;
    if (loanAmount > 0 && numPayments > 0) {
        if (monthlyRate > 0) {
            const factor = Math.pow(1 + monthlyRate, numPayments);
            monthlyPayment = (loanAmount * monthlyRate * factor) / (factor - 1);
        } else {
            monthlyPayment = loanAmount / numPayments;
        }
    }
    const totalPaid = monthlyPayment * numPayments;
    const totalInterest = Math.max(0, totalPaid - loanAmount);
    return { loanAmount, monthlyPayment, totalPaid, totalInterest };
}

function calculateRemainingDebt(loanAmount: number, rate: number, years: number, yearsPassed: number) {
    const monthlyRate = (rate / 100) / 12;
    const numPayments = years * 12;
    const monthsPassed = yearsPassed * 12;
    if (numPayments <= 0) return Math.max(0, loanAmount);
    if (monthlyRate > 0 && loanAmount > 0) {
        const factor = Math.pow(1 + monthlyRate, numPayments);
        const factorPassed = Math.pow(1 + monthlyRate, monthsPassed);
        return Math.max(0, Math.round(loanAmount * (factor - factorPassed) / (factor - 1)));
    }
    const perMonth = loanAmount / numPayments;
    return Math.max(0, Math.round(loanAmount - perMonth * monthsPassed));
}

describe("mortgage comparison: calculateScenario", () => {
    it("calcola correttamente un mutuo standard", () => {
        const r = calculateScenario({ propertyPrice: 200000, downpayment: 40000, rate: 3.5, years: 25 });
        expect(r.loanAmount).toBe(160000);
        expect(r.monthlyPayment).toBeGreaterThan(700);
        expect(r.monthlyPayment).toBeLessThan(900);
        expect(r.totalInterest).toBeGreaterThan(0);
        expect(Number.isFinite(r.monthlyPayment)).toBe(true);
    });

    it("non produce NaN/Infinity con years = 0", () => {
        const r = calculateScenario({ propertyPrice: 200000, downpayment: 40000, rate: 3.5, years: 0 });
        expect(Number.isFinite(r.monthlyPayment)).toBe(true);
        expect(Number.isFinite(r.totalPaid)).toBe(true);
        expect(Number.isFinite(r.totalInterest)).toBe(true);
        expect(r.monthlyPayment).toBe(0);
        expect(r.totalPaid).toBe(0);
        expect(r.totalInterest).toBe(0);
    });

    it("non produce NaN/Infinity con rate = 0", () => {
        const r = calculateScenario({ propertyPrice: 200000, downpayment: 40000, rate: 0, years: 25 });
        expect(Number.isFinite(r.monthlyPayment)).toBe(true);
        expect(r.monthlyPayment).toBeCloseTo(160000 / 300, 0);
        expect(r.totalInterest).toBe(0);
    });

    it("non produce NaN/Infinity con rate = 0 e years = 0", () => {
        const r = calculateScenario({ propertyPrice: 200000, downpayment: 40000, rate: 0, years: 0 });
        expect(Number.isFinite(r.monthlyPayment)).toBe(true);
        expect(r.monthlyPayment).toBe(0);
    });

    it("gestisce anticipo >= prezzo immobile", () => {
        const r = calculateScenario({ propertyPrice: 200000, downpayment: 250000, rate: 3.5, years: 25 });
        expect(r.loanAmount).toBe(0);
        expect(r.monthlyPayment).toBe(0);
        expect(r.totalInterest).toBe(0);
    });

    it("gestisce prezzo immobile = 0", () => {
        const r = calculateScenario({ propertyPrice: 0, downpayment: 0, rate: 3.5, years: 25 });
        expect(r.loanAmount).toBe(0);
        expect(r.monthlyPayment).toBe(0);
    });

    it("gestisce years negativi senza crash", () => {
        const r = calculateScenario({ propertyPrice: 200000, downpayment: 40000, rate: 3.5, years: -5 });
        expect(Number.isFinite(r.monthlyPayment)).toBe(true);
        expect(r.monthlyPayment).toBe(0);
    });
});

describe("mortgage comparison: calculateRemainingDebt", () => {
    it("debito al giorno zero = importo mutuo", () => {
        const d = calculateRemainingDebt(160000, 3.5, 25, 0);
        expect(d).toBe(160000);
    });

    it("debito decresce nel tempo", () => {
        const d5 = calculateRemainingDebt(160000, 3.5, 25, 5);
        const d15 = calculateRemainingDebt(160000, 3.5, 25, 15);
        expect(d5).toBeLessThan(160000);
        expect(d15).toBeLessThan(d5);
    });

    it("debito alla fine = 0", () => {
        const d = calculateRemainingDebt(160000, 3.5, 25, 25);
        expect(d).toBe(0);
    });

    it("non produce NaN/Infinity con numPayments = 0", () => {
        const d = calculateRemainingDebt(160000, 3.5, 0, 0);
        expect(Number.isFinite(d)).toBe(true);
        expect(d).toBe(160000);
    });

    it("gestisce tasso 0% correttamente", () => {
        const d = calculateRemainingDebt(120000, 0, 10, 5);
        expect(d).toBe(60000);
    });
});
