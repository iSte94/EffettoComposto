import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from '@/lib/api-auth';
import { z } from 'zod/v4';

// GET: Esporta tutti i dati dell'utente (preferenze, snapshot patrimonio, obiettivi)
export async function GET() {
    try {
        const userId = await getAuthenticatedUserId();

        const [preferences, assets, goals] = await Promise.all([
            prisma.preference.findUnique({ where: { userId } }),
            prisma.assetRecord.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
            prisma.savingsGoal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
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

        // Estrarre subscriptionsList come array per leggibilità nel JSON esportato
        let subscriptions: unknown[] = [];
        if (cleanPreferences?.subscriptionsList) {
            try {
                subscriptions = JSON.parse(cleanPreferences.subscriptionsList as string);
            } catch { /* noop */ }
        }

        const exportData = {
            version: 1,
            exportedAt: new Date().toISOString(),
            preferences: cleanPreferences,
            patrimonio: cleanAssets,
            obiettivi: cleanGoals,
            abbonamenti: subscriptions,
        };

        return NextResponse.json(exportData);
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error('Failed to export user data:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Schema di validazione per l'import
const importSchema = z.object({
    version: z.number(),
    preferences: z.record(z.string(), z.unknown()).nullable().optional(),
    patrimonio: z.array(z.record(z.string(), z.unknown())).optional(),
    obiettivi: z.array(z.object({
        name: z.string(),
        targetAmount: z.number(),
        currentAmount: z.number().default(0),
        deadline: z.string().nullable().optional(),
        category: z.string().default("general"),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional(),
    })).optional(),
    abbonamenti: z.array(z.object({
        id: z.string(),
        name: z.string(),
        amount: z.number(),
        frequency: z.enum(["mensile", "annuale"]),
    })).optional(),
});

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
        const results = { preferences: false, patrimonio: 0, obiettivi: 0, abbonamenti: 0 };

        // 1. Import preferenze (upsert)
        if (data.preferences) {
            const { userId: _u, id, ...prefData } = data.preferences as Record<string, unknown>;
            void _u; void id;

            // Se ci sono abbonamenti nel JSON e non sono già nelle preferenze, iniettali
            if (data.abbonamenti && data.abbonamenti.length > 0 && !prefData.subscriptionsList) {
                prefData.subscriptionsList = JSON.stringify(data.abbonamenti);
            }

            await prisma.preference.upsert({
                where: { userId },
                update: prefData,
                create: { ...prefData, userId },
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
        if (data.patrimonio && data.patrimonio.length > 0) {
            // Elimina snapshot esistenti prima di importare
            await prisma.assetRecord.deleteMany({ where: { userId } });

            for (const record of data.patrimonio) {
                const { userId: _u, id, ...recordData } = record;
                void _u; void id;
                await prisma.assetRecord.create({
                    data: {
                        ...recordData,
                        date: recordData.date ? new Date(recordData.date as string) : new Date(),
                        userId,
                    },
                });
            }
            results.patrimonio = data.patrimonio.length;
        }

        // 3. Import obiettivi
        if (data.obiettivi && data.obiettivi.length > 0) {
            // Elimina obiettivi esistenti prima di importare
            await prisma.savingsGoal.deleteMany({ where: { userId } });

            for (const goal of data.obiettivi) {
                await prisma.savingsGoal.create({
                    data: {
                        name: goal.name,
                        targetAmount: goal.targetAmount,
                        currentAmount: goal.currentAmount,
                        deadline: goal.deadline ?? null,
                        category: goal.category,
                        userId,
                    },
                });
            }
            results.obiettivi = data.obiettivi.length;
        }

        return NextResponse.json({
            message: 'Dati importati con successo!',
            results,
        });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error('Failed to import user data:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
