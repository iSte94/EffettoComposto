import { describe, it, expect } from "vitest";
import {
    computeExcessLiquidityImpact,
    EXCESS_LIQUIDITY_DEFAULT_HORIZON_YEARS,
    EXCESS_LIQUIDITY_DEFAULT_REAL_RETURN_PCT,
    EXCESS_LIQUIDITY_TRIGGER_MONTHS,
    RECOMMENDED_EMERGENCY_MONTHS,
} from "./excess-liquidity";

describe("computeExcessLiquidityImpact", () => {
    it("ritorna null quando le spese mensili sono <= 0", () => {
        expect(computeExcessLiquidityImpact({ emergencyFund: 50_000, monthlyExpenses: 0 })).toBeNull();
        expect(computeExcessLiquidityImpact({ emergencyFund: 50_000, monthlyExpenses: -100 })).toBeNull();
    });

    it("ritorna null quando il fondo emergenza e' nullo o negativo", () => {
        expect(computeExcessLiquidityImpact({ emergencyFund: 0, monthlyExpenses: 2000 })).toBeNull();
        expect(computeExcessLiquidityImpact({ emergencyFund: -1000, monthlyExpenses: 2000 })).toBeNull();
    });

    it("ritorna null quando il fondo copre meno di 18 mesi (sotto la soglia trigger)", () => {
        // 12 mesi di spese: ancora "eccellente", non eccessivo
        expect(computeExcessLiquidityImpact({ emergencyFund: 24_000, monthlyExpenses: 2000 })).toBeNull();
        // 17.9 mesi: appena sotto la soglia
        expect(computeExcessLiquidityImpact({ emergencyFund: 35_800, monthlyExpenses: 2000 })).toBeNull();
    });

    it("ritorna risultato quando il fondo copre 18+ mesi (soglia trigger)", () => {
        // Esattamente 18 mesi @ 2000 €/mese = 36k. Excess = 36k - 6*2000 = 24k
        const r = computeExcessLiquidityImpact({ emergencyFund: 36_000, monthlyExpenses: 2000 });
        expect(r).not.toBeNull();
        expect(r!.months).toBeCloseTo(18, 5);
        expect(r!.excess).toBeCloseTo(24_000, 5);
    });

    it("usa i default per soglia, rendimento reale e orizzonte", () => {
        const r = computeExcessLiquidityImpact({ emergencyFund: 50_000, monthlyExpenses: 2000 });
        expect(r).not.toBeNull();
        expect(r!.realReturnPct).toBe(EXCESS_LIQUIDITY_DEFAULT_REAL_RETURN_PCT);
        expect(r!.years).toBe(EXCESS_LIQUIDITY_DEFAULT_HORIZON_YEARS);
        expect(r!.recommendedMonths).toBe(RECOMMENDED_EMERGENCY_MONTHS);
    });

    it("riproduce esattamente la formula del montante composto su un singolo capitale", () => {
        // Excess = 24k, 4% reale, 30 anni -> 24k * 1.04^30 ≈ 24k * 3.243 ≈ 77.835
        const r = computeExcessLiquidityImpact({
            emergencyFund: 36_000,
            monthlyExpenses: 2000,
        });
        expect(r).not.toBeNull();
        const expected = 24_000 * Math.pow(1.04, 30);
        expect(r!.futureValueReal).toBeCloseTo(expected, 0);
        expect(r!.compoundGain).toBeCloseTo(expected - 24_000, 0);
    });

    it("permette override di triggerMonths, recommendedMonths, years, realReturnPct", () => {
        const r = computeExcessLiquidityImpact({
            emergencyFund: 24_000,
            monthlyExpenses: 2000, // 12 mesi
            triggerMonths: 10, // forza la soglia piu' bassa
            recommendedMonths: 3,
            years: 10,
            realReturnPct: 5,
        });
        expect(r).not.toBeNull();
        // Excess = 24k - 3*2000 = 18k
        expect(r!.excess).toBeCloseTo(18_000, 5);
        // FV = 18k * 1.05^10 ≈ 29.318
        expect(r!.futureValueReal).toBeCloseTo(18_000 * Math.pow(1.05, 10), 0);
    });

    it("rendimento reale 0 o negativo: futureValueReal == excess (nessuna 'perdita ipotetica')", () => {
        const r0 = computeExcessLiquidityImpact({
            emergencyFund: 36_000,
            monthlyExpenses: 2000,
            realReturnPct: 0,
        });
        expect(r0!.futureValueReal).toBeCloseTo(r0!.excess, 5);
        expect(r0!.compoundGain).toBe(0);

        const rNeg = computeExcessLiquidityImpact({
            emergencyFund: 36_000,
            monthlyExpenses: 2000,
            realReturnPct: -2,
        });
        expect(rNeg!.futureValueReal).toBeCloseTo(rNeg!.excess, 5);
        expect(rNeg!.compoundGain).toBe(0);
    });

    it("orizzonte 0 anni: futureValueReal == excess", () => {
        const r = computeExcessLiquidityImpact({
            emergencyFund: 50_000,
            monthlyExpenses: 2000,
            years: 0,
        });
        expect(r!.futureValueReal).toBeCloseTo(r!.excess, 5);
        expect(r!.compoundGain).toBe(0);
    });

    it("monotonia: piu' eccesso => maggior costo opportunita'", () => {
        const small = computeExcessLiquidityImpact({ emergencyFund: 36_000, monthlyExpenses: 2000 })!;
        const big = computeExcessLiquidityImpact({ emergencyFund: 100_000, monthlyExpenses: 2000 })!;
        expect(big.excess).toBeGreaterThan(small.excess);
        expect(big.futureValueReal).toBeGreaterThan(small.futureValueReal);
    });

    it("monotonia: orizzonte piu' lungo => maggior compound gain (a parita' di excess)", () => {
        const short = computeExcessLiquidityImpact({
            emergencyFund: 50_000,
            monthlyExpenses: 2000,
            years: 10,
        })!;
        const long = computeExcessLiquidityImpact({
            emergencyFund: 50_000,
            monthlyExpenses: 2000,
            years: 30,
        })!;
        expect(long.futureValueReal).toBeGreaterThan(short.futureValueReal);
    });

    it("sanitizza input non finiti senza propagare NaN/Infinity", () => {
        const rNaN = computeExcessLiquidityImpact({
            emergencyFund: NaN,
            monthlyExpenses: 2000,
        });
        // emergencyFund NaN -> sanitizzato a 0 -> ritorna null
        expect(rNaN).toBeNull();

        const rInf = computeExcessLiquidityImpact({
            emergencyFund: 50_000,
            monthlyExpenses: 2000,
            realReturnPct: Infinity,
        });
        // realReturnPct Infinity -> sanitizzato a 0 -> futureValueReal == excess
        expect(rInf).not.toBeNull();
        expect(Number.isFinite(rInf!.futureValueReal)).toBe(true);
        expect(rInf!.futureValueReal).toBeCloseTo(rInf!.excess, 5);
    });

    it("calcola correttamente i 'mesi di copertura' come fund / spese", () => {
        const r = computeExcessLiquidityImpact({ emergencyFund: 60_000, monthlyExpenses: 2000 });
        expect(r!.months).toBeCloseTo(30, 5);
    });

    it("la soglia di trigger di default e' 18 mesi (regressione costante)", () => {
        expect(EXCESS_LIQUIDITY_TRIGGER_MONTHS).toBe(18);
    });

    it("la soglia raccomandata di default e' 6 mesi (regressione costante)", () => {
        expect(RECOMMENDED_EMERGENCY_MONTHS).toBe(6);
    });
});
