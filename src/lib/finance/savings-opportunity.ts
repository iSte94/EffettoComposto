// === Costo opportunita' del risparmio mensile (Budget Tracker) ===
//
// Modulo puro che traduce il "saldo mensile risparmiato" calcolato dal Budget
// Tracker (entrate - uscite, gia' normalizzato a base mensile dal componente)
// nel suo "costo opportunita' composto": quanto capitale (in potere d'acquisto
// odierno) accumuleresti investendo la stessa cifra mensile al rendimento
// reale di default per l'orizzonte di default. E' la chiusura del cerchio fra
// budget mensile e tema "Effetto Composto" / FIRE: il "se mantieni questo
// ritmo, in 30 anni vale X" che mancava al pannello budget.
//
// La matematica del compounding e' delegata al modulo gia' esistente
// `subscription-opportunity.ts` (UNICA fonte di verita' del progetto per il
// future value di una rendita posticipata mensile a rendimento reale): qui
// applichiamo solo la SEMANTICA budget-friendly (saldo <= 0 -> null, niente
// card; saldo positivo -> incapsuliamo il risultato compound con i nomi
// canonici "annualSavings", "monthlySavings", ecc).

import {
    computeSubscriptionOpportunityCost,
    DEFAULT_SUBSCRIPTION_OPPORTUNITY_HORIZON_YEARS,
    DEFAULT_SUBSCRIPTION_OPPORTUNITY_REAL_RETURN_PCT,
} from "./subscription-opportunity";

/** Rendimento reale annuo di default (allineato al modulo subscription / excess-liquidity / fire-years). */
export const DEFAULT_SAVINGS_OPPORTUNITY_REAL_RETURN_PCT = DEFAULT_SUBSCRIPTION_OPPORTUNITY_REAL_RETURN_PCT;

/** Orizzonte FIRE-friendly di default. */
export const DEFAULT_SAVINGS_OPPORTUNITY_HORIZON_YEARS = DEFAULT_SUBSCRIPTION_OPPORTUNITY_HORIZON_YEARS;

export interface SavingsOpportunityParams {
    /** Saldo mensile risparmiato (entrate - uscite, base mensile). */
    monthlySavings: number;
    /** Orizzonte temporale in anni (intero, >=0). */
    years?: number;
    /** Rendimento reale annuo in percentuale (es. 4 per 4%). */
    realReturnPct?: number;
}

export interface SavingsOpportunityResult {
    /** Saldo mensile usato (clampato a >0 se l'input era valido). */
    monthlySavings: number;
    /** Equivalente annualizzato (monthlySavings * 12). */
    annualSavings: number;
    /** Anni effettivamente usati nel calcolo (clampati a >=0). */
    years: number;
    /** Rendimento reale annuo effettivamente usato. */
    realReturnPct: number;
    /** Totale "versato" nel periodo (monthlySavings * 12 * years). */
    totalContributed: number;
    /**
     * Valore reale (potere d'acquisto odierno) del montante che avresti
     * accumulato investendo la stessa cifra mensile al rendimento reale annuo
     * per `years` anni, con versamenti a fine periodo e capitalizzazione
     * mensile.
     */
    futureValueReal: number;
    /** Guadagno reale composto (futureValueReal - totalContributed). */
    compoundGain: number;
}

/**
 * Calcola il costo opportunita' composto del risparmio mensile.
 *
 * Ritorna `null` quando il risparmio mensile e' <= 0 (l'utente sta spendendo
 * piu' di quanto guadagna, oppure pareggia: in entrambi i casi non c'e' un
 * "surplus investibile" da proiettare in futuro). Ritorna `null` anche su
 * input non finiti per non propagare NaN/Infinity al componente.
 *
 * Esempio numerico: monthlySavings = 500, years = 30, realReturnPct = 4 ->
 * futureValueReal ~ €345.000 (latte factor positivo, capitale FIRE-grade
 * generato dal solo surplus mensile).
 */
export function computeSavingsOpportunity(
    params: SavingsOpportunityParams,
): SavingsOpportunityResult | null {
    const monthlySavings = params.monthlySavings;
    if (!Number.isFinite(monthlySavings) || monthlySavings <= 0) {
        return null;
    }

    const compound = computeSubscriptionOpportunityCost({
        monthlyAmount: monthlySavings,
        years: params.years ?? DEFAULT_SAVINGS_OPPORTUNITY_HORIZON_YEARS,
        realReturnPct: params.realReturnPct ?? DEFAULT_SAVINGS_OPPORTUNITY_REAL_RETURN_PCT,
    });

    return {
        monthlySavings,
        annualSavings: monthlySavings * 12,
        years: compound.years,
        realReturnPct: compound.realReturnPct,
        totalContributed: compound.totalContributed,
        futureValueReal: compound.futureValueReal,
        compoundGain: compound.compoundGain,
    };
}
