import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from '@/lib/api-auth';
import {
    budgetTransactionsImportSchema,
    budgetTransactionsDeleteSchema,
} from '@/lib/validations/budget';

export async function GET(req: Request) {
    try {
        const userId = await getAuthenticatedUserId();
        const url = new URL(req.url);
        const month = url.searchParams.get('month'); // YYYY-MM

        const where: { userId: string; date?: { gte: string; lt: string } } = { userId };
        if (month && /^\d{4}-\d{2}$/.test(month)) {
            const [y, m] = month.split('-').map(Number);
            const nextY = m === 12 ? y + 1 : y;
            const nextM = m === 12 ? 1 : m + 1;
            where.date = {
                gte: `${month}-01`,
                lt: `${nextY}-${String(nextM).padStart(2, '0')}-01`,
            };
        }

        const transactions = await prisma.budgetTransaction.findMany({
            where,
            orderBy: { date: 'desc' },
            take: 5000,
        });
        return NextResponse.json({ transactions });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error('Failed to get budget transactions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const userId = await getAuthenticatedUserId();
        const raw = await req.json();
        const parsed = budgetTransactionsImportSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'Dati non validi' },
                { status: 400 }
            );
        }

        const existing = await prisma.budgetTransaction.findMany({
            where: { userId, hash: { in: parsed.data.transactions.map(t => t.hash) } },
            select: { hash: true },
        });
        const existingSet = new Set(existing.map(e => e.hash));
        const toInsert = parsed.data.transactions.filter(t => !existingSet.has(t.hash));

        if (toInsert.length > 0) {
            await prisma.budgetTransaction.createMany({
                data: toInsert.map(t => ({ ...t, userId })),
            });
        }

        return NextResponse.json({
            inserted: toInsert.length,
            skipped: parsed.data.transactions.length - toInsert.length,
        });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error('Failed to import budget transactions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const userId = await getAuthenticatedUserId();
        const raw = await req.json();
        const parsed = budgetTransactionsDeleteSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'Dati non validi' },
                { status: 400 }
            );
        }

        if (parsed.data.month === 'all') {
            await prisma.budgetTransaction.deleteMany({ where: { userId } });
        } else {
            const month = parsed.data.month;
            const [y, m] = month.split('-').map(Number);
            const nextY = m === 12 ? y + 1 : y;
            const nextM = m === 12 ? 1 : m + 1;
            await prisma.budgetTransaction.deleteMany({
                where: {
                    userId,
                    date: {
                        gte: `${month}-01`,
                        lt: `${nextY}-${String(nextM).padStart(2, '0')}-01`,
                    },
                },
            });
        }
        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error('Failed to delete budget transactions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
