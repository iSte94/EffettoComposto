import { describe, it, expect } from "vitest";
import { computeCapitalMultiplier } from "./capital-multiplier";

describe("computeCapitalMultiplier", () => {
    it("calcolo base: finalBalance = 3 * totalDeposited produce nominalMultiplier = 3", () => {
        const r = computeCapitalMultiplier({
            finalBalance: 30000,
            realFinalBalance: 24000,
            totalDeposited: 10000,
        });
        expect(r.nominalMultiplier).toBeCloseTo(3, 6);
        expect(r.realMultiplier).toBeCloseTo(2.4, 6);
        expect(r.inflationDrag).toBeCloseTo(0.6, 6);
    });

    it("totalDeposited = 0 ritorna tutti null (piano vuoto, no divisione per zero)", () => {
        const r = computeCapitalMultiplier({
            finalBalance: 5000,
            realFinalBalance: 4500,
            totalDeposited: 0,
        });
        expect(r.nominalMultiplier).toBeNull();
        expect(r.realMultiplier).toBeNull();
        expect(r.inflationDrag).toBeNull();
    });

    it("totalDeposited negativo viene clampato a 0 e ritorna null", () => {
        const r = computeCapitalMultiplier({
            finalBalance: 1000,
            realFinalBalance: 900,
            totalDeposited: -500,
        });
        expect(r.nominalMultiplier).toBeNull();
        expect(r.realMultiplier).toBeNull();
        expect(r.inflationDrag).toBeNull();
    });

    it("finalBalance = totalDeposited produce moltiplicatore 1 (rendimento zero)", () => {
        const r = computeCapitalMultiplier({
            finalBalance: 12000,
            realFinalBalance: 12000,
            totalDeposited: 12000,
        });
        expect(r.nominalMultiplier).toBe(1);
        expect(r.realMultiplier).toBe(1);
        expect(r.inflationDrag).toBe(0);
    });

    it("real multiplier puo' essere < 1 con rendimento reale negativo (regressione)", () => {
        // Scenario: nominale +10% ma inflazione mangia tutto e oltre.
        const r = computeCapitalMultiplier({
            finalBalance: 11000,
            realFinalBalance: 8500,
            totalDeposited: 10000,
        });
        expect(r.nominalMultiplier).toBeCloseTo(1.1, 6);
        expect(r.realMultiplier).toBeCloseTo(0.85, 6);
        expect(r.realMultiplier!).toBeLessThan(1);
        expect(r.inflationDrag).toBeCloseTo(0.25, 6);
    });

    it("inflationDrag = nominalMultiplier - realMultiplier (invariante algebrica)", () => {
        const r = computeCapitalMultiplier({
            finalBalance: 50000,
            realFinalBalance: 32000,
            totalDeposited: 12000,
        });
        expect(r.inflationDrag).toBeCloseTo(r.nominalMultiplier! - r.realMultiplier!, 12);
    });

    it("scaling: raddoppiando finalBalance e realFinal raddoppia entrambi i multiplicatori", () => {
        const small = computeCapitalMultiplier({ finalBalance: 20000, realFinalBalance: 16000, totalDeposited: 10000 });
        const big = computeCapitalMultiplier({ finalBalance: 40000, realFinalBalance: 32000, totalDeposited: 10000 });
        expect(big.nominalMultiplier!).toBeCloseTo(small.nominalMultiplier! * 2, 6);
        expect(big.realMultiplier!).toBeCloseTo(small.realMultiplier! * 2, 6);
    });

    it("invarianza di scala: stesso rapporto finale/versato produce stesso multiplicatore", () => {
        const a = computeCapitalMultiplier({ finalBalance: 30000, realFinalBalance: 24000, totalDeposited: 10000 });
        const b = computeCapitalMultiplier({ finalBalance: 300000, realFinalBalance: 240000, totalDeposited: 100000 });
        expect(a.nominalMultiplier).toBeCloseTo(b.nominalMultiplier!, 6);
        expect(a.realMultiplier).toBeCloseTo(b.realMultiplier!, 6);
    });

    it("input NaN/Infinity vengono sanitizzati a 0 senza propagarsi", () => {
        const r = computeCapitalMultiplier({
            finalBalance: Number.NaN,
            realFinalBalance: Number.POSITIVE_INFINITY,
            totalDeposited: 10000,
        });
        // NaN/Infinity -> 0, quindi multiplicatori = 0/10000 = 0 finiti.
        expect(r.nominalMultiplier).toBe(0);
        expect(r.realMultiplier).toBe(0);
        expect(r.inflationDrag).toBe(0);
        expect(Number.isFinite(r.nominalMultiplier!)).toBe(true);
        expect(Number.isFinite(r.realMultiplier!)).toBe(true);
    });

    it("totalDeposited NaN ritorna null (piano non misurabile)", () => {
        const r = computeCapitalMultiplier({
            finalBalance: 50000,
            realFinalBalance: 40000,
            totalDeposited: Number.NaN,
        });
        expect(r.nominalMultiplier).toBeNull();
        expect(r.realMultiplier).toBeNull();
        expect(r.inflationDrag).toBeNull();
    });

    it("realFinalBalance negativo viene clampato a 0 (no multiplicatore negativo dall'UI)", () => {
        const r = computeCapitalMultiplier({
            finalBalance: 5000,
            realFinalBalance: -1000,
            totalDeposited: 10000,
        });
        expect(r.realMultiplier).toBe(0);
        expect(r.nominalMultiplier).toBeCloseTo(0.5, 6);
    });

    it("finalBalance = 0 (perdita totale teorica) produce multiplicatori = 0, non null", () => {
        // Edge case difensivo: il piano e' valido (totalDeposited > 0) ma il
        // saldo e' azzerato. Il moltiplicatore e' 0, non null: l'utente DEVE
        // vedere "ogni € → €0" come segnale chiaro, non un'assenza di dato.
        const r = computeCapitalMultiplier({
            finalBalance: 0,
            realFinalBalance: 0,
            totalDeposited: 12000,
        });
        expect(r.nominalMultiplier).toBe(0);
        expect(r.realMultiplier).toBe(0);
        expect(r.inflationDrag).toBe(0);
    });

    it("scenario tipico FIRE: 10k iniziale + 300/mese per 30 anni @ 7% nominale, 2.5% inflazione", () => {
        // Valori realistici dal Calcolatore Interesse Composto:
        //   totalDeposited = 10_000 + 300 * 360 = 118_000
        //   finalBalance ~ 376_000 (cap. mensile a 7%)
        //   realFinalBalance ~ 376_000 / 1.025^30 ~ 179_000
        // Verifichiamo che i multiplicatori siano nei range attesi.
        const r = computeCapitalMultiplier({
            finalBalance: 376000,
            realFinalBalance: 179000,
            totalDeposited: 118000,
        });
        expect(r.nominalMultiplier!).toBeGreaterThan(3);
        expect(r.nominalMultiplier!).toBeLessThan(3.5);
        expect(r.realMultiplier!).toBeGreaterThan(1.4);
        expect(r.realMultiplier!).toBeLessThan(1.7);
        expect(r.inflationDrag!).toBeGreaterThan(1);
    });

    it("coerenza con la card '% da interessi composti': nominalMultiplier = 1 / (1 - %compound)", () => {
        // Invariante algebrica: la card "% da interessi composti" mostra
        //   pctCompound = totalInterest / finalBalance = 1 - totalDeposited / finalBalance
        // quindi 1 - pctCompound = totalDeposited / finalBalance, cioe' 1 / nominalMultiplier.
        // Questo test blinda che le due card non possano divergere semanticamente.
        const finalBalance = 500000;
        const totalDeposited = 150000;
        const totalInterest = finalBalance - totalDeposited;
        const pctCompound = totalInterest / finalBalance;
        const r = computeCapitalMultiplier({
            finalBalance,
            realFinalBalance: 250000,
            totalDeposited,
        });
        expect(r.nominalMultiplier!).toBeCloseTo(1 / (1 - pctCompound), 6);
    });
});
