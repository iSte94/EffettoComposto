// Calcoli cashflow immobili — puri e riusabili.
// Convenzione: tutti gli importi di input (rent, costs, imu) sono ANNUALI in euro.
// Vedi label "Rendita Annua Attesa" in real-estate-section.tsx e l'uso in patrimonio-dashboard.tsx.

import type { PassiveIncomeStream } from "./coast-fire";

export interface RealEstateCashflowInput {
    rent?: number;             // Rendita annua attesa
    costs?: number;            // Spese fisse annue (condominio, manutenzione, ecc.)
    imu?: number;              // IMU annua
    isPrimaryResidence?: boolean;
    isRented?: boolean;
    rentStartDate?: string;    // YYYY-MM — se impostato e futuro, l'immobile non genera rendita finche' non matura
}

export interface BuildRealEstatePassiveIncomeStreamsInput {
    currentAge: number;
    retirementAge: number;
    asOfYearMonth: string;
    lifeExpectancy?: number;
}

const DEFAULT_LIFE_EXPECTANCY = 90;

function parseYearMonth(value?: string): { year: number; month: number } | null {
    if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
    const [year, month] = value.split("-").map(Number);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
    return { year, month };
}

function monthsBetweenYearMonths(startYearMonth: string, endYearMonth: string): number | null {
    const start = parseYearMonth(startYearMonth);
    const end = parseYearMonth(endYearMonth);
    if (!start || !end) return null;
    return (end.year - start.year) * 12 + (end.month - start.month);
}

export function formatYearMonth(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    return `${year}-${month}`;
}

/**
 * Somma dei costi annui imputabili a un immobile.
 * IMU viene esclusa per la prima casa (come nella convenzione della dashboard Patrimonio).
 *
 * Storicamente questa logica era duplicata nel FIRE dashboard dove un refactor
 * aveva introdotto un double-count (IMU sommata come `imu/12` E come `imu`,
 * portando il carico fiscale al 108% del valore reale).
 */
export function calculatePropertyAnnualCosts(prop: RealEstateCashflowInput): number {
    const costs = Math.max(0, prop.costs || 0);
    const imu = Math.max(0, prop.imu || 0);
    const imuApplicable = prop.isPrimaryResidence ? 0 : imu;
    return costs + imuApplicable;
}

export function calculatePropertyAnnualPotentialNetIncome(prop: RealEstateCashflowInput): number {
    const rent = Math.max(0, prop.rent || 0);
    return rent - calculatePropertyAnnualCosts(prop);
}

/**
 * Rendita passiva netta annua di un immobile (rent - costi).
 * Ritorna 0 se l'immobile non e' attualmente affittato (e la data di inizio
 * rendita, se presente, non e' ancora maturata).
 */
export function calculatePropertyAnnualNetIncome(
    prop: RealEstateCashflowInput,
    atYearMonth?: string,
): number {
    let isCurrentlyRented = !!prop.isRented;
    if (!isCurrentlyRented && prop.rentStartDate && atYearMonth) {
        if (atYearMonth >= prop.rentStartDate) isCurrentlyRented = true;
    }
    if (!isCurrentlyRented) return 0;

    // Permettiamo rendita negativa: un immobile in perdita (costi > affitto)
    // DEVE ridurre il reddito passivo totale, altrimenti il target FIRE viene
    // sottostimato (es. 2 immobili, uno a +7k e uno a -5k = +2k, non +7k).
    return calculatePropertyAnnualPotentialNetIncome(prop);
}

/**
 * Aggrega la rendita passiva annua netta di una lista di immobili.
 * `atYearMonth` serve per proiezioni future (rispetta le `rentStartDate` programmate).
 */
export function sumRealEstateAnnualNetIncome(
    properties: RealEstateCashflowInput[],
    atYearMonth?: string,
): number {
    return properties.reduce(
        (acc, prop) => acc + calculatePropertyAnnualNetIncome(prop, atYearMonth),
        0,
    );
}

export function buildRealEstatePassiveIncomeStreams(
    properties: RealEstateCashflowInput[],
    input: BuildRealEstatePassiveIncomeStreamsInput,
): PassiveIncomeStream[] {
    const {
        currentAge,
        retirementAge,
        asOfYearMonth,
        lifeExpectancy = DEFAULT_LIFE_EXPECTANCY,
    } = input;

    return properties.flatMap((prop) => {
        const willGenerateRent = !!prop.isRented || !!prop.rentStartDate;
        if (!willGenerateRent) return [];

        const annualAmount = calculatePropertyAnnualPotentialNetIncome(prop);
        if (annualAmount === 0) return [];

        let startAge = retirementAge;
        if (!prop.isRented && prop.rentStartDate) {
            const monthsUntilRent = monthsBetweenYearMonths(asOfYearMonth, prop.rentStartDate);
            if (monthsUntilRent == null) return [];
            startAge = currentAge + Math.max(0, monthsUntilRent) / 12;
        }

        const effectiveStartAge = Math.max(retirementAge, startAge);
        if (!Number.isFinite(effectiveStartAge) || effectiveStartAge >= lifeExpectancy) return [];

        return [{
            annualAmount,
            startAge: effectiveStartAge,
            endAge: lifeExpectancy,
        }];
    });
}
