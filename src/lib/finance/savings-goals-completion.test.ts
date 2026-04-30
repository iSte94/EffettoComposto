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
        // creato 4 mesi fa, risparmiati 400/1000 -> ritmo 100/mese, manca 600 -> 6 mesi
        const r = computeSavingsGoalsCompletion(
            [{ targetAmount: 1000, currentAmount: 400, createdAt: "2025-12-30" }],
            NOW,
        );
        expect(r.activeGoals).toBe(1);
        expect(r.totalRemaining).toBe(600);
        expect(r.aggregateMonthlyPace).toBeCloseTo(100, 4);
        expect(r.monthsToCompletion).toBe(6);
    });

    it("aggregates remaining and pace across multiple active goals", () => {
        // A: 4 mesi fa, 400/1000 -> 100/mese, manca 600
        // B: 2 mesi fa, 200/500  -> 100/mese, manca 300
        // pace=200/mese, remaining=900 -> ceil(4.5)=5
        const r = computeSavingsGoalsCompletion(
            [
                { targetAmount: 1000, currentAmount: 400, createdAt: "2025-12-30" },
                { targetAmount: 500, currentAmount: 200, createdAt: "2026-02-28" },
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

    it("clamps elapsed months to a minimum of 1 (avoids division by zero)", () => {
        // creato oggi: monthsElapsed forzato a 1 -> pace=500
        const r = computeSavingsGoalsCompletion(
            [{ targetAmount: 1000, currentAmount: 500, createdAt: "2026-04-30" }],
            NOW,
        );
        expect(r.aggregateMonthlyPace).toBeCloseTo(500, 4);
        expect(r.monthsToCompletion).toBe(1); // ceil(500/500)=1
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

    it("estimatedCompletionDate equals now + monthsToCompletion months", () => {
        const r = computeSavingsGoalsCompletion(
            [{ targetAmount: 1000, currentAmount: 400, createdAt: "2025-12-30" }],
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
                { targetAmount: 500, currentAmount: 500, createdAt: "2025-10-30" },
                // attivo: 4 mesi fa, 400/1000 -> 100/mo, manca 600
                { targetAmount: 1000, currentAmount: 400, createdAt: "2025-12-30" },
            ],
            NOW,
        );
        expect(r.activeGoals).toBe(1);
        expect(r.totalRemaining).toBe(600);
        expect(r.aggregateMonthlyPace).toBeCloseTo(100, 4);
        expect(r.monthsToCompletion).toBe(6);
    });
});
