import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from '@/lib/api-auth';
import { budgetCategoriesSchema } from '@/lib/validations/budget';

export async function GET() {
    try {
        const userId = await getAuthenticatedUserId();
        const pref = await prisma.preference.findUnique({
            where: { userId },
            select: { budgetCategoriesList: true },
        });
        return NextResponse.json({ categories: pref?.budgetCategoriesList || "[]" });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error('Failed to get budget categories:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const userId = await getAuthenticatedUserId();
        const raw = await req.json();
        const parsed = budgetCategoriesSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'Dati non validi' },
                { status: 400 }
            );
        }
        const json = JSON.stringify(parsed.data.categories);
        await prisma.preference.upsert({
            where: { userId },
            update: { budgetCategoriesList: json },
            create: { userId, budgetCategoriesList: json },
        });
        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error('Failed to save budget categories:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
