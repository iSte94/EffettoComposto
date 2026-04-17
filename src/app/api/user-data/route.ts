import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from '@/lib/api-auth';
import { z } from 'zod/v4';
import { buildDerived } from '@/lib/ai/derived';

// GET: Esporta tutti i dati dell'utente (preferenze, snapshot patrimonio, obiettivi)
// Query string `?ai=1` arricchisce la risposta con il blocco `derived` (aggregati per AI).
export async function GET(req: Request) {
    try {
        const userId = await getAuthenticatedUserId();
        const { searchParams } = new URL(req.url);
        const includeDerived = searchParams.get('ai') === '1';

        const [preferences, assets, goals, budgetTransactions, dividends, pacSchedules, pacExecutions, pensionAccruals] = await Promise.all([
            prisma.preference.findUnique({ where: { userId } }),
            prisma.assetRecord.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
            prisma.savingsGoal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
            prisma.budgetTransaction.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
            prisma.dividendRecord.findMany({ where: { userId }, orderBy: { paymentDate: 'desc' } }),
            prisma.assetPacSchedule.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
            prisma.assetPacExecution.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
            prisma.pensionFundAccrual.findMany({ where: { userId }, orderBy: { accrualMonth: 'asc' } }),
        ]);

        // Rimuoviamo i campi interni (userId, id) che non servono per l'import
        const cleanPreferences = preferences ? (() => {
            const { id, userId: _u, ...rest } = preferences;
            void id; void _u;
            return rest;
        })() : null;

        const cleanAssets = assets.map(({ id, userId: _u, ...rest }) => {
            void id; void _u;
            return rest;
        });

        const cleanGoals = goals.map(({ id, userId: _u, ...rest }) => {
            void id; void _u;
            return rest;
        });

        const cleanBudgetTransactions = budgetTransactions.map(({ id, userId: _u, ...rest }) => {
            void id; void _u;
            return rest;
        });

        // Estrarre subscriptionsList come array per leggibilità nel JSON esportato
        let subscriptions: unknown[] = [];
        if (cleanPreferences?.subscriptionsList) {
            try {
                subscriptions = JSON.parse(cleanPreferences.subscriptionsList as string);
            } catch { /* noop */ }
        }

        const cleanDividends = dividends.map(({ id, userId: _u, createdAt: _c, updatedAt: _up, ...rest }) => {
            void id; void _u; void _c; void _up;
            return rest;
        });

        const cleanPacSchedules = pacSchedules.map(({ userId: _u, ...rest }) => {
            void _u;
            return rest;
        });

        const cleanPacExecutions = pacExecutions.map(({ userId: _u, ...rest }) => {
            void _u;
            return rest;
        });

        const cleanPensionAccruals = pensionAccruals.map(({ id, userId: _u, ...rest }) => {
            void id; void _u;
            return rest;
        });

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
                snapshots: cleanAssets as Parameters<typeof buildDerived>[0]["snapshots"],
                goals: cleanGoals as Parameters<typeof buildDerived>[0]["goals"],
                transactions: cleanBudgetTransactions as Parameters<typeof buildDerived>[0]["transactions"],
            });
        }

        return NextResponse.json(exportData);
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error('Failed to export user data:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Schema di validazione per l'import
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
        importedAt: z.string().optional(),
    })).optional(),
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

function omitImportFields(record: Record<string, unknown>, fields: string[] = ["id", "userId", "user"]): Record<string, unknown> {
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
        const results = {
            preferences: false,
            patrimonio: 0,
            obiettivi: 0,
            abbonamenti: 0,
            budgetTransactions: 0,
            dividends: 0,
            pacSchedules: 0,
            pacExecutions: 0,
            pensionAccruals: 0,
        };

        // 1. Import preferenze (upsert)
        if (data.preferences) {
            const prefData = omitImportFields(data.preferences as Record<string, unknown>);

            // Se ci sono abbonamenti nel JSON e non sono già nelle preferenze, iniettali
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
            // Solo abbonamenti senza preferenze
            await prisma.preference.upsert({
                where: { userId },
                update: { subscriptionsList: JSON.stringify(data.abbonamenti) },
                create: { userId, subscriptionsList: JSON.stringify(data.abbonamenti) },
            });
            results.abbonamenti = data.abbonamenti.length;
        }

        // 2. Import snapshot patrimonio
        if (patrimonioRecords.length > 0) {
            // Elimina snapshot esistenti prima di importare
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

        // 3. Import obiettivi
        if (goalRecords.length > 0) {
            // Elimina obiettivi esistenti prima di importare
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

        // 4. Import budget transactions
        if (data.budgetTransactions && data.budgetTransactions.length > 0) {
            await prisma.budgetTransaction.deleteMany({ where: { userId } });

            await prisma.budgetTransaction.createMany({
                data: data.budgetTransactions.map((tx) => ({
                    date: tx.date,
                    description: tx.description,
                    amount: tx.amount,
                    category: tx.category,
                    categoryOverride: tx.categoryOverride,
                    hash: tx.hash,
                    importedAt: tx.importedAt ? new Date(tx.importedAt) : new Date(),
                    userId,
                })),
            });
            results.budgetTransactions = data.budgetTransactions.length;
        }

        // 5. Import dividendi
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

        // 6. Import regole ed esecuzioni PAC
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
                        ...omitImportFields(record, ["id", "userId", "user", "scheduleId", "schedule"]),
                        scheduleId,
                        createdAt: toDate(record.createdAt),
                        userId,
                    } as Prisma.AssetPacExecutionUncheckedCreateInput,
                });
                results.pacExecutions++;
            }
        }

        // 7. Import accrediti fondo pensione
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
