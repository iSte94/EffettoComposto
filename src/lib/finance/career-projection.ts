export interface CareerPromotion {
    id?: string;
    targetYear: number;
    amount: number;
    description: string;
}

export interface PersonCareerProgression {
    annualRaisePct: number;
    expectedInflationPct: number;
    promotions: CareerPromotion[];
}

export interface CareerProgressionData {
    yearsToSimulate: number;
    person1: PersonCareerProgression;
    person2: PersonCareerProgression;
}

export interface CareerIncomeProjectionPoint {
    year: number;
    yearOffset: number;
    person1AnnualIncome: number;
    person2AnnualIncome: number;
    person1MonthlyIncome: number;
    person2MonthlyIncome: number;
    totalMonthlyIncome: number;
    person1PromotionAmount: number;
    person2PromotionAmount: number;
}

export interface CareerIncomeProjection {
    progression: CareerProgressionData;
    points: CareerIncomeProjectionPoint[];
}

export type CareerProjectionOwner = "person1" | "person2" | "both";

export const DEFAULT_CAREER_PROGRESSION: CareerProgressionData = {
    yearsToSimulate: 20,
    person1: { annualRaisePct: 3, expectedInflationPct: 2, promotions: [] },
    person2: { annualRaisePct: 3, expectedInflationPct: 2, promotions: [] },
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toFiniteNumber(value: unknown, fallback: number) {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function clampNumber(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function normalizePromotion(value: unknown): CareerPromotion | null {
    if (!isRecord(value)) return null;

    const targetYear = Math.trunc(toFiniteNumber(value.targetYear, 0));
    const amount = Math.max(0, toFiniteNumber(value.amount, 0));

    if (targetYear <= 0 || amount <= 0) return null;

    return {
        id: typeof value.id === "string" ? value.id : undefined,
        targetYear,
        amount,
        description: typeof value.description === "string" ? value.description : "Promozione",
    };
}

function normalizePersonProgression(
    value: unknown,
    fallback: PersonCareerProgression,
): PersonCareerProgression {
    if (!isRecord(value)) return fallback;

    return {
        annualRaisePct: clampNumber(toFiniteNumber(value.annualRaisePct, fallback.annualRaisePct), -100, 100),
        expectedInflationPct: clampNumber(toFiniteNumber(value.expectedInflationPct, fallback.expectedInflationPct), -100, 100),
        promotions: Array.isArray(value.promotions)
            ? value.promotions.map(normalizePromotion).filter((promotion): promotion is CareerPromotion => Boolean(promotion))
            : [],
    };
}

export function normalizeCareerProgression(value: unknown): CareerProgressionData {
    if (!isRecord(value)) return DEFAULT_CAREER_PROGRESSION;

    return {
        yearsToSimulate: clampNumber(
            Math.trunc(toFiniteNumber(value.yearsToSimulate, DEFAULT_CAREER_PROGRESSION.yearsToSimulate)),
            0,
            50,
        ),
        person1: normalizePersonProgression(value.person1, DEFAULT_CAREER_PROGRESSION.person1),
        person2: normalizePersonProgression(value.person2, DEFAULT_CAREER_PROGRESSION.person2),
    };
}

export function parseCareerProgression(raw: string | null | undefined): CareerProgressionData {
    if (!raw) return DEFAULT_CAREER_PROGRESSION;

    try {
        return normalizeCareerProgression(JSON.parse(raw));
    } catch {
        return DEFAULT_CAREER_PROGRESSION;
    }
}

export function buildCareerIncomeProjection({
    progressionRaw,
    person1MonthlyIncome,
    person2MonthlyIncome,
    currentYear = new Date().getFullYear(),
}: {
    progressionRaw: string | null | undefined;
    person1MonthlyIncome: number;
    person2MonthlyIncome: number;
    currentYear?: number;
}): CareerIncomeProjection {
    const progression = parseCareerProgression(progressionRaw);
    const points: CareerIncomeProjectionPoint[] = [];

    let person1AnnualIncome = Math.max(0, person1MonthlyIncome) * 12;
    let person2AnnualIncome = Math.max(0, person2MonthlyIncome) * 12;

    for (let yearOffset = 0; yearOffset <= progression.yearsToSimulate; yearOffset++) {
        const year = currentYear + yearOffset;
        const person1PromotionAmount = progression.person1.promotions
            .filter((promotion) => promotion.targetYear === year)
            .reduce((sum, promotion) => sum + promotion.amount, 0);
        const person2PromotionAmount = progression.person2.promotions
            .filter((promotion) => promotion.targetYear === year)
            .reduce((sum, promotion) => sum + promotion.amount, 0);

        if (yearOffset > 0) {
            person1AnnualIncome =
                person1AnnualIncome * (1 + progression.person1.annualRaisePct / 100) + person1PromotionAmount;
            person2AnnualIncome =
                person2AnnualIncome * (1 + progression.person2.annualRaisePct / 100) + person2PromotionAmount;
        }

        points.push({
            year,
            yearOffset,
            person1AnnualIncome,
            person2AnnualIncome,
            person1MonthlyIncome: person1AnnualIncome / 12,
            person2MonthlyIncome: person2AnnualIncome / 12,
            totalMonthlyIncome: (person1AnnualIncome + person2AnnualIncome) / 12,
            person1PromotionAmount: yearOffset > 0 ? person1PromotionAmount : 0,
            person2PromotionAmount: yearOffset > 0 ? person2PromotionAmount : 0,
        });
    }

    return { progression, points };
}

export function getProjectedMonthlyIncomeForOwner(
    point: CareerIncomeProjectionPoint,
    owner: CareerProjectionOwner,
) {
    if (owner === "person1") return point.person1MonthlyIncome;
    if (owner === "person2") return point.person2MonthlyIncome;
    return point.totalMonthlyIncome;
}
