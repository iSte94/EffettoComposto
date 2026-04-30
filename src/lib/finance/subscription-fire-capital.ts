// === Capitale FIRE necessario per coprire abbonamenti ricorrenti ===
//
// Modulo puro che traduce la spesa annuale per abbonamenti nel "capitale FIRE
// necessario": l'importo che, investito al tasso di prelievo sicuro (SWR) di
// default dell'app, genera ogni anno una rendita pari al costo annuale degli
// abbonamenti, teoricamente a tempo indefinito.
//
// E' la "regola del 25x" (o piu' precisamente del ~30.77x al 3.25% SWR)
// applicata ai costi ricorrenti: complementa il "Costo Opportunita'"
// (quanto avresti accumulato investendo la stessa cifra) con la prospettiva
// duale "quanto capitale ti serve per pagare per sempre questi abbonamenti
// senza intaccare il capitale". Forte allineamento col tema FIRE dell'app.
//
// Tutti i ritorni sono in EURO ODIERNI: il SWR e' gia' inteso come prelievo
// reale sostenibile, quindi il capitale necessario e' espresso in potere
// d'acquisto attuale, confrontabile direttamente con il proprio patrimonio.
import { DEFAULT_FIRE_WITHDRAWAL_RATE } from "./fire-metrics";

/** SWR di default usato come prelievo reale sostenibile (3.25%). */
export const DEFAULT_SUBSCRIPTION_FIRE_SWR_PCT = DEFAULT_FIRE_WITHDRAWAL_RATE;

export interface SubscriptionFireCapitalParams {
    /** Spesa mensile per abbonamenti (>=0). */
    monthlyAmount: number;
    /** SWR in percentuale (es. 3.25 per 3.25%). Default: 3.25%. */
    swrPct?: number;
}

export interface SubscriptionFireCapitalResult {
    /** SWR effettivamente usato (percentuale). */
    swrPct: number;
    /** Costo annuale equivalente (mensile * 12). */
    annualCost: number;
    /**
     * Capitale FIRE necessario in euro odierni: l'importo che, prelevando
     * `swrPct`% all'anno, copre `annualCost` indefinitamente. Calcolato come
     * `annualCost / (swrPct / 100)`. Zero quando la spesa e' zero o lo SWR
     * e' non positivo (in quel caso il calcolo e' indefinito).
     */
    requiredFireCapital: number;
    /**
     * Multiplicatore implicito sul costo annuale (`100 / swrPct`). Espone in
     * modo trasparente la "regola del Nx": al 3.25% SWR vale ~30.77, al 4%
     * SWR il classico 25.
     */
    capitalMultiplier: number;
}

function sanitize(value: number, fallback = 0): number {
    return Number.isFinite(value) ? value : fallback;
}

/**
 * Capitale FIRE necessario per generare, al SWR scelto, una rendita pari al
 * costo annuale degli abbonamenti. Sanitizza input non finiti (NaN/Infinity
 * -> fallback) e clampa monthlyAmount a >=0. Ritorna 0 quando la spesa e'
 * zero o quando lo SWR e' <=0 (perche' una rendita perpetua richiede un
 * tasso di prelievo positivo per essere matematicamente definita).
 */
export function computeSubscriptionFireCapital(
    params: SubscriptionFireCapitalParams,
): SubscriptionFireCapitalResult {
    const monthlyAmount = Math.max(0, sanitize(params.monthlyAmount));
    const swrPct = sanitize(params.swrPct ?? DEFAULT_SUBSCRIPTION_FIRE_SWR_PCT, DEFAULT_SUBSCRIPTION_FIRE_SWR_PCT);
    const annualCost = monthlyAmount * 12;

    if (monthlyAmount === 0 || swrPct <= 0) {
        return {
            swrPct,
            annualCost,
            requiredFireCapital: 0,
            capitalMultiplier: swrPct > 0 ? 100 / swrPct : 0,
        };
    }

    const capitalMultiplier = 100 / swrPct;
    const requiredFireCapital = annualCost * capitalMultiplier;

    return {
        swrPct,
        annualCost,
        requiredFireCapital,
        capitalMultiplier,
    };
}
