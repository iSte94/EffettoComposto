/**
 * Coast FIRE Scenarios
 *
 * Calcola il capitale "Coast FIRE" — la cifra minima che, smettendo di contribuire
 * oggi, permette al compound interest di raggiungere l'obiettivo FIRE entro la
 * pensione — sotto tre scenari di mercato (Bear / Base / Bull) e integrando
 * la pensione di stato (INPS) come flusso perpetuo dal publicPensionAge.
 *
 * Tutto calcolato in euro odierni usando rendimenti reali (equazione di Fisher).
 */

import { computeRealReturn } from "./fire-projection";

export type CoastFireScenario = "bear" | "base" | "bull";

export interface PassiveIncomeStream {
    annualAmount: number;
    startAge: number;
    endAge?: number;
}

export interface CoastFireInput {
    currentAge: number;
    retirementAge: number;             // Età a cui si smette di lavorare
    publicPensionAge: number;          // Età di accesso alla pensione INPS
    currentCapital: number;            // Capitale liquido attuale
    monthlyExpenses: number;           // Spese mensili attese in pensione (oggi)
    monthlyPublicPension: number;      // Pensione INPS netta mensile (oggi)
    monthlyRealEstateIncome?: number;  // Eventuale rendita immobiliare netta
    passiveIncomeStreams?: PassiveIncomeStream[]; // Rendite programmate (es. immobili futuri)
    withdrawalRatePct: number;         // SWR %
    nominalReturnPct: number;          // Rendimento nominale atteso base (es. 6%)
    inflationPct: number;              // Inflazione attesa (es. 2%)
    lifeExpectancy?: number;           // Default 90
}

export interface CoastFireScenarioResult {
    scenario: CoastFireScenario;
    label: string;
    realReturnPct: number;             // rendimento reale in %
    coastFireTarget: number;           // Capitale minimo Coast FIRE (oggi)
    fireTargetNet: number;             // FIRE target al netto della PV pensione/rendite
    pensionPresentValue: number;       // PV della pensione al momento retirement
    passiveIncomePresentValue: number; // PV rendite immobiliari
    coastFireReached: boolean;
    yearsToCoastFire: number | null;   // Se non raggiunto: anni mancanti assumendo risparmio = 0
    surplusOrGap: number;              // Capitale attuale − coastFireTarget
}

export interface CoastFireResult {
    currentAge: number;
    retirementAge: number;
    publicPensionAge: number;
    currentCapital: number;
    scenarios: CoastFireScenarioResult[];
    baseFireTarget: number;            // FIRE target lordo (senza pensione)
}

const DEFAULT_LIFE_EXPECTANCY = 90;

const SCENARIO_LABELS: Record<CoastFireScenario, string> = {
    bear: "Bear (conservativo)",
    base: "Base (realistico)",
    bull: "Bull (ottimista)",
};

/**
 * Present Value di una rendita annuale netta, iniziante tra `deferredYears` anni
 * e durata `duration` anni, scontata a tasso reale `realReturn`.
 * Usa la formula della rendita posticipata:
 *   PV = CF * (1 - (1+r)^-duration) / r / (1+r)^deferredYears
 */
function presentValueOfAnnuity(annualCashflow: number, realReturn: number, deferredYears: number, duration: number): number {
    if (annualCashflow === 0 || duration <= 0) return 0;
    if (Math.abs(realReturn) < 1e-6) {
        return annualCashflow * duration;
    }
    const annuityFactor = (1 - Math.pow(1 + realReturn, -duration)) / realReturn;
    const discount = Math.pow(1 + realReturn, -Math.max(0, deferredYears));
    return annualCashflow * annuityFactor * discount;
}

/** Anni necessari perché `capital` cresca fino a `target` a rendimento composto reale */
function yearsToGrow(capital: number, target: number, realReturn: number): number | null {
    if (capital <= 0 || target <= 0) return null;
    if (capital >= target) return 0;
    if (realReturn <= 0) return null;
    return Math.log(target / capital) / Math.log(1 + realReturn);
}

export function computeCoastFireScenarios(input: CoastFireInput): CoastFireResult {
    const {
        currentAge,
        retirementAge,
        publicPensionAge,
        currentCapital,
        monthlyExpenses,
        monthlyPublicPension,
        monthlyRealEstateIncome = 0,
        passiveIncomeStreams = [],
        withdrawalRatePct,
        nominalReturnPct,
        inflationPct,
        lifeExpectancy = DEFAULT_LIFE_EXPECTANCY,
    } = input;

    const annualExpenses = monthlyExpenses * 12;
    const annualPension = Math.max(0, monthlyPublicPension * 12);
    const yearsToRetire = Math.max(0, retirementAge - currentAge);
    const pensionDeferredYears = Math.max(0, publicPensionAge - retirementAge);
    const pensionDuration = Math.max(0, lifeExpectancy - Math.max(retirementAge, publicPensionAge));
    const normalizedPassiveStreams = passiveIncomeStreams.length > 0
        ? passiveIncomeStreams
        : (monthlyRealEstateIncome === 0
            ? []
            : [{ annualAmount: monthlyRealEstateIncome * 12, startAge: retirementAge, endAge: lifeExpectancy }]);

    const swr = Math.max(0.1, withdrawalRatePct) / 100;
    const baseFireTarget = annualExpenses / swr;

    // Base real return (scenario bull = +2%, bear = -2%)
    const baseReal = computeRealReturn(nominalReturnPct, inflationPct);

    const scenarioReturns: Record<CoastFireScenario, number> = {
        bear: Math.max(0.001, baseReal - 0.02),
        base: baseReal,
        bull: baseReal + 0.02,
    };

    const scenarios: CoastFireScenarioResult[] = (["bear", "base", "bull"] as CoastFireScenario[]).map((s) => {
        const r = scenarioReturns[s];

        // PV di pensione e rendita immobiliare al momento del retirement
        const pensionPV = presentValueOfAnnuity(annualPension, r, pensionDeferredYears, pensionDuration);
        const passivePV = normalizedPassiveStreams.reduce((acc, stream) => {
            const annualAmount = Number.isFinite(stream.annualAmount) ? stream.annualAmount : 0;
            if (annualAmount === 0) return acc;

            const streamStartAge = Number.isFinite(stream.startAge) ? stream.startAge : retirementAge;
            const streamEndAge = Number.isFinite(stream.endAge) ? (stream.endAge as number) : lifeExpectancy;
            const effectiveStartAge = Math.max(retirementAge, streamStartAge);
            const effectiveEndAge = Math.min(lifeExpectancy, Math.max(effectiveStartAge, streamEndAge));
            const duration = Math.max(0, effectiveEndAge - effectiveStartAge);
            const deferredYears = Math.max(0, effectiveStartAge - retirementAge);
            if (duration <= 0) return acc;

            return acc + presentValueOfAnnuity(annualAmount, r, deferredYears, duration);
        }, 0);

        // FIRE target netto richiesto dal portafoglio al retirement
        const fireTargetNet = Math.max(0, baseFireTarget - pensionPV - passivePV);

        // Coast FIRE target = FIRE target netto scontato a oggi
        const coastFireTarget = fireTargetNet / Math.pow(1 + r, yearsToRetire);

        const coastFireReached = currentCapital >= coastFireTarget;
        const surplusOrGap = currentCapital - coastFireTarget;
        const yearsToCoastFire = coastFireReached ? 0 : yearsToGrow(currentCapital, coastFireTarget, r);

        return {
            scenario: s,
            label: SCENARIO_LABELS[s],
            realReturnPct: r * 100,
            coastFireTarget,
            fireTargetNet,
            pensionPresentValue: pensionPV,
            passiveIncomePresentValue: passivePV,
            coastFireReached,
            yearsToCoastFire,
            surplusOrGap,
        };
    });

    return {
        currentAge,
        retirementAge,
        publicPensionAge,
        currentCapital,
        scenarios,
        baseFireTarget,
    };
}
