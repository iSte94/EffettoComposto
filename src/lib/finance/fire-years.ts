// === Stima anni al FIRE in base al tasso di risparmio ===
//
// Modulo puro che traduce reddito mensile, spese e tasso di risparmio nel
// numero di anni necessari per raggiungere l'indipendenza finanziaria,
// partendo dal capitale gia' accumulato (netWorth).
//
// E' la versione "rigorosa" del celebre articolo di Mr. Money Mustache
// "The Shockingly Simple Math Behind Early Retirement" e dell'omonimo tool
// Networthify: a parita' di stile di vita, il tasso di risparmio e' di gran
// lunga la leva piu' potente sul tempo al FIRE - molto piu' del rendimento.
//
// Modello (in EURO REALI, ovvero potere d'acquisto odierno):
//   - target FIRE          = annualExpenses / SWR
//   - capitale iniziale    = netWorth
//   - contributi annui     = annualSavings (assunti costanti in euro reali)
//   - rendimento usato     = real return (gia' al netto dell'inflazione)
//
// Equazione di accumulo (capitalizzazione annua, contributi a fine anno):
//     target = netWorth*(1+r)^n + annualSavings * ((1+r)^n - 1) / r
// Risolvendo per n:
//     X = (target + annualSavings/r) / (netWorth + annualSavings/r)
//     n = ln(X) / ln(1+r)
// Per r = 0 cade sulla forma lineare:
//     n = (target - netWorth) / annualSavings
//
// L'approccio "in euro reali" allinea questo helper con il resto della
// piattaforma (subscription-opportunity, compound-interest-calculator):
// l'utente ragiona sempre in potere d'acquisto odierno, non in nominali
// gonfiati.

/** Rendimento reale annuo di default (al netto dell'inflazione). Coerente
 *  con il modulo subscription-opportunity per non mostrare assunzioni
 *  diverse fra schermate dello stesso prodotto. */
export const FIRE_YEARS_DEFAULT_REAL_RETURN_PCT = 4;

/** Safe Withdrawal Rate di default. Coerente con DEFAULT_FIRE_WITHDRAWAL_RATE
 *  in fire-metrics.ts (3.25% piu' prudente del classico 4% Trinity). */
export const FIRE_YEARS_DEFAULT_SWR_PCT = 3.25;

/** Tetto in anni: oltre questa soglia il piano e' di fatto "non realistico"
 *  e mostriamo un'etichetta "oltre N anni" invece del numero esatto. */
export const FIRE_YEARS_MAX = 100;

export interface FireYearsInput {
    /** Reddito netto mensile totale (>0 per produrre un risultato). */
    monthlyIncome: number;
    /** Spese mensili attese (>0). Usate per calcolare il target FIRE. */
    monthlyExpenses: number;
    /** Risparmio mensile (>0). Se 0 o negativo non c'e' percorso al FIRE. */
    monthlySavings: number;
    /** Patrimonio gia' accumulato (capitale di partenza). Default 0. */
    netWorth?: number;
    /** Rendimento reale annuo atteso in % (default {@link FIRE_YEARS_DEFAULT_REAL_RETURN_PCT}). */
    realReturnPct?: number;
    /** Safe Withdrawal Rate in % (default {@link FIRE_YEARS_DEFAULT_SWR_PCT}). */
    swrPct?: number;
}

export interface FireYearsResult {
    /** Anni stimati al FIRE (>= 0, capato a {@link FIRE_YEARS_MAX}). */
    yearsToFire: number;
    /** Tasso di risparmio in percentuale (savings/income). */
    savingsRatePct: number;
    /** Target FIRE in euro odierni (annualExpenses / SWR). */
    fireTarget: number;
    /** Gap residuo fra target e patrimonio attuale (>= 0). */
    fireGap: number;
    /** Rendimento reale usato nel calcolo (in %). */
    realReturnPct: number;
    /** SWR usato nel calcolo (in %). */
    swrPct: number;
    /** True se il risultato e' stato capato a FIRE_YEARS_MAX. */
    capped: boolean;
    /** True se il patrimonio attuale gia' raggiunge o supera il target. */
    alreadyFire: boolean;
}

function sanitize(value: number | undefined | null): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Stima gli anni necessari al FIRE in base al tasso di risparmio.
 *
 * Restituisce `null` quando il calcolo non e' significativo (input mancanti,
 * tasso di risparmio non positivo, SWR <= 0, ecc.). Quando il patrimonio
 * gia' supera il target restituisce `yearsToFire = 0` con `alreadyFire = true`.
 *
 * Il calcolo lavora in EURO REALI: il rendimento atteso e' gia' al netto
 * dell'inflazione, quindi anche `monthlySavings` e' considerato costante in
 * potere d'acquisto odierno (assunzione standard della letteratura FIRE).
 */
export function estimateYearsToFire(input: FireYearsInput): FireYearsResult | null {
    const monthlyIncome = sanitize(input.monthlyIncome);
    const monthlyExpenses = sanitize(input.monthlyExpenses);
    const monthlySavings = sanitize(input.monthlySavings);
    const netWorth = Math.max(0, sanitize(input.netWorth));
    const realReturnPct = sanitize(input.realReturnPct ?? FIRE_YEARS_DEFAULT_REAL_RETURN_PCT);
    const swrPct = sanitize(input.swrPct ?? FIRE_YEARS_DEFAULT_SWR_PCT);

    if (monthlyIncome <= 0 || monthlyExpenses <= 0 || monthlySavings <= 0) return null;
    if (swrPct <= 0) return null;
    // Una savings rate >= 100% (spese nulle) renderebbe il target FIRE 0 e
    // perderebbe significato; capiamo a 99% per sicurezza numerica.
    if (monthlySavings >= monthlyIncome) return null;

    const savingsRatePct = (monthlySavings / monthlyIncome) * 100;
    const annualSavings = monthlySavings * 12;
    const annualExpenses = monthlyExpenses * 12;
    const fireTarget = (annualExpenses * 100) / swrPct;
    const fireGap = Math.max(0, fireTarget - netWorth);

    if (fireGap <= 0) {
        return {
            yearsToFire: 0,
            savingsRatePct,
            fireTarget,
            fireGap: 0,
            realReturnPct,
            swrPct,
            capped: false,
            alreadyFire: true,
        };
    }

    const r = realReturnPct / 100;
    let years: number;
    if (Math.abs(r) < 1e-9) {
        // Caso degenere: rendimento reale nullo. Cresce solo per accumulo.
        years = fireGap / annualSavings;
    } else if (r < 0) {
        // Rendimento reale negativo: l'erosione potrebbe rendere il piano
        // impossibile. Per non restituire valori fuorvianti, fallback a
        // approssimazione lineare (limite superiore prudente).
        years = fireGap / annualSavings;
    } else {
        const denominator = netWorth + annualSavings / r;
        if (denominator <= 0) return null;
        const numerator = fireTarget + annualSavings / r;
        const ratio = numerator / denominator;
        if (!Number.isFinite(ratio) || ratio <= 1) {
            // ratio <= 1 indica che il target e' gia' raggiungibile a t=0.
            years = 0;
        } else {
            years = Math.log(ratio) / Math.log(1 + r);
        }
    }

    if (!Number.isFinite(years) || years < 0) return null;

    const capped = years > FIRE_YEARS_MAX;
    return {
        yearsToFire: capped ? FIRE_YEARS_MAX : years,
        savingsRatePct,
        fireTarget,
        fireGap,
        realReturnPct,
        swrPct,
        capped,
        alreadyFire: false,
    };
}
