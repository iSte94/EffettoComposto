/**
 * Calcolo fiscale sulla vendita di titoli/ETF/cripto.
 *
 * Tassazione italiana sul capital gain (plusvalenza): 26%.
 * I titoli di stato (BOT, BTP, CCT) hanno aliquota ridotta 12.5% — gestita
 * opzionalmente tramite `taxRatePct`.
 *
 * Le minusvalenze (loss) non pagano imposta e sono riportabili per 4 anni
 * (solo contro plusvalenze di stessa natura — redditi diversi, non redditi di
 * capitale). L'utente può inserirle come compensazione.
 *
 * === Sanitizzazione input (regressione #sale-tax-nan-propagation) ===
 *
 * Prima del fix, `computeSaleTax` accettava qualunque numero senza difese.
 * Le conseguenze osservabili erano due:
 *
 *  1. **NaN/Infinity in input -> €NaN nella UI**. Un campo svuotato della
 *     `SaleTaxModal` o un payload AI con `shares = NaN` produceva
 *     `shares * currentPrice = NaN`, `Math.max(0, NaN) = NaN`, e tutti i
 *     campi del risultato (grossProceeds, capitalGain, taxAmount,
 *     netProceeds, effectiveTaxRate) finivano contaminati. La modale
 *     mostrava "€NaN" su 4 KPI affiancati e l'utente non aveva idea se
 *     dovesse pagare la tassa o no.
 *
 *  2. **`taxRatePct` non clampato in [0, 100]**. Un valore aberrante
 *     (es. 200% per errore di chi chiama l'API, o un calcolo sbagliato a
 *     monte) faceva si' che `taxAmount = taxableGain * 2` e quindi
 *     `netProceeds = grossProceeds - 2*taxableGain` poteva essere
 *     **negativo** — risultato matematicamente impossibile per una
 *     vendita reale (peggiore caso: aliquota 100% -> netProceeds = costo
 *     base; mai sotto). L'`effectiveTaxRate` mostrato all'utente poteva
 *     superare il 100% senza alcun warning.
 *
 *  3. **`accumulatedLosses` negative non sanificate**. Un input negativo
 *     (per errore o per regressione di parsing) saltava il branch di
 *     compensazione (`if (accumulatedLosses > 0)`), ma poi veniva
 *     restituito tale-e-quale come `remainingLoss` o sommato in
 *     `accumulatedLosses + |loss|` nel caso di perdita, propagando il
 *     valore "sporco" alle vendite future.
 *
 * La fix applica gli stessi principi gia' adottati in `coast-fire.ts` e
 * `fire-projection.ts`: ogni input numerico passa per `sanitizeNonNegative`
 * (oppure `clampPct` per la tax rate) PRIMA di partecipare alle formule.
 * In questo modo input non finiti o fuori dominio cadono su valori sicuri
 * (zero, oppure 0/100% per la tax rate) invece di propagare valori
 * matematicamente impossibili nella UI fiscale dell'utente.
 */

export interface SaleTaxInput {
    shares: number;
    currentPrice: number;        // EUR per share
    averageCost: number;         // EUR per share (cost basis)
    taxRatePct?: number;         // Default 26%. Per titoli di stato IT: 12.5%
    accumulatedLosses?: number;  // EUR di minusvalenze accumulate da compensare
    stampDutyPct?: number;       // Bollo titoli 0.2% annuo (non sulla vendita — solo informativa)
}

export interface SaleTaxResult {
    grossProceeds: number;       // shares × currentPrice
    costBasis: number;           // shares × averageCost
    capitalGain: number;         // proceeds - basis
    isGain: boolean;
    taxableGain: number;         // dopo compensazione minusvalenze
    taxAmount: number;           // imposta 26% (o personalizzata)
    taxRatePct: number;
    compensatedLoss: number;     // quanto delle minusvalenze è stato usato
    remainingLoss: number;       // residuo da riportare
    netProceeds: number;         // grossProceeds - taxAmount
    effectiveTaxRate: number;    // tax / grossProceeds %
}

export const IT_CAPITAL_GAIN_TAX = 0.26;
export const IT_GOVT_BOND_TAX = 0.125;

/** Aliquota di default in percentuale (26% per redditi diversi, art. 67 TUIR). */
const DEFAULT_TAX_RATE_PCT = IT_CAPITAL_GAIN_TAX * 100;

function sanitizeNonNegative(value: number | undefined, fallback = 0): number {
    if (value === undefined || !Number.isFinite(value)) return fallback;
    return value < 0 ? 0 : value;
}

/**
 * Clampa l'aliquota in percentuale al range fiscalmente sensato [0, 100].
 *
 * Una tax rate > 100% renderebbe `netProceeds = grossProceeds - tax` negativo,
 * scenario impossibile in qualunque legislazione: peggiore aliquota reale
 * 100% (esproprio totale del guadagno) -> netProceeds = costo base.
 * Una tax rate negativa non ha senso (sussidio fiscale: in Italia non
 * esiste sul capital gain). Input non finiti cadono sul default 26%.
 */
function clampTaxRatePct(value: number | undefined): number {
    if (value === undefined || !Number.isFinite(value)) return DEFAULT_TAX_RATE_PCT;
    if (value < 0) return 0;
    if (value > 100) return 100;
    return value;
}

export function computeSaleTax(input: SaleTaxInput): SaleTaxResult {
    const shares = sanitizeNonNegative(input.shares);
    const currentPrice = sanitizeNonNegative(input.currentPrice);
    const averageCost = sanitizeNonNegative(input.averageCost);
    const taxRatePct = clampTaxRatePct(input.taxRatePct);
    const accumulatedLosses = sanitizeNonNegative(input.accumulatedLosses);

    const grossProceeds = shares * currentPrice;
    const costBasis = shares * averageCost;
    const capitalGain = grossProceeds - costBasis;
    const isGain = capitalGain > 0;

    let taxableGain = 0;
    let compensatedLoss = 0;
    let remainingLoss = accumulatedLosses;

    if (isGain) {
        if (accumulatedLosses > 0) {
            compensatedLoss = Math.min(accumulatedLosses, capitalGain);
            remainingLoss = accumulatedLosses - compensatedLoss;
        }
        taxableGain = Math.max(0, capitalGain - compensatedLoss);
    } else if (capitalGain < 0) {
        // Perdita: la nuova minusvalenza si somma a quelle pregresse,
        // riportabili per 4 anni contro plusvalenze di pari natura.
        // Break-even (capitalGain === 0) NON modifica il bagaglio.
        remainingLoss = accumulatedLosses + Math.abs(capitalGain);
    }

    const taxAmount = taxableGain * (taxRatePct / 100);
    const netProceeds = grossProceeds - taxAmount;
    const effectiveTaxRate = grossProceeds > 0 ? (taxAmount / grossProceeds) * 100 : 0;

    return {
        grossProceeds,
        costBasis,
        capitalGain,
        isGain,
        taxableGain,
        taxAmount,
        taxRatePct,
        compensatedLoss,
        remainingLoss,
        netProceeds,
        effectiveTaxRate,
    };
}
