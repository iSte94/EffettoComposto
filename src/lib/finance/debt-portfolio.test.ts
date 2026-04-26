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
