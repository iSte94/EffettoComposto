// === Statistiche storiche su snapshot di patrimonio ===
//
// Calcola metriche che hanno senso solo guardando l'intera serie temporale:
// - CAGR (Compound Annual Growth Rate): tasso di crescita annualizzato
//   composto tra il primo e l'ultimo snapshot con patrimonio positivo.
// - Max Drawdown: peggior calo percentuale da un picco storico al minimo
//   successivo (misura di rischio/volatilita' realizzata).
//
// Le funzioni sono pure e non dipendono da React, cosi' possono essere
// testate in isolamento ed eventualmente riutilizzate altrove.

export interface HistoryPoint {
    date: string;
    value: number;
}

export interface HistoryStats {
    /** Tasso di crescita annualizzato composto in percentuale (es. 7.4). */
    cagrPercent: number | null;
    /** Anni di storico coperti dal calcolo del CAGR (base 365.25). */
    cagrYears: number | null;
    /** Peggior drawdown osservato in percentuale (valore <= 0, es. -12.3). */
    maxDrawdownPercent: number | null;
    /** Picco storico raggiunto (massimo valore assoluto osservato). */
    peakValue: number | null;
}

// Soglia minima di storico richiesta per rendere significativo il CAGR.
// Sotto questa soglia i numeri annualizzati diventano rumorosi e fuorvianti
// (un +5% in 2 settimane annualizzato produrrebbe centinaia di punti %).
const MIN_YEARS_FOR_CAGR = 0.25; // ~3 mesi

/**
 * Calcola CAGR e massimo drawdown su una serie di snapshot di patrimonio.
 *
 * Il CAGR restituisce `null` quando:
 * - lo storico ha meno di 2 punti;
 * - il primo o l'ultimo valore non sono strettamente positivi (la formula
 *   richiede basi positive);
 * - il periodo coperto e' inferiore a ~3 mesi (valori troppo rumorosi).
 *
 * Il max drawdown e' sempre un numero <= 0 (o `null` se lo storico e' vuoto):
 * 0 significa "nessun calo mai osservato dal picco".
 */
export function computeHistoryStats(history: HistoryPoint[]): HistoryStats {
    if (!history || history.length === 0) {
        return { cagrPercent: null, cagrYears: null, maxDrawdownPercent: null, peakValue: null };
    }

    // Max drawdown: scorri una sola volta tenendo il picco corrente.
    let peakValue = history[0].value;
    let maxDrawdownPercent = 0;
    for (const point of history) {
        if (point.value > peakValue) {
            peakValue = point.value;
        }
        if (peakValue > 0) {
            const drawdown = ((point.value - peakValue) / peakValue) * 100;
            if (drawdown < maxDrawdownPercent) {
                maxDrawdownPercent = drawdown;
            }
        }
    }

    // CAGR: richiede almeno due punti e valori positivi su entrambi gli estremi.
    let cagrPercent: number | null = null;
    let cagrYears: number | null = null;
    if (history.length >= 2) {
        const first = history[0];
        const last = history[history.length - 1];
        const firstValue = first.value;
        const lastValue = last.value;
        const firstTime = new Date(first.date).getTime();
        const lastTime = new Date(last.date).getTime();

        if (
            Number.isFinite(firstTime) &&
            Number.isFinite(lastTime) &&
            lastTime > firstTime &&
            firstValue > 0 &&
            lastValue > 0
        ) {
            const years = (lastTime - firstTime) / (1000 * 60 * 60 * 24 * 365.25);
            if (years >= MIN_YEARS_FOR_CAGR) {
                cagrYears = years;
                cagrPercent = (Math.pow(lastValue / firstValue, 1 / years) - 1) * 100;
            }
        }
    }

    return {
        cagrPercent,
        cagrYears,
        maxDrawdownPercent: history.length > 0 ? maxDrawdownPercent : null,
        peakValue,
    };
}
