import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId, unauthorizedResponse, UnauthorizedError } from '@/lib/api-auth';
import { dividendCreateSchema } from '@/lib/validations/dividends';

/** PUT /api/dividends/[id] — update single dividend */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const userId = await getAuthenticatedUserId();
        const { id } = await params;
        const body = await req.json();
        const parsed = dividendCreateSchema.partial().safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Dati non validi', details: parsed.error.issues }, { status: 400 });
        }

        // Ensure ownership
        const existing = await prisma.dividendRecord.findFirst({ where: { id, userId } });
        if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 });

        const updated = await prisma.dividendRecord.update({
            where: { id },
            data: parsed.data,
        });
        return NextResponse.json({ dividend: updated });
    } catch (err) {
        if (err instanceof UnauthorizedError) return unauthorizedResponse();
        console.error('PUT /api/dividends/[id] error:', err);
        return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
    }
}

/** DELETE /api/dividends/[id] */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const userId = await getAuthenticatedUserId();
        const { id } = await params;
        const existing = await prisma.dividendRecord.findFirst({ where: { id, userId } });
        if (!existing) return NextResponse.json({ error: 'Non trovato' }, { status: 404 });
        await prisma.dividendRecord.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (err) {
        if (err instanceof UnauthorizedError) return unauthorizedResponse();
        console.error('DELETE /api/dividends/[id] error:', err);
        return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
    }
}
