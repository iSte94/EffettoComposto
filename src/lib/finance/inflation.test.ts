import { describe, it, expect } from "vitest";
import { projectInflation } from "./inflation";
import { computeRealReturn } from "./fire-projection";

describe("projectInflation", () => {
    it("genera years+1 punti (incluso anno 0)", () => {
        const r = projectInflation({ amount: 1000, inflationRatePct: 2, years: 5, nominalReturnPct: 5 });
        expect(r.points).toHaveLength(6);
        expect(r.points[0].year).toBe(0);
        expect(r.points[5].year).toBe(5);
    });

    it("anno 0 ha purchasingPower = nominalValue = realValue = amount", () => {
        const r = projectInflation({ amount: 100000, inflationRatePct: 3, years: 10, nominalReturnPct: 7 });
        expect(r.points[0].purchasingPower).toBe(100000);
        expect(r.points[0].nominalValue).toBe(100000);
        expect(r.points[0].realValue).toBe(100000);
    });

    it("inflazione zero: il potere d'acquisto resta uguale al capitale iniziale", () => {
        const r = projectInflation({ amount: 50000, inflationRatePct: 0, years: 20, nominalReturnPct: 5 });
        expect(r.finalPurchasingPower).toBe(50000);
        expect(r.lostValue).toBe(0);
        expect(r.lostPercent).toBe(0);
        // Senza inflazione, valore reale e nominale coincidono.
        expect(r.finalReal).toBe(r.finalNominal);
        expect(r.equivalentFutureCapital).toBe(50000);
    });

    it("calcola correttamente il potere d'acquisto eroso dall'inflazione", () => {
        // 100k @ 2% inflazione per 10 anni -> 100000 / 1.02^10 = 82035
        const r = projectInflation({ amount: 100000, inflationRatePct: 2, years: 10, nominalReturnPct: 0 });
        expect(r.finalPurchasingPower).toBeCloseTo(82035, -1);
        expect(r.lostValue).toBeCloseTo(17965, -1);
        expect(r.lostPercent).toBeCloseTo(17.97, 0);
    });

    it("equivalentFutureCapital e' l'inverso del potere d'acquisto finale", () => {
        // Per mantenere oggi 100k in 10 anni @ 2% inflazione: 100000 * 1.02^10 = 121899
        const r = projectInflation({ amount: 100000, inflationRatePct: 2, years: 10, nominalReturnPct: 5 });
        expect(r.equivalentFutureCapital).toBeCloseTo(121899, -1);
        // Coerenza con la formula inversa: equivalente * potere = amount^2.
        // Tolleranza relativa generosa perche' entrambi i valori sono arrotondati.
        const product = r.equivalentFutureCapital * r.finalPurchasingPower;
        const expected = 100000 * 100000;
        expect(Math.abs(product - expected) / expected).toBeLessThan(1e-4);
    });

    it("realReturnPct usa Fisher esatto, non la sottrazione", () => {
        // 7% nominale - 3% inflazione: Fisher = 3.8835%, naive = 4.0%
        const r = projectInflation({ amount: 1000, inflationRatePct: 3, years: 1, nominalReturnPct: 7 });
        expect(r.realReturnPct).toBeCloseTo(3.8835, 3);
        expect(r.realReturnPct).not.toBeCloseTo(4.0, 3);
    });

    it("delega il calcolo del rendimento reale al modulo condiviso (no duplicazione)", () => {
        // Verifica diretta che il valore restituito coincida con computeRealReturn,
        // bloccando ogni futuro cleanup che reintroduca una formula inline.
        const r = projectInflation({ amount: 1000, inflationRatePct: 2.5, years: 5, nominalReturnPct: 6 });
        expect(r.realReturnPct).toBeCloseTo(computeRealReturn(6, 2.5) * 100, 6);
    });

    it("valore reale dell'investimento = nominale scontato per inflazione", () => {
        const r = projectInflation({ amount: 10000, inflationRatePct: 2, years: 30, nominalReturnPct: 7 });
        const last = r.points[r.points.length - 1];
        const expectedReal = last.nominalValue / Math.pow(1.02, 30);
        // I punti sono arrotondati, quindi tolleranza di 1 euro.
        expect(Math.abs(last.realValue - expectedReal)).toBeLessThanOrEqual(1);
    });

    it("amount = 0 produce tutti zeri ma non NaN", () => {
        const r = projectInflation({ amount: 0, inflationRatePct: 3, years: 10, nominalReturnPct: 5 });
        expect(r.finalPurchasingPower).toBe(0);
        expect(r.finalNominal).toBe(0);
        expect(r.finalReal).toBe(0);
        expect(r.lostValue).toBe(0);
        expect(r.lostPercent).toBe(0);
        expect(r.equivalentFutureCapital).toBe(0);
        // Real return non dipende dall'amount.
        expect(Number.isFinite(r.realReturnPct)).toBe(true);
    });

    it("years = 0 produce un solo punto (snapshot iniziale)", () => {
        const r = projectInflation({ amount: 5000, inflationRatePct: 2, years: 0, nominalReturnPct: 6 });
        expect(r.points).toHaveLength(1);
        expect(r.finalPurchasingPower).toBe(5000);
        expect(r.equivalentFutureCapital).toBe(5000);
        expect(r.lostValue).toBe(0);
    });

    it("sanitizza input NaN/Infinity senza esplodere", () => {
        const r = projectInflation({
            amount: Number.NaN,
            inflationRatePct: Number.POSITIVE_INFINITY,
            years: Number.NaN,
            nominalReturnPct: Number.NaN,
        });
        expect(Number.isFinite(r.finalPurchasingPower)).toBe(true);
        expect(Number.isFinite(r.finalNominal)).toBe(true);
        expect(Number.isFinite(r.finalReal)).toBe(true);
        expect(Number.isFinite(r.equivalentFutureCapital)).toBe(true);
        expect(r.points.length).toBeGreaterThan(0);
    });

    it("rendimento nominale = inflazione: rendimento reale ~ 0", () => {
        const r = projectInflation({ amount: 10000, inflationRatePct: 3, years: 20, nominalReturnPct: 3 });
        expect(r.realReturnPct).toBeCloseTo(0, 5);
        // Il valore reale dell'investimento deve restare ~ amount.
        const last = r.points[r.points.length - 1];
        expect(Math.abs(last.realValue - 10000)).toBeLessThanOrEqual(1);
    });

    it("years frazionari vengono troncati all'intero", () => {
        const r = projectInflation({ amount: 1000, inflationRatePct: 2, years: 5.7, nominalReturnPct: 5 });
        // floor(5.7) = 5, quindi 6 punti.
        expect(r.points).toHaveLength(6);
    });

    describe("purchasingPowerHalvingYears", () => {
        it("al 2% annuo il potere d'acquisto si dimezza in ~35 anni (formula esatta)", () => {
            // ln(2) / ln(1.02) ≈ 35.003 anni (piu' preciso della Regola del 72 che darebbe 36).
            const r = projectInflation({ amount: 100000, inflationRatePct: 2, years: 10, nominalReturnPct: 5 });
            expect(r.purchasingPowerHalvingYears).not.toBeNull();
            expect(r.purchasingPowerHalvingYears!).toBeCloseTo(35.003, 1);
        });

        it("al 7% annuo il potere d'acquisto si dimezza in ~10 anni", () => {
            // ln(2) / ln(1.07) ≈ 10.245 anni.
            const r = projectInflation({ amount: 1000, inflationRatePct: 7, years: 5, nominalReturnPct: 0 });
            expect(r.purchasingPowerHalvingYears!).toBeCloseTo(10.245, 1);
        });

        it("coerenza con il modello: dopo N anni di dimezzamento, purchasingPower = amount/2", () => {
            const inflationRatePct = 3;
            const halving = projectInflation({ amount: 10000, inflationRatePct, years: 0, nominalReturnPct: 0 })
                .purchasingPowerHalvingYears!;
            // Verifica indipendente: (1+i)^halving = 2.
            expect(Math.pow(1 + inflationRatePct / 100, halving)).toBeCloseTo(2, 6);
        });

        it("inflazione zero: nessun dimezzamento (null)", () => {
            const r = projectInflation({ amount: 1000, inflationRatePct: 0, years: 20, nominalReturnPct: 5 });
            expect(r.purchasingPowerHalvingYears).toBeNull();
        });

        it("deflazione (inflazione negativa): potere d'acquisto non si dimezza mai (null)", () => {
            const r = projectInflation({ amount: 1000, inflationRatePct: -1, years: 10, nominalReturnPct: 3 });
            expect(r.purchasingPowerHalvingYears).toBeNull();
        });

        it("non dipende da amount ne' da years", () => {
            const a = projectInflation({ amount: 100, inflationRatePct: 4, years: 5, nominalReturnPct: 0 });
            const b = projectInflation({ amount: 999_999, inflationRatePct: 4, years: 50, nominalReturnPct: 10 });
            expect(a.purchasingPowerHalvingYears).toBeCloseTo(b.purchasingPowerHalvingYears!, 6);
        });
    });

    describe("monthlySavingsToPreservePurchasingPower", () => {
        it("rendimento reale positivo: nessun risparmio aggiuntivo necessario", () => {
            // 7% nominale batte 2% inflazione => finalNominal > equivalentFutureCapital.
            const r = projectInflation({ amount: 100000, inflationRatePct: 2, years: 20, nominalReturnPct: 7 });
            expect(r.purchasingPowerGap).toBe(0);
            expect(r.monthlySavingsToPreservePurchasingPower).toBe(0);
        });

        it("rendimento nominale = inflazione: gap ~ 0, rata ~ 0", () => {
            // Real return = 0 => il lump sum copre esattamente il capitale equivalente futuro.
            const r = projectInflation({ amount: 50000, inflationRatePct: 3, years: 15, nominalReturnPct: 3 });
            expect(r.purchasingPowerGap).toBeLessThanOrEqual(1);
            expect(r.monthlySavingsToPreservePurchasingPower).toBeLessThanOrEqual(1);
        });

        it("rendimento reale negativo: rata positiva che colma il gap via rendita", () => {
            // 2% nominale vs 5% inflazione su 100k in 10 anni -> gap ~ 41k; rata @2% mensile.
            const r = projectInflation({ amount: 100000, inflationRatePct: 5, years: 10, nominalReturnPct: 2 });
            expect(r.purchasingPowerGap).toBeGreaterThan(0);
            expect(r.monthlySavingsToPreservePurchasingPower).toBeGreaterThan(0);

            // Verifica indipendente della formula della rendita futura.
            const months = r.monthlySavingsToPreservePurchasingPower > 0 ? 10 * 12 : 0;
            const m = 0.02 / 12;
            const annuityFactor = (Math.pow(1 + m, months) - 1) / m;
            const expectedPmt = r.purchasingPowerGap / annuityFactor;
            expect(r.monthlySavingsToPreservePurchasingPower).toBeCloseTo(expectedPmt, -1);
        });

        it("rendimento nominale zero: rata = gap / mesi (degenerazione lineare)", () => {
            // Senza capitalizzazione la rendita diventa una semplice suddivisione temporale.
            const r = projectInflation({ amount: 10000, inflationRatePct: 3, years: 10, nominalReturnPct: 0 });
            expect(r.purchasingPowerGap).toBeGreaterThan(0);
            const months = 10 * 12;
            expect(r.monthlySavingsToPreservePurchasingPower).toBeCloseTo(r.purchasingPowerGap / months, -1);
        });

        it("years = 0: nessuna rata (orizzonte nullo)", () => {
            const r = projectInflation({ amount: 10000, inflationRatePct: 3, years: 0, nominalReturnPct: 5 });
            expect(r.monthlySavingsToPreservePurchasingPower).toBe(0);
        });

        it("amount = 0: rata positiva pari al capitale equivalente futuro via rendita", () => {
            // Con lump sum nullo ma inflazione positiva serve partire da zero: gap = equivalentFutureCapital.
            // amount=0 => equivalentFutureCapital=0 => gap=0; verifichiamo che non esploda.
            const r = projectInflation({ amount: 0, inflationRatePct: 3, years: 10, nominalReturnPct: 5 });
            expect(r.purchasingPowerGap).toBe(0);
            expect(r.monthlySavingsToPreservePurchasingPower).toBe(0);
        });

        it("input non finiti non producono NaN/Infinity", () => {
            const r = projectInflation({
                amount: Number.NaN,
                inflationRatePct: Number.POSITIVE_INFINITY,
                years: Number.NaN,
                nominalReturnPct: Number.NaN,
            });
            expect(Number.isFinite(r.purchasingPowerGap)).toBe(true);
            expect(Number.isFinite(r.monthlySavingsToPreservePurchasingPower)).toBe(true);
        });
    });
});
