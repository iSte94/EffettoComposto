import { describe, it, expect } from "vitest";
import { computeFireSensitivity } from "./fire-sensitivity";

describe("computeFireSensitivity", () => {
    const baseInput = {
        startingCapital: 100_000,
        currentAge: 35,
        retirementAge: 65,
        monthlyExpensesBaseline: 2_500,
        monthlySavingsBaseline: 1_500,
        nominalReturnPct: 6,
        inflationPct: 2,
        withdrawalRatePct: 4,
    };

    it("produce una matrice coerente con le dimensioni degli assi", () => {
        const result = computeFireSensitivity(baseInput);
        expect(result.expensesAxis).toHaveLength(5);    // default delta
        expect(result.savingsAxis).toHaveLength(4);     // default multipliers
        expect(result.cells).toHaveLength(4);           // righe = savings
        for (const row of result.cells) {
            expect(row).toHaveLength(5);                // colonne = expenses
        }
    });

    it("identifica la baseline cell", () => {
        const result = computeFireSensitivity(baseInput);
        expect(result.baseline).not.toBeNull();
        expect(result.baseline!.isBaseline).toBe(true);
    });

    it("bestCase ha yearsToFire minimo e worstCase massimo", () => {
        const result = computeFireSensitivity(baseInput);
        expect(result.bestCase).not.toBeNull();
        expect(result.worstCase).not.toBeNull();
        expect(result.bestCase!.yearsToFire).not.toBeNull();
        expect(result.worstCase!.yearsToFire).not.toBeNull();
        expect(result.bestCase!.yearsToFire!).toBeLessThanOrEqual(result.worstCase!.yearsToFire!);
    });

    it("più risparmio → meno anni al FIRE (monotonicità per colonna)", () => {
        const result = computeFireSensitivity(baseInput);
        // Per la stessa colonna di spese, aumentando il risparmio gli anni al FIRE non aumentano.
        for (let col = 0; col < result.expensesAxis.length; col++) {
            const years: (number | null)[] = result.cells.map((row) => row[col].yearsToFire);
            const finite = years.filter((y): y is number => y != null);
            for (let i = 1; i < finite.length; i++) {
                expect(finite[i]).toBeLessThanOrEqual(finite[i - 1] + 0.01);
            }
        }
    });

    it("più spese → più anni al FIRE (monotonicità per riga)", () => {
        const result = computeFireSensitivity(baseInput);
        for (let row = 0; row < result.savingsAxis.length; row++) {
            const years: (number | null)[] = result.cells[row].map((c) => c.yearsToFire);
            const finite = years.filter((y): y is number => y != null);
            for (let i = 1; i < finite.length; i++) {
                expect(finite[i]).toBeGreaterThanOrEqual(finite[i - 1] - 0.01);
            }
        }
    });

    describe("BUG FIX: input SWR invalidi non devono corrompere la matrice", () => {
        it("withdrawalRatePct = 0: niente Infinity/NaN nelle celle", () => {
            // Prima del fix: `target = (e * 12) / (0 / 100) = Infinity` → tutte
            // le celle avevano target Infinity e yearsToFire = null.
            // Dopo il fix: lo SWR viene clampato a 0.1% minimo, producendo
            // target finiti ma molto grandi (scenario "non raggiungibile").
            const result = computeFireSensitivity({ ...baseInput, withdrawalRatePct: 0 });
            for (const row of result.cells) {
                for (const cell of row) {
                    expect(Number.isFinite(cell.fireTarget)).toBe(true);
                    expect(cell.fireTarget).toBeGreaterThan(0);
                }
            }
        });

        it("withdrawalRatePct negativo: niente target negativi (falso FIRE raggiunto)", () => {
            // Prima del fix: withdrawalRatePct = -5 produceva target negativi,
            // e `capital >= target` era SEMPRE vero, quindi TUTTE le celle
            // risultavano con yearsToFire = 0 (falso positivo catastrofico).
            // Dopo il fix: lo SWR viene clampato a 0.1% minimo.
            const result = computeFireSensitivity({ ...baseInput, withdrawalRatePct: -5 });
            for (const row of result.cells) {
                for (const cell of row) {
                    expect(cell.fireTarget).toBeGreaterThan(0);
                }
            }
            // Non tutte le celle possono essere "FIRE raggiunto" con capitale ridicolo
            // rispetto ai target giganti generati da SWR = 0.1%.
            const totalCells = result.cells.flat().length;
            const instantFire = result.cells.flat().filter((c) => c.yearsToFire === 0).length;
            expect(instantFire).toBeLessThan(totalCells);
        });

        it("withdrawalRatePct = NaN: fallback sicuro al minimo (niente propagazione NaN)", () => {
            const result = computeFireSensitivity({ ...baseInput, withdrawalRatePct: Number.NaN });
            for (const row of result.cells) {
                for (const cell of row) {
                    expect(Number.isFinite(cell.fireTarget)).toBe(true);
                    expect(cell.fireTarget).toBeGreaterThan(0);
                }
            }
        });

        it("withdrawalRatePct positivo minuscolo viene rispettato (no clamp spurio)", () => {
            // 0.5% è valido — il clamp deve scattare SOLO sotto la soglia 0.1%.
            const result = computeFireSensitivity({ ...baseInput, withdrawalRatePct: 0.5 });
            const baseline = result.baseline;
            expect(baseline).not.toBeNull();
            // Target atteso: 2500 * 12 / 0.005 = 6_000_000
            expect(baseline!.fireTarget).toBeCloseTo(6_000_000, -3);
        });
    });

    describe("BUG FIX: scenario iperinflattivo degenere non produce NaN", () => {
        it("inflazione altissima (rendimento reale <= -100%) non propaga NaN", () => {
            // Prima del fix: Math.pow(1 + realReturn, 1/12) con 1+realReturn <= 0
            // produceva NaN, contaminando tutto.
            const result = computeFireSensitivity({
                ...baseInput,
                nominalReturnPct: 0,
                inflationPct: 500,
                maxYears: 5,
            });
            for (const row of result.cells) {
                for (const cell of row) {
                    expect(Number.isFinite(cell.fireTarget)).toBe(true);
                    // yearsToFire può essere null (non raggiungibile) ma mai NaN.
                    if (cell.yearsToFire !== null) {
                        expect(Number.isFinite(cell.yearsToFire)).toBe(true);
                    }
                }
            }
        });
    });

    describe("input NaN/Infinity su dimensioni principali", () => {
        it("startingCapital NaN → trattato come 0", () => {
            const result = computeFireSensitivity({ ...baseInput, startingCapital: Number.NaN });
            expect(result.baseline).not.toBeNull();
            // Con capitale 0, ci vorranno più anni rispetto a 100k di capitale iniziale.
            const withZero = result.baseline!.yearsToFire;
            const withPositive = computeFireSensitivity(baseInput).baseline!.yearsToFire;
            if (withZero != null && withPositive != null) {
                expect(withZero).toBeGreaterThanOrEqual(withPositive);
            }
        });

        it("monthlyExpensesBaseline NaN → trattato come 0 (target degenere)", () => {
            const result = computeFireSensitivity({ ...baseInput, monthlyExpensesBaseline: Number.NaN });
            for (const row of result.cells) {
                for (const cell of row) {
                    expect(Number.isFinite(cell.fireTarget)).toBe(true);
                    expect(cell.fireTarget).toBeGreaterThanOrEqual(0);
                }
            }
        });

        it("monthlySavingsBaseline NaN → trattato come 0 (nessun risparmio)", () => {
            const result = computeFireSensitivity({ ...baseInput, monthlySavingsBaseline: Number.NaN });
            // Senza risparmio, il FIRE è ancora possibile se il capitale iniziale
            // supera già il target oppure se il rendimento reale basta; altrimenti
            // la cella sarà yearsToFire = null. In ogni caso nessun NaN.
            for (const row of result.cells) {
                for (const cell of row) {
                    if (cell.yearsToFire !== null) {
                        expect(Number.isFinite(cell.yearsToFire)).toBe(true);
                    }
                }
            }
        });

        it("maxYears NaN → usa default 60 (fallback finito)", () => {
            const result = computeFireSensitivity({ ...baseInput, maxYears: Number.NaN });
            expect(result.baseline).not.toBeNull();
        });
    });

    describe("regressione formula baseline target", () => {
        it("baselineTarget = monthlyExpensesBaseline * 12 / (swr/100)", () => {
            const result = computeFireSensitivity(baseInput);
            // 2500 * 12 / 0.04 = 750000
            expect(result.baseline!.fireTarget).toBe(750_000);
        });

        it("fireAge = currentAge + yearsToFire per celle raggiungibili", () => {
            const result = computeFireSensitivity(baseInput);
            for (const row of result.cells) {
                for (const cell of row) {
                    if (cell.yearsToFire != null && cell.fireAge != null) {
                        expect(cell.fireAge).toBeCloseTo(baseInput.currentAge + cell.yearsToFire, 6);
                    }
                }
            }
        });
    });

    describe("delta vs baseline", () => {
        it("baseline cell ha vsBaselineYears = 0", () => {
            const result = computeFireSensitivity(baseInput);
            expect(result.baseline!.vsBaselineYears).toBeCloseTo(0, 6);
        });

        it("riducendo spese sotto la baseline si anticipa il FIRE (delta negativo)", () => {
            const result = computeFireSensitivity(baseInput);
            const baseline = result.baseline!;
            // Trova una cella con stesso savings ma spese minori della baseline.
            const savingsRow = result.cells.find((row) => row.some((c) => c.savingsMonthly === baseline.savingsMonthly));
            expect(savingsRow).toBeDefined();
            const cheaperExpenses = savingsRow!.find((c) => c.expensesMonthly < baseline.expensesMonthly);
            if (cheaperExpenses && cheaperExpenses.vsBaselineYears != null) {
                expect(cheaperExpenses.vsBaselineYears).toBeLessThanOrEqual(0);
            }
        });
    });
});
