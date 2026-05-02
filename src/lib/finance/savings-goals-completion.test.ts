import { describe, it, expect } from "vitest";
import { computeSavingsGoalsCompletion } from "./savings-goals-completion";

const NOW = new Date("2026-04-30T12:00:00Z");

describe("computeSavingsGoalsCompletion", () => {
    it("returns null monthsToCompletion when no goals", () => {
        const r = computeSavingsGoalsCompletion([], NOW);
        expect(r.activeGoals).toBe(0);
        expect(r.totalRemaining).toBe(0);
        expect(r.aggregateMonthlyPace).toBe(0);
        expect(r.monthsToCompletion).toBe(null);
        expect(r.estimatedCompletionDate).toBe(null);
    });

    it("ignores completed goals (currentAmount >= targetAmount)", () => {
        const r = computeSavingsGoalsCompletion(
            [{ targetAmount: 1000, currentAmount: 1000, createdAt: "2026-01-30" }],
            NOW,
        );
        expect(r.activeGoals).toBe(0);
        expect(r.totalRemaining).toBe(0);
        expect(r.monthsToCompletion).toBe(null);
    });

    it("ignores goals with non-positive target", () => {
        const r = computeSavingsGoalsCompletion(
            [
                { targetAmount: 0, currentAmount: 100, createdAt: "2026-01-30" },
                { targetAmount: -100, currentAmount: 0, createdAt: "2026-01-30" },
            ],
            NOW,
        );
        expect(r.activeGoals).toBe(0);
        expect(r.monthsToCompletion).toBe(null);
    });

    it("computes time-to-complete for a single goal from historical pace", () => {
        // creato 4 mesi fa con saldo iniziale 0, risparmiati 400/1000 -> ritmo 100/mese, manca 600 -> 6 mesi
        const r = computeSavingsGoalsCompletion(
            [{ targetAmount: 1000, currentAmount: 400, initialAmount: 0, createdAt: "2025-12-30" }],
            NOW,
        );
        expect(r.activeGoals).toBe(1);
        expect(r.totalRemaining).toBe(600);
        expect(r.aggregateMonthlyPace).toBeCloseTo(100, 4);
        expect(r.monthsToCompletion).toBe(6);
    });

    it("aggregates remaining and pace across multiple active goals", () => {
        // A: 4 mesi fa, init=0, 400/1000 -> 100/mese, manca 600
        // B: 2 mesi fa, init=0, 200/500  -> 100/mese, manca 300
        // pace=200/mese, remaining=900 -> ceil(4.5)=5
        const r = computeSavingsGoalsCompletion(
            [
                { targetAmount: 1000, currentAmount: 400, initialAmount: 0, createdAt: "2025-12-30" },
                { targetAmount: 500, currentAmount: 200, initialAmount: 0, createdAt: "2026-02-28" },
            ],
            NOW,
        );
        expect(r.activeGoals).toBe(2);
        expect(r.totalRemaining).toBe(900);
        expect(r.aggregateMonthlyPace).toBeCloseTo(200, 4);
        expect(r.monthsToCompletion).toBe(5);
    });

    it("returns null when aggregate pace is zero (no savings yet)", () => {
        const r = computeSavingsGoalsCompletion(
            [{ targetAmount: 1000, currentAmount: 0, createdAt: "2026-01-30" }],
            NOW,
        );
        expect(r.activeGoals).toBe(1);
        expect(r.totalRemaining).toBe(1000);
        expect(r.aggregateMonthlyPace).toBe(0);
        expect(r.monthsToCompletion).toBe(null);
        expect(r.estimatedCompletionDate).toBe(null);
    });

    it("non produce pace per goal con meno di 1 mese di storico (BUG FIX)", () => {
        // Goal creato oggi: NON c'e' pace storica misurabile. Il bug fix
        // sostituisce il vecchio comportamento (clamp a 1 mese -> pace fittizia
        // pari all'INTERO saldo iniziale) con il piu' onesto "dati insufficienti".
        const r = computeSavingsGoalsCompletion(
            [{ targetAmount: 1000, currentAmount: 500, initialAmount: 500, createdAt: "2026-04-30" }],
            NOW,
        );
        expect(r.activeGoals).toBe(1);
        expect(r.totalRemaining).toBe(500);
        expect(r.aggregateMonthlyPace).toBe(0);
        expect(r.monthsToCompletion).toBe(null);
    });

    it("non conta il saldo iniziale come savings (BUG FIX core)", () => {
        // Goal creato 6 mesi fa con €5.000 di partenza, oggi €6.000:
        //   - savings effettivi = 6.000 - 5.000 = 1.000 in 6 mesi -> €167/mese
        //   - bug originale: 6.000 / 6 = 1.000/mese (sovrastima 6x)
        // Manca 4.000 -> ceil(4.000 / 166.67) = 24 mesi al ritmo CORRETTO,
        // mentre il bug avrebbe stimato ceil(4.000 / 1.000) = 4 mesi.
        const r = computeSavingsGoalsCompletion(
            [{ targetAmount: 10000, currentAmount: 6000, initialAmount: 5000, createdAt: "2025-10-30" }],
            NOW,
        );
        expect(r.activeGoals).toBe(1);
        expect(r.totalRemaining).toBe(4000);
        // 1.000 risparmiati in 6 mesi -> ~166.67/mese.
        expect(r.aggregateMonthlyPace).toBeCloseTo(1000 / 6, 2);
        // ceil(4.000 / 166.67) = 24 mesi.
        expect(r.monthsToCompletion).toBe(24);
    });

    it("currentAmount <= initialAmount produce pace zero (utente non ha risparmiato o ha prelevato)", () => {
        // Goal creato 4 mesi fa con €5.000 di partenza, oggi €4.500 (prelievo
        // di €500). Pace storica = 0 (nessun nuovo risparmio sul goal).
        const r = computeSavingsGoalsCompletion(
            [{ targetAmount: 10000, currentAmount: 4500, initialAmount: 5000, createdAt: "2025-12-30" }],
            NOW,
        );
        expect(r.activeGoals).toBe(1);
        expect(r.totalRemaining).toBe(5500);
        expect(r.aggregateMonthlyPace).toBe(0);
        expect(r.monthsToCompletion).toBe(null);
    });

    it("backward compatibility: initialAmount mancante (legacy) cade su comportamento precedente", () => {
        // Senza initialAmount esplicito, default 0: pace = currentAmount / mesi.
        // Goal legacy: 4 mesi fa, 400/1000 -> 100/mese.
        const r = computeSavingsGoalsCompletion(
            [{ targetAmount: 1000, currentAmount: 400, createdAt: "2025-12-30" }],
            NOW,
        );
        expect(r.activeGoals).toBe(1);
        expect(r.aggregateMonthlyPace).toBeCloseTo(100, 4);
        expect(r.monthsToCompletion).toBe(6);
    });

    it("sanitizes NaN/Infinity in monetary inputs without propagating", () => {
        const r = computeSavingsGoalsCompletion(
            [
                // target NaN -> sanitized a 0 -> ignorato
                { targetAmount: NaN, currentAmount: 100, createdAt: "2026-01-30" },
                // current Infinity -> sanitized a 0 -> attivo ma pace=0
                { targetAmount: 1000, currentAmount: Infinity, createdAt: "2026-01-30" },
            ],
            NOW,
        );
        expect(r.activeGoals).toBe(1);
        expect(r.totalRemaining).toBe(1000);
        expect(r.aggregateMonthlyPace).toBe(0);
        expect(r.monthsToCompletion).toBe(null);
        expect(Number.isFinite(r.totalRemaining)).toBe(true);
        expect(Number.isFinite(r.aggregateMonthlyPace)).toBe(true);
    });

    it("sanitizes NaN/Infinity in initialAmount", () => {
        // initialAmount NaN -> sanitized a 0 (legacy fallback): pace = current/mesi.
        const r = computeSavingsGoalsCompletion(
            [{ targetAmount: 1000, currentAmount: 400, initialAmount: NaN, createdAt: "2025-12-30" }],
            NOW,
        );
        expect(r.aggregateMonthlyPace).toBeCloseTo(100, 4);
        expect(r.monthsToCompletion).toBe(6);
    });

    it("estimatedCompletionDate equals now + monthsToCompletion months", () => {
        const r = computeSavingsGoalsCompletion(
            [{ targetAmount: 1000, currentAmount: 400, initialAmount: 0, createdAt: "2025-12-30" }],
            NOW,
        );
        const expected = new Date(NOW);
        expected.setMonth(expected.getMonth() + 6);
        expect(r.estimatedCompletionDate?.toISOString()).toBe(expected.toISOString());
    });

    it("ignores invalid createdAt (counts goal but does not contribute to pace)", () => {
        const r = computeSavingsGoalsCompletion(
            [{ targetAmount: 1000, currentAmount: 400, createdAt: "not-a-date" }],
            NOW,
        );
        expect(r.activeGoals).toBe(1);
        expect(r.totalRemaining).toBe(600);
        expect(r.aggregateMonthlyPace).toBe(0);
        expect(r.monthsToCompletion).toBe(null);
    });

    it("mixed completed + active goals: only active contribute to remaining/pace", () => {
        const r = computeSavingsGoalsCompletion(
            [
                // completato: ignorato
                { targetAmount: 500, currentAmount: 500, initialAmount: 0, createdAt: "2025-10-30" },
                // attivo: 4 mesi fa, init 0, 400/1000 -> 100/mo, manca 600
                { targetAmount: 1000, currentAmount: 400, initialAmount: 0, createdAt: "2025-12-30" },
            ],
            NOW,
        );
        expect(r.activeGoals).toBe(1);
        expect(r.totalRemaining).toBe(600);
        expect(r.aggregateMonthlyPace).toBeCloseTo(100, 4);
        expect(r.monthsToCompletion).toBe(6);
    });
});
