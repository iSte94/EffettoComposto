import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId, UnauthorizedError, unauthorizedResponse } from '@/lib/api-auth';
import { assetRecordSchema, deleteRecordSchema } from '@/lib/validations/patrimonio';

// GET: Recupera tutto lo storico per i grafici
export async function GET() {
    try {
        const userId = await getAuthenticatedUserId();

        const history = await prisma.assetRecord.findMany({
            where: { userId },
            orderBy: { date: 'asc' }
        });

        return NextResponse.json({ history });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error('Failed to get history:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST: Aggiunge un nuovo snapshot al DB
export async function POST(req: Request) {
    try {
        const userId = await getAuthenticatedUserId();
        const rawData = await req.json();

        const parsed = assetRecordSchema.safeParse(rawData);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'Dati non validi' },
                { status: 400 }
            );
        }
        const data = parsed.data;

        // Calculate start and end of the current day in UTC
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

        // Check if a snapshot for today already exists
        const existingSnapshot = await prisma.assetRecord.findFirst({
            where: {
                userId,
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                }
            }
        });

        const recordData = {
            userId,
            realEstateValue: data.realEstateValue || 0,
            realEstateCosts: data.realEstateCosts || 0,
            realEstateRent: data.realEstateRent || 0,
            liquidStockValue: data.liquidStockValue || 0,
            safeHavens: data.safeHavens || 0,
            emergencyFund: data.emergencyFund || 0,
            pensionFund: data.pensionFund || 0,
            debtsTotal: data.debtsTotal || 0,
            bitcoinAmount: data.bitcoinAmount || 0,
            bitcoinPrice: data.bitcoinPrice || 0,
            realEstateList: data.realEstateList || '[]',
            customStocksList: data.customStocksList || '[]',
        };

        let newRecord;
        if (existingSnapshot) {
            newRecord = await prisma.assetRecord.update({
                where: { id: existingSnapshot.id },
                data: recordData
            });
        } else {
            newRecord = await prisma.assetRecord.create({
                data: recordData
            });
        }

        return NextResponse.json({ record: newRecord, message: 'Snapshot salvato con successo!' });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error('Failed to save record:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE: Elimina uno snapshot specifico
export async function DELETE(req: Request) {
    try {
        const userId = await getAuthenticatedUserId();
        const rawBody = await req.json();

        const parsed = deleteRecordSchema.safeParse(rawBody);
        if (!parsed.success) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }
        const { id } = parsed.data;

        await prisma.assetRecord.deleteMany({
            where: { id, userId }
        });

        return NextResponse.json({ message: 'Record eliminato' });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error('Failed to delete record:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
