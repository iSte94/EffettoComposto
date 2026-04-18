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

import type { PreRetirementPassiveIncomeAllocationMode } from "@/types";
import { computeRealReturn } from "./fire-projection";

export type CoastFireScenario = "bear" | "base" | "bull";

export interface PassiveIncomeStream {
    label?: string;
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
    applyTaxStamp?: boolean;           // Bollo titoli 0.2% annuo sul portafoglio tassabile
    preRetirementPassiveIncomeMode?: PreRetirementPassiveIncomeAllocationMode;
    preRetirementPassiveIncomeSavingsPct?: number;
    preRetirementPassiveIncomeSavingsAnnual?: number;
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

export interface PassiveIncomeBreakdownEntry {
    label: string;
    annualAmount: number;
    startAge: number;
    endAge: number;
    durationYears: number;
    presentValueAtRetirement: number;
    presentValueToday: number;
}

export interface FireTargetProjectionInput {
    retirementAge: number;
    publicPensionAge: number;
    monthlyExpenses: number;
    monthlyPublicPension: number;
    monthlyRealEstateIncome?: number;
    passiveIncomeStreams?: PassiveIncomeStream[];
    withdrawalRatePct: number;
    nominalReturnPct: number;
    inflationPct: number;
    applyTaxStamp?: boolean;
    lifeExpectancy?: number;
}

export interface FireTargetProjectionResult {
    realReturnPct: number;
    baseFireTarget: number;
    fireTargetNet: number;
    pensionPresentValue: number;
    passiveIncomePresentValue: number;
}

export interface DynamicFireTargetScheduleInput extends Omit<FireTargetProjectionInput, "retirementAge"> {
    currentAge: number;
    maxYears: number;
    scenario?: CoastFireScenario;
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

function normalizePassiveIncomeStreams(
    currentAge: number | undefined,
    retirementAge: number,
    lifeExpectancy: number,
    monthlyRealEstateIncome: number,
    passiveIncomeStreams: PassiveIncomeStream[],
): PassiveIncomeStream[] {
    if (passiveIncomeStreams.length > 0) return passiveIncomeStreams;
    if (monthlyRealEstateIncome === 0) return [];

    return [{
        label: "Rendita immobiliare",
        annualAmount: monthlyRealEstateIncome * 12,
        startAge: currentAge ?? retirementAge,
        endAge: lifeExpectancy,
    }];
}

function getScenarioRealReturn(
    nominalReturnPct: number,
    inflationPct: number,
    scenario: CoastFireScenario,
    applyTaxStamp = false,
): number {
    const baseReal = computeRealReturn(nominalReturnPct, inflationPct);
    const grossScenarioReal = (() => {
        switch (scenario) {
            case "bear":
                return Math.max(0.001, baseReal - 0.02);
            case "bull":
                return baseReal + 0.02;
            case "base":
            default:
                return baseReal;
        }
    })();

    return applyTaxStamp ? grossScenarioReal - 0.002 : grossScenarioReal;
}

function getMonthlyReturnRate(realReturn: number): number {
    return Math.pow(1 + realReturn, 1 / 12) - 1;
}

function getStreamEndAge(stream: PassiveIncomeStream, lifeExpectancy: number): number {
    return Number.isFinite(stream.endAge) ? (stream.endAge as number) : lifeExpectancy;
}

function getActivePassiveIncomeAnnualAtAge(
    passiveIncomeStreams: PassiveIncomeStream[],
    age: number,
    retirementAge: number,
    lifeExpectancy: number,
): number {
    return passiveIncomeStreams.reduce((acc, stream) => {
        const annualAmount = Number.isFinite(stream.annualAmount) ? stream.annualAmount : 0;
        if (annualAmount === 0) return acc;

        const startAge = Number.isFinite(stream.startAge) ? stream.startAge : retirementAge;
        const endAge = getStreamEndAge(stream, lifeExpectancy);
        const effectiveEndAge = Math.min(retirementAge, endAge);
        if (age + 1e-9 < startAge || age >= effectiveEndAge) return acc;

        return acc + annualAmount;
    }, 0);
}

export function allocatePreRetirementPassiveIncomeAnnual(input: {
    annualPassiveIncome: number;
    mode?: PreRetirementPassiveIncomeAllocationMode;
    savingsPct?: number;
    savingsAnnual?: number;
}): {
    savingsAnnual: number;
    spendingAnnual: number;
} {
    const annualPassiveIncome = Number.isFinite(input.annualPassiveIncome) ? input.annualPassiveIncome : 0;
    if (annualPassiveIncome <= 0) {
        return {
            savingsAnnual: annualPassiveIncome,
            spendingAnnual: 0,
        };
    }

    if (input.mode === "fixed") {
        const savingsAnnual = Math.max(0, Math.min(annualPassiveIncome, Number.isFinite(input.savingsAnnual) ? (input.savingsAnnual as number) : 0));
        return {
            savingsAnnual,
            spendingAnnual: Math.max(0, annualPassiveIncome - savingsAnnual),
        };
    }

    const savingsPct = Math.min(100, Math.max(0, Number.isFinite(input.savingsPct) ? (input.savingsPct as number) : 100));
    const savingsAnnual = annualPassiveIncome * (savingsPct / 100);

    return {
        savingsAnnual,
        spendingAnnual: Math.max(0, annualPassiveIncome - savingsAnnual),
    };
}

export function estimatePreRetirementPassiveIncomeAnnual(
    passiveIncomeStreams: PassiveIncomeStream[],
    currentAge: number,
    retirementAge: number,
    lifeExpectancy = DEFAULT_LIFE_EXPECTANCY,
): number {
    const annualIncome = passiveIncomeStreams.reduce((acc, stream) => {
        const annualAmount = Number.isFinite(stream.annualAmount) ? stream.annualAmount : 0;
        const startAge = Number.isFinite(stream.startAge) ? stream.startAge : retirementAge;
        const endAge = getStreamEndAge(stream, lifeExpectancy);
        const overlapsPreRetirement = startAge < retirementAge && endAge > currentAge;

        if (!overlapsPreRetirement) return acc;
        return acc + annualAmount;
    }, 0);

    return Math.max(0, annualIncome);
}

function computePreRetirementPassiveSavingsFutureValueAtRetirement(
    input: CoastFireInput,
    scenario: CoastFireScenario,
): number {
    const {
        currentAge,
        retirementAge,
        monthlyRealEstateIncome = 0,
        passiveIncomeStreams = [],
        nominalReturnPct,
        inflationPct,
        applyTaxStamp = false,
        preRetirementPassiveIncomeMode = "percent",
        preRetirementPassiveIncomeSavingsPct = 100,
        preRetirementPassiveIncomeSavingsAnnual = 0,
        lifeExpectancy = DEFAULT_LIFE_EXPECTANCY,
    } = input;

    const monthsToRetirement = Math.max(0, Math.round((retirementAge - currentAge) * 12));
    if (monthsToRetirement <= 0) return 0;

    const normalizedPassiveStreams = normalizePassiveIncomeStreams(
        currentAge,
        retirementAge,
        lifeExpectancy,
        monthlyRealEstateIncome,
        passiveIncomeStreams,
    );
    if (normalizedPassiveStreams.length === 0) return 0;

    const realReturn = getScenarioRealReturn(nominalReturnPct, inflationPct, scenario, applyTaxStamp);
    const monthlyReturn = getMonthlyReturnRate(realReturn);

    let futureValue = 0;
    for (let monthIndex = 0; monthIndex < monthsToRetirement; monthIndex++) {
        const ageAtMonthStart = currentAge + (monthIndex / 12);
        const annualPassiveIncome = getActivePassiveIncomeAnnualAtAge(
            normalizedPassiveStreams,
            ageAtMonthStart,
            retirementAge,
            lifeExpectancy,
        );
        if (annualPassiveIncome === 0) continue;

        const allocation = allocatePreRetirementPassiveIncomeAnnual({
            annualPassiveIncome,
            mode: preRetirementPassiveIncomeMode,
            savingsPct: preRetirementPassiveIncomeSavingsPct,
            savingsAnnual: preRetirementPassiveIncomeSavingsAnnual,
        });
        const monthlySavings = allocation.savingsAnnual / 12;
        if (monthlySavings === 0) continue;

        const remainingMonths = monthsToRetirement - (monthIndex + 1);
        futureValue += monthlySavings * Math.pow(1 + monthlyReturn, remainingMonths);
    }

    return futureValue;
}

export function computeFireTargetForRetirementAge(
    input: FireTargetProjectionInput,
    scenario: CoastFireScenario = "base",
): FireTargetProjectionResult {
    const {
        retirementAge,
        publicPensionAge,
        monthlyExpenses,
        monthlyPublicPension,
        monthlyRealEstateIncome = 0,
        passiveIncomeStreams = [],
        withdrawalRatePct,
        nominalReturnPct,
        inflationPct,
        applyTaxStamp = false,
        lifeExpectancy = DEFAULT_LIFE_EXPECTANCY,
    } = input;

    const annualExpenses = monthlyExpenses * 12;
    const annualPension = Math.max(0, monthlyPublicPension * 12);
    const pensionDeferredYears = Math.max(0, publicPensionAge - retirementAge);
    const pensionDuration = Math.max(0, lifeExpectancy - Math.max(retirementAge, publicPensionAge));
    const normalizedPassiveStreams = normalizePassiveIncomeStreams(
        undefined,
        retirementAge,
        lifeExpectancy,
        monthlyRealEstateIncome,
        passiveIncomeStreams,
    );

    const swr = Math.max(0.1, withdrawalRatePct) / 100;
    const baseFireTarget = annualExpenses / swr;
    const realReturn = getScenarioRealReturn(nominalReturnPct, inflationPct, scenario, applyTaxStamp);

    const pensionPV = presentValueOfAnnuity(annualPension, realReturn, pensionDeferredYears, pensionDuration);
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

        return acc + presentValueOfAnnuity(annualAmount, realReturn, deferredYears, duration);
    }, 0);

    return {
        realReturnPct: realReturn * 100,
        baseFireTarget,
        fireTargetNet: Math.max(0, baseFireTarget - pensionPV - passivePV),
        pensionPresentValue: pensionPV,
        passiveIncomePresentValue: passivePV,
    };
}

export function buildDynamicFireTargetSchedule(input: DynamicFireTargetScheduleInput): number[] {
    const {
        currentAge,
        maxYears,
        scenario = "base",
        ...projectionInput
    } = input;

    return Array.from({ length: Math.max(0, maxYears) + 1 }, (_, year) => {
        const result = computeFireTargetForRetirementAge({
            ...projectionInput,
            retirementAge: currentAge + year,
        }, scenario);

        return result.fireTargetNet;
    });
}

export function buildPassiveIncomeBreakdown(
    input: CoastFireInput,
    scenario: CoastFireScenario = "base",
): PassiveIncomeBreakdownEntry[] {
    const {
        currentAge,
        retirementAge,
        monthlyRealEstateIncome = 0,
        passiveIncomeStreams = [],
        nominalReturnPct,
        inflationPct,
        applyTaxStamp = false,
        lifeExpectancy = DEFAULT_LIFE_EXPECTANCY,
    } = input;

    const realReturn = getScenarioRealReturn(nominalReturnPct, inflationPct, scenario, applyTaxStamp);
    const yearsToRetire = Math.max(0, retirementAge - currentAge);
    const normalizedPassiveStreams = normalizePassiveIncomeStreams(
        currentAge,
        retirementAge,
        lifeExpectancy,
        monthlyRealEstateIncome,
        passiveIncomeStreams,
    );

    return normalizedPassiveStreams.flatMap((stream, index) => {
        const annualAmount = Number.isFinite(stream.annualAmount) ? stream.annualAmount : 0;
        if (annualAmount === 0) return [];

        const streamStartAge = Number.isFinite(stream.startAge) ? stream.startAge : retirementAge;
        const streamEndAge = Number.isFinite(stream.endAge) ? (stream.endAge as number) : lifeExpectancy;
        const effectiveStartAge = Math.max(retirementAge, streamStartAge);
        const effectiveEndAge = Math.min(lifeExpectancy, Math.max(effectiveStartAge, streamEndAge));
        const durationYears = Math.max(0, effectiveEndAge - effectiveStartAge);
        if (durationYears <= 0) return [];

        const deferredYears = Math.max(0, effectiveStartAge - retirementAge);
        const presentValueAtRetirement = presentValueOfAnnuity(annualAmount, realReturn, deferredYears, durationYears);
        const presentValueToday = presentValueAtRetirement / Math.pow(1 + realReturn, yearsToRetire);

        return [{
            label: stream.label?.trim() || `Rendita ${index + 1}`,
            annualAmount,
            startAge: effectiveStartAge,
            endAge: effectiveEndAge,
            durationYears,
            presentValueAtRetirement,
            presentValueToday,
        }];
    });
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
        applyTaxStamp = false,
        preRetirementPassiveIncomeMode,
        preRetirementPassiveIncomeSavingsPct,
        preRetirementPassiveIncomeSavingsAnnual,
        lifeExpectancy = DEFAULT_LIFE_EXPECTANCY,
    } = input;

    const yearsToRetire = Math.max(0, retirementAge - currentAge);
    const baseTargetProjection = computeFireTargetForRetirementAge({
        retirementAge,
        publicPensionAge,
        monthlyExpenses,
        monthlyPublicPension,
        monthlyRealEstateIncome,
        passiveIncomeStreams,
        withdrawalRatePct,
        nominalReturnPct,
        inflationPct,
        applyTaxStamp,
        lifeExpectancy,
    });

    const scenarios: CoastFireScenarioResult[] = (["bear", "base", "bull"] as CoastFireScenario[]).map((s) => {
        const targetProjection = s === "base"
            ? baseTargetProjection
            : computeFireTargetForRetirementAge({
                retirementAge,
                publicPensionAge,
                monthlyExpenses,
                monthlyPublicPension,
                monthlyRealEstateIncome,
                passiveIncomeStreams,
                withdrawalRatePct,
                nominalReturnPct,
                inflationPct,
                applyTaxStamp,
                lifeExpectancy,
            }, s);
        const realReturn = targetProjection.realReturnPct / 100;
        const futureValueOfSavedPassiveIncome = computePreRetirementPassiveSavingsFutureValueAtRetirement({
            currentAge,
            retirementAge,
            publicPensionAge,
            currentCapital,
            monthlyExpenses,
            monthlyPublicPension,
            monthlyRealEstateIncome,
            passiveIncomeStreams,
            withdrawalRatePct,
            nominalReturnPct,
            inflationPct,
            applyTaxStamp,
            preRetirementPassiveIncomeMode,
            preRetirementPassiveIncomeSavingsPct,
            preRetirementPassiveIncomeSavingsAnnual,
            lifeExpectancy,
        }, s);

        // Coast FIRE target = target netto a retirement, meno il FV delle rendite
        // pre-FIRE effettivamente reinvestite, poi scontato a oggi.
        const coastFireTarget = Math.max(
            0,
            (targetProjection.fireTargetNet - futureValueOfSavedPassiveIncome) / Math.pow(1 + realReturn, yearsToRetire),
        );

        const coastFireReached = currentCapital >= coastFireTarget;
        const surplusOrGap = currentCapital - coastFireTarget;
        const yearsToCoastFire = coastFireReached ? 0 : yearsToGrow(currentCapital, coastFireTarget, realReturn);

        return {
            scenario: s,
            label: SCENARIO_LABELS[s],
            realReturnPct: targetProjection.realReturnPct,
            coastFireTarget,
            fireTargetNet: targetProjection.fireTargetNet,
            pensionPresentValue: targetProjection.pensionPresentValue,
            passiveIncomePresentValue: targetProjection.passiveIncomePresentValue,
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
        baseFireTarget: baseTargetProjection.baseFireTarget,
    };
}
