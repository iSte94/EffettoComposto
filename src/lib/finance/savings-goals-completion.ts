// === Tempo stimato al completamento totale degli obiettivi di risparmio ===
//
// Modulo puro che, dato l'elenco degli obiettivi di risparmio dell'utente,
// calcola il tempo stimato per portarli TUTTI a completamento al ritmo di
// risparmio storico aggregato (somma delle quote mensili storiche dei goal
// non ancora completati).
//
// Complementa la KPI "Ritmo attuale" (che confronta il ritmo storico col
// ritmo richiesto dalle deadline) con una proiezione "se mantengo questo
// passo, quando finisco TUTTO": e' una scadenza realistica per l'intera
// roadmap di obiettivi, indipendente dalle scadenze impostate sui singoli
// goal.
//
// Tutti gli importi sono in EURO; il tempo e' in mesi interi arrotondati
// per eccesso (un'unita' frazionaria di mese non ha valore operativo).
//
// === BUG FIX (regressione "savings-pace-counts-initial-balance") ===
//
// La versione precedente calcolava il ritmo storico come
// `currentAmount / mesi_trascorsi`, includendo erroneamente il SALDO
// INIZIALE (capitale che il goal aveva al momento della creazione) come
// se fosse stato risparmiato durante l'orizzonte. La sovrastima era
// massima per i goal creati con un capitale di partenza > 0:
//
//   - Goal creato OGGI con €5.000 gia' presenti, target €10.000:
//     vecchia stima -> ~€5.000/mese di pace, completamento in 1 mese.
//     Realta' -> il goal e' nuovo, non c'e' pace storica misurabile.
//
//   - Goal creato 6 mesi fa con €5.000 di partenza, oggi €6.000 (cioe'
//     €1.000 risparmiati in 6 mesi = €167/mese):
//     vecchia stima -> €6.000 / 6 = €1.000/mese (sovrastima 6x).
//     Realta' -> €1.000 / 6 = €167/mese (formula corretta).
//
// La fix usa il saldo iniziale persistito su `SavingsGoal.initialAmount`
// (nuova colonna): il ritmo storico diventa
// `(currentAmount - initialAmount) / mesi_trascorsi`. I goal storici che
// non hanno il campo (legacy, default 0) mantengono il comportamento
// precedente per backward compatibility, ma i nuovi goal calcolano la
// pace correttamente.
import { differenceInMonths } from "date-fns";

/**
 * Soglia minima di mesi trascorsi (interi) prima di considerare il ritmo
 * storico statisticamente significativo. Un goal creato meno di un mese
 * fa NON ha ancora una pace misurabile: qualunque valore prodotto sarebbe
 * solo rumore amplificato (i.e. il bug originale clampava a 1 mese e
 * spalmava l'INTERO saldo come pace).
 */
const MIN_MONTHS_FOR_PACE = 1;

export interface CompletionGoalInput {
    targetAmount: number;
    currentAmount: number;
    /**
     * Saldo iniziale al momento della creazione del goal. Default 0 per
     * compatibilita' con i goal storici (preservare comportamento legacy).
     */
    initialAmount?: number;
    createdAt: string;
}

export interface SavingsGoalsCompletionResult {
    /** Numero di goal attivi (non completati) considerati nel calcolo. */
    activeGoals: number;
    /** Somma dei capitali ancora da risparmiare sui goal attivi. */
    totalRemaining: number;
    /**
     * Somma del ritmo storico mensile dei goal attivi
     * (`currentAmount / mesi_trascorsi_da_createdAt`, con minimo 1 mese).
     */
    aggregateMonthlyPace: number;
    /**
     * Mesi stimati al completamento di TUTTI i goal attivi mantenendo il
     * ritmo aggregato. `null` quando non e' calcolabile: nessun goal attivo,
     * ritmo aggregato zero, o nulla da risparmiare.
     */
    monthsToCompletion: number | null;
    /** Data stimata corrispondente. `null` se `monthsToCompletion` e' null. */
    estimatedCompletionDate: Date | null;
}

function sanitize(value: number, fallback = 0): number {
    return Number.isFinite(value) ? value : fallback;
}

/**
 * Tempo stimato per completare tutti gli obiettivi di risparmio attivi al
 * ritmo storico aggregato. Sanitizza input non finiti e clampa a >=0 i
 * valori monetari, ignora goal completati o con `targetAmount <= 0`.
 *
 * Il ritmo storico e' calcolato come `(currentAmount - initialAmount) /
 * mesi_trascorsi`: il saldo iniziale del goal NON viene contato come
 * "savings" (era il bug sovrastimante della versione precedente). Goal
 * con meno di {@link MIN_MONTHS_FOR_PACE} mesi di storico non
 * contribuiscono al ritmo aggregato (dati insufficienti). Se il saldo
 * corrente e' <= saldo iniziale (utente non ha ancora risparmiato o ha
 * prelevato), la pace di quel goal e' 0.
 */
export function computeSavingsGoalsCompletion(
    goals: CompletionGoalInput[],
    now: Date = new Date(),
): SavingsGoalsCompletionResult {
    let totalRemaining = 0;
    let aggregateMonthlyPace = 0;
    let activeGoals = 0;

    for (const raw of goals) {
        const target = Math.max(0, sanitize(raw.targetAmount));
        const current = Math.max(0, sanitize(raw.currentAmount));
        if (target <= 0 || current >= target) continue;

        activeGoals += 1;
        totalRemaining += target - current;

        const created = new Date(raw.createdAt);
        if (!Number.isFinite(created.getTime())) continue;

        const initial = Math.max(0, sanitize(raw.initialAmount ?? 0));
        const savedSinceCreation = Math.max(0, current - initial);
        const monthsElapsedRaw = differenceInMonths(now, created);
        if (!Number.isFinite(monthsElapsedRaw) || monthsElapsedRaw < MIN_MONTHS_FOR_PACE) continue;

        const historicalMonthly = savedSinceCreation / monthsElapsedRaw;
        if (Number.isFinite(historicalMonthly) && historicalMonthly > 0) {
            aggregateMonthlyPace += historicalMonthly;
        }
    }

    if (activeGoals === 0 || aggregateMonthlyPace <= 0 || totalRemaining <= 0) {
        return {
            activeGoals,
            totalRemaining,
            aggregateMonthlyPace,
            monthsToCompletion: null,
            estimatedCompletionDate: null,
        };
    }

    const monthsToCompletion = Math.ceil(totalRemaining / aggregateMonthlyPace);
    const estimatedCompletionDate = new Date(now);
    estimatedCompletionDate.setMonth(estimatedCompletionDate.getMonth() + monthsToCompletion);

    return {
        activeGoals,
        totalRemaining,
        aggregateMonthlyPace,
        monthsToCompletion,
        estimatedCompletionDate,
    };
}
