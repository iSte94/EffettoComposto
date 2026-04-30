// Helper puri per la liquidazione del fondo pensione (PFP Italia).
// Estratto da fire-dashboard.tsx / monte-carlo.worker.ts per:
//   1. Risolvere il bug di uguaglianza stretta `yAge === pensionFundAccessAge`
//      che impediva la liquidazione quando l'eta' di accesso era gia'
//      passata o quando i passi dell'eta' non cadevano esattamente sul
//      valore target (es. eta' corrente > eta' di accesso).
//   2. Rendere la logica matematica testabile in isolamento.
//
// === BUG FIX (regressione "pension-liquidation-nan-propagation") ===
//
// Prima di questa hardening, `liquidatePensionFund` sanitizzava SOLO
// `pensionCap`, lasciando passare qualunque valore non finito su
// `exitTaxRate`, `accessAge`, `lifeExpectancy` o `exitMode`. La cascata
// di propagazione era questa:
//
//   - `Math.min(100, Math.max(0, NaN)) === NaN`  (Math.max/min ritornano NaN
//     se uno qualsiasi degli operandi e' NaN — non zero, non il fallback)
//   - `(NaN - x) * 12 === NaN`
//   - `Math.max(1, NaN) === NaN`     (stessa trappola)
//   - `pensionCap * (1 - NaN/100) === NaN`
//   - `NaN / NaN === NaN`
//
// Risultato: con un singolo `pensionFundExitTaxRate` mancante o corrotto
// in preferences (campo svuotato dall'utente, deserializzazione di una
// stringa, migrazione legacy non normalizzata) il fondo pensione veniva
// liquidato producendo `cashLump`, `monthlyAnnuity` e `netCapital` tutti
// NaN. Da li' il bug si propagava nelle proiezioni FIRE (`tempCap += NaN`
// in fire-dashboard.tsx) e nel Monte Carlo (`runCap` corrotto in tutti i
// 10k run), trasformando sia la stima "anni al FIRE" sia la "probabilita'
// di successo" in `NaN` - metrica utente illeggibile o, peggio,
// silenziosamente sbagliata se cast a 0.
//
// Stessa famiglia di regressioni gia' fixate in `fire-projection.ts`,
// `coast-fire.ts`, `inflation.ts`, `sale-tax.ts`. Qui la chiusura del
// pattern: ogni input numerico passa per `sanitizeFinite` /
// `sanitizeNonNegative` / `clampPercent` PRIMA di partecipare a qualunque
// formula. Il default per `exitTaxRate` non specificato e' 0% (nessuna
// tassazione, scenario neutro) coerente con la convenzione di
// `clampTaxRatePct` in `sale-tax.ts`.

export type PensionExitMode = "annuity" | "hybrid";

function sanitizeFinite(value: unknown, fallback = 0): number {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function sanitizeNonNegative(value: unknown, fallback = 0): number {
    const finite = sanitizeFinite(value, fallback);
    return finite < 0 ? 0 : finite;
}

function clampPercent(value: unknown): number {
    if (typeof value !== "number" || Number.isNaN(value)) return 0;
    if (value === Number.POSITIVE_INFINITY || value > 100) return 100;
    if (value === Number.NEGATIVE_INFINITY || value < 0) return 0;
    return value;
}

export interface PensionLiquidationParams {
    /** Capitale lordo accumulato nel fondo pensione al momento della liquidazione. */
    pensionCap: number;
    /** Aliquota di tassazione in uscita (es. 15 = 15%). Clampata a [0, 100]. */
    exitTaxRate: number;
    /** Modalita' di uscita: 100% rendita oppure 50% capitale + 50% rendita. */
    exitMode: PensionExitMode;
    /** Eta' effettiva alla quale avviene la liquidazione. */
    accessAge: number;
    /** Aspettativa di vita usata per ripartire la rendita (es. 85). */
    lifeExpectancy: number;
}

export interface PensionLiquidationResult {
    /** Somma immediatamente accreditata al capitale liquido (0 in modalita' annuity). */
    cashLump: number;
    /** Rendita MENSILE in euro odierni. */
    monthlyAnnuity: number;
    /** Capitale netto dopo tassazione, utile per debug/display. */
    netCapital: number;
}

/**
 * Liquida il fondo pensione applicando tassazione e dividendo il netto fra
 * capitale immediato e rendita mensile secondo la modalita' scelta.
 *
 * Formule:
 *   - net = pensionCap * (1 - exitTaxRate/100)
 *   - annuityMonths = max(1, (lifeExpectancy - accessAge) * 12)
 *   - hybrid: cashLump = net*0.5, monthlyAnnuity = (net*0.5)/annuityMonths
 *   - annuity: cashLump = 0, monthlyAnnuity = net / annuityMonths
 *
 * Tutti gli input numerici (pensionCap, exitTaxRate, accessAge, lifeExpectancy)
 * passano per sanitizzazione: NaN/Infinity/negativi cadono su default sicuri
 * (zero per il capitale, 0% per la tassazione, fallback finiti per le eta').
 * `exitMode` non riconosciuto cade su "annuity" (tutto in rendita), il caso
 * piu' conservativo. Garantisce in ogni scenario un risultato finito,
 * eliminando la propagazione di NaN attraverso la proiezione FIRE e il
 * Monte Carlo.
 */
export function liquidatePensionFund(
    params: PensionLiquidationParams,
): PensionLiquidationResult {
    const pensionCap = sanitizeNonNegative(params.pensionCap);
    if (pensionCap <= 0) {
        return { cashLump: 0, monthlyAnnuity: 0, netCapital: 0 };
    }

    // exitTaxRate non finito o non specificato => 0% (nessuna tassazione,
    // scenario conservativo che NON contamina il netto).
    const taxRate = clampPercent(params.exitTaxRate);
    const net = pensionCap * (1 - taxRate / 100);

    // Se uno fra lifeExpectancy o accessAge e' NaN, sanitizeFinite li
    // riporta a 0; (0 - 0) * 12 = 0; Math.max(1, 0) = 1, garantendo
    // un divisore finito >=1 anche nello scenario degenere.
    // Se lifeExpectancy <= accessAge (eta' di accesso oltre l'aspettativa)
    // mantenia il clamp a 1 mese che evita divisioni per zero.
    const safeLifeExpectancy = sanitizeFinite(params.lifeExpectancy);
    const safeAccessAge = sanitizeFinite(params.accessAge);
    const annuityMonths = Math.max(1, (safeLifeExpectancy - safeAccessAge) * 12);

    if (params.exitMode === "hybrid") {
        const lump = net * 0.5;
        return {
            cashLump: lump,
            monthlyAnnuity: lump / annuityMonths,
            netCapital: net,
        };
    }

    return {
        cashLump: 0,
        monthlyAnnuity: net / annuityMonths,
        netCapital: net,
    };
}

/**
 * Determina se durante questa iterazione della simulazione occorre liquidare
 * il fondo pensione. Il fix chiave rispetto al codice originale:
 *
 *   PRIMA: `yAge === pensionFundAccessAge`
 *     - Falliva se yAge non era intero.
 *     - Falliva se currentAge > pensionFundAccessAge (la liquidazione
 *       non veniva MAI eseguita e il capitale del fondo cresceva all'infinito).
 *     - Falliva se il passo di eta' saltava l'anno esatto per qualunque motivo.
 *
 *   ADESSO: `!alreadyAccessed && yAge >= pensionFundAccessAge`
 *     - Robusto a qualunque eta' di partenza.
 *     - La liquidazione avviene una sola volta grazie al flag idempotente.
 */
export function shouldLiquidatePensionFund(
    currentYAge: number,
    accessAge: number,
    alreadyAccessed: boolean,
): boolean {
    if (alreadyAccessed) return false;
    if (!Number.isFinite(currentYAge) || !Number.isFinite(accessAge)) return false;
    return currentYAge >= accessAge;
}
