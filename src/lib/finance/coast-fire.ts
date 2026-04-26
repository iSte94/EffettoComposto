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
import { computeRealReturn, MIN_WITHDRAWAL_RATE_PCT } from "./fire-projection";

// === Sanitizzazione input (regressione #coast-fire-nan-propagation) ===
//
// Prima di questa hardening, `coast-fire.ts` accettava qualunque numero senza
// difese: un singolo NaN o Infinity proveniente da un campo form svuotato,
// da preferenze migrate male o da una `withdrawalRatePct` deserializzata come
// stringa non numerica si propagava attraverso TUTTI i derivati (target FIRE,
// PV pensione, PV rendite, Coast FIRE target dei tre scenari) producendo
// "€NaN" nella dashboard Coast FIRE oppure - peggio - `fireTargetNet = 0`
// con `withdrawalRatePct = +Infinity`, che faceva apparire l'utente come
// "gia' FIRE" quando in realta' il calcolo si era corrotto.
//
// La fix replica la strategia gia' adottata in `fire-projection.ts` (vedi
// commento "BUG FIX (NaN propagation)" su `projectFire`): ogni input numerico
// passa per `sanitize`/`sanitizeNonNegative` PRIMA di partecipare a qualunque
// formula. La SWR usa la stessa soglia minima `MIN_WITHDRAWAL_RATE_PCT`
// gia' canonica per il motore FIRE, evitando la duplicazione del literal `0.1`
// che la versione precedente clampava inline (e che falliva su NaN: in JS
// `Math.max(0.1, NaN) === NaN`).
function sanitize(value: number, fallback = 0): number {
    return Number.isFinite(value) ? value : fallback;
}

function sanitizeNonNegative(value: number, fallback = 0): number {
    const finite = sanitize(value, fallback);
    return finite < 0 ? 0 : finite;
}

function sanitizeWithdrawalRatePct(value: number): number {
    const finite = sanitize(value, MIN_WITHDRAWAL_RATE_PCT);
    return finite < MIN_WITHDRAWAL_RATE_PCT ? MIN_WITHDRAWAL_RATE_PCT : finite;
}

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
    const safeCashflow = sanitize(annualCashflow);
    const safeReturn = sanitize(realReturn);
    const safeDuration = sanitizeNonNegative(duration);
    const safeDeferred = sanitizeNonNegative(deferredYears);
    if (safeCashflow === 0 || safeDuration <= 0) return 0;
    // Guard: tasso reale <= -100% renderebbe `1 + safeReturn <= 0` e
    // produrrebbe Math.pow di base non positiva con esponente non intero
    // (NaN). In quello scenario degenere ricadiamo sulla rendita non scontata.
    if (1 + safeReturn <= 0) {
        return safeCashflow * safeDuration;
    }
    if (Math.abs(safeReturn) < 1e-6) {
        return safeCashflow * safeDuration;
    }
    const annuityFactor = (1 - Math.pow(1 + safeReturn, -safeDuration)) / safeReturn;
    const discount = Math.pow(1 + safeReturn, -safeDeferred);
    const result = safeCashflow * annuityFactor * discount;
    return Number.isFinite(result) ? result : 0;
}

/** Anni necessari perché `capital` cresca fino a `target` a rendimento composto reale */
function yearsToGrow(capital: number, target: number, realReturn: number): number | null {
    const safeCapital = sanitize(capital);
    const safeTarget = sanitize(target);
    const safeReturn = sanitize(realReturn);
    if (safeCapital <= 0 || safeTarget <= 0) return null;
    if (safeCapital >= safeTarget) return 0;
    if (safeReturn <= 0) return null;
    const result = Math.log(safeTarget / safeCapital) / Math.log(1 + safeReturn);
    return Number.isFinite(result) ? result : null;
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

    // Sanitizza ogni input numerico PRIMA di derivarne quantita': qualunque
    // NaN/Infinity in `monthlyExpenses`, `monthlyPublicPension`, le eta',
    // i tassi o la SWR contaminerebbe `annualExpenses`, `swr`, `baseFireTarget`
    // e a cascata `fireTargetNet` (mostrando "€NaN" o falsi traguardi).
    const safeRetirementAge = sanitize(retirementAge);
    const safePublicPensionAge = sanitize(publicPensionAge);
    const safeLifeExpectancy = sanitize(lifeExpectancy, DEFAULT_LIFE_EXPECTANCY);
    const safeMonthlyExpenses = sanitizeNonNegative(monthlyExpenses);
    const safeMonthlyPublicPension = sanitizeNonNegative(monthlyPublicPension);
    const safeMonthlyRealEstateIncome = sanitize(monthlyRealEstateIncome);

    const annualExpenses = safeMonthlyExpenses * 12;
    const annualPension = safeMonthlyPublicPension * 12;
    const pensionDeferredYears = Math.max(0, safePublicPensionAge - safeRetirementAge);
    const pensionDuration = Math.max(0, safeLifeExpectancy - Math.max(safeRetirementAge, safePublicPensionAge));
    const normalizedPassiveStreams = normalizePassiveIncomeStreams(
        undefined,
        safeRetirementAge,
        safeLifeExpectancy,
        safeMonthlyRealEstateIncome,
        passiveIncomeStreams,
    );

    // Usa il MIN_WITHDRAWAL_RATE_PCT canonico: la fix originaria
    // `Math.max(0.1, withdrawalRatePct)` falliva su NaN (ritorna NaN) e
    // Infinity (produceva swr Infinito -> baseFireTarget = 0 -> falso "FIRE
    // gia' raggiunto" se pensione/rendite > 0).
    const swr = sanitizeWithdrawalRatePct(withdrawalRatePct) / 100;
    const baseFireTarget = annualExpenses / swr;
    const realReturn = getScenarioRealReturn(nominalReturnPct, inflationPct, scenario, applyTaxStamp);

    const pensionPV = presentValueOfAnnuity(annualPension, realReturn, pensionDeferredYears, pensionDuration);
    const passivePV = normalizedPassiveStreams.reduce((acc, stream) => {
        const annualAmount = Number.isFinite(stream.annualAmount) ? stream.annualAmount : 0;
        if (annualAmount === 0) return acc;

        const streamStartAge = Number.isFinite(stream.startAge) ? stream.startAge : safeRetirementAge;
        const streamEndAge = Number.isFinite(stream.endAge) ? (stream.endAge as number) : safeLifeExpectancy;
        const effectiveStartAge = Math.max(safeRetirementAge, streamStartAge);
        const effectiveEndAge = Math.min(safeLifeExpectancy, Math.max(effectiveStartAge, streamEndAge));
        const duration = Math.max(0, effectiveEndAge - effectiveStartAge);
        const deferredYears = Math.max(0, effectiveStartAge - safeRetirementAge);
        if (duration <= 0) return acc;

        return acc + presentValueOfAnnuity(annualAmount, realReturn, deferredYears, duration);
    }, 0);

    const fireTargetNet = Math.max(0, sanitize(baseFireTarget) - sanitize(pensionPV) - sanitize(passivePV));
    return {
        realReturnPct: sanitize(realReturn) * 100,
        baseFireTarget: sanitize(baseFireTarget),
        fireTargetNet,
        pensionPresentValue: sanitize(pensionPV),
        passiveIncomePresentValue: sanitize(passivePV),
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
    const safeCurrentAge = sanitize(currentAge);
    const safeRetirementAge = sanitize(retirementAge);
    const safeLifeExpectancy = sanitize(lifeExpectancy, DEFAULT_LIFE_EXPECTANCY);
    const yearsToRetire = Math.max(0, safeRetirementAge - safeCurrentAge);
    const normalizedPassiveStreams = normalizePassiveIncomeStreams(
        safeCurrentAge,
        safeRetirementAge,
        safeLifeExpectancy,
        sanitize(monthlyRealEstateIncome),
        passiveIncomeStreams,
    );

    return normalizedPassiveStreams.flatMap((stream, index) => {
        const annualAmount = Number.isFinite(stream.annualAmount) ? stream.annualAmount : 0;
        if (annualAmount === 0) return [];

        const streamStartAge = Number.isFinite(stream.startAge) ? stream.startAge : safeRetirementAge;
        const streamEndAge = Number.isFinite(stream.endAge) ? (stream.endAge as number) : safeLifeExpectancy;
        const effectiveStartAge = Math.max(safeRetirementAge, streamStartAge);
        const effectiveEndAge = Math.min(safeLifeExpectancy, Math.max(effectiveStartAge, streamEndAge));
        const durationYears = Math.max(0, effectiveEndAge - effectiveStartAge);
        if (durationYears <= 0) return [];

        const deferredYears = Math.max(0, effectiveStartAge - safeRetirementAge);
        const presentValueAtRetirement = presentValueOfAnnuity(annualAmount, realReturn, deferredYears, durationYears);
        const discountBase = 1 + sanitize(realReturn);
        const discountFactor = discountBase > 0 ? Math.pow(discountBase, yearsToRetire) : 1;
        const presentValueToday = sanitize(presentValueAtRetirement / (discountFactor || 1));

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

    // Sanitizza eta' qui (anche se computeFireTargetForRetirementAge sanitizza
    // a sua volta) perche' `yearsToRetire` partecipa a Math.pow(1+r, yearsToRetire),
    // che con NaN/Infinity propagherebbe NaN nel `coastFireTarget` di tutti
    // e tre gli scenari.
    const safeCurrentAge = sanitize(currentAge);
    const safeRetirementAge = sanitize(retirementAge);
    const safeCurrentCapital = sanitizeNonNegative(currentCapital);
    const yearsToRetire = Math.max(0, safeRetirementAge - safeCurrentAge);
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
        // Guard: tasso reale <= -100% renderebbe la base di Math.pow non
        // positiva e produrrebbe NaN; in tal caso lo sconto degenera a 1
        // (nessuna capitalizzazione), come gia' fa `presentValueOfAnnuity`.
        const discountBase = 1 + sanitize(realReturn);
        const discountFactor = discountBase > 0 ? Math.pow(discountBase, yearsToRetire) : 1;
        const rawCoastFireTarget = (sanitize(targetProjection.fireTargetNet) - sanitize(futureValueOfSavedPassiveIncome))
            / (discountFactor || 1);
        const coastFireTarget = Math.max(0, sanitize(rawCoastFireTarget));

        const coastFireReached = safeCurrentCapital >= coastFireTarget;
        const surplusOrGap = safeCurrentCapital - coastFireTarget;
        const yearsToCoastFire = coastFireReached ? 0 : yearsToGrow(safeCurrentCapital, coastFireTarget, realReturn);

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
