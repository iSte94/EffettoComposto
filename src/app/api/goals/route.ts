import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from '@/lib/api-auth';
import { z } from 'zod/v4';

const createGoalSchema = z.object({
    name: z.string().min(1).max(100),
    targetAmount: z.number().positive(),
    currentAmount: z.number().min(0).default(0),
    deadline: z.string().regex(/^\d{4}-\d{2}$/).nullable().optional(),
    category: z.enum(["general", "emergency", "house", "investment", "travel", "other"]).default("general"),
});

const updateGoalSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(100).optional(),
    targetAmount: z.number().positive().optional(),
    currentAmount: z.number().min(0).optional(),
    deadline: z.string().regex(/^\d{4}-\d{2}$/).nullable().optional(),
    category: z.enum(["general", "emergency", "house", "investment", "travel", "other"]).optional(),
});

const deleteGoalSchema = z.object({
    id: z.string().uuid(),
});

// GET — lista obiettivi dell'utente
export async function GET() {
    try {
        const userId = await getAuthenticatedUserId();
        const goals = await prisma.savingsGoal.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json({ goals });
    } catch (e) {
        if (e instanceof UnauthorizedError) return unauthorizedResponse();
        return NextResponse.json({ error: 'Errore server' }, { status: 500 });
    }
}

// POST — crea nuovo obiettivo
export async function POST(req: NextRequest) {
    try {
        const userId = await getAuthenticatedUserId();
        const body = await req.json();
        const data = createGoalSchema.parse(body);

        const goal = await prisma.savingsGoal.create({
            data: { ...data, deadline: data.deadline ?? null, userId },
        });
        return NextResponse.json({ goal }, { status: 201 });
    } catch (e) {
        if (e instanceof UnauthorizedError) return unauthorizedResponse();
        if (e instanceof z.ZodError) return NextResponse.json({ error: 'Dati non validi', details: e.issues }, { status: 400 });
        return NextResponse.json({ error: 'Errore server' }, { status: 500 });
    }
}

// PUT — aggiorna obiettivo
export async function PUT(req: NextRequest) {
    try {
        const userId = await getAuthenticatedUserId();
        const body = await req.json();
        const { id, ...data } = updateGoalSchema.parse(body);

        const existing = await prisma.savingsGoal.findFirst({ where: { id, userId } });
        if (!existing) return NextResponse.json({ error: 'Obiettivo non trovato' }, { status: 404 });

        const goal = await prisma.savingsGoal.update({ where: { id }, data });
        return NextResponse.json({ goal });
    } catch (e) {
        if (e instanceof UnauthorizedError) return unauthorizedResponse();
        if (e instanceof z.ZodError) return NextResponse.json({ error: 'Dati non validi', details: e.issues }, { status: 400 });
        return NextResponse.json({ error: 'Errore server' }, { status: 500 });
    }
}

// DELETE — elimina obiettivo
export async function DELETE(req: NextRequest) {
    try {
        const userId = await getAuthenticatedUserId();
        const body = await req.json();
        const { id } = deleteGoalSchema.parse(body);

        const existing = await prisma.savingsGoal.findFirst({ where: { id, userId } });
        if (!existing) return NextResponse.json({ error: 'Obiettivo non trovato' }, { status: 404 });

        await prisma.savingsGoal.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (e) {
        if (e instanceof UnauthorizedError) return unauthorizedResponse();
        if (e instanceof z.ZodError) return NextResponse.json({ error: 'Dati non validi', details: e.issues }, { status: 400 });
        return NextResponse.json({ error: 'Errore server' }, { status: 500 });
    }
}
