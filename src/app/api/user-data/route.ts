import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod/v4';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from '@/lib/api-auth';
import { buildUserExportData } from '@/lib/user-data';

// GET: Esporta tutti i dati dell'utente (preferenze, snapshot patrimonio, obiettivi)
// Query string `?ai=1` arricchisce la risposta con il blocco `derived` (aggregati per AI).
export async function GET(req: Request) {
    try {
        const userId = await getAuthenticatedUserId();
        const { searchParams } = new URL(req.url);
        const includeDerived = searchParams.get('ai') === '1';
        return NextResponse.json(await buildUserExportData(userId, includeDerived));
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error('Failed to export user data:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

const genericRecordArray = z.array(z.record(z.string(), z.unknown())).optional();

const importSchema = z.object({
    version: z.number(),
    preferences: z.record(z.string(), z.unknown()).nullable().optional(),
    patrimonio: genericRecordArray,
    assets: genericRecordArray,
    obiettivi: z.array(z.object({
        name: z.string(),
        targetAmount: z.number(),
        currentAmount: z.number().default(0),
        deadline: z.string().nullable().optional(),
        category: z.string().default("general"),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional(),
    })).optional(),
    savingsGoals: genericRecordArray,
    abbonamenti: z.array(z.object({
        id: z.string(),
        name: z.string(),
        amount: z.number(),
        frequency: z.enum(["mensile", "annuale"]),
    })).optional(),
    budgetTransactions: z.array(z.object({
        date: z.string(),
        description: z.string(),
        amount: z.number(),
        category: z.string(),
        categoryOverride: z.boolean().default(false),
        hash: z.string(),
        merchantNormalized: z.string().nullable().optional(),
        movementType: z.string().optional(),
        importConfidence: z.string().nullable().optional(),
        importBatchId: z.string().nullable().optional(),
        importedAt: z.string().optional(),
    })).optional(),
    budgetImportBatches: genericRecordArray,
    budgetMerchantRules: genericRecordArray,
    dividends: genericRecordArray,
    pacSchedules: genericRecordArray,
    pacExecutions: genericRecordArray,
    pensionAccruals: genericRecordArray,
});

function toDate(value: unknown): Date | undefined {
    if (!value) return undefined;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? undefined : date;
}

function omitImportFields(record: Record<string, unknown>, fields: string[] = ['id', 'userId', 'user']): Record<string, unknown> {
    return Object.fromEntries(Object.entries(record).filter(([key]) => !fields.includes(key)));
}

// POST: Importa tutti i dati dell'utente (sovrascrive preferenze, aggiunge snapshot e obiettivi)
export async function POST(req: Request) {
    try {
        const userId = await getAuthenticatedUserId();
        const rawData = await req.json();

        const parsed = importSchema.safeParse(rawData);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Formato dati non valido', details: parsed.error.issues },
                { status: 400 }
            );
        }

        const data = parsed.data;
        const patrimonioRecords = ((data.assets ?? data.patrimonio) ?? []) as Record<string, unknown>[];
        const goalRecords = ((data.savingsGoals ?? data.obiettivi) ?? []) as Record<string, unknown>[];
        const budgetImportBatches = (data.budgetImportBatches ?? []) as Record<string, unknown>[];
        const budgetMerchantRules = (data.budgetMerchantRules ?? []) as Record<string, unknown>[];
        const results = {
            preferences: false,
            patrimonio: 0,
            obiettivi: 0,
            abbonamenti: 0,
            budgetTransactions: 0,
            budgetImportBatches: 0,
            budgetMerchantRules: 0,
            dividends: 0,
            pacSchedules: 0,
            pacExecutions: 0,
            pensionAccruals: 0,
        };

        if (data.preferences) {
            const prefData = omitImportFields(data.preferences as Record<string, unknown>);

            if (data.abbonamenti && data.abbonamenti.length > 0 && !prefData.subscriptionsList) {
                prefData.subscriptionsList = JSON.stringify(data.abbonamenti);
            }

            await prisma.preference.upsert({
                where: { userId },
                update: prefData as Prisma.PreferenceUncheckedUpdateInput,
                create: { ...prefData, userId } as Prisma.PreferenceUncheckedCreateInput,
            });
            results.preferences = true;
            if (data.abbonamenti) results.abbonamenti = data.abbonamenti.length;
        } else if (data.abbonamenti && data.abbonamenti.length > 0) {
            await prisma.preference.upsert({
                where: { userId },
                update: { subscriptionsList: JSON.stringify(data.abbonamenti) },
                create: { userId, subscriptionsList: JSON.stringify(data.abbonamenti) },
            });
            results.abbonamenti = data.abbonamenti.length;
        }

        if (patrimonioRecords.length > 0) {
            await prisma.assetRecord.deleteMany({ where: { userId } });

            for (const record of patrimonioRecords) {
                const recordData = omitImportFields(record);
                await prisma.assetRecord.create({
                    data: {
                        ...recordData,
                        date: toDate(recordData.date) ?? new Date(),
                        userId,
                    } as Prisma.AssetRecordUncheckedCreateInput,
                });
            }
            results.patrimonio = patrimonioRecords.length;
        }

        if (goalRecords.length > 0) {
            await prisma.savingsGoal.deleteMany({ where: { userId } });

            for (const goal of goalRecords) {
                await prisma.savingsGoal.create({
                    data: {
                        name: String(goal.name ?? "Obiettivo"),
                        targetAmount: Number(goal.targetAmount ?? 0),
                        currentAmount: Number(goal.currentAmount ?? 0),
                        deadline: typeof goal.deadline === "string" ? goal.deadline : null,
                        category: String(goal.category ?? "general"),
                        createdAt: toDate(goal.createdAt),
                        updatedAt: toDate(goal.updatedAt),
                        userId,
                    } as Prisma.SavingsGoalUncheckedCreateInput,
                });
            }
            results.obiettivi = goalRecords.length;
        }

        if (
            (data.budgetTransactions && data.budgetTransactions.length > 0)
            || budgetImportBatches.length > 0
            || budgetMerchantRules.length > 0
        ) {
            await prisma.budgetTransaction.deleteMany({ where: { userId } });
            await prisma.budgetImportBatch.deleteMany({ where: { userId } });
            await prisma.budgetMerchantRule.deleteMany({ where: { userId } });

            const batchIdMap = new Map<string, string>();
            for (const record of budgetImportBatches) {
                const oldId = typeof record.id === "string" ? record.id : null;
                const created = await prisma.budgetImportBatch.create({
                    data: {
                        ...omitImportFields(record, ['userId', 'threadId', 'thread', 'transactions']),
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

            if (data.budgetTransactions && data.budgetTransactions.length > 0) {
                await prisma.budgetTransaction.createMany({
                    data: data.budgetTransactions.map((tx) => ({
                        date: tx.date,
                        description: tx.description,
                        amount: tx.amount,
                        category: tx.category,
                        categoryOverride: tx.categoryOverride,
                        hash: tx.hash,
                        merchantNormalized: tx.merchantNormalized ?? null,
                        movementType: tx.movementType ?? 'standard',
                        importConfidence: tx.importConfidence ?? null,
                        importBatchId: tx.importBatchId ? batchIdMap.get(tx.importBatchId) ?? null : null,
                        importedAt: tx.importedAt ? new Date(tx.importedAt) : new Date(),
                        userId,
                    })),
                });
                results.budgetTransactions = data.budgetTransactions.length;
            }
            results.budgetImportBatches = batchIdMap.size;
        } else {
            await prisma.budgetImportBatch.deleteMany({ where: { userId } });
            await prisma.budgetMerchantRule.deleteMany({ where: { userId } });
        }

        if (budgetMerchantRules.length > 0) {
            await prisma.budgetMerchantRule.createMany({
                data: budgetMerchantRules.map((record) => ({
                    ...omitImportFields(record),
                    createdAt: toDate(record.createdAt),
                    updatedAt: toDate(record.updatedAt),
                    lastUsedAt: toDate(record.lastUsedAt),
                    userId,
                })) as Prisma.BudgetMerchantRuleCreateManyInput[],
            });
            results.budgetMerchantRules = budgetMerchantRules.length;
        }

        if (data.dividends && data.dividends.length > 0) {
            await prisma.dividendRecord.deleteMany({ where: { userId } });
            await prisma.dividendRecord.createMany({
                data: data.dividends.map((record) => ({
                    ...omitImportFields(record),
                    createdAt: toDate(record.createdAt),
                    updatedAt: toDate(record.updatedAt),
                    userId,
                })) as Prisma.DividendRecordCreateManyInput[],
            });
            results.dividends = data.dividends.length;
        }

        if ((data.pacSchedules && data.pacSchedules.length > 0) || (data.pacExecutions && data.pacExecutions.length > 0)) {
            await prisma.assetPacExecution.deleteMany({ where: { userId } });
            await prisma.assetPacSchedule.deleteMany({ where: { userId } });

            const scheduleIdMap = new Map<string, string>();
            for (const record of data.pacSchedules ?? []) {
                const oldId = typeof record.id === "string" ? record.id : null;
                const created = await prisma.assetPacSchedule.create({
                    data: {
                        ...omitImportFields(record),
                        createdAt: toDate(record.createdAt),
                        updatedAt: toDate(record.updatedAt),
                        userId,
                    } as Prisma.AssetPacScheduleUncheckedCreateInput,
                });
                if (oldId) scheduleIdMap.set(oldId, created.id);
            }
            results.pacSchedules = scheduleIdMap.size;

            for (const record of data.pacExecutions ?? []) {
                const oldScheduleId = typeof record.scheduleId === "string" ? record.scheduleId : "";
                const scheduleId = scheduleIdMap.get(oldScheduleId);
                if (!scheduleId) continue;

                await prisma.assetPacExecution.create({
                    data: {
                        ...omitImportFields(record, ['id', 'userId', 'user', 'scheduleId', 'schedule']),
                        scheduleId,
                        createdAt: toDate(record.createdAt),
                        userId,
                    } as Prisma.AssetPacExecutionUncheckedCreateInput,
                });
                results.pacExecutions++;
            }
        }

        if (data.pensionAccruals && data.pensionAccruals.length > 0) {
            await prisma.pensionFundAccrual.deleteMany({ where: { userId } });
            await prisma.pensionFundAccrual.createMany({
                data: data.pensionAccruals.map((record) => ({
                    ...omitImportFields(record),
                    createdAt: toDate(record.createdAt),
                    userId,
                })) as Prisma.PensionFundAccrualCreateManyInput[],
            });
            results.pensionAccruals = data.pensionAccruals.length;
        }

        return NextResponse.json({
            message: 'Dati importati con successo!',
            results,
        });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error('Failed to import user data:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
