// Motore di proiezione FIRE deterministico e puro.
// Riutilizzabile dal tab FIRE e dal Consulente per confronti "con / senza acquisto".
// Tutto in euro odierni: il rendimento reale segue l'equazione di Fisher esatta.

/**
 * Calcola il rendimento reale (decimale) dato il rendimento nominale e l'inflazione
 * usando l'equazione di Fisher ESATTA:
 *
 *     (1 + reale) = (1 + nominale) / (1 + inflazione)
 *
 * L'approssimazione ingenua `reale = nominale - inflazione` e' accettabile solo
 * quando entrambi i tassi sono molto piccoli. Per valori tipici di un piano FIRE
 * (es. nominale 7%, inflazione 3%) l'errore relativo e' gia' del ~3% e si
 * compone nel tempo: su 30 anni porta a una sovrastima del capitale finale
 * intorno al +3-4%, sufficiente ad anticipare erroneamente la data FIRE di
 * quasi un anno.
 *
 * Questo helper e' la UNICA fonte di verita' per il rendimento reale del
 * progetto e viene riusato da fire-dashboard, advisor-dashboard e Monte Carlo.
 *
 * @param nominalPct rendimento nominale atteso in percentuale (es. 7 per 7%)
 * @param inflationPct inflazione attesa in percentuale (es. 3 per 3%)
 * @returns rendimento reale in decimale (es. 0.0388 per 3.88%)
 */
export function computeRealReturn(nominalPct: number, inflationPct: number): number {
    // Input sanitization: NaN/undefined fallback a 0 per evitare proiezioni corrotte.
    const nominal = Number.isFinite(nominalPct) ? nominalPct : 0;
    const inflation = Number.isFinite(inflationPct) ? inflationPct : 0;

    // Guard: inflazione = -100% farebbe dividere per zero. In quel caso (scenario
    // degenere) ricadiamo sulla sottrazione semplice che resta finita.
    const denom = 1 + inflation / 100;
    if (denom <= 0) {
        return (nominal - inflation) / 100;
    }

    return (1 + nominal / 100) / denom - 1;
}

export interface FireProjectionParams {
    startingCapital: number;
    monthlySavings: number;           // Risparmio base mensile
    monthlyExpensesAtFire: number;    // Spesa mensile attesa in pensione (oggi)
    expectedReturnPct: number;        // Rendimento nominale % (es. 6)
    inflationPct: number;             // Inflazione attesa % (es. 2)
    withdrawalRatePct: number;        // SWR % (es. 3.25)
    currentAge: number;
    retirementAge: number;
    maxYears?: number;                // Default 60
    // Scenario modificatori (per confronto "con acquisto")
    oneTimeOutflow?: number;          // Esborso immediato (anticipo)
    recurringMonthlyCost?: number;    // Delta mensile temporaneo (+ costo, - entrata)
    recurringMonths?: number;         // Durata rata (mesi)
    ongoingMonthlyCost?: number;      // Delta mensile continuativo (+ costo, - entrata)
    ongoingMonths?: number;           // Durata costi ongoing (mesi) — 0/undefined = tutta la vita utile
}

export interface FireProjectionPoint {
    year: number;
    age: number;
    capital: number;
    target: number;
}

export interface FireProjectionResult {
    fireTarget: number;
    yearsToFire: number;      // 0 se gia' raggiunto, -1 se non raggiunto entro maxYears
    ageAtFire: number;        // eta' al raggiungimento FIRE
    monthsToFire: number;     // mesi totali al FIRE
    chartData: FireProjectionPoint[];
    alreadyFire: boolean;
}

/**
 * Proiezione deterministica del capitale nel tempo con calcolo del momento FIRE.
 *
 * Formule chiave:
 *   - fireTarget = (monthlyExpensesAtFire * 12) / (withdrawalRate / 100)
 *   - realReturn = (1 + nominal) / (1 + inflation) - 1   (Fisher esatto, euro odierni)
 *   - monthlyRate = (1 + realReturn) ^ (1/12) - 1
 *   - capital[m+1] = capital[m] * (1 + monthlyRate) + netSaving[m]
 *   - netSaving[m] = monthlySavings - recurringDelta - ongoingDelta
 *     dove i delta possono essere anche negativi (es. affitto netto positivo).
 */
export function projectFire(params: FireProjectionParams): FireProjectionResult {
    const {
        startingCapital,
        monthlySavings,
        monthlyExpensesAtFire,
        expectedReturnPct,
        inflationPct,
        withdrawalRatePct,
        currentAge,
        retirementAge,
        maxYears = 60,
        oneTimeOutflow = 0,
        recurringMonthlyCost = 0,
        recurringMonths = 0,
        ongoingMonthlyCost = 0,
        ongoingMonths = 0,
    } = params;

    const annualExpenses = Math.max(0, monthlyExpensesAtFire) * 12;
    const swr = Math.max(0.1, withdrawalRatePct) / 100;
    const fireTarget = annualExpenses / swr;

    // Fisher equation esatta: evita la sovrastima da ~3-4% su 30 anni tipica
    // dell'approssimazione (nominal - inflation).
    const realReturn = computeRealReturn(expectedReturnPct, inflationPct);
    // Proteggi da rendimenti reali <= -100% (scenario degenere irrealistico).
    const monthlyRate = 1 + realReturn > 0 ? Math.pow(1 + realReturn, 1 / 12) - 1 : -1;

    let capital = Math.max(0, startingCapital - oneTimeOutflow);
    const chartData: FireProjectionPoint[] = [];
    let yearsToFire = -1;
    let monthsToFire = -1;

    // Punto iniziale
    chartData.push({ year: 0, age: currentAge, capital, target: fireTarget });

    const totalMonths = maxYears * 12;

    for (let m = 1; m <= totalMonths; m++) {
        const age = currentAge + m / 12;
        const isRetired = age >= retirementAge || capital >= fireTarget;

        // Cashflow del mese
        let cashflow: number;
        if (isRetired) {
            cashflow = -monthlyExpensesAtFire;
        } else {
            let net = monthlySavings;
            if (recurringMonths > 0 && m <= recurringMonths && recurringMonthlyCost !== 0) {
                net -= recurringMonthlyCost;
            }
            if (ongoingMonthlyCost !== 0) {
                const limit = ongoingMonths > 0 ? ongoingMonths : totalMonths;
                if (m <= limit) net -= ongoingMonthlyCost;
            }
            cashflow = net;
        }

        capital = capital * (1 + monthlyRate) + cashflow;
        if (capital < 0) capital = 0;

        if (monthsToFire < 0 && capital >= fireTarget) {
            monthsToFire = m;
            yearsToFire = m / 12;
        }

        if (m % 12 === 0) {
            chartData.push({
                year: m / 12,
                age: currentAge + m / 12,
                capital,
                target: fireTarget,
            });
        }
    }

    const alreadyFire = startingCapital >= fireTarget;
    if (alreadyFire) {
        yearsToFire = 0;
        monthsToFire = 0;
    }

    const ageAtFire = yearsToFire >= 0 ? currentAge + yearsToFire : -1;

    return {
        fireTarget,
        yearsToFire,
        ageAtFire,
        monthsToFire,
        chartData,
        alreadyFire,
    };
}

/**
 * Differenza in mesi fra due proiezioni FIRE (con vs senza acquisto).
 * Positivo = l'acquisto RITARDA il FIRE.
 */
export function fireDelayMonths(withoutPurchase: FireProjectionResult, withPurchase: FireProjectionResult): number {
    if (withoutPurchase.monthsToFire < 0 && withPurchase.monthsToFire < 0) return 0;
    if (withPurchase.monthsToFire < 0) return Number.POSITIVE_INFINITY;
    if (withoutPurchase.monthsToFire < 0) return Number.NEGATIVE_INFINITY;
    return withPurchase.monthsToFire - withoutPurchase.monthsToFire;
}

/** Format helper: "2 anni e 4 mesi" oppure "–3 mesi" */
export function formatDelay(months: number): string {
    if (!Number.isFinite(months)) return months > 0 ? "mai raggiunto" : "subito";
    if (months === 0) return "Nessun impatto";
    const abs = Math.abs(Math.round(months));
    const y = Math.floor(abs / 12);
    const m = abs % 12;
    const sign = months > 0 ? "+" : "−";
    if (y === 0) return `${sign}${m} mes${m === 1 ? "e" : "i"}`;
    if (m === 0) return `${sign}${y} ann${y === 1 ? "o" : "i"}`;
    return `${sign}${y}a ${m}m`;
}
