import { loanCalculatorSavedScenarioSchema } from "@/lib/validations/loan-calculator-workspace";
import type {
    LoanCalculatorSavedScenario,
    LoanCalculatorSavedScenarioInput,
} from "@/types";

function safeParseJson<T>(raw: unknown): T[] {
    if (typeof raw !== "string" || raw.trim() === "") return [];

    try {
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? parsed as T[] : [];
    } catch {
        return [];
    }
}

function sortScenarios(scenarios: LoanCalculatorSavedScenario[]): LoanCalculatorSavedScenario[] {
    return [...scenarios].sort((a, b) => (
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ));
}

function createSavedScenarioId() {
    return `loan-scenario-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function parseLoanCalculatorSavedScenarios(raw: unknown): LoanCalculatorSavedScenario[] {
    const parsed = loanCalculatorSavedScenarioSchema.array().safeParse(safeParseJson<unknown>(raw));
    if (!parsed.success) return [];

    return sortScenarios(parsed.data.map((scenario) => ({
        ...scenario,
        selectedExistingLoanId: scenario.selectedExistingLoanId ?? null,
    })));
}

interface UpsertLoanCalculatorScenarioOptions {
    now?: string;
    scenarioId?: string;
}

export function upsertLoanCalculatorScenario(
    scenarios: LoanCalculatorSavedScenario[],
    input: LoanCalculatorSavedScenarioInput,
    options: UpsertLoanCalculatorScenarioOptions = {},
): { scenario: LoanCalculatorSavedScenario; scenarios: LoanCalculatorSavedScenario[] } {
    const now = options.now ?? new Date().toISOString();
    const existing = options.scenarioId
        ? scenarios.find((scenario) => scenario.id === options.scenarioId)
        : undefined;

    const scenario: LoanCalculatorSavedScenario = {
        id: existing?.id ?? createSavedScenarioId(),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        name: input.name.trim(),
        simulations: input.simulations,
        intestatario: input.intestatario,
        enableDebtReductionSimulation: input.enableDebtReductionSimulation,
        selectedExistingLoanId: input.selectedExistingLoanId ?? null,
        selectedPrepaymentAmount: input.selectedPrepaymentAmount,
    };

    const nextScenarios = sortScenarios([
        scenario,
        ...scenarios.filter((current) => current.id !== scenario.id),
    ]);

    return {
        scenario,
        scenarios: nextScenarios,
    };
}

export function removeLoanCalculatorScenario(
    scenarios: LoanCalculatorSavedScenario[],
    scenarioId: string,
): LoanCalculatorSavedScenario[] {
    return sortScenarios(scenarios.filter((scenario) => scenario.id !== scenarioId));
}
