import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from '@/lib/api-auth';
import { budgetReapplySchema } from '@/lib/validations/budget';

// Re-applica le regole di categorizzazione (calcolate client-side) solo alle
// transazioni che NON sono state modificate manualmente dall'utente.
export async function POST(req: Request) {
    try {
        const userId = await getAuthenticatedUserId();
        const raw = await req.json();
        const parsed = budgetReapplySchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'Dati non validi' },
                { status: 400 }
            );
        }

        let updated = 0;
        for (const { id, category } of parsed.data.mapping) {
            const res = await prisma.budgetTransaction.updateMany({
                where: { id, userId, categoryOverride: false },
                data: { category },
            });
            updated += res.count;
        }

        return NextResponse.json({ updated });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error('Failed to reapply budget categories:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
