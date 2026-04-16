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

export function computeSaleTax(input: SaleTaxInput): SaleTaxResult {
    const {
        shares,
        currentPrice,
        averageCost,
        taxRatePct = IT_CAPITAL_GAIN_TAX * 100,
        accumulatedLosses = 0,
    } = input;

    const grossProceeds = Math.max(0, shares * currentPrice);
    const costBasis = Math.max(0, shares * averageCost);
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
    } else {
        // Perdita: aggiunta al bagaglio di minusvalenze
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
