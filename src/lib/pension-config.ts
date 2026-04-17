import type {
    AssetOwner,
    PensionConfig,
    PensionContributionConfig,
    PersonPensionConfig,
} from "@/types";

export const MAX_PENSION_DEDUCTIBLE = 5164.57;
export const TFR_RATE = 0.0691;

export const DEFAULT_PENSION_CONTRIBUTION: PensionContributionConfig = {
    mode: "fixed",
    value: 0,
};

export const DEFAULT_PERSON_PENSION_CONFIG: PersonPensionConfig = {
    active: false,
    grossAnnualSalary: 0,
    voluntaryContribution: { ...DEFAULT_PENSION_CONTRIBUTION },
    employerContribution: { ...DEFAULT_PENSION_CONTRIBUTION },
};

export const DEFAULT_PENSION_CONFIG: PensionConfig = {
    person1: {
        ...DEFAULT_PERSON_PENSION_CONFIG,
        active: true,
    },
    person2: {
        ...DEFAULT_PERSON_PENSION_CONFIG,
    },
};

interface LegacyPensionFields {
    enablePensionOptimizer?: unknown;
    grossIncome?: unknown;
    pensionContribution?: unknown;
    employerContributionType?: unknown;
    employerContributionValue?: unknown;
}

function toNumber(value: unknown, fallback = 0): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
}

function normalizeContributionConfig(value: unknown): PensionContributionConfig {
    const raw = (value && typeof value === "object") ? value as Partial<PensionContributionConfig> : {};
    const mode = raw.mode === "percent" ? "percent" : "fixed";
    return {
        mode,
        value: Math.max(0, toNumber(raw.value, 0)),
    };
}

function normalizePersonConfig(value: unknown, fallback: PersonPensionConfig): PersonPensionConfig {
    const raw = (value && typeof value === "object") ? value as Partial<PersonPensionConfig> : {};

    return {
        active: typeof raw.active === "boolean" ? raw.active : fallback.active,
        grossAnnualSalary: Math.max(0, toNumber(raw.grossAnnualSalary, fallback.grossAnnualSalary)),
        voluntaryContribution: normalizeContributionConfig(raw.voluntaryContribution ?? fallback.voluntaryContribution),
        employerContribution: normalizeContributionConfig(raw.employerContribution ?? fallback.employerContribution),
    };
}

export function buildLegacyPensionConfig(legacy?: LegacyPensionFields | null): PensionConfig {
    const enabled = typeof legacy?.enablePensionOptimizer === "boolean"
        ? legacy.enablePensionOptimizer
        : false;
    const grossIncome = Math.max(0, toNumber(legacy?.grossIncome, 0));
    const pensionContribution = Math.max(0, toNumber(legacy?.pensionContribution, 0));
    const employerMode = legacy?.employerContributionType === "percent" ? "percent" : "fixed";
    const employerValue = Math.max(0, toNumber(legacy?.employerContributionValue, 0));

    return {
        person1: {
            active: enabled,
            grossAnnualSalary: grossIncome,
            voluntaryContribution: {
                mode: "fixed",
                value: pensionContribution,
            },
            employerContribution: {
                mode: employerMode,
                value: employerValue,
            },
        },
        person2: {
            ...DEFAULT_PERSON_PENSION_CONFIG,
        },
    };
}

export function parsePensionConfig(
    raw: unknown,
    legacy?: LegacyPensionFields | null,
): PensionConfig {
    const fallback = buildLegacyPensionConfig(legacy);
    if (typeof raw !== "string" || raw.trim() === "") return fallback;

    try {
        const parsed = JSON.parse(raw) as Partial<PensionConfig>;
        return {
            person1: normalizePersonConfig(parsed.person1, fallback.person1),
            person2: normalizePersonConfig(parsed.person2, fallback.person2),
        };
    } catch {
        return fallback;
    }
}

export function stringifyPensionConfig(config: PensionConfig): string {
    return JSON.stringify(config);
}

export function getPersonKeyLabel(personKey: AssetOwner, person1Name: string, person2Name: string): string {
    return personKey === "person1" ? person1Name : person2Name;
}
