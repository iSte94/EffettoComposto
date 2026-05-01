import { describe, expect, it } from "vitest";
import {
    computeDelayCost,
    computeInflationAdjustedTotals,
    effectiveAnnualRatePct,
    simulateCompoundInterest,
} from "./compound-interest";
import { computeRealReturn } from "./fire-projection";

describe("simulateCompoundInterest", () => {
    it("anno 0 ha saldo = capitale iniziale e nessun interesse", () => {
        const result = simulateCompoundInterest({
            initialCapital: 10000,
            monthlyContribution: 300,
            annualRatePct: 7,
            years: 20,
        });

        expect(result.chartData[0]).toEqual({
            year: 0,
            label: "Oggi",
            deposited: 10000,
            interest: 0,
            total: 10000,
        });
    });

    it("totalDeposited cresce di monthlyContribution ogni mese", () => {
        // 5 anni × 12 mesi × 300 = 18000 di contributi + 10000 iniziali = 28000
        const result = simulateCompoundInterest({
            initialCapital: 10000,
            monthlyContribution: 300,
            annualRatePct: 0,
            years: 5,
        });

        expect(result.totalDeposited).toBeCloseTo(28000, 6);
        expect(result.totalInterest).toBeCloseTo(0, 6); // tasso 0
        expect(result.finalBalance).toBeCloseTo(28000, 6);
    });

    it("rendimento positivo produce interesse cumulato", () => {
        const result = simulateCompoundInterest({
            initialCapital: 10000,
            monthlyContribution: 300,
            annualRatePct: 7,
            years: 20,
        });

        // Verifica indipendente con la forma chiusa di una rendita posticipata mensile.
        const m = 0.07 / 12;
        const months = 20 * 12;
        const expectedFinal = 10000 * Math.pow(1 + m, months) + 300 * (Math.pow(1 + m, months) - 1) / m;
        expect(result.finalBalance).toBeCloseTo(expectedFinal, 4);
        expect(result.totalDeposited).toBeCloseTo(10000 + 300 * 240, 6);
        expect(result.totalInterest).toBeCloseTo(expectedFinal - (10000 + 300 * 240), 4);
    });

    it("genera years+1 punti (incluso anno 0)", () => {
        const result = simulateCompoundInterest({
            initialCapital: 1000,
            monthlyContribution: 100,
            annualRatePct: 5,
            years: 10,
        });
        expect(result.chartData).toHaveLength(11);
        expect(result.chartData.at(-1)?.year).toBe(10);
    });

    it("crossoverYear = null quando rendimento e/o orizzonte insufficienti", () => {
        const result = simulateCompoundInterest({
            initialCapital: 10000,
            monthlyContribution: 300,
            annualRatePct: 0,
            years: 5,
        });
        expect(result.crossoverYear).toBeNull();
    });

    it("crossoverYear identifica l'anno in cui interessi superano i versamenti", () => {
        const result = simulateCompoundInterest({
            initialCapital: 10000,
            monthlyContribution: 300,
            annualRatePct: 7,
            years: 40,
        });
        expect(result.crossoverYear).not.toBeNull();
        // Verifica indipendente: nell'anno di crossover, interest > deposited.
        const point = result.chartData.find((p) => p.year === result.crossoverYear);
        expect(point).toBeDefined();
        expect(point!.interest).toBeGreaterThan(point!.deposited);
        // Anno precedente: ancora deposited >= interest.
        const previous = result.chartData.find((p) => p.year === (result.crossoverYear ?? 0) - 1);
        if (previous) {
            expect(previous.deposited).toBeGreaterThanOrEqual(previous.interest);
        }
    });

    it("years frazionari vengono troncati", () => {
        const result = simulateCompoundInterest({
            initialCapital: 1000,
            monthlyContribution: 0,
            annualRatePct: 5,
            years: 5.7,
        });
        // floor(5.7) = 5 -> 6 punti.
        expect(result.chartData).toHaveLength(6);
    });

    it("input non finiti vengono sanificati a 0", () => {
        const result = simulateCompoundInterest({
            initialCapital: Number.NaN,
            monthlyContribution: Number.POSITIVE_INFINITY,
            annualRatePct: Number.NaN,
            years: Number.NaN,
        });
        expect(result.finalBalance).toBe(0);
        expect(result.totalDeposited).toBe(0);
        expect(result.totalInterest).toBe(0);
        expect(result.chartData).toHaveLength(1);
    });
});

describe("computeDelayCost", () => {
    const baseParams = {
        initialCapital: 10000,
        monthlyContribution: 300,
        annualRatePct: 7,
        years: 20,
    };

    it("delayMonths = 0 produce costo zero", () => {
        const result = computeDelayCost({ ...baseParams, delayMonths: 0 });
        expect(result.nominalCost).toBe(0);
        expect(result.compoundLoss).toBe(0);
        expect(result.missedContributions).toBe(0);
    });

    it("years = 0 produce costo zero", () => {
        const result = computeDelayCost({ ...baseParams, years: 0 });
        expect(result.nominalCost).toBe(0);
        expect(result.compoundLoss).toBe(0);
        expect(result.missedContributions).toBe(0);
    });

    it("a tasso 0% delayCost = monthlyContribution * delayMonths (no compound)", () => {
        const result = computeDelayCost({
            ...baseParams,
            annualRatePct: 0,
            delayMonths: 12,
        });
        // Senza compound, ritardare 12 mesi di €300 = -€3.600 a fine piano.
        expect(result.nominalCost).toBeCloseTo(300 * 12, 6);
        expect(result.missedContributions).toBe(300 * 12);
        // Compound loss = 0 a tasso zero: tutto il costo e' nominale.
        expect(result.compoundLoss).toBe(0);
    });

    it("REGRESSION: il costo del ritardo NON include la crescita del capitale iniziale", () => {
        // Bug originale: `balance(N) - balance(N-1)` includeva
        //   initial * [(1+r)^N - (1+r)^(N-12)]
        // come se fosse parte del "costo del ritardo", ma quel termine e'
        // identico nei due scenari (l'iniziale capitalizza in entrambi).
        //
        // Per ai parametri di esempio (10k iniziali, 300/mese, 7%, 20 anni):
        //   - Bug:    ~€16.760
        //   - Vero:   ~€14.020
        //   - Il termine spurio = 10000 * [(1.005833)^240 - (1.005833)^228] ≈ €2.700
        const result = computeDelayCost(baseParams);

        // Verifica indipendente con forma chiusa: delayCost = C * (1+m)^(N-d) * ((1+m)^d - 1) / m
        const m = 0.07 / 12;
        const N = 20 * 12;
        const d = 12;
        const expectedDelayCost = 300 * Math.pow(1 + m, N - d) * (Math.pow(1 + m, d) - 1) / m;

        expect(result.nominalCost).toBeCloseTo(expectedDelayCost, 4);
        expect(result.nominalCost).toBeGreaterThan(13_500);
        expect(result.nominalCost).toBeLessThan(14_500);

        // Sanity check: il bug originale dava un valore notevolmente piu' alto.
        // Verifichiamo che NON siamo a quel livello (altrimenti il fix non e' effettivo).
        const buggyValue = simulateBalanceLegacy(10000, 300, m, 240) - simulateBalanceLegacy(10000, 300, m, 228);
        expect(buggyValue - result.nominalCost).toBeGreaterThan(2_500); // termine spurio ~2700
        expect(buggyValue - result.nominalCost).toBeLessThan(3_000);
    });

    it("delayCost = noDelayBalance - delayedBalance (definizione semantica)", () => {
        const result = computeDelayCost(baseParams);
        // Verifica la definizione: il costo del ritardo e' esattamente la
        // differenza fra i due saldi finali (proprio cio' che il bug NON faceva).
        expect(result.nominalCost).toBeCloseTo(
            result.finalBalanceWithoutDelay - result.finalBalanceWithDelay,
            4,
        );
    });

    it("compoundLoss = nominalCost - missedContributions (sempre >= 0)", () => {
        const result = computeDelayCost(baseParams);
        expect(result.compoundLoss).toBeCloseTo(
            result.nominalCost - result.missedContributions,
            4,
        );
        expect(result.compoundLoss).toBeGreaterThan(0); // su 20 anni il compound mancato e' rilevante
        expect(result.compoundLoss).toBeGreaterThan(result.missedContributions); // 20 anni: compound > nominale missed
    });

    it("non e' indipendente dal capitale iniziale (BUG-FIX): aumentando l'initial NON aumenta il costo del ritardo", () => {
        // Conseguenza diretta del fix: il vero costo del ritardo dipende SOLO
        // dai contributi mancanti (e dalla loro capitalizzazione), NON dal
        // capitale iniziale. La versione buggy invece variava col capitale
        // perche' includeva la crescita del lump sum nell'ultimo anno.
        const small = computeDelayCost({ ...baseParams, initialCapital: 1_000 });
        const large = computeDelayCost({ ...baseParams, initialCapital: 1_000_000 });
        expect(small.nominalCost).toBeCloseTo(large.nominalCost, 4);
    });

    it("scala con monthlyContribution (linearita' nei contributi)", () => {
        const small = computeDelayCost({ ...baseParams, monthlyContribution: 100 });
        const large = computeDelayCost({ ...baseParams, monthlyContribution: 500 });
        // Costo del ritardo lineare in monthlyContribution: 5x contributi -> 5x costo.
        expect(large.nominalCost / small.nominalCost).toBeCloseTo(5, 4);
    });

    it("orizzonti piu' lunghi amplificano il compound loss", () => {
        const short = computeDelayCost({ ...baseParams, years: 5 });
        const long = computeDelayCost({ ...baseParams, years: 30 });
        // Il compound loss cresce esponenzialmente con l'orizzonte: 30 anni
        // fanno lavorare il compound molto di piu' dei 5 anni.
        expect(long.compoundLoss).toBeGreaterThan(short.compoundLoss);
        expect(long.compoundLoss).toBeGreaterThan(short.compoundLoss * 4);
    });

    it("delayMonths >= totalMonths: il ritardo copre l'intero orizzonte", () => {
        const result = computeDelayCost({
            ...baseParams,
            years: 1,
            delayMonths: 100,
        });
        // Lo scenario "delay" coincide col solo lump iniziale capitalizzato per N mesi.
        const m = 0.07 / 12;
        const expectedFinalDelayed = 10000 * Math.pow(1 + m, 12);
        expect(result.finalBalanceWithDelay).toBeCloseTo(expectedFinalDelayed, 4);
        // I missed contributions sono cappati al numero totale di mesi.
        expect(result.missedContributions).toBe(300 * 12);
    });

    it("input non finiti vengono sanificati a 0", () => {
        const result = computeDelayCost({
            initialCapital: Number.NaN,
            monthlyContribution: Number.POSITIVE_INFINITY,
            annualRatePct: Number.NaN,
            years: Number.NaN,
            delayMonths: Number.NaN,
        });
        expect(result.nominalCost).toBe(0);
        expect(result.compoundLoss).toBe(0);
    });
});

describe("effectiveAnnualRatePct", () => {
    it("TAN 0% -> TAEG 0% (no compound da estrarre)", () => {
        expect(effectiveAnnualRatePct(0)).toBe(0);
    });

    it("TAN 7% -> TAEG ~7.229% (capitalizzazione mensile)", () => {
        // (1 + 0.07/12)^12 - 1 = 0.07229008...
        const result = effectiveAnnualRatePct(7);
        expect(result).toBeCloseTo(7.22901, 4);
        // Spread positivo: il TAEG e' sempre > TAN per tassi positivi.
        expect(result).toBeGreaterThan(7);
    });

    it("coerenza con la simulazione: il saldo a 1 anno cresce del TAEG (no contributi)", () => {
        // Ogni euro investito senza versamenti aggiuntivi cresce, dopo 12 mesi
        // di capitalizzazione, esattamente del TAEG. Questa e' la definizione
        // operativa: il TAEG e' il rendimento annuo realmente percepito dalla
        // simulazione, lo stesso numero che si vedrebbe a saldo dopo 12 mesi.
        const tan = 7;
        const expectedTaeg = effectiveAnnualRatePct(tan);
        const sim = simulateCompoundInterest({
            initialCapital: 10_000,
            monthlyContribution: 0,
            annualRatePct: tan,
            years: 1,
        });
        const realizedYieldPct = (sim.finalBalance / 10_000 - 1) * 100;
        expect(realizedYieldPct).toBeCloseTo(expectedTaeg, 6);
    });

    it("monotono crescente nel TAN positivo", () => {
        expect(effectiveAnnualRatePct(3)).toBeLessThan(effectiveAnnualRatePct(5));
        expect(effectiveAnnualRatePct(5)).toBeLessThan(effectiveAnnualRatePct(7));
        expect(effectiveAnnualRatePct(7)).toBeLessThan(effectiveAnnualRatePct(10));
    });

    it("lo spread TAEG-TAN cresce col TAN (effetto compounding piu' forte)", () => {
        const spread3 = effectiveAnnualRatePct(3) - 3;
        const spread7 = effectiveAnnualRatePct(7) - 7;
        const spread12 = effectiveAnnualRatePct(12) - 12;
        // A tassi piu' alti il composto infrannuale "regala" piu' rendimento.
        expect(spread7).toBeGreaterThan(spread3);
        expect(spread12).toBeGreaterThan(spread7);
        // Sanity: a TAN ragionevoli lo spread sta sotto il punto percentuale.
        expect(spread7).toBeLessThan(0.5);
    });

    it("TAN negativo produce TAEG negativo ma piu' lieve (perdita attenuata dal composto)", () => {
        // (1 - 0.05/12)^12 - 1 = -0.04887...
        const result = effectiveAnnualRatePct(-5);
        expect(result).toBeLessThan(0);
        expect(result).toBeGreaterThan(-5); // attenuato rispetto al TAN
        expect(result).toBeCloseTo(-4.887, 2);
    });

    it("input non finiti vengono sanificati a 0", () => {
        expect(effectiveAnnualRatePct(Number.NaN)).toBe(0);
        expect(effectiveAnnualRatePct(Number.POSITIVE_INFINITY)).toBe(0);
        expect(effectiveAnnualRatePct(Number.NEGATIVE_INFINITY)).toBe(0);
    });

    it("TAN <= -1200% (fattore mensile <= 0): degenerazione a -100%", () => {
        // 1 + (-1200)/100/12 = 0 -> 0^12 - 1 = -1 -> -100%
        expect(effectiveAnnualRatePct(-1200)).toBe(-100);
        // Sotto la soglia continua a restituire -100% (fattore negativo).
        expect(effectiveAnnualRatePct(-2400)).toBe(-100);
    });
});

describe("computeInflationAdjustedTotals", () => {
    it("inflazione zero: realTotalDeposited == nominalTotalDeposited (sanity)", () => {
        const r = computeInflationAdjustedTotals({
            initialCapital: 10_000,
            monthlyContribution: 300,
            inflationRatePct: 0,
            years: 20,
        });
        expect(r.nominalTotalDeposited).toBe(10_000 + 300 * 240);
        expect(r.realTotalDeposited).toBeCloseTo(r.nominalTotalDeposited, 6);
    });

    it("inflazione positiva: realTotalDeposited < nominalTotalDeposited (i contributi futuri valgono meno)", () => {
        const r = computeInflationAdjustedTotals({
            initialCapital: 10_000,
            monthlyContribution: 300,
            inflationRatePct: 2,
            years: 20,
        });
        expect(r.realTotalDeposited).toBeLessThan(r.nominalTotalDeposited);
        // L'iniziale e' al tempo 0, NON viene deflazionato. La differenza e' tutta sui contributi.
        const realContribsOnly = r.realTotalDeposited - 10_000;
        const nominalContribsOnly = r.nominalTotalDeposited - 10_000;
        expect(realContribsOnly).toBeLessThan(nominalContribsOnly);
        // Stima: con 2% / 20 anni, i contributi reali sono ~80% del nominale.
        expect(realContribsOnly / nominalContribsOnly).toBeGreaterThan(0.7);
        expect(realContribsOnly / nominalContribsOnly).toBeLessThan(0.9);
    });

    it("solo capitale iniziale, no contributi: real == nominal == initial", () => {
        const r = computeInflationAdjustedTotals({
            initialCapital: 50_000,
            monthlyContribution: 0,
            inflationRatePct: 5,
            years: 10,
        });
        expect(r.realTotalDeposited).toBe(50_000);
        expect(r.nominalTotalDeposited).toBe(50_000);
    });

    it("years = 0: solo iniziale, nessun contributo da deflazionare", () => {
        const r = computeInflationAdjustedTotals({
            initialCapital: 10_000,
            monthlyContribution: 300,
            inflationRatePct: 3,
            years: 0,
        });
        expect(r.realTotalDeposited).toBe(10_000);
        expect(r.nominalTotalDeposited).toBe(10_000);
    });

    it("input non finiti / negativi vengono sanificati a 0", () => {
        const r = computeInflationAdjustedTotals({
            initialCapital: -1_000,
            monthlyContribution: Number.NaN,
            inflationRatePct: Number.POSITIVE_INFINITY,
            years: -5,
        });
        expect(r.realTotalDeposited).toBe(0);
        expect(r.nominalTotalDeposited).toBe(0);
    });

    it("verifica indipendente: sommatoria deflazionata mese per mese", () => {
        // Replica indipendente dell'algoritmo per blindare il calcolo:
        // realTotalDeposited = initial + Σ_{m=1..N*12} contributo / (1+i)^(m/12)
        const initialCapital = 5_000;
        const monthlyContribution = 250;
        const inflationRatePct = 3;
        const years = 5;
        const monthlyFactor = Math.pow(1 + inflationRatePct / 100, 1 / 12);

        let expected = initialCapital;
        let cumulativeFactor = 1;
        for (let m = 1; m <= years * 12; m++) {
            cumulativeFactor *= monthlyFactor;
            expected += monthlyContribution / cumulativeFactor;
        }

        const r = computeInflationAdjustedTotals({
            initialCapital,
            monthlyContribution,
            inflationRatePct,
            years,
        });
        expect(r.realTotalDeposited).toBeCloseTo(expected, 6);
    });

    it("REGRESSION: realGain ~ 0 quando rendimento nominale = inflazione", () => {
        // Bug originale (in compound-interest-calculator.tsx, line 52):
        //     const realGain = realFinalBalance - sim.totalDeposited;
        //
        // Mescolava un valore in euro REALI (saldo finale deflazionato) con un
        // valore in euro NOMINALI (somma grezza dei versamenti). Risultato:
        // ogni piano di accumulo veniva penalizzato con una falsa "perdita
        // reale", anche quando il rendimento reale era esattamente 0%.
        //
        // Caso canonico: 10k iniziali, 100€/mese, 2% nominale, 2% inflazione,
        // 20 anni. Rendimento reale (Fisher) = esattamente 0%, quindi:
        //   - Buggy: realGain ≈ -€4.125 (FALSA perdita)
        //   - Fix:   realGain ≈ €0 (corretto)
        const initialCapital = 10_000;
        const monthlyContribution = 100;
        const annualRatePct = 2;
        const inflationRatePct = 2;
        const years = 20;

        // Sanity: il rendimento reale e' esattamente 0%.
        expect(computeRealReturn(annualRatePct, inflationRatePct)).toBeCloseTo(0, 10);

        const sim = simulateCompoundInterest({
            initialCapital,
            monthlyContribution,
            annualRatePct,
            years,
        });
        const adjusted = computeInflationAdjustedTotals({
            initialCapital,
            monthlyContribution,
            inflationRatePct,
            years,
        });

        const inflationFactor = Math.pow(1 + inflationRatePct / 100, years);
        const realFinalBalance = sim.finalBalance / inflationFactor;
        const realGainFixed = realFinalBalance - adjusted.realTotalDeposited;
        const realGainBuggy = realFinalBalance - sim.totalDeposited;

        // Il fix produce un guadagno reale ~ 0 (tolleranza ±100€ su 20 anni di
        // compounding mensile con timing leggermente differito tra interesse e
        // contributo).
        expect(Math.abs(realGainFixed)).toBeLessThan(100);
        // La versione buggy invece riportava una falsa perdita di ~€4.125.
        expect(realGainBuggy).toBeLessThan(-3_500);
        // Il fix e' di magnitudine sensibile (>€3.5k di errore corretto).
        expect(realGainFixed - realGainBuggy).toBeGreaterThan(3_500);
    });

    it("REGRESSION: realGain >= 0 quando rendimento reale > 0 (caso PAC tipico)", () => {
        // 7% nominale, 2.5% inflazione, 20 anni: rendimento reale ~ 4.39% (Fisher).
        // Il PAC accumula valore reale, quindi realGain deve essere positivo.
        const initialCapital = 10_000;
        const monthlyContribution = 300;
        const annualRatePct = 7;
        const inflationRatePct = 2.5;
        const years = 20;

        const sim = simulateCompoundInterest({
            initialCapital,
            monthlyContribution,
            annualRatePct,
            years,
        });
        const adjusted = computeInflationAdjustedTotals({
            initialCapital,
            monthlyContribution,
            inflationRatePct,
            years,
        });

        const realFinalBalance = sim.finalBalance / Math.pow(1 + inflationRatePct / 100, years);
        const realGain = realFinalBalance - adjusted.realTotalDeposited;
        expect(realGain).toBeGreaterThan(0);
    });

    it("REGRESSION: realGain < 0 quando rendimento reale < 0 (inflazione divora il rendimento)", () => {
        const sim = simulateCompoundInterest({
            initialCapital: 10_000,
            monthlyContribution: 300,
            annualRatePct: 2,
            years: 20,
        });
        const adjusted = computeInflationAdjustedTotals({
            initialCapital: 10_000,
            monthlyContribution: 300,
            inflationRatePct: 5,
            years: 20,
        });
        const realFinalBalance = sim.finalBalance / Math.pow(1 + 5 / 100, 20);
        const realGain = realFinalBalance - adjusted.realTotalDeposited;
        expect(realGain).toBeLessThan(0);
    });
});

// === Helper di test: replica della formula buggy per dimostrare la regressione ===
//
// Volutamente NON esportato dal modulo: serve solo come "oracolo" per il test
// di regressione. Replica `balance(year=N)` calcolato dal vecchio loop a 12
// mesi per anno con `balance = balance * (1+m) + contribution` ad ogni mese.
function simulateBalanceLegacy(
    initial: number,
    monthlyContribution: number,
    monthlyRate: number,
    totalMonths: number,
): number {
    let balance = initial;
    for (let i = 0; i < totalMonths; i++) {
        balance = balance * (1 + monthlyRate) + monthlyContribution;
    }
    return balance;
}
