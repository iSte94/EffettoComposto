/**
 * Matrice di sensitività FIRE
 *
 * Calcola gli anni necessari per raggiungere FIRE al variare di due dimensioni:
 * - spese mensili attese (pensione)
 * - risparmio mensile
 *
 * Ritorna una griglia annotata con il numero di anni per ogni combinazione
 * più i dati di riferimento (baseline) per colorazione relativa.
 *
 * Robustezza numerica (BUG FIX v1.4.2):
 *   - Il withdrawalRatePct viene clampato con la stessa soglia minima
 *     (0.1%) usata da `fire-projection.ts`. Prima del fix uno SWR = 0
 *     produceva `fireTarget = Infinity` e l'intera matrice diventava null;
 *     uno SWR negativo produceva target negativi e ogni cella risultava
 *     istantaneamente "già FIRE" (falso positivo catastrofico).
 *   - Il rendimento reale <= -100% (scenario iperinflattivo degenere)
 *     producevamo `Math.pow(negativo, 1/12) = NaN` che silenziosamente
 *     contaminava l'intera serie. Ora c'è un fallback sicuro che tratta
 *     lo scenario come "capitale a zero ogni mese".
 *   - Input NaN/Infinity su età, spese, risparmio o capitale vengono
 *     normalizzati a valori finiti invece di propagare.
 */

import { computeRealReturn } from "./fire-projection";

// Soglia minima di SWR per evitare divisioni per zero / target infiniti.
// Coerente con `fire-projection.ts` (UNICA fonte di verità del progetto).
const MIN_WITHDRAWAL_RATE_PCT = 0.1;

function sanitizeFinite(value: number, fallback = 0): number {
    return Number.isFinite(value) ? value : fallback;
}

function sanitizeNonNegative(value: number, fallback = 0): number {
    const finite = sanitizeFinite(value, fallback);
    return finite < 0 ? 0 : finite;
}

function clampWithdrawalRatePct(withdrawalRatePct: number): number {
    const finite = sanitizeFinite(withdrawalRatePct, MIN_WITHDRAWAL_RATE_PCT);
    return Math.max(MIN_WITHDRAWAL_RATE_PCT, finite);
}

function computeFireTargetFromMonthlyExpenses(monthlyExpenses: number, withdrawalRatePct: number): number {
    const annualExpenses = Math.max(0, monthlyExpenses) * 12;
    const swr = clampWithdrawalRatePct(withdrawalRatePct) / 100;
    return annualExpenses / swr;
}

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
    const safeCapital = sanitizeNonNegative(capital);
    const safeTarget = sanitizeFinite(target, 0);
    const safeSavings = sanitizeFinite(monthlySavings, 0);
    const safeMaxYears = Math.max(0, Math.floor(sanitizeFinite(maxYears, 0)));

    if (safeTarget <= 0) return 0;
    if (safeCapital >= safeTarget) return 0;
    if (safeMaxYears === 0) return null;

    // Guard: realReturn <= -100% renderebbe Math.pow(<=0, 1/12) = NaN silenzioso,
    // contaminando tutte le celle della matrice. In quello scenario estremo il
    // capitale viene azzerato ogni mese (monthlyReturn = -1) e si cresce solo
    // per i contributi.
    const monthlyReturn = 1 + realReturn > 0 ? Math.pow(1 + realReturn, 1 / 12) - 1 : -1;

    let c = safeCapital;
    for (let m = 1; m <= safeMaxYears * 12; m++) {
        c = c * (1 + monthlyReturn) + safeSavings;
        if (!Number.isFinite(c)) return null;
        if (c >= safeTarget) return m / 12;
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

    // Normalizzazione input: NaN/Infinity → fallback finiti per evitare
    // di propagare valori non validi nelle celle della matrice.
    const safeStartingCapital = sanitizeNonNegative(startingCapital);
    const safeCurrentAge = sanitizeFinite(currentAge, 0);
    const safeMonthlyExpensesBaseline = sanitizeNonNegative(monthlyExpensesBaseline);
    const safeMonthlySavingsBaseline = sanitizeNonNegative(monthlySavingsBaseline);
    const safeMaxYears = Math.max(0, Math.floor(sanitizeFinite(maxYears, 60)));
    const safeWithdrawalRatePct = clampWithdrawalRatePct(withdrawalRatePct);

    const realReturn = computeRealReturn(nominalReturnPct, inflationPct);

    const expensesAxis = expenseDeltas.map((d) => roundTo50(safeMonthlyExpensesBaseline * sanitizeFinite(d, 0)));
    const savingsAxis = savingsMultipliers.map((m) => roundTo50(safeMonthlySavingsBaseline * sanitizeFinite(m, 0)));

    // First pass: compute baseline cell
    const baselineExpenses = expensesAxis.reduce((best, e) =>
        Math.abs(e - safeMonthlyExpensesBaseline) < Math.abs(best - safeMonthlyExpensesBaseline) ? e : best,
        expensesAxis[0]
    );
    const baselineSavings = savingsAxis.reduce((best, s) =>
        Math.abs(s - safeMonthlySavingsBaseline) < Math.abs(best - safeMonthlySavingsBaseline) ? s : best,
        savingsAxis[0]
    );

    const baselineTarget = computeFireTargetFromMonthlyExpenses(safeMonthlyExpensesBaseline, safeWithdrawalRatePct);
    const baselineYears = yearsToFire(safeStartingCapital, baselineTarget, safeMonthlySavingsBaseline, realReturn, safeMaxYears);

    const cells: SensitivityCell[][] = savingsAxis.map((s) =>
        expensesAxis.map((e) => {
            const target = computeFireTargetFromMonthlyExpenses(e, safeWithdrawalRatePct);
            const y = yearsToFire(safeStartingCapital, target, s, realReturn, safeMaxYears);
            const isBaseline = e === baselineExpenses && s === baselineSavings;
            return {
                expensesMonthly: e,
                savingsMonthly: s,
                yearsToFire: y,
                fireAge: y != null ? safeCurrentAge + y : null,
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
