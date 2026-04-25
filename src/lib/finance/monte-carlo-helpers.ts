/**
 * Helper puri per la simulazione Monte Carlo del FIRE.
 *
 * Estratti dal Web Worker per consentire la verifica unitaria della logica
 * matematica senza dover orchestrare un Worker reale dentro Vitest.
 *
 * BUG FIX (regressione "capital-sign-flip"):
 *   `monte-carlo.worker.ts` campionava il rendimento annuo da
 *   `randomNormal(meanRealReturn, stdDev)`. Con volatilita' alte (lo slider
 *   in `fire-settings-panel.tsx` permette fino al 30%), la coda sinistra
 *   della normale puo' produrre `randomYearReturn < -1` (perdita > 100%)
 *   con probabilita' non trascurabile (~3 in 10.000 con stdDev=30% e mean
 *   reale 4%). In quel caso `runCap * (1 + randomYearReturn)` faceva
 *   FLIPPARE IL SEGNO del capitale (es. 1M -> -500k), valore matematicamente
 *   impossibile in un mercato reale: nel peggiore dei casi un asset puo'
 *   essere azzerato, non diventare negativo.
 *
 *   Il segno negativo poi inquinava i calcoli intermedi nel ramo retired
 *   (sottraeva spese da capitale gia' negativo) e nella gestione del fondo
 *   pensione (che e' una variabile separata ma sottoposta allo stesso
 *   campionamento). Solo a fine anno un `if (runCap < 0) runCap = 0`
 *   tampava il danno, ma le operazioni intermedie (allocazione risparmi
 *   passivi, eventi pianificati, liquidazione PFP) potevano gia' aver
 *   distorto i percentili p10/p50/p90 mostrati a video e il successRate.
 *
 *   Su 10.000 simulazioni a 60 anni significa attendersi ~150 eventi di
 *   inversione del segno per parametri "high volatility": un numero
 *   sufficiente a spostare visibilmente i percentili pessimisti. Il flag
 *   `survived` veniva comunque settato a false dopo il flip, ma la curva
 *   p10 della Monte Carlo poteva mostrare valori spuriamente bassi.
 *
 *   La soluzione e' clampare il rendimento a >= -100% (perdita massima
 *   reale possibile) prima di applicarlo al capitale, e clampare il
 *   risultato a >= 0 come ulteriore difesa. Il flag `survived` continua
 *   a basarsi sulla negativita' del capitale a fine anno (dopo
 *   sottrazione delle spese di pensione), quindi la semantica della
 *   metrica di sopravvivenza non cambia.
 */

export interface AnnualReturnApplication {
    /** Capitale risultante dopo aver applicato il rendimento (>= 0). */
    nextCapital: number;
    /** True se il rendimento campionato era < -100% ed e' stato clampato. */
    wasReturnClamped: boolean;
}

/**
 * Applica un rendimento annuo (in decimale, es. 0.07 per +7%, -0.30 per -30%)
 * a un capitale, garantendo invarianti fisicamente sensate:
 *
 *   - Il rendimento e' clampato a [-1, +∞): un mercato puo' azzerare un
 *     asset ma non renderlo negativo.
 *   - Il capitale risultante e' >= 0.
 *   - Input non finiti (NaN/Infinity) producono fallback sicuri (capitale
 *     normalizzato a 0 oppure a se stesso se finito non-negativo).
 *
 * Restituisce sia il nuovo capitale sia un flag che indica se il
 * rendimento e' stato clampato — utile per logging/debug della Monte Carlo
 * senza dover ricalcolare la condizione fuori dalla helper.
 */
export function applyMonteCarloAnnualReturn(
    capital: number,
    annualReturnDecimal: number,
): AnnualReturnApplication {
    const safeCapital = Number.isFinite(capital) && capital > 0 ? capital : 0;

    if (!Number.isFinite(annualReturnDecimal)) {
        // Rendimento NaN/Infinity: trattiamo come se fosse zero (no-op),
        // evitando di propagare valori non finiti nei percentili a video.
        return { nextCapital: safeCapital, wasReturnClamped: false };
    }

    const wasReturnClamped = annualReturnDecimal < -1;
    const cappedReturn = wasReturnClamped ? -1 : annualReturnDecimal;
    const next = safeCapital * (1 + cappedReturn);

    // Math.max(0, ...) e' difensivo: con cappedReturn >= -1 il prodotto
    // e' gia' >= 0, ma ci proteggiamo da future regressioni se la helper
    // dovesse essere usata con capitale gia' negativo prodotto altrove.
    return {
        nextCapital: next > 0 ? next : 0,
        wasReturnClamped,
    };
}
