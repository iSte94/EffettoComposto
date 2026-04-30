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
import { differenceInMonths } from "date-fns";

export interface CompletionGoalInput {
    targetAmount: number;
    currentAmount: number;
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
 * valori monetari, ignora goal completati o con `targetAmount <= 0`, e
 * usa un minimo di 1 mese come "tempo trascorso" per evitare divisioni
 * per zero quando un goal e' stato creato da poco.
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

        const monthsElapsed = Math.max(1, differenceInMonths(now, created));
        const historicalMonthly = current / monthsElapsed;
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
