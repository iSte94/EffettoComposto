// === Proiezione di inflazione + investimento ===
//
// Modulo puro che calcola, su un orizzonte temporale definito, l'evoluzione di:
// - Potere d'acquisto del capitale tenuto fermo (eroso dall'inflazione).
// - Valore nominale del capitale se investito a un dato rendimento.
// - Valore reale dell'investimento (al netto dell'inflazione, in euro odierni).
// - Capitale equivalente futuro: quanti euro NOMINALI serviranno fra N anni
//   per acquistare gli stessi beni che oggi compri con `amount` euro.
//
// Estratto dal componente UI per consentire il riuso, eliminare la copia
// inline della formula di Fisher e abilitare i test di regressione.

import { computeRealReturn } from "./fire-projection";

export interface InflationProjectionParams {
    /** Capitale iniziale in euro (>=0). */
    amount: number;
    /** Inflazione annua attesa in percentuale (es. 2.5 per 2,5%). */
    inflationRatePct: number;
    /** Orizzonte temporale in anni (intero, >=0). */
    years: number;
    /** Rendimento nominale annuo atteso in percentuale (es. 7 per 7%). */
    nominalReturnPct: number;
}

export interface InflationProjectionPoint {
    year: number;
    label: string;
    /** Potere d'acquisto residuo del capitale tenuto fermo (euro odierni). */
    purchasingPower: number;
    /** Valore nominale dell'investimento (quello che si vede a saldo). */
    nominalValue: number;
    /** Valore reale dell'investimento (in euro odierni). */
    realValue: number;
}

export interface InflationProjectionResult {
    points: InflationProjectionPoint[];
    /** Rendimento reale annuo in percentuale (Fisher esatto). */
    realReturnPct: number;
    /** Potere d'acquisto residuo a fine orizzonte (euro odierni). */
    finalPurchasingPower: number;
    /** Valore nominale dell'investimento a fine orizzonte. */
    finalNominal: number;
    /** Valore reale dell'investimento a fine orizzonte (euro odierni). */
    finalReal: number;
    /** Quanto si perde in potere d'acquisto se il capitale resta fermo. */
    lostValue: number;
    /** Percentuale di erosione (>=0) sul capitale fermo. */
    lostPercent: number;
    /**
     * Capitale equivalente futuro: quanti euro NOMINALI servono fra `years`
     * anni per mantenere lo stesso potere d'acquisto di `amount` euro oggi.
     * E' l'inverso di `finalPurchasingPower` ed e' utile per fissare target
     * realistici nei piani di accumulo.
     */
    equivalentFutureCapital: number;
    /**
     * Tempo (in anni) necessario perche' l'inflazione dimezzi il potere
     * d'acquisto del capitale fermo. `null` se inflazione <= 0 (il potere
     * d'acquisto non si dimezza mai). Formula esatta: ln(2) / ln(1+i),
     * piu' accurata della Regola del 72 (che approssima a 72/i%).
     */
    purchasingPowerHalvingYears: number | null;
    /**
     * Gap (in euro nominali) fra il capitale equivalente futuro necessario
     * per preservare il potere d'acquisto e quanto il lump sum iniziale
     * produrrebbe a fine orizzonte investito al rendimento nominale scelto.
     * Zero quando l'investimento del solo capitale iniziale copre gia'
     * l'erosione inflazionistica.
     */
    purchasingPowerGap: number;
    /**
     * Risparmio mensile aggiuntivo necessario, investito al rendimento
     * nominale, per colmare `purchasingPowerGap` nell'orizzonte `years`.
     * Usa la formula della rendita: PMT = gap / [((1+m)^N - 1) / m] con
     * m = tasso mensile e N = mesi totali. Cade su `gap / N` quando il
     * rendimento nominale e' zero e su 0 quando non c'e' gap o years = 0.
     */
    monthlySavingsToPreservePurchasingPower: number;
}

function sanitize(value: number, fallback = 0): number {
    return Number.isFinite(value) ? value : fallback;
}

/**
 * Proietta l'effetto combinato di inflazione e investimento su `years` anni.
 *
 * Tutte le formule:
 *   - inflationFactor[y] = (1 + inflation) ^ y
 *   - purchasingPower[y] = amount / inflationFactor[y]
 *   - nominalValue[y]    = amount * (1 + nominal) ^ y
 *   - realValue[y]       = nominalValue[y] / inflationFactor[y]
 *   - realReturn         = (1 + nominal) / (1 + inflation) - 1   (Fisher esatto)
 *   - equivalentFuture   = amount * inflationFactor[years]
 *
 * Il rendimento reale e' delegato a `computeRealReturn` (UNICA fonte di
 * verita' del progetto), garantendo coerenza con FIRE dashboard e advisor.
 */
export function projectInflation(params: InflationProjectionParams): InflationProjectionResult {
    const amount = Math.max(0, sanitize(params.amount));
    const inflationRatePct = sanitize(params.inflationRatePct);
    const nominalReturnPct = sanitize(params.nominalReturnPct);
    const years = Math.max(0, Math.floor(sanitize(params.years)));

    const inflationFactor = (y: number) => Math.pow(1 + inflationRatePct / 100, y);
    const nominalFactor = (y: number) => Math.pow(1 + nominalReturnPct / 100, y);

    const points: InflationProjectionPoint[] = [];
    for (let year = 0; year <= years; year++) {
        const infF = inflationFactor(year);
        const nominalValue = amount * nominalFactor(year);
        // Guard contro inflazione = -100% (denominatore zero): cade su valore nominale.
        const purchasingPower = infF > 0 ? amount / infF : amount;
        const realValue = infF > 0 ? nominalValue / infF : nominalValue;
        points.push({
            year,
            label: `Anno ${year}`,
            purchasingPower: Math.round(purchasingPower),
            nominalValue: Math.round(nominalValue),
            realValue: Math.round(realValue),
        });
    }

    const last = points[points.length - 1];
    const finalPurchasingPower = last.purchasingPower;
    const finalNominal = last.nominalValue;
    const finalReal = last.realValue;
    const lostValue = Math.max(0, amount - finalPurchasingPower);
    const lostPercent = amount > 0 ? (lostValue / amount) * 100 : 0;
    const equivalentFutureCapital = Math.round(amount * inflationFactor(years));
    const realReturnPct = computeRealReturn(nominalReturnPct, inflationRatePct) * 100;
    const purchasingPowerHalvingYears =
        inflationRatePct > 0 ? Math.log(2) / Math.log(1 + inflationRatePct / 100) : null;

    const purchasingPowerGap = Math.max(0, equivalentFutureCapital - finalNominal);
    const monthlySavingsToPreservePurchasingPower = computeMonthlySavingsForGap(
        purchasingPowerGap,
        nominalReturnPct,
        years,
    );

    return {
        points,
        realReturnPct,
        finalPurchasingPower,
        finalNominal,
        finalReal,
        lostValue,
        lostPercent,
        equivalentFutureCapital,
        purchasingPowerHalvingYears,
        purchasingPowerGap,
        monthlySavingsToPreservePurchasingPower,
    };
}

/**
 * Rata mensile necessaria per raggiungere `gap` euro nominali in `years` anni
 * investendo ad `annualReturnPct` (versamenti a fine periodo, capitalizzazione
 * mensile). Formula chiusa della rendita futura:
 *     FV = PMT * [((1+m)^N - 1) / m]   =>   PMT = FV / [((1+m)^N - 1) / m]
 * con degenerazione a `gap / N` per rendimento nullo. Ritorna 0 se non serve
 * risparmiare (gap nullo, orizzonte nullo, o input non finiti).
 */
function computeMonthlySavingsForGap(
    gap: number,
    annualReturnPct: number,
    years: number,
): number {
    if (!Number.isFinite(gap) || gap <= 0) return 0;
    if (!Number.isFinite(years) || years <= 0) return 0;
    const months = Math.max(1, Math.round(years * 12));
    const monthlyRate = annualReturnPct / 100 / 12;
    if (Math.abs(monthlyRate) < 1e-9) {
        return Math.round(gap / months);
    }
    const annuityFactor = (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
    if (!Number.isFinite(annuityFactor) || annuityFactor <= 0) return 0;
    return Math.round(gap / annuityFactor);
}
