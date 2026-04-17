// Helper puri per la liquidazione del fondo pensione (PFP Italia).
// Estratto da fire-dashboard.tsx / monte-carlo.worker.ts per:
//   1. Risolvere il bug di uguaglianza stretta `yAge === pensionFundAccessAge`
//      che impediva la liquidazione quando l'eta' di accesso era gia'
//      passata o quando i passi dell'eta' non cadevano esattamente sul
//      valore target (es. eta' corrente > eta' di accesso).
//   2. Rendere la logica matematica testabile in isolamento.

export type PensionExitMode = "annuity" | "hybrid";

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
 * Valori negativi o NaN sono trattati come 0 per robustezza.
 */
export function liquidatePensionFund(
    params: PensionLiquidationParams,
): PensionLiquidationResult {
    const pensionCap = Number.isFinite(params.pensionCap) ? Math.max(0, params.pensionCap) : 0;
    if (pensionCap <= 0) {
        return { cashLump: 0, monthlyAnnuity: 0, netCapital: 0 };
    }

    const taxRate = Math.min(100, Math.max(0, params.exitTaxRate));
    const net = pensionCap * (1 - taxRate / 100);

    // Se l'aspettativa di vita e' <= eta' di accesso (edge-case input),
    // garantiamo almeno 1 mese per evitare divisioni per zero.
    const annuityMonths = Math.max(1, (params.lifeExpectancy - params.accessAge) * 12);

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
