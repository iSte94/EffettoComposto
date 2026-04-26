// === Riepilogo portafoglio debiti ===
//
// Modulo puro che aggrega una lista di debiti in metriche a livello di
// portafoglio: saldo totale, tasso medio ponderato per saldo e somma delle
// rate minime. Pensato per la card "Riepilogo Portafoglio Debiti" del
// pannello "Strategia Estinzione Debiti": fornisce in un colpo d'occhio
// la fotografia attuale dell'esposizione debitoria, complementare al
// confronto snowball/avalanche che invece guarda al futuro.
//
// Il tasso medio ponderato per saldo e' la metrica giusta per valutare
// se ha senso consolidare in un unico prestito a tasso piu' basso:
// confronta direttamente questo numero con il TAN/TAEG di un'eventuale
// surroga o consolidamento.
//
// Sanitizza valori non finiti (NaN/Infinity) e ignora debiti con saldo
// <= 0 (gia' estinti o input degeneri).

import type { Debt } from "./debt-strategy";

export interface DebtPortfolioSummary {
    /** Numero di debiti attivi (saldo > 0) considerati. */
    activeCount: number;
    /** Somma dei saldi residui di tutti i debiti attivi. */
    totalBalance: number;
    /**
     * Tasso medio ponderato per saldo (in percentuale annua).
     * E' 0 quando non ci sono debiti attivi o quando tutti i tassi sono <= 0.
     */
    weightedAverageRate: number;
    /** Somma delle rate minime mensili dei debiti attivi. */
    totalMinPayment: number;
}

export function computeDebtPortfolioSummary(debts: readonly Debt[]): DebtPortfolioSummary {
    let totalBalance = 0;
    let weightedRateSum = 0;
    let totalMinPayment = 0;
    let activeCount = 0;

    for (const debt of debts) {
        const balance = Number.isFinite(debt.balance) ? debt.balance : 0;
        if (balance <= 0) continue;
        const rate = Number.isFinite(debt.rate) ? Math.max(0, debt.rate) : 0;
        const minPayment = Number.isFinite(debt.minPayment) ? Math.max(0, debt.minPayment) : 0;

        totalBalance += balance;
        weightedRateSum += balance * rate;
        totalMinPayment += minPayment;
        activeCount += 1;
    }

    const weightedAverageRate = totalBalance > 0 ? weightedRateSum / totalBalance : 0;

    return { activeCount, totalBalance, weightedAverageRate, totalMinPayment };
}
