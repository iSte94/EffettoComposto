import { describe, it, expect } from "vitest";
import { computeDebtPortfolioSummary } from "./debt-portfolio";
import type { Debt } from "./debt-strategy";

describe("computeDebtPortfolioSummary", () => {
    it("restituisce zeri per lista vuota", () => {
        const summary = computeDebtPortfolioSummary([]);
        expect(summary).toEqual({
            activeCount: 0,
            totalBalance: 0,
            weightedAverageRate: 0,
            totalMinPayment: 0,
            monthlyInterestCost: 0,
        });
    });

    it("aggrega correttamente un singolo debito", () => {
        const debts: Debt[] = [
            { id: "1", name: "Carta", balance: 1000, rate: 12, minPayment: 50 },
        ];
        const summary = computeDebtPortfolioSummary(debts);
        expect(summary.activeCount).toBe(1);
        expect(summary.totalBalance).toBe(1000);
        expect(summary.weightedAverageRate).toBe(12);
        expect(summary.totalMinPayment).toBe(50);
        // 1000 * 12% / 12 mesi = 10 €/mese di soli interessi a saldo invariato.
        expect(summary.monthlyInterestCost).toBeCloseTo(10, 6);
    });

    it("calcola tasso medio ponderato per saldo (non semplice media aritmetica)", () => {
        // Saldi 1000 @ 18% e 9000 @ 5% -> ponderato = (1000*18 + 9000*5) / 10000 = 6.3%
        // Media aritmetica sarebbe 11.5%, molto diversa.
        const debts: Debt[] = [
            { id: "1", name: "Carta", balance: 1000, rate: 18, minPayment: 50 },
            { id: "2", name: "Auto", balance: 9000, rate: 5, minPayment: 200 },
        ];
        const summary = computeDebtPortfolioSummary(debts);
        expect(summary.totalBalance).toBe(10000);
        expect(summary.weightedAverageRate).toBeCloseTo(6.3, 5);
        expect(summary.totalMinPayment).toBe(250);
    });

    it("ignora debiti con saldo <= 0", () => {
        const debts: Debt[] = [
            { id: "1", name: "Estinto", balance: 0, rate: 12, minPayment: 100 },
            { id: "2", name: "Negativo", balance: -50, rate: 12, minPayment: 50 },
            { id: "3", name: "Attivo", balance: 2000, rate: 8, minPayment: 80 },
        ];
        const summary = computeDebtPortfolioSummary(debts);
        expect(summary.activeCount).toBe(1);
        expect(summary.totalBalance).toBe(2000);
        expect(summary.weightedAverageRate).toBe(8);
        expect(summary.totalMinPayment).toBe(80);
    });

    it("clampa tassi negativi a 0 nel calcolo ponderato", () => {
        const debts: Debt[] = [
            { id: "1", name: "Promo", balance: 1000, rate: -2, minPayment: 50 },
            { id: "2", name: "Std", balance: 1000, rate: 10, minPayment: 50 },
        ];
        const summary = computeDebtPortfolioSummary(debts);
        // 1000*0 + 1000*10 = 10000, /2000 = 5
        expect(summary.weightedAverageRate).toBe(5);
    });

    it("sanitizza NaN/Infinity senza propagarli", () => {
        const debts: Debt[] = [
            { id: "1", name: "Bug", balance: NaN, rate: 5, minPayment: 50 },
            { id: "2", name: "Inf", balance: Infinity, rate: 5, minPayment: 50 },
            { id: "3", name: "Ok", balance: 1000, rate: NaN, minPayment: NaN },
        ];
        const summary = computeDebtPortfolioSummary(debts);
        expect(summary.activeCount).toBe(1);
        expect(summary.totalBalance).toBe(1000);
        expect(Number.isFinite(summary.weightedAverageRate)).toBe(true);
        expect(summary.weightedAverageRate).toBe(0);
        expect(summary.totalMinPayment).toBe(0);
    });

    it("totale rate minime e' la somma esatta dei min payment positivi", () => {
        const debts: Debt[] = [
            { id: "1", name: "A", balance: 500, rate: 10, minPayment: 25.5 },
            { id: "2", name: "B", balance: 500, rate: 10, minPayment: 74.5 },
        ];
        const summary = computeDebtPortfolioSummary(debts);
        expect(summary.totalMinPayment).toBe(100);
    });
});

describe("computeDebtPortfolioSummary - monthlyInterestCost", () => {
    it("somma il costo mensile interessi per debito (saldo * tasso / 100 / 12)", () => {
        // Carta: 5000 @ 18% -> 5000 * 0.18 / 12 = 75 €/mese
        // Auto:  12000 @ 5.5% -> 12000 * 0.055 / 12 = 55 €/mese
        // Totale: 130 €/mese
        const debts: Debt[] = [
            { id: "1", name: "Carta", balance: 5000, rate: 18, minPayment: 100 },
            { id: "2", name: "Auto", balance: 12000, rate: 5.5, minPayment: 250 },
        ];
        const summary = computeDebtPortfolioSummary(debts);
        expect(summary.monthlyInterestCost).toBeCloseTo(130, 6);
    });

    it("e' 0 quando non ci sono debiti attivi", () => {
        expect(computeDebtPortfolioSummary([]).monthlyInterestCost).toBe(0);
    });

    it("e' 0 quando tutti i debiti hanno tasso 0", () => {
        const debts: Debt[] = [
            { id: "1", name: "Promo", balance: 10000, rate: 0, minPayment: 200 },
            { id: "2", name: "Tasso0", balance: 5000, rate: 0, minPayment: 100 },
        ];
        const summary = computeDebtPortfolioSummary(debts);
        expect(summary.monthlyInterestCost).toBe(0);
    });

    it("ignora debiti gia' estinti (saldo <= 0)", () => {
        const debts: Debt[] = [
            { id: "1", name: "Estinto", balance: 0, rate: 12, minPayment: 100 },
            { id: "2", name: "Negativo", balance: -50, rate: 12, minPayment: 50 },
            { id: "3", name: "Attivo", balance: 2400, rate: 10, minPayment: 80 },
        ];
        const summary = computeDebtPortfolioSummary(debts);
        // Solo il debito "Attivo" contribuisce: 2400 * 10% / 12 = 20 €/mese.
        expect(summary.monthlyInterestCost).toBeCloseTo(20, 6);
    });

    it("clampa tassi negativi a 0 (non genera 'interessi negativi')", () => {
        const debts: Debt[] = [
            { id: "1", name: "Promo", balance: 1000, rate: -5, minPayment: 50 },
            { id: "2", name: "Std", balance: 1200, rate: 10, minPayment: 50 },
        ];
        const summary = computeDebtPortfolioSummary(debts);
        // Solo il secondo contribuisce: 1200 * 10% / 12 = 10 €/mese.
        expect(summary.monthlyInterestCost).toBeCloseTo(10, 6);
    });

    it("non propaga NaN/Infinity (sanitizza input degeneri)", () => {
        const debts: Debt[] = [
            { id: "1", name: "Bug", balance: NaN, rate: 5, minPayment: 50 },
            { id: "2", name: "Inf", balance: Infinity, rate: 5, minPayment: 50 },
            { id: "3", name: "OkRateNaN", balance: 1000, rate: NaN, minPayment: 10 },
            { id: "4", name: "Ok", balance: 1200, rate: 10, minPayment: 25 },
        ];
        const summary = computeDebtPortfolioSummary(debts);
        expect(Number.isFinite(summary.monthlyInterestCost)).toBe(true);
        // Il debito 3 ha rate NaN -> contributo 0.
        // Il debito 4: 1200 * 10% / 12 = 10 €/mese.
        expect(summary.monthlyInterestCost).toBeCloseTo(10, 6);
    });

    it("e' algebricamente equivalente a totalBalance * weightedAverageRate / 100 / 12", () => {
        // Invariante: la somma "item-by-item" e la formula aggregata devono
        // coincidere per ogni distribuzione di saldi/tassi positivi (entrambe
        // sono lineari in `balance * rate`). Blinda l'invariante anche quando
        // i tassi sono molto eterogenei.
        const debts: Debt[] = [
            { id: "1", name: "A", balance: 800, rate: 24, minPayment: 50 },
            { id: "2", name: "B", balance: 7500, rate: 6.25, minPayment: 150 },
            { id: "3", name: "C", balance: 15000, rate: 3.5, minPayment: 200 },
        ];
        const summary = computeDebtPortfolioSummary(debts);
        const aggregateFormula =
            (summary.totalBalance * summary.weightedAverageRate) / 100 / 12;
        expect(summary.monthlyInterestCost).toBeCloseTo(aggregateFormula, 6);
    });
});
