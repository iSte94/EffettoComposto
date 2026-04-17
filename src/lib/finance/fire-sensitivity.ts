/**
 * Matrice di sensitività FIRE
 *
 * Calcola gli anni necessari per raggiungere FIRE al variare di due dimensioni:
 * - spese mensili attese (pensione)
 * - risparmio mensile
 *
 * Ritorna una griglia annotata con il numero di anni per ogni combinazione
 * più i dati di riferimento (baseline) per colorazione relativa.
 */

import { computeRealReturn } from "./fire-projection";

export interface FireSensitivityInput {
    startingCapital: number;
    currentAge: number;
    retirementAge: number;         // Upper bound — oltre questa età non fa senso simulare
    monthlyExpensesBaseline: number;
    monthlySavingsBaseline: number;
    nominalReturnPct: number;
    inflationPct: number;
    withdrawalRatePct: number;
    expenseDeltas?: number[];      // Moltiplicatori per spese (es. [0.7, 0.85, 1, 1.15, 1.3])
    savingsMultipliers?: number[]; // Moltiplicatori per risparmio (es. [0.5, 1, 1.5, 2])
    maxYears?: number;
}

export interface SensitivityCell {
    expensesMonthly: number;
    savingsMonthly: number;
    yearsToFire: number | null;       // null = non raggiungibile entro maxYears
    fireAge: number | null;
    fireTarget: number;
    vsBaselineYears: number | null;   // delta anni vs baseline (negativo = anticipa)
    isBaseline: boolean;
}

export interface FireSensitivityResult {
    cells: SensitivityCell[][];       // [rowIdx=savings][colIdx=expenses]
    expensesAxis: number[];
    savingsAxis: number[];
    baseline: SensitivityCell | null;
    bestCase: SensitivityCell | null;
    worstCase: SensitivityCell | null;
}

const DEFAULT_EXPENSE_DELTAS = [0.7, 0.85, 1, 1.15, 1.3];
const DEFAULT_SAVINGS_MULT = [0.5, 1, 1.5, 2];

function roundTo50(x: number): number {
    return Math.round(x / 50) * 50;
}

/** Calcola gli anni per raggiungere `target` partendo da `capital`, con `monthlySavings` e rendimento reale annuale `realReturn`. */
function yearsToFire(capital: number, target: number, monthlySavings: number, realReturn: number, maxYears: number): number | null {
    if (capital >= target) return 0;
    if (target <= 0) return 0;
    const monthlyReturn = Math.pow(1 + realReturn, 1 / 12) - 1;
    let c = capital;
    for (let m = 1; m <= maxYears * 12; m++) {
        c = c * (1 + monthlyReturn) + monthlySavings;
        if (c >= target) return m / 12;
    }
    return null;
}

export function computeFireSensitivity(input: FireSensitivityInput): FireSensitivityResult {
    const {
        startingCapital,
        currentAge,
        monthlyExpensesBaseline,
        monthlySavingsBaseline,
        nominalReturnPct,
        inflationPct,
        withdrawalRatePct,
        expenseDeltas = DEFAULT_EXPENSE_DELTAS,
        savingsMultipliers = DEFAULT_SAVINGS_MULT,
        maxYears = 60,
    } = input;

    const realReturn = computeRealReturn(nominalReturnPct, inflationPct);

    const expensesAxis = expenseDeltas.map((d) => roundTo50(monthlyExpensesBaseline * d));
    const savingsAxis = savingsMultipliers.map((m) => roundTo50(monthlySavingsBaseline * m));

    // First pass: compute baseline cell
    const baselineExpenses = expensesAxis.reduce((best, e) =>
        Math.abs(e - monthlyExpensesBaseline) < Math.abs(best - monthlyExpensesBaseline) ? e : best,
        expensesAxis[0]
    );
    const baselineSavings = savingsAxis.reduce((best, s) =>
        Math.abs(s - monthlySavingsBaseline) < Math.abs(best - monthlySavingsBaseline) ? s : best,
        savingsAxis[0]
    );

    const baselineTarget = (monthlyExpensesBaseline * 12) / (withdrawalRatePct / 100);
    const baselineYears = yearsToFire(startingCapital, baselineTarget, monthlySavingsBaseline, realReturn, maxYears);

    const cells: SensitivityCell[][] = savingsAxis.map((s) =>
        expensesAxis.map((e) => {
            const target = (e * 12) / (withdrawalRatePct / 100);
            const y = yearsToFire(startingCapital, target, s, realReturn, maxYears);
            const isBaseline = e === baselineExpenses && s === baselineSavings;
            return {
                expensesMonthly: e,
                savingsMonthly: s,
                yearsToFire: y,
                fireAge: y != null ? currentAge + y : null,
                fireTarget: target,
                vsBaselineYears: y != null && baselineYears != null ? y - baselineYears : null,
                isBaseline,
            };
        })
    );

    const baselineCell = cells.flat().find((c) => c.isBaseline) ?? null;

    let bestCase: SensitivityCell | null = null;
    let worstCase: SensitivityCell | null = null;
    for (const row of cells) {
        for (const c of row) {
            if (c.yearsToFire == null) continue;
            if (!bestCase || c.yearsToFire < bestCase.yearsToFire!) bestCase = c;
            if (!worstCase || c.yearsToFire > worstCase.yearsToFire!) worstCase = c;
        }
    }

    return {
        cells,
        expensesAxis,
        savingsAxis,
        baseline: baselineCell,
        bestCase,
        worstCase,
    };
}
