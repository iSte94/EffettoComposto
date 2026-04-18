import type { Prisma, Preference } from "@prisma/client";
import prisma from "@/lib/prisma";
import { buildDerived } from "@/lib/ai/derived";

const PREFERENCE_SECRET_KEYS = new Set([
    "id",
    "userId",
    "aiRememberKeys",
    "aiProvider",
    "aiModel",
    "aiApiKeyEnc",
]);

export function sanitizePreferenceForClient(preferences: Preference | null): Record<string, unknown> | null {
    if (!preferences) return null;
    return Object.fromEntries(
        Object.entries(preferences).filter(([key]) => !PREFERENCE_SECRET_KEYS.has(key)),
    );
}

function stripUserFields<T extends Record<string, unknown>>(record: T, fields: string[] = ["id", "userId"]): Record<string, unknown> {
    return Object.fromEntries(Object.entries(record).filter(([key]) => !fields.includes(key)));
}

export async function fetchUserDataBundle(userId: string) {
    const [preferences, assets, goals, budgetTransactions, dividends, pacSchedules, pacExecutions, pensionAccruals] = await Promise.all([
        prisma.preference.findUnique({ where: { userId } }),
        prisma.assetRecord.findMany({ where: { userId }, orderBy: { date: "asc" } }),
        prisma.savingsGoal.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
        prisma.budgetTransaction.findMany({ where: { userId }, orderBy: { date: "asc" } }),
        prisma.dividendRecord.findMany({ where: { userId }, orderBy: { paymentDate: "desc" } }),
        prisma.assetPacSchedule.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
        prisma.assetPacExecution.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
        prisma.pensionFundAccrual.findMany({ where: { userId }, orderBy: { accrualMonth: "asc" } }),
    ]);

    return {
        preferences,
        assets,
        goals,
        budgetTransactions,
        dividends,
        pacSchedules,
        pacExecutions,
        pensionAccruals,
    };
}

export async function buildUserExportData(userId: string, includeDerived = false): Promise<Record<string, unknown>> {
    const {
        preferences,
        assets,
        goals,
        budgetTransactions,
        dividends,
        pacSchedules,
        pacExecutions,
        pensionAccruals,
    } = await fetchUserDataBundle(userId);

    const cleanPreferences = sanitizePreferenceForClient(preferences);
    const cleanAssets = assets.map((record) => stripUserFields(record as unknown as Record<string, unknown>));
    const cleanGoals = goals.map((record) => stripUserFields(record as unknown as Record<string, unknown>));
    const cleanBudgetTransactions = budgetTransactions.map((record) => stripUserFields(record as unknown as Record<string, unknown>));
    const cleanDividends = dividends.map((record) => stripUserFields(record as unknown as Record<string, unknown>, ["id", "userId", "createdAt", "updatedAt"]));
    const cleanPacSchedules = pacSchedules.map((record) => stripUserFields(record as unknown as Record<string, unknown>, ["userId"]));
    const cleanPacExecutions = pacExecutions.map((record) => stripUserFields(record as unknown as Record<string, unknown>, ["userId"]));
    const cleanPensionAccruals = pensionAccruals.map((record) => stripUserFields(record as unknown as Record<string, unknown>));

    let subscriptions: unknown[] = [];
    if (typeof cleanPreferences?.subscriptionsList === "string") {
        try {
            subscriptions = JSON.parse(cleanPreferences.subscriptionsList);
        } catch {
            subscriptions = [];
        }
    }

    const exportData: Record<string, unknown> = {
        version: 2,
        exportedAt: new Date().toISOString(),
        preferences: cleanPreferences,
        assets: cleanAssets,
        patrimonio: cleanAssets,
        savingsGoals: cleanGoals,
        obiettivi: cleanGoals,
        abbonamenti: subscriptions,
        budgetTransactions: cleanBudgetTransactions,
        dividends: cleanDividends,
        pacSchedules: cleanPacSchedules,
        pacExecutions: cleanPacExecutions,
        pensionAccruals: cleanPensionAccruals,
    };

    if (includeDerived) {
        exportData.derived = buildDerived({
            preferences: cleanPreferences as Parameters<typeof buildDerived>[0]["preferences"],
            snapshots: cleanAssets as unknown as Parameters<typeof buildDerived>[0]["snapshots"],
            goals: cleanGoals as unknown as Parameters<typeof buildDerived>[0]["goals"],
            transactions: cleanBudgetTransactions as unknown as Parameters<typeof buildDerived>[0]["transactions"],
        });
    }

    return exportData;
}

export function omitImportFields(record: Record<string, unknown>, fields: string[] = ["id", "userId", "user"]): Record<string, unknown> {
    return Object.fromEntries(Object.entries(record).filter(([key]) => !fields.includes(key)));
}

export function toDate(value: unknown): Date | undefined {
    if (!value) return undefined;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? undefined : date;
}

export type PreferenceUpsertData = Prisma.PreferenceUncheckedCreateInput;
