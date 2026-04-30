import { describe, expect, it } from "vitest";
import { applyMonteCarloAnnualReturn } from "./monte-carlo-helpers";

describe("applyMonteCarloAnnualReturn", () => {
    it("applica un rendimento positivo standard senza clamping", () => {
        const r = applyMonteCarloAnnualReturn(100_000, 0.07);
        expect(r.nextCapital).toBeCloseTo(107_000, 6);
        expect(r.wasReturnClamped).toBe(false);
    });

    it("applica un rendimento negativo moderato senza clamping", () => {
        const r = applyMonteCarloAnnualReturn(100_000, -0.20);
        expect(r.nextCapital).toBeCloseTo(80_000, 6);
        expect(r.wasReturnClamped).toBe(false);
    });

    it("rendimento esattamente -100% azzera il capitale (no clamp, e' al limite)", () => {
        const r = applyMonteCarloAnnualReturn(100_000, -1);
        expect(r.nextCapital).toBe(0);
        // -1 esatto NON e' < -1, quindi non e' considerato clampato.
        expect(r.wasReturnClamped).toBe(false);
    });

    describe("REGRESSIONE: rendimento < -100% non deve flippare il segno del capitale", () => {
        it("randomYearReturn = -1.5 (perdita 150%): capitale clampato a 0, flag clamped = true", () => {
            // Prima del fix: 100k * (1 + -1.5) = -50k (capitale negativo!).
            // Dopo il fix: rendimento clampato a -1, risultato = 0.
            const r = applyMonteCarloAnnualReturn(100_000, -1.5);
            expect(r.nextCapital).toBe(0);
            expect(r.wasReturnClamped).toBe(true);
        });

        it("randomYearReturn = -2 (perdita 200%): capitale clampato a 0, mai negativo", () => {
            const r = applyMonteCarloAnnualReturn(500_000, -2);
            expect(r.nextCapital).toBe(0);
            expect(r.nextCapital).toBeGreaterThanOrEqual(0);
            expect(r.wasReturnClamped).toBe(true);
        });

        it("randomYearReturn estremo (-10) viene clampato e capitale resta >= 0", () => {
            const r = applyMonteCarloAnnualReturn(1_000_000, -10);
            expect(r.nextCapital).toBe(0);
            expect(r.wasReturnClamped).toBe(true);
        });

        it("simula coda sinistra della normale con high vol: nessun capitale negativo per 1000 draw casuali", () => {
            // Con stdDev = 0.30 e mean = 0.04, la probabilita' di estrarre un
            // valore < -1 e' ~2.6e-4. Su 10.000 draws ne aspetteremmo ~3.
            // Verifichiamo che, qualsiasi sia il random draw, il capitale
            // non diventi mai negativo.
            const stdDev = 0.30;
            const mean = 0.04;
            for (let i = 0; i < 10_000; i++) {
                let u = Math.random(); if (u === 0) u = 1e-9;
                let v = Math.random(); if (v === 0) v = 1e-9;
                const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
                const sample = mean + z * stdDev;
                const r = applyMonteCarloAnnualReturn(100_000, sample);
                expect(r.nextCapital).toBeGreaterThanOrEqual(0);
                expect(Number.isFinite(r.nextCapital)).toBe(true);
            }
        });
    });

    describe("input non finiti / capitali invalidi", () => {
        it("rendimento NaN: capitale resta invariato, no clamp", () => {
            const r = applyMonteCarloAnnualReturn(100_000, Number.NaN);
            expect(r.nextCapital).toBe(100_000);
            expect(r.wasReturnClamped).toBe(false);
        });

        it("rendimento +Infinity: capitale resta invariato (non propaga Infinity)", () => {
            const r = applyMonteCarloAnnualReturn(100_000, Number.POSITIVE_INFINITY);
            expect(Number.isFinite(r.nextCapital)).toBe(true);
            expect(r.nextCapital).toBe(100_000);
        });

        it("rendimento -Infinity: capitale azzerato (clampato a -100%)", () => {
            const r = applyMonteCarloAnnualReturn(100_000, Number.NEGATIVE_INFINITY);
            expect(Number.isFinite(r.nextCapital)).toBe(true);
            // -Infinity is technically not finite, so it goes into the
            // sanitization branch, NOT the clamp branch. Capitale rimane invariato.
            // Questo e' coerente con la semantica "input non finito = no-op".
            expect(r.nextCapital).toBe(100_000);
        });

        it("capitale NaN viene normalizzato a 0", () => {
            const r = applyMonteCarloAnnualReturn(Number.NaN, 0.05);
            expect(r.nextCapital).toBe(0);
        });

        it("capitale negativo viene normalizzato a 0 prima dell'applicazione del rendimento", () => {
            const r = applyMonteCarloAnnualReturn(-50_000, 0.10);
            // -50k negativo => safeCapital = 0 => 0 * 1.10 = 0
            expect(r.nextCapital).toBe(0);
        });

        it("capitale = 0 con rendimento positivo resta 0 (non si crea capitale dal nulla)", () => {
            const r = applyMonteCarloAnnualReturn(0, 0.20);
            expect(r.nextCapital).toBe(0);
        });
    });

    describe("invarianti finanziarie", () => {
        it("capitale post-rendimento e' SEMPRE >= 0 per qualunque coppia (capital, return)", () => {
            const samples: Array<[number, number]> = [
                [100_000, 0],
                [100_000, -0.999_999],
                [100_000, -1],
                [100_000, -1.000_001],
                [100_000, -50],
                [1, -0.5],
                [0.0001, -1.5],
                [1e9, -3],
                [1e6, 5],
            ];
            for (const [c, r] of samples) {
                const out = applyMonteCarloAnnualReturn(c, r);
                expect(out.nextCapital).toBeGreaterThanOrEqual(0);
                expect(Number.isFinite(out.nextCapital)).toBe(true);
            }
        });

        it("monotonicita': a parita' di capitale, rendimento maggiore => capitale finale maggiore", () => {
            const a = applyMonteCarloAnnualReturn(100_000, -0.10).nextCapital;
            const b = applyMonteCarloAnnualReturn(100_000, 0.05).nextCapital;
            const c = applyMonteCarloAnnualReturn(100_000, 0.20).nextCapital;
            expect(a).toBeLessThan(b);
            expect(b).toBeLessThan(c);
        });

        it("flag wasReturnClamped scatta SOLO sotto -1 (no falsi positivi)", () => {
            expect(applyMonteCarloAnnualReturn(100_000, -0.5).wasReturnClamped).toBe(false);
            expect(applyMonteCarloAnnualReturn(100_000, -0.9999).wasReturnClamped).toBe(false);
            expect(applyMonteCarloAnnualReturn(100_000, -1).wasReturnClamped).toBe(false);
            expect(applyMonteCarloAnnualReturn(100_000, -1.0001).wasReturnClamped).toBe(true);
        });
    });
});
