// === Costo opportunita' della liquidita' eccessiva ===
//
// Modulo puro che misura QUANTO PESA tenere fermo un fondo emergenza molto
// piu' grande del necessario. La regola del pollice condivisa nel resto della
// piattaforma (vedi `useFinancialAlerts` in `financial-alerts.tsx`) considera
// "raccomandato" un fondo emergenza pari a 3-6 mesi di spese; oltre i 12 mesi
// si entra nella zona "eccellente". Tenerne pero' troppo - 18+ mesi di spese
// in liquidita' improduttiva - e' un classico errore comportamentale italiano:
// soldi che NON producono nulla mentre il SUPERAMENTO della soglia di
// sicurezza potrebbe lavorare per anni nel mercato.
//
// Questo modulo traduce quel surplus in un singolo numero confrontabile con
// il resto delle metriche FIRE dell'app: il valore composto reale che il
// surplus avrebbe se investito al rendimento reale di default per
// l'orizzonte di default. Tutto in EURO REALI (potere d'acquisto odierno),
// coerentemente con `subscription-opportunity.ts` e `fire-years.ts`.
//
// Modello (one-shot, non rendita): l'utente non paga la liquidita' "ogni
// mese", la possiede gia' come capitale unico. Quindi qui usiamo la formula
// del montante di un singolo capitale, NON quella della rendita posticipata
// usata in `subscription-opportunity.ts`. Sono complementari: una serve per
// flussi mensili ricorrenti, l'altra per un capitale fermo da mobilitare.
//
//   futureValueReal = excess * (1 + realReturnPct/100) ^ years
//
// Capitalizzazione annuale (sufficiente per orizzonti FIRE ventennali, in
// linea con la matematica di `fire-years.ts`).

/**
 * Soglia consigliata per il fondo emergenza (mesi di spese): coerente con
 * `useFinancialAlerts` che considera 6 mesi il limite superiore della
 * fascia "raccomandata".
 */
export const RECOMMENDED_EMERGENCY_MONTHS = 6;

/**
 * Soglia oltre la quale scatta l'alert "Liquidita' Eccessiva". Sopra questo
 * valore il fondo emergenza non e' piu' "prudenza" ma "denaro inattivo".
 * 18 mesi e' una soglia conservativa: la fascia 6-12 resta neutra (no alert
 * per non aggiungere rumore), 12-18 resta "eccellente", oltre i 18 si
 * passa al warning con il costo opportunita' calcolato.
 */
export const EXCESS_LIQUIDITY_TRIGGER_MONTHS = 18;

/** Rendimento reale annuo di default (Fisher: ~7% nominale - ~3% inflazione).
 *  Coerente con `subscription-opportunity.ts` e `fire-years.ts` per non
 *  mostrare assunzioni divergenti fra schermate dello stesso prodotto. */
export const EXCESS_LIQUIDITY_DEFAULT_REAL_RETURN_PCT = 4;

/** Orizzonte di default per la proiezione FIRE-friendly. */
export const EXCESS_LIQUIDITY_DEFAULT_HORIZON_YEARS = 30;

export interface ExcessLiquidityInput {
    /** Fondo emergenza attuale in euro (>= 0 perche' negativo non ha senso). */
    emergencyFund: number;
    /** Spese mensili attese in euro (> 0 per produrre un risultato). */
    monthlyExpenses: number;
    /** Mesi di spese considerati "raccomandati" (default {@link RECOMMENDED_EMERGENCY_MONTHS}). */
    recommendedMonths?: number;
    /** Mesi sopra i quali scatta l'alert (default {@link EXCESS_LIQUIDITY_TRIGGER_MONTHS}). */
    triggerMonths?: number;
    /** Rendimento reale annuo in % (default {@link EXCESS_LIQUIDITY_DEFAULT_REAL_RETURN_PCT}). */
    realReturnPct?: number;
    /** Orizzonte temporale in anni (default {@link EXCESS_LIQUIDITY_DEFAULT_HORIZON_YEARS}). */
    years?: number;
}

export interface ExcessLiquidityResult {
    /** Mesi di spese effettivamente coperti dal fondo emergenza. */
    months: number;
    /** Capitale eccedente la soglia raccomandata, in euro odierni. */
    excess: number;
    /** Valore composto reale del surplus a fine orizzonte (potere d'acquisto odierno). */
    futureValueReal: number;
    /** Guadagno reale composto puro (futureValueReal - excess). */
    compoundGain: number;
    /** Anni effettivamente usati nel calcolo. */
    years: number;
    /** Rendimento reale annuo effettivamente usato (in %). */
    realReturnPct: number;
    /** Mesi raccomandati effettivamente usati. */
    recommendedMonths: number;
}

function sanitize(value: number | undefined | null): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Restituisce il costo opportunita' della liquidita' "in eccesso" rispetto
 * alla soglia raccomandata, oppure `null` se l'utente NON ha effettivamente
 * un eccesso significativo (fondo sotto la soglia trigger, spese mensili
 * non specificate, fondo a zero, ecc.).
 *
 * Quando ritorna un risultato, `excess > 0` e `futureValueReal >= excess`
 * (il valore investito non puo' essere inferiore a se stesso a rendimento
 * non negativo). Per rendimento reale negativo viene clampato a 0 con
 * fallback al capitale stesso (modello prudente: non mostriamo "perdite"
 * ipotetiche, mostriamo solo il guadagno netto possibile).
 */
export function computeExcessLiquidityImpact(
    input: ExcessLiquidityInput,
): ExcessLiquidityResult | null {
    const emergencyFund = Math.max(0, sanitize(input.emergencyFund));
    const monthlyExpenses = sanitize(input.monthlyExpenses);
    const recommendedMonths = Math.max(0, sanitize(input.recommendedMonths ?? RECOMMENDED_EMERGENCY_MONTHS));
    const triggerMonths = Math.max(0, sanitize(input.triggerMonths ?? EXCESS_LIQUIDITY_TRIGGER_MONTHS));
    const realReturnPct = sanitize(input.realReturnPct ?? EXCESS_LIQUIDITY_DEFAULT_REAL_RETURN_PCT);
    const years = Math.max(0, Math.floor(sanitize(input.years ?? EXCESS_LIQUIDITY_DEFAULT_HORIZON_YEARS)));

    if (monthlyExpenses <= 0) return null;
    if (emergencyFund <= 0) return null;

    const months = emergencyFund / monthlyExpenses;
    if (months < triggerMonths) return null;

    const excess = emergencyFund - recommendedMonths * monthlyExpenses;
    if (excess <= 0) return null;

    const r = realReturnPct / 100;
    let futureValueReal: number;
    if (years === 0) {
        futureValueReal = excess;
    } else if (r <= 0) {
        // Rendimento reale nullo o negativo: per non mostrare "perdite"
        // ipotetiche (l'utente sta cercando di capire il guadagno, non il
        // rischio peggiore), restituiamo il capitale stesso senza compounding.
        futureValueReal = excess;
    } else {
        futureValueReal = excess * Math.pow(1 + r, years);
    }

    if (!Number.isFinite(futureValueReal) || futureValueReal < excess) {
        futureValueReal = excess;
    }

    return {
        months,
        excess,
        futureValueReal,
        compoundGain: futureValueReal - excess,
        years,
        realReturnPct,
        recommendedMonths,
    };
}
