// Calcoli cashflow immobili — puri e riusabili.
// Convenzione: tutti gli importi di input (rent, costs, imu) sono ANNUALI in euro.
// Vedi label "Rendita Annua Attesa" in real-estate-section.tsx e l'uso in patrimonio-dashboard.tsx.

export interface RealEstateCashflowInput {
    rent?: number;             // Rendita annua attesa
    costs?: number;            // Spese fisse annue (condominio, manutenzione, ecc.)
    imu?: number;              // IMU annua
    isPrimaryResidence?: boolean;
    isRented?: boolean;
    rentStartDate?: string;    // YYYY-MM — se impostato e futuro, l'immobile non genera rendita finche' non matura
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

    const rent = Math.max(0, prop.rent || 0);
    const totalCosts = calculatePropertyAnnualCosts(prop);
    // Permettiamo rendita negativa: un immobile in perdita (costi > affitto)
    // DEVE ridurre il reddito passivo totale, altrimenti il target FIRE viene
    // sottostimato (es. 2 immobili, uno a +7k e uno a -5k = +2k, non +7k).
    return rent - totalCosts;
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
