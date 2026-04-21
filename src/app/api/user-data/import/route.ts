import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from "@/lib/api-auth";

type BackupRecord = Record<string, unknown>;

function isRecord(value: unknown): value is BackupRecord {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function recordsFrom(value: unknown): BackupRecord[] {
    return Array.isArray(value) ? value.filter(isRecord) : [];
}

function omitFields(record: BackupRecord, fields: string[]): BackupRecord {
    return Object.fromEntries(Object.entries(record).filter(([key]) => !fields.includes(key)));
}

function toDate(value: unknown): Date | undefined {
    if (!value) return undefined;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? undefined : date;
}

function sanitizeForCreate(record: BackupRecord): BackupRecord {
    return omitFields(record, ["id", "userId", "user"]);
}

export async function POST(req: Request) {
    try {
        const userId = await getAuthenticatedUserId();
        const raw = await req.json();
        const payload = isRecord(raw) && isRecord(raw.data) ? raw.data : raw;

        if (!isRecord(payload) || (payload.version !== 2 && payload.version !== 3 && payload.version !== 4)) {
            return NextResponse.json({ error: "Backup non valido o versione non supportata" }, { status: 400 });
        }

        const preferences = isRecord(payload.preferences) ? payload.preferences : null;
        const assets = recordsFrom(payload.assets);
        const savingsGoals = recordsFrom(payload.savingsGoals);
        const budgetTransactions = recordsFrom(payload.budgetTransactions);
        const budgetImportBatches = recordsFrom(payload.budgetImportBatches);
        const budgetMerchantRules = recordsFrom(payload.budgetMerchantRules);
        const dividends = recordsFrom(payload.dividends);
        const pacSchedules = recordsFrom(payload.pacSchedules);
        const pacExecutions = recordsFrom(payload.pacExecutions);
        const pensionAccruals = recordsFrom(payload.pensionAccruals);
        const plannedEvents = recordsFrom(payload.plannedEvents);

        const result = await prisma.$transaction(async (tx) => {
            await tx.budgetTransaction.deleteMany({ where: { userId } });
            await tx.budgetImportBatch.deleteMany({ where: { userId } });
            await tx.budgetMerchantRule.deleteMany({ where: { userId } });
            await tx.assetPacExecution.deleteMany({ where: { userId } });
            await tx.assetPacSchedule.deleteMany({ where: { userId } });
            await tx.pensionFundAccrual.deleteMany({ where: { userId } });
            await tx.dividendRecord.deleteMany({ where: { userId } });
            await tx.savingsGoal.deleteMany({ where: { userId } });
            await tx.assetRecord.deleteMany({ where: { userId } });
            await tx.plannedFinancialEvent.deleteMany({ where: { userId } });

            if (preferences) {
                const preferenceData = sanitizeForCreate(preferences);
                await tx.preference.upsert({
                    where: { userId },
                    update: preferenceData as Prisma.PreferenceUncheckedUpdateInput,
                    create: {
                        ...preferenceData,
                        userId,
                    } as Prisma.PreferenceUncheckedCreateInput,
                });
            }

            if (assets.length > 0) {
                await tx.assetRecord.createMany({
                    data: assets.map((record) => ({
                        ...sanitizeForCreate(record),
                        date: toDate(record.date),
                        userId,
                    })) as Prisma.AssetRecordCreateManyInput[],
                });
            }

            if (savingsGoals.length > 0) {
                await tx.savingsGoal.createMany({
                    data: savingsGoals.map((record) => ({
                        ...sanitizeForCreate(record),
                        createdAt: toDate(record.createdAt),
                        updatedAt: toDate(record.updatedAt),
                        userId,
                    })) as Prisma.SavingsGoalCreateManyInput[],
                });
            }

            const batchIdMap = new Map<string, string>();
            for (const record of budgetImportBatches) {
                const oldId = typeof record.id === "string" ? record.id : null;
                const created = await tx.budgetImportBatch.create({
                    data: {
                        ...omitFields(sanitizeForCreate(record), ["threadId", "thread", "transactions"]),
                        createdAt: toDate(record.createdAt),
                        updatedAt: toDate(record.updatedAt),
                        confirmedAt: toDate(record.confirmedAt),
                        cancelledAt: toDate(record.cancelledAt),
                        rolledBackAt: toDate(record.rolledBackAt),
                        userId,
                    } as Prisma.BudgetImportBatchUncheckedCreateInput,
                });
                if (oldId) batchIdMap.set(oldId, created.id);
            }

            if (budgetTransactions.length > 0) {
                await tx.budgetTransaction.createMany({
                    data: budgetTransactions.map((record) => ({
                        ...omitFields(sanitizeForCreate(record), ["importBatchId", "importBatch"]),
                        importBatchId: typeof record.importBatchId === "string"
                            ? batchIdMap.get(record.importBatchId) ?? null
                            : null,
                        importedAt: toDate(record.importedAt),
                        userId,
                    })) as Prisma.BudgetTransactionCreateManyInput[],
                });
            }

            if (budgetMerchantRules.length > 0) {
                await tx.budgetMerchantRule.createMany({
                    data: budgetMerchantRules.map((record) => ({
                        ...sanitizeForCreate(record),
                        createdAt: toDate(record.createdAt),
                        updatedAt: toDate(record.updatedAt),
                        lastUsedAt: toDate(record.lastUsedAt),
                        userId,
                    })) as Prisma.BudgetMerchantRuleCreateManyInput[],
                });
            }

            if (dividends.length > 0) {
                await tx.dividendRecord.createMany({
                    data: dividends.map((record) => ({
                        ...sanitizeForCreate(record),
                        createdAt: toDate(record.createdAt),
                        updatedAt: toDate(record.updatedAt),
                        userId,
                    })) as Prisma.DividendRecordCreateManyInput[],
                });
            }

            const scheduleIdMap = new Map<string, string>();
            for (const record of pacSchedules) {
                const oldId = typeof record.id === "string" ? record.id : null;
                const created = await tx.assetPacSchedule.create({
                    data: {
                        ...sanitizeForCreate(record),
                        createdAt: toDate(record.createdAt),
                        updatedAt: toDate(record.updatedAt),
                        userId,
                    } as Prisma.AssetPacScheduleUncheckedCreateInput,
                });
                if (oldId) scheduleIdMap.set(oldId, created.id);
            }

            let importedExecutions = 0;
            for (const record of pacExecutions) {
                const oldScheduleId = typeof record.scheduleId === "string" ? record.scheduleId : "";
                const scheduleId = scheduleIdMap.get(oldScheduleId);
                if (!scheduleId) continue;

                await tx.assetPacExecution.create({
                    data: {
                        ...omitFields(sanitizeForCreate(record), ["scheduleId", "schedule"]),
                        scheduleId,
                        createdAt: toDate(record.createdAt),
                        userId,
                    } as Prisma.AssetPacExecutionUncheckedCreateInput,
                });
                importedExecutions++;
            }

            if (pensionAccruals.length > 0) {
                await tx.pensionFundAccrual.createMany({
                    data: pensionAccruals.map((record) => ({
                        ...sanitizeForCreate(record),
                        createdAt: toDate(record.createdAt),
                        userId,
                    })) as Prisma.PensionFundAccrualCreateManyInput[],
                });
            }

            if (plannedEvents.length > 0) {
                await tx.plannedFinancialEvent.createMany({
                    data: plannedEvents.map((record) => ({
                        ...sanitizeForCreate(record),
                        createdAt: toDate(record.createdAt),
                        updatedAt: toDate(record.updatedAt),
                        userId,
                    })) as Prisma.PlannedFinancialEventCreateManyInput[],
                });
            }

            return {
                assets: assets.length,
                savingsGoals: savingsGoals.length,
                budgetTransactions: budgetTransactions.length,
                budgetImportBatches: batchIdMap.size,
                budgetMerchantRules: budgetMerchantRules.length,
                dividends: dividends.length,
                pacSchedules: scheduleIdMap.size,
                pacExecutions: importedExecutions,
                pensionAccruals: pensionAccruals.length,
                plannedEvents: plannedEvents.length,
            };
        });

        return NextResponse.json({
            message: "Import completato",
            version: Number(payload.version),
            imported: result,
        });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error("Failed to import user data:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
