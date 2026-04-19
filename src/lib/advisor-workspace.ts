import { formatEuro } from "@/lib/format";
import {
    advisorReminderSchema,
    advisorSavedScenarioSchema,
} from "@/lib/validations/advisor-workspace";
import type {
    AcceptedPurchase,
    AdvisorReminder,
    AdvisorSavedScenario,
    AdvisorSavedScenarioInput,
    PurchaseCategory,
    PurchaseSimulation,
} from "@/types";

const LEGACY_CATEGORY_DEFAULTS: Record<PurchaseCategory, PurchaseSimulation> = {
    auto: {
        category: "auto",
        itemName: "",
        totalPrice: 25000,
        downPayment: 5000,
        financingRate: 5.5,
        financingYears: 5,
        isFinanced: true,
        annualInsurance: 800,
        annualMaintenance: 500,
        monthlyFuel: 150,
        depreciationRate: 20,
        monthlyRent: 0,
        condominiumFees: 100,
        imuTax: 200,
        usefulLifeYears: 10,
    },
    immobile: {
        category: "immobile",
        itemName: "",
        totalPrice: 300000,
        downPayment: 60000,
        financingRate: 3.5,
        financingYears: 25,
        isFinanced: true,
        annualInsurance: 0,
        annualMaintenance: 0,
        monthlyFuel: 0,
        depreciationRate: 0,
        monthlyRent: 1200,
        condominiumFees: 120,
        imuTax: 0,
        usefulLifeYears: 30,
    },
    arredamento: {
        category: "arredamento",
        itemName: "",
        totalPrice: 10000,
        downPayment: 2000,
        financingRate: 4.5,
        financingYears: 3,
        isFinanced: false,
        annualInsurance: 0,
        annualMaintenance: 0,
        monthlyFuel: 0,
        depreciationRate: 15,
        monthlyRent: 0,
        condominiumFees: 0,
        imuTax: 0,
        usefulLifeYears: 12,
    },
    altro: {
        category: "altro",
        itemName: "",
        totalPrice: 5000,
        downPayment: 1000,
        financingRate: 5,
        financingYears: 2,
        isFinanced: false,
        annualInsurance: 0,
        annualMaintenance: 0,
        monthlyFuel: 0,
        depreciationRate: 0,
        monthlyRent: 0,
        condominiumFees: 0,
        imuTax: 0,
        usefulLifeYears: 8,
    },
};

const CATEGORY_LABELS: Record<PurchaseCategory, string> = {
    auto: "Automobile",
    immobile: "Immobile",
    arredamento: "Arredamento",
    altro: "Altra spesa",
};

function safeParseJson<T>(raw: unknown): T[] {
    if (typeof raw !== "string" || raw.trim() === "") return [];

    try {
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? parsed as T[] : [];
    } catch {
        return [];
    }
}

function normalizeLabel(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function formatFingerprintNumber(value: number): string {
    return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

export function getAdvisorScenarioName(simulation: PurchaseSimulation): string {
    return simulation.itemName.trim() || CATEGORY_LABELS[simulation.category];
}

export function buildAdvisorScenarioFingerprint(simulation: PurchaseSimulation): string {
    return [
        simulation.category,
        normalizeLabel(getAdvisorScenarioName(simulation)),
        formatFingerprintNumber(simulation.totalPrice),
        formatFingerprintNumber(simulation.downPayment),
        simulation.isFinanced ? "financed" : "cash",
        formatFingerprintNumber(simulation.financingRate),
        formatFingerprintNumber(simulation.financingYears),
    ].join("|");
}

export function formatAdvisorFireDelay(delay: number | null): string {
    if (delay == null) return "n.d.";
    if (!Number.isFinite(delay)) return delay > 0 ? "non raggiungibile" : "gia' coperto";
    if (Math.abs(delay) < 1) return "impatto minimo";

    const rounded = Math.round(delay);
    const absolute = Math.abs(rounded);
    const years = Math.floor(absolute / 12);
    const months = absolute % 12;
    const parts = [
        years > 0 ? `${years}a` : null,
        months > 0 ? `${months}m` : null,
    ].filter(Boolean);

    return `${rounded > 0 ? "+" : "-"}${parts.join(" ")}`;
}

export function getAdvisorScoreLabel(score: number): string {
    if (score >= 70) return "Solido";
    if (score >= 40) return "Da valutare";
    return "Fragile";
}

function sortScenarios(scenarios: AdvisorSavedScenario[]): AdvisorSavedScenario[] {
    return [...scenarios].sort((a, b) => (
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ));
}

function sortReminders(reminders: AdvisorReminder[]): AdvisorReminder[] {
    return [...reminders].sort((a, b) => (
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    ));
}

function buildLegacySimulation(purchase: AcceptedPurchase): PurchaseSimulation {
    const fallback = LEGACY_CATEGORY_DEFAULTS[purchase.category] ?? LEGACY_CATEGORY_DEFAULTS.altro;
    return {
        ...fallback,
        category: purchase.category,
        itemName: purchase.itemName,
        totalPrice: purchase.totalPrice,
        downPayment: purchase.downPayment,
        financingRate: purchase.financingRate,
        financingYears: purchase.financingYears,
        isFinanced: purchase.isFinanced,
    };
}

export function mapLegacyAcceptedPurchaseToScenario(purchase: AcceptedPurchase): AdvisorSavedScenario {
    const simulation = buildLegacySimulation(purchase);
    const savedAt = purchase.acceptedAt || new Date().toISOString();

    return {
        id: purchase.id,
        fingerprint: buildAdvisorScenarioFingerprint(simulation),
        createdAt: savedAt,
        updatedAt: savedAt,
        simulation,
        summary: {
            overallScore: 0,
            monthlyPayment: purchase.monthlyPayment,
            totalInterest: purchase.totalInterest,
            totalTCO: purchase.totalTCO,
            cashOutlay: purchase.isFinanced ? purchase.downPayment : purchase.totalPrice,
            liquidityAfter: 0,
            emergencyMonthsLeft: 0,
            fireDelayMonthsValue: null,
            tcoYears: Math.max(1, purchase.financingYears || 1),
        },
        note: "Scenario importato dal vecchio flusso legacy.",
        isShortlisted: false,
        linkedGoalId: null,
    };
}

export function parseAdvisorSavedScenarios(rawSaved: unknown, rawLegacy?: unknown): AdvisorSavedScenario[] {
    const parsedSaved = advisorSavedScenarioSchema.array().safeParse(safeParseJson<unknown>(rawSaved));
    if (parsedSaved.success && parsedSaved.data.length > 0) {
        return sortScenarios(parsedSaved.data);
    }

    const legacy = safeParseJson<AcceptedPurchase>(rawLegacy);
    if (legacy.length === 0) return [];

    return sortScenarios(legacy.map(mapLegacyAcceptedPurchaseToScenario));
}

export function parseAdvisorReminders(raw: unknown): AdvisorReminder[] {
    const parsed = advisorReminderSchema.array().safeParse(safeParseJson<unknown>(raw));
    return parsed.success
        ? sortReminders(parsed.data.map((reminder) => ({
            ...reminder,
            reminderAt: reminder.reminderAt ?? null,
            targetEmergencyMonths: reminder.targetEmergencyMonths ?? null,
            note: reminder.note ?? null,
        })))
        : [];
}

interface UpsertScenarioOptions {
    now?: string;
    desiredShortlist?: boolean;
    linkedGoalId?: string | null;
}

export function upsertAdvisorScenario(
    scenarios: AdvisorSavedScenario[],
    input: AdvisorSavedScenarioInput,
    options: UpsertScenarioOptions = {},
): { scenario: AdvisorSavedScenario; scenarios: AdvisorSavedScenario[] } {
    const now = options.now ?? new Date().toISOString();
    const fingerprint = buildAdvisorScenarioFingerprint(input.simulation);
    const existing = scenarios.find((scenario) => scenario.fingerprint === fingerprint);

    const nextScenario: AdvisorSavedScenario = {
        id: existing?.id ?? `advisor-scenario-${crypto.randomUUID()}`,
        fingerprint,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        simulation: input.simulation,
        summary: input.summary,
        note: input.note === undefined ? (existing?.note ?? null) : (input.note ?? null),
        isShortlisted: options.desiredShortlist ?? input.isShortlisted ?? existing?.isShortlisted ?? false,
        linkedGoalId: options.linkedGoalId === undefined
            ? (input.linkedGoalId ?? existing?.linkedGoalId ?? null)
            : options.linkedGoalId,
    };

    const withoutCurrent = scenarios.filter((scenario) => scenario.fingerprint !== fingerprint);
    return {
        scenario: nextScenario,
        scenarios: sortScenarios([nextScenario, ...withoutCurrent]),
    };
}

export function removeAdvisorScenario(
    scenarios: AdvisorSavedScenario[],
    reminders: AdvisorReminder[],
    scenarioId: string,
): { scenarios: AdvisorSavedScenario[]; reminders: AdvisorReminder[] } {
    return {
        scenarios: sortScenarios(scenarios.filter((scenario) => scenario.id !== scenarioId)),
        reminders: sortReminders(reminders.filter((reminder) => reminder.scenarioId !== scenarioId)),
    };
}

export function buildDefaultAdvisorGoalDraft(scenario: AdvisorSavedScenario): {
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline: string;
    category: "general" | "emergency" | "house" | "investment" | "travel" | "other";
} {
    const referenceDate = new Date();
    const deadlineMonths = scenario.simulation.isFinanced ? 6 : 12;
    const deadlineDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + deadlineMonths, 1);
    const deadline = `${deadlineDate.getFullYear()}-${String(deadlineDate.getMonth() + 1).padStart(2, "0")}`;
    const itemName = getAdvisorScenarioName(scenario.simulation);

    return {
        name: scenario.simulation.isFinanced
            ? `Anticipo per ${itemName}`
            : `Acquisto ${itemName}`,
        targetAmount: scenario.simulation.isFinanced
            ? Math.max(scenario.summary.cashOutlay, scenario.simulation.downPayment)
            : scenario.simulation.totalPrice,
        currentAmount: 0,
        deadline,
        category: scenario.simulation.category === "immobile" ? "house" : "general",
    };
}

export function buildAdvisorScenarioReport(scenario: AdvisorSavedScenario): string {
    const { simulation, summary } = scenario;
    const savedAt = new Date(scenario.updatedAt).toLocaleDateString("it-IT");
    const fireLine = summary.fireDelayMonthsValue == null
        ? "Impatto FIRE non calcolabile con i dati attuali."
        : `Impatto FIRE stimato: ${formatAdvisorFireDelay(summary.fireDelayMonthsValue)}.`;

    return [
        `# Sintesi scenario: ${getAdvisorScenarioName(simulation)}`,
        "",
        `Salvato il ${savedAt}`,
        `Categoria: ${CATEGORY_LABELS[simulation.category]}`,
        `Valutazione: ${summary.overallScore}/100 (${getAdvisorScoreLabel(summary.overallScore)})`,
        "",
        "## Struttura dell'acquisto",
        `- Prezzo totale: ${formatEuro(simulation.totalPrice)}`,
        `- Modalita: ${simulation.isFinanced ? "finanziato" : "cash"}`,
        `- Esborso iniziale: ${formatEuro(summary.cashOutlay)}`,
        simulation.isFinanced
            ? `- Finanziamento: ${formatEuro(summary.monthlyPayment)}/mese per ${simulation.financingYears} anni al ${simulation.financingRate.toFixed(1)}%`
            : `- Pagamento diretto: ${formatEuro(simulation.totalPrice)}`,
        "",
        "## Numeri chiave",
        `- Costo totale di possesso: ${formatEuro(summary.totalTCO)}`,
        `- Interessi totali: ${formatEuro(summary.totalInterest)}`,
        `- Liquidita residua stimata: ${formatEuro(summary.liquidityAfter)}`,
        `- Mesi di fondo emergenza residui: ${summary.emergencyMonthsLeft.toFixed(1)}`,
        `- Orizzonte TCO: ${summary.tcoYears} anni`,
        `- ${fireLine}`,
        scenario.note ? "" : null,
        scenario.note ? "## Nota" : null,
        scenario.note ?? null,
    ].filter((line): line is string => Boolean(line)).join("\n");
}
