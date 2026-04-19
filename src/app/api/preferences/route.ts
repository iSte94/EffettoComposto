import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId, PRIVATE_NO_STORE_HEADERS, UnauthorizedError, unauthorizedResponse } from '@/lib/api-auth';
import { preferencesSchema } from '@/lib/validations/preferences';
import { sanitizePreferenceForClient } from '@/lib/user-data';

export async function GET() {
    try {
        const userId = await getAuthenticatedUserId();

        const preferences = await prisma.preference.findUnique({
            where: { userId }
        });

        return NextResponse.json(
            { preferences: sanitizePreferenceForClient(preferences) },
            { headers: PRIVATE_NO_STORE_HEADERS },
        );
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error('Failed to get preferences:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const userId = await getAuthenticatedUserId();
        const rawData = await req.json();

        const parsed = preferencesSchema.safeParse(rawData);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'Dati non validi' },
                { status: 400 }
            );
        }

        const data = parsed.data;
        const preferences = await prisma.preference.upsert({
            where: { userId },
            update: data,
            create: {
                ...data,
                userId
            }
        });

        return NextResponse.json({ preferences, message: 'Preferences saved successfully' });
    } catch (error) {
        if (error instanceof UnauthorizedError) return unauthorizedResponse();
        console.error('Failed to save preferences:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
