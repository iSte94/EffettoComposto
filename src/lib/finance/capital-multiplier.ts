// === Multiplicatore del capitale (Capital Multiplier) ===
//
// Modulo puro che traduce un piano di accumulo (capitale finale + totale
// versato) nel rapporto "ogni € versato si trasforma in €X". E' la metrica
// FIRE-friendly piu' visceralmente comunicativa per descrivere l'effetto
// composto: piu' del % di interessi maturati ("60% da composto") e piu' del
// saldo aggregato ("€500k a fine piano"), il numero "ogni € → €Y" rende
// immediato cogliere quanto il tempo + il rendimento moltiplichino il
// capitale versato.
//
// Distinto da `(totalInterest / finalBalance) * 100` (gia' mostrato nel
// componente come "% da interessi composti") perche' inverte la prospettiva:
// quella card descrive la QUOTA del FINALE che e' compound, questa descrive
// QUANTE VOLTE il versato e' stato moltiplicato. Sono matematicamente legate
// (nominalMultiplier = 1 / (1 - %compound)) ma comunicativamente diverse.
//
// Il modulo espone anche il multiplicatore REALE (deflazionato per
// inflazione) — informazione genuinamente nuova nel calcolatore: nessun'altra
// KPI attuale traduce "ogni € versato → €Y di potere d'acquisto odierno".

export interface CapitalMultiplierParams {
    /** Saldo nominale a fine piano in euro (>= 0). */
    finalBalance: number;
    /** Saldo reale (deflazionato) a fine piano in euro (>= 0). */
    realFinalBalance: number;
    /** Totale versato (capitale iniziale + tutti i contributi). Deve essere > 0 per produrre un multiplicatore. */
    totalDeposited: number;
}

export interface CapitalMultiplierResult {
    /**
     * `finalBalance / totalDeposited`. Risponde a "ogni € versato vale €X
     * nominali a fine piano". `null` se totalDeposited <= 0 (no piano da
     * misurare) o input non finiti.
     */
    nominalMultiplier: number | null;
    /**
     * `realFinalBalance / totalDeposited`. Risponde a "ogni € versato vale
     * €Y in potere d'acquisto odierno a fine piano". `null` se totalDeposited
     * <= 0 o input non finiti. Puo' essere < 1 (rendimento reale negativo:
     * l'inflazione ha eroso piu' di quanto il rendimento abbia prodotto).
     */
    realMultiplier: number | null;
    /**
     * `nominalMultiplier - realMultiplier`. Quanto del moltiplicatore
     * nominale e' "regalo dell'inflazione" e quindi NON e' aumento di
     * potere d'acquisto. >= 0 quando inflazione >= 0 (caso normale);
     * negativo solo nel caso degenere di deflazione (raro, lo lasciamo
     * passare onestamente). `null` se uno dei due multiplicatori e' null.
     */
    inflationDrag: number | null;
}

function sanitizeFinite(value: number, fallback = 0): number {
    return Number.isFinite(value) ? value : fallback;
}

/**
 * Calcola il multiplicatore del capitale per un piano di accumulo.
 *
 * Formula: `multiplier = finalBalance / totalDeposited`. Il caso `totalDeposited <= 0`
 * e' trattato come "piano vuoto": ritorna `null` in tutti i campi (no
 * divisione per zero, no Infinity propagato all'UI). Tutti gli input non
 * finiti (NaN/Infinity) vengono sanitizzati a 0 prima di entrare nei
 * confronti, coerente col pattern del progetto (`fire-projection.ts`,
 * `inflation.ts`, `compound-interest.ts`).
 */
export function computeCapitalMultiplier(params: CapitalMultiplierParams): CapitalMultiplierResult {
    const finalBalance = Math.max(0, sanitizeFinite(params.finalBalance));
    const realFinalBalance = Math.max(0, sanitizeFinite(params.realFinalBalance));
    const totalDeposited = Math.max(0, sanitizeFinite(params.totalDeposited));

    if (totalDeposited <= 0) {
        return { nominalMultiplier: null, realMultiplier: null, inflationDrag: null };
    }

    const nominalMultiplier = finalBalance / totalDeposited;
    const realMultiplier = realFinalBalance / totalDeposited;
    const inflationDrag = nominalMultiplier - realMultiplier;

    return { nominalMultiplier, realMultiplier, inflationDrag };
}
