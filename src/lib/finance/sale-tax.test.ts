import { describe, it, expect } from "vitest";
import {
    computeSaleTax,
    IT_CAPITAL_GAIN_TAX,
    IT_GOVT_BOND_TAX,
} from "./sale-tax";

describe("computeSaleTax — calcolo base", () => {
    it("calcola plusvalenza, tassa 26% e netto su una vendita in profitto", () => {
        // 100 azioni @ 50€ vendute, comprate a 30€ -> gain 2000, tassa 520, netto 4480.
        const r = computeSaleTax({
            shares: 100,
            currentPrice: 50,
            averageCost: 30,
        });
        expect(r.grossProceeds).toBe(5000);
        expect(r.costBasis).toBe(3000);
        expect(r.capitalGain).toBe(2000);
        expect(r.isGain).toBe(true);
        expect(r.taxableGain).toBe(2000);
        expect(r.taxAmount).toBeCloseTo(520, 6);
        expect(r.netProceeds).toBeCloseTo(4480, 6);
        expect(r.taxRatePct).toBeCloseTo(IT_CAPITAL_GAIN_TAX * 100, 6);
        expect(r.effectiveTaxRate).toBeCloseTo(10.4, 4);
    });

    it("riconosce una minusvalenza e azzera la tassa", () => {
        // Vendita in perdita: 100 a 30€, comprate a 50€ -> loss 2000, no tax.
        const r = computeSaleTax({
            shares: 100,
            currentPrice: 30,
            averageCost: 50,
        });
        expect(r.capitalGain).toBe(-2000);
        expect(r.isGain).toBe(false);
        expect(r.taxableGain).toBe(0);
        expect(r.taxAmount).toBe(0);
        expect(r.netProceeds).toBe(r.grossProceeds);
        expect(r.remainingLoss).toBe(2000);
    });

    it("usa l'aliquota titoli di stato (12.5%) quando passata", () => {
        const r = computeSaleTax({
            shares: 1000,
            currentPrice: 105,
            averageCost: 100,
            taxRatePct: IT_GOVT_BOND_TAX * 100,
        });
        expect(r.capitalGain).toBe(5000);
        expect(r.taxRatePct).toBeCloseTo(12.5, 6);
        expect(r.taxAmount).toBeCloseTo(625, 6);
    });

    it("vendita in pareggio (capitalGain = 0): no tax, no aggiornamento minusvalenze", () => {
        const r = computeSaleTax({
            shares: 50,
            currentPrice: 20,
            averageCost: 20,
            accumulatedLosses: 1000,
        });
        expect(r.capitalGain).toBe(0);
        expect(r.isGain).toBe(false);
        expect(r.taxAmount).toBe(0);
        expect(r.netProceeds).toBe(r.grossProceeds);
        // Break-even non aggiunge minusvalenza al bagaglio: il residuo resta intatto.
        expect(r.remainingLoss).toBe(1000);
        expect(r.compensatedLoss).toBe(0);
    });
});

describe("computeSaleTax — compensazione minusvalenze", () => {
    it("compensa parzialmente quando le minusvalenze sono inferiori al gain", () => {
        // gain 2000, losses 800 -> taxableGain 1200, tassa 312, netto 5000-312 = 4688.
        const r = computeSaleTax({
            shares: 100,
            currentPrice: 50,
            averageCost: 30,
            accumulatedLosses: 800,
        });
        expect(r.compensatedLoss).toBe(800);
        expect(r.taxableGain).toBe(1200);
        expect(r.remainingLoss).toBe(0);
        expect(r.taxAmount).toBeCloseTo(312, 6);
    });

    it("compensa completamente quando le minusvalenze coprono tutto il gain", () => {
        // gain 2000, losses 2500 -> taxable 0, residuo 500.
        const r = computeSaleTax({
            shares: 100,
            currentPrice: 50,
            averageCost: 30,
            accumulatedLosses: 2500,
        });
        expect(r.compensatedLoss).toBe(2000);
        expect(r.taxableGain).toBe(0);
        expect(r.taxAmount).toBe(0);
        expect(r.remainingLoss).toBe(500);
    });

    it("nuova perdita si somma alle minusvalenze pregresse", () => {
        // loss 500, prior losses 1000 -> remainingLoss 1500.
        const r = computeSaleTax({
            shares: 100,
            currentPrice: 35,
            averageCost: 40,
            accumulatedLosses: 1000,
        });
        expect(r.capitalGain).toBe(-500);
        expect(r.remainingLoss).toBe(1500);
        expect(r.compensatedLoss).toBe(0);
    });
});

describe("computeSaleTax — sanitizzazione input (regressione #sale-tax-nan-propagation)", () => {
    // Bug storico: NaN/Infinity nei campi numerici produceva "€NaN" diffuso
    // su 4 KPI della SaleTaxModal, lasciando l'utente senza alcuna indicazione
    // sulla tassa dovuta. Tutti i campi del risultato devono restare finiti.
    function expectAllFinite(result: ReturnType<typeof computeSaleTax>) {
        expect(Number.isFinite(result.grossProceeds)).toBe(true);
        expect(Number.isFinite(result.costBasis)).toBe(true);
        expect(Number.isFinite(result.capitalGain)).toBe(true);
        expect(Number.isFinite(result.taxableGain)).toBe(true);
        expect(Number.isFinite(result.taxAmount)).toBe(true);
        expect(Number.isFinite(result.taxRatePct)).toBe(true);
        expect(Number.isFinite(result.compensatedLoss)).toBe(true);
        expect(Number.isFinite(result.remainingLoss)).toBe(true);
        expect(Number.isFinite(result.netProceeds)).toBe(true);
        expect(Number.isFinite(result.effectiveTaxRate)).toBe(true);
    }

    it("shares = NaN non produce €NaN nei campi del risultato", () => {
        const r = computeSaleTax({ shares: Number.NaN, currentPrice: 50, averageCost: 30 });
        expectAllFinite(r);
        expect(r.grossProceeds).toBe(0);
        expect(r.taxAmount).toBe(0);
    });

    it("currentPrice = Infinity viene normalizzato a 0 (no esplosione di gain)", () => {
        const r = computeSaleTax({
            shares: 100,
            currentPrice: Number.POSITIVE_INFINITY,
            averageCost: 30,
        });
        expectAllFinite(r);
        // Sanitizzazione conservativa: Infinity in un input fiscale e' un
        // segnale di corruzione, non un dato reale. Cade su 0 invece di
        // generare gain/tasse stratosferiche.
        expect(r.grossProceeds).toBe(0);
    });

    it("averageCost = NaN (cost basis sconosciuto) NON corrompe il risultato", () => {
        // Sanity: il fallback 0 e' deliberato. In assenza di costo medio
        // valido, l'intera vendita e' trattata come gain (regola fiscale
        // italiana per posizioni senza cost basis riconosciuto).
        const r = computeSaleTax({ shares: 100, currentPrice: 50, averageCost: Number.NaN });
        expectAllFinite(r);
        expect(r.costBasis).toBe(0);
        expect(r.capitalGain).toBe(5000);
    });

    it("shares negative vengono sanificate a 0 (no gain artificiale)", () => {
        const r = computeSaleTax({ shares: -100, currentPrice: 50, averageCost: 30 });
        expectAllFinite(r);
        expect(r.grossProceeds).toBe(0);
        expect(r.costBasis).toBe(0);
        expect(r.capitalGain).toBe(0);
        expect(r.taxAmount).toBe(0);
    });

    it("currentPrice negativo viene sanificato a 0", () => {
        const r = computeSaleTax({ shares: 100, currentPrice: -50, averageCost: 30 });
        expectAllFinite(r);
        expect(r.grossProceeds).toBe(0);
    });

    it("accumulatedLosses negative o NaN cadono su 0 (niente compensazione spuria)", () => {
        const negative = computeSaleTax({
            shares: 100,
            currentPrice: 50,
            averageCost: 30,
            accumulatedLosses: -500,
        });
        expectAllFinite(negative);
        expect(negative.compensatedLoss).toBe(0);
        expect(negative.remainingLoss).toBe(0);
        expect(negative.taxableGain).toBe(2000);

        const naN = computeSaleTax({
            shares: 100,
            currentPrice: 50,
            averageCost: 30,
            accumulatedLosses: Number.NaN,
        });
        expectAllFinite(naN);
        expect(naN.compensatedLoss).toBe(0);
        expect(naN.remainingLoss).toBe(0);
    });

    it("tutti gli input NaN producono comunque output finiti (degraded ma stabile)", () => {
        const r = computeSaleTax({
            shares: Number.NaN,
            currentPrice: Number.NaN,
            averageCost: Number.NaN,
            taxRatePct: Number.NaN,
            accumulatedLosses: Number.NaN,
        });
        expectAllFinite(r);
        expect(r.grossProceeds).toBe(0);
        expect(r.costBasis).toBe(0);
        expect(r.taxAmount).toBe(0);
        expect(r.netProceeds).toBe(0);
        // taxRatePct NaN cade sul default 26%, garantendo coerenza con la UI.
        expect(r.taxRatePct).toBeCloseTo(IT_CAPITAL_GAIN_TAX * 100, 6);
    });
});

describe("computeSaleTax — clamping aliquota (regressione #sale-tax-rate-out-of-bounds)", () => {
    // Bug storico: un taxRatePct > 100 producava netProceeds NEGATIVI (impossibile:
    // peggior caso fiscalmente reale e' aliquota 100%, ovvero esproprio totale del
    // guadagno; mai oltre). Una tax rate negativa simulava un sussidio inesistente.
    it("aliquota > 100 viene clampata a 100 (no netProceeds negativi)", () => {
        const r = computeSaleTax({
            shares: 100,
            currentPrice: 50,
            averageCost: 30,
            taxRatePct: 200,
        });
        expect(r.taxRatePct).toBe(100);
        expect(r.taxAmount).toBe(2000);     // 100% del taxableGain
        expect(r.netProceeds).toBeCloseTo(3000, 6);   // grossProceeds 5000 - 2000
        expect(r.netProceeds).toBeGreaterThanOrEqual(r.costBasis);
        expect(r.effectiveTaxRate).toBeCloseTo(40, 6); // 2000 / 5000 * 100
    });

    it("aliquota negativa viene clampata a 0 (no tassa fittizia)", () => {
        const r = computeSaleTax({
            shares: 100,
            currentPrice: 50,
            averageCost: 30,
            taxRatePct: -5,
        });
        expect(r.taxRatePct).toBe(0);
        expect(r.taxAmount).toBe(0);
        expect(r.netProceeds).toBe(r.grossProceeds);
    });

    it("aliquota Infinity cade sul default 26% (input invalido != aliquota piena)", () => {
        const r = computeSaleTax({
            shares: 100,
            currentPrice: 50,
            averageCost: 30,
            taxRatePct: Number.POSITIVE_INFINITY,
        });
        expect(r.taxRatePct).toBeCloseTo(IT_CAPITAL_GAIN_TAX * 100, 6);
    });

    it("aliquota 0% legittima (es. esenzione) viene rispettata", () => {
        const r = computeSaleTax({
            shares: 100,
            currentPrice: 50,
            averageCost: 30,
            taxRatePct: 0,
        });
        expect(r.taxRatePct).toBe(0);
        expect(r.taxAmount).toBe(0);
        expect(r.netProceeds).toBe(r.grossProceeds);
    });
});

describe("computeSaleTax — invarianti su netProceeds", () => {
    it("netProceeds >= costBasis quando il gain e' positivo (max imposta = 100% del gain)", () => {
        // Property: anche con aliquota piena, l'utente non puo' incassare meno
        // del costo originario sull'investimento (che e' la peggior fattispecie).
        const r = computeSaleTax({
            shares: 10,
            currentPrice: 200,
            averageCost: 100,
            taxRatePct: 100, // aliquota piena legittima
        });
        expect(r.taxAmount).toBeCloseTo(1000, 6);
        expect(r.netProceeds).toBeCloseTo(1000, 6); // = costBasis
        expect(r.netProceeds).toBeGreaterThanOrEqual(r.costBasis);
    });

    it("netProceeds = grossProceeds quando la vendita e' in perdita (no tassa)", () => {
        const r = computeSaleTax({
            shares: 50,
            currentPrice: 10,
            averageCost: 25,
        });
        expect(r.netProceeds).toBe(r.grossProceeds);
        expect(r.taxAmount).toBe(0);
    });

    it("effectiveTaxRate <= taxRatePct (mai sopra l'aliquota nominale)", () => {
        // Sanity check: l'aliquota effettiva sul ricavo lordo non puo' superare
        // l'aliquota nominale applicata sul gain (perche' il gain <= ricavo lordo).
        const r = computeSaleTax({
            shares: 100,
            currentPrice: 50,
            averageCost: 30,
        });
        expect(r.effectiveTaxRate).toBeLessThanOrEqual(r.taxRatePct);
    });
});
