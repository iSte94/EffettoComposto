// === Costo opportunita' degli abbonamenti ricorrenti ===
//
// Modulo puro che traduce la spesa mensile per abbonamenti nel suo "costo
// opportunita' composto": quanto capitale (in potere d'acquisto odierno)
// avresti accumulato investendo la stessa cifra mensile al rendimento reale
// scelto per `years` anni. E' la versione canalizzata e brand-aligned del
// "latte factor" - chiude il cerchio fra il tracker abbonamenti e il tema
// "Effetto Composto" di tutta l'app.
//
// Tutti i ritorni sono in EURO REALI (potere d'acquisto odierno) cosi' che
// l'utente possa confrontare la cifra direttamente con la spesa attuale.
// Per ottenere lo stesso valore in nominale basta moltiplicare per
// (1+inflazione)^anni a monte; qui restiamo nel piano reale per evitare
// l'illusione monetaria.

/** Rendimento reale annuo di default (Fisher: ~7% nominale - ~3% inflazione). */
export const DEFAULT_SUBSCRIPTION_OPPORTUNITY_REAL_RETURN_PCT = 4;

/** Orizzonte di default per la proiezione FIRE-friendly. */
export const DEFAULT_SUBSCRIPTION_OPPORTUNITY_HORIZON_YEARS = 30;

export interface SubscriptionOpportunityParams {
    /** Spesa mensile per abbonamenti (>=0). */
    monthlyAmount: number;
    /** Orizzonte temporale in anni (intero, >=0). */
    years?: number;
    /** Rendimento reale annuo in percentuale (es. 4 per 4%). */
    realReturnPct?: number;
}

export interface SubscriptionOpportunityResult {
    /** Anni effettivamente usati nel calcolo (clampati a >=0). */
    years: number;
    /** Rendimento reale annuo effettivamente usato. */
    realReturnPct: number;
    /** Totale "speso" se mantenessi gli abbonamenti per `years` anni. */
    totalContributed: number;
    /**
     * Valore reale (potere d'acquisto odierno) del montante che avresti
     * accumulato investendo la stessa cifra mensile al rendimento reale
     * annuo per `years` anni, con versamenti a fine periodo e
     * capitalizzazione mensile.
     */
    futureValueReal: number;
    /** Guadagno reale composto (futureValueReal - totalContributed). */
    compoundGain: number;
}

function sanitize(value: number, fallback = 0): number {
    return Number.isFinite(value) ? value : fallback;
}

/**
 * Future value reale di una serie di versamenti mensili costanti al rendimento
 * reale annuo `realReturnPct`. Capitalizzazione mensile (allineata alla
 * frequenza dei versamenti, standard PAC) con tasso mensile derivato dalla
 * conversione esatta `(1+r)^(1/12) - 1`. Rendimento reale 0 -> degenerazione
 * lineare `mesi * monthlyAmount`. Garantisce ritorni finiti anche con input
 * NaN/Infinity (vengono sanitizzati a zero).
 */
export function computeSubscriptionOpportunityCost(
    params: SubscriptionOpportunityParams,
): SubscriptionOpportunityResult {
    const monthlyAmount = Math.max(0, sanitize(params.monthlyAmount));
    const years = Math.max(0, Math.floor(sanitize(params.years ?? DEFAULT_SUBSCRIPTION_OPPORTUNITY_HORIZON_YEARS)));
    const realReturnPct = sanitize(params.realReturnPct ?? DEFAULT_SUBSCRIPTION_OPPORTUNITY_REAL_RETURN_PCT);

    const months = years * 12;
    const totalContributed = monthlyAmount * months;

    if (monthlyAmount === 0 || months === 0) {
        return {
            years,
            realReturnPct,
            totalContributed,
            futureValueReal: totalContributed,
            compoundGain: 0,
        };
    }

    const monthlyRealRate = Math.pow(1 + realReturnPct / 100, 1 / 12) - 1;
    let futureValueReal: number;
    if (Math.abs(monthlyRealRate) < 1e-9) {
        // Rendimento ~0%: il future value coincide col totale versato.
        futureValueReal = totalContributed;
    } else {
        // FV di una rendita posticipata: PMT * ((1+m)^N - 1) / m.
        const annuityFactor = (Math.pow(1 + monthlyRealRate, months) - 1) / monthlyRealRate;
        futureValueReal = monthlyAmount * annuityFactor;
    }

    if (!Number.isFinite(futureValueReal) || futureValueReal < 0) {
        futureValueReal = totalContributed;
    }

    return {
        years,
        realReturnPct,
        totalContributed,
        futureValueReal,
        compoundGain: futureValueReal - totalContributed,
    };
}
