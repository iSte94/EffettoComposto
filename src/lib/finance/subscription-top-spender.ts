// === Top spender fra abbonamenti ricorrenti ===
//
// Modulo puro che individua l'abbonamento piu' costoso (normalizzato a
// costo mensile) all'interno di una lista e ne quantifica l'impatto:
// percentuale sul totale mensile e costo opportunita' composto se la
// stessa cifra fosse investita al rendimento reale di default per
// l'orizzonte di default.
//
// Pensato per il pannello "Abbonamenti Ricorrenti": traduce il principio
// di Pareto in un suggerimento operativo ("se tagliassi questo, libereresti
// X%/€Y all'anno e accumuleresti €Z in 30 anni"), guidando l'utente verso
// il taglio piu' efficace invece di lasciarlo guardare la lista intera.
//
// Tutti gli import numerici riusano `computeSubscriptionOpportunityCost`
// di `subscription-opportunity.ts` per evitare divergenze nella matematica
// di compounding fra le due card del pannello.
import {
    computeSubscriptionOpportunityCost,
    DEFAULT_SUBSCRIPTION_OPPORTUNITY_HORIZON_YEARS,
    DEFAULT_SUBSCRIPTION_OPPORTUNITY_REAL_RETURN_PCT,
} from "./subscription-opportunity";

export type SubscriptionFrequency = "mensile" | "annuale";

export interface SubscriptionLike {
    name: string;
    amount: number;
    frequency: SubscriptionFrequency;
}

export interface TopSubscriptionImpact {
    /** Nome dell'abbonamento (vuoto se l'utente non l'ha ancora compilato). */
    name: string;
    /** Costo mensile normalizzato (annuale/12 per gli abbonamenti annuali). */
    monthlyNormalized: number;
    /** Costo annuale equivalente. */
    annualNormalized: number;
    /** Quota di questo abbonamento sul totale mensile, in percentuale. */
    percentOfTotal: number;
    /**
     * Valore reale (potere d'acquisto odierno) accumulato investendo la
     * stessa cifra mensile al rendimento reale per `horizonYears` anni.
     */
    futureValueReal: number;
    /** Orizzonte usato (anni). */
    horizonYears: number;
    /** Rendimento reale annuo usato (percentuale). */
    realReturnPct: number;
}

export interface TopSubscriptionImpactOptions {
    /** Orizzonte temporale in anni (default: 30). */
    years?: number;
    /** Rendimento reale annuo in percentuale (default: 4). */
    realReturnPct?: number;
}

/**
 * Restituisce l'impatto del singolo abbonamento piu' costoso (normalizzato
 * a costo mensile) sul totale, oppure `null` se la lista e' vuota o se
 * nessun abbonamento ha un costo > 0. Sanitizza valori non finiti
 * (NaN/Infinity) e ignora abbonamenti con importi <= 0.
 */
export function computeTopSubscriptionImpact(
    subscriptions: readonly SubscriptionLike[],
    options: TopSubscriptionImpactOptions = {},
): TopSubscriptionImpact | null {
    let topName = "";
    let topMonthly = 0;
    let totalMonthly = 0;

    for (const sub of subscriptions) {
        const amount = Number.isFinite(sub.amount) ? sub.amount : 0;
        if (amount <= 0) continue;
        const monthly = sub.frequency === "annuale" ? amount / 12 : amount;
        if (!Number.isFinite(monthly) || monthly <= 0) continue;
        totalMonthly += monthly;
        if (monthly > topMonthly) {
            topMonthly = monthly;
            topName = sub.name ?? "";
        }
    }

    if (topMonthly <= 0 || totalMonthly <= 0) return null;

    const opportunity = computeSubscriptionOpportunityCost({
        monthlyAmount: topMonthly,
        years: options.years ?? DEFAULT_SUBSCRIPTION_OPPORTUNITY_HORIZON_YEARS,
        realReturnPct: options.realReturnPct ?? DEFAULT_SUBSCRIPTION_OPPORTUNITY_REAL_RETURN_PCT,
    });

    return {
        name: topName,
        monthlyNormalized: topMonthly,
        annualNormalized: topMonthly * 12,
        percentOfTotal: (topMonthly / totalMonthly) * 100,
        futureValueReal: opportunity.futureValueReal,
        horizonYears: opportunity.years,
        realReturnPct: opportunity.realReturnPct,
    };
}
