import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from '@/lib/api-auth';
import { budgetTransactionPatchSchema } from '@/lib/validations/budget';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
    try {
        const userId = await getAuthenticatedUserId();
        const { id } = await ctx.params;
        const raw = await req.json();
        const parsed = budgetTransactionPatchSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'Dati non validi' },
                { status: 400 }
            );
        }

        const tx = await prisma.budgetTransaction.findUnique({ where: { id } });
        if (!tx || tx.userId !== userId) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const updated = await prisma.budgetTransaction.update({
            where: { id },
            data: { category: parsed.data.category, categoryOverride: true },
        });

        return NextResponse.json({ transaction: updated });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error('Failed to update budget transaction:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    try {
        const userId = await getAuthenticatedUserId();
        const { id } = await ctx.params;
        const tx = await prisma.budgetTransaction.findUnique({ where: { id } });
        if (!tx || tx.userId !== userId) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        await prisma.budgetTransaction.delete({ where: { id } });
        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error('Failed to delete budget transaction:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
