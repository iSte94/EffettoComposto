import { describe, it, expect } from 'vitest';
import {
    computeRealReturn,
    projectFire,
    fireDelayMonths,
} from './fire-projection';

describe('computeRealReturn (Fisher equation)', () => {
    it('usa l\'equazione di Fisher esatta, non la sottrazione approssimata', () => {
        // Caso tipico di un piano FIRE:
        // - Approssimazione naive: 7% - 3% = 4.00%
        // - Fisher esatto:         1.07 / 1.03 - 1 = 0.038834... = 3.8835%
        //
        // Questa regressione blocca un futuro "cleanup" che semplifichi la formula.
        const real = computeRealReturn(7, 3);
        expect(real).toBeCloseTo(0.038835, 5);
        expect(real).toBeLessThan(0.04); // non e' piu' la subtraction
    });

    it('coincide con l\'approssimazione per tassi molto piccoli', () => {
        // A 1% / 0.5% la differenza e' nell'ordine di 10^-5
        const fisher = computeRealReturn(1, 0.5);
        const approx = (1 - 0.5) / 100;
        expect(Math.abs(fisher - approx)).toBeLessThan(1e-4);
    });

    it('gestisce inflazione zero', () => {
        expect(computeRealReturn(5, 0)).toBeCloseTo(0.05, 10);
    });

    it('gestisce rendimento nominale zero (inflazione erode capitale)', () => {
        // 0% nominale con 2% inflazione => reale negativo
        const real = computeRealReturn(0, 2);
        expect(real).toBeLessThan(0);
        expect(real).toBeCloseTo(1 / 1.02 - 1, 10);
    });

    it('gestisce rendimento reale negativo (nominale < inflazione)', () => {
        const real = computeRealReturn(2, 5);
        expect(real).toBeLessThan(0);
        expect(real).toBeCloseTo(1.02 / 1.05 - 1, 10);
    });

    it('sanitizza input NaN/undefined a 0', () => {
        expect(computeRealReturn(NaN, 2)).toBeCloseTo(1 / 1.02 - 1, 10);
        expect(computeRealReturn(5, NaN)).toBeCloseTo(0.05, 10);
        // @ts-expect-error — volutamente undefined per testare il fallback
        expect(computeRealReturn(undefined, undefined)).toBe(0);
    });

    it('non divide per zero con inflazione <= -100%', () => {
        // Scenario degenere: (1 + inflazione/100) <= 0.
        // Ci deve essere un fallback finito.
        const real = computeRealReturn(5, -100);
        expect(Number.isFinite(real)).toBe(true);
        const real2 = computeRealReturn(5, -150);
        expect(Number.isFinite(real2)).toBe(true);
    });

    it('produce lo stesso risultato del calcolatore inflazione', () => {
        // Il calcolatore inflazione (componente UI) usa la stessa formula Fisher.
        // Questo test blocca future divergenze tra i due moduli.
        const nominal = 6.5;
        const inflation = 2.8;
        const uiFormula = (1 + nominal / 100) / (1 + inflation / 100) - 1;
        expect(computeRealReturn(nominal, inflation)).toBeCloseTo(uiFormula, 12);
    });
});

describe('projectFire', () => {
    const baseParams = {
        startingCapital: 50_000,
        monthlySavings: 1_500,
        monthlyExpensesAtFire: 2_000,
        expectedReturnPct: 7,
        inflationPct: 3,
        withdrawalRatePct: 4,
        currentAge: 30,
        retirementAge: 65,
    };

    it('calcola un fireTarget corretto basato sullo SWR', () => {
        const result = projectFire(baseParams);
        // 2000 * 12 / 0.04 = 600_000
        expect(result.fireTarget).toBe(600_000);
    });

    it('raggiunge FIRE entro un orizzonte ragionevole per parametri realistici', () => {
        const result = projectFire(baseParams);
        expect(result.monthsToFire).toBeGreaterThan(0);
        expect(result.yearsToFire).toBeGreaterThan(0);
        expect(result.yearsToFire).toBeLessThan(60);
    });

    it('ritarda il FIRE rispetto alla vecchia approssimazione (Fisher e\' piu\' prudente)', () => {
        // Con 7% nominale / 3% inflazione, l'approssimazione dava un tasso reale
        // del 4% esatto; Fisher da' 3.88%. Il capitale cresce piu' lentamente e
        // quindi il FIRE arriva DOPO rispetto a prima del fix.
        // Verifichiamo tramite un confronto simulando manualmente l'old behavior.
        const fisherMonths = projectFire(baseParams).monthsToFire;

        // Simula il vecchio comportamento: forziamo un rendimento reale "approssimato"
        // passando nominale 4% e inflazione 0 (cosi' otteniamo esattamente 4% Fisher).
        const approxMonths = projectFire({
            ...baseParams,
            expectedReturnPct: 4,
            inflationPct: 0,
        }).monthsToFire;

        // Fisher (3.88% reale) impiega piu' mesi dell'approssimazione (4% reale).
        expect(fisherMonths).toBeGreaterThan(approxMonths);
    });

    it('alreadyFire=true se il capitale iniziale supera gia\' il target', () => {
        const result = projectFire({ ...baseParams, startingCapital: 2_000_000 });
        expect(result.alreadyFire).toBe(true);
        expect(result.monthsToFire).toBe(0);
        expect(result.yearsToFire).toBe(0);
    });

    it('gestisce scenario degenere (reale <= -100%) senza esplodere', () => {
        // Inflazione iperbolica vs rendimento nominale zero.
        // Il capitale dovrebbe crollare a 0, non divergere o diventare NaN.
        const result = projectFire({
            ...baseParams,
            expectedReturnPct: 0,
            inflationPct: 500,
            maxYears: 5,
        });
        for (const point of result.chartData) {
            expect(Number.isFinite(point.capital)).toBe(true);
            expect(point.capital).toBeGreaterThanOrEqual(0);
        }
    });

    it('oneTimeOutflow riduce il capitale iniziale e ritarda FIRE', () => {
        const base = projectFire(baseParams);
        const withPurchase = projectFire({ ...baseParams, oneTimeOutflow: 20_000 });
        if (base.monthsToFire >= 0 && withPurchase.monthsToFire >= 0) {
            expect(withPurchase.monthsToFire).toBeGreaterThanOrEqual(base.monthsToFire);
        }
    });

    it('recurringMonthlyCost temporaneo ritarda ma non impedisce FIRE', () => {
        const base = projectFire(baseParams);
        const withLoan = projectFire({
            ...baseParams,
            recurringMonthlyCost: 400,
            recurringMonths: 60,
        });
        if (base.monthsToFire >= 0 && withLoan.monthsToFire >= 0) {
            expect(withLoan.monthsToFire).toBeGreaterThanOrEqual(base.monthsToFire);
        }
    });

    it('ongoingMonthlyCost negativo aumenta il cashflow e anticipa FIRE', () => {
        const base = projectFire(baseParams);
        const withPositiveCashflow = projectFire({
            ...baseParams,
            ongoingMonthlyCost: -500,
        });
        if (base.monthsToFire >= 0 && withPositiveCashflow.monthsToFire >= 0) {
            expect(withPositiveCashflow.monthsToFire).toBeLessThan(base.monthsToFire);
        }
    });

    it('chartData contiene il punto iniziale e almeno un punto per anno simulato', () => {
        const result = projectFire({ ...baseParams, maxYears: 10 });
        expect(result.chartData[0].year).toBe(0);
        expect(result.chartData[0].capital).toBe(baseParams.startingCapital);
        // 1 iniziale + 10 punti annuali
        expect(result.chartData.length).toBeGreaterThanOrEqual(11);
    });

    it('nessun capitale negativo in output', () => {
        const result = projectFire({
            ...baseParams,
            startingCapital: 0,
            monthlySavings: 0,
            recurringMonthlyCost: 10_000,
            recurringMonths: 120,
        });
        for (const point of result.chartData) {
            expect(point.capital).toBeGreaterThanOrEqual(0);
        }
    });
});

describe('fireDelayMonths', () => {
    const baseParams = {
        startingCapital: 100_000,
        monthlySavings: 2_000,
        monthlyExpensesAtFire: 2_500,
        expectedReturnPct: 6,
        inflationPct: 2,
        withdrawalRatePct: 4,
        currentAge: 35,
        retirementAge: 65,
    };

    it('ritorna positivo quando l\'acquisto ritarda il FIRE', () => {
        const base = projectFire(baseParams);
        const withBuy = projectFire({ ...baseParams, oneTimeOutflow: 30_000 });
        const delay = fireDelayMonths(base, withBuy);
        expect(delay).toBeGreaterThan(0);
    });

    it('ritorna 0 quando l\'acquisto non cambia la data FIRE', () => {
        const base = projectFire(baseParams);
        expect(fireDelayMonths(base, base)).toBe(0);
    });
});
